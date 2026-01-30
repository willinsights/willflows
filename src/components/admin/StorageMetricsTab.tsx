/**
 * StorageMetricsTab - Admin panel for monitoring workspace storage usage
 * Focuses on Studio plan workspaces with 10GB video storage
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  TrendingUp,
  Database,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAdminStorageMetrics, WorkspaceStorageMetrics } from '@/hooks/useAdminStorageMetrics';
import { cn } from '@/lib/utils';

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatGB = (bytes: number): string => {
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
};

export function StorageMetricsTab() {
  const { workspaces, overview, isLoading, refetch } = useAdminStorageMetrics();
  const [search, setSearch] = useState('');

  const filteredWorkspaces = workspaces.filter(
    ws =>
      ws.workspace_name.toLowerCase().includes(search.toLowerCase()) ||
      ws.workspace_slug.toLowerCase().includes(search.toLowerCase()) ||
      ws.owner_email?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (ws: WorkspaceStorageMetrics) => {
    if (ws.is_full) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Cheio
        </Badge>
      );
    }
    if (ws.is_near_limit) {
      return (
        <Badge variant="outline" className="border-warning text-warning gap-1">
          <AlertTriangle className="h-3 w-3" />
          Quase cheio
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-success text-success gap-1">
        <CheckCircle2 className="h-3 w-3" />
        OK
      </Badge>
    );
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return '[&>div]:bg-destructive';
    if (percent >= 80) return '[&>div]:bg-warning';
    return '';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
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
              <HardDrive className="h-5 w-5 text-primary" />
              Armazenamento de Vídeos
            </h3>
            <p className="text-sm text-muted-foreground">
              Monitorização do uso de storage por workspace (Plano Studio)
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Workspaces Studio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{overview.studioWorkspaces}</p>
              <p className="text-xs text-muted-foreground">
                {overview.workspacesWithStorage} a usar storage
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Uso Total
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{overview.totalUsedGB.toFixed(2)} GB</p>
              <p className="text-xs text-muted-foreground">
                de {overview.totalAllocatedGB.toFixed(0)} GB alocados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Perto do Limite
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-warning">{overview.workspacesNearLimit}</p>
              <p className="text-xs text-muted-foreground">
                +{overview.workspacesFull} cheios
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Com Add-ons
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">{overview.withAddons}</p>
              <p className="text-xs text-muted-foreground">storage extra</p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts for critical workspaces */}
        {(overview.workspacesFull > 0 || overview.workspacesNearLimit > 0) && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
                <div>
                  <p className="font-medium text-warning">Atenção ao armazenamento</p>
                  <p className="text-sm text-muted-foreground">
                    {overview.workspacesFull > 0 && (
                      <span className="text-destructive">
                        {overview.workspacesFull} workspace(s) com armazenamento cheio.{' '}
                      </span>
                    )}
                    {overview.workspacesNearLimit > 0 && (
                      <span>{overview.workspacesNearLimit} workspace(s) perto do limite (&gt;80%).</span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por workspace ou owner..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        {overview.studioWorkspaces === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <HardDrive className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                Nenhum workspace com plano Studio encontrado.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Uso</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead>Add-on</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkspaces.map(ws => (
                    <TableRow key={ws.workspace_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{ws.workspace_name}</p>
                          <p className="text-xs text-muted-foreground">/{ws.workspace_slug}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{ws.owner_name || '—'}</p>
                          <p className="text-xs text-muted-foreground">{ws.owner_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm font-mono">
                              {formatGB(ws.storage_used_bytes)} / {formatGB(ws.storage_limit_bytes)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {formatBytes(ws.storage_used_bytes)} de {formatBytes(ws.storage_limit_bytes)}
                            </p>
                            {ws.last_recalculated_at && (
                              <p className="text-xs text-muted-foreground">
                                Recalculado: {format(new Date(ws.last_recalculated_at), 'dd/MM HH:mm', { locale: pt })}
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 min-w-32">
                          <Progress
                            value={Math.min(ws.percent_used, 100)}
                            className={cn('h-2 flex-1', getProgressColor(ws.percent_used))}
                          />
                          <span className={cn(
                            'text-xs font-medium min-w-12 text-right',
                            ws.is_full && 'text-destructive',
                            ws.is_near_limit && !ws.is_full && 'text-warning'
                          )}>
                            {ws.percent_used.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {ws.addon_tier ? (
                          <Badge variant="secondary">{ws.addon_tier}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(ws)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
