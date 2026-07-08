import { useState } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Plus, FileText, FileCode, Send, Eye, CheckCircle, Search, Filter, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useContracts, CONTRACT_STATUS_LABELS, type Contract, type ContractStatus } from '@/hooks/useContracts';
import { useContractTemplates, type ContractTemplate } from '@/hooks/useContractTemplates';
import { CreateContractModal } from '@/components/contracts/CreateContractModal';
import { CreateTemplateModal } from '@/components/contracts/CreateTemplateModal';
import { ContractCard } from '@/components/contracts/ContractCard';
import { ContractViewModal } from '@/components/contracts/ContractViewModal';
import { AccessDenied } from '@/components/ui/access-denied';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { PageHeader } from '@/components/layout/PageHeader';
import { toast } from 'sonner';

export default function Contratos() {
  const { canViewContracts } = useFinancialPermissions();
  const { contracts, loading, metrics, sendContract, cancelContract, deleteContract, refresh } = useContracts();

  // Block access for collaborators
  if (!canViewContracts) {
    return <AccessDenied description="Apenas administradores e editores podem aceder aos Contratos." />;
  }
  const { templates, loading: loadingTemplates, deleteTemplate, duplicateTemplate } = useContractTemplates();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'all'>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);

  // Filter contracts
  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = !searchQuery || 
      contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.client?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleViewContract = (contract: Contract) => {
    setSelectedContract(contract);
    setViewModalOpen(true);
  };

  const handleSendContract = async (contract: Contract) => {
    await sendContract(contract.id);
    refresh();
  };

  const handleCancelContract = async (contract: Contract) => {
    if (confirm('Tem a certeza que pretende cancelar este contrato?')) {
      await cancelContract(contract.id);
      refresh();
    }
  };

  const handleDeleteContract = async (contract: Contract) => {
    if (confirm('Tem a certeza que pretende eliminar este contrato? Esta ação é irreversível.')) {
      await deleteContract(contract.id);
    }
  };

  const handleEditTemplate = (template: ContractTemplate) => {
    setEditingTemplate(template);
    setTemplateModalOpen(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (confirm('Tem a certeza que pretende eliminar este template?')) {
      await deleteTemplate(templateId);
    }
  };

  const handleDuplicateTemplate = async (templateId: string) => {
    await duplicateTemplate(templateId);
    toast.success('Template duplicado com sucesso!');
  };

  return (
    <>
      <Helmet>
        <title>Contratos | WillFlow</title>
      </Helmet>

      <div className="p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold">Contratos</h1>
            <p className="text-muted-foreground">
              Gestão de contratos e assinaturas digitais
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              setEditingTemplate(null);
              setTemplateModalOpen(true);
            }}>
              <FileCode className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
            <Button className="gradient-primary" onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Contrato
            </Button>
          </div>
        </motion.div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Rascunhos', value: metrics.draft, icon: FileText, colorClass: 'text-muted-foreground' },
            { label: 'Enviados', value: metrics.sent, icon: Send, colorClass: 'text-blue-600' },
            { label: 'Visualizados', value: metrics.viewed, icon: Eye, colorClass: 'text-amber-600' },
            { label: 'Assinados', value: metrics.signed, icon: CheckCircle, colorClass: 'text-emerald-600' },
            { label: 'Valor Assinado', value: new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(metrics.totalValue), icon: null, colorClass: 'text-emerald-600', isValue: true },
          ].map((metric, i) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.35, ease: 'easeOut' }}
              className="p-4 rounded-xl bg-card/80 backdrop-blur-sm border hover:shadow-md transition-shadow"
            >
              {metric.icon ? (
                <div className={`flex items-center gap-2 ${metric.colorClass} mb-1`}>
                  <metric.icon className="h-4 w-4" />
                  <span className="text-sm">{metric.label}</span>
                </div>
              ) : (
                <div className="text-muted-foreground text-sm mb-1">{metric.label}</div>
              )}
              <p className={`text-2xl font-bold ${metric.isValue ? metric.colorClass : ''}`}>{metric.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="contracts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="contracts">
              <FileText className="h-4 w-4 mr-2" />
              Contratos ({contracts.length})
            </TabsTrigger>
            <TabsTrigger value="templates">
              <FileCode className="h-4 w-4 mr-2" />
              Templates ({templates.length})
            </TabsTrigger>
          </TabsList>

          {/* Contracts Tab */}
          <TabsContent value="contracts" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar contratos..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as ContractStatus | 'all')}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(CONTRACT_STATUS_LABELS).map(([value, { label }]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contracts List */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredContracts.length === 0 ? (
              searchQuery || statusFilter !== 'all' ? (
                <EmptyState
                  icon={FileText}
                  title="Nenhum contrato encontrado"
                  description="Tente ajustar os filtros de pesquisa."
                />
              ) : (
                <EmptyState
                  icon={FileText}
                  title="Sem contratos"
                  description="Crie o seu primeiro contrato para começar."
                  action={{
                    label: 'Novo Contrato',
                    icon: Plus,
                    onClick: () => setCreateModalOpen(true),
                  }}
                />
              )
            ) : (
              <div className="space-y-3">
                {filteredContracts.map(contract => (
                  <ContractCard
                    key={contract.id}
                    contract={contract}
                    onView={handleViewContract}
                    onSend={handleSendContract}
                    onCancel={handleCancelContract}
                    onDelete={handleDeleteContract}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            {loadingTemplates ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-40 w-full rounded-xl" />
                ))}
              </div>
            ) : templates.length === 0 ? (
              <EmptyState
                icon={FileCode}
                title="Sem templates"
                description="Crie templates reutilizáveis para acelerar a criação de contratos."
                action={{
                  label: 'Novo Template',
                  icon: Plus,
                  onClick: () => {
                    setEditingTemplate(null);
                    setTemplateModalOpen(true);
                  },
                }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(template => (
                  <div
                    key={template.id}
                    className="p-4 rounded-xl border bg-card/80 backdrop-blur-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium">{template.name}</h3>
                        {template.category && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {template.category}
                          </Badge>
                        )}
                      </div>
                      {template.is_default && (
                        <Badge className="bg-primary/20 text-primary">Padrão</Badge>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {template.description}
                      </p>
                    )}
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="outline" onClick={() => handleEditTemplate(template)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDuplicateTemplate(template.id)}>
                        Duplicar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-destructive"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <CreateContractModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={() => refresh()}
      />

      <CreateTemplateModal
        open={templateModalOpen}
        onOpenChange={(open) => {
          setTemplateModalOpen(open);
          if (!open) setEditingTemplate(null);
        }}
        editTemplate={editingTemplate}
      />

      <ContractViewModal
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
        contract={selectedContract}
        onSend={handleSendContract}
      />
    </>
  );
}
