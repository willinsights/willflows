import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  MessageSquare,
  SkipBack,
  SkipForward
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VideoComment } from '@/hooks/useVideoComments';
import { formatDuration } from '@/lib/duration-utils';

interface VideoPlayerProps {
  src: string;
  comments?: VideoComment[];
  onCommentClick?: (comment: VideoComment) => void;
  onAddComment?: (timestampSeconds: number) => void;
  className?: string;
}

export function VideoPlayer({ 
  src, 
  comments = [], 
  onCommentClick, 
  onAddComment,
  className 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hideControlsTimeout = useRef<NodeJS.Timeout>();

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
      setLoadError(null);
    }
  }, []);

  const handleLoadedData = useCallback(() => {
    // Some browsers fire loadeddata/canplay even when loadedmetadata is flaky for cross-origin media
    setIsLoading(false);
    setLoadError(null);
  }, []);

  const handleVideoError = useCallback(() => {
    const video = videoRef.current;
    // Provide a friendly, actionable message
    const mediaError = video?.error;
    const message = mediaError
      ? `Falha ao carregar o vídeo (código ${mediaError.code}).`
      : 'Falha ao carregar o vídeo.';
    setIsLoading(false);
    setIsPlaying(false);
    setLoadError(message);
  }, []);

  const handleSeek = useCallback((value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  }, []);

  const handleVolumeChange = useCallback((value: number[]) => {
    if (videoRef.current) {
      const newVolume = value[0];
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const handleFullscreen = useCallback(() => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  }, []);

  const skip = useCallback((seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    }
  }, [duration]);

  const handleAddComment = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      onAddComment?.(currentTime);
    }
  }, [currentTime, onAddComment]);

  const seekToTimestamp = useCallback((timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
      setCurrentTime(timestamp);
    }
  }, []);

  // Show/hide controls on mouse movement
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    if (isPlaying) {
      hideControlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleLoadedData);
    video.addEventListener('error', handleVideoError);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', handleLoadedData);
      video.removeEventListener('error', handleVideoError);
    };
  }, [handleTimeUpdate, handleLoadedMetadata, handleLoadedData, handleVideoError]);

  // Reset loading state when src changes
  useEffect(() => {
    const video = videoRef.current;
    setIsLoading(true);
    setLoadError(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    // Ensure the element reloads the new source
    if (video) {
      try {
        video.pause();
        video.load();
      } catch {
        // no-op
      }
    }
  }, [src]);

  // Calculate comment markers positions
  const commentMarkers = comments.map(comment => ({
    ...comment,
    position: duration > 0 ? (comment.timestamp_seconds / duration) * 100 : 0,
  }));

  return (
    <div 
      ref={containerRef}
      className={cn("relative group bg-black rounded-lg overflow-hidden", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        preload="metadata"
      />

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {/* Error state */}
      {!isLoading && loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 px-6 text-center">
          <p className="text-sm text-white/90">{loadError}</p>
          <p className="mt-2 text-xs text-white/70">Tenta clicar em “Atualizar” ou recarregar a página.</p>
        </div>
      )}

      {/* Play button overlay */}
      {!isPlaying && !isLoading && !loadError && (
        <button
          className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity"
          onClick={togglePlay}
        >
          <div className="rounded-full bg-white/90 p-4">
            <Play className="h-8 w-8 text-black fill-black" />
          </div>
        </button>
      )}

      {/* Controls */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Progress bar with comment markers */}
        <div className="relative mb-3">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
          />
          
          {/* Comment markers */}
          {commentMarkers.map((comment) => (
            <button
              key={comment.id}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full transition-transform hover:scale-150",
                comment.status === 'open' ? 'bg-warning' : 'bg-green-500'
              )}
              style={{ left: `${comment.position}%` }}
              onClick={(e) => {
                e.stopPropagation();
                seekToTimestamp(comment.timestamp_seconds);
                onCommentClick?.(comment);
              }}
              title={comment.body.substring(0, 50)}
            />
          ))}
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => skip(-10)} className="text-white hover:bg-white/20">
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={togglePlay} className="text-white hover:bg-white/20">
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => skip(10)} className="text-white hover:bg-white/20">
              <SkipForward className="h-4 w-4" />
            </Button>
            
            {/* Time display */}
            <span className="text-sm text-white tabular-nums">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Add comment button */}
            {onAddComment && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleAddComment}
                className="text-white hover:bg-white/20"
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Comentar
              </Button>
            )}

            {/* Volume */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleMute} className="text-white hover:bg-white/20">
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.1}
                onValueChange={handleVolumeChange}
                className="w-20"
              />
            </div>

            {/* Fullscreen */}
            <Button variant="ghost" size="icon" onClick={handleFullscreen} className="text-white hover:bg-white/20">
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
