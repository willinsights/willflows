import { useEffect, useState, type RefObject } from 'react';
import { snapFps } from '@/lib/comment-export';

type FrameVideo = HTMLVideoElement & { requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number; cancelVideoFrameCallback?: (id: number) => void };

/** Measures the playing video's frame rate (snapped to a standard rate). Null until measured. */
export function useDetectedFps(ref: RefObject<HTMLVideoElement>, key: unknown) {
  const [fps, setFps] = useState<number | null>(null);
  useEffect(() => {
    setFps(null);
    const v = ref.current as FrameVideo | null;
    if (!v?.requestVideoFrameCallback) return;
    let last = -1, id = 0, done = false; const deltas: number[] = [];
    const step = (_: number, m: { mediaTime: number }) => {
      if (done) return;
      if (last >= 0) { const d = m.mediaTime - last; if (d > 0.005 && d < 0.1) deltas.push(d); }
      last = m.mediaTime;
      if (deltas.length >= 30) { const s = [...deltas].sort((a, b) => a - b); setFps(snapFps(1 / s[Math.floor(s.length / 2)])); done = true; return; }
      id = v.requestVideoFrameCallback!(step);
    };
    id = v.requestVideoFrameCallback(step);
    return () => { done = true; v.cancelVideoFrameCallback?.(id); };
  }, [ref, key]);
  return fps;
}
