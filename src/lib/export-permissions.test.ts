import { describe, expect, it } from 'vitest';
import { columnPermissions, isReportType, redactRows, requiredPermission } from '../../supabase/functions/_shared/export-permissions.ts';

// Fictitious rows only.
const project = { id: 'p1', nome: 'Projeto Demo', valor: 1200, cliente: 'Cliente Demo' };
const client = { id: 'c1', nome: 'Cliente Demo', email: 'demo@example.test', telefone: '000', nif: '999999990', cidade: 'Lisboa', valor_estimado: 500, lead_status: 'novo' };

describe('S14 — permissões das exportações', () => {
  it('exige a permissão certa por tipo', () => {
    expect(requiredPermission('financial')).toBe('payments.view');
    expect(requiredPermission('payments')).toBe('payments.view');
    expect(requiredPermission('projects')).toBe('projects.view');
    expect(requiredPermission('clients')).toBe('clients.view');
  });
  it('projetos sem payments.view: sem valor', () => {
    expect(redactRows('projects', [project], new Set(['projects.view']))[0]).not.toHaveProperty('valor');
    expect(redactRows('projects', [project], new Set(['projects.view', 'payments.view']))[0]).toHaveProperty('valor', 1200);
  });
  it('clientes: contactos e valor estimado só com as permissões próprias', () => {
    const base = redactRows('clients', [client], new Set(['clients.view']))[0];
    expect(Object.keys(base).sort()).toEqual(['id', 'lead_status', 'nome']);
    const all = redactRows('clients', [client], new Set(['clients.view', 'clients.view_contacts', 'clients.view_financials']))[0];
    expect(all).toEqual(client);
  });
  it('lista as permissões opcionais e valida o tipo', () => {
    expect(columnPermissions('clients')).toEqual(['clients.view_contacts', 'clients.view_financials']);
    expect(columnPermissions('financial')).toEqual([]);
    expect(isReportType('projects')).toBe(true);
    expect(isReportType('users')).toBe(false);
  });
});
