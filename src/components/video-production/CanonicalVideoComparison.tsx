import { useEffect, useState } from 'react';
import { ComparisonPlayer } from '@/components/video/ComparisonPlayer';
import { privateVideoRequest } from '@/lib/private-video-client';

type Version = { id: string; file_name: string; version_number: number; created_at: string };
type Playback = { url: string; expiresAt: number };
type Side = { id: string; state: 'loading' | 'processing' | 'unavailable' } | {
  id: string; state: 'ready'; playback: Playback;
};

function useComparisonPlayback(versionId: string): Side {
  const [side, setSide] = useState<Side>({ id: versionId, state: 'loading' });

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        const result = await privateVideoRequest({ action: 'read', versionId });
        if (!active) return;
        const playback: Playback | null = result.playback;
        setSide(current => {
          if (!playback || result.version?.id !== versionId) return { id: versionId, state: 'processing' };
          if (current.id === versionId && current.state === 'ready' &&
              current.playback.expiresAt > Date.now() / 1000 + 60) return current;
          return { id: versionId, state: 'ready', playback };
        });
      } catch {
        if (active) setSide({ id: versionId, state: 'unavailable' });
      } finally {
        if (active) timer = setTimeout(refresh, 10_000);
      }
    };
    void refresh();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [versionId]);

  if (side.id !== versionId) return { id: versionId, state: 'loading' };
  return side;
}

export function CanonicalVideoComparison({
  versions, initialVersionId, onClose,
}: {
  versions: Version[];
  initialVersionId: string;
  onClose: () => void;
}) {
  const [left, setLeft] = useState(initialVersionId);
  const [right, setRight] = useState(() => versions.find(version => version.id !== initialVersionId)?.id ?? '');
  const leftId = versions.some(version => version.id === left) ? left : versions[0].id;
  const rightId = right !== leftId && versions.some(version => version.id === right)
    ? right : versions.find(version => version.id !== leftId)!.id;
  const sides = [useComparisonPlayback(leftId), useComparisonPlayback(rightId)];
  const urls = Object.fromEntries(sides.flatMap(side => side.state === 'ready' ? [[side.id, side.playback.url]] : []));

  return (
    <section aria-label="Comparação de versões canónicas" className="space-y-2">
      {sides.map((side, index) => side.state !== 'ready' && (
        <p key={side.id} role="status" className="text-sm text-muted-foreground">
          {index === 0 ? 'Versão A' : 'Versão B'} · {
            side.state === 'unavailable' ? 'Reprodução indisponível'
              : side.state === 'processing' ? 'A processar vídeo' : 'A carregar'
          }
        </p>
      ))}
      <ComparisonPlayer
        versions={versions}
        signedUrls={urls}
        leftVersionId={leftId}
        rightVersionId={rightId}
        onLeftVersionChange={setLeft}
        onRightVersionChange={setRight}
        onClose={onClose}
      />
    </section>
  );
}
