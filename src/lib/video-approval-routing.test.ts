import { describe, expect, it } from 'vitest';
import { videoApprovalReader } from './video-approval-routing';
describe('compatible approval routing', () => {
  it('preserves the old token contract', () => {
    expect(videoApprovalReader('legacy-existing-link')).toBe('legacy');
    expect(videoApprovalReader('11111111-1111-4111-8111-111111111111')).toBe('legacy');
  });
  it('directs new 256-bit capabilities only to the private reader', () => {
    expect(videoApprovalReader('wf2_' + 'a'.repeat(64))).toBe('private');
  });
  it('never tries legacy authorization for malformed private links', () => {
    expect(videoApprovalReader('wf2_invalid')).toBe('invalid');
    expect(videoApprovalReader('wf2_' + 'a'.repeat(63))).toBe('invalid');
    expect(videoApprovalReader(undefined)).toBe('invalid');
  });
});