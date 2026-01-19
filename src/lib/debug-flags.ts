/**
 * Debug flags for development troubleshooting
 * Enable via URL param (?debugChat=1) or localStorage (DEBUG_CHAT=1)
 */

export function isChatDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check URL param
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('debugChat') === '1') return true;
  
  // Check localStorage
  try {
    return localStorage.getItem('DEBUG_CHAT') === '1';
  } catch {
    return false;
  }
}

export function chatDebug(attemptId: string, ...args: unknown[]): void {
  if (isChatDebugEnabled()) {
    console.warn(`[ChatDebug ${attemptId}]`, ...args);
  }
}

export function chatDebugError(attemptId: string, context: string, error: unknown): void {
  if (!isChatDebugEnabled()) return;
  
  const errorDetails = error instanceof Error ? {
    message: error.message,
    name: error.name,
    // Supabase errors have these extra fields
    code: (error as any).code,
    details: (error as any).details,
    hint: (error as any).hint,
  } : error;
  
  console.error(`[ChatDebug ${attemptId}] ${context}:`, errorDetails);
}
