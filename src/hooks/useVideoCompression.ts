import { useState, useCallback, useRef } from 'react';
import { fetchFile } from '@ffmpeg/util';
import { useFFmpegContext } from '@/contexts/FFmpegContext';

interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  savings: number;
}

export function useVideoCompression() {
  const { ffmpeg, isLoaded, isLoading, loadError, preload, terminateEngine } = useFFmpegContext();
  const [progress, setProgress] = useState(0);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // For cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  const progressCallbackRef = useRef<((p: { progress: number }) => void) | null>(null);

  const compressVideo = useCallback(async (file: File): Promise<CompressionResult> => {
    setCompressing(true);
    setProgress(0);
    setError(null);

    // Create abort controller for this compression job
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      console.log('[Compression] Starting for file:', file.name, 'Size:', file.size);
      
      // Ensure FFmpeg is loaded
      if (!isLoaded || !ffmpeg) {
        console.log('[Compression] FFmpeg not ready, loading...');
        await preload();
      }

      // Check again after preload
      if (!ffmpeg) {
        throw new Error('Motor de compressão não disponível');
      }

      // Check if already aborted
      if (signal.aborted) {
        throw new Error('Compressão cancelada');
      }

      const originalSize = file.size;

      // Setup progress listener (and store ref for cleanup)
      const progressCallback = ({ progress: p }: { progress: number }) => {
        if (!signal.aborted) {
          setProgress(Math.round(p * 100));
        }
      };
      progressCallbackRef.current = progressCallback;
      ffmpeg.on('progress', progressCallback);

      // Determine input extension
      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      const inputName = `input.${ext}`;
      const outputName = 'output.mp4';

      console.log('[Compression] Writing input file...');
      
      // Check abort before write
      if (signal.aborted) {
        throw new Error('Compressão cancelada');
      }
      
      // Write input file
      const fileData = await fetchFile(file);
      await ffmpeg.writeFile(inputName, fileData);

      console.log('[Compression] Running FFmpeg...');
      
      // Check abort before exec
      if (signal.aborted) {
        throw new Error('Compressão cancelada');
      }
      
      // Compress with H.264 codec
      // CRF 28 = good quality with good compression
      // preset fast = balance between speed and compression
      await ffmpeg.exec([
        '-i', inputName,
        '-c:v', 'libx264',
        '-crf', '28',
        '-preset', 'fast',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart', // Optimize for web streaming
        '-y', // Overwrite output
        outputName
      ]);

      // Check abort after exec
      if (signal.aborted) {
        throw new Error('Compressão cancelada');
      }

      console.log('[Compression] Reading output file...');
      // Read output
      const data = await ffmpeg.readFile(outputName);
      
      // Create a proper ArrayBuffer copy for Blob compatibility
      const uint8Array = data as Uint8Array;
      const arrayBuffer = new ArrayBuffer(uint8Array.length);
      new Uint8Array(arrayBuffer).set(uint8Array);
      const compressedBlob = new Blob([arrayBuffer], { type: 'video/mp4' });
      const compressedSize = compressedBlob.size;

      console.log('[Compression] Original:', originalSize, 'Compressed:', compressedSize);

      // Create new file with original name but .mp4 extension
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const compressedFile = new File([compressedBlob], `${baseName}.mp4`, { 
        type: 'video/mp4' 
      });

      // Cleanup files
      try {
        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outputName);
      } catch (cleanupError) {
        console.warn('[Compression] Cleanup error:', cleanupError);
      }

      const savings = Math.round((1 - compressedSize / originalSize) * 100);

      console.log('[Compression] Done! Savings:', savings, '%');

      return {
        file: compressedFile,
        originalSize,
        compressedSize,
        savings: Math.max(0, savings), // Don't show negative savings
      };
    } catch (err: any) {
      console.error('[Compression] Error:', err);
      const errorMessage = err.message || 'Erro ao comprimir vídeo';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      // Remove progress listener to prevent leaks
      if (ffmpeg && progressCallbackRef.current) {
        try {
          ffmpeg.off('progress', progressCallbackRef.current);
        } catch (_) {}
        progressCallbackRef.current = null;
      }
      
      abortControllerRef.current = null;
      setCompressing(false);
    }
  }, [ffmpeg, isLoaded, preload]);

  const cancelCompression = useCallback(() => {
    console.log('[Compression] Cancelling...');
    
    // Abort any pending operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Hard stop: terminate the engine
    // This ensures ffmpeg.exec() stops immediately
    // The engine will need to reload for next compression
    terminateEngine();

    // Reset local state
    setCompressing(false);
    setProgress(0);
    setError(null);
    progressCallbackRef.current = null;
    
    console.log('[Compression] Cancelled and engine terminated');
  }, [terminateEngine]);

  return {
    compressVideo,
    cancelCompression,
    progress,
    compressing,
    // From context
    loading: isLoading,
    isEngineReady: isLoaded,
    engineError: loadError,
    preloadEngine: preload,
    error,
  };
}
