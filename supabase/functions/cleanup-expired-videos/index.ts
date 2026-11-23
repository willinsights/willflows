import { isVaultCronFromEnv } from "../_shared/cron-vault-env.ts";
import { controlled, MaintenanceStop } from '../_shared/execution-control.ts';
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { S3Client, DeleteObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.709.0";
import { secretEquals } from "../_shared/timing-safe.ts";
import { approvalRetentionCutoff, selectVersionsDueAfterApproval } from "../_shared/approval-retention.ts";
import { runPrivateRetention } from "../_shared/private-retention.ts";

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
    return new Response(null, { headers: { ...corsHeaders, "X-WillFlow-Observation-Version": "1", "X-WillFlow-Observation-Source": "6f54b028ecfaf2610e1304878bbcfd28cac5e7b6318f385ac2c7c23d16f2455f" } });
  }

  const providedSecret = req.headers.get('x-cron-secret');
  const authorized =
    secretEquals(Deno.env.get('CRON_SECRET'), providedSecret) ||
    secretEquals(Deno.env.get('AUTOMATION_CRON_SECRET'), providedSecret) ||
    await isVaultCronFromEnv(req);
  if (!authorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

    return await controlled(supabase, 'cleanup', async lease => {
    const checkedFetch: typeof fetch = async (input, init) => { await lease.check(); const response = await fetch(input, init); if (!response.ok) lease.markUncertain(); return response; };
    const guardedDb = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false }, global: { fetch: checkedFetch } });
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

    const { data: expiringItems, error: expiringError } = await guardedDb
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
        const { data: admins } = await guardedDb
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
            await guardedDb.from('notifications').insert({
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
            await guardedDb
              .from('video_retention_queue')
              .update({ status: 'notified', notified_at: now })
              .eq('id', item.id);
          }

          logStep("Admins notified", { workspaceId, adminCount: admins.length, itemCount: items.length });
        }
      }
    }

    // 2. Delete videos that have passed their retention date
    const { data: expiredItems, error: expiredError } = await guardedDb
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

      const queueCutoff = approvalRetentionCutoff(new Date());
      for (const item of expiredItems) {
        try {
          // Owner decision 2026-11-23: only approval starts the 7-day window.
          // Items queued by task completion without an approval old enough are
          // cancelled; a later approval re-queues the task via its trigger.
          const { data: taskApprovals } = await guardedDb
            .from('video_approvals')
            .select('approved_at')
            .eq('task_id', item.task_id);
          const approvalTimes = (taskApprovals || []).map((a: any) => Date.parse(a.approved_at)).filter(Number.isFinite);
          const latestApproval = approvalTimes.length ? Math.max(...approvalTimes) : null;
          if (latestApproval === null || latestApproval >= Date.parse(queueCutoff)) {
            if (latestApproval === null) {
              await guardedDb.from('video_retention_queue').update({ status: 'cancelled' }).eq('id', item.id);
            }
            logStep("Retention item skipped: no approval older than 7 days", { itemId: item.id });
            continue;
          }
          // Get all video versions for this task
          const { data: videos } = await guardedDb
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
                  await (await lease.check(), s3Client).send(new DeleteObjectCommand({
                    Bucket: bucketName,
                    Key: video.r2_key,
                  }));
                  logStep("Deleted from R2", { key: video.r2_key });
                } catch (r2Error) { lease.markUncertain();
                  const errMsg = r2Error instanceof Error ? r2Error.message : String(r2Error);
                  logStep("Error deleting from R2", { key: video.r2_key, error: errMsg });
                }
              }

              // Delete from Cloudflare Stream
              if (video.cloudflare_stream_uid && accountId && streamToken) {
                try {
                  const streamResponse = await checkedFetch(
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
                } catch (streamError) { lease.markUncertain();
                  const errMsg = streamError instanceof Error ? streamError.message : String(streamError);
                  logStep("Error deleting from Stream", { uid: video.cloudflare_stream_uid, error: errMsg });
                }
              }

              // Legacy: Delete from Supabase Storage if not R2
              if (video.file_path && !video.r2_key && !video.file_path.startsWith('r2://')) {
                const { error: deleteError } = await guardedDb.storage
                  .from('video-versions')
                  .remove([video.file_path]);

                if (deleteError) {
                  logStep("Error deleting legacy video file", { path: video.file_path, error: deleteError.message });
                }

                if (video.thumbnail_path) {
                  await guardedDb.storage
                    .from('video-versions')
                    .remove([video.thumbnail_path]);
                }
              }

              totalBytesFreed += video.file_size_bytes || 0;

              // Mark video as deleted (preserve metadata)
              await guardedDb
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
              const { data: storageData } = await guardedDb
                .from('workspace_storage')
                .select('storage_used_bytes')
                .eq('workspace_id', item.workspace_id)
                .single();

              if (storageData) {
                const newUsed = Math.max(0, (storageData.storage_used_bytes || 0) - totalBytesFreed);
                await guardedDb
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
          await guardedDb
            .from('video_approval_tokens')
            .update({ is_active: false })
            .eq('task_id', item.task_id);

          // Mark retention queue item as deleted
          await guardedDb
            .from('video_retention_queue')
            .update({ status: 'deleted' })
            .eq('id', item.id);

        } catch (err) { lease.markUncertain();
          const errMsg = err instanceof Error ? err.message : String(err);
          logStep("Error processing expired item", { itemId: item.id, error: errMsg });
        }
      }
    }

    // 2b. Approved videos expire 7 days after approval (owner decision 2026-11-23).
    // Delivery alone no longer removes anything; unapproved versions stay.
    const approvalCutoff = approvalRetentionCutoff(new Date());
    const { data: oldApprovals } = await guardedDb
      .from('video_approvals')
      .select('video_version_id, task_id, approved_at')
      .lt('approved_at', approvalCutoff)
      .limit(5000);
    let deliveredMarked = 0;
    const approvalRows = (oldApprovals || []) as any[];
    const approvedTaskIds = [...new Set(approvalRows.map((a) => a.task_id).filter(Boolean))] as string[];
    const approvedVersionIds = [...new Set(approvalRows.map((a) => a.video_version_id).filter(Boolean))] as string[];
    // Newer approvals on the same tasks restart the window.
    const recentApprovals: any[] = [];
    for (let i = 0; i < approvedTaskIds.length; i += 100) {
      const { data } = await guardedDb
        .from('video_approvals')
        .select('video_version_id, task_id, approved_at')
        .in('task_id', approvedTaskIds.slice(i, i + 100))
        .gte('approved_at', approvalCutoff);
      if (data) recentApprovals.push(...data);
    }
    const candidates: any[] = [];
    for (const [column, ids] of [['task_id', approvedTaskIds], ['id', approvedVersionIds]] as const) {
      for (let i = 0; i < ids.length; i += 100) {
        const { data } = await guardedDb
          .from('video_versions')
          .select('id, task_id, is_deleted, workspace_id, file_size_bytes, replacement_file_size_bytes')
          .in(column, ids.slice(i, i + 100))
          .eq('is_deleted', false);
        if (data) candidates.push(...data);
      }
    }
    const byId = new Map(candidates.map((v: any) => [v.id, v]));
    const dueIds = selectVersionsDueAfterApproval([...approvalRows, ...recentApprovals], [...byId.values()], approvalCutoff);
    for (let i = 0; i < dueIds.length && deliveredMarked < 300; i += 100) {
      const vids = dueIds.slice(i, Math.min(i + 100, i + 300 - deliveredMarked)).map((id) => byId.get(id));
      if (vids.length === 0) continue;
      const freed: Record<string, number> = {};
      for (const v of vids as any[]) {
        freed[v.workspace_id] = (freed[v.workspace_id] || 0) + (v.file_size_bytes || 0) + (v.replacement_file_size_bytes || 0);
      }
      await guardedDb.from('video_versions')
        .update({ is_deleted: true, deleted_at: now })
        .in('id', vids.map((v: any) => v.id));
      for (const [ws, bytes] of Object.entries(freed)) {
        const { data: st } = await guardedDb.from('workspace_storage')
          .select('storage_used_bytes').eq('workspace_id', ws).maybeSingle();
        if (st) {
          await guardedDb.from('workspace_storage').update({
            storage_used_bytes: Math.max(0, (st.storage_used_bytes || 0) - bytes),
            last_calculated_at: now,
          }).eq('workspace_id', ws);
        }
      }
      deliveredMarked += vids.length;
    }
    logStep("Delivered videos marked for deletion", { count: deliveredMarked });

    // 2c. Private (wf2_) versions: 7 days after approval. The server switch is
    // off by default; while off, withdraw returns 0 and pending is empty.
    let privateRetention: { withdrawn: number; deleted: number; failed: number } | { error: string } = { withdrawn: 0, deleted: 0, failed: 0 };
    try {
      privateRetention = await runPrivateRetention(
        (name, args) => guardedDb.rpc(name, args),
        {
          deleteR2: async (key) => {
            if (!s3Client || !bucketName) throw new Error('R2 not configured');
            await lease.check();
            await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
          },
          deleteStream: async (uid) => {
            if (!accountId || !streamToken) throw new Error('Stream not configured');
            const r = await checkedFetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${uid}`,
              { method: 'DELETE', headers: { 'Authorization': `Bearer ${streamToken}` } });
            await r.text();
            if (!r.ok && r.status !== 404) throw new Error(`Stream ${r.status}`);
          },
        },
      );
    } catch (e) {
      // Only database calls throw here (provider failures are recorded per item and
      // retried); a retried provider delete is idempotent, so no uncertainty is kept.
      privateRetention = { error: e instanceof Error ? e.message : String(e) };
    }
    logStep("Private retention", privateRetention as Record<string, unknown>);

    // 3. Clean up files of deleted videos (manual + delivered retention)
    const { data: orphanedVideos } = await guardedDb
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
        for (const key of [video.r2_key, video.replacement_r2_key]) {
          if (key && s3Client && bucketName) {
            try {
              await (await lease.check(), s3Client).send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
            } catch (e) { lease.markUncertain();
              ok = false;
              logStep("R2 delete failed", { key, error: e instanceof Error ? e.message : String(e) });
            }
          }
        }
        for (const uid of [video.cloudflare_stream_uid, video.replacement_stream_uid]) {
          if (uid && accountId && streamToken) {
            try {
              const r = await checkedFetch(
                `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${uid}`,
                { method: 'DELETE', headers: { 'Authorization': `Bearer ${streamToken}` } }
              );
              const body = await r.text();
              // 404 = already gone on Cloudflare
              if (!r.ok && r.status !== 404) {
                ok = false;
                logStep("Stream delete failed", { uid, status: r.status, body: body.slice(0, 300) });
              }
            } catch (e) { lease.markUncertain();
              ok = false;
              logStep("Stream delete failed", { uid, error: e instanceof Error ? e.message : String(e) });
            }
          }
        }

        // Only forget the Cloudflare ids once the files are really gone,
        // so failures are retried on the next run.
        if (!ok) { orphanFailures++; continue; }
        orphanCleaned++;
        await guardedDb
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
      }
    }

    const summary = {
      expiringNotified: expiringItems?.length || 0,
      expired: expiredItems?.length || 0,
      deliveredMarked,
      orphanedCleaned: orphanCleaned,
      orphanFailures,
      privateRetention,
    };

    logStep("Cleanup job completed", summary);

    return new Response(JSON.stringify({ success: true, ...summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    });
  } catch (error) {
    if (error instanceof MaintenanceStop) return new Response(JSON.stringify({ paused: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
