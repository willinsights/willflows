import { addDays, format, isValid, parseISO } from 'date-fns';

export function getReceivableForecastDate(project: {
  client_payment_due_date: string | null;
  delivered_at: string | null;
}): string | null {
  if (project.client_payment_due_date) return project.client_payment_due_date;
  if (!project.delivered_at) return null;

  const deliveryDate = parseISO(project.delivered_at.slice(0, 10));
  return isValid(deliveryDate) ? format(addDays(deliveryDate, 8), 'yyyy-MM-dd') : null;
}
