import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useHlsPlayer } from '../useHlsPlayer';

// Mock hls.js so we don't depend on the real library in jsdom
vi.mock('hls.js', () => {
  const Hls: any = vi.fn().mockImplementation(() => ({
    loadSource: vi.fn(),
    attachMedia: vi.fn(),
    on: vi.fn(),
    destroy: vi.fn(),
    recoverMediaError: vi.fn(),
    startLoad: vi.fn(),
  }));
  Hls.isSupported = () => true;
  Hls.Events = { MANIFEST_PARSED: 'manifestParsed', ERROR: 'hlsError' };
  Hls.ErrorTypes = { NETWORK_ERROR: 'networkError', MEDIA_ERROR: 'mediaError', OTHER_ERROR: 'otherError' };
  Hls.ErrorDetails = { MANIFEST_LOAD_ERROR: 'manifestLoadError' };
  return { default: Hls };
});

function useTestHarness(opts: { url: string | null; type: 'hls' | 'native' | 'none' }) {
  const videoRef = useRef<HTMLVideoElement>(document.createElement('video'));
  return useHlsPlayer({ videoRef, url: opts.url, type: opts.type });
}

describe('useHlsPlayer', () => {
  it('is a no-op when type is "none"', () => {
    const { result } = renderHook(() => useTestHarness({ url: null, type: 'none' }));
    expect(result.current.hlsRef.current).toBeNull();
    expect(typeof result.current.reinit).toBe('function');
  });

  it('initializes an Hls instance for type "hls" with a URL', () => {
    const { result, unmount } = renderHook(() =>
      useTestHarness({ url: 'https://example.com/video.m3u8', type: 'hls' })
    );
    expect(result.current.hlsRef.current).not.toBeNull();
    unmount(); // should call destroy without throwing
  });

  it('cleans up when URL changes', () => {
    const { result, rerender } = renderHook(
      ({ url }) => useTestHarness({ url, type: 'hls' as const }),
      { initialProps: { url: 'https://example.com/a.m3u8' } }
    );
    const firstInstance = result.current.hlsRef.current;
    expect(firstInstance).not.toBeNull();
    rerender({ url: 'https://example.com/b.m3u8' });
    // After URL change, a new instance is attached
    expect(result.current.hlsRef.current).not.toBe(firstInstance);
  });
});
