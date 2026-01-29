import { useState, useCallback } from 'react';
import { fetchFile } from '@ffmpeg/util';
import { useFFmpegContext } from '@/contexts/FFmpegContext';

interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  savings: number;
}

export function useVideoCompression() {
  const { ffmpeg, isLoaded, isLoading, loadError, preload } = useFFmpegContext();
  const [progress, setProgress] = useState(0);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compressVideo = useCallback(async (file: File): Promise<CompressionResult> => {
    setCompressing(true);
    setProgress(0);
    setError(null);

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

      const originalSize = file.size;

      // Setup progress listener
      ffmpeg.on('progress', ({ progress: p }) => {
        setProgress(Math.round(p * 100));
      });

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
  }, [ffmpeg, isLoaded, preload]);

  const cancelCompression = useCallback(() => {
    setCompressing(false);
    setProgress(0);
  }, []);

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
