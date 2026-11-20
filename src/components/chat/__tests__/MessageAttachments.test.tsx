import { vi, beforeEach, afterEach, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';

const st = vi.hoisted(() => ({
  createSignedUrl: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
  calls: 0,
}));

vi.mock('sonner', () => ({ toast: { error: st.toastError, info: st.toastInfo } }));
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

const RETRY_MESSAGE = 'Ligação atualizada. Clique novamente para abrir.';

it('link do ficheiro renova o href ao passar o ponteiro quando está perto de expirar, com um só pedido em curso', async () => {
  const file = attachment('doc-href-fresco', 'application/pdf');
  render(<MessageAttachments attachments={[file]} />);
  const link = (await screen.findByText(file.file_name)) as HTMLAnchorElement;
  expect(link).toHaveAttribute('href', `https://storage.invalid/${file.file_path}?n=1`);
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');

  // More than half of the life left: nothing is requested.
  fireEvent.pointerEnter(link);
  fireEvent.focus(link);
  fireEvent.touchStart(link);
  await Promise.resolve();
  expect(st.createSignedUrl).toHaveBeenCalledTimes(1);

  // Less than half left: one request, repeated events wait for it.
  now += 6 * MINUTE;
  let release: (value: unknown) => void = () => {};
  st.createSignedUrl.mockImplementationOnce(
    () => new Promise((resolve) => { release = resolve; })
  );
  fireEvent.pointerEnter(link);
  fireEvent.focus(link);
  fireEvent.touchStart(link);
  fireEvent.pointerEnter(link);
  await Promise.resolve();
  expect(st.createSignedUrl).toHaveBeenCalledTimes(2);

  release({ data: { signedUrl: `https://storage.invalid/${file.file_path}?n=2` }, error: null });
  await waitFor(() =>
    expect(screen.getByText(file.file_name)).toHaveAttribute(
      'href',
      `https://storage.invalid/${file.file_path}?n=2`
    )
  );

  // The renewed link is fresh again: no further requests.
  fireEvent.pointerEnter(screen.getByText(file.file_name));
  await Promise.resolve();
  expect(st.createSignedUrl).toHaveBeenCalledTimes(2);
});

it('clique com link válido fica com o comportamento nativo e não chama window.open', async () => {
  const file = attachment('doc-clique-valido', 'application/pdf');
  const open = vi.fn(() => null);
  vi.stubGlobal('open', open);
  render(<MessageAttachments attachments={[file]} />);
  const link = await screen.findByText(file.file_name);

  now += 9 * MINUTE;
  // fireEvent returns false when the handler called preventDefault.
  expect(fireEvent.click(link)).toBe(true);
  await Promise.resolve();

  expect(open).not.toHaveBeenCalled();
  expect(st.createSignedUrl).toHaveBeenCalledTimes(1);
  expect(st.toastInfo).not.toHaveBeenCalled();
  expect(st.toastError).not.toHaveBeenCalled();
});

it('clique com link expirado e popup bloqueado atualiza o href e pede novo clique, sem separador órfão', async () => {
  const file = attachment('doc-popup-bloqueado', 'application/pdf');
  const open = vi.fn(() => null);
  vi.stubGlobal('open', open);
  render(<MessageAttachments attachments={[file]} />);
  const link = await screen.findByText(file.file_name);

  now += 11 * MINUTE;
  expect(fireEvent.click(link)).toBe(false);

  await waitFor(() => expect(st.toastInfo).toHaveBeenCalledWith(RETRY_MESSAGE));
  const fresh = `https://storage.invalid/${file.file_path}?n=2`;
  await waitFor(() => expect(screen.getByText(file.file_name)).toHaveAttribute('href', fresh));
  // The only attempt already carries the final link: no blank tab is ever opened.
  expect(open).toHaveBeenCalledTimes(1);
  expect(open).toHaveBeenCalledWith(fresh, '_blank');
  expect(st.toastError).not.toHaveBeenCalled();

  // The second click finds a valid href and is left to the browser.
  expect(fireEvent.click(screen.getByText(file.file_name))).toBe(true);
  expect(open).toHaveBeenCalledTimes(1);
  expect(st.createSignedUrl).toHaveBeenCalledTimes(2);
});

it('clique com link expirado abre o link novo quando o popup é permitido', async () => {
  const file = attachment('doc-popup-permitido', 'application/pdf');
  const tab = { opener: {} as unknown };
  const open = vi.fn(() => tab);
  vi.stubGlobal('open', open);
  render(<MessageAttachments attachments={[file]} />);
  const link = await screen.findByText(file.file_name);

  now += 11 * MINUTE;
  expect(fireEvent.click(link)).toBe(false);

  await waitFor(() =>
    expect(open).toHaveBeenCalledWith(`https://storage.invalid/${file.file_path}?n=2`, '_blank')
  );
  await waitFor(() => expect(tab.opener).toBeNull());
  expect(st.toastInfo).not.toHaveBeenCalled();
  expect(st.toastError).not.toHaveBeenCalled();
});

it('clique com link expirado mostra erro e não abre nada quando o pedido do link lança exceção', async () => {
  const file = attachment('doc-pedido-falha', 'application/pdf');
  const open = vi.fn(() => null);
  vi.stubGlobal('open', open);
  render(<MessageAttachments attachments={[file]} />);
  const link = await screen.findByText(file.file_name);

  now += 11 * MINUTE;
  st.createSignedUrl.mockRejectedValueOnce(new Error('rede em baixo'));
  expect(fireEvent.click(link)).toBe(false);

  await waitFor(() => expect(st.toastError).toHaveBeenCalledWith('Erro ao abrir ficheiro'));
  expect(open).not.toHaveBeenCalled();
  expect(st.toastInfo).not.toHaveBeenCalled();
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
