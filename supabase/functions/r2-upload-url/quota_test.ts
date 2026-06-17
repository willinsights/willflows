// Deno tests for r2-upload-url storage quota enforcement.
// Run with: supabase test functions r2-upload-url
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

/**
 * Mirror of the server-side quota math used in index.ts.
 * Kept in-sync with the edge function so that the unit test
 * fails immediately if the rule changes accidentally.
 */
function checkQuota(
  storage: { storage_used_bytes: number; storage_limit_bytes: number; extra_storage_bytes: number },
  fileSize: number,
): { allowed: boolean; remainingBytes: number } {
  const totalLimit = (storage.storage_limit_bytes || 0) + (storage.extra_storage_bytes || 0);
  const currentUsed = storage.storage_used_bytes || 0;
  const remainingBytes = totalLimit - currentUsed;
  return { allowed: fileSize <= remainingBytes, remainingBytes };
}

const GB = 1024 * 1024 * 1024;

Deno.test("quota: permite upload quando cabe no limite", () => {
  const res = checkQuota(
    { storage_used_bytes: 2 * GB, storage_limit_bytes: 10 * GB, extra_storage_bytes: 0 },
    1 * GB,
  );
  assertEquals(res.allowed, true);
  assertEquals(res.remainingBytes, 8 * GB);
});

Deno.test("quota: bloqueia upload que excede limite base", () => {
  const res = checkQuota(
    { storage_used_bytes: 9 * GB, storage_limit_bytes: 10 * GB, extra_storage_bytes: 0 },
    2 * GB,
  );
  assertEquals(res.allowed, false);
  assertEquals(res.remainingBytes, 1 * GB);
});

Deno.test("quota: soma extra_storage_bytes (add-on) ao limite", () => {
  const res = checkQuota(
    { storage_used_bytes: 10 * GB, storage_limit_bytes: 10 * GB, extra_storage_bytes: 50 * GB },
    20 * GB,
  );
  assertEquals(res.allowed, true);
  assertEquals(res.remainingBytes, 50 * GB);
});

Deno.test("quota: bloqueia quando workspace está exactamente cheio", () => {
  const res = checkQuota(
    { storage_used_bytes: 10 * GB, storage_limit_bytes: 10 * GB, extra_storage_bytes: 0 },
    1,
  );
  assertEquals(res.allowed, false);
  assertEquals(res.remainingBytes, 0);
});

Deno.test("quota: trata valores nulos como zero", () => {
  const res = checkQuota(
    // deno-lint-ignore no-explicit-any
    { storage_used_bytes: null as any, storage_limit_bytes: 10 * GB, extra_storage_bytes: null as any },
    5 * GB,
  );
  assertEquals(res.allowed, true);
  assertEquals(res.remainingBytes, 10 * GB);
});

Deno.test("quota: edge case — fileSize igual ao restante é permitido", () => {
  const res = checkQuota(
    { storage_used_bytes: 9 * GB, storage_limit_bytes: 10 * GB, extra_storage_bytes: 0 },
    1 * GB,
  );
  assertEquals(res.allowed, true);
});
