import { Navigate } from 'react-router-dom';

/**
 * Legacy route — redirects to the new Financeiro hub.
 * Kept for backward compatibility with bookmarks/links.
 */
export default function Pagamentos() {
  return <Navigate to="/app/financeiro" replace />;
}
