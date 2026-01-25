import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface AccessDeniedProps {
  message?: string;
  description?: string;
}

export function AccessDenied({ 
  message = 'Acesso Restrito',
  description = 'Não tem permissão para aceder a esta página.'
}: AccessDeniedProps) {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <Lock className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <h2 className="text-xl font-bold mb-2">{message}</h2>
        <p className="text-muted-foreground max-w-md mb-6">{description}</p>
        <Button variant="outline" onClick={() => navigate('/app')}>
          Voltar ao Dashboard
        </Button>
      </div>
    </div>
  );
}
