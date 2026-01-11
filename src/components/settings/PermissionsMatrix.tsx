import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lock, RotateCcw, Save, Info } from 'lucide-react';
import { useRolePermissions, PERMISSION_DEFINITIONS, ALL_ROLES, ROLE_LABELS } from '@/hooks/useRolePermissions';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export function PermissionsMatrix() {
  const { isAdmin } = useWorkspace();
  const { permissions, loading, saving, getPermission, resetToDefaults, saveAllPermissions, refresh } = useRolePermissions();
  const { toast } = useToast();

  // Local state to track changes before saving
  const [localPermissions, setLocalPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [hasChanges, setHasChanges] = useState(false);

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

  if (loading) {
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

  const rolesWithoutAdmin = ALL_ROLES.filter(r => r !== 'admin');

  return (
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
                disabled={saving}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurar Padrão
              </Button>
              <Button 
                size="sm" 
                onClick={handleSave}
                disabled={saving || !hasChanges}
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
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedPermissions).map(([category, perms]) => (
                <React.Fragment key={`cat-${category}`}>
                  <tr className="bg-muted/30">
                    <td colSpan={6} className="py-2 px-2 font-semibold text-sm uppercase tracking-wide text-muted-foreground">
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
                            disabled={!isAdmin || saving}
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
                        <span className="text-xs font-medium">{ROLE_LABELS[role]}</span>
                        <Switch
                          checked={localPermissions[role]?.[perm.key] ?? false}
                          onCheckedChange={(checked) => handleToggle(role, perm.key, checked)}
                          disabled={!isAdmin || saving}
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
              <li>Admin tem sempre todas as permissões ativas por padrão</li>
              <li>Freelancers só visualizam projetos/tarefas atribuídos e ganhos próprios</li>
              <li>As alterações são aplicadas imediatamente após guardar</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
