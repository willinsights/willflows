import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { 
  isCrossOriginIsolated, 
  isServiceWorkerSupported, 
  ensureCrossOriginIsolated 
} from '@/lib/coop-coep-service-worker';

type IsolationStatus = 'checking' | 'isolated' | 'not-isolated' | 'unsupported' | 'activating';

interface FFmpegContextValue {
  ffmpeg: FFmpeg | null;
  isLoaded: boolean;
  isLoading: boolean;
  loadError: string | null;
  loadProgress: number;
  preload: () => Promise<void>;
  cancelPreload: () => void;
  terminateEngine: () => void;
  // New isolation-related state
  isolationStatus: IsolationStatus;
  isEngineReady: boolean;
  enableIsolation: () => Promise<boolean>;
}

const FFmpegContext = createContext<FFmpegContextValue | null>(null);

// Some networks/ad-blockers block specific CDNs. Keep a small fallback list.
const CDN_BASE_URLS = [
  'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd',
  'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd',
];

const FILE_TIMEOUT_MS = 60_000; // 60s per file
const TOTAL_TIMEOUT_MS = 180_000; // 3 minutes total

async function toBlobURLWithTimeout(
  url: string,
  mimeType: string,
  timeoutMs: number,
  abortSignal?: AbortSignal
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Link external abort signal to our controller
  const onExternalAbort = () => controller.abort();
  abortSignal?.addEventListener('abort', onExternalAbort);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    clearTimeout(timeoutId);
    return URL.createObjectURL(new Blob([blob], { type: mimeType }));
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Timeout ou cancelado: ${url}`);
    }
    throw err;
  } finally {
    abortSignal?.removeEventListener('abort', onExternalAbort);
  }
}

export function FFmpegProvider({ children }: { children: React.ReactNode }) {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isolationStatus, setIsolationStatus] = useState<IsolationStatus>('checking');
  
  const loadingPromiseRef = useRef<Promise<void> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check isolation status on mount
  useEffect(() => {
    console.log('[FFmpeg Context] Checking isolation status...');
    
    if (isCrossOriginIsolated()) {
      console.log('[FFmpeg Context] ✓ Already cross-origin isolated');
      setIsolationStatus('isolated');
      // Clear any pending reload flag
      try { sessionStorage.removeItem('coop-coep-reload-pending'); } catch {}
    } else if (!isServiceWorkerSupported()) {
      console.log('[FFmpeg Context] ✗ Service Workers not supported');
      setIsolationStatus('unsupported');
    } else {
      // Check if we already tried and failed (reload happened but still not isolated)
      try {
        if (sessionStorage.getItem('coop-coep-reload-pending')) {
          console.log('[FFmpeg Context] ✗ SW reload attempted but isolation failed');
          sessionStorage.removeItem('coop-coep-reload-pending');
          setIsolationStatus('unsupported');
          return;
        }
      } catch {}
      
      console.log('[FFmpeg Context] Not isolated yet');
      setIsolationStatus('not-isolated');
    }
  }, []);

  const enableIsolation = useCallback(async (): Promise<boolean> => {
    if (isCrossOriginIsolated()) {
      setIsolationStatus('isolated');
      return true;
    }

    setIsolationStatus('activating');
    
    try {
      const success = await ensureCrossOriginIsolated();
      // Note: if successful, the page will reload, so we won't reach here
      if (!success) {
        setIsolationStatus('unsupported');
      }
      return success;
    } catch (err) {
      console.error('[FFmpeg Context] Failed to enable isolation:', err);
      setIsolationStatus('unsupported');
      return false;
    }
  }, []);

  const cleanupLoading = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (totalTimeoutRef.current) {
      clearTimeout(totalTimeoutRef.current);
      totalTimeoutRef.current = null;
    }
    abortControllerRef.current = null;
    loadingPromiseRef.current = null;
  }, []);

  const terminateEngine = useCallback(() => {
    console.log('[FFmpeg Context] Terminating engine...');
    cleanupLoading();
    
    if (ffmpegRef.current) {
      try {
        ffmpegRef.current.terminate();
      } catch (e) {
        console.warn('[FFmpeg Context] Error during terminate:', e);
      }
      ffmpegRef.current = null;
    }
    
    setIsLoaded(false);
    setIsLoading(false);
    setLoadProgress(0);
    setLoadError(null);
  }, [cleanupLoading]);

  const cancelPreload = useCallback(() => {
    console.log('[FFmpeg Context] Cancelling preload...');
    
    // Abort any ongoing downloads
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Terminate engine if partially loaded
    terminateEngine();
    
    setLoadError('Carregamento cancelado pelo utilizador');
  }, [terminateEngine]);

  const preload = useCallback(async () => {
    // Check isolation status first
    if (!isCrossOriginIsolated()) {
      console.log('[FFmpeg Context] Not cross-origin isolated, cannot load FFmpeg');
      setLoadError('Ambiente não está isolado. Clique em "Ativar Compressão" primeiro.');
      return;
    }

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

    // Create abort controller for this load attempt
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const loadPromise = (async () => {
      try {
        const ffmpeg = new FFmpeg();
        ffmpegRef.current = ffmpeg;

        // Track progress during loading
        progressIntervalRef.current = setInterval(() => {
          setLoadProgress(prev => Math.min(prev + 2, 80));
        }, 500);

        ffmpeg.on('log', ({ message }) => {
          console.log('[FFmpeg]', message);
        });

        // Download and initialize FFmpeg (with CDN fallback + timeout)
        let lastErr: unknown = null;
        let loaded = false;

        for (const base of CDN_BASE_URLS) {
          // Check if aborted before trying next CDN
          if (signal.aborted) {
            throw new Error('Carregamento cancelado');
          }

          try {
            console.log('[FFmpeg Context] Downloading from CDN:', base);

            // Download core and wasm files (UMD build doesn't need worker)
            const [coreURL, wasmURL] = await Promise.all([
              toBlobURLWithTimeout(`${base}/ffmpeg-core.js`, 'text/javascript', FILE_TIMEOUT_MS, signal),
              toBlobURLWithTimeout(`${base}/ffmpeg-core.wasm`, 'application/wasm', FILE_TIMEOUT_MS, signal),
            ]);

            setLoadProgress(85);

            // Check abort before load
            if (signal.aborted) {
              throw new Error('Carregamento cancelado');
            }

            console.log('[FFmpeg Context] Loading engine...');
            
            // Add timeout specifically for ffmpeg.load() - it can hang indefinitely
            const ffmpegLoadPromise = ffmpeg.load({
              coreURL,
              wasmURL,
            });
            
            const loadTimeoutMs = 60_000; // 60 seconds for load
            const loadTimeoutPromise = new Promise<never>((_, reject) => {
              const timeoutId = setTimeout(() => {
                reject(new Error('Timeout ao inicializar motor (60s)'));
              }, loadTimeoutMs);
              
              // Clear timeout if aborted
              signal.addEventListener('abort', () => clearTimeout(timeoutId));
            });
            
            await Promise.race([ffmpegLoadPromise, loadTimeoutPromise]);

            loaded = true;
            break;
          } catch (e) {
            lastErr = e;
            console.warn('[FFmpeg Context] CDN failed, trying next...', e);
            
            // If aborted, don't try next CDN
            if (signal.aborted || (e instanceof Error && e.message.includes('cancelado'))) {
              throw e;
            }
          }
        }

        if (!loaded) {
          throw lastErr instanceof Error
            ? lastErr
            : new Error('Falha ao descarregar o motor de compressão');
        }

        cleanupLoading();
        setLoadProgress(100);
        setIsLoaded(true);
        setIsLoading(false);
        console.log('[FFmpeg Context] ✓ Engine loaded and ready!');

      } catch (err: any) {
        console.error('[FFmpeg Context] Load failed:', err);
        cleanupLoading();
        setLoadError(err.message || 'Falha ao carregar motor de compressão');
        setIsLoading(false);
        setLoadProgress(0);
        
        // Clean up partial engine
        if (ffmpegRef.current) {
          try {
            ffmpegRef.current.terminate();
          } catch (_) {}
          ffmpegRef.current = null;
        }
        
        throw err;
      }
    })();

    loadingPromiseRef.current = loadPromise;

    // Add total timeout
    totalTimeoutRef.current = setTimeout(() => {
      if (abortControllerRef.current && !isLoaded) {
        console.log('[FFmpeg Context] Total timeout reached, aborting...');
        abortControllerRef.current.abort();
      }
    }, TOTAL_TIMEOUT_MS);

    try {
      await loadPromise;
    } catch (err: any) {
      // Error already handled in loadPromise
      console.log('[FFmpeg Context] Preload finished with error');
    }
  }, [isLoaded, cleanupLoading]);

  // Derived state: engine is ready when isolated and loaded
  const isEngineReady = isolationStatus === 'isolated' && isLoaded;

  const value: FFmpegContextValue = {
    ffmpeg: ffmpegRef.current,
    isLoaded,
    isLoading,
    loadError,
    loadProgress,
    preload,
    cancelPreload,
    terminateEngine,
    isolationStatus,
    isEngineReady,
    enableIsolation,
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
