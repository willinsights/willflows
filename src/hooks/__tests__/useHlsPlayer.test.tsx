import { describe, it, expect, vi } from 'vitest';

// Mock hls.js for jsdom
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

describe('useHlsPlayer module', () => {
  it('exports a useHlsPlayer hook function', async () => {
    const mod = await import('../useHlsPlayer');
    expect(typeof mod.useHlsPlayer).toBe('function');
  });
});
