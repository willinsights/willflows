import { useState, useEffect, useRef, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Video, MessageSquare, CheckCircle2, Upload, Link, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

import { VideoPlayer } from './VideoPlayer';
import { VideoVersionUpload } from './VideoVersionUpload';
import { VideoVersionsList } from './VideoVersionsList';
import { TimestampComments } from './TimestampComments';
import { CommentInputModal } from './CommentInputModal';
import { ApprovalButton } from './ApprovalButton';
import { ApprovalShareLink } from './ApprovalShareLink';
import { StorageUsageBar } from './StorageUsageBar';
import { FFmpegStatusIndicator } from './FFmpegStatusIndicator';

import { useVideoVersions, VideoVersion } from '@/hooks/useVideoVersions';
import { useVideoComments } from '@/hooks/useVideoComments';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { FeatureTeaser } from '@/components/subscription/FeatureTeaser';
import { useFFmpegContext } from '@/contexts/FFmpegContext';

interface VideoProductionTabProps {
  projectId: string;
  workspaceId: string;
  className?: string;
}

export function VideoProductionTab({
  projectId,
  workspaceId,
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

  return <VideoProductionTabContent projectId={projectId} workspaceId={workspaceId} className={className} />;
}

function VideoProductionTabContent({
  projectId,
  workspaceId,
  className,
}: VideoProductionTabProps) {
  const { versions, loading, deleteVersion, getSignedUrl } = useVideoVersions(projectId, workspaceId);
  const [selectedVersion, setSelectedVersion] = useState<VideoVersion | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  
  // Comment modal state
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentTimestamp, setCommentTimestamp] = useState(0);
  
  const videoPlayerRef = useRef<{ seekTo: (time: number) => void }>(null);
  
  const { addComment } = useVideoComments(selectedVersion?.id || null);
  
  // Preload FFmpeg when entering video production
  const { preload, isLoaded } = useFFmpegContext();
  
  useEffect(() => {
    // Start preloading FFmpeg engine in background
    if (!isLoaded) {
      console.log('[VideoProductionTab] Starting FFmpeg preload...');
      preload();
    }
  }, [preload, isLoaded]);

  // Auto-select latest version
  useEffect(() => {
    if (versions.length > 0 && !selectedVersion) {
      setSelectedVersion(versions[0]);
    }
  }, [versions, selectedVersion]);

  // Load video URL when version changes
  useEffect(() => {
    const loadVideoUrl = async () => {
      if (!selectedVersion) {
        setVideoUrl(null);
        return;
      }

      setLoadingUrl(true);
      const url = await getSignedUrl(selectedVersion.file_path);
      setVideoUrl(url);
      setLoadingUrl(false);
    };

    loadVideoUrl();
  }, [selectedVersion, getSignedUrl]);

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
      projectId,
      workspaceId,
      timestampSeconds: commentTimestamp,
      body,
    });
  };

  const handleSeekToTimestamp = useCallback((timestamp: number) => {
    // This would need a ref to the video player
    // For now, we can pass it down
  }, []);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Storage usage bar + FFmpeg status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <StorageUsageBar showUpgradeButton />
        <FFmpegStatusIndicator className="shrink-0" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - Video Player */}
        <div className="lg:col-span-2 space-y-4">
          {/* Video Player */}
          {selectedVersion && videoUrl ? (
            <VideoPlayer
              src={videoUrl}
              onAddComment={handleAddComment}
              className="aspect-video w-full"
            />
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
            projectId={projectId}
            workspaceId={workspaceId}
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
                  projectId={projectId}
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
                projectId={projectId}
                workspaceId={workspaceId}
                videoVersionId={selectedVersion?.id || null}
                versionNumber={selectedVersion?.version_number || null}
              />
              
              <Separator />
              
              <ApprovalShareLink
                projectId={projectId}
                workspaceId={workspaceId}
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
