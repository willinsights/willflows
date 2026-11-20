import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CanonicalVideoStudio } from './CanonicalVideoStudio';

const { request, upload } = vi.hoisted(() => ({ request: vi.fn(), upload: vi.fn() }));
vi.mock('@/hooks/useHlsPlayer', () => ({ useHlsPlayer: vi.fn() }));
vi.mock('@/lib/private-video-client', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/private-video-client')>(),
  privateVideoRequest: request,
  uploadPrivateVideo: upload,
}));
const scope = { workspaceId: 'workspace', projectId: 'project', taskId: null };
const token = 'wf2_fixture_token';

function renderStudio() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <CanonicalVideoStudio {...scope} />
    </QueryClientProvider>,
  );
}

describe('canonical video studio controls', () => {
  beforeEach(() => {
    upload.mockReset();
    request.mockReset().mockImplementation(async ({ action }) => {
      if (action === 'context') return { enabled: true, canEdit: true, legacyBytes: 0, privateBytes: 0, limitBytes: 100 };
      if (action === 'client-list') return { versions: [{ id: 'version-a', file_name: 'fixture.mp4', state: 'ready' }] };
      if (action === 'read') return { version: { id: 'version-a' }, comments: [], approval: null, playback: null };
      if (action === 'link') return { token };
      return { success: true };
    });
  });

  it('revokes the generated link without revoking the entire project scope', async () => {
    renderStudio();
    fireEvent.click(await screen.findByRole('button', { name: 'Gerar link de aprovação' }));
    await screen.findByDisplayValue(new RegExp(token));
    fireEvent.click(screen.getByRole('button', { name: 'Revogar este link' }));
    await screen.findByText('Link revogado.');
    expect(request).toHaveBeenCalledWith({ action: 'revoke', token });
    expect(request.mock.calls.some(([body]) => body.action === 'revoke-scope')).toBe(false);
    expect(screen.queryByDisplayValue(new RegExp(token))).toBeNull();
  });

  it('retries with the same operation and aborts only on explicit cancellation', async () => {
    upload.mockRejectedValue(new Error('Envio interrompido'));
    renderStudio();
    await screen.findByRole('button', { name: 'Escolher vídeo' });
    const file = new File(['fixture'], 'fixture.mp4', { type: 'video/mp4' });
    fireEvent.change(screen.getByLabelText('Arquivo de vídeo novo'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Carregar nova versão' }));
    await screen.findByText('Envio interrompido');
    const firstOperation = upload.mock.calls[0][2];
    fireEvent.click(screen.getByRole('button', { name: 'Retomar envio' }));
    await waitFor(() => expect(upload).toHaveBeenNthCalledWith(2, file, scope, firstOperation));
    expect(request.mock.calls.some(([body]) => body.action === 'abort')).toBe(false);
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar tentativa de envio' }));
    await screen.findByText('Tentativa de envio cancelada.');
    expect(request).toHaveBeenCalledWith({ action: 'abort', operationId: firstOperation });
  });
});
