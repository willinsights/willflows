import { useState, useEffect } from 'react';
import { Loader2, Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useContracts } from '@/hooks/useContracts';
import { useContractTemplates } from '@/hooks/useContractTemplates';
import { useClients } from '@/hooks/useClients';
import { useProjects } from '@/hooks/useProjects';
import { format, addDays } from 'date-fns';

interface CreateContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClientId?: string;
  defaultProjectId?: string;
  onSuccess?: (contract: any) => void;
}

export function CreateContractModal({
  open,
  onOpenChange,
  defaultClientId,
  defaultProjectId,
  onSuccess,
}: CreateContractModalProps) {
  const { createContract, fillPlaceholders } = useContracts();
  const { templates } = useContractTemplates();
  const { clients } = useClients();
  const { projects } = useProjects();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    client_id: defaultClientId || '',
    project_id: defaultProjectId || '',
    template_id: '',
    content: '',
    total_value: '',
    payment_terms: '',
    expires_at: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        title: '',
        client_id: defaultClientId || '',
        project_id: defaultProjectId || '',
        template_id: '',
        content: '',
        total_value: '',
        payment_terms: '',
        expires_at: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      });
    }
  }, [open, defaultClientId, defaultProjectId]);

  // Apply template when selected
  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const client = clients.find(c => c.id === formData.client_id);
    const project = projects.find(p => p.id === formData.project_id);

    let content = template.content;
    
    if (client) {
      content = fillPlaceholders(
        content,
        {
          name: client.name,
          company: client.company,
          email: client.email,
          phone: client.phone,
          nif: client.nif,
          address: client.address,
        },
        project ? { name: project.name } : null,
        {
          value: formData.total_value ? parseFloat(formData.total_value) : undefined,
          expiresAt: formData.expires_at,
        }
      );
    }

    setFormData(prev => ({
      ...prev,
      template_id: templateId,
      title: prev.title || template.name,
      content,
    }));
  };

  // Re-apply placeholders when client/project changes
  useEffect(() => {
    if (formData.template_id && formData.client_id) {
      const template = templates.find(t => t.id === formData.template_id);
      if (template) {
        const client = clients.find(c => c.id === formData.client_id);
        const project = projects.find(p => p.id === formData.project_id);

        if (client) {
          const content = fillPlaceholders(
            template.content,
            {
              name: client.name,
              company: client.company,
              email: client.email,
              phone: client.phone,
              nif: client.nif,
              address: client.address,
            },
            project ? { name: project.name } : null,
            {
              value: formData.total_value ? parseFloat(formData.total_value) : undefined,
              expiresAt: formData.expires_at,
            }
          );
          setFormData(prev => ({ ...prev, content }));
        }
      }
    }
  }, [formData.client_id, formData.project_id, formData.total_value]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id || !formData.title || !formData.content) return;

    setLoading(true);

    const contract = await createContract({
      client_id: formData.client_id,
      project_id: formData.project_id || null,
      template_id: formData.template_id || null,
      title: formData.title,
      content: formData.content,
      total_value: formData.total_value ? parseFloat(formData.total_value) : null,
      payment_terms: formData.payment_terms || null,
      expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
    });

    setLoading(false);

    if (contract) {
      onOpenChange(false);
      onSuccess?.(contract);
    }
  };

  // Filter clients (only converted ones for contracts)
  const availableClients = clients.filter(c => 
    c.lead_status === 'ganho' || !c.lead_status
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Novo Contrato
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Template (opcional)</Label>
            <Select
              value={formData.template_id}
              onValueChange={handleTemplateChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                    {template.category && (
                      <span className="text-muted-foreground ml-2">
                        ({template.category})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título do Contrato *</Label>
            <Input
              id="title"
              placeholder="Ex: Contrato de Serviços Fotográficos"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          {/* Client and Project */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select
                value={formData.client_id}
                onValueChange={val => setFormData(prev => ({ ...prev, client_id: val }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {availableClients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                      {client.company && ` - ${client.company}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Projeto (opcional)</Label>
              <Select
                value={formData.project_id}
                onValueChange={val => setFormData(prev => ({ ...prev, project_id: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Associar a projeto..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Value and Expiry */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_value">Valor Total (€)</Label>
              <Input
                id="total_value"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.total_value}
                onChange={e => setFormData(prev => ({ ...prev, total_value: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires_at">Validade</Label>
              <Input
                id="expires_at"
                type="date"
                value={formData.expires_at}
                onChange={e => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
              />
            </div>
          </div>

          {/* Payment Terms */}
          <div className="space-y-2">
            <Label htmlFor="payment_terms">Condições de Pagamento</Label>
            <Input
              id="payment_terms"
              placeholder="Ex: 50% na assinatura, 50% na entrega"
              value={formData.payment_terms}
              onChange={e => setFormData(prev => ({ ...prev, payment_terms: e.target.value }))}
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Conteúdo do Contrato *</Label>
            <Textarea
              id="content"
              placeholder="Escreva ou cole o conteúdo do contrato..."
              value={formData.content}
              onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
              rows={12}
              className="font-mono text-sm"
              required
            />
            <p className="text-xs text-muted-foreground">
              Suporta placeholders: {`{{cliente.nome}}, {{cliente.empresa}}, {{contrato.valor}}, etc.`}
            </p>
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
              type="submit" 
              className="gradient-primary" 
              disabled={loading || !formData.client_id || !formData.title || !formData.content}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Criar Contrato
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
