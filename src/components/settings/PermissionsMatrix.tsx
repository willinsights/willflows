import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Lock, RotateCcw, Save, Info, Pencil } from 'lucide-react';
import { useRolePermissions, PERMISSION_DEFINITIONS, ALL_ROLES, ROLE_LABELS } from '@/hooks/useRolePermissions';
import { useRoleLabels, CUSTOMIZABLE_ROLES, DEFAULT_ROLE_LABELS } from '@/hooks/useRoleLabels';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export function PermissionsMatrix() {
  const { isAdmin } = useWorkspace();
  const { permissions, loading, saving, getPermission, resetToDefaults, saveAllPermissions, refresh } = useRolePermissions();
  const { 
    getRoleLabel, 
    updateMultipleLabels, 
    resetToDefaults: resetLabelDefaults, 
    loading: labelsLoading, 
    saving: labelsSaving 
  } = useRoleLabels();
  const { toast } = useToast();

  // Local state to track changes before saving
  const [localPermissions, setLocalPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [hasChanges, setHasChanges] = useState(false);
  
  // Local state for role label editing
  const [localLabels, setLocalLabels] = useState<Record<AppRole, string>>({} as Record<AppRole, string>);
  const [hasLabelChanges, setHasLabelChanges] = useState(false);

  // Initialize local state from fetched permissions
  useEffect(() => {
    if (permissions.length > 0) {
      const initial: Record<string, Record<string, boolean>> = {};
      for (const role of ALL_ROLES) {
        initial[role] = {};
        for (const perm of PERMISSION_DEFINITIONS) {
          initial[role][perm.key] = getPermission(role, perm.key);
        }
      }
      setLocalPermissions(initial);
      setHasChanges(false);
    }
  }, [permissions]);

  // Initialize local labels
  useEffect(() => {
    const labels: Record<AppRole, string> = {} as Record<AppRole, string>;
    for (const role of CUSTOMIZABLE_ROLES) {
      labels[role] = getRoleLabel(role);
    }
    setLocalLabels(labels);
    setHasLabelChanges(false);
  }, [getRoleLabel]);

  const handleLabelChange = (role: AppRole, newLabel: string) => {
    setLocalLabels(prev => ({ ...prev, [role]: newLabel }));
    setHasLabelChanges(true);
  };

  const handleSaveLabels = async () => {
    const updates = CUSTOMIZABLE_ROLES.map(role => ({
      role,
      label: localLabels[role] || DEFAULT_ROLE_LABELS[role],
    }));

    const result = await updateMultipleLabels(updates);
    
    if (result.success) {
      toast({ title: 'Nomes guardados', description: 'Os nomes das funções foram atualizados.' });
      setHasLabelChanges(false);
    } else {
      toast({ title: 'Erro ao guardar', description: result.error, variant: 'destructive' });
    }
  };

  const handleResetLabels = async () => {
    const result = await resetLabelDefaults();
    
    if (result.success) {
      // Reset local state to defaults
      const labels: Record<AppRole, string> = {} as Record<AppRole, string>;
      for (const role of CUSTOMIZABLE_ROLES) {
        labels[role] = DEFAULT_ROLE_LABELS[role];
      }
      setLocalLabels(labels);
      toast({ title: 'Nomes restaurados', description: 'Os nomes das funções foram repostos aos valores padrão.' });
      setHasLabelChanges(false);
    } else {
      toast({ title: 'Erro ao restaurar', description: result.error, variant: 'destructive' });
    }
  };

  const handleToggle = (role: AppRole, key: string, enabled: boolean) => {
    if (role === 'admin') return; // Can't modify admin
    
    setLocalPermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [key]: enabled,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const updates: { role: AppRole; key: string; enabled: boolean }[] = [];
    
    for (const role of ALL_ROLES) {
      if (role === 'admin') continue;
      for (const perm of PERMISSION_DEFINITIONS) {
        updates.push({
          role,
          key: perm.key,
          enabled: localPermissions[role]?.[perm.key] ?? false,
        });
      }
    }

    const result = await saveAllPermissions(updates);
    
    if (result.success) {
      toast({ title: 'Permissões guardadas', description: 'As alterações foram aplicadas com sucesso.' });
      setHasChanges(false);
    } else {
      toast({ title: 'Erro ao guardar', description: result.error, variant: 'destructive' });
    }
  };

  const handleReset = async () => {
    const result = await resetToDefaults();
    
    if (result.success) {
      toast({ title: 'Permissões restauradas', description: 'As permissões foram repostas aos valores padrão.' });
      setHasChanges(false);
    } else {
      toast({ title: 'Erro ao restaurar', description: result.error, variant: 'destructive' });
    }
  };

  // Group permissions by category
  const groupedPermissions = PERMISSION_DEFINITIONS.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, typeof PERMISSION_DEFINITIONS>);

  if (loading || labelsLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Gestão de Permissões</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isSaving = saving || labelsSaving;

  const rolesWithoutAdmin = ALL_ROLES.filter(r => r !== 'admin');

  return (
    <div className="space-y-6">
      {/* Role Name Customization Card */}
      {isAdmin && (
        <Card className="glass-card">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Pencil className="h-5 w-5" />
                  Personalizar Nomes das Funções
                </CardTitle>
                <CardDescription>Altere os nomes das funções de utilizador para se adequarem à sua equipa</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleResetLabels}
                  disabled={isSaving}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restaurar
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSaveLabels}
                  disabled={isSaving || !hasLabelChanges}
                  className="gradient-primary"
                >
                  {labelsSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Guardar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {CUSTOMIZABLE_ROLES.map((role) => (
                <div key={role} className="space-y-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">
                    {DEFAULT_ROLE_LABELS[role]} (padrão)
                  </label>
                  <Input
                    value={localLabels[role] || ''}
                    onChange={(e) => handleLabelChange(role, e.target.value)}
                    placeholder={DEFAULT_ROLE_LABELS[role]}
                    className="h-9"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Permissions Matrix Card */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Gestão de Permissões</CardTitle>
              <CardDescription>Configure as permissões de cada função de utilizador</CardDescription>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleReset}
                  disabled={isSaving}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restaurar Padrão
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                  className="gradient-primary"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Alterações
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Permissão</th>
                  <th className="text-center py-3 px-2 font-medium">
                    <div className="flex items-center justify-center gap-1">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                      Admin
                    </div>
                  </th>
                  {rolesWithoutAdmin.map(role => (
                    <th key={role} className="text-center py-3 px-2 font-medium">
                      {getRoleLabel(role)}
                    </th>
                  ))}
                </tr>
              </thead>
            <tbody>
              {Object.entries(groupedPermissions).map(([category, perms]) => (
                <React.Fragment key={`cat-${category}`}>
                  <tr className="bg-muted/30">
                    <td colSpan={2 + rolesWithoutAdmin.length} className="py-2 px-2 font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                      {category}
                    </td>
                  </tr>
                  {perms.map((perm, idx) => (
                    <motion.tr
                      key={perm.key}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className="border-b border-border/50 hover:bg-muted/20"
                    >
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium text-sm">{perm.name}</p>
                          <p className="text-xs text-muted-foreground">{perm.description}</p>
                        </div>
                      </td>
                      {/* Admin column - always enabled, locked */}
                      <td className="text-center py-3 px-2">
                        <div className="flex justify-center">
                          <div className="relative">
                            <Switch checked={true} disabled className="data-[state=checked]:bg-primary/50" />
                            <Lock className="absolute -top-1 -right-1 h-3 w-3 text-muted-foreground" />
                          </div>
                        </div>
                      </td>
                      {/* Other roles */}
                      {rolesWithoutAdmin.map(role => (
                        <td key={`${perm.key}-${role}`} className="text-center py-3 px-2">
                          <Switch
                            checked={localPermissions[role]?.[perm.key] ?? false}
                            onCheckedChange={(checked) => handleToggle(role, perm.key, checked)}
                            disabled={!isAdmin || isSaving}
                          />
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-6">
            {Object.entries(groupedPermissions).map(([category, perms]) => (
              <div key={category} className="space-y-3">
                <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  {category}
                </h4>
                {perms.map((perm) => (
                  <motion.div
                    key={perm.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg bg-muted/30 space-y-3"
                  >
                    <div>
                      <p className="font-medium">{perm.name}</p>
                      <p className="text-xs text-muted-foreground">{perm.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Admin badge */}
                      <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <span className="text-xs font-medium flex items-center gap-1">
                          <Lock className="h-3 w-3" /> Admin
                        </span>
                        <Switch checked={true} disabled className="scale-75" />
                      </div>
                      {/* Other roles */}
                      {rolesWithoutAdmin.map(role => (
                        <div key={`${perm.key}-${role}-mobile`} className="flex items-center justify-between p-2 rounded bg-muted/50">
                          <span className="text-xs font-medium">{getRoleLabel(role)}</span>
                          <Switch
                            checked={localPermissions[role]?.[perm.key] ?? false}
                            onCheckedChange={(checked) => handleToggle(role, perm.key, checked)}
                            disabled={!isAdmin || isSaving}
                            className="scale-75"
                          />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            ))}
          </div>

          {/* Info note */}
          <div className="flex items-start gap-3 p-4 rounded-lg border border-info/20 bg-info/5">
            <Info className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-info">Notas sobre permissões:</p>
              <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                <li>Admin tem sempre todas as permissões ativas e não pode ser alterado</li>
                <li><strong>Páginas:</strong> Controla quais páginas aparecem no menu (Leads, Contratos, Equipa, Relatórios)</li>
                <li><strong>Clientes:</strong> Separado entre acesso à página, edição e visualização de dados sensíveis (contactos e valores)</li>
                <li><strong>Financeiro:</strong> "Financeiro global" mostra receita/custos totais; "Meus ganhos" mostra apenas os ganhos pessoais</li>
                <li>O nome do cliente aparece sempre em projetos e tarefas, independentemente das permissões</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
