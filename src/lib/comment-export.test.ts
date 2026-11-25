import { describe, it, expect } from 'vitest';
import { toTimecode, buildExport, snapFps } from './comment-export';
describe('comment export', () => {
  it('timecode a 25 fps', () => { expect(toTimecode(191.48)).toBe('00:03:11:12'); });
  it('EDL tem marcador com autor e texto', () => {
    const r = buildExport('edl', [{ body: 'Tirar legenda', client_name: 'Telma', timestamp_seconds: 6 }], 'Teste');
    expect(r.content).toContain('00:00:06:00'); expect(r.content).toContain('|M:Telma: Tirar legenda');
  });
});
describe('fps', () => {
  it('timecode a 30 fps', () => { expect(toTimecode(1.5, 30)).toBe('00:00:01:15'); });
  it('23.976 deteta e exporta FCPXML NTSC', () => {
    expect(snapFps(1 / 0.0417)).toBe(23.976);
    expect(buildExport('fcpxml', [{ body: 'a', client_name: 'b', timestamp_seconds: 1 }], 't', 23.976).content).toContain('frameDuration="1001/24000s"');
  });
});
