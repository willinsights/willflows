import { describe, it, expect, vi } from 'vitest';
import { galleryDeletionDue, removeStoredPhoto } from '../../../supabase/functions/_shared/photo-retention';

const gallery = { delete_at: null, delete_after_download: false, download_confirmed_at: null, cleanup_started_at: null };
describe('gallery retention', () => {
  it('keeps galleries unless the studio opts in', () => {
    expect(galleryDeletionDue(gallery)).toBe(false);
  });
  it('deletes after the chosen deadline, not before', () => {
    const g = { ...gallery, delete_at: '2026-11-26T23:59:59Z' };
    expect(galleryDeletionDue(g, new Date('2026-11-26T23:59:58Z'))).toBe(false);
    expect(galleryDeletionDue(g, new Date('2026-11-26T23:59:59Z'))).toBe(true);
  });
  it('does not delete just because download links were requested', () => {
    expect(galleryDeletionDue({ ...gallery, delete_after_download: true })).toBe(false);
  });
  it('deletes on explicit download confirmation only when opted in', () => {
    expect(galleryDeletionDue({ ...gallery, download_confirmed_at: '2026-11-25T23:52:00Z' })).toBe(false);
    expect(galleryDeletionDue({ ...gallery, delete_after_download: true, download_confirmed_at: '2026-11-25T23:52:00Z' })).toBe(true);
  });
  it('does not requeue a gallery already being removed', () => {
    expect(galleryDeletionDue({ ...gallery, delete_at: '2026-01-01', cleanup_started_at: '2026-11-25' })).toBe(false);
  });
  it('keeps photo accounting when provider deletion fails', async () => {
    const forget = vi.fn();
    await expect(removeStoredPhoto({ id: 'p', preview_path: 'photos/p.jpg', original_path: null, storage_provider: 'r2' }, async () => { throw new Error('offline'); }, vi.fn(), forget)).rejects.toThrow('offline');
    expect(forget).not.toHaveBeenCalled();
  });
  it('releases accounting only after both photo objects are removed', async () => {
    const events: string[] = [];
    await removeStoredPhoto({ id: 'p', preview_path: 'photos/preview.jpg', original_path: 'photos/original.jpg', storage_provider: 'r2' }, async k => { events.push(k); }, vi.fn(), async id => { events.push(id); });
    expect(events).toEqual(['photos/preview.jpg', 'photos/original.jpg', 'p']);
  });
});