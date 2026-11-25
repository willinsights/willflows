type Phase = 'captacao' | 'edicao';
type Column = { id: string; phase: Phase; is_final: boolean | null };
type Transition = { project_id: string; to_column_id: string | null; from_column_id: string | null; moved_at: string };

/** Only observed entry/exit pairs: no creation-date or timer guesses. */
export function observedPhaseDurations(transitions: Transition[], columns: Column[], start: Date, end: Date) {
  const byColumn = new Map(columns.map(c => [c.id,c]));
  const open = new Map<string, { phase: Phase; entered: number }>();
  const spans: { phase: Phase; hours: number; project: string }[] = [];
  for (const t of [...transitions].sort((a,b) => a.moved_at.localeCompare(b.moved_at))) {
    const to = t.to_column_id ? byColumn.get(t.to_column_id) : undefined;
    const at = Date.parse(t.moved_at);
    if (!to || !Number.isFinite(at)) continue;
    const previous = open.get(t.project_id);
    if (previous && (previous.phase !== to.phase || to.is_final)) {
      if (previous.entered >= start.getTime() && previous.entered <= end.getTime() && at <= end.getTime() && at > previous.entered) {
        spans.push({ phase: previous.phase, hours: (at-previous.entered)/3600000, project: t.project_id });
      }
      open.delete(t.project_id);
    }
    if (!to.is_final && (!previous || previous.phase !== to.phase)) open.set(t.project_id, { phase: to.phase, entered: at });
  }
  return (['captacao','edicao'] as const).flatMap(phase => {
    const rows = spans.filter(s => s.phase === phase);
    if (!rows.length) return [];
    return [{ phase, avg_hours: rows.reduce((s,r) => s+r.hours,0)/rows.length,
      min_hours: Math.min(...rows.map(r=>r.hours)), max_hours: Math.max(...rows.map(r=>r.hours)),
      count: new Set(rows.map(r=>r.project)).size }];
  });
}