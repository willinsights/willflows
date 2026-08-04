import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { ClipboardList, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import {
  useWorkLogs,
  WORK_LOG_STATUS_LABELS,
  WORK_LOG_TYPE_LABELS,
  type WorkLog,
} from '@/hooks/useWorkLogs';
import { WorkLogModal } from '@/components/worklogs/WorkLogModal';
import { toast } from 'sonner';

const ALL = '__all__';

export default function Trabalhos() {
  useDocumentTitle('Registo de Trabalhos');
  const { workLogs, isLoading, deleteWorkLog } = useWorkLogs();
  const { members } = useWorkspaceMembers();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WorkLog | null>(null);
  const [monthFilter, setMonthFilter] = useState<string>(ALL);
  const [assigneeFilter, setAssigneeFilter] = useState<string>(ALL);
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);

  const memberName = (userId: string | null) => {
    if (!userId) return '—';
    const m = members.find((mm) => mm.user_id === userId);
    return m?.full_name || m?.email || '—';
  };

  const months = useMemo(() => {
    const set = new Set(workLogs.map((l) => l.requested_at.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [workLogs]);

  const filtered = useMemo(
    () =>
      workLogs.filter((l) => {
        if (monthFilter !== ALL && l.requested_at.slice(0, 7) !== monthFilter) return false;
        if (assigneeFilter !== ALL && l.assignee_id !== assigneeFilter) return false;
        if (typeFilter !== ALL && l.work_type !== typeFilter) return false;
        if (statusFilter !== ALL && l.status !== statusFilter) return false;
        return true;
      }),
    [workLogs, monthFilter, assigneeFilter, typeFilter, statusFilter],
  );

  const handleDelete = async (id: string) => {
    try {
      await deleteWorkLog.mutateAsync(id);
      toast.success('Registo removido');
    } catch (e) {
      toast.error('Não foi possível remover o registo');
    }
  };

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (log: WorkLog) => {
    setEditing(log);
    setModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Registo de Trabalhos"
        description="Regista trabalhos pedidos fora dos cards (edições urgentes, fotos, sessões) para saíram no relatório mensal por colaborador."
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Registar trabalho
          </Button>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os meses</SelectItem>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {format(parseISO(`${m}-01`), 'MMMM yyyy', { locale: pt })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger><SelectValue placeholder="Colaborador" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os colaboradores</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.user_id} value={m.user_id}>
                  {m.full_name || m.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os tipos</SelectItem>
              {Object.entries(WORK_LOG_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os estados</SelectItem>
              {Object.entries(WORK_LOG_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Sem trabalhos registados"
          description="Regista aqui os pedidos avulsos (edição urgente, edição de foto, sessão no estúdio) para ficarem no relatório mensal."
          action={{ label: 'Registar trabalho', onClick: openCreate, icon: Plus }}
        />
      ) : (
        <>
          {/* Desktop table */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="hidden md:block rounded-lg border overflow-hidden"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Trabalho</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(parseISO(log.requested_at), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{log.title}</span>
                        {log.is_urgent && (
                          <Badge variant="destructive" className="gap-1 text-[10px]">
                            <AlertTriangle className="h-3 w-3" />
                            Urgente
                          </Badge>
                        )}
                      </div>
                      {log.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {log.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{WORK_LOG_TYPE_LABELS[log.work_type]}</TableCell>
                    <TableCell>{memberName(log.assignee_id)}</TableCell>
                    <TableCell>
                      <Badge variant={log.status === 'concluido' ? 'default' : 'secondary'}>
                        {WORK_LOG_STATUS_LABELS[log.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {log.amount != null ? `${Number(log.amount).toFixed(2)} €` : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(log)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(log.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </motion.div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((log) => (
              <Card key={log.id} className="glass-card">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{log.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(log.requested_at), 'dd/MM/yyyy')} ·{' '}
                        {WORK_LOG_TYPE_LABELS[log.work_type]}
                      </p>
                    </div>
                    <Badge variant={log.status === 'concluido' ? 'default' : 'secondary'}>
                      {WORK_LOG_STATUS_LABELS[log.status]}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{memberName(log.assignee_id)}</span>
                    <span>{log.amount != null ? `${Number(log.amount).toFixed(2)} €` : '—'}</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => openEdit(log)}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-destructive"
                      onClick={() => handleDelete(log.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <WorkLogModal open={modalOpen} onOpenChange={setModalOpen} editing={editing} />
    </div>
  );
}
