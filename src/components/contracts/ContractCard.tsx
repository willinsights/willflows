import { FileText, Send, Eye, CheckCircle, Clock, XCircle, MoreVertical, ExternalLink, Copy, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type Contract, CONTRACT_STATUS_LABELS } from '@/hooks/useContracts';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { toast } from 'sonner';

const STATUS_ICONS: Record<string, React.ReactNode> = {
  draft: <FileText className="h-4 w-4" />,
  sent: <Send className="h-4 w-4" />,
  viewed: <Eye className="h-4 w-4" />,
  signed: <CheckCircle className="h-4 w-4" />,
  expired: <Clock className="h-4 w-4" />,
  cancelled: <XCircle className="h-4 w-4" />,
};

interface ContractCardProps {
  contract: Contract;
  onView: (contract: Contract) => void;
  onSend: (contract: Contract) => void;
  onCancel: (contract: Contract) => void;
  onDelete: (contract: Contract) => void;
}

export function ContractCard({ contract, onView, onSend, onCancel, onDelete }: ContractCardProps) {
  const statusConfig = CONTRACT_STATUS_LABELS[contract.status];

  const getSignatureUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/contrato/${contract.signature_token}`;
  };

  const copySignatureLink = () => {
    navigator.clipboard.writeText(getSignatureUrl());
    toast.success('Link copiado!');
  };

  const openSignaturePage = () => {
    window.open(getSignatureUrl(), '_blank');
  };

  return (
    <div className="group p-4 rounded-xl border bg-card/80 backdrop-blur-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title and Status */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium truncate">{contract.title}</h3>
            <Badge className={`${statusConfig.color} shrink-0`}>
              <span className="mr-1">{STATUS_ICONS[contract.status]}</span>
              {statusConfig.label}
            </Badge>
          </div>

          {/* Client */}
          <p className="text-sm text-muted-foreground mb-2">
            {contract.client?.name}
            {contract.client?.company && ` • ${contract.client.company}`}
          </p>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {contract.total_value && (
              <span className="font-medium text-foreground">
                {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(contract.total_value)}
              </span>
            )}
            {contract.project && (
              <span>Projeto: {contract.project.name}</span>
            )}
            <span>
              Criado: {format(new Date(contract.created_at), "d MMM yyyy", { locale: pt })}
            </span>
            {contract.expires_at && (
              <span>
                Expira: {format(new Date(contract.expires_at), "d MMM yyyy", { locale: pt })}
              </span>
            )}
            {contract.signed_at && (
              <span className="text-emerald-600">
                Assinado: {format(new Date(contract.signed_at), "d MMM yyyy 'às' HH:mm", { locale: pt })}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onView(contract)}>
            Ver
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onView(contract)}>
                <Eye className="h-4 w-4 mr-2" />
                Ver Contrato
              </DropdownMenuItem>
              
              {(contract.status === 'draft' || contract.status === 'sent' || contract.status === 'viewed') && (
                <>
                  <DropdownMenuItem onClick={copySignatureLink}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Link de Assinatura
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={openSignaturePage}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir Página de Assinatura
                  </DropdownMenuItem>
                </>
              )}

              {contract.status === 'draft' && (
                <DropdownMenuItem onClick={() => onSend(contract)}>
                  <Send className="h-4 w-4 mr-2" />
                  Marcar como Enviado
                </DropdownMenuItem>
              )}

              {(contract.status === 'sent' || contract.status === 'viewed') && (
                <DropdownMenuItem onClick={() => onCancel(contract)} className="text-destructive">
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar Contrato
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => onDelete(contract)} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
