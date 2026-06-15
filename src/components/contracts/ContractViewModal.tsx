import { FileText, Send, Copy, ExternalLink, User, Calendar, Euro, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { type Contract, CONTRACT_STATUS_LABELS } from '@/hooks/useContracts';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { toast } from 'sonner';

interface ContractViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract | null;
  onSend?: (contract: Contract) => void;
}

export function ContractViewModal({ open, onOpenChange, contract, onSend }: ContractViewModalProps) {
  if (!contract) return null;

  const statusConfig = CONTRACT_STATUS_LABELS[contract.status];

  const fetchSignatureUrl = async () => {
    const { data, error } = await supabase.rpc('get_contract_sign_token', { _contract_id: contract.id });
    if (error || !data) {
      toast.error('Não foi possível obter o link de assinatura.');
      return null;
    }
    return `${window.location.origin}/contrato/${data}`;
  };

  const copySignatureLink = async () => {
    const url = await fetchSignatureUrl();
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const openSignaturePage = async () => {
    const url = await fetchSignatureUrl();
    if (!url) return;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {contract.title}
            </DialogTitle>
            <Badge className={statusConfig.color}>
              {statusConfig.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contract Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs">Cliente</p>
                <p className="font-medium">{contract.client?.name}</p>
              </div>
            </div>
            
            {contract.total_value && (
              <div className="flex items-center gap-2 text-sm">
                <Euro className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground text-xs">Valor</p>
                  <p className="font-medium">
                    {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(contract.total_value)}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs">Criado</p>
                <p className="font-medium">
                  {format(new Date(contract.created_at), "d MMM yyyy", { locale: pt })}
                </p>
              </div>
            </div>

            {contract.expires_at && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground text-xs">Validade</p>
                  <p className="font-medium">
                    {format(new Date(contract.expires_at), "d MMM yyyy", { locale: pt })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Signature Status */}
          {contract.status === 'signed' && contract.signed_at && (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <span className="font-medium text-emerald-700">Contrato Assinado</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Assinado por</p>
                  <p className="font-medium">{contract.client_signed_name || contract.client?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data/Hora</p>
                  <p className="font-medium">
                    {format(new Date(contract.signed_at), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}
                  </p>
                </div>
              </div>
              {contract.client_signature_data && (
                <div className="mt-4">
                  <p className="text-muted-foreground text-sm mb-2">Assinatura</p>
                  <img 
                    src={contract.client_signature_data} 
                    alt="Assinatura do cliente"
                    className="h-20 border rounded bg-white"
                  />
                </div>
              )}
            </div>
          )}

          {/* Signature Link (for non-signed contracts) */}
          {contract.status !== 'signed' && contract.status !== 'cancelled' && contract.status !== 'expired' && (
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm font-medium mb-2">Link de Assinatura</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 rounded bg-background text-xs truncate">
                  {getSignatureUrl()}
                </code>
                <Button variant="outline" size="sm" onClick={copySignatureLink}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={openSignaturePage}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Envie este link ao cliente para que possa visualizar e assinar o contrato.
              </p>
            </div>
          )}

          <Separator />

          {/* Contract Content */}
          <div>
            <h4 className="font-medium mb-3">Conteúdo do Contrato</h4>
            <div className="p-4 rounded-lg bg-muted/30 border whitespace-pre-wrap text-sm font-mono">
              {contract.content}
            </div>
          </div>

          {/* Payment Terms */}
          {contract.payment_terms && (
            <div>
              <h4 className="font-medium mb-2">Condições de Pagamento</h4>
              <p className="text-sm text-muted-foreground">{contract.payment_terms}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            {contract.status === 'draft' && onSend && (
              <Button onClick={() => onSend(contract)}>
                <Send className="h-4 w-4 mr-2" />
                Marcar como Enviado
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
