import { describe, expect, it } from 'vitest';
import { formatClock, groupDeliverables } from './video-deliverables';

describe('video deliverables', () => {
  it('numbers versions of the same video V1, V2 by upload order and shows newest first', () => {
    const groups = groupDeliverables([
      { id: 'b', file_name: 'Hotel_v2.mp4', created_at: '2026-11-25T11:00:00Z', label: 'Versão 15s' },
      { id: 'a', file_name: 'Hotel.mp4', created_at: '2026-11-25T10:00:00Z', label: 'Versão 15s' },
      { id: 'c', file_name: 'Hotel 45.mp4', created_at: '2026-11-25T09:00:00Z', label: 'Versão 45s' },
    ]);
    expect(groups.map(g => g.label)).toEqual(['Versão 15s', 'Versão 45s']);
    expect(groups[0].versions.map(v => [v.id, v.version_number])).toEqual([['b', 2], ['a', 1]]);
  });
  it('keeps unlabeled older uploads as their own video named after the file', () => {
    const groups = groupDeliverables([{ id: 'x', file_name: 'Savoy Palace_Q1.mp4', created_at: '2026-11-25T10:41:56Z', label: null }]);
    expect(groups[0].label).toBe('Savoy Palace_Q1');
  });
  it('formats timecodes', () => {
    expect(formatClock(6.93)).toBe('0:06');
    expect(formatClock(3725)).toBe('1:02:05');
  });
});
