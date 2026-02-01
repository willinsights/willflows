import { useRef, useEffect, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  ArrowLeftRight,
  X,
} from 'lucide-react';
import { formatTimecode } from '@/lib/duration-utils';
import { cn } from '@/lib/utils';

interface VideoVersion {
  id: string;
  version_number: number;
  file_path: string;
  file_name: string;
  file_size_bytes: number;
  duration_seconds: number | null;
  created_at: string;
}

interface ComparisonPlayerProps {
  versions: VideoVersion[];
  signedUrls: Record<string, string>;
  leftVersionId: string;
  rightVersionId: string;
  onLeftVersionChange: (id: string) => void;
  onRightVersionChange: (id: string) => void;
  onClose: () => void;
}

export function ComparisonPlayer({
  versions,
  signedUrls,
  leftVersionId,
  rightVersionId,
  onLeftVersionChange,
  onRightVersionChange,
  onClose,
}: ComparisonPlayerProps) {
  const leftVideoRef = useRef<HTMLVideoElement>(null);
  const rightVideoRef = useRef<HTMLVideoElement>(null);
  const leftHlsRef = useRef<Hls | null>(null);
  const rightHlsRef = useRef<Hls | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const leftUrl = signedUrls[leftVersionId];
  const rightUrl = signedUrls[rightVersionId];
  const leftVersion = versions.find(v => v.id === leftVersionId);
  const rightVersion = versions.find(v => v.id === rightVersionId);

  // Setup HLS for a video element
  const setupHls = useCallback((
    videoRef: React.RefObject<HTMLVideoElement>,
    hlsRef: React.MutableRefObject<Hls | null>,
    url: string
  ) => {
    const video = videoRef.current;
    if (!video || !url) return;

    const isHls = url.includes('.m3u8');

    if (isHls && Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });

      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          }
        }
      });
    } else if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
    } else if (!isHls) {
      video.src = url;
    }
  }, []);

  // Setup both videos
  useEffect(() => {
    setupHls(leftVideoRef, leftHlsRef, leftUrl);
    return () => {
      if (leftHlsRef.current) {
        leftHlsRef.current.destroy();
        leftHlsRef.current = null;
      }
    };
  }, [leftUrl, setupHls]);

  useEffect(() => {
    setupHls(rightVideoRef, rightHlsRef, rightUrl);
    return () => {
      if (rightHlsRef.current) {
        rightHlsRef.current.destroy();
        rightHlsRef.current = null;
      }
    };
  }, [rightUrl, setupHls]);

  // Sync playback between videos
  const syncVideos = useCallback(() => {
    const leftVideo = leftVideoRef.current;
    const rightVideo = rightVideoRef.current;
    if (!leftVideo || !rightVideo || isSyncing) return;

    setIsSyncing(true);
    const targetTime = leftVideo.currentTime;
    
    if (Math.abs(rightVideo.currentTime - targetTime) > 0.1) {
      rightVideo.currentTime = targetTime;
    }
    
    requestAnimationFrame(() => setIsSyncing(false));
  }, [isSyncing]);

  // Handle time update - sync and update state
  const handleTimeUpdate = useCallback(() => {
    if (leftVideoRef.current) {
      setCurrentTime(leftVideoRef.current.currentTime);
      syncVideos();
    }
  }, [syncVideos]);

  // Handle loaded metadata
  const handleLoadedMetadata = useCallback(() => {
    if (leftVideoRef.current) {
      setDuration(leftVideoRef.current.duration);
    }
  }, []);

  // Toggle play/pause for both videos
  const togglePlay = useCallback(() => {
    const leftVideo = leftVideoRef.current;
    const rightVideo = rightVideoRef.current;
    if (!leftVideo || !rightVideo) return;

    if (isPlaying) {
      leftVideo.pause();
      rightVideo.pause();
    } else {
      // Sync before playing
      rightVideo.currentTime = leftVideo.currentTime;
      leftVideo.play();
      rightVideo.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Toggle mute for both videos
  const toggleMute = useCallback(() => {
    const leftVideo = leftVideoRef.current;
    const rightVideo = rightVideoRef.current;
    if (!leftVideo || !rightVideo) return;

    leftVideo.muted = !isMuted;
    rightVideo.muted = true; // Right video always muted to avoid echo
    setIsMuted(!isMuted);
  }, [isMuted]);

  // Seek both videos
  const seekTo = useCallback((time: number) => {
    const leftVideo = leftVideoRef.current;
    const rightVideo = rightVideoRef.current;
    if (!leftVideo || !rightVideo) return;

    leftVideo.currentTime = time;
    rightVideo.currentTime = time;
    setCurrentTime(time);
  }, []);

  // Handle progress bar click
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    seekTo(newTime);
  }, [duration, seekTo]);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    const container = document.getElementById('comparison-container');
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  }, []);

  return (
    <div id="comparison-container" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5 text-primary" />
          <span className="font-semibold">Modo Comparação</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4 mr-1" />
          Fechar
        </Button>
      </div>

      {/* Version selectors */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            A
          </Badge>
          <Select value={leftVersionId} onValueChange={onLeftVersionChange}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id} disabled={v.id === rightVersionId}>
                  Versão {v.version_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
            B
          </Badge>
          <Select value={rightVersionId} onValueChange={onRightVersionChange}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id} disabled={v.id === leftVersionId}>
                  Versão {v.version_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Side by side videos */}
      <div className="grid grid-cols-2 gap-2 bg-black rounded-lg overflow-hidden">
        {/* Left video */}
        <div className="relative aspect-video">
          <video
            ref={leftVideoRef}
            className="w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            muted={isMuted}
            playsInline
          />
          <div className="absolute top-2 left-2">
            <Badge className="bg-blue-500/80 text-white">
              A - V{leftVersion?.version_number}
            </Badge>
          </div>
        </div>

        {/* Right video */}
        <div className="relative aspect-video">
          <video
            ref={rightVideoRef}
            className="w-full h-full object-contain"
            muted // Always muted to avoid echo
            playsInline
          />
          <div className="absolute top-2 left-2">
            <Badge className="bg-orange-500/80 text-white">
              B - V{rightVersion?.version_number}
            </Badge>
          </div>
        </div>
      </div>

      {/* Shared controls */}
      <div className="bg-card border rounded-lg p-3">
        {/* Progress bar */}
        <div className="mb-3">
          <div
            className="h-2 bg-muted rounded-full cursor-pointer relative"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={togglePlay}>
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleMute}>
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
            <span className="text-sm font-mono text-muted-foreground">
              {formatTimecode(currentTime)} / {formatTimecode(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
              <Maximize className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
        <div>
          <p>{leftVersion?.file_name}</p>
          <p>Enviado {leftVersion && new Date(leftVersion.created_at).toLocaleDateString('pt-PT')}</p>
        </div>
        <div>
          <p>{rightVersion?.file_name}</p>
          <p>Enviado {rightVersion && new Date(rightVersion.created_at).toLocaleDateString('pt-PT')}</p>
        </div>
      </div>
    </div>
  );
}
