export type FinancialViewMode = 'REALIZADO' | 'PREVISAO' | 'CAIXA';

export interface FinancialProject {
  id: string;
  agreed_value: number | null;
  custo_captacao: number | null;
  custo_edicao: number | null;
  custos_extras: number | null;
  custos_extras_payment_status: string | null;
  custos_extras_paid_at: string | null;
  is_delivered: boolean;
  delivered_at: string | null;
  delivery_date: string | null;
  shoot_date: string | null;
  created_at: string;
  client_payment_status: string | null;
  client_paid_at: string | null;
}

export interface TeamPayment {
  id: string;
  payment_amount: number | null;
  payment_status: string;
  paid_at: string | null;
  project_id: string;
  user_id: string | null;
}

export interface MonthlyMetrics {
  revenue: number;
  cost: number;
  profit: number;
  projectCount: number;
  // Breakdown for PREVISAO mode
  breakdown?: {
    plannedRevenue: number;
    rolloverRevenue: number;
    plannedCost: number;
    rolloverCost: number;
    rolloverCount: number;
  };
  // Breakdown for CAIXA mode
  cashflow?: {
    clientIncome: number;
    teamExpenses: number;
    extrasExpenses: number;
  };
}

export interface MonthlySummary {
  created: number;
  planned: number;
  delivered: number;
  postponed: number;
  rescued: number;
}

export interface TimeSeriesPoint {
  month: string;
  monthDate: Date;
  revenue: number;
  cost: number;
  profit: number;
}
