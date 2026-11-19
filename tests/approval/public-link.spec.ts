import { test, expect } from '@playwright/test';

test('a client can read, refresh, comment and approve on the same public link', async ({ context, page }) => {
  const versionId = '33333333-3333-4333-8333-333333333333';
  const token = 'synthetic-review-link';
  const client = 'Cliente de teste';
  const version = {
    id: versionId, version_number: 1, file_name: 'revisao.mp4',
    file_size_bytes: 1200, stream_status: 'processing', created_at: '2026-01-01T12:00:00Z',
  };
  const comment = {
    id: 'original', video_version_id: versionId, timestamp_seconds: 2,
    body: 'Manter o plano inicial', status: 'open', is_client_comment: false,
    client_name: 'Edição', created_at: '2026-01-01T12:05:00Z',
  };
  const comments = [comment];
  let approval: { approved_at: string; client_name: string; notes: string; version_number: number } | null = null;
  let reads = 0;
  const writes: string[] = [];
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin === 'http://127.0.0.1:4173') return route.continue();
    return route.abort();
  });
  await context.route('http://127.0.0.1:55431/functions/v1/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'apikey, content-type' };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (request.headers().apikey !== 'local-tests-only') return route.fulfill({ status: 401, headers, json: { error: 'Chave pública em falta' } });
    if (url.pathname.endsWith('/get-video-approval-data')) {
      expect(url.searchParams.get('token')).toBe(token);
      reads++;
      return route.fulfill({ headers, json: { task: { id: 'task', title: 'Revisão', project_name: 'Projeto de teste' },
        versions: [version], comments, approval, client_name: client, workspace_id: 'workspace', signed_urls: {} } });
    }
    expect(url.pathname).toBe('/functions/v1/submit-video-feedback');
    const input = request.postDataJSON();
    expect(input.token).toBe(token);
    expect(input.video_version_id).toBe(versionId);
    writes.push(input.type);
    if (input.type === 'comment') comments.push({ ...comment, id: 'new-comment', body: input.body, client_name: client, is_client_comment: true });
    if (input.type === 'approval') approval = { approved_at: '2026-01-02T10:00:00Z', client_name: input.client_name, notes: input.notes, version_number: 1 };
    return route.fulfill({ headers, json: { success: true } });
  });

  await page.goto('/video-approval/' + token);
  await expect(page.getByText('Manter o plano inicial')).toBeVisible();
  await expect(page.getByText('O vídeo está a ser preparado.')).toBeVisible();
  await page.getByRole('button', { name: 'Verificar disponibilidade' }).click();
  await expect.poll(() => reads).toBeGreaterThanOrEqual(2);
  await expect(page.getByText('Manter o plano inicial')).toBeVisible();
  await page.getByPlaceholder('Adicione um comentário...').fill('A cor ficou certa');
  await page.getByRole('button', { name: 'Enviar' }).click();
  await expect(page.getByText('A cor ficou certa', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Aprovar', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('Ex: João Silva').fill(client);
  await dialog.getByPlaceholder('Alguma observação adicional...').fill('Versão final aprovada');
  await dialog.getByRole('button', { name: 'Confirmar Aprovação' }).click();
  await expect(page.getByRole('heading', { name: 'Vídeo Aprovado!' })).toBeVisible();
  await expect(page.getByText('Versão final aprovada', { exact: false })).toBeVisible();
  expect(writes).toEqual(['comment', 'approval']);
});
