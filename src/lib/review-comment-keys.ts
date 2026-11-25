export const REVIEW_COMMENT_KEYS = 'wf_review_comment_keys';

export async function reviewCommentKeyHash(id: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('wfc:' + id));
  return Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, '0')).join('');
}

export function loadReviewCommentKeys(): Record<string, string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(REVIEW_COMMENT_KEYS) ?? '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export async function rememberReviewCommentKey(secret: string): Promise<string> {
  const key = await reviewCommentKeyHash(secret);
  try {
    localStorage.setItem(REVIEW_COMMENT_KEYS, JSON.stringify({ ...loadReviewCommentKeys(), [key]: secret }));
  } catch {
    // The server still protects the comment; storage may be unavailable in private browsing.
  }
  return key;
}
