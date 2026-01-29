import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
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
  SkipForward,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VideoComment } from '@/hooks/useVideoComments';
import { formatDuration } from '@/lib/duration-utils';

interface VideoPlayerProps {
  src?: string;
  streamUid?: string | null;
  isProcessing?: boolean;
  comments?: VideoComment[];
  onCommentClick?: (comment: VideoComment) => void;
  onAddComment?: (timestampSeconds: number) => void;
  className?: string;
}

export interface VideoPlayerRef {
  seekTo: (time: number) => void;
  getCurrentTime: () => number;
  pause: () => void;
  play: () => void;
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({ 
  src, 
  streamUid,
  isProcessing = false,
  comments = [], 
  onCommentClick, 
  onAddComment,
  className 
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [useIframe, setUseIframe] = useState(false);
  const hideControlsTimeout = useRef<NodeJS.Timeout>();

  // Determine if we should use iframe (Cloudflare Stream) or native video
  useEffect(() => {
    if (streamUid && !src) {
      setUseIframe(true);
    } else if (src && src.includes('cloudflarestream.com')) {
      setUseIframe(true);
    } else {
      setUseIframe(false);
    }
  }, [src, streamUid]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    seekTo: (time: number) => {
      if (useIframe && iframeRef.current) {
        // For iframe, we need to use postMessage
        iframeRef.current.contentWindow?.postMessage({ type: 'seek', time }, '*');
      } else if (videoRef.current) {
        videoRef.current.currentTime = time;
        setCurrentTime(time);
      }
    },
    getCurrentTime: () => currentTime,
    pause: () => {
      if (useIframe && iframeRef.current) {
        iframeRef.current.contentWindow?.postMessage({ type: 'pause' }, '*');
      } else if (videoRef.current) {
        videoRef.current.pause();
      }
      setIsPlaying(false);
    },
    play: () => {
      if (useIframe && iframeRef.current) {
        iframeRef.current.contentWindow?.postMessage({ type: 'play' }, '*');
      } else if (videoRef.current) {
        videoRef.current.play();
      }
      setIsPlaying(true);
    },
  }), [currentTime, useIframe]);

  const togglePlay = useCallback(() => {
    if (useIframe && iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage({ type: isPlaying ? 'pause' : 'play' }, '*');
      setIsPlaying(!isPlaying);
    } else if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [isPlaying, useIframe]);

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
    setIsLoading(false);
    setLoadError(null);
  }, []);

  const handleVideoError = useCallback(() => {
    const video = videoRef.current;
    const mediaError = video?.error;
    const message = mediaError
      ? `Falha ao carregar o vídeo (código ${mediaError.code}).`
      : 'Falha ao carregar o vídeo.';
    setIsLoading(false);
    setIsPlaying(false);
    setLoadError(message);
  }, []);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
    setLoadError(null);
  }, []);

  const handleSeek = useCallback((value: number[]) => {
    if (useIframe && iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage({ type: 'seek', time: value[0] }, '*');
    } else if (videoRef.current) {
      videoRef.current.currentTime = value[0];
    }
    setCurrentTime(value[0]);
  }, [useIframe]);

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
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    if (useIframe && iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage({ type: 'seek', time: newTime }, '*');
    } else if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  }, [duration, currentTime, useIframe]);

  const handleAddComment = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if (useIframe && iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage({ type: 'pause' }, '*');
    }
    setIsPlaying(false);
    onAddComment?.(currentTime);
  }, [currentTime, onAddComment, useIframe]);

  const seekToTimestamp = useCallback((timestamp: number) => {
    if (useIframe && iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage({ type: 'seek', time: timestamp }, '*');
    } else if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
    }
    setCurrentTime(timestamp);
  }, [useIframe]);

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

  // Native video event listeners
  useEffect(() => {
    if (useIframe) return;
    
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
  }, [useIframe, handleTimeUpdate, handleLoadedMetadata, handleLoadedData, handleVideoError]);

  // Reset loading state when src changes
  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    if (!useIframe && videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.load();
      } catch {
        // no-op
      }
    }
  }, [src, streamUid, useIframe]);

  // Calculate comment markers positions
  const commentMarkers = comments.map(comment => ({
    ...comment,
    position: duration > 0 ? (comment.timestamp_seconds / duration) * 100 : 0,
  }));

  // Get iframe src for Cloudflare Stream
  const getIframeSrc = () => {
    if (streamUid) {
      return `https://iframe.cloudflarestream.com/${streamUid}`;
    }
    if (src && src.includes('cloudflarestream.com')) {
      // Extract UID from URL and construct iframe URL
      const match = src.match(/cloudflarestream\.com\/([a-zA-Z0-9]+)/);
      if (match) {
        return `https://iframe.cloudflarestream.com/${match[1]}`;
      }
    }
    return src;
  };

  // Processing state
  if (isProcessing) {
    return (
      <div 
        className={cn(
          "relative bg-black rounded-lg overflow-hidden flex items-center justify-center",
          className
        )}
        style={{ aspectRatio: '16/9' }}
      >
        <div className="text-center text-white">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
          <p className="text-sm">A processar vídeo...</p>
          <p className="text-xs text-white/60 mt-1">Isto pode demorar alguns minutos</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn("relative group bg-black rounded-lg overflow-hidden", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Cloudflare Stream iframe player */}
      {useIframe ? (
        <iframe
          ref={iframeRef}
          src={getIframeSrc()}
          className="w-full h-full"
          style={{ aspectRatio: '16/9', border: 'none' }}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          onLoad={handleIframeLoad}
        />
      ) : (
        /* Native video element */
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-contain"
          onClick={togglePlay}
          preload="metadata"
        />
      )}

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
          <p className="mt-2 text-xs text-white/70">Tenta clicar em "Atualizar" ou recarregar a página.</p>
        </div>
      )}

      {/* Play button overlay - only for native video */}
      {!useIframe && !isPlaying && !isLoading && !loadError && (
        <button
          className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity"
          onClick={togglePlay}
        >
          <div className="rounded-full bg-white/90 p-4">
            <Play className="h-8 w-8 text-black fill-black" />
          </div>
        </button>
      )}

      {/* Controls - only for native video */}
      {!useIframe && (
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
      )}
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';
