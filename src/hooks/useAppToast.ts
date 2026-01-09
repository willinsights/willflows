import { toast } from 'sonner';
import { Check, AlertTriangle, Info, Clock, Plus, CreditCard, Users, Calendar, FileCheck } from 'lucide-react';
import { createElement } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Pre-defined app events
const appEvents = {
  // Project events
  projectCreated: (projectName: string) => ({
    type: 'success' as ToastType,
    title: 'Projeto criado',
    description: `"${projectName}" foi criado com sucesso.`,
    icon: Plus,
  }),
  projectDelivered: (projectName: string) => ({
    type: 'success' as ToastType,
    title: 'Projeto entregue',
    description: `"${projectName}" foi marcado como entregue.`,
    icon: FileCheck,
  }),
  projectUpdated: (projectName: string) => ({
    type: 'success' as ToastType,
    title: 'Projeto atualizado',
    description: `"${projectName}" foi atualizado.`,
    icon: Check,
  }),

  // Payment events
  paymentReceived: (amount: string, clientName?: string) => ({
    type: 'success' as ToastType,
    title: 'Pagamento recebido',
    description: clientName ? `${amount} de ${clientName}` : `${amount} recebido com sucesso.`,
    icon: CreditCard,
  }),
  paymentOverdue: (projectName: string, days: number) => ({
    type: 'warning' as ToastType,
    title: 'Pagamento vencido',
    description: `Pagamento de "${projectName}" vencido há ${days} dias.`,
    icon: AlertTriangle,
  }),

  // Client events
  clientCreated: (clientName: string) => ({
    type: 'success' as ToastType,
    title: 'Cliente adicionado',
    description: `"${clientName}" foi adicionado à sua lista.`,
    icon: Users,
  }),

  // Calendar events
  eventCreated: (eventName: string) => ({
    type: 'success' as ToastType,
    title: 'Evento criado',
    description: `"${eventName}" foi adicionado ao calendário.`,
    icon: Calendar,
  }),
  upcomingDeadline: (projectName: string, days: number) => ({
    type: 'info' as ToastType,
    title: 'Prazo próximo',
    description: `"${projectName}" tem entrega em ${days} ${days === 1 ? 'dia' : 'dias'}.`,
    icon: Clock,
  }),

  // Generic events
  saved: () => ({
    type: 'success' as ToastType,
    title: 'Guardado',
    description: 'As alterações foram guardadas.',
    icon: Check,
  }),
  deleted: (itemName?: string) => ({
    type: 'success' as ToastType,
    title: 'Eliminado',
    description: itemName ? `"${itemName}" foi eliminado.` : 'Item eliminado com sucesso.',
    icon: Check,
  }),
  error: (message: string) => ({
    type: 'error' as ToastType,
    title: 'Erro',
    description: message,
    icon: AlertTriangle,
  }),
};

function showToast(
  type: ToastType,
  title: string,
  options?: ToastOptions
) {
  const toastFn = {
    success: toast.success,
    error: toast.error,
    warning: toast.warning,
    info: toast.info,
  }[type];

  return toastFn(title, {
    description: options?.description,
    duration: options?.duration || 4000,
    action: options?.action
      ? {
          label: options.action.label,
          onClick: options.action.onClick,
        }
      : undefined,
  });
}

function showAppEvent<K extends keyof typeof appEvents>(
  eventKey: K,
  ...args: Parameters<(typeof appEvents)[K]>
) {
  // @ts-expect-error - TypeScript can't infer the spread args correctly
  const event = appEvents[eventKey](...args);
  return showToast(event.type, event.title, {
    description: event.description,
  });
}

export function useAppToast() {
  return {
    // Direct toast methods
    success: (title: string, options?: ToastOptions) => showToast('success', title, options),
    error: (title: string, options?: ToastOptions) => showToast('error', title, options),
    warning: (title: string, options?: ToastOptions) => showToast('warning', title, options),
    info: (title: string, options?: ToastOptions) => showToast('info', title, options),

    // Pre-defined app events
    projectCreated: (projectName: string) => showAppEvent('projectCreated', projectName),
    projectDelivered: (projectName: string) => showAppEvent('projectDelivered', projectName),
    projectUpdated: (projectName: string) => showAppEvent('projectUpdated', projectName),
    paymentReceived: (amount: string, clientName?: string) => showAppEvent('paymentReceived', amount, clientName),
    paymentOverdue: (projectName: string, days: number) => showAppEvent('paymentOverdue', projectName, days),
    clientCreated: (clientName: string) => showAppEvent('clientCreated', clientName),
    eventCreated: (eventName: string) => showAppEvent('eventCreated', eventName),
    upcomingDeadline: (projectName: string, days: number) => showAppEvent('upcomingDeadline', projectName, days),
    saved: () => showAppEvent('saved'),
    deleted: (itemName?: string) => showAppEvent('deleted', itemName),

    // Promise-based toast for async operations
    promise: toast.promise,
  };
}

// Export for direct usage without hook
export const appToast = {
  success: (title: string, options?: ToastOptions) => showToast('success', title, options),
  error: (title: string, options?: ToastOptions) => showToast('error', title, options),
  warning: (title: string, options?: ToastOptions) => showToast('warning', title, options),
  info: (title: string, options?: ToastOptions) => showToast('info', title, options),
  projectCreated: (projectName: string) => showAppEvent('projectCreated', projectName),
  projectDelivered: (projectName: string) => showAppEvent('projectDelivered', projectName),
  projectUpdated: (projectName: string) => showAppEvent('projectUpdated', projectName),
  paymentReceived: (amount: string, clientName?: string) => showAppEvent('paymentReceived', amount, clientName),
  paymentOverdue: (projectName: string, days: number) => showAppEvent('paymentOverdue', projectName, days),
  clientCreated: (clientName: string) => showAppEvent('clientCreated', clientName),
  eventCreated: (eventName: string) => showAppEvent('eventCreated', eventName),
  upcomingDeadline: (projectName: string, days: number) => showAppEvent('upcomingDeadline', projectName, days),
  saved: () => showAppEvent('saved'),
  deleted: (itemName?: string) => showAppEvent('deleted', itemName),
  promise: toast.promise,
};
