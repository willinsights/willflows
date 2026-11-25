export interface GalleryRetention {
  delete_at: string | null;
  delete_after_download: boolean;
  download_confirmed_at: string | null;
  cleanup_started_at: string | null;
}

export function galleryDeletionDue(g: GalleryRetention, now = new Date()): boolean {
  return !g.cleanup_started_at && (
    Boolean(g.delete_at && new Date(g.delete_at).getTime() <= now.getTime()) ||
    Boolean(g.delete_after_download && g.download_confirmed_at)
  );
}

/** Only forget a photo (and release its quota through the DB trigger) after every object was removed. */
export async function removeStoredPhoto(
  photo: { id: string; preview_path: string; original_path: string | null; storage_provider: string },
  removeR2: (key: string) => Promise<void>,
  removeLegacy: (keys: string[]) => Promise<void>,
  forget: (id: string) => Promise<void>,
) {
  const paths = [...new Set([photo.preview_path, photo.original_path].filter((p): p is string => Boolean(p)))];
  if (photo.storage_provider === 'r2') {
    for (const key of paths) await removeR2(key);
  } else {
    await removeLegacy(paths);
  }
  await forget(photo.id);
}