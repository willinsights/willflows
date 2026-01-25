import { useState } from 'react';
import { Loader2, UserCheck, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLeads, type Lead } from '@/hooks/useLeads';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ConvertLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  onSuccess?: () => void;
}

export function ConvertLeadModal({
  open,
  onOpenChange,
  lead,
  onSuccess,
}: ConvertLeadModalProps) {
  const { updateLeadStatus } = useLeads();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [nif, setNif] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const handleConvert = async () => {
    if (!lead) return;
    
    setLoading(true);

    try {
      // Update the lead to client status with billing info
      const { error } = await supabase
        .from('clients')
        .update({
          lead_status: 'ganho',
          converted_at: new Date().toISOString(),
          nif: nif || null,
          address: address || null,
          notes: lead.notes ? `${lead.notes}\n\n---\nNotas de conversão: ${notes}` : notes || null,
        })
        .eq('id', lead.id);

      if (error) throw error;

      toast({
        title: '🎉 Lead convertido em cliente!',
        description: `${lead.name} foi convertido com sucesso.`,
      });

      onOpenChange(false);
      setNif('');
      setAddress('');
      setNotes('');
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Erro ao converter lead',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-emerald-500" />
            Converter Lead em Cliente
          </DialogTitle>
          <DialogDescription>
            Parabéns! Está a converter <strong>{lead.name}</strong> em cliente.
            Adicione os dados de faturação se necessário.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Lead Summary */}
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-lg font-bold text-emerald-600">
                  {lead.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium">{lead.name}</p>
                {lead.company && (
                  <p className="text-sm text-muted-foreground">{lead.company}</p>
                )}
              </div>
            </div>
          </div>

          {/* Billing Info */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="nif">NIF / Contribuinte</Label>
              <Input
                id="nif"
                placeholder="123456789"
                value={nif}
                onChange={(e) => setNif(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Morada de Faturação</Label>
              <Textarea
                id="address"
                placeholder="Rua, Código Postal, Cidade"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas da Conversão</Label>
              <Textarea
                id="notes"
                placeholder="Informações sobre o negócio fechado..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConvert} 
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="mr-2 h-4 w-4" />
              )}
              Converter em Cliente
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
