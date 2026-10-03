import { useMemo } from 'react';
import { useClients } from '@/hooks/useClients';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useProjects } from '@/hooks/useProjects';
import { useTeamPayments } from '@/hooks/usePayments';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { usePaymentsData } from '@/hooks/usePaymentsData';
import { FreelancerPaymentsControl, type ProjectTeamPayment } from '@/components/payments/FreelancerPaymentsControl';

export default function Custos() {
  const { clients } = useClients();
  const { members } = useWorkspaceMembers();
  const { projects } = useProjects();
  const { teamPayments } = useTeamPayments();
  const { formatCurrency } = useFormatCurrency();
  const { handleFreelancerStatusChange } = usePaymentsData();

  const typedTeamPayments = teamPayments as ProjectTeamPayment[];
  const clientsList = useMemo(() => clients.map(c => ({ id: c.id, name: c.name })), [clients]);
  const membersList = useMemo(() => members.map(m => ({ user_id: m.user_id, full_name: m.full_name })), [members]);
  const projectsList = useMemo(() => projects.map(p => ({ id: p.id, name: p.name, project_code: p.project_code, client_id: p.client_id, delivery_date: p.delivery_date, delivered_at: p.delivered_at, is_delivered: p.is_delivered, created_at: p.created_at })), [projects]);

  return (
    <FreelancerPaymentsControl
      teamPayments={typedTeamPayments}
      projects={projectsList}
      members={membersList}
      clients={clientsList}
      onStatusChange={handleFreelancerStatusChange}
      formatCurrency={formatCurrency}
    />
  );
}
