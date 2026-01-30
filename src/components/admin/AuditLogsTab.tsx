/**
 * AuditLogsTab - Visualization of admin audit logs
 * Shows critical actions performed by super admins
 */

import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Shield,
  Search,
  RefreshCw,
  User,
  Building2,
  CreditCard,
  UserX,
  UserCheck,
  Settings,
  FileText,
  Trash2,
  Clock,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAdminAudit, AuditLogEntry } from '@/hooks/useAdminAudit';
import { cn } from '@/lib/utils';

// Action type to icon mapping
const ACTION_ICONS: Record<string, typeof Shield> = {
  block_workspace: UserX,
  unblock_workspace: UserCheck,
  block_user: UserX,
  unblock_user: UserCheck,
  reset_billing: CreditCard,
  reset_billing_data: CreditCard,
  delete_user: Trash2,
  update_plan: CreditCard,
  create_invite: FileText,
  delete_invite: Trash2,
  update_settings: Settings,
};

// Action type to color mapping
const ACTION_COLORS: Record<string, string> = {
  block_workspace: 'text-destructive',
  unblock_workspace: 'text-success',
  block_user: 'text-destructive',
  unblock_user: 'text-success',
  reset_billing: 'text-warning',
  reset_billing_data: 'text-warning',
  delete_user: 'text-destructive',
  update_plan: 'text-primary',
  create_invite: 'text-success',
  delete_invite: 'text-destructive',
  update_settings: 'text-muted-foreground',
};

// Action labels
const ACTION_LABELS: Record<string, string> = {
  block_workspace: 'Bloqueou workspace',
  unblock_workspace: 'Desbloqueou workspace',
  block_user: 'Bloqueou utilizador',
  unblock_user: 'Desbloqueou utilizador',
  reset_billing: 'Reset billing',
  reset_billing_data: 'Reset dados de billing',
  delete_user: 'Eliminou utilizador',
  update_plan: 'Atualizou plano',
  create_invite: 'Criou convite',
  delete_invite: 'Eliminou convite',
  update_settings: 'Atualizou configurações',
};

// Target type icons
const TARGET_ICONS: Record<string, typeof Shield> = {
  workspace: Building2,
  user: User,
  subscription: CreditCard,
  invite: FileText,
  settings: Settings,
};

export function AuditLogsTab() {
  const { auditLogs, isLoading } = useAdminAudit();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  // Get unique actions for filter
  const uniqueActions = [...new Set(auditLogs.map(log => log.action))];

  // Filter logs
  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.target_type.toLowerCase().includes(search.toLowerCase()) ||
      log.target_id.toLowerCase().includes(search.toLowerCase()) ||
      log.admin_profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.admin_profile?.email.toLowerCase().includes(search.toLowerCase());

    const matchesAction = actionFilter === 'all' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const getActionIcon = (action: string) => {
    const Icon = ACTION_ICONS[action] || Shield;
    return Icon;
  };

  const getActionColor = (action: string) => {
    return ACTION_COLORS[action] || 'text-muted-foreground';
  };

  const getActionLabel = (action: string) => {
    return ACTION_LABELS[action] || action.replace(/_/g, ' ');
  };

  const getTargetIcon = (targetType: string) => {
    const Icon = TARGET_ICONS[targetType] || Shield;
    return Icon;
  };

  const formatDetails = (details: Record<string, unknown> | null): string => {
    if (!details) return '';
    return Object.entries(details)
      .filter(([_, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Audit Logs
            </h3>
            <p className="text-sm text-muted-foreground">
              Registo de ações administrativas críticas
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Últimas 100 ações</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por ação, admin ou target..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              {uniqueActions.map(action => (
                <SelectItem key={action} value={action}>
                  {getActionLabel(action)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{filteredLogs.length} registos</span>
          {actionFilter !== 'all' && (
            <>
              <span>•</span>
              <span>Filtrado: {getActionLabel(actionFilter)}</span>
            </>
          )}
        </div>

        {/* Logs List */}
        {filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {search || actionFilter !== 'all'
                  ? 'Nenhum registo encontrado com esses filtros.'
                  : 'Nenhuma ação administrativa registada.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <div className="divide-y">
                  {filteredLogs.map(log => {
                    const ActionIcon = getActionIcon(log.action);
                    const TargetIcon = getTargetIcon(log.target_type);
                    const actionColor = getActionColor(log.action);

                    return (
                      <div
                        key={log.id}
                        className="p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div
                            className={cn(
                              'p-2 rounded-lg bg-muted/50 flex-shrink-0',
                              actionColor
                            )}
                          >
                            <ActionIcon className="h-4 w-4" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn('font-medium', actionColor)}>
                                {getActionLabel(log.action)}
                              </span>
                              <Badge variant="outline" className="gap-1">
                                <TargetIcon className="h-3 w-3" />
                                {log.target_type}
                              </Badge>
                            </div>

                            <div className="mt-1 text-sm text-muted-foreground">
                              <span>Por: </span>
                              <span className="font-medium text-foreground">
                                {log.admin_profile?.full_name || log.admin_profile?.email || 'Admin'}
                              </span>
                            </div>

                            <div className="mt-1 text-xs text-muted-foreground font-mono">
                              Target ID: {log.target_id.slice(0, 8)}...
                            </div>

                            {log.details && Object.keys(log.details).length > 0 && (
                              <div className="mt-2 p-2 rounded bg-muted/50 text-xs font-mono">
                                {formatDetails(log.details)}
                              </div>
                            )}
                          </div>

                          {/* Timestamp */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-xs text-muted-foreground text-right flex-shrink-0">
                                {formatDistanceToNow(new Date(log.created_at), {
                                  addSuffix: true,
                                  locale: pt,
                                })}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {format(new Date(log.created_at), "dd MMM yyyy 'às' HH:mm:ss", {
                                locale: pt,
                              })}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
