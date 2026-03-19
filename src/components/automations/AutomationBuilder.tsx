import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Zap, ArrowRight, Mail, Bell } from 'lucide-react';
import {
  TRIGGER_TYPES,
  ACTION_TYPES,
  RECIPIENT_TYPES,
  type AutomationFormData,
} from '@/hooks/useWorkflowAutomations';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useState as useStateHook, useEffect } from 'react';

const TEMPLATE_VARIABLES = [
  { key: '{project_name}', label: 'Nome do Projeto' },
  { key: '{client_name}', label: 'Nome do Cliente' },
  { key: '{user_name}', label: 'Utilizador que Disparou' },
  { key: '{column_name}', label: 'Coluna de Destino' },
  { key: '{from_column_name}', label: 'Coluna de Origem' },
  { key: '{workspace_name}', label: 'Nome do Workspace' },
  { key: '{link_project}', label: 'Link do Projeto' },
];

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'edicao', label: 'Edição' },
  { value: 'captacao', label: 'Captação' },
  { value: 'gestao', label: 'Gestão' },
  { value: 'visualizacao', label: 'Visualização' },
];

interface AutomationBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: AutomationFormData) => Promise<unknown>;
  initialData?: Partial<AutomationFormData>;
  saving?: boolean;
}

export function AutomationBuilder({
  open,
  onOpenChange,
  onSave,
  initialData,
  saving,
}: AutomationBuilderProps) {
  const { currentWorkspace } = useWorkspace();
  const [columns, setColumns] = useStateHook<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    supabase
      .from('kanban_columns')
      .select('id, name')
      .eq('workspace_id', currentWorkspace.id)
      .order('position')
      .then(({ data }) => setColumns(data || []));
  }, [currentWorkspace?.id]);

  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [triggerType, setTriggerType] = useState(initialData?.trigger_type || '');
  const [triggerColumnId, setTriggerColumnId] = useState(
    (initialData?.trigger_config as any)?.column_id || ''
  );
  const [fromColumnId, setFromColumnId] = useState(
    (initialData?.trigger_config as any)?.from_column_id || ''
  );
  const [toColumnId, setToColumnId] = useState(
    (initialData?.trigger_config as any)?.to_column_id || ''
  );
  const [actionType, setActionType] = useState(initialData?.action_type || '');
  const [recipientType, setRecipientType] = useState(
    (initialData?.recipient_config as any)?.type || ''
  );
  const [recipientValue, setRecipientValue] = useState(
    (initialData?.recipient_config as any)?.value || ''
  );

  // Email fields
  const [emailSubject, setEmailSubject] = useState(
    (initialData?.action_config as any)?.subject || ''
  );
  const [emailBody, setEmailBody] = useState(
    (initialData?.action_config as any)?.body || ''
  );

  // Notification fields
  const [notifTitle, setNotifTitle] = useState(
    (initialData?.action_config as any)?.title || ''
  );
  const [notifMessage, setNotifMessage] = useState(
    (initialData?.action_config as any)?.message || ''
  );

  const needsColumn = ['card_enters_column', 'card_leaves_column'].includes(triggerType);
  const needsBothColumns = triggerType === 'card_moved';
  const needsRole = recipientType === 'role';
  const needsEmails = recipientType === 'fixed_emails';

  const insertVariable = (variable: string, target: 'subject' | 'body' | 'title' | 'message') => {
    switch (target) {
      case 'subject':
        setEmailSubject((prev) => prev + variable);
        break;
      case 'body':
        setEmailBody((prev) => prev + variable);
        break;
      case 'title':
        setNotifTitle((prev) => prev + variable);
        break;
      case 'message':
        setNotifMessage((prev) => prev + variable);
        break;
    }
  };

  const handleSave = async () => {
    if (!name || !triggerType || !actionType || !recipientType) return;

    const triggerConfig: Record<string, unknown> = {};
    if (needsColumn) triggerConfig.column_id = triggerColumnId;
    if (needsBothColumns) {
      if (fromColumnId) triggerConfig.from_column_id = fromColumnId;
      if (toColumnId) triggerConfig.to_column_id = toColumnId;
    }

    const actionConfig: Record<string, unknown> =
      actionType === 'send_email'
        ? { subject: emailSubject, body: emailBody }
        : { title: notifTitle, message: notifMessage };

    const recipientConfig: Record<string, unknown> = { type: recipientType };
    if (needsRole || needsEmails) recipientConfig.value = recipientValue;

    await onSave({
      name,
      description,
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      action_type: actionType,
      action_config: actionConfig,
      recipient_config: recipientConfig,
    });

    onOpenChange(false);
  };

  const VariableChips = ({ target }: { target: 'subject' | 'body' | 'title' | 'message' }) => (
    <div className="flex flex-wrap gap-1 mt-1">
      {TEMPLATE_VARIABLES.map((v) => (
        <Badge
          key={v.key}
          variant="outline"
          className="cursor-pointer text-xs hover:bg-accent transition-colors"
          onClick={() => insertVariable(v.key, target)}
        >
          {v.label}
        </Badge>
      ))}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {initialData ? 'Editar Automação' : 'Nova Automação'}
          </SheetTitle>
          <SheetDescription>
            Configure quando e como a automação deve ser executada.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Name */}
          <div className="space-y-2">
            <Label>Nome da Automação</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Notificar cliente na entrega"
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Envia email ao cliente quando o projeto é entregue"
            />
          </div>

          <Separator />

          {/* Trigger */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">⚡ Quando</Label>
            <Select value={triggerType} onValueChange={setTriggerType}>
              <SelectTrigger>
                <SelectValue placeholder="Escolher gatilho..." />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.icon} {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {needsColumn && (
              <Select value={triggerColumnId} onValueChange={setTriggerColumnId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar coluna..." />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {needsBothColumns && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">De (opcional)</Label>
                  <Select value={fromColumnId} onValueChange={setFromColumnId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Qualquer..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Qualquer coluna</SelectItem>
                      {columns.map((col) => (
                        <SelectItem key={col.id} value={col.id}>
                          {col.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Para (opcional)</Label>
                  <Select value={toColumnId} onValueChange={setToColumnId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Qualquer..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Qualquer coluna</SelectItem>
                      {columns.map((col) => (
                        <SelectItem key={col.id} value={col.id}>
                          {col.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Action */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">🎯 Fazer</Label>
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger>
                <SelectValue placeholder="Escolher ação..." />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.icon} {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {actionType === 'send_email' && (
              <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-4 w-4" /> Configuração do Email
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Assunto</Label>
                  <Input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Atualização: {project_name}"
                  />
                  <VariableChips target="subject" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Corpo</Label>
                  <Textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="Olá, o projeto {project_name} foi movido para {column_name}."
                    rows={4}
                  />
                  <VariableChips target="body" />
                </div>
              </div>
            )}

            {actionType === 'notify_in_app' && (
              <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Bell className="h-4 w-4" /> Configuração da Notificação
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Título</Label>
                  <Input
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    placeholder="Projeto atualizado"
                  />
                  <VariableChips target="title" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Mensagem</Label>
                  <Textarea
                    value={notifMessage}
                    onChange={(e) => setNotifMessage(e.target.value)}
                    placeholder="O projeto {project_name} foi movido para {column_name}."
                    rows={3}
                  />
                  <VariableChips target="message" />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Recipients */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">👥 Destinatários</Label>
            <Select value={recipientType} onValueChange={setRecipientType}>
              <SelectTrigger>
                <SelectValue placeholder="Quem recebe..." />
              </SelectTrigger>
              <SelectContent>
                {RECIPIENT_TYPES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {needsRole && (
              <Select value={recipientValue} onValueChange={setRecipientValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar função..." />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {needsEmails && (
              <Input
                value={recipientValue}
                onChange={(e) => setRecipientValue(e.target.value)}
                placeholder="email1@ex.com, email2@ex.com"
              />
            )}
          </div>

          {/* Summary */}
          {triggerType && actionType && recipientType && (
            <>
              <Separator />
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm text-foreground">
                  <strong>Resumo:</strong> Quando{' '}
                  <span className="text-primary font-medium">
                    {TRIGGER_TYPES.find((t) => t.value === triggerType)?.label}
                  </span>{' '}
                  → {' '}
                  <span className="text-primary font-medium">
                    {ACTION_TYPES.find((a) => a.value === actionType)?.label}
                  </span>{' '}
                  para{' '}
                  <span className="text-primary font-medium">
                    {RECIPIENT_TYPES.find((r) => r.value === recipientType)?.label}
                  </span>
                </p>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={saving || !name || !triggerType || !actionType || !recipientType}
            >
              {saving ? 'A guardar...' : 'Guardar Automação'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
