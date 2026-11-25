// Groups private video versions into the videos (deliverables) of a card.
// A version's explicit label wins; older uploads fall back to their file name.
export type DeliverableVersion = { id: string; file_name: string; created_at: string; label?: string | null };
export type Deliverable<T> = { label: string; versions: Array<T & { version_number: number }> };

export function fileStem(name: string): string {
  return name.replace(/\.[^.]+$/, '').trim() || name;
}

export function groupDeliverables<T extends DeliverableVersion>(versions: T[]): Deliverable<T>[] {
  const groups = new Map<string, T[]>();
  for (const v of versions) {
    const label = (v.label && v.label.trim()) || fileStem(v.file_name);
    groups.set(label, [...(groups.get(label) ?? []), v]);
  }
  const result = [...groups.entries()].map(([label, list]) => {
    const ascending = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const numbered = ascending.map((v, i) => ({ ...v, version_number: i + 1 }));
    return { label, versions: numbered.reverse() };
  });
  return result.sort((a, b) => b.versions[0].created_at.localeCompare(a.versions[0].created_at));
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0'), ss = String(r).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
