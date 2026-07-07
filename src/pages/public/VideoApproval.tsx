import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useHlsPlayer } from '@/hooks/useHlsPlayer';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Send,
  ArrowLeftRight,
  X,
  Trash2,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { formatTimecode } from '@/lib/duration-utils';
import { cn } from '@/lib/utils';
import logoIconCyan from '@/assets/logo-willflow-icon-cyan.png';
import logoIconPurple from '@/assets/logo-willflow-icon-purple.png';
import { ComparisonPlayer } from '@/components/video/ComparisonPlayer';
import { useVideoDownload } from '@/hooks/useVideoDownload';
import { ApprovedState } from '@/pages/public/ApprovedState';

import { logger } from '@/lib/logger';
interface VideoVersion {
  id: string;
  version_number: number;
  file_path: string;
  file_name: string;
  file_size_bytes: number;
  duration_seconds: number | null;
  created_at: string;
  workspace_id: string;
  task_id: string | null;
  project_id: string | null;
}

interface VideoComment {
  id: string;
  video_version_id: string;
  timestamp_seconds: number;
  body: string;
  status: 'open' | 'resolved';
  is_client_comment: boolean;
  client_name: string | null;
  created_at: string;
}

interface ApprovalData {
  task: {
    id: string;
    title: string;
    project_name: string;
  };
  versions: VideoVersion[];
  comments: VideoComment[];
  approval: {
    approved_at: string;
    client_name: string | null;
    notes: string | null;
    version_number: number | null;
  } | null;
  client_name: string | null;
  workspace_id: string;
  signed_urls: Record<string, string>;
}

// Local storage key for client name persistence
const CLIENT_NAME_KEY = 'willflow_client_name';

export default function VideoApproval() {
  const { token } = useParams<{ token: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const hideControlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApprovalData | null>(null);

  // Player state
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [compareVersionId, setCompareVersionId] = useState<string>('');
  const [isComparing, setIsComparing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  // Inline comment state (Frame.io style - always visible)
  const [commentTimestamp, setCommentTimestamp] = useState(0);
  const [hasStartedTyping, setHasStartedTyping] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [clientName, setClientName] = useState(() => {
    return localStorage.getItem(CLIENT_NAME_KEY) || '';
  });
  const [submittingComment, setSubmittingComment] = useState(false);

  // Approval state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalName, setApprovalName] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [submittingApproval, setSubmittingApproval] = useState(false);

  // Delete comment state
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  // Save client name to localStorage when it changes
  useEffect(() => {
    if (clientName.trim()) {
      localStorage.setItem(CLIENT_NAME_KEY, clientName.trim());
    }
  }, [clientName]);

  // Fetch data using edge function
  const fetchApprovalData = useCallback(async () => {
    if (!token) {
      setError('Token inválido');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-video-approval-data?token=${encodeURIComponent(token)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao carregar dados');
      }

      const approvalData: ApprovalData = await response.json();

      setData(approvalData);
      if (!clientName && approvalData.client_name) {
        setClientName(approvalData.client_name);
      }

      // Set initial version
      if (approvalData.versions.length > 0) {
        setSelectedVersionId(approvalData.versions[0].id);
        if (approvalData.versions.length > 1) {
          setCompareVersionId(approvalData.versions[1].id);
        }
      }

      setLoading(false);
    } catch (err: any) {
      logger.error('Error fetching approval data:', err);
      setError(err.message || 'Erro ao carregar dados de aprovação');
      setLoading(false);
    }
  }, [token]);

  // Refresh comments only (without reloading the entire page/player)
  const refreshComments = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-video-approval-data?token=${encodeURIComponent(token)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );

      if (!response.ok) return;

      const approvalData: ApprovalData = await response.json();
      
      // Update ONLY the comments in state (keeps video player intact)
      setData(prev => prev ? { ...prev, comments: approvalData.comments } : null);
    } catch (err) {
      logger.error('Error refreshing comments:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchApprovalData();
  }, [fetchApprovalData]);

  // HLS setup via shared hook
  const videoUrl = data?.signed_urls[selectedVersionId];
  const hlsSourceType = videoUrl
    ? (videoUrl.includes('.m3u8') ? 'hls' : 'native')
    : 'none';

  useHlsPlayer({
    videoRef,
    url: videoUrl ?? null,
    type: hlsSourceType,
    preferHighestQuality: true,
    onFatalError: (errData) => {
      logger.error('[VideoApproval] HLS fatal error after recovery attempts:', errData);
    },
  });

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const seekTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    seekTo(newTime);
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  // Hover controls logic
  const handlePlayerMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    hideControlsTimeout.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, 3000);
  }, []);

  const handlePlayerMouseLeave = useCallback(() => {
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    if (videoRef.current && !videoRef.current.paused) {
      setShowControls(false);
    }
  }, []);

  // Extract Cloudflare Stream UID for thumbnail
  const posterUrl = (() => {
    if (!videoUrl) return undefined;
    const match = videoUrl.match(/videodelivery\.net\/([a-f0-9]+)/i);
    if (match) {
      return `https://videodelivery.net/${match[1]}/thumbnails/thumbnail.jpg?time=50p`;
    }
    return undefined;
  })();

  // Handle comment text change - auto-capture timecode on first keystroke
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    // If starting to type (from empty to something)
    if (!commentText && newValue) {
      // Pause video and capture EXACT timecode directly from video element
      if (videoRef.current) {
        // Capture exact position BEFORE pausing for maximum precision
        const exactTimestamp = videoRef.current.currentTime;
        videoRef.current.pause();
        setIsPlaying(false);
        setCommentTimestamp(exactTimestamp);
        setCurrentTime(exactTimestamp); // Sync state to match
      } else {
        // Fallback if no video ref
        setCommentTimestamp(currentTime);
      }
      setHasStartedTyping(true);
    }
    
    // If cleared everything, reset timecode
    if (commentText && !newValue) {
      setHasStartedTyping(false);
      setCommentTimestamp(0);
    }
    
    setCommentText(newValue);
  };

  // Submit comment via edge function (with optimistic update)
  const handleSubmitComment = async () => {
    if (!commentText.trim() || !clientName.trim() || !data || !token) return;

    // Create optimistic comment
    const optimisticComment: VideoComment = {
      id: crypto.randomUUID(),
      video_version_id: selectedVersionId,
      timestamp_seconds: commentTimestamp,
      body: commentText.trim(),
      status: 'open',
      is_client_comment: true,
      client_name: clientName.trim(),
      created_at: new Date().toISOString(),
    };

    // Immediately add to local state (optimistic update)
    setData(prev => prev ? {
      ...prev,
      comments: [...prev.comments, optimisticComment]
    } : null);

    // Clear form immediately for instant feedback
    const savedCommentText = commentText.trim();
    const savedTimestamp = commentTimestamp;
    setCommentText('');
    setHasStartedTyping(false);
    setCommentTimestamp(0);

    setSubmittingComment(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-video-feedback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            type: 'comment',
            token,
            video_version_id: selectedVersionId,
            timestamp_seconds: savedTimestamp,
            body: savedCommentText,
            client_name: clientName.trim(),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao enviar comentário');
      }

      // Sync with backend to get real ID (without reloading player)
      await refreshComments();
    } catch (err: any) {
      logger.error('Error submitting comment:', err);
      // Revert optimistic update on error
      setData(prev => prev ? {
        ...prev,
        comments: prev.comments.filter(c => c.id !== optimisticComment.id)
      } : null);
      alert(err.message || 'Erro ao enviar comentário');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Submit approval via edge function
  const handleSubmitApproval = async () => {
    if (!approvalName.trim() || !data || !token) return;

    setSubmittingApproval(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-video-feedback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            type: 'approval',
            token,
            video_version_id: selectedVersionId,
            client_name: approvalName.trim(),
            notes: approvalNotes.trim() || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao aprovar vídeo');
      }

      await fetchApprovalData();
      setShowApprovalModal(false);
    } catch (err: any) {
      logger.error('Error submitting approval:', err);
      alert(err.message || 'Erro ao aprovar vídeo');
    } finally {
      setSubmittingApproval(false);
    }
  };

  // Delete comment via edge function
  const handleDeleteComment = async (commentId: string) => {
    if (!clientName.trim() || !token) return;

    setDeletingCommentId(commentId);
    
    // Optimistic update: remove from local state immediately
    const originalComments = data?.comments || [];
    setData(prev => prev ? {
      ...prev,
      comments: prev.comments.filter(c => c.id !== commentId)
    } : null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-video-comment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            token,
            comment_id: commentId,
            client_name: clientName.trim(),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao apagar comentário');
      }

      // Sync with backend
      await refreshComments();
    } catch (err: any) {
      logger.error('Error deleting comment:', err);
      // Revert optimistic update on error
      setData(prev => prev ? {
        ...prev,
        comments: originalComments
      } : null);
      alert(err.message || 'Erro ao apagar comentário');
    } finally {
      setDeletingCommentId(null);
    }
  };

  // Get comments for current version, sorted by timestamp
  const currentComments = (data?.comments.filter(
    c => c.video_version_id === selectedVersionId
  ) || []).sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);

  const openCommentsCount = currentComments.filter(c => c.status === 'open').length;
  const resolvedCommentsCount = currentComments.filter(c => c.status === 'resolved').length;

  // Group comments by timestamp for markers (multiple comments at same time)
  const commentMarkers = currentComments.reduce((acc, comment) => {
    const key = Math.floor(comment.timestamp_seconds);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(comment);
    return acc;
  }, {} as Record<number, VideoComment[]>);

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `há ${diffMins} min`;
    if (diffHours < 24) return `há ${diffHours}h`;
    if (diffDays < 7) return `há ${diffDays}d`;
    return date.toLocaleDateString('pt-PT');
  };

  // Render loading
  if (loading) {
    return (
      <>
        <Helmet>
          <meta name="robots" content="noindex, nofollow, noarchive" />
          <meta name="googlebot" content="noindex, nofollow, noarchive" />
          <title>Studio Review | WillFlow</title>
        </Helmet>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">A carregar...</p>
          </div>
        </div>
      </>
    );
  }

  // Render error
  if (error || !data) {
    return (
      <>
        <Helmet>
          <meta name="robots" content="noindex, nofollow, noarchive" />
          <meta name="googlebot" content="noindex, nofollow, noarchive" />
          <title>Studio Review | WillFlow</title>
        </Helmet>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Link Inválido</h2>
              <p className="text-muted-foreground">{error || 'Este link de aprovação não é válido.'}</p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // Render approved state
  if (data.approval) {
    return (
      <ApprovedState data={data} token={token} />
    );
  }

  const selectedVersion = data.versions.find(v => v.id === selectedVersionId);

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow, noarchive" />
        <meta name="googlebot" content="noindex, nofollow, noarchive" />
        <title>Studio Review | WillFlow</title>
      </Helmet>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={logoIconPurple} alt="WillFlow" className="h-8 w-8 dark:hidden" />
              <img src={logoIconCyan} alt="WillFlow" className="h-8 w-8 hidden dark:block" />
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="font-semibold">Studio Review</h1>
                <p className="text-sm text-muted-foreground">{data.task.project_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Version selector */}
              <Select value={selectedVersionId} onValueChange={setSelectedVersionId}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {data.versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      Versão {v.version_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Compare toggle */}
              {data.versions.length > 1 && (
                <Button
                  variant={isComparing ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setIsComparing(!isComparing)}
                >
                  <ArrowLeftRight className="h-4 w-4 mr-1" />
                  Comparar
                </Button>
              )}

              {/* Approve button */}
              <Button onClick={() => setShowApprovalModal(true)}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Aprovar
              </Button>
            </div>
          </div>
        </header>

        <main className="container py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Comments Sidebar - LEFT (Frame.io style) */}
            <div className="order-2 lg:order-1 space-y-4">
              <Card className="h-fit">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Comentários
                    </CardTitle>
                    <div className="flex items-center gap-1.5">
                      {openCommentsCount > 0 && (
                        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                          {openCommentsCount} aberto{openCommentsCount !== 1 ? 's' : ''}
                        </Badge>
                      )}
                      {resolvedCommentsCount > 0 && (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {resolvedCommentsCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {currentComments.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Sem comentários nesta versão
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Comece a escrever abaixo do player
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[450px] pr-3 -mr-3">
                      <div className="space-y-3">
                        {currentComments.map((comment) => (
                          <div
                            key={comment.id}
                            className={cn(
                              'group p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent/50',
                              comment.status === 'resolved' && 'opacity-60'
                            )}
                            onClick={() => seekTo(comment.timestamp_seconds)}
                          >
                            {/* Header: timecode + status + delete */}
                            <div className="flex items-center justify-between mb-2">
                              <button className="flex items-center gap-1.5 rounded bg-primary/10 px-2 py-1 text-xs font-mono text-primary hover:bg-primary/20 transition-colors">
                                <Clock className="h-3 w-3" />
                                {formatTimecode(comment.timestamp_seconds)}
                              </button>
                              
                              <div className="flex items-center gap-2">
                                {comment.status === 'resolved' ? (
                                  <span className="flex items-center gap-1 text-xs text-green-600">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Resolvido
                                  </span>
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                )}
                                
                                {/* Delete button - only for client's own comments */}
                                {comment.is_client_comment && 
                                 comment.client_name?.toLowerCase().trim() === clientName.toLowerCase().trim() && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm('Apagar este comentário?')) {
                                        handleDeleteComment(comment.id);
                                      }
                                    }}
                                    disabled={deletingCommentId === comment.id}
                                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                    title="Apagar comentário"
                                  >
                                    {deletingCommentId === comment.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3 w-3" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Comment body */}
                            <p className={cn(
                              'text-sm',
                              comment.status === 'resolved' && 'line-through'
                            )}>
                              {comment.body}
                            </p>

                            {/* Footer: author + time */}
                            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                              <span className="font-medium">{comment.client_name || 'Anónimo'}</span>
                              <span>{formatRelativeTime(comment.created_at)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Video Player - RIGHT (2 columns) */}
            <div className="order-1 lg:order-2 lg:col-span-2 space-y-4">
              {/* Comparison Mode */}
              {isComparing ? (
                <Card className="p-4">
                  <ComparisonPlayer
                    versions={data.versions}
                    signedUrls={data.signed_urls}
                    leftVersionId={selectedVersionId}
                    rightVersionId={compareVersionId}
                    onLeftVersionChange={setSelectedVersionId}
                    onRightVersionChange={setCompareVersionId}
                    onClose={() => setIsComparing(false)}
                  />
                </Card>
              ) : (
                <>
                  <Card className="overflow-hidden">
                    <div
                      className="relative bg-black w-full aspect-video max-h-[85vh] cursor-pointer"
                      onMouseMove={handlePlayerMouseMove}
                      onMouseLeave={handlePlayerMouseLeave}
                    >
                      {videoUrl ? (
                        <video
                          ref={videoRef}
                          className="absolute inset-0 w-full h-full object-contain"
                          poster={posterUrl}
                          onTimeUpdate={handleTimeUpdate}
                          onLoadedMetadata={handleLoadedMetadata}
                          onPlay={() => { setIsPlaying(true); setShowControls(true); }}
                          onPause={() => { setIsPlaying(false); setShowControls(true); }}
                          onEnded={() => { setIsPlaying(false); setShowControls(true); }}
                          onClick={togglePlay}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-white/50" />
                        </div>
                      )}

                      {/* Central play overlay when paused */}
                      {videoUrl && !isPlaying && (
                        <div
                          className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        >
                          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                            <Play className="h-7 w-7 text-black ml-1" />
                          </div>
                        </div>
                      )}

                      {/* Controls overlay with hover transition */}
                      <div className={cn(
                        "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300",
                        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
                      )}>
                        {/* Progress bar with comment markers */}
                        <div className="relative mb-3">
                          <div
                            className="h-1.5 bg-white/30 rounded-full cursor-pointer relative"
                            onClick={handleProgressClick}
                          >
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
                            />
                            
                            {/* Comment markers on timeline */}
                            {duration > 0 && Object.entries(commentMarkers).map(([timestamp, comments]) => {
                              const position = (parseInt(timestamp) / duration) * 100;
                              const hasOpen = comments.some(c => c.status === 'open');
                              const count = comments.length;
                              
                              return (
                                <Tooltip key={timestamp}>
                                  <TooltipTrigger asChild>
                                    <button
                                      className={cn(
                                        'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full transition-all hover:scale-125 z-10',
                                        count > 1 ? 'w-4 h-4' : 'w-3 h-3',
                                        hasOpen ? 'bg-yellow-500' : 'bg-green-500'
                                      )}
                                      style={{ left: `${position}%` }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        seekTo(parseInt(timestamp));
                                      }}
                                    >
                                      {count > 1 && (
                                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-black">
                                          {count}
                                        </span>
                                      )}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <div className="space-y-1">
                                      <p className="font-mono text-xs text-muted-foreground">{formatTimecode(parseInt(timestamp))}</p>
                                      {comments.slice(0, 2).map(c => (
                                        <div key={c.id} className="flex items-start gap-1.5">
                                          <span className={cn(
                                            'w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
                                            c.status === 'open' ? 'bg-yellow-500' : 'bg-green-500'
                                          )} />
                                          <p className="text-xs line-clamp-2">{c.body}</p>
                                        </div>
                                      ))}
                                      {count > 2 && (
                                        <p className="text-xs text-muted-foreground">+{count - 2} mais</p>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="text-white" onClick={togglePlay}>
                              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="text-white" onClick={toggleMute}>
                              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                            </Button>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="text-white" onClick={toggleFullscreen}>
                              <Maximize className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Timecode below player, always visible */}
                  <div className="text-center mt-2">
                    <span className="font-mono text-sm text-muted-foreground">
                      {formatTimecode(currentTime)} / {formatTimecode(duration)}
                    </span>
                  </div>

                  {/* Always visible comment input (Frame.io style) */}
                  <Card className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Timecode badge - shows when user starts typing */}
                      {hasStartedTyping && (
                        <div className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1.5 text-sm font-mono text-primary shrink-0">
                          <Clock className="h-3.5 w-3.5" />
                          {formatTimecode(commentTimestamp)}
                        </div>
                      )}

                      <div className="flex-1 space-y-3">
                        {/* Comment textarea */}
                        <Textarea
                          ref={commentInputRef}
                          placeholder="Adicione um comentário..."
                          value={commentText}
                          onChange={handleCommentChange}
                          className="min-h-[60px] resize-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                              handleSubmitComment();
                            }
                          }}
                        />

                        {/* Name input and submit button */}
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-1">
                            <Label htmlFor="client-name-input" className="text-xs text-muted-foreground">
                              O seu nome
                            </Label>
                            <Input
                              id="client-name-input"
                              placeholder="Ex: João Silva"
                              value={clientName}
                              onChange={(e) => setClientName(e.target.value)}
                              className="h-9 w-[200px]"
                            />
                          </div>
                          
                          <div className="flex-1" />
                          
                          {clientName && (
                            <p className="text-xs text-muted-foreground hidden sm:block">
                              <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">⌘</kbd>
                              <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] ml-0.5">Enter</kbd>
                            </p>
                          )}
                          
                          <Button
                            size="sm"
                            onClick={handleSubmitComment}
                            disabled={!commentText.trim() || !clientName.trim() || submittingComment}
                          >
                            {submittingComment ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-1" />
                                Enviar
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Version info */}
                  {selectedVersion && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        Versão {selectedVersion.version_number} • {selectedVersion.file_name}
                      </span>
                      <span>
                        Enviado {new Date(selectedVersion.created_at).toLocaleDateString('pt-PT')}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Retention policy notice */}
              <div className="text-center text-xs text-muted-foreground mt-4 pb-2">
                <p>Os vídeos são mantidos durante 7 dias após a tarefa ser concluída</p>
              </div>
            </div>
          </div>
        </main>

        {/* Approval Modal */}
        <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aprovar Vídeo</DialogTitle>
              <DialogDescription>
                Confirme a aprovação da Versão {selectedVersion?.version_number}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="approval-name">O seu nome *</Label>
                <Input
                  id="approval-name"
                  value={approvalName}
                  onChange={(e) => setApprovalName(e.target.value)}
                  placeholder="Ex: João Silva"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="approval-notes">Notas (opcional)</Label>
                <Textarea
                  id="approval-notes"
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Alguma observação adicional..."
                  rows={3}
                />
              </div>

              {openCommentsCount > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm text-yellow-600 dark:text-yellow-400">
                  <AlertCircle className="h-4 w-4 inline mr-2" />
                  Existem {openCommentsCount} comentário{openCommentsCount !== 1 ? 's' : ''} em aberto.
                  Confirme que pretende aprovar mesmo assim.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApprovalModal(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitApproval}
                disabled={!approvalName.trim() || submittingApproval}
                className="bg-green-600 hover:bg-green-700"
              >
                {submittingApproval ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Confirmar Aprovação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </TooltipProvider>
    </>
  );
}
