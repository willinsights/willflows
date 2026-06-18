import { useState, useEffect, useRef, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Video, MessageSquare, CheckCircle2, Upload, Link, Layers, History, Replace } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import { VideoPlayer, VideoPlayerRef } from './VideoPlayer';
import { VideoVersionUpload } from './VideoVersionUpload';
import { VideoVersionsList } from './VideoVersionsList';
import { TimestampComments } from './TimestampComments';
import { CommentInputModal } from './CommentInputModal';
import { ApprovalButton } from './ApprovalButton';
import { ApprovalShareLink } from './ApprovalShareLink';
import { StorageUsageBar } from './StorageUsageBar';
import { RevisionHistory } from './RevisionHistory';

import { useVideoVersions, VideoVersion } from '@/hooks/useVideoVersions';
import { useVideoComments } from '@/hooks/useVideoComments';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { FeatureTeaser } from '@/components/subscription/FeatureTeaser';

import { logger } from '@/lib/logger';
interface VideoProductionTabProps {
  taskId: string | null;
  workspaceId: string;
  projectId: string;
  className?: string;
}

export function VideoProductionTab({
  taskId,
  workspaceId,
  projectId,
  className,
}: VideoProductionTabProps) {
  const { hasFeatureAccess } = usePlanFeatures();
  
  // Feature gating for Studio plan
  if (!hasFeatureAccess('videoApproval')) {
    return (
      <FeatureTeaser
        feature="videoApproval"
        title="Aprovação de Vídeo"
        description="Faça upload de versões, receba comentários por timestamp e obtenha aprovação formal do cliente."
      />
    );
  }

  return <VideoProductionTabContent taskId={taskId} workspaceId={workspaceId} projectId={projectId} className={className} />;
}

function VideoProductionTabContent({
  taskId,
  workspaceId,
  projectId,
  className,
}: VideoProductionTabProps) {
  const { versions, loading, deleteVersion, replaceVersion, getSignedUrl, isProcessing, refetch, setThumbnailTime } = useVideoVersions(taskId, workspaceId, projectId);
  const [selectedVersion, setSelectedVersion] = useState<VideoVersion | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [isVersionProcessing, setIsVersionProcessing] = useState(false);
  const [isFixingVideo, setIsFixingVideo] = useState(false);
  // 'original' shows the version's first upload, 'corrected' shows the replacement (when it exists)
  const [replacementView, setReplacementView] = useState<'original' | 'corrected'>('corrected');

  // Comment modal state
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentTimestamp, setCommentTimestamp] = useState(0);

  // Ref for VideoPlayer to expose seekTo method
  const videoPlayerRef = useRef<VideoPlayerRef>(null);

  const { addComment } = useVideoComments(selectedVersion?.id || null);

  const hasReplacement = !!(selectedVersion?.replacement_stream_uid || selectedVersion?.replacement_playback_url);
  const replacementProcessing = selectedVersion?.replacement_status === 'processing' || selectedVersion?.replacement_status === 'pending';

  // Auto-select latest version
  useEffect(() => {
    if (versions.length > 0 && !selectedVersion) {
      setSelectedVersion(versions[0]);
    }
  }, [versions, selectedVersion]);

  // Load video URL when version changes - handles both Cloudflare and legacy Supabase
  useEffect(() => {
    const loadVideoUrl = async () => {
      if (!selectedVersion) {
        setVideoUrl(null);
        setIsVersionProcessing(false);
        return;
      }

      // Decide which playback to show — corrected (replacement) or original
      const showReplacement =
        replacementView === 'corrected' &&
        !!selectedVersion.replacement_stream_uid &&
        selectedVersion.replacement_status !== 'processing' &&
        selectedVersion.replacement_status !== 'pending';

      // Check if version is still processing (Cloudflare) — original side
      if (!showReplacement && isProcessing(selectedVersion)) {
        setVideoUrl(null);
        setIsVersionProcessing(true);
        setLoadingUrl(false);
        return;
      }
      setIsVersionProcessing(false);

      if (showReplacement && selectedVersion.replacement_playback_url) {
        setVideoUrl(selectedVersion.replacement_playback_url);
        setLoadingUrl(false);
        return;
      }

      // Priority 1: Cloudflare Stream (original)
      if (selectedVersion.cloudflare_stream_uid) {
        setVideoUrl(selectedVersion.stream_playback_url || null);
        setLoadingUrl(false);
        return;
      }

      // Priority 2: Legacy Supabase Storage (old uploads)
      setLoadingUrl(true);
      try {
        const url = await getSignedUrl(selectedVersion.file_path);
        setVideoUrl(url);
      } catch {
        setVideoUrl(null);
      }
      setLoadingUrl(false);
    };

    loadVideoUrl();
  }, [
    selectedVersion?.id,
    selectedVersion?.stream_status,
    selectedVersion?.cloudflare_stream_uid,
    selectedVersion?.replacement_status,
    selectedVersion?.replacement_stream_uid,
    replacementView,
    getSignedUrl,
    isProcessing,
  ]);

  // Reset toggle when switching version: prefer corrected if available
  useEffect(() => {
    setReplacementView('corrected');
  }, [selectedVersion?.id]);

  const handleSelectVersion = (version: VideoVersion) => {
    setSelectedVersion(version);
  };

  const handleSelectVersionById = useCallback((versionId: string) => {
    const v = versions.find(x => x.id === versionId);
    if (v) setSelectedVersion(v);
  }, [versions]);

  // Replace version flow: open file picker, then call replaceVersion
  const handleReplaceVersion = useCallback((version: VideoVersion) => {
    setReplaceTargetVersionId(version.id);
    replaceFileInputRef.current?.click();
  }, []);

  const handleReplaceFileChosen = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset input
    if (!file || !replaceTargetVersionId) return;
    try {
      await replaceVersion(replaceTargetVersionId, file);
    } catch {
      // toast handled in hook
    } finally {
      setReplaceTargetVersionId(null);
    }
  }, [replaceTargetVersionId, replaceVersion]);


  const handleAddComment = useCallback((timestampSeconds: number) => {
    setCommentTimestamp(timestampSeconds);
    setShowCommentModal(true);
  }, []);

  const handleSubmitComment = async (body: string) => {
    if (!selectedVersion) return;

    await addComment({
      videoVersionId: selectedVersion.id,
      taskId,
      workspaceId,
      timestampSeconds: commentTimestamp,
      body,
    });
  };

  const handleSeekToTimestamp = useCallback((timestamp: number) => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.seekTo(timestamp);
    }
  }, []);

  // Fix video settings (remove allowedOrigins restrictions)
  const handleFixVideo = useCallback(async (version: VideoVersion) => {
    if (!version.cloudflare_stream_uid) {
      toast.error('Este vídeo não tem um ID do Cloudflare Stream');
      return;
    }

    setIsFixingVideo(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        throw new Error('Sessão não encontrada');
      }

      const response = await supabase.functions.invoke('stream-update-video', {
        body: {
          streamUid: version.cloudflare_stream_uid,
          versionId: version.id,
          allowedOrigins: [], // Remove all restrictions
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao atualizar vídeo');
      }

      toast.success('Configurações do vídeo corrigidas! A recarregar...');
      
      // Refresh versions to get updated data
      await refetch();
      
      // Re-select the version to reload the video
      const updatedVersion = versions.find(v => v.id === version.id);
      if (updatedVersion) {
        setSelectedVersion(null);
        setTimeout(() => setSelectedVersion(updatedVersion), 100);
      }
    } catch (error) {
      logger.error('Error fixing video:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao corrigir vídeo');
    } finally {
      setIsFixingVideo(false);
    }
  }, [refetch, versions]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Storage usage bar */}
      <StorageUsageBar showUpgradeButton />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - Video Player */}
        <div className="lg:col-span-2 space-y-4">
          {/* Original vs Corrected toggle (only when version has replacement) */}
          {hasReplacement && (
            <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <Replace className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="font-medium">
                  V{selectedVersion?.version_number} foi substituída
                </span>
                {replacementProcessing && (
                  <span className="text-xs text-muted-foreground">(corrigido a processar…)</span>
                )}
              </div>
              <ToggleGroup
                type="single"
                size="sm"
                value={replacementView}
                onValueChange={(v) => v && setReplacementView(v as 'original' | 'corrected')}
              >
                <ToggleGroupItem value="original" className="text-xs h-7 px-2">
                  Original
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="corrected"
                  className="text-xs h-7 px-2"
                  disabled={replacementProcessing}
                >
                  Corrigido
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          )}

          {/* Video Player */}
          {selectedVersion && (selectedVersion.cloudflare_stream_uid || videoUrl) ? (
            <div className="relative w-full flex justify-center">
              <VideoPlayer
                ref={videoPlayerRef}
                src={videoUrl || undefined}
                streamUid={
                  (replacementView === 'corrected' && selectedVersion.replacement_stream_uid) ||
                  selectedVersion.cloudflare_stream_uid ||
                  undefined
                }
                hlsUrl={videoUrl || undefined}
                isProcessing={isVersionProcessing}
                onAddComment={handleAddComment}
                onSetThumbnail={selectedVersion?.cloudflare_stream_uid ? (seconds) => setThumbnailTime(selectedVersion.id, seconds) : undefined}
                className="w-full max-h-[70vh]"
              />
            </div>
          ) : isVersionProcessing ? (
            <div className="relative w-full flex justify-center">
              <VideoPlayer
                ref={videoPlayerRef}
                isProcessing={true}
                className="w-full max-h-[70vh]"
              />
            </div>
          ) : loadingUrl ? (
            <div className="aspect-video w-full rounded-lg bg-muted flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="aspect-video w-full rounded-lg bg-muted flex flex-col items-center justify-center text-muted-foreground">
              <Video className="h-12 w-12 mb-2 opacity-50" />
              <p>Nenhum vídeo selecionado</p>
            </div>
          )}

          {/* Upload area */}
          <VideoVersionUpload
            taskId={taskId}
            workspaceId={workspaceId}
            projectId={projectId}
          />

          {/* Hidden file input for replacement upload */}
          <input
            ref={replaceFileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-matroska"
            className="hidden"
            onChange={handleReplaceFileChosen}
          />

          {/* Comments section */}
          {selectedVersion && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comentários
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TimestampComments
                  videoVersionId={selectedVersion.id}
                  taskId={taskId}
                  workspaceId={workspaceId}
                  onSeekTo={handleSeekToTimestamp}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Versions & Approval */}
        <div className="space-y-4">
          {/* Versions list */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Versões
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VideoVersionsList
                versions={versions}
                selectedVersionId={selectedVersion?.id || null}
                onSelectVersion={handleSelectVersion}
                onDeleteVersion={deleteVersion}
                onReplaceVersion={handleReplaceVersion}
                onFixVideo={handleFixVideo}
                isFixingVideo={isFixingVideo}
              />
            </CardContent>
          </Card>

          {/* Revision history (all comments, all versions, permanent) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                Histórico de Revisões
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RevisionHistory
                projectId={projectId}
                taskId={taskId}
                workspaceId={workspaceId}
                selectedVersionId={selectedVersion?.id || null}
                onSelectVersion={handleSelectVersionById}
                onSeekTo={(versionId, ts) => {
                  if (versionId !== selectedVersion?.id) {
                    handleSelectVersionById(versionId);
                    setTimeout(() => handleSeekToTimestamp(ts), 400);
                  } else {
                    handleSeekToTimestamp(ts);
                  }
                }}
              />
            </CardContent>
          </Card>


          {/* Approval section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Aprovação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ApprovalButton
                taskId={taskId}
                projectId={projectId}
                workspaceId={workspaceId}
                videoVersionId={selectedVersion?.id || null}
                versionNumber={selectedVersion?.version_number || null}
              />
              
              <Separator />
              
              <ApprovalShareLink
                taskId={taskId}
                workspaceId={workspaceId}
                projectId={projectId}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Comment modal */}
      <CommentInputModal
        open={showCommentModal}
        onOpenChange={setShowCommentModal}
        timestampSeconds={commentTimestamp}
        onSubmit={handleSubmitComment}
      />
    </div>
  );
}
