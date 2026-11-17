import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { S3Client, DeleteObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.709.0";
import { authenticateCronRequest } from "../_shared/cron-auth.ts";
import { secretEquals } from "../_shared/timing-safe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CLEANUP-EXPIRED-VIDEOS] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const providedSecret = req.headers.get('x-cron-secret');
  const authorized =
    secretEquals(Deno.env.get('CRON_SECRET'), providedSecret) ||
    secretEquals(Deno.env.get('AUTOMATION_CRON_SECRET'), providedSecret);
  // Accept the legacy x-cron-secret OR the managed Bearer credential during cutover.
  if (!authorized && authenticateCronRequest(req) !== null) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Safe staging default: authentication must not unlock automatic deletions.
  if (Deno.env.get('CLEANUP_DELETIONS_ENABLED') !== 'true') {
    return new Response(JSON.stringify({ success: false, paused: true, reason: 'cleanup_not_enabled' }), {
      status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  try {
    logStep("Cleanup job started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const accessKeyId = Deno.env.get("CLOUDFLARE_R2_ACCESS_KEY");
    const secretAccessKey = Deno.env.get("CLOUDFLARE_R2_SECRET_KEY");
    const bucketName = Deno.env.get("CLOUDFLARE_R2_BUCKET");
    const streamToken = Deno.env.get("CLOUDFLARE_STREAM_TOKEN");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Create R2 client if credentials are available
    let s3Client: S3Client | null = null;
    if (accountId && accessKeyId && secretAccessKey && bucketName) {
      s3Client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }

    const now = new Date().toISOString();

    // 1. Notify admins about videos expiring in 3 days
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const { data: expiringItems, error: expiringError } = await supabase
      .from('video_retention_queue')
      .select(`
        id,
        task_id,
        workspace_id,
        scheduled_deletion_at,
        tasks:task_id (title, project_id, projects:project_id (name))
      `)
      .eq('status', 'pending')
      .lte('scheduled_deletion_at', threeDaysFromNow.toISOString())
      .gt('scheduled_deletion_at', now);

    if (expiringItems && expiringItems.length > 0) {
      logStep("Found items expiring soon", { count: expiringItems.length });

      // Group by workspace
      const byWorkspace: Record<string, typeof expiringItems> = {};
      for (const item of expiringItems) {
        if (!byWorkspace[item.workspace_id]) {
          byWorkspace[item.workspace_id] = [];
        }
        byWorkspace[item.workspace_id].push(item);
      }

      // Send notification to each workspace admin
      for (const [workspaceId, items] of Object.entries(byWorkspace)) {
        const { data: admins } = await supabase
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', workspaceId)
          .eq('role', 'admin')
          .eq('is_active', true);

        if (admins && admins.length > 0) {
          const taskNames = items
            .map(i => (i.tasks as any)?.title || 'Tarefa')
            .slice(0, 3)
            .join(', ');

          const notificationMessage = items.length > 3
            ? `${taskNames} e mais ${items.length - 3} vídeos serão eliminados em breve.`
            : `Os vídeos de "${taskNames}" serão eliminados em breve.`;

          for (const admin of admins) {
            await supabase.from('notifications').insert({
              workspace_id: workspaceId,
              user_id: admin.user_id,
              type: 'warning',
              title: 'Vídeos a expirar',
              message: notificationMessage,
              entity_type: 'video_retention',
              entity_id: items[0].task_id,
            });
          }

          // Mark as notified
          for (const item of items) {
            await supabase
              .from('video_retention_queue')
              .update({ status: 'notified', notified_at: now })
              .eq('id', item.id);
          }

          logStep("Admins notified", { workspaceId, adminCount: admins.length, itemCount: items.length });
        }
      }
    }

    // 2. Delete videos that have passed their retention date
    const { data: expiredItems, error: expiredError } = await supabase
      .from('video_retention_queue')
      .select(`
        id,
        task_id,
        workspace_id
      `)
      .in('status', ['pending', 'notified'])
      .lte('scheduled_deletion_at', now);

    if (expiredItems && expiredItems.length > 0) {
      logStep("Found expired items to delete", { count: expiredItems.length });

      for (const item of expiredItems) {
        try {
          // Get all video versions for this task
          const { data: videos } = await supabase
            .from('video_versions')
            .select('id, file_path, file_size_bytes, thumbnail_path, r2_key, cloudflare_stream_uid')
            .eq('task_id', item.task_id)
            .eq('is_deleted', false);

          if (videos && videos.length > 0) {
            let totalBytesFreed = 0;

            for (const video of videos) {
              // Delete from Cloudflare R2
              if (video.r2_key && s3Client && bucketName) {
                try {
                  await s3Client.send(new DeleteObjectCommand({
                    Bucket: bucketName,
                    Key: video.r2_key,
                  }));
                  logStep("Deleted from R2", { key: video.r2_key });
                } catch (r2Error) {
                  const errMsg = r2Error instanceof Error ? r2Error.message : String(r2Error);
                  logStep("Error deleting from R2", { key: video.r2_key, error: errMsg });
                }
              }

              // Delete from Cloudflare Stream
              if (video.cloudflare_stream_uid && accountId && streamToken) {
                try {
                  const streamResponse = await fetch(
                    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${video.cloudflare_stream_uid}`,
                    {
                      method: 'DELETE',
                      headers: {
                        'Authorization': `Bearer ${streamToken}`,
                      },
                    }
                  );
                  
                  if (streamResponse.ok) {
                    logStep("Deleted from Stream", { uid: video.cloudflare_stream_uid });
                  } else {
                    const errorText = await streamResponse.text();
                    logStep("Error deleting from Stream", { uid: video.cloudflare_stream_uid, error: errorText });
                  }
                } catch (streamError) {
                  const errMsg = streamError instanceof Error ? streamError.message : String(streamError);
                  logStep("Error deleting from Stream", { uid: video.cloudflare_stream_uid, error: errMsg });
                }
              }

              // Legacy: Delete from Supabase Storage if not R2
              if (video.file_path && !video.r2_key && !video.file_path.startsWith('r2://')) {
                const { error: deleteError } = await supabase.storage
                  .from('video-versions')
                  .remove([video.file_path]);

                if (deleteError) {
                  logStep("Error deleting legacy video file", { path: video.file_path, error: deleteError.message });
                }

                if (video.thumbnail_path) {
                  await supabase.storage
                    .from('video-versions')
                    .remove([video.thumbnail_path]);
                }
              }

              // Persist deletion and quota decrement in one transaction, only once.
              const { data: freed, error: quotaError } = await supabase.rpc('mark_cleanup_videos_deleted', {
                p_workspace: item.workspace_id, p_ids: [video.id],
              });
              if (quotaError) throw new Error('Atomic cleanup accounting failed');
              totalBytesFreed += Number(freed || 0);
              // Keep asset references until the orphan pass confirms physical deletion.
            }

            logStep("Deleted videos for task", { 
              taskId: item.task_id, 
              videoCount: videos.length, 
              bytesFreed: totalBytesFreed 
            });
          }

          // Deactivate approval tokens for this task
          await supabase
            .from('video_approval_tokens')
            .update({ is_active: false })
            .eq('task_id', item.task_id);

          // Mark retention queue item as deleted
          await supabase
            .from('video_retention_queue')
            .update({ status: 'deleted' })
            .eq('id', item.id);

        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          logStep("Error processing expired item", { itemId: item.id, error: errMsg });
        }
      }
    }

    // 2b. Delivered cards: videos expire 7 days after delivery
    const deliveredCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: oldProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('is_delivered', true)
      .lt('delivered_at', deliveredCutoff)
      .limit(5000);
    let deliveredMarked = 0;
    const projectIds = (oldProjects || []).map((p: any) => p.id);
    for (let i = 0; i < projectIds.length && deliveredMarked < 300; i += 100) {
      const { data: vids } = await supabase
        .from('video_versions')
        .select('id, workspace_id, file_size_bytes, replacement_file_size_bytes')
        .in('project_id', projectIds.slice(i, i + 100))
        .eq('is_deleted', false)
        .limit(300 - deliveredMarked);
      if (!vids || vids.length === 0) continue;
      const byWorkspace: Record<string, string[]> = {};
      for (const v of vids as any[]) (byWorkspace[v.workspace_id] ??= []).push(v.id);
      for (const [ws, ids] of Object.entries(byWorkspace)) {
        const { error } = await supabase.rpc('mark_cleanup_videos_deleted', { p_workspace: ws, p_ids: ids });
        if (error) throw new Error('Atomic delivered-video accounting failed');
      }
      deliveredMarked += vids.length;
    }
    logStep("Delivered videos marked for deletion", { count: deliveredMarked });

    // 3. Clean up files of deleted videos (manual + delivered retention)
    const { data: orphanedVideos } = await supabase
      .from('video_versions')
      .select('id, r2_key, cloudflare_stream_uid, replacement_r2_key, replacement_stream_uid')
      .eq('is_deleted', true)
      .or('r2_key.not.is.null,cloudflare_stream_uid.not.is.null,replacement_r2_key.not.is.null,replacement_stream_uid.not.is.null')
      .limit(150);

    let orphanCleaned = 0;
    let orphanFailures = 0;
    if (orphanedVideos && orphanedVideos.length > 0) {
      logStep("Cleaning up orphaned deleted videos", { count: orphanedVideos.length });

      for (const video of orphanedVideos as any[]) {
        let ok = true;
        // Missing provider configuration is NOT proof that the object was removed.
        if ((video.r2_key || video.replacement_r2_key) && (!s3Client || !bucketName)) ok = false;
        if ((video.cloudflare_stream_uid || video.replacement_stream_uid) && (!accountId || !streamToken)) ok = false;
        for (const key of [video.r2_key, video.replacement_r2_key]) {
          if (key && s3Client && bucketName) {
            try {
              await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
            } catch (e) {
              ok = false;
              logStep("R2 delete failed", { key, error: e instanceof Error ? e.message : String(e) });
            }
          }
        }
        for (const uid of [video.cloudflare_stream_uid, video.replacement_stream_uid]) {
          if (uid && accountId && streamToken) {
            try {
              const r = await fetch(
                `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${uid}`,
                { method: 'DELETE', headers: { 'Authorization': `Bearer ${streamToken}` } }
              );
              const body = await r.text();
              // 404 = already gone on Cloudflare
              if (!r.ok && r.status !== 404) {
                ok = false;
                logStep("Stream delete failed", { uid, status: r.status, body: body.slice(0, 300) });
              }
            } catch (e) {
              ok = false;
              logStep("Stream delete failed", { uid, error: e instanceof Error ? e.message : String(e) });
            }
          }
        }

        // Only forget the Cloudflare ids once the files are really gone,
        // so failures are retried on the next run.
        if (!ok) { orphanFailures++; continue; }
        const { error: persistError } = await supabase
          .from('video_versions')
          .update({
            r2_key: null,
            cloudflare_stream_uid: null,
            stream_playback_url: null,
            replacement_r2_key: null,
            replacement_stream_uid: null,
            replacement_playback_url: null,
          })
          .eq('id', video.id);
        if (persistError) { orphanFailures++; continue; }
        orphanCleaned++;
      }
    }

    const summary = {
      expiringNotified: expiringItems?.length || 0,
      expired: expiredItems?.length || 0,
      deliveredMarked,
      orphanedCleaned: orphanCleaned,
      orphanFailures,
    };

    logStep("Cleanup job completed", summary);

    return new Response(JSON.stringify({ success: true, ...summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
