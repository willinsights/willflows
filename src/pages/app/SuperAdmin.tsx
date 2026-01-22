import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * Legacy SuperAdmin page - redirects to new admin panel
 * All functionality has been migrated to /admin/*
 */
export default function SuperAdmin() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to new admin dashboard
    navigate('/admin', { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
