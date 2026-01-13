import { useState, useMemo } from 'react';
import { Filter, X, Calendar, User, Building2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

export interface KanbanFilterState {
  clientId: string | null;
  priority: string | null;
  assigneeId: string | null;
  dueDateRange: 'all' | 'overdue' | 'today' | 'this_week' | 'this_month';
  categoryId: string | null;
}

interface Client {
  id: string;
  name: string;
}

interface TeamMember {
  user_id: string;
  full_name: string | null;
  email: string;
}

interface Category {
  id: string;
  name: string;
}

interface KanbanFiltersProps {
  filters: KanbanFilterState;
  onFiltersChange: (filters: KanbanFilterState) => void;
  clients: Client[];
  teamMembers: TeamMember[];
  categories?: Category[];
}

const priorityOptions = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
];

const dueDateOptions = [
  { value: 'all', label: 'Todas as datas' },
  { value: 'overdue', label: 'Atrasados' },
  { value: 'today', label: 'Hoje' },
  { value: 'this_week', label: 'Esta semana' },
  { value: 'this_month', label: 'Este mês' },
];

export function KanbanFilters({
  filters,
  onFiltersChange,
  clients,
  teamMembers,
  categories = [],
}: KanbanFiltersProps) {
  const [open, setOpen] = useState(false);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.clientId) count++;
    if (filters.priority) count++;
    if (filters.assigneeId) count++;
    if (filters.dueDateRange !== 'all') count++;
    if (filters.categoryId) count++;
    return count;
  }, [filters]);

  const handleClearFilters = () => {
    onFiltersChange({
      clientId: null,
      priority: null,
      assigneeId: null,
      dueDateRange: 'all',
      categoryId: null,
    });
  };

  const updateFilter = (key: keyof KanbanFilterState, value: string | null) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 w-7 p-0 relative">
          <Filter className="h-3 w-3" />
          {activeFiltersCount > 0 && (
            <Badge 
              className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[9px]"
              variant="default"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Filtros</h4>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground"
                onClick={handleClearFilters}
              >
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          <Separator />

          {/* Client Filter */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Cliente
            </label>
            <Select
              value={filters.clientId || 'all'}
              onValueChange={(value) => updateFilter('clientId', value === 'all' ? null : value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos os clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority Filter */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Prioridade
            </label>
            <Select
              value={filters.priority || 'all'}
              onValueChange={(value) => updateFilter('priority', value === 'all' ? null : value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todas as prioridades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as prioridades</SelectItem>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignee Filter */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              Responsável
            </label>
            <Select
              value={filters.assigneeId || 'all'}
              onValueChange={(value) => updateFilter('assigneeId', value === 'all' ? null : value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos os membros" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os membros</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.full_name || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date Filter */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Data de Entrega
            </label>
            <Select
              value={filters.dueDateRange}
              onValueChange={(value) => updateFilter('dueDateRange', value as KanbanFilterState['dueDateRange'])}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todas as datas" />
              </SelectTrigger>
              <SelectContent>
                {dueDateOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter (if categories exist) */}
          {categories.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Categoria</label>
              <Select
                value={filters.categoryId || 'all'}
                onValueChange={(value) => updateFilter('categoryId', value === 'all' ? null : value)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
