import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import { cn } from '@/lib/utils';

export type DateFilterType = 'delivered_at' | 'created_at';

export interface FilterState {
  dateFrom: Date | null;
  dateTo: Date | null;
  clientId: string | null;
  memberId: string | null;
  status: string | null;
  projectStatus: string | null;
  dateFilterType: DateFilterType;
}

interface Client {
  id: string;
  name: string;
}

interface Member {
  user_id: string;
  full_name: string | null;
}

interface PaymentFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  clients?: Client[];
  members?: Member[];
  showClientFilter?: boolean;
  showMemberFilter?: boolean;
  showStatusFilter?: boolean;
  showDateFilter?: boolean;
  showProjectStatusFilter?: boolean;
  showDateFilterType?: boolean;
}

export function PaymentFilters({
  filters,
  onFilterChange,
  clients = [],
  members = [],
  showClientFilter = false,
  showMemberFilter = false,
  showStatusFilter = true,
  showDateFilter = true,
  showProjectStatusFilter = false,
  showDateFilterType = false,
}: PaymentFiltersProps) {
  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.clientId || filters.memberId || filters.status || filters.projectStatus;

  const handleClearFilters = () => {
    onFilterChange({
      ...filters,
      dateFrom: null,
      dateTo: null,
      clientId: null,
      memberId: null,
      status: null,
      projectStatus: null,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Date Filter Type Toggle */}
      {showDateFilterType && (
        <div className="flex items-center rounded-lg border border-border overflow-hidden h-9">
          <button
            onClick={() => onFilterChange({ ...filters, dateFilterType: 'delivered_at' })}
            className={cn(
              'px-3 h-full text-xs font-medium transition-colors',
              filters.dateFilterType === 'delivered_at'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:text-foreground'
            )}
          >
            Data Entrega
          </button>
          <button
            onClick={() => onFilterChange({ ...filters, dateFilterType: 'created_at' })}
            className={cn(
              'px-3 h-full text-xs font-medium transition-colors',
              filters.dateFilterType === 'created_at'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:text-foreground'
            )}
          >
            Data Criação
          </button>
        </div>
      )}

      {/* Date From */}
      {showDateFilter && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'justify-start text-left font-normal',
                !filters.dateFrom && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateFrom ? (
                format(filters.dateFrom, 'dd/MM/yyyy', { locale: pt })
              ) : (
                'Data início'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.dateFrom || undefined}
              onSelect={(date) => onFilterChange({ ...filters, dateFrom: date || null })}
              locale={pt}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Date To */}
      {showDateFilter && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'justify-start text-left font-normal',
                !filters.dateTo && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateTo ? (
                format(filters.dateTo, 'dd/MM/yyyy', { locale: pt })
              ) : (
                'Data fim'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.dateTo || undefined}
              onSelect={(date) => onFilterChange({ ...filters, dateTo: date || null })}
              locale={pt}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Client Filter */}
      {showClientFilter && clients.length > 0 && (
        <Select
          value={filters.clientId || 'all'}
          onValueChange={(value) => onFilterChange({ ...filters, clientId: value === 'all' ? null : value })}
        >
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos clientes</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Member Filter */}
      {showMemberFilter && members.length > 0 && (
        <Select
          value={filters.memberId || 'all'}
          onValueChange={(value) => onFilterChange({ ...filters, memberId: value === 'all' ? null : value })}
        >
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Colaborador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos colaboradores</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.user_id} value={member.user_id}>
                {member.full_name || 'Colaborador'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Status Filter */}
      {showStatusFilter && (
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => onFilterChange({ ...filters, status: value === 'all' ? null : value })}
        >
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      )}

      {/* Project Status Filter */}
      {showProjectStatusFilter && (
        <Select
          value={filters.projectStatus || 'all'}
          onValueChange={(value) => onFilterChange({ ...filters, projectStatus: value === 'all' ? null : value })}
        >
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Estado Projeto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos projetos</SelectItem>
            <SelectItem value="em_curso">Em Curso</SelectItem>
            <SelectItem value="entregue">Entregue</SelectItem>
          </SelectContent>
        </Select>
      )}

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
}
