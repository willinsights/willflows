import { useState, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  savings: number;
}

export function useVideoCompression() {
  const [progress, setProgress] = useState(0);
  const [compressing, setCompressing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const loadedRef = useRef(false);

  const loadFFmpeg = useCallback(async () => {
    if (loadedRef.current && ffmpegRef.current) {
      return ffmpegRef.current;
    }

    const ffmpeg = new FFmpeg();
    ffmpegRef.current = ffmpeg;

    setLoading(true);

    ffmpeg.on('progress', ({ progress: p }) => {
      setProgress(Math.round(p * 100));
    });

    ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg]', message);
    });

    // Load FFmpeg WASM from CDN. First load can take a while (~31MB wasm).
    // Using UMD build to avoid COOP/COEP (SharedArrayBuffer) requirements.
    // Ref docs example: https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd
    const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';
    
    try {
      const loadPromise = (async () => {
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          // Some browsers/environments need the worker explicitly.
          workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
        });
      })();

      // Prevent hanging forever on slow/blocked CDN.
      const timeoutMs = 180_000; // 3 minutes
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout ao carregar o compressor (3 min).')), timeoutMs)
      );

      await Promise.race([loadPromise, timeoutPromise]);

      loadedRef.current = true;
      console.log('[FFmpeg] Loaded successfully');
    } catch (loadError: any) {
      console.error('[FFmpeg] Failed to load:', loadError);
      throw new Error(`Não foi possível carregar o compressor: ${loadError.message}`);
    } finally {
      setLoading(false);
    }

    return ffmpeg;
  }, []);

  const compressVideo = useCallback(async (file: File): Promise<CompressionResult> => {
    setCompressing(true);
    setProgress(0);
    setError(null);

    try {
      console.log('[Compression] Starting for file:', file.name, 'Size:', file.size);
      
      const ffmpeg = await loadFFmpeg();
      const originalSize = file.size;

      // Determine input extension
      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      const inputName = `input.${ext}`;
      const outputName = 'output.mp4';

      console.log('[Compression] Writing input file...');
      // Write input file
      const fileData = await fetchFile(file);
      await ffmpeg.writeFile(inputName, fileData);

      console.log('[Compression] Running FFmpeg...');
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

      // Cleanup
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
      setCompressing(false);
    }
  }, [loadFFmpeg]);

  const cancelCompression = useCallback(() => {
    if (ffmpegRef.current) {
      // FFmpeg doesn't have a direct cancel, but we can reset state
      setCompressing(false);
      setLoading(false);
      setProgress(0);
    }
  }, []);

  return {
    compressVideo,
    cancelCompression,
    progress,
    compressing,
    loading,
    error,
  };
}
