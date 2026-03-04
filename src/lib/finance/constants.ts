/**
 * Centralized financial constants — single source of truth.
 * Import these instead of redefining locally in each component.
 */

export const paymentStatusLabels: Record<string, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  vencido: 'Vencido',
  cancelado: 'Cancelado',
};

export const paymentStatusColors: Record<string, string> = {
  pendente: 'bg-warning/10 text-warning border-warning/20',
  pago: 'bg-success/10 text-success border-success/20',
  vencido: 'bg-destructive/10 text-destructive border-destructive/20',
  cancelado: 'bg-muted text-muted-foreground',
};

export const phaseLabels: Record<string, string> = {
  captacao: 'Captação',
  edicao: 'Edição',
};

export const projectStateLabels: Record<string, string> = {
  delivered: 'Entregue',
  inProgress: 'Em Curso',
};
