import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useMemo } from 'react';
import Hls from 'hls.js';
import { useHlsPlayer } from '@/hooks/useHlsPlayer';
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
  Loader2,
  Camera
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VideoComment } from '@/hooks/useVideoComments';
import { formatTimecode } from '@/lib/duration-utils';

interface VideoPlayerProps {
  src?: string;
  streamUid?: string | null;
  hlsUrl?: string | null;
  isProcessing?: boolean;
  comments?: VideoComment[];
  onCommentClick?: (comment: VideoComment) => void;
  onAddComment?: (timestampSeconds: number) => void;
  onSetThumbnail?: (timestampSeconds: number) => void;
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
  onSetThumbnail,
  className 
}, ref) => {
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
  const hideControlsTimeout = useRef<ReturnType<typeof setTimeout>>();
  
  // Video aspect ratio detection for portrait/landscape layout
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);
  const [isPortrait, setIsPortrait] = useState(false);
  
  // Enhanced recovery tracking
  const retryCountRef = useRef(0);
  const lastTimeRef = useRef(0);
  const maxRecoveryAttempts = 3;
  const maxReinitAttempts = 5;
  
  // Seek detection for smarter error recovery
  const seekDetectedRef = useRef(false);
  const lastSeekPositionRef = useRef(0);

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

  // Track when we're inside a reinit pass so MANIFEST_PARSED can clear loading state
  const reinitPassRef = useRef(false);

  // Centralized HLS lifecycle (handles attach, native Safari, cleanup)
  const { hlsRef, reinit: reinitHls } = useHlsPlayer({
    videoRef,
    url: videoSource.url,
    type: videoSource.type,
    onManifestParsed: () => {
      setIsLoading(false);
      setLoadError(null);
    },
    // VideoPlayer manages its own retry counters in handleVideoError,
    // so we disable hook-level auto-recovery and react to fatal errors here.
    autoRecover: false,
    onFatalError: (data) => {
      if (reinitPassRef.current) {
        console.error('[VideoPlayer] HLS fatal error during reinit:', data);
        setLoadError('Falha ao carregar o vídeo. Tenta atualizar a página.');
        setIsLoading(false);
        return;
      }

      console.error('HLS fatal error:', data);

      let errorDetail = `${data.type}`;
      if (data.details) errorDetail += ` (${data.details})`;
      if (data.response?.code) errorDetail += ` - HTTP ${data.response.code}`;

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
        // Try in-place media recovery once before surfacing the error
        if (retryCountRef.current < 1 && hlsRef.current) {
          retryCountRef.current++;
          console.log('Attempting HLS media error recovery...');
          try { hlsRef.current.recoverMediaError(); return; } catch { /* fall through */ }
        }
        userMessage = `Erro de media: ${errorDetail}`;
      } else if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR && !Hls.isSupported()) {
        userMessage = 'O teu browser não suporta reprodução de vídeo HLS.';
      }

      console.error('HLS error detail:', errorDetail);
      setLoadError(userMessage);
      setIsLoading(false);
    },
  });

  // Set loading state when the source becomes available (hook handles attach)
  useEffect(() => {
    if (videoSource.type === 'none' || !videoSource.url) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
  }, [videoSource.url, videoSource.type]);

  // Wrapper preserving the original reinitializeHls behavior
  const reinitializeHls = useCallback((preservedTime: number) => {
    if (videoSource.type !== 'hls' || !videoSource.url) return;
    console.log('[VideoPlayer] Reinitializing HLS at timestamp:', preservedTime);
    reinitPassRef.current = true;
    reinitHls(preservedTime);
    // Clear the reinit flag on the next tick after MANIFEST_PARSED has a chance to fire
    setTimeout(() => { reinitPassRef.current = false; }, 0);
  }, [reinitHls, videoSource.type, videoSource.url]);


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
    },
    play: () => {
      if (videoRef.current) {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            if (err.name !== 'AbortError') {
              console.error('[VideoPlayer] Play error via ref:', err);
            }
          });
        }
      }
    },
  }), [currentTime]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      // play() returns a Promise - must catch AbortError when pause() is called quickly after play()
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          // AbortError is expected when pause() interrupts play() - silently ignore
          if (err.name !== 'AbortError') {
            console.error('[VideoPlayer] Play error:', err);
          }
        });
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
      const { videoWidth, videoHeight } = videoRef.current;
      if (videoWidth && videoHeight) {
        const ratio = videoWidth / videoHeight;
        setVideoAspectRatio(ratio);
        setIsPortrait(ratio < 1); // Vertical if width < height
      }
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
    
    // Determine best position for recovery
    const preserveTime = seekDetectedRef.current 
      ? lastSeekPositionRef.current 
      : (video?.currentTime && video.currentTime > 0 ? video.currentTime : lastTimeRef.current);
    
    lastTimeRef.current = preserveTime;
    
    // Priority: If error happened after a seek, reinitialize immediately (faster recovery)
    if (seekDetectedRef.current && videoSource.type === 'hls' && videoSource.url) {
      console.log('[VideoPlayer] Seek-triggered error, reinitializing at:', preserveTime);
      seekDetectedRef.current = false;
      retryCountRef.current++; // Still count to prevent infinite loops
      reinitializeHls(preserveTime);
      return;
    }
    
    // Phase 1: Try HLS media error recovery (up to maxRecoveryAttempts times)
    if (mediaError?.code === 4 && hlsRef.current && retryCountRef.current < maxRecoveryAttempts) {
      retryCountRef.current++;
      console.log(`[VideoPlayer] Recovery attempt ${retryCountRef.current}/${maxRecoveryAttempts}...`);
      try {
        hlsRef.current.recoverMediaError();
        return;
      } catch (e) {
        console.error('[VideoPlayer] Failed to recover from media error:', e);
      }
    }
    
    // Phase 2: Try full HLS reinitialization (up to maxReinitAttempts total)
    if (retryCountRef.current < maxReinitAttempts && videoSource.type === 'hls' && videoSource.url) {
      retryCountRef.current++;
      console.log(`[VideoPlayer] Reinit attempt ${retryCountRef.current}/${maxReinitAttempts}...`);
      reinitializeHls(preserveTime);
      return;
    }
    
    // All recovery attempts exhausted - show error
    const message = mediaError
      ? `Falha ao carregar o vídeo (código ${mediaError.code}).`
      : 'Falha ao carregar o vídeo.';
    setIsLoading(false);
    setIsPlaying(false);
    setLoadError(message);
  }, [reinitializeHls, videoSource.type, videoSource.url]);

  const handleSeek = useCallback((value: number[]) => {
    const newTime = value[0];
    // Track seek for smarter error recovery
    seekDetectedRef.current = true;
    lastSeekPositionRef.current = newTime;
    
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
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
    const handlePlaying = () => {
      // Reset seek flag and retry count on successful playback
      seekDetectedRef.current = false;
      retryCountRef.current = 0;
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleLoadedData);
    video.addEventListener('error', handleVideoError);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('playing', handlePlaying);
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
      className={cn(
        "relative group bg-black rounded-lg overflow-hidden",
        // For portrait videos, limit height and center
        isPortrait ? "max-h-[70vh] mx-auto" : "w-full",
        className
      )}
      style={{
        // Dynamic aspect ratio based on video dimensions
        aspectRatio: videoAspectRatio ? `${videoAspectRatio}` : '16/9',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Native video element with HLS support */}
      <video
        ref={videoRef}
        className="w-full h-full"
        style={{ 
          objectFit: 'contain',
          // Safari fix: min-height prevents collapse before metadata loads
          minHeight: '1px',
        }}
        onClick={togglePlay}
        preload="metadata"
        playsInline
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
              {formatTimecode(currentTime)} / {formatTimecode(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Set thumbnail button */}
            {onSetThumbnail && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onSetThumbnail(currentTime)}
                className="text-white hover:bg-white/20"
                title="Definir este frame como thumbnail"
              >
                <Camera className="h-4 w-4" />
              </Button>
            )}

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
