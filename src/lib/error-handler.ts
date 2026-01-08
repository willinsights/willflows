/**
 * Centralized error handler for database operations
 * Maps database errors to user-friendly messages without exposing internal details
 */

type PostgresErrorCode = string;

const ERROR_MESSAGES: Record<PostgresErrorCode, string> = {
  // Unique constraint violations
  '23505': 'Este registo já existe.',
  // Foreign key violations
  '23503': 'Operação inválida - dados relacionados não encontrados.',
  // Not null violations
  '23502': 'Por favor, preencha todos os campos obrigatórios.',
  // Check constraint violations
  '23514': 'Os dados fornecidos são inválidos.',
  // RLS policy violations
  '42501': 'Não tem permissão para realizar esta operação.',
  // Connection/timeout errors
  '57014': 'A operação demorou demasiado. Por favor, tente novamente.',
  // Authentication errors
  'PGRST301': 'Sessão expirada. Por favor, faça login novamente.',
};

const DEFAULT_ERROR_MESSAGE = 'Ocorreu um erro. Por favor, tente novamente.';

export interface SafeError {
  message: string;
  isAuthError: boolean;
}

/**
 * Converts a database error to a safe, user-friendly message
 * @param error - The error object from Supabase or other sources
 * @returns SafeError with user-friendly message
 */
export function getSafeErrorMessage(error: unknown): SafeError {
  if (!error) {
    return { message: DEFAULT_ERROR_MESSAGE, isAuthError: false };
  }

  const err = error as any;
  
  // Check for Supabase error codes
  if (err.code && ERROR_MESSAGES[err.code]) {
    return {
      message: ERROR_MESSAGES[err.code],
      isAuthError: err.code === 'PGRST301',
    };
  }

  // Check for auth-related errors
  if (err.message?.toLowerCase().includes('jwt') || 
      err.message?.toLowerCase().includes('token') ||
      err.message?.toLowerCase().includes('auth')) {
    return {
      message: 'Sessão expirada. Por favor, faça login novamente.',
      isAuthError: true,
    };
  }

  // Check for network errors
  if (err.message?.includes('Failed to fetch') || 
      err.message?.includes('NetworkError') ||
      err.message?.includes('ERR_INSUFFICIENT_RESOURCES')) {
    return {
      message: 'Erro de conexão. Verifique a sua ligação à internet.',
      isAuthError: false,
    };
  }

  // Return default safe message
  return { message: DEFAULT_ERROR_MESSAGE, isAuthError: false };
}

/**
 * Logs error details for debugging while returning a safe message
 * @param context - Description of where the error occurred
 * @param error - The error object
 * @returns User-friendly error message
 */
export function handleDatabaseError(context: string, error: unknown): string {
  // Log full error for debugging (server-side/dev only)
  console.error(`[${context}]`, error);
  
  return getSafeErrorMessage(error).message;
}
