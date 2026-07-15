export type FinanceTab =
  | 'visao'
  | 'fechos'
  | 'movimentos'
  | 'colaboradores'
  | 'relatorios';

export const FINANCE_TABS: Array<{ id: FinanceTab; label: string; enabled: boolean }> = [
  { id: 'visao',         label: 'Visão',         enabled: true  },
  { id: 'fechos',        label: 'Fechos',        enabled: true  },
  { id: 'movimentos',    label: 'Movimentos',    enabled: true  },
  { id: 'colaboradores', label: 'Colaboradores', enabled: true  },
  { id: 'relatorios',    label: 'Relatórios',    enabled: true  },
];
