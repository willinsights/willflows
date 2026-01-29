import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { S3Client, DeleteObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.709.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CLEANUP-EXPIRED-VIDEOS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

              totalBytesFreed += video.file_size_bytes || 0;

              // Mark video as deleted (preserve metadata)
              await supabase
                .from('video_versions')
                .update({
                  is_deleted: true,
                  deleted_at: now,
                  r2_key: null,
                  cloudflare_stream_uid: null,
                  stream_playback_url: null,
                  file_path: `[deleted] ${video.file_path}`,
                })
                .eq('id', video.id);
            }

            // Update workspace storage
            if (totalBytesFreed > 0) {
              const { data: storageData } = await supabase
                .from('workspace_storage')
                .select('storage_used_bytes')
                .eq('workspace_id', item.workspace_id)
                .single();

              if (storageData) {
                const newUsed = Math.max(0, (storageData.storage_used_bytes || 0) - totalBytesFreed);
                await supabase
                  .from('workspace_storage')
                  .update({
                    storage_used_bytes: newUsed,
                    last_calculated_at: now,
                  })
                  .eq('workspace_id', item.workspace_id);
              }
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

    // 3. Clean up orphaned deleted videos (manual deletions)
    const { data: orphanedVideos } = await supabase
      .from('video_versions')
      .select('id, r2_key, cloudflare_stream_uid, workspace_id, file_size_bytes')
      .eq('is_deleted', true)
      .not('r2_key', 'is', null)
      .limit(50);

    if (orphanedVideos && orphanedVideos.length > 0) {
      logStep("Cleaning up orphaned deleted videos", { count: orphanedVideos.length });

      for (const video of orphanedVideos) {
        // Delete from R2
        if (video.r2_key && s3Client && bucketName) {
          try {
            await s3Client.send(new DeleteObjectCommand({
              Bucket: bucketName,
              Key: video.r2_key,
            }));
          } catch (e) {
            // Ignore errors for orphaned cleanup
          }
        }

        // Delete from Stream
        if (video.cloudflare_stream_uid && accountId && streamToken) {
          try {
            await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${video.cloudflare_stream_uid}`,
              {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${streamToken}` },
              }
            );
          } catch (e) {
            // Ignore errors for orphaned cleanup
          }
        }

        // Clear the keys
        await supabase
          .from('video_versions')
          .update({
            r2_key: null,
            cloudflare_stream_uid: null,
            stream_playback_url: null,
          })
          .eq('id', video.id);
      }
    }

    const summary = {
      expiringNotified: expiringItems?.length || 0,
      expired: expiredItems?.length || 0,
      orphanedCleaned: orphanedVideos?.length || 0,
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
