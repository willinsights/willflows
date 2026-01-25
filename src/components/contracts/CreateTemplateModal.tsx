import { useState } from 'react';
import { Loader2, Plus, FileCode, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { useContractTemplates, AVAILABLE_PLACEHOLDERS, type ContractTemplate } from '@/hooks/useContractTemplates';
import { toast } from 'sonner';

const TEMPLATE_CATEGORIES = [
  { value: 'fotografia', label: 'Fotografia' },
  { value: 'video', label: 'Vídeo' },
  { value: 'eventos', label: 'Eventos' },
  { value: 'corporativo', label: 'Corporativo' },
  { value: 'casamento', label: 'Casamento' },
  { value: 'outro', label: 'Outro' },
];

interface CreateTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTemplate?: ContractTemplate | null;
  onSuccess?: () => void;
}

export function CreateTemplateModal({
  open,
  onOpenChange,
  editTemplate,
  onSuccess,
}: CreateTemplateModalProps) {
  const { createTemplate, updateTemplate } = useContractTemplates();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: editTemplate?.name || '',
    description: editTemplate?.description || '',
    category: editTemplate?.category || '',
    content: editTemplate?.content || '',
  });

  // Reset form when editTemplate changes
  useState(() => {
    if (editTemplate) {
      setFormData({
        name: editTemplate.name,
        description: editTemplate.description || '',
        category: editTemplate.category || '',
        content: editTemplate.content,
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.content) return;

    setLoading(true);

    let result;
    if (editTemplate) {
      result = await updateTemplate(editTemplate.id, formData);
    } else {
      result = await createTemplate(formData);
    }

    setLoading(false);

    if (result) {
      setFormData({ name: '', description: '', category: '', content: '' });
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const insertPlaceholder = (placeholder: string) => {
    const textarea = document.getElementById('template-content') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.content;
    const before = text.substring(0, start);
    const after = text.substring(end);

    setFormData(prev => ({
      ...prev,
      content: before + placeholder + after,
    }));

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 0);
  };

  const copyPlaceholder = (placeholder: string) => {
    navigator.clipboard.writeText(placeholder);
    toast.success('Placeholder copiado!');
  };

  // Group placeholders by category
  const groupedPlaceholders = AVAILABLE_PLACEHOLDERS.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_PLACEHOLDERS>);

  const categoryLabels: Record<string, string> = {
    cliente: 'Cliente',
    projeto: 'Projeto',
    contrato: 'Contrato',
    empresa: 'Empresa',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5 text-primary" />
            {editTemplate ? 'Editar Template' : 'Novo Template de Contrato'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Template *</Label>
              <Input
                id="name"
                placeholder="Ex: Contrato de Casamento"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={val => setFormData(prev => ({ ...prev, category: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Breve descrição do template..."
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          {/* Placeholders Reference */}
          <div className="space-y-2">
            <Label>Placeholders Disponíveis</Label>
            <div className="p-3 rounded-lg bg-muted/50 border space-y-3">
              {Object.entries(groupedPlaceholders).map(([category, placeholders]) => (
                <div key={category}>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">
                    {categoryLabels[category] || category}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {placeholders.map(p => (
                      <Badge
                        key={p.key}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10 transition-colors group"
                        onClick={() => insertPlaceholder(p.key)}
                      >
                        <span className="font-mono text-xs">{p.key}</span>
                        <Copy 
                          className="h-3 w-3 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyPlaceholder(p.key);
                          }}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Clique num placeholder para inserir no cursor, ou copie com o ícone.
            </p>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="template-content">Conteúdo do Template *</Label>
            <Textarea
              id="template-content"
              placeholder={`CONTRATO DE PRESTAÇÃO DE SERVIÇOS

Entre:
{{empresa.nome}}, doravante designado "Prestador"

E:
{{cliente.nome}}, com sede em {{cliente.morada}}, NIF {{cliente.nif}}, doravante designado "Cliente"

É celebrado o presente contrato de prestação de serviços, nos seguintes termos:

1. OBJETO
O presente contrato tem por objeto a prestação de serviços de {{projeto.nome}}.

2. VALOR
O valor total dos serviços é de {{contrato.valor}}.

...`}
              value={formData.content}
              onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
              rows={16}
              className="font-mono text-sm"
              required
            />
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
              disabled={loading || !formData.name || !formData.content}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {editTemplate ? 'Guardar Alterações' : 'Criar Template'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
