import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useMemo } from 'react';
import Hls from 'hls.js';
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
  hlsUrl?: string | null;
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

// Build canonical HLS URL using videodelivery.net (most compatible)
function buildCanonicalHlsUrl(streamUid: string): string {
  return `https://videodelivery.net/${streamUid}/manifest/video.m3u8`;
}

// Extract streamUid from various Cloudflare Stream URL formats
function extractStreamUidFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // Format: customer-*.cloudflarestream.com/<uid>/...
    // Format: videodelivery.net/<uid>/...
    const pathParts = u.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 1) {
      // The UID is typically a 32-char hex string
      const potentialUid = pathParts[0];
      if (/^[a-f0-9]{32}$/.test(potentialUid)) {
        return potentialUid;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({ 
  src, 
  streamUid,
  hlsUrl,
  isProcessing = false,
  comments = [], 
  onCommentClick, 
  onAddComment,
  className 
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
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
  const retryCountRef = useRef(0);

  // Memoize video source to prevent unnecessary re-renders and HLS destruction
  const videoSource = useMemo((): { type: 'hls' | 'native' | 'none'; url: string | null } => {
    // Priority 1: Cloudflare Stream UID - use canonical videodelivery.net URL
    if (streamUid) {
      return { type: 'hls', url: buildCanonicalHlsUrl(streamUid) };
    }

    // Priority 2: Direct HLS URL provided - normalize to videodelivery.net if possible
    if (hlsUrl) {
      const extractedUid = extractStreamUidFromUrl(hlsUrl);
      if (extractedUid) {
        return { type: 'hls', url: buildCanonicalHlsUrl(extractedUid) };
      }
      return { type: 'hls', url: hlsUrl };
    }

    // Priority 3: src might be an HLS URL or video file
    if (src) {
      const extractedUid = extractStreamUidFromUrl(src);
      if (extractedUid) {
        return { type: 'hls', url: buildCanonicalHlsUrl(extractedUid) };
      }
      if (src.includes('.m3u8')) {
        return { type: 'hls', url: src };
      }
      return { type: 'native', url: src };
    }

    return { type: 'none', url: null };
  }, [src, streamUid, hlsUrl]);

  // Reset retry count when source changes
  useEffect(() => {
    retryCountRef.current = 0;
  }, [videoSource.url]);

  // Initialize HLS.js or native playback - depends on stable URL string
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (videoSource.type === 'none' || !videoSource.url) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    if (videoSource.type === 'hls') {
      // Check if browser supports HLS natively (Safari)
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = videoSource.url;
        video.load();
      } else if (Hls.isSupported()) {
        // Use hls.js for other browsers
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
        });
        
        hls.loadSource(videoSource.url);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
        });
        
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            console.error('HLS fatal error:', data);
            
            // Build detailed error message for debugging
            let errorDetail = `${data.type}`;
            if (data.details) {
              errorDetail += ` (${data.details})`;
            }
            if (data.response?.code) {
              errorDetail += ` - HTTP ${data.response.code}`;
            }
            
            let userMessage = 'Falha ao carregar o vídeo';
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              if (data.response?.code === 403) {
                userMessage = 'Acesso ao vídeo bloqueado (403). Tenta "Corrigir" a versão.';
              } else if (data.response?.code === 404) {
                userMessage = 'Vídeo não encontrado (404). Pode ainda estar a processar.';
              } else {
                userMessage = `Erro de rede: ${errorDetail}`;
              }
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              // Try to recover from media errors once
              if (retryCountRef.current < 1) {
                retryCountRef.current++;
                console.log('Attempting HLS media error recovery...');
                hls.recoverMediaError();
                return;
              }
              userMessage = `Erro de media: ${errorDetail}`;
            }
            
            console.error('HLS error detail:', errorDetail);
            setLoadError(userMessage);
            setIsLoading(false);
          }
        });
        
        hlsRef.current = hls;
      } else {
        setLoadError('O teu browser não suporta reprodução de vídeo HLS.');
        setIsLoading(false);
      }
    } else {
      // Native video playback
      video.src = videoSource.url;
      video.load();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [videoSource.url]); // Stable URL dependency prevents unnecessary re-initialization

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    seekTo: (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
        setCurrentTime(time);
      }
    },
    getCurrentTime: () => currentTime,
    pause: () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      setIsPlaying(false);
    },
    play: () => {
      if (videoRef.current) {
        videoRef.current.play();
      }
      setIsPlaying(true);
    },
  }), [currentTime]);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
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
    setIsLoading(false);
    setLoadError(null);
  }, []);

  const handleVideoError = useCallback(() => {
    const video = videoRef.current;
    const mediaError = video?.error;
    
    // Try to recover from Error Code 4 (MEDIA_ERR_SRC_NOT_SUPPORTED) once
    if (mediaError?.code === 4 && hlsRef.current && retryCountRef.current < 1) {
      retryCountRef.current++;
      console.log('Recovering from media error code 4...');
      try {
        hlsRef.current.recoverMediaError();
        return;
      } catch (e) {
        console.error('Failed to recover from media error:', e);
      }
    }
    
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
    }
    setCurrentTime(value[0]);
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
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  }, [duration, currentTime]);

  const handleAddComment = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setIsPlaying(false);
    onAddComment?.(currentTime);
  }, [currentTime, onAddComment]);

  const seekToTimestamp = useCallback((timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
    }
    setCurrentTime(timestamp);
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

  // Video event listeners
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

  // Reset state when source changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [videoSource.url]);

  // Calculate comment markers positions
  const commentMarkers = comments.map(comment => ({
    ...comment,
    position: duration > 0 ? (comment.timestamp_seconds / duration) * 100 : 0,
  }));

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
      {/* Native video element with HLS support */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        preload="metadata"
        playsInline
        style={{ aspectRatio: '16/9' }}
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
          <p className="mt-2 text-xs text-white/70">Tenta clicar em "Atualizar" ou recarregar a página.</p>
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
});

VideoPlayer.displayName = 'VideoPlayer';
