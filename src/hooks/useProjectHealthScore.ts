import { useMemo } from 'react';

export interface HealthScoreInput {
  // Timing
  delivery_date?: string | null;
  shoot_date?: string | null;
  is_delivered?: boolean;
  delivered_at?: string | null;
  created_at?: string;

  // Financial
  agreed_value?: number | null;
  custo_captacao?: number | null;
  custo_edicao?: number | null;
  custos_extras?: number | null;
  estimated_costs?: number | null;

  // Payment
  client_payment_status?: string | null;
  client_payment_due_date?: string | null;
  custos_extras_payment_status?: string | null;

  // Invoices (optional aggregated data)
  invoices_total?: number;
  invoices_paid?: number;
  invoices_overdue?: number;

  // Team payments
  team_payments_pending?: number;
  team_payments_total?: number;
}

export type HealthLevel = 'excellent' | 'good' | 'warning' | 'critical';

export interface HealthScoreResult {
  score: number; // 0-100
  level: HealthLevel;
  label: string;
  factors: HealthFactor[];
}

export interface HealthFactor {
  key: string;
  label: string;
  impact: number; // negative = penalty
  description: string;
}

function getHealthLevel(score: number): HealthLevel {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'warning';
  return 'critical';
}

function getHealthLabel(level: HealthLevel): string {
  switch (level) {
    case 'excellent': return 'Excelente';
    case 'good': return 'Bom';
    case 'warning': return 'Atenção';
    case 'critical': return 'Crítico';
  }
}

export function calculateHealthScore(input: HealthScoreInput): HealthScoreResult {
  let score = 100;
  const factors: HealthFactor[] = [];
  const now = new Date();

  // 1. DELIVERY TIMING (max -30 pts)
  if (!input.is_delivered && input.delivery_date) {
    const delivery = new Date(input.delivery_date);
    const daysOverdue = Math.floor((now.getTime() - delivery.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysOverdue > 0) {
      const penalty = Math.min(30, daysOverdue * 3);
      score -= penalty;
      factors.push({
        key: 'delivery_overdue',
        label: 'Entrega atrasada',
        impact: -penalty,
        description: `${daysOverdue} dia(s) de atraso`,
      });
    } else if (daysOverdue > -3) {
      // Within 3 days of deadline
      score -= 5;
      factors.push({
        key: 'delivery_near',
        label: 'Entrega próxima',
        impact: -5,
        description: `Entrega em ${Math.abs(daysOverdue)} dia(s)`,
      });
    }
  }

  // 2. PROFIT MARGIN (max -25 pts)
  const agreedValue = input.agreed_value || 0;
  const totalCost = (input.custo_captacao || 0) + (input.custo_edicao || 0) + (input.custos_extras || 0);
  
  if (agreedValue > 0) {
    const margin = ((agreedValue - totalCost) / agreedValue) * 100;
    
    if (margin < 0) {
      score -= 25;
      factors.push({
        key: 'negative_margin',
        label: 'Margem negativa',
        impact: -25,
        description: `Margem de ${margin.toFixed(0)}%`,
      });
    } else if (margin < 15) {
      const penalty = Math.round((15 - margin) * 1.2);
      score -= penalty;
      factors.push({
        key: 'low_margin',
        label: 'Margem baixa',
        impact: -penalty,
        description: `Margem de ${margin.toFixed(0)}%`,
      });
    }
  } else if (!input.is_delivered) {
    // No value set for active project
    score -= 10;
    factors.push({
      key: 'no_value',
      label: 'Sem valor definido',
      impact: -10,
      description: 'Preço do cliente não definido',
    });
  }

  // 3. CLIENT PAYMENT (max -20 pts)
  if (input.client_payment_due_date) {
    const dueDate = new Date(input.client_payment_due_date);
    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (input.client_payment_status !== 'pago' && daysOverdue > 0) {
      const penalty = Math.min(20, 10 + daysOverdue);
      score -= penalty;
      factors.push({
        key: 'payment_overdue',
        label: 'Pagamento em atraso',
        impact: -penalty,
        description: `${daysOverdue} dia(s) de atraso no pagamento`,
      });
    }
  }

  // 4. INVOICES (max -15 pts)
  if (input.invoices_overdue && input.invoices_overdue > 0) {
    const penalty = Math.min(15, input.invoices_overdue * 5);
    score -= penalty;
    factors.push({
      key: 'invoices_overdue',
      label: 'Faturas vencidas',
      impact: -penalty,
      description: `${input.invoices_overdue} fatura(s) vencida(s)`,
    });
  }

  // 5. TEAM PAYMENTS (max -10 pts)
  if (input.is_delivered && input.team_payments_total && input.team_payments_total > 0) {
    const pendingRatio = (input.team_payments_pending || 0) / input.team_payments_total;
    if (pendingRatio > 0.5) {
      const penalty = Math.round(pendingRatio * 10);
      score -= penalty;
      factors.push({
        key: 'team_unpaid',
        label: 'Equipa por pagar',
        impact: -penalty,
        description: `${Math.round(pendingRatio * 100)}% dos pagamentos pendentes`,
      });
    }
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));
  const level = getHealthLevel(score);

  return {
    score,
    level,
    label: getHealthLabel(level),
    factors: factors.sort((a, b) => a.impact - b.impact),
  };
}

export function useProjectHealthScore(input: HealthScoreInput | null): HealthScoreResult | null {
  return useMemo(() => {
    if (!input) return null;
    return calculateHealthScore(input);
  }, [
    input?.delivery_date,
    input?.is_delivered,
    input?.agreed_value,
    input?.custo_captacao,
    input?.custo_edicao,
    input?.custos_extras,
    input?.client_payment_status,
    input?.client_payment_due_date,
    input?.invoices_overdue,
    input?.team_payments_pending,
    input?.team_payments_total,
  ]);
}
