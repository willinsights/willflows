import { vi, beforeEach, afterEach, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';

const st = vi.hoisted(() => ({
  createSignedUrl: vi.fn(),
  toastError: vi.fn(),
  calls: 0,
}));

vi.mock('sonner', () => ({ toast: { error: st.toastError } }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: () => ({ createSignedUrl: st.createSignedUrl }) } },
}));

import { MessageAttachments, type MessageAttachment } from '../MessageAttachments';

const MINUTE = 60 * 1000;
let now = 0;
let fetchMock: ReturnType<typeof vi.fn>;

// The component keeps a module-level cache keyed by path: use one path per test.
function attachment(path: string, mime: string): MessageAttachment {
  return { id: path, file_name: `${path}.bin`, file_path: path, file_size: 10, mime_type: mime };
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  st.calls = 0;
  st.createSignedUrl.mockImplementation(async (path: string) => {
    st.calls += 1;
    return { data: { signedUrl: `https://storage.invalid/${path}?n=${st.calls}` }, error: null };
  });
  now = 1_000_000;
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  fetchMock = vi.fn(async () => ({ ok: true, blob: async () => new Blob(['x']) }));
  vi.stubGlobal('fetch', fetchMock);
  URL.createObjectURL = vi.fn(() => 'blob:ficticio');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('download pede link novo no clique, mesmo com a conversa aberta há mais de 10 minutos', async () => {
  const file = attachment('doc-download', 'application/pdf');
  render(<MessageAttachments attachments={[file]} />);
  await screen.findByText(file.file_name);
  expect(st.createSignedUrl).toHaveBeenCalledTimes(1);

  now += 11 * MINUTE;
  fireEvent.click(screen.getByRole('button'));

  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  expect(st.createSignedUrl).toHaveBeenCalledTimes(2);
  expect(st.createSignedUrl).toHaveBeenLastCalledWith(file.file_path, 600);
  expect(fetchMock).toHaveBeenCalledWith(`https://storage.invalid/${file.file_path}?n=2`);
  expect(st.toastError).not.toHaveBeenCalled();
});

it('download mostra erro quando o servidor recusa o link', async () => {
  const file = attachment('doc-recusado', 'application/pdf');
  render(<MessageAttachments attachments={[file]} />);
  await screen.findByText(file.file_name);

  st.createSignedUrl.mockResolvedValueOnce({ data: null, error: { message: 'sem acesso' } });
  fireEvent.click(screen.getByRole('button'));

  await waitFor(() => expect(st.toastError).toHaveBeenCalledWith('Erro ao descarregar ficheiro'));
  expect(fetchMock).not.toHaveBeenCalled();
});

it('abrir ficheiro usa link novo no clique', async () => {
  const file = attachment('doc-abrir', 'application/pdf');
  const tab = { opener: {} as unknown, location: { href: '' }, close: vi.fn() };
  const open = vi.fn(() => tab);
  vi.stubGlobal('open', open);
  render(<MessageAttachments attachments={[file]} />);

  now += 11 * MINUTE;
  fireEvent.click(await screen.findByText(file.file_name));

  await waitFor(() => expect(tab.location.href).toBe(`https://storage.invalid/${file.file_path}?n=2`));
  expect(open).toHaveBeenCalledWith('', '_blank');
  expect(tab.opener).toBeNull();
});

it('a cache não devolve links perto de expirar', async () => {
  const file = attachment('doc-cache', 'application/pdf');
  const first = render(<MessageAttachments attachments={[file]} />);
  await screen.findByText(file.file_name);
  first.unmount();

  now += 4 * MINUTE;
  const second = render(<MessageAttachments attachments={[file]} />);
  await screen.findByText(file.file_name);
  expect(st.createSignedUrl).toHaveBeenCalledTimes(1);
  second.unmount();

  now += 2 * MINUTE;
  render(<MessageAttachments attachments={[file]} />);
  await screen.findByText(file.file_name);
  expect(st.createSignedUrl).toHaveBeenCalledTimes(2);
});

it('pré-visualização renova o link expirado uma vez e não entra em ciclo', async () => {
  const image = attachment('imagem-preview', 'image/png');
  render(<MessageAttachments attachments={[image]} />);
  const img = await screen.findByAltText(image.file_name);

  // Link still valid: the failure is not an expiry, nothing is requested.
  fireEvent.error(img);
  await Promise.resolve();
  expect(st.createSignedUrl).toHaveBeenCalledTimes(1);

  now += 11 * MINUTE;
  fireEvent.error(img);
  await waitFor(() =>
    expect(screen.getByAltText(image.file_name)).toHaveAttribute(
      'src',
      `https://storage.invalid/${image.file_path}?n=2`
    )
  );

  // The renewed link fails too (e.g. broken file): no further requests.
  fireEvent.error(screen.getByAltText(image.file_name));
  await Promise.resolve();
  expect(st.createSignedUrl).toHaveBeenCalledTimes(2);
});
