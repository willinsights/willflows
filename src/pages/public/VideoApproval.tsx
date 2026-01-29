import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
} from 'lucide-react';
import { formatDuration } from '@/lib/duration-utils';
import { cn } from '@/lib/utils';
import logoWhite from '@/assets/logo-willflow-white.png';
import logoBlack from '@/assets/logo-willflow-black.png';

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
  } | null;
  client_name: string | null;
  workspace_id: string;
  signed_urls: Record<string, string>;
}

export default function VideoApproval() {
  const { token } = useParams<{ token: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);

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

  // Comment state
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentTimestamp, setCommentTimestamp] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [clientName, setClientName] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Approval state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalName, setApprovalName] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [submittingApproval, setSubmittingApproval] = useState(false);

  // Fetch data using edge function
  const fetchApprovalData = useCallback(async () => {
    if (!token) {
      setError('Token inválido');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data: responseData, error: fetchError } = await supabase.functions.invoke(
        'get-video-approval-data',
        {
          body: null,
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'GET',
        }
      );

      // Fallback: use query params for GET
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-video-approval-data?token=${encodeURIComponent(token)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao carregar dados');
      }

      const approvalData: ApprovalData = await response.json();

      setData(approvalData);
      setClientName(approvalData.client_name || '');

      // Set initial version
      if (approvalData.versions.length > 0) {
        setSelectedVersionId(approvalData.versions[0].id);
        if (approvalData.versions.length > 1) {
          setCompareVersionId(approvalData.versions[1].id);
        }
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching approval data:', err);
      setError(err.message || 'Erro ao carregar dados de aprovação');
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchApprovalData();
  }, [fetchApprovalData]);

  // Player controls
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

  // Open comment modal
  const openCommentModal = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
      setCommentTimestamp(currentTime);
      setShowCommentModal(true);
    }
  };

  // Submit comment via edge function
  const handleSubmitComment = async () => {
    if (!commentText.trim() || !clientName.trim() || !data || !token) return;

    setSubmittingComment(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-video-feedback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            type: 'comment',
            token,
            video_version_id: selectedVersionId,
            timestamp_seconds: Math.floor(commentTimestamp),
            body: commentText.trim(),
            client_name: clientName.trim(),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao enviar comentário');
      }

      // Refresh data to show new comment
      await fetchApprovalData();
      setCommentText('');
      setShowCommentModal(false);
    } catch (err: any) {
      console.error('Error submitting comment:', err);
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
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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

      // Refresh data to show approval
      await fetchApprovalData();
      setShowApprovalModal(false);
    } catch (err: any) {
      console.error('Error submitting approval:', err);
      alert(err.message || 'Erro ao aprovar vídeo');
    } finally {
      setSubmittingApproval(false);
    }
  };

  // Get comments for current version
  const currentComments = data?.comments.filter(
    c => c.video_version_id === selectedVersionId
  ) || [];

  const openCommentsCount = currentComments.filter(c => c.status === 'open').length;

  // Render loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">A carregar...</p>
        </div>
      </div>
    );
  }

  // Render error
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Link Inválido</h2>
            <p className="text-muted-foreground">{error || 'Este link de aprovação não é válido.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render approved state
  if (data.approval) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card/50 backdrop-blur-sm">
          <div className="container py-4 flex items-center justify-between">
            <img src={logoBlack} alt="WillFlow" className="h-8 dark:hidden" />
            <img src={logoWhite} alt="WillFlow" className="h-8 hidden dark:block" />
            <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Aprovado
            </Badge>
          </div>
        </header>

        <main className="container py-12">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Vídeo Aprovado!</h1>
              <p className="text-muted-foreground mb-6">
                Este vídeo foi aprovado por <strong>{data.approval.client_name}</strong>
              </p>
              <div className="bg-muted/50 rounded-lg p-4 text-sm">
                <p><strong>Projeto:</strong> {data.task.project_name}</p>
                <p><strong>Tarefa:</strong> {data.task.title}</p>
                <p><strong>Aprovado em:</strong> {new Date(data.approval.approved_at).toLocaleString('pt-PT')}</p>
                {data.approval.notes && (
                  <p className="mt-2"><strong>Notas:</strong> {data.approval.notes}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const selectedVersion = data.versions.find(v => v.id === selectedVersionId);
  const videoUrl = data.signed_urls[selectedVersionId];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logoBlack} alt="WillFlow" className="h-8 dark:hidden" />
            <img src={logoWhite} alt="WillFlow" className="h-8 hidden dark:block" />
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="font-semibold">{data.task.title}</h1>
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
          {/* Video Player */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="overflow-hidden">
              <div className="relative bg-black aspect-video">
                {videoUrl ? (
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full h-full"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-white/50" />
                  </div>
                )}

                {/* Comment markers on timeline */}
                {currentComments.length > 0 && duration > 0 && (
                  <div className="absolute bottom-16 left-0 right-0 px-4">
                    {currentComments.map((comment) => {
                      const position = (comment.timestamp_seconds / duration) * 100;
                      return (
                        <button
                          key={comment.id}
                          className={cn(
                            'absolute -translate-x-1/2 w-3 h-3 rounded-full transition-transform hover:scale-150',
                            comment.status === 'resolved' ? 'bg-green-500' : 'bg-yellow-500'
                          )}
                          style={{ left: `${position}%` }}
                          onClick={() => seekTo(comment.timestamp_seconds)}
                          title={comment.body}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Controls overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  {/* Progress bar */}
                  <div
                    className="h-1 bg-white/30 rounded-full mb-3 cursor-pointer"
                    onClick={handleProgressClick}
                  >
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="text-white" onClick={togglePlay}>
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="text-white" onClick={toggleMute}>
                        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                      </Button>
                      <span className="text-white text-sm">
                        {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white"
                        onClick={openCommentModal}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Comentar
                      </Button>
                      <Button variant="ghost" size="icon" className="text-white" onClick={toggleFullscreen}>
                        <Maximize className="h-5 w-5" />
                      </Button>
                    </div>
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
          </div>

          {/* Comments Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Comentários
                  {openCommentsCount > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {openCommentsCount} aberto{openCommentsCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentComments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum comentário nesta versão.
                    <br />
                    Pause o vídeo e clique em "Comentar" para adicionar.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {currentComments.map((comment) => (
                      <div
                        key={comment.id}
                        className={cn(
                          'p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50',
                          comment.status === 'resolved' && 'opacity-60'
                        )}
                        onClick={() => seekTo(comment.timestamp_seconds)}
                      >
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="shrink-0 text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDuration(comment.timestamp_seconds)}
                          </Badge>
                          {comment.status === 'resolved' && (
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-sm mt-2">{comment.body}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {comment.client_name || 'Anónimo'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add Comment Button */}
            <Button className="w-full" variant="outline" onClick={openCommentModal}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Adicionar Comentário
            </Button>
          </div>
        </div>
      </main>

      {/* Comment Modal */}
      <Dialog open={showCommentModal} onOpenChange={setShowCommentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Comentário</DialogTitle>
            <DialogDescription>
              Comentário no tempo {formatDuration(Math.floor(commentTimestamp))}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">O seu nome *</Label>
              <Input
                id="client-name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: João Silva"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment-text">Comentário *</Label>
              <Textarea
                id="comment-text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Descreva a alteração pretendida..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCommentModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitComment}
              disabled={!commentText.trim() || !clientName.trim() || submittingComment}
            >
              {submittingComment ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
  );
}
