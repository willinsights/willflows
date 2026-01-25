import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Target, 
  Euro, 
  TrendingUp, 
  Clock,
  AlertTriangle,
  Search,
  Filter,
  LayoutGrid,
  List,
  Trash2,
  CheckSquare,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useLeads, LEAD_STATUS_CONFIG, LEAD_SOURCES, type Lead, type LeadStatus } from '@/hooks/useLeads';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { LeadKanban } from '@/components/leads/LeadKanban';
import { CreateLeadModal } from '@/components/leads/CreateLeadModal';
import { ConvertLeadModal } from '@/components/leads/ConvertLeadModal';
import { MarkLostModal } from '@/components/leads/MarkLostModal';
import { DeleteLeadModal } from '@/components/leads/DeleteLeadModal';
import { ImportLeadsModal } from '@/components/leads/ImportLeadsModal';
import { ClientDetailsModal } from '@/components/clients/ClientDetailsModal';
import { cn } from '@/lib/utils';

export default function Leads() {
  const { leads, leadsByStatus, loading, pipelineMetrics, updateLeadStatus, deleteLead, deleteMultipleLeads, importLeads, refresh } = useLeads();
  const { currentWorkspace } = useWorkspace();
  
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [markLostLead, setMarkLostLead] = useState<Lead | null>(null);
  const [deleteLeadModal, setDeleteLeadModal] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  // Bulk selection state
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const currency = currentWorkspace?.currency || 'EUR';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(currentWorkspace?.locale || 'pt-PT', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Filter leads for list view
  const filteredLeads = useMemo(() => {
    let filtered = leads;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        l =>
          l.name.toLowerCase().includes(query) ||
          l.company?.toLowerCase().includes(query) ||
          l.email?.toLowerCase().includes(query)
      );
    }

    if (filterSource !== 'all') {
      filtered = filtered.filter(l => l.lead_source === filterSource);
    }

    return filtered;
  }, [leads, searchQuery, filterSource]);

  // Filter leadsByStatus for Kanban
  const filteredLeadsByStatus = useMemo(() => {
    if (!searchQuery.trim() && filterSource === 'all') {
      return leadsByStatus;
    }

    const result: Record<LeadStatus, Lead[]> = {
      novo: [],
      contactado: [],
      qualificado: [],
      proposta: [],
      negociacao: [],
      ganho: [],
      perdido: [],
    };

    filteredLeads.forEach(lead => {
      const status = (lead.lead_status || 'novo') as LeadStatus;
      if (result[status]) {
        result[status].push(lead);
      }
    });

    return result;
  }, [leadsByStatus, filteredLeads, searchQuery, filterSource]);

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    await updateLeadStatus(leadId, newStatus);
  };

  const handleContact = (lead: Lead) => {
    // Open client details for now
    setSelectedLead(lead);
  };

  const handleScheduleFollowUp = (lead: Lead) => {
    // Could open a date picker modal
    setSelectedLead(lead);
  };

  const handleDeleteLead = async () => {
    if (!deleteLeadModal) return;
    await deleteLead(deleteLeadModal.id);
  };

  // Bulk selection handlers
  const handleToggleSelect = (leadId: string) => {
    setSelectedLeadIds(prev =>
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  const handleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    }
  };

  const handleBulkDelete = async () => {
    await deleteMultipleLeads(selectedLeadIds);
    setSelectedLeadIds([]);
    setShowBulkDeleteModal(false);
  };

  const selectedLeadsForBulk = useMemo(() => 
    leads.filter(l => selectedLeadIds.includes(l.id)),
    [leads, selectedLeadIds]
  );

  // Clear selection when switching views
  const handleViewChange = (v: 'kanban' | 'list') => {
    setSelectedLeadIds([]);
    setView(v);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Leads
          </h1>
          <p className="text-muted-foreground">Pipeline de captação e qualificação</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
          <Button className="gradient-primary" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Lead
          </Button>
        </div>
      </div>
      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Leads</p>
              <Target className="h-5 w-5 text-primary" />
            </div>
            <p className="text-2xl font-bold">{pipelineMetrics.totalLeads}</p>
            <p className="text-xs text-muted-foreground mt-1">No pipeline ativo</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Valor Total</p>
              <Euro className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(pipelineMetrics.totalValue)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Estimado no pipeline</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Com Follow-up</p>
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{pipelineMetrics.leadsWithFollowUp}</p>
            <p className="text-xs text-muted-foreground mt-1">Agendados</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Atrasados</p>
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <p className={cn(
              "text-2xl font-bold",
              pipelineMetrics.overdueFollowUps > 0 && "text-destructive"
            )}>
              {pipelineMetrics.overdueFollowUps}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Follow-ups atrasados</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar lead..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {LEAD_SOURCES.map(source => (
              <SelectItem key={source.value} value={source.value}>
                {source.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Tabs value={view} onValueChange={(v) => handleViewChange(v as 'kanban' | 'list')} className="ml-auto">
          <TabsList>
            <TabsTrigger value="kanban" className="gap-1.5">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Kanban</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Lista</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Bulk Action Bar */}
      {view === 'list' && selectedLeadIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20"
        >
          <div className="flex items-center gap-3">
            <CheckSquare className="h-5 w-5 text-primary" />
            <span className="font-medium">
              {selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? 's' : ''} selecionado{selectedLeadIds.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedLeadIds([])}
            >
              Limpar seleção
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteModal(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar {selectedLeadIds.length}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Content */}
      {view === 'kanban' ? (
        <LeadKanban
          leadsByStatus={filteredLeadsByStatus}
          onStatusChange={handleStatusChange}
          onEdit={setSelectedLead}
          onContact={handleContact}
          onScheduleFollowUp={handleScheduleFollowUp}
          onConvert={setConvertLead}
          onMarkLost={setMarkLostLead}
          onDelete={setDeleteLeadModal}
          formatCurrency={formatCurrency}
        />
      ) : (
        <Card className="glass-card">
          <CardContent className="p-4">
            {filteredLeads.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Target className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Nenhum lead encontrado</h3>
                <p className="text-muted-foreground max-w-sm mb-4">
                  {searchQuery ? 'Tente ajustar sua pesquisa.' : 'Comece adicionando seu primeiro lead.'}
                </p>
                {!searchQuery && (
                  <Button className="gradient-primary" onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Lead
                  </Button>
                )}
              </motion.div>
            ) : (
              <div className="space-y-2">
                {/* Select All Header */}
                <div className="flex items-center gap-3 px-4 py-2 border-b">
                  <Checkbox
                    checked={selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0}
                    onCheckedChange={handleSelectAll}
                    aria-label="Selecionar todos"
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedLeadIds.length === filteredLeads.length 
                      ? 'Desmarcar todos' 
                      : `Selecionar todos (${filteredLeads.length})`}
                  </span>
                </div>
                
                {filteredLeads.map((lead, index) => {
                  const statusConfig = LEAD_STATUS_CONFIG[lead.lead_status || 'novo'];
                  const sourceLabel = LEAD_SOURCES.find(s => s.value === lead.lead_source)?.label;
                  const isSelected = selectedLeadIds.includes(lead.id);

                  return (
                    <motion.div
                      key={lead.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border bg-card/50 hover:bg-card hover:shadow-md transition-all cursor-pointer",
                        isSelected && "bg-primary/5 border-primary/30"
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleSelect(lead.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Selecionar ${lead.name}`}
                      />
                      
                      <div 
                        className="flex items-center gap-4 flex-1 min-w-0"
                        onClick={() => setSelectedLead(lead)}
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-lg font-bold text-primary">
                            {lead.name.charAt(0).toUpperCase()}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium truncate">{lead.name}</h4>
                            <Badge
                              variant="secondary"
                              className={cn('text-xs', statusConfig.color)}
                            >
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {lead.company || lead.email || 'Sem detalhes'}
                          </p>
                        </div>

                        <div className="hidden sm:flex items-center gap-4">
                          {sourceLabel && (
                            <Badge variant="outline" className="text-xs">
                              {sourceLabel}
                            </Badge>
                          )}
                          {lead.estimated_value && lead.estimated_value > 0 && (
                            <span className="text-sm font-medium text-emerald-600">
                              {formatCurrency(lead.estimated_value)}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <CreateLeadModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={refresh}
      />

      <ImportLeadsModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        existingLeads={leads}
        onImport={importLeads}
      />

      <ConvertLeadModal
        open={!!convertLead}
        onOpenChange={(open) => !open && setConvertLead(null)}
        lead={convertLead}
        onSuccess={refresh}
      />

      <MarkLostModal
        open={!!markLostLead}
        onOpenChange={(open) => !open && setMarkLostLead(null)}
        lead={markLostLead}
        onSuccess={refresh}
      />

      <DeleteLeadModal
        open={!!deleteLeadModal}
        onOpenChange={(open) => !open && setDeleteLeadModal(null)}
        lead={deleteLeadModal}
        onConfirm={handleDeleteLead}
      />

      {/* Bulk Delete Modal */}
      <DeleteLeadModal
        open={showBulkDeleteModal}
        onOpenChange={setShowBulkDeleteModal}
        leads={selectedLeadsForBulk}
        onConfirm={handleBulkDelete}
      />

      {selectedLead && (
        <ClientDetailsModal
          open={!!selectedLead}
          onOpenChange={(open) => !open && setSelectedLead(null)}
          client={selectedLead}
          projects={[]}
          onClientUpdate={async () => { refresh(); }}
        />
      )}
    </div>
  );
}
