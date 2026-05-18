import { useState, useEffect, useRef, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Video, MessageSquare, CheckCircle2, Upload, Link, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { VideoPlayer, VideoPlayerRef } from './VideoPlayer';
import { VideoVersionUpload } from './VideoVersionUpload';
import { VideoVersionsList } from './VideoVersionsList';
import { TimestampComments } from './TimestampComments';
import { CommentInputModal } from './CommentInputModal';
import { ApprovalButton } from './ApprovalButton';
import { ApprovalShareLink } from './ApprovalShareLink';
import { StorageUsageBar } from './StorageUsageBar';

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
  const { versions, loading, deleteVersion, getSignedUrl, isProcessing, refetch, setThumbnailTime } = useVideoVersions(taskId, workspaceId, projectId);
  const [selectedVersion, setSelectedVersion] = useState<VideoVersion | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [isVersionProcessing, setIsVersionProcessing] = useState(false);
  const [isFixingVideo, setIsFixingVideo] = useState(false);
  
  // Comment modal state
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentTimestamp, setCommentTimestamp] = useState(0);
  
  // Ref for VideoPlayer to expose seekTo method
  const videoPlayerRef = useRef<VideoPlayerRef>(null);
  
  const { addComment } = useVideoComments(selectedVersion?.id || null);

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

      // Check if version is still processing (Cloudflare)
      if (isProcessing(selectedVersion)) {
        setVideoUrl(null);
        setIsVersionProcessing(true);
        setLoadingUrl(false);
        return;
      }
      setIsVersionProcessing(false);

      // Priority 1: Cloudflare Stream (new uploads) - use HLS directly
      if (selectedVersion.cloudflare_stream_uid) {
        // Pass the playback URL which contains the customer hash needed for HLS
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
  }, [selectedVersion?.id, selectedVersion?.stream_status, selectedVersion?.cloudflare_stream_uid, getSignedUrl, isProcessing]);

  const handleSelectVersion = (version: VideoVersion) => {
    setSelectedVersion(version);
  };

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
          {/* Video Player */}
          {selectedVersion && (selectedVersion.cloudflare_stream_uid || videoUrl) ? (
            <div className="relative w-full flex justify-center">
              <VideoPlayer
                ref={videoPlayerRef}
                src={videoUrl || undefined}
                streamUid={selectedVersion.cloudflare_stream_uid || undefined}
                hlsUrl={selectedVersion.stream_playback_url || undefined}
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
                onFixVideo={handleFixVideo}
                isFixingVideo={isFixingVideo}
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
