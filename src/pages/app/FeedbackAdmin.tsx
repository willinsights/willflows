import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquarePlus, 
  Bug, 
  Lightbulb, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Eye,
  Trash2,
  RefreshCw,
  Search,
  ExternalLink,
  Image as ImageIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useFeedbackAdmin, Feedback, FeedbackStatus } from '@/hooks/useFeedbackAdmin';
import { cn } from '@/lib/utils';

const statusConfig: Record<FeedbackStatus, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: 'Pendente', icon: Clock, color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  reviewed: { label: 'Em Análise', icon: Eye, color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  resolved: { label: 'Resolvido', icon: CheckCircle2, color: 'bg-green-500/10 text-green-600 border-green-200' },
  dismissed: { label: 'Dispensado', icon: XCircle, color: 'bg-muted text-muted-foreground border-muted' },
};

export default function FeedbackAdmin() {
  const { 
    feedback, 
    stats, 
    isLoading, 
    filters, 
    setFilters, 
    refetch,
    updateStatus,
    deleteFeedback,
    isUpdating,
    isDeleting,
  } = useFeedbackAdmin();

  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [screenshotOpen, setScreenshotOpen] = useState(false);

  const handleStatusChange = async (id: string, newStatus: FeedbackStatus) => {
    await updateStatus(id, newStatus);
    if (selectedFeedback?.id === id) {
      setSelectedFeedback({ ...selectedFeedback, status: newStatus });
    }
  };

  const handleDelete = async (id: string) => {
    await deleteFeedback(id);
    setDetailsOpen(false);
    setSelectedFeedback(null);
  };

  const openDetails = (fb: Feedback) => {
    setSelectedFeedback(fb);
    setDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3">
          <MessageSquarePlus className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gestão de Feedback</h1>
            <p className="text-muted-foreground">Visualize e gira o feedback dos utilizadores</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Atualizar
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Em Análise</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{stats.reviewed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Resolvidos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por título ou descrição..."
                className="pl-10"
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                aria-label="Pesquisar feedback por título ou descrição"
              />
            </div>
            <Select 
              value={filters.type || 'all'} 
              onValueChange={(value) => setFilters({ ...filters, type: value as any })}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="bug">🐛 Bugs</SelectItem>
                <SelectItem value="improvement">💡 Sugestões</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={filters.status || 'all'} 
              onValueChange={(value) => setFilters({ ...filters, status: value as any })}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estados</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="reviewed">Em Análise</SelectItem>
                <SelectItem value="resolved">Resolvido</SelectItem>
                <SelectItem value="dismissed">Dispensado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Tipo</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead className="hidden md:table-cell">Autor</TableHead>
                  <TableHead className="w-[140px]">Estado</TableHead>
                  <TableHead className="hidden sm:table-cell w-[120px]">Data</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      A carregar feedback...
                    </TableCell>
                  </TableRow>
                ) : feedback.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum feedback encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  feedback.map((fb) => {
                    const statusInfo = statusConfig[fb.status];
                    return (
                      <TableRow key={fb.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetails(fb)}>
                        <TableCell>
                          {fb.type === 'bug' ? (
                            <span className="flex items-center gap-1 text-red-600">
                              <Bug className="h-4 w-4" />
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-amber-600">
                              <Lightbulb className="h-4 w-4" />
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[200px] md:max-w-[300px]">{fb.title}</span>
                            {fb.screenshot_url && (
                              <ImageIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="text-sm">
                            <div className="font-medium">{fb.user_name || 'N/A'}</div>
                            <div className="text-muted-foreground text-xs">{fb.user_email}</div>
                          </div>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={fb.status}
                            onValueChange={(value) => handleStatusChange(fb.id, value as FeedbackStatus)}
                            disabled={isUpdating}
                          >
                            <SelectTrigger className={cn("h-8 text-xs", statusInfo.color)}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(statusConfig).map(([key, config]) => (
                                <SelectItem key={key} value={key}>
                                  <span className="flex items-center gap-2">
                                    <config.icon className="h-3 w-3" />
                                    {config.label}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                          {format(new Date(fb.created_at), 'dd/MM/yy', { locale: pt })}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetails(fb)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedFeedback?.type === 'bug' ? (
                <Bug className="h-5 w-5 text-red-600" />
              ) : (
                <Lightbulb className="h-5 w-5 text-amber-600" />
              )}
              Detalhes do Feedback
            </DialogTitle>
          </DialogHeader>
          
          {selectedFeedback && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {/* Status */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Estado</label>
                  <Select
                    value={selectedFeedback.status}
                    onValueChange={(value) => handleStatusChange(selectedFeedback.id, value as FeedbackStatus)}
                    disabled={isUpdating}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <config.icon className="h-4 w-4" />
                            {config.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Title */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Título</label>
                  <p className="mt-1 text-foreground">{selectedFeedback.title}</p>
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                  <p className="mt-1 text-foreground whitespace-pre-wrap">{selectedFeedback.description}</p>
                </div>

                {/* Screenshot */}
                {selectedFeedback.screenshot_url && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Screenshot</label>
                    <button
                      type="button"
                      className="mt-2 block w-full rounded-lg overflow-hidden border hover:opacity-90 transition-opacity"
                      onClick={() => setScreenshotOpen(true)}
                    >
                      <img 
                        src={selectedFeedback.screenshot_url} 
                        alt="Screenshot do feedback"
                        className="w-full h-auto max-h-[200px] object-cover"
                      />
                    </button>
                  </div>
                )}

                {/* Technical Info */}
                <div className="pt-4 border-t">
                  <label className="text-sm font-medium text-muted-foreground">Informação Técnica</label>
                  <div className="mt-2 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Utilizador</span>
                      <span>{selectedFeedback.user_name || selectedFeedback.user_email}</span>
                    </div>
                    {selectedFeedback.workspace_name && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Workspace</span>
                        <span>{selectedFeedback.workspace_name}</span>
                      </div>
                    )}
                    {selectedFeedback.page_url && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Página</span>
                        <a 
                          href={selectedFeedback.page_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          {new URL(selectedFeedback.page_url).pathname}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data</span>
                      <span>{format(new Date(selectedFeedback.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}</span>
                    </div>
                    {selectedFeedback.user_agent && (
                      <div>
                        <span className="text-muted-foreground">User Agent</span>
                        <p className="text-xs mt-1 text-muted-foreground break-all">{selectedFeedback.user_agent}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="border-t pt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eliminar feedback?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser revertida. O feedback será permanentemente eliminado.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => selectedFeedback && handleDelete(selectedFeedback.id)}>
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Screenshot Fullscreen Modal */}
      <Dialog open={screenshotOpen} onOpenChange={setScreenshotOpen}>
        <DialogContent className="max-w-4xl p-0">
          {selectedFeedback?.screenshot_url && (
            <img 
              src={selectedFeedback.screenshot_url} 
              alt="Screenshot do feedback"
              className="w-full h-auto"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
