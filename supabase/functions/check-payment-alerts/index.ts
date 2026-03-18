import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all unpaid payments with due dates
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, workspace_id, amount, currency, due_date, is_receivable, status, description, project_id, projects(name), clients(name)')
      .in('status', ['pendente', 'parcial'])
      .not('due_date', 'is', null);

    if (paymentsError) throw paymentsError;

    const now = new Date();
    let alertsCreated = 0;

    for (const payment of (payments || [])) {
      const dueDate = new Date(payment.due_date);
      const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      const alertTypes: string[] = [];
      
      // Upcoming alerts
      if (diffDays <= 7 && diffDays > 3) alertTypes.push('upcoming_7d');
      if (diffDays <= 3 && diffDays > 0) alertTypes.push('upcoming_3d');
      
      // Overdue alerts
      if (diffDays <= 0 && diffDays > -7) alertTypes.push('overdue');
      if (diffDays <= -7 && diffDays > -30) alertTypes.push('overdue_7d');
      if (diffDays <= -30) alertTypes.push('overdue_30d');

      for (const alertType of alertTypes) {
        // Check if already notified
        const { data: existing } = await supabase
          .from('payment_alerts')
          .select('id')
          .eq('payment_id', payment.id)
          .eq('alert_type', alertType)
          .maybeSingle();

        if (existing) continue;

        // Create alert record
        await supabase.from('payment_alerts').insert({
          workspace_id: payment.workspace_id,
          payment_id: payment.id,
          alert_type: alertType,
        });

        // Determine notification content
        const tipo = payment.is_receivable ? 'a receber' : 'a pagar';
        const valor = `${payment.amount} ${payment.currency}`;
        const projeto = (payment as any).projects?.name;
        const cliente = (payment as any).clients?.name;
        
        let title: string;
        let message: string;
        let notifType: string;

        if (alertType.startsWith('upcoming')) {
          title = '⏰ Pagamento Próximo do Vencimento';
          message = `Pagamento ${tipo} de ${valor}${projeto ? ` (${projeto})` : ''}${cliente ? ` - ${cliente}` : ''} vence em ${diffDays} dia(s).`;
          notifType = 'warning';
        } else if (alertType === 'overdue') {
          title = '🔴 Pagamento Vencido';
          message = `Pagamento ${tipo} de ${valor}${projeto ? ` (${projeto})` : ''}${cliente ? ` - ${cliente}` : ''} está vencido.`;
          notifType = 'error';
        } else if (alertType === 'overdue_7d') {
          title = '🔴 Pagamento Vencido há +7 dias';
          message = `Pagamento ${tipo} de ${valor}${projeto ? ` (${projeto})` : ''}${cliente ? ` - ${cliente}` : ''} está vencido há ${Math.abs(diffDays)} dias.`;
          notifType = 'error';
        } else {
          title = '🚨 Pagamento Vencido há +30 dias';
          message = `URGENTE: Pagamento ${tipo} de ${valor}${projeto ? ` (${projeto})` : ''}${cliente ? ` - ${cliente}` : ''} está vencido há ${Math.abs(diffDays)} dias.`;
          notifType = 'error';
        }

        // Notify workspace members with financial permissions
        const { data: members } = await supabase
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', payment.workspace_id)
          .eq('is_active', true);

        for (const member of (members || [])) {
          // Check permission
          const { data: hasPerm } = await supabase.rpc('has_workspace_permission', {
            _user_id: member.user_id,
            _workspace_id: payment.workspace_id,
            _permission: 'payments.view',
          });

          if (hasPerm) {
            await supabase.from('notifications').insert({
              workspace_id: payment.workspace_id,
              user_id: member.user_id,
              type: notifType,
              title,
              message,
              entity_type: 'payment',
              entity_id: payment.id,
            });
          }
        }

        alertsCreated++;
      }
    }

    console.log(`Payment alerts check complete. ${alertsCreated} new alerts created.`);

    return new Response(
      JSON.stringify({ success: true, alerts_created: alertsCreated }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-payment-alerts:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
