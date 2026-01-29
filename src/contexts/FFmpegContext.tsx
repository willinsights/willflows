import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
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

const CDN_BASE_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';

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
        let progressInterval: NodeJS.Timeout | null = null;
        progressInterval = setInterval(() => {
          setLoadProgress(prev => Math.min(prev + 2, 90));
        }, 500);

        ffmpeg.on('log', ({ message }) => {
          console.log('[FFmpeg]', message);
        });

        // Download and initialize FFmpeg
        console.log('[FFmpeg Context] Downloading from CDN:', CDN_BASE_URL);
        
        const [coreURL, wasmURL, workerURL] = await Promise.all([
          toBlobURL(`${CDN_BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
          toBlobURL(`${CDN_BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
          toBlobURL(`${CDN_BASE_URL}/ffmpeg-core.worker.js`, 'text/javascript'),
        ]);

        setLoadProgress(70);

        await ffmpeg.load({
          coreURL,
          wasmURL,
          workerURL,
        });

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
// This allows components to implement a safe fallback without crashing the whole UI.
export function useOptionalFFmpegContext() {
  return useContext(FFmpegContext);
}
