import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

interface FFmpegContextValue {
  ffmpeg: FFmpeg | null;
  isLoaded: boolean;
  isLoading: boolean;
  loadError: string | null;
  loadProgress: number;
  preload: () => Promise<void>;
}

const FFmpegContext = createContext<FFmpegContextValue | null>(null);

// Some networks/ad-blockers block specific CDNs. Keep a small fallback list.
const CDN_BASE_URLS = [
  'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd',
  'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd',
];

const FILE_TIMEOUT_MS = 60_000; // 60s per file

async function toBlobURLWithTimeout(url: string, mimeType: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    clearTimeout(timeoutId);
    return URL.createObjectURL(new Blob([blob], { type: mimeType }));
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Timeout ao descarregar: ${url}`);
    }
    throw err;
  }
}

export function FFmpegProvider({ children }: { children: React.ReactNode }) {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const loadingPromiseRef = useRef<Promise<void> | null>(null);

  const preload = useCallback(async () => {
    // Already loaded
    if (isLoaded && ffmpegRef.current) {
      console.log('[FFmpeg Context] Already loaded, skipping');
      return;
    }

    // Already loading - return existing promise
    if (loadingPromiseRef.current) {
      console.log('[FFmpeg Context] Already loading, waiting...');
      return loadingPromiseRef.current;
    }

    console.log('[FFmpeg Context] Starting preload...');
    setIsLoading(true);
    setLoadError(null);
    setLoadProgress(0);

    const loadPromise = (async () => {
      try {
        const ffmpeg = new FFmpeg();
        ffmpegRef.current = ffmpeg;

        // Track progress during loading
        let progressInterval: ReturnType<typeof setInterval> | null = null;
        progressInterval = setInterval(() => {
          setLoadProgress(prev => Math.min(prev + 2, 85));
        }, 500);

        ffmpeg.on('log', ({ message }) => {
          console.log('[FFmpeg]', message);
        });

        // Download and initialize FFmpeg (with CDN fallback + timeout)
        let lastErr: unknown = null;
        let loaded = false;

        for (const base of CDN_BASE_URLS) {
          try {
            console.log('[FFmpeg Context] Downloading from CDN:', base);

            const [coreURL, wasmURL] = await Promise.all([
              toBlobURLWithTimeout(`${base}/ffmpeg-core.js`, 'text/javascript', FILE_TIMEOUT_MS),
              toBlobURLWithTimeout(`${base}/ffmpeg-core.wasm`, 'application/wasm', FILE_TIMEOUT_MS),
            ]);

            setLoadProgress(90);

            await ffmpeg.load({
              coreURL,
              wasmURL,
            });

            loaded = true;
            break;
          } catch (e) {
            lastErr = e;
            console.warn('[FFmpeg Context] CDN failed, trying next...', e);
          }
        }

        if (!loaded) {
          throw lastErr instanceof Error
            ? lastErr
            : new Error('Falha ao descarregar o motor de compressão');
        }

        if (progressInterval) clearInterval(progressInterval);
        setLoadProgress(100);
        setIsLoaded(true);
        console.log('[FFmpeg Context] ✓ Engine loaded and ready!');

      } catch (err: any) {
        console.error('[FFmpeg Context] Load failed:', err);
        setLoadError(err.message || 'Falha ao carregar motor de compressão');
        ffmpegRef.current = null;
        throw err;
      } finally {
        setIsLoading(false);
        loadingPromiseRef.current = null;
      }
    })();

    loadingPromiseRef.current = loadPromise;

    // Add timeout
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout ao carregar motor (3 min)')), 180_000);
    });

    try {
      await Promise.race([loadPromise, timeoutPromise]);
    } catch (err: any) {
      setLoadError(err.message);
      setIsLoading(false);
      loadingPromiseRef.current = null;
    }
  }, [isLoaded]);

  const value: FFmpegContextValue = {
    ffmpeg: ffmpegRef.current,
    isLoaded,
    isLoading,
    loadError,
    loadProgress,
    preload,
  };

  return (
    <FFmpegContext.Provider value={value}>
      {children}
    </FFmpegContext.Provider>
  );
}

export function useFFmpegContext() {
  const context = useContext(FFmpegContext);
  if (!context) {
    throw new Error('useFFmpegContext must be used within FFmpegProvider');
  }
  return context;
}

// Optional hook for cases where a subtree might render outside the expected provider.
export function useOptionalFFmpegContext() {
  return useContext(FFmpegContext);
}
