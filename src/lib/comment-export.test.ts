import { describe, it, expect } from 'vitest';
import { toTimecode, buildExport } from './comment-export';
describe('comment export', () => {
  it('timecode a 25 fps', () => { expect(toTimecode(191.48)).toBe('00:03:11:12'); });
  it('EDL tem marcador com autor e texto', () => {
    const r = buildExport('edl', [{ body: 'Tirar legenda', client_name: 'Telma', timestamp_seconds: 6 }], 'Teste');
    expect(r.content).toContain('00:00:06:00'); expect(r.content).toContain('|M:Telma: Tirar legenda');
  });
});
