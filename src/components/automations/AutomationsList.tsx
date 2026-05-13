import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Zap, Plus, Trash2, Pencil, Mail, Bell, Send, Loader2 } from 'lucide-react';
import { useWorkflowAutomations, TRIGGER_TYPES, ACTION_TYPES, RECIPIENT_TYPES, type AutomationFormData } from '@/hooks/useWorkflowAutomations';
import { AutomationBuilder } from './AutomationBuilder';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useState as useStateAlias, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppToast } from '@/hooks/useAppToast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AutomationsList() {
  const { automations, loading, saving, createAutomation, updateAutomation, deleteAutomation, toggleAutomation } = useWorkflowAutomations();
  const { currentWorkspace } = useWorkspace();
  const [columns, setColumnsState] = useStateAlias<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    supabase
      .from('kanban_columns')
      .select('id, name')
      .eq('workspace_id', currentWorkspace.id)
      .order('position')
      .then(({ data }) => setColumnsState(data || []));
  }, [currentWorkspace?.id]);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [testAutomationId, setTestAutomationId] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const { user } = useAuth();
  const toast = useAppToast();

  useEffect(() => {
    if (testAutomationId && user?.email && !testEmail) setTestEmail(user.email);
  }, [testAutomationId, user?.email, testEmail]);

  const handleSendTest = async () => {
    if (!testAutomationId || !testEmail) return;
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-test-automation-email', {
        body: { automation_id: testAutomationId, recipient_email: testEmail },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const link = (data as any)?.approval_link_resolved;
      const proj = (data as any)?.project_used?.name;
      toast.success('Email de teste enviado', {
        description: link
          ? `Projeto: ${proj}. Link de aprovação resolvido ✓`
          : `Projeto: ${proj}. ⚠️ Sem token ativo — {link_aprovacao} ficará vazio.`,
      });
      setTestAutomationId(null);
    } catch (err: any) {
      toast.error('Falha ao enviar teste', { description: err?.message || 'Erro desconhecido' });
    } finally {
      setSendingTest(false);
    }
  };

  const getColumnName = (id: string) => columns.find(c => c.id === id)?.name || 'Desconhecida';

  const getTriggerLabel = (auto: any) => {
    const trigger = TRIGGER_TYPES.find(t => t.value === auto.trigger_type);
    let label = trigger?.label || auto.trigger_type;
    const config = auto.trigger_config || {};
    
    if (config.column_id) {
      label += ` "${getColumnName(config.column_id as string)}"`;
    }
    if (config.from_column_id) {
      label += ` de "${getColumnName(config.from_column_id as string)}"`;
    }
    if (config.to_column_id) {
      label += ` para "${getColumnName(config.to_column_id as string)}"`;
    }
    return label;
  };

  const getRecipientLabel = (config: any) => {
    const type = RECIPIENT_TYPES.find(r => r.value === config?.type);
    if (!type) return 'Desconhecido';
    if (config.type === 'role') return `Função: ${config.value}`;
    if (config.type === 'fixed_emails') return `Emails: ${config.value}`;
    return type.label;
  };

  const handleEdit = (id: string) => {
    setEditingAutomation(id);
    setBuilderOpen(true);
  };

  const handleCreate = () => {
    setEditingAutomation(null);
    setBuilderOpen(true);
  };

  const handleSave = async (data: AutomationFormData) => {
    if (editingAutomation) {
      await updateAutomation(editingAutomation, data);
    } else {
      await createAutomation(data);
    }
  };

  const editingData = editingAutomation
    ? automations.find(a => a.id === editingAutomation)
    : undefined;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Automações do Workflow
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure ações automáticas baseadas em eventos do Kanban.
          </p>
        </div>
        <Button onClick={handleCreate} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Automação
        </Button>
      </div>

      {automations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Zap className="h-10 w-10 text-muted-foreground mb-3" />
            <h4 className="font-medium mb-1">Sem automações configuradas</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Crie a primeira automação para disparar ações quando eventos acontecem no workflow.
            </p>
            <Button onClick={handleCreate} size="sm" variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Automação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {automations.map((auto) => (
            <Card key={auto.id} className={auto.is_active ? '' : 'opacity-60'}>
              <CardContent className="flex items-center gap-4 p-4">
                <Switch
                  checked={auto.is_active}
                  onCheckedChange={(checked) => toggleAutomation(auto.id, checked)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">{auto.name}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {auto.action_type === 'send_email' ? (
                        <><Mail className="h-3 w-3 mr-1" /> Email</>
                      ) : (
                        <><Bell className="h-3 w-3 mr-1" /> Notificação</>
                      )}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Quando <strong>{getTriggerLabel(auto)}</strong> → {getRecipientLabel(auto.recipient_config)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {auto.action_type === 'send_email' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Enviar email de teste"
                      onClick={() => { setTestEmail(user?.email || ''); setTestAutomationId(auto.id); }}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(auto.id)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(auto.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AutomationBuilder
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        onSave={handleSave}
        initialData={editingData ? {
          name: editingData.name,
          description: editingData.description || undefined,
          trigger_type: editingData.trigger_type,
          trigger_config: editingData.trigger_config,
          action_type: editingData.action_type,
          action_config: editingData.action_config,
          recipient_config: editingData.recipient_config,
        } : undefined}
        saving={saving}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar automação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser revertida. A automação será permanentemente eliminada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteId) deleteAutomation(deleteId); setDeleteId(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
