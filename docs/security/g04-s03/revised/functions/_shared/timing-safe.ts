// Constant-time secret comparison helpers shared by edge functions.
// Avoids leaking secret contents through early-exit timing of `===`.

export function secretEquals(expected: string | undefined | null, provided: string | undefined | null): boolean {
  if (!expected || !provided) return false;
  const enc = new TextEncoder();
  const a = enc.encode(expected);
  const b = enc.encode(provided);
  // Compare lengths in a way that still runs a full pass over the data.
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}
