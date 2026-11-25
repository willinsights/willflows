import { describe, it, expect } from 'vitest';
import { observedPhaseDurations } from './phaseDurations';
const columns = [{ id:'edit', phase:'edicao' as const, is_final:false }, { id:'review', phase:'edicao' as const, is_final:false }, { id:'done', phase:'edicao' as const, is_final:true }];
const range = [new Date('2026-11-01'),new Date('2026-12-01')] as const;
const t = (to:string,at:string) => ({ project_id:'p1',from_column_id:null,to_column_id:to,moved_at:at });
describe('observed phase time', () => {
 it('measures the observed editing phase, including review, until the final column', () => {
  expect(observedPhaseDurations([t('edit','2026-11-10T10:00:00Z'),t('review','2026-11-10T12:00:00Z'),t('done','2026-11-10T16:00:00Z')],columns,...range)[0]).toMatchObject({phase:'edicao',avg_hours:6,count:1});
 });
 it('does not invent a duration for a final-only or still-open history', () => {
  expect(observedPhaseDurations([t('done','2026-11-10T16:00:00Z')],columns,...range)).toEqual([]);
  expect(observedPhaseDurations([t('edit','2026-11-10T10:00:00Z')],columns,...range)).toEqual([]);
 });
 it('ignores observations outside the chosen period', () => {
  expect(observedPhaseDurations([t('edit','2026-10-10T10:00:00Z'),t('done','2026-10-10T16:00:00Z')],columns,...range)).toEqual([]);
 });
});