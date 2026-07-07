import { useCallback, useEffect, useRef } from 'react';
import Hls, { type ErrorData } from 'hls.js';

export type HlsSourceType = 'hls' | 'native' | 'none';

interface UseHlsPlayerOptions {
  videoRef: React.RefObject<HTMLVideoElement>;
  /** Stable URL string. When it changes, the player re-attaches. */
  url: string | null | undefined;
  /** 'hls' to use hls.js (or Safari native), 'native' for direct file, 'none' to skip. */
  type: HlsSourceType;
  /** Called when HLS manifest is parsed (or native metadata loaded). */
  onManifestParsed?: () => void;
  /** Called when a fatal error happens AFTER auto-recovery attempts are exhausted. */
  onFatalError?: (data: ErrorData) => void;
  /**
   * When true (default), the hook tries hls.recoverMediaError() once and
   * hls.startLoad() for transient network errors before bubbling up.
   */
  autoRecover?: boolean;
  /**
   * When true, forces the highest available HLS quality level on manifest parse
   * and disables adaptive downscaling based on player size.
   */
  preferHighestQuality?: boolean;
}

interface UseHlsPlayerResult {
  /** Imperative ref to the live hls.js instance (null when not using hls.js). */
  hlsRef: React.MutableRefObject<Hls | null>;
  /** Re-create the HLS instance, optionally seeking to a preserved time. */
  reinit: (preservedTime?: number) => void;
}

/**
 * Centralized HLS lifecycle for video players.
 *
 * Handles:
 * - hls.js attach/detach with cleanup on unmount or URL change
 * - Safari native HLS fallback (canPlayType('application/vnd.apple.mpegurl'))
 * - Optional auto-recovery for fatal media/network errors
 * - reinit(preservedTime) to rebuild the instance while keeping playhead
 */
export function useHlsPlayer({
  videoRef,
  url,
  type,
  onManifestParsed,
  onFatalError,
  autoRecover = true,
  preferHighestQuality = false,
}: UseHlsPlayerOptions): UseHlsPlayerResult {
  const hlsRef = useRef<Hls | null>(null);
  const mediaRecoveryAttemptedRef = useRef(false);

  // Keep latest callbacks in refs to avoid re-attaching when they change
  const onManifestParsedRef = useRef(onManifestParsed);
  const onFatalErrorRef = useRef(onFatalError);
  useEffect(() => { onManifestParsedRef.current = onManifestParsed; }, [onManifestParsed]);
  useEffect(() => { onFatalErrorRef.current = onFatalError; }, [onFatalError]);

  const attach = useCallback((preservedTime?: number) => {
    const video = videoRef.current;
    if (!video) return;

    // Cleanup any previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    mediaRecoveryAttemptedRef.current = false;

    if (type === 'none' || !url) return;

    if (type === 'native') {
      video.src = url;
      video.load();
      if (preservedTime !== undefined) video.currentTime = preservedTime;
      return;
    }

    // HLS path - prefer Safari native
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.load();
      if (preservedTime !== undefined) video.currentTime = preservedTime;
      onManifestParsedRef.current?.();
      return;
    }

    if (!Hls.isSupported()) {
      onFatalErrorRef.current?.({
        type: Hls.ErrorTypes.OTHER_ERROR,
        details: Hls.ErrorDetails.MANIFEST_LOAD_ERROR,
        fatal: true,
      } as ErrorData);
      return;
    }

    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      capLevelToPlayerSize: !preferHighestQuality,
      startLevel: preferHighestQuality ? -1 : undefined,
      autoStartLoad: true,
    });

    hls.loadSource(url);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      if (preferHighestQuality && hls.levels && hls.levels.length > 0) {
        hls.currentLevel = hls.levels.length - 1;
        hls.nextLevel = hls.levels.length - 1;
      }
      if (preservedTime !== undefined) video.currentTime = preservedTime;
      onManifestParsedRef.current?.();
    });

    hls.on(Hls.Events.ERROR, (_, data) => {
      if (!data.fatal) return;

      if (autoRecover) {
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          try { hls.startLoad(); return; } catch { /* fall through */ }
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !mediaRecoveryAttemptedRef.current) {
          mediaRecoveryAttemptedRef.current = true;
          try { hls.recoverMediaError(); return; } catch { /* fall through */ }
        }
      }

      onFatalErrorRef.current?.(data);
    });

    hlsRef.current = hls;
  }, [videoRef, url, type, autoRecover]);

  // (Re)attach whenever the stable URL or type changes
  useEffect(() => {
    attach();
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [attach]);

  const reinit = useCallback((preservedTime?: number) => {
    attach(preservedTime);
  }, [attach]);

  return { hlsRef, reinit };
}
