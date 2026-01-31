import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Declare EdgeRuntime for Supabase background tasks
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ExportRequest {
  workspace_id: string;
  report_type: 'financial' | 'projects' | 'clients' | 'payments';
  format: 'csv' | 'json';
  filters?: {
    start_date?: string;
    end_date?: string;
    status?: string;
  };
}

interface ExportJob {
  id: string;
  workspace_id: string;
  user_id: string;
  report_type: string;
  format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_url?: string;
  error?: string;
  created_at: string;
  completed_at?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Handle status check
    if (action === 'status') {
      const jobId = url.searchParams.get('job_id');
      if (!jobId) {
        return new Response(
          JSON.stringify({ error: 'Job ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: job, error: jobError } = await supabase
        .from('export_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('user_id', user.id)
        .single();

      if (jobError || !job) {
        return new Response(
          JSON.stringify({ error: 'Job not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(job),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle list jobs
    if (action === 'list') {
      const workspaceId = url.searchParams.get('workspace_id');
      
      const { data: jobs, error: listError } = await supabase
        .from('export_jobs')
        .select('*')
        .eq('user_id', user.id)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (listError) {
        console.error('Error fetching jobs:', listError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch jobs' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ jobs }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle new export request
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ExportRequest = await req.json();
    const { workspace_id, report_type, format, filters } = body;

    if (!workspace_id || !report_type || !format) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has access to workspace
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (memberError || !member) {
      return new Response(
        JSON.stringify({ error: 'Access denied to workspace' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has Pro or Studio plan for exports
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('subscription_plan')
      .eq('user_id', user.id)
      .single();

    const plan = subscription?.subscription_plan || 'starter';
    if (plan === 'starter') {
      // Check for super admin
      const { data: isAdmin } = await supabase
        .rpc('is_system_admin');
      
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: 'Export feature requires Pro or Studio plan' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create export job record
    const jobId = crypto.randomUUID();
    const { error: insertError } = await supabase
      .from('export_jobs')
      .insert({
        id: jobId,
        workspace_id,
        user_id: user.id,
        report_type,
        format,
        filters,
        status: 'pending',
      });

    if (insertError) {
      console.error('Error creating job:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create export job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Start background processing
    EdgeRuntime.waitUntil(processExport(supabase, jobId, workspace_id, report_type, format, filters));

    console.log(`Export job ${jobId} created for workspace ${workspace_id}`);

    return new Response(
      JSON.stringify({ 
        job_id: jobId, 
        status: 'pending',
        message: 'Export started. Check status using the job_id.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in export-report:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processExport(
  supabase: any, 
  jobId: string, 
  workspaceId: string, 
  reportType: string, 
  format: string,
  filters?: { start_date?: string; end_date?: string; status?: string }
) {
  try {
    // Update status to processing
    await supabase
      .from('export_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);

    let data: any[] = [];
    let fileName = '';

    // Fetch data based on report type
    switch (reportType) {
      case 'financial':
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select(`
            id, amount, currency, status, due_date, paid_at, description,
            invoice_number, is_receivable, created_at,
            clients!payments_client_id_fkey(name),
            projects!payments_project_id_fkey(name)
          `)
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false });

        if (paymentsError) throw paymentsError;
        data = (payments || []).map((p: any) => ({
          id: p.id,
          tipo: p.is_receivable ? 'Receita' : 'Despesa',
          valor: p.amount,
          moeda: p.currency,
          estado: p.status,
          vencimento: p.due_date,
          pago_em: p.paid_at,
          descricao: p.description,
          fatura: p.invoice_number,
          cliente: p.clients?.name,
          projeto: p.projects?.name,
          criado_em: p.created_at,
        }));
        fileName = `relatorio-financeiro-${new Date().toISOString().split('T')[0]}`;
        break;

      case 'projects':
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select(`
            id, name, type, category, current_phase, priority, 
            shoot_date, delivery_date, agreed_value, is_delivered, created_at,
            clients!projects_client_id_fkey(name)
          `)
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false });

        if (projectsError) throw projectsError;
        data = (projects || []).map((p: any) => ({
          id: p.id,
          nome: p.name,
          tipo: p.type,
          categoria: p.category,
          fase: p.current_phase,
          prioridade: p.priority,
          data_captacao: p.shoot_date,
          data_entrega: p.delivery_date,
          valor: p.agreed_value,
          entregue: p.is_delivered ? 'Sim' : 'Não',
          cliente: p.clients?.name,
          criado_em: p.created_at,
        }));
        fileName = `projetos-${new Date().toISOString().split('T')[0]}`;
        break;

      case 'clients':
        const { data: clients, error: clientsError } = await supabase
          .from('clients')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false });

        if (clientsError) throw clientsError;
        data = (clients || []).map((c: any) => ({
          id: c.id,
          nome: c.name,
          empresa: c.company,
          email: c.email,
          telefone: c.phone,
          cidade: c.city,
          nif: c.nif,
          lead_status: c.lead_status,
          valor_estimado: c.estimated_value,
          criado_em: c.created_at,
        }));
        fileName = `clientes-${new Date().toISOString().split('T')[0]}`;
        break;

      case 'payments':
        const { data: paymentsOnly, error: paymentsOnlyError } = await supabase
          .from('payments')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false });

        if (paymentsOnlyError) throw paymentsOnlyError;
        data = paymentsOnly || [];
        fileName = `pagamentos-${new Date().toISOString().split('T')[0]}`;
        break;

      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    // Generate file content
    let content: string;
    let contentType: string;

    if (format === 'csv') {
      content = convertToCSV(data);
      contentType = 'text/csv';
      fileName += '.csv';
    } else {
      content = JSON.stringify(data, null, 2);
      contentType = 'application/json';
      fileName += '.json';
    }

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('exports')
      .upload(`${workspaceId}/${jobId}/${fileName}`, content, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get signed URL (valid for 24 hours)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('exports')
      .createSignedUrl(`${workspaceId}/${jobId}/${fileName}`, 86400);

    if (signedUrlError) throw signedUrlError;

    // Get job details for notification
    const { data: jobData } = await supabase
      .from('export_jobs')
      .select('user_id, workspace_id')
      .eq('id', jobId)
      .single();

    // Update job as completed
    await supabase
      .from('export_jobs')
      .update({ 
        status: 'completed',
        file_url: signedUrlData.signedUrl,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    // Create notification for user
    if (jobData) {
      const reportLabels: Record<string, string> = {
        financial: 'Relatório Financeiro',
        projects: 'Relatório de Projetos',
        clients: 'Relatório de Clientes',
        payments: 'Relatório de Pagamentos',
      };

      await supabase
        .from('notifications')
        .insert({
          user_id: jobData.user_id,
          workspace_id: jobData.workspace_id,
          type: 'success',
          title: 'Exportação Concluída',
          message: `O seu ${reportLabels[reportType] || 'relatório'} está pronto para download.`,
          entity_type: 'export_job',
          entity_id: jobId,
        });
    }

    console.log(`Export job ${jobId} completed successfully`);

  } catch (error) {
    console.error(`Export job ${jobId} failed:`, error);
    
    // Get job details for failure notification
    const { data: jobData } = await supabase
      .from('export_jobs')
      .select('user_id, workspace_id')
      .eq('id', jobId)
      .single();
    
    await supabase
      .from('export_jobs')
      .update({ 
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    // Create failure notification
    if (jobData) {
      await supabase
        .from('notifications')
        .insert({
          user_id: jobData.user_id,
          workspace_id: jobData.workspace_id,
          type: 'error',
          title: 'Exportação Falhou',
          message: 'Ocorreu um erro ao gerar o relatório. Por favor, tente novamente.',
          entity_type: 'export_job',
          entity_id: jobId,
        });
    }
  }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        // Escape quotes and wrap in quotes if contains comma or quote
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ];

  return csvRows.join('\n');
}
