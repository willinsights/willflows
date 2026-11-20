import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CanonicalVideoComparison } from './CanonicalVideoComparison';

const request = vi.hoisted(() => vi.fn());
vi.mock('@/lib/private-video-client', () => ({ privateVideoRequest: request }));
vi.mock('@/components/video/ComparisonPlayer', () => ({
  ComparisonPlayer: ({ leftVersionId, rightVersionId, signedUrls, onRightVersionChange, onClose }: {
    leftVersionId: string; rightVersionId: string; signedUrls: Record<string, string>;
    onRightVersionChange: (id: string) => void; onClose: () => void;
  }) => (
    <>
      <output aria-label="Versão A">{signedUrls[leftVersionId]}</output>
      <output aria-label="Versão B">{signedUrls[rightVersionId]}</output>
      <button onClick={() => onRightVersionChange('oldest')}>Mudar B</button>
      <button onClick={onClose}>Fechar comparação</button>
    </>
  ),
}));

const versions = ['latest', 'previous', 'oldest'].map((id, index) => ({
  id, file_name: `fixture-${id}.mp4`, version_number: 3 - index, created_at: '2026-11-20T00:00:00Z',
}));

describe('canonical comparison', () => {
  beforeEach(() => { request.mockReset(); });

  it('requests both sides independently and hides the old source when changing to an unavailable version', async () => {
    request.mockImplementation(async ({ versionId }: { versionId: string }) => {
      if (versionId === 'oldest') throw new Error('Private version unavailable');
      return {
        version: { id: versionId },
        playback: { url: `https://fixture.invalid/${versionId}/video.m3u8`, expiresAt: Date.now() / 1000 + 900 },
      };
    });
    const close = vi.fn();
    render(<CanonicalVideoComparison versions={versions} initialVersionId="latest" onClose={close} />);

    await waitFor(() => expect(screen.getByLabelText('Versão A').textContent).toContain('/latest/'));
    await waitFor(() => expect(screen.getByLabelText('Versão B').textContent).toContain('/previous/'));
    expect(request).toHaveBeenCalledWith({ action: 'read', versionId: 'latest' });
    expect(request).toHaveBeenCalledWith({ action: 'read', versionId: 'previous' });

    fireEvent.click(screen.getByText('Mudar B'));
    expect(screen.getByLabelText('Versão B').textContent).toBe('');
    await screen.findByText(/Versão B · Reprodução indisponível/);
    expect(screen.getByLabelText('Versão A').textContent).toContain('/latest/');
    fireEvent.click(screen.getByText('Fechar comparação'));
    expect(close).toHaveBeenCalledOnce();
  });
});
