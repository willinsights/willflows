// S14: server-side permission rules for exports (single source, tested).
export type ReportType = 'financial' | 'projects' | 'clients' | 'payments';
export type PermissionKey =
  | 'payments.view' | 'projects.view' | 'clients.view'
  | 'clients.view_contacts' | 'clients.view_financials';

/** Permission required to export a report type at all. */
export function requiredPermission(type: ReportType): PermissionKey {
  switch (type) {
    case 'financial':
    case 'payments': return 'payments.view';
    case 'projects': return 'projects.view';
    case 'clients': return 'clients.view';
  }
}

/** Optional permissions that unlock sensitive columns, per report type. */
export function columnPermissions(type: ReportType): PermissionKey[] {
  if (type === 'projects') return ['payments.view'];
  if (type === 'clients') return ['clients.view_contacts', 'clients.view_financials'];
  return [];
}

const PROJECT_FINANCIAL = ['valor'];
const CLIENT_CONTACTS = ['email', 'telefone', 'nif', 'cidade'];
const CLIENT_FINANCIAL = ['valor_estimado'];

/** Removes columns the caller may not see. Unknown permissions count as denied. */
export function redactRows(type: ReportType, rows: Record<string, unknown>[], granted: ReadonlySet<PermissionKey>) {
  const drop = new Set<string>();
  if (type === 'projects' && !granted.has('payments.view')) PROJECT_FINANCIAL.forEach((c) => drop.add(c));
  if (type === 'clients' && !granted.has('clients.view_contacts')) CLIENT_CONTACTS.forEach((c) => drop.add(c));
  if (type === 'clients' && !granted.has('clients.view_financials')) CLIENT_FINANCIAL.forEach((c) => drop.add(c));
  if (drop.size === 0) return rows;
  return rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !drop.has(k))));
}

export function isReportType(v: unknown): v is ReportType {
  return v === 'financial' || v === 'projects' || v === 'clients' || v === 'payments';
}
