import { describe, expect, it } from 'vitest';
import {
  APPROVAL_RETENTION_DAYS,
  approvalRetentionCutoff,
  selectVersionsDueAfterApproval,
} from '../../supabase/functions/_shared/approval-retention.ts';

// Fictitious identifiers only.
const NOW = new Date('2026-11-23T12:00:00.000Z');
const cutoff = approvalRetentionCutoff(NOW);
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

describe('retenção 7 dias após aprovação', () => {
  it('usa 7 dias', () => {
    expect(APPROVAL_RETENTION_DAYS).toBe(7);
    expect(cutoff).toBe('2026-11-16T12:00:00.000Z');
  });

  it('remove versão aprovada há mais de 7 dias e as outras versões da mesma tarefa', () => {
    const due = selectVersionsDueAfterApproval(
      [{ video_version_id: 'v2', task_id: 't1', approved_at: daysAgo(8) }],
      [
        { id: 'v1', task_id: 't1', is_deleted: false },
        { id: 'v2', task_id: 't1', is_deleted: false },
        { id: 'x1', task_id: 't9', is_deleted: false },
      ],
      cutoff,
    );
    expect(due.sort()).toEqual(['v1', 'v2']);
  });

  it('não remove antes dos 7 dias', () => {
    const due = selectVersionsDueAfterApproval(
      [{ video_version_id: 'v1', task_id: 't1', approved_at: daysAgo(6) }],
      [{ id: 'v1', task_id: 't1', is_deleted: false }],
      cutoff,
    );
    expect(due).toEqual([]);
  });

  it('uma aprovação recente na mesma tarefa reinicia a janela', () => {
    const due = selectVersionsDueAfterApproval(
      [
        { video_version_id: 'v1', task_id: 't1', approved_at: daysAgo(10) },
        { video_version_id: 'v3', task_id: 't1', approved_at: daysAgo(2) },
      ],
      [
        { id: 'v1', task_id: 't1', is_deleted: false },
        { id: 'v3', task_id: 't1', is_deleted: false },
      ],
      cutoff,
    );
    expect(due).toEqual([]);
  });

  it('vídeo de projeto sem tarefa: só a versão aprovada', () => {
    const due = selectVersionsDueAfterApproval(
      [{ video_version_id: 'p1', task_id: null, approved_at: daysAgo(9) }],
      [
        { id: 'p1', task_id: null, is_deleted: false },
        { id: 'p2', task_id: null, is_deleted: false },
      ],
      cutoff,
    );
    expect(due).toEqual(['p1']);
  });

  it('sem aprovação nada é removido, mesmo que o projeto esteja entregue', () => {
    expect(
      selectVersionsDueAfterApproval([], [{ id: 'v1', task_id: 't1', is_deleted: false }], cutoff),
    ).toEqual([]);
  });

  it('ignora versões já apagadas e datas inválidas', () => {
    const due = selectVersionsDueAfterApproval(
      [
        { video_version_id: 'v1', task_id: 't1', approved_at: daysAgo(8) },
        { video_version_id: 'v9', task_id: null, approved_at: 'invalid' },
      ],
      [
        { id: 'v1', task_id: 't1', is_deleted: true },
        { id: 'v9', task_id: null, is_deleted: false },
      ],
      cutoff,
    );
    expect(due).toEqual([]);
  });
});

describe('project-level reviews (no task)', () => {
  it('removes every live version of a project approved more than 7 days ago', async () => {
    const { selectVersionsDueAfterApproval } = await import('../../supabase/functions/_shared/approval-retention');
    const cutoff = '2026-11-18T00:00:00Z';
    const due = selectVersionsDueAfterApproval(
      [{ video_version_id: 'v2', task_id: null, project_id: 'p1', approved_at: '2026-11-13T00:00:00Z' }],
      [{ id: 'v1', task_id: null, project_id: 'p1', is_deleted: false }, { id: 'v9', task_id: null, project_id: 'p2', is_deleted: false }],
      cutoff,
    );
    expect(due).toEqual(['v1']);
  });
  it('keeps project versions when a newer approval is within 7 days', async () => {
    const { selectVersionsDueAfterApproval } = await import('../../supabase/functions/_shared/approval-retention');
    const due = selectVersionsDueAfterApproval(
      [{ video_version_id: 'v2', task_id: null, project_id: 'p1', approved_at: '2026-11-13T00:00:00Z' },
       { video_version_id: 'v3', task_id: null, project_id: 'p1', approved_at: '2026-11-20T00:00:00Z' }],
      [{ id: 'v1', task_id: null, project_id: 'p1', is_deleted: false }],
      '2026-11-18T00:00:00Z',
    );
    expect(due).toEqual([]);
  });
});
