import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { VideoVersion } from '@/hooks/useVideoVersions';
import { VideoVersionsList } from '../VideoVersionsList';

vi.mock('@/hooks/useVideoDownload', () => ({
  useVideoDownload: () => ({ downloadVideo: vi.fn(), isDownloading: null }),
}));

it('retains the selected file after a failed replacement and closes only after confirmation', async () => {
  const version: VideoVersion = {
    id: 'version-1', version_number: 1, file_name: 'original.mp4',
    workspace_id: 'workspace-1', project_id: 'project-1', task_id: 'task-1',
    file_path: 'original.mp4', file_size_bytes: 100, duration_seconds: 1,
    mime_type: 'video/mp4', thumbnail_path: null, thumbnail_time_seconds: null,
    uploaded_by: null, created_at: '2026-01-01T00:00:00Z',
    cloudflare_stream_uid: null, r2_key: null, stream_status: 'ready',
    stream_playback_url: null, is_deleted: false,
  };
  const replace = vi.fn().mockRejectedValueOnce(new Error('Request failed')).mockResolvedValueOnce({});
  render(<VideoVersionsList versions={[version]} selectedVersionId={version.id}
    onSelectVersion={vi.fn()} onDeleteVersion={vi.fn()} onReplaceVersion={replace} />);

  fireEvent.keyDown(screen.getByRole('button', { name: 'Ações da versão' }), { key: 'Enter' });
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Substituir versão' }));
  const dialog = within(await screen.findByRole('dialog'));
  const input = dialog.getByLabelText('Ficheiro de substituição') as HTMLInputElement;
  const file = new File(['fixture'], 'revisao.mp4', { type: 'video/mp4' });
  fireEvent.change(input, { target: { files: [file] } });
  const submit = dialog.getByRole('button', { name: 'Substituir vídeo' });

  fireEvent.click(submit);
  expect(await dialog.findByRole('alert')).toHaveTextContent('Não foi possível confirmar');
  expect(input.files?.[0]).toBe(file);
  expect(replace).toHaveBeenCalledTimes(1);
  expect(replace).toHaveBeenCalledWith(version.id, file);

  fireEvent.click(submit);
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(replace).toHaveBeenCalledTimes(2);
  expect(replace.mock.calls[1]).toEqual(replace.mock.calls[0]);
});
