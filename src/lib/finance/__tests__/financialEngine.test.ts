import { describe, it, expect } from 'vitest';
import {
  getMonthlyMetrics,
  getTimeSeries,
  getMonthlySummary,
  calculateChange,
} from '../financialEngine';
import type { FinancialProject, TeamPayment } from '../types';

// === Factories ===

function makeProject(overrides: Partial<FinancialProject> = {}): FinancialProject {
  return {
    id: 'p-1',
    agreed_value: 1000,
    custo_captacao: 100,
    custo_edicao: 200,
    custos_extras: 50,
    custos_extras_payment_status: null,
    custos_extras_paid_at: null,
    is_delivered: false,
    delivered_at: null,
    delivery_date: null,
    shoot_date: null,
    created_at: '2025-06-15T10:00:00Z',
    client_payment_status: null,
    client_paid_at: null,
    competence_month: null,
    ...overrides,
  };
}

function makeTeamPayment(overrides: Partial<TeamPayment> = {}): TeamPayment {
  return {
    id: 'tp-1',
    payment_amount: 300,
    payment_status: 'pending',
    paid_at: null,
    project_id: 'p-1',
    user_id: 'u-1',
    ...overrides,
  };
}

const JUN_2025 = new Date(2025, 5, 1); // June 2025
const JUL_2025 = new Date(2025, 6, 1); // July 2025
const MAY_2025 = new Date(2025, 4, 1); // May 2025

// === REALIZADO ===

describe('getMonthlyMetrics — REALIZADO', () => {
  it('counts delivered projects by competence_month', () => {
    const projects = [
      makeProject({ id: 'p1', is_delivered: true, competence_month: '2025-06', agreed_value: 1000 }),
      makeProject({ id: 'p2', is_delivered: true, competence_month: '2025-07', agreed_value: 2000 }),
      makeProject({ id: 'p3', is_delivered: false, competence_month: '2025-06', agreed_value: 500 }),
    ];

    const metrics = getMonthlyMetrics(projects, 'REALIZADO', JUN_2025);
    expect(metrics.revenue).toBe(1000);
    expect(metrics.projectCount).toBe(1);
  });

  it('falls back to delivered_at when competence_month is null', () => {
    const projects = [
      makeProject({ id: 'p1', is_delivered: true, delivered_at: '2025-06-20T10:00:00Z', agreed_value: 800 }),
    ];

    const metrics = getMonthlyMetrics(projects, 'REALIZADO', JUN_2025);
    expect(metrics.revenue).toBe(800);
    expect(metrics.projectCount).toBe(1);
  });

  it('returns zero for empty month', () => {
    const metrics = getMonthlyMetrics([], 'REALIZADO', JUN_2025);
    expect(metrics.revenue).toBe(0);
    expect(metrics.cost).toBe(0);
    expect(metrics.profit).toBe(0);
    expect(metrics.projectCount).toBe(0);
  });

  it('calculates cost as sum of custo_captacao + custo_edicao + custos_extras', () => {
    const projects = [
      makeProject({
        is_delivered: true,
        competence_month: '2025-06',
        custo_captacao: 100,
        custo_edicao: 200,
        custos_extras: 50,
        agreed_value: 1000,
      }),
    ];

    const metrics = getMonthlyMetrics(projects, 'REALIZADO', JUN_2025);
    expect(metrics.cost).toBe(350);
    expect(metrics.profit).toBe(650);
  });
});

// === PREVISAO ===

describe('getMonthlyMetrics — PREVISAO', () => {
  it('includes projects with anchor date (delivery_date) in month', () => {
    const projects = [
      makeProject({ id: 'p1', delivery_date: '2025-06-15', agreed_value: 1500 }),
    ];

    const metrics = getMonthlyMetrics(projects, 'PREVISAO', JUN_2025);
    expect(metrics.revenue).toBe(1500);
    expect(metrics.projectCount).toBe(1);
  });

  it('uses shoot_date as fallback anchor', () => {
    const projects = [
      makeProject({ id: 'p1', shoot_date: '2025-06-10', agreed_value: 900 }),
    ];

    const metrics = getMonthlyMetrics(projects, 'PREVISAO', JUN_2025);
    expect(metrics.revenue).toBe(900);
  });

  it('rolls over undelivered projects from past months', () => {
    const projects = [
      makeProject({
        id: 'p1',
        delivery_date: '2025-05-15', // May — before June
        is_delivered: false,
        agreed_value: 700,
      }),
    ];

    const metrics = getMonthlyMetrics(projects, 'PREVISAO', JUN_2025);
    expect(metrics.revenue).toBe(700);
    expect(metrics.breakdown?.rolloverRevenue).toBe(700);
    expect(metrics.breakdown?.rolloverCount).toBe(1);
  });

  it('does NOT roll over delivered projects', () => {
    const projects = [
      makeProject({
        id: 'p1',
        delivery_date: '2025-05-15',
        is_delivered: true,
        agreed_value: 700,
      }),
    ];

    const metrics = getMonthlyMetrics(projects, 'PREVISAO', JUN_2025);
    expect(metrics.revenue).toBe(0);
    expect(metrics.projectCount).toBe(0);
  });
});

// === CAIXA ===

describe('getMonthlyMetrics — CAIXA', () => {
  it('counts client income by client_paid_at', () => {
    const projects = [
      makeProject({ id: 'p1', client_paid_at: '2025-06-20T10:00:00Z', agreed_value: 2000 }),
      makeProject({ id: 'p2', client_paid_at: '2025-07-01T10:00:00Z', agreed_value: 500 }),
    ];

    const metrics = getMonthlyMetrics(projects, 'CAIXA', JUN_2025, []);
    expect(metrics.revenue).toBe(2000);
    expect(metrics.cashflow?.clientIncome).toBe(2000);
  });

  it('counts team expenses by paid_at', () => {
    const teamPayments = [
      makeTeamPayment({ id: 'tp1', paid_at: '2025-06-18T10:00:00Z', payment_amount: 400 }),
      makeTeamPayment({ id: 'tp2', paid_at: '2025-07-01T10:00:00Z', payment_amount: 200 }),
    ];

    const metrics = getMonthlyMetrics([], 'CAIXA', JUN_2025, teamPayments);
    expect(metrics.cashflow?.teamExpenses).toBe(400);
  });

  it('counts extras expenses by custos_extras_paid_at', () => {
    const projects = [
      makeProject({ id: 'p1', custos_extras_paid_at: '2025-06-25T10:00:00Z', custos_extras: 150 }),
    ];

    const metrics = getMonthlyMetrics(projects, 'CAIXA', JUN_2025, []);
    expect(metrics.cashflow?.extrasExpenses).toBe(150);
    expect(metrics.cost).toBe(150);
  });

  it('calculates profit as clientIncome - (teamExpenses + extrasExpenses)', () => {
    const projects = [
      makeProject({ id: 'p1', client_paid_at: '2025-06-10T10:00:00Z', agreed_value: 3000, custos_extras_paid_at: '2025-06-15T10:00:00Z', custos_extras: 200 }),
    ];
    const teamPayments = [
      makeTeamPayment({ paid_at: '2025-06-12T10:00:00Z', payment_amount: 500 }),
    ];

    const metrics = getMonthlyMetrics(projects, 'CAIXA', JUN_2025, teamPayments);
    expect(metrics.profit).toBe(3000 - 500 - 200);
  });
});

// === getMonthlySummary ===

describe('getMonthlySummary', () => {
  it('counts created projects in month', () => {
    const projects = [
      makeProject({ id: 'p1', created_at: '2025-06-05T10:00:00Z' }),
      makeProject({ id: 'p2', created_at: '2025-07-01T10:00:00Z' }),
    ];

    const summary = getMonthlySummary(projects, JUN_2025);
    expect(summary.created).toBe(1);
  });

  it('counts planned projects (anchor in month)', () => {
    const projects = [
      makeProject({ id: 'p1', delivery_date: '2025-06-20' }),
      makeProject({ id: 'p2', delivery_date: '2025-07-05' }),
    ];

    const summary = getMonthlySummary(projects, JUN_2025);
    expect(summary.planned).toBe(1);
  });

  it('counts delivered projects by competence', () => {
    const projects = [
      makeProject({ id: 'p1', is_delivered: true, competence_month: '2025-06' }),
      makeProject({ id: 'p2', is_delivered: true, competence_month: '2025-07' }),
    ];

    const summary = getMonthlySummary(projects, JUN_2025);
    expect(summary.delivered).toBe(1);
  });

  it('counts postponed projects (anchor in month, not delivered)', () => {
    const projects = [
      makeProject({ id: 'p1', delivery_date: '2025-06-15', is_delivered: false }),
    ];

    const summary = getMonthlySummary(projects, JUN_2025);
    expect(summary.postponed).toBe(1);
  });

  it('counts rescued projects (anchor before month, delivered in month)', () => {
    const projects = [
      makeProject({
        id: 'p1',
        delivery_date: '2025-05-10', // anchor in May
        is_delivered: true,
        competence_month: '2025-06', // delivered in June
      }),
    ];

    const summary = getMonthlySummary(projects, JUN_2025);
    expect(summary.rescued).toBe(1);
  });
});

// === getTimeSeries ===

describe('getTimeSeries', () => {
  it('returns correct number of months', () => {
    const series = getTimeSeries([], 'REALIZADO', MAY_2025, JUL_2025);
    expect(series).toHaveLength(3); // May, Jun, Jul
  });

  it('populates revenue/cost/profit per month', () => {
    const projects = [
      makeProject({ id: 'p1', is_delivered: true, competence_month: '2025-06', agreed_value: 1000, custo_captacao: 100, custo_edicao: 200, custos_extras: 0 }),
    ];

    const series = getTimeSeries(projects, 'REALIZADO', MAY_2025, JUL_2025);
    const jun = series.find(s => s.monthDate.getMonth() === 5);
    expect(jun?.revenue).toBe(1000);
    expect(jun?.cost).toBe(300);
    expect(jun?.profit).toBe(700);
  });
});

// === calculateChange ===

describe('calculateChange', () => {
  it('returns percentage change', () => {
    expect(calculateChange(120, 100)).toBe(20);
  });

  it('returns null when previous is zero', () => {
    expect(calculateChange(100, 0)).toBeNull();
  });

  it('handles negative changes', () => {
    expect(calculateChange(80, 100)).toBe(-20);
  });

  it('handles negative values', () => {
    expect(calculateChange(-50, -100)).toBe(50);
  });
});
