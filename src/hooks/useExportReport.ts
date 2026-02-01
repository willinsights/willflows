import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type ReportType = 'financial' | 'projects' | 'clients' | 'payments';
export type ExportFormat = 'excel' | 'pdf';

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

interface UseExportReportReturn {
  startExport: (workspaceId: string, reportType: ReportType, format: ExportFormat) => Promise<string | null>;
  checkStatus: (jobId: string) => Promise<ExportJob | null>;
  listJobs: (workspaceId: string) => Promise<ExportJob[]>;
  isExporting: boolean;
  currentJob: ExportJob | null;
}

export function useExportReport(): UseExportReportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [currentJob, setCurrentJob] = useState<ExportJob | null>(null);
  const { toast } = useToast();

  const startExport = useCallback(async (
    workspaceId: string,
    reportType: ReportType,
    format: ExportFormat
  ): Promise<string | null> => {
    setIsExporting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Erro',
          description: 'Sessão expirada. Por favor, faça login novamente.',
          variant: 'destructive',
        });
        return null;
      }

      const { data, error } = await supabase.functions.invoke('export-report', {
        body: {
          workspace_id: workspaceId,
          report_type: reportType,
          format,
        },
      });

      if (error) {
        console.error('Export error:', error);
        toast({
          title: 'Erro ao iniciar exportação',
          description: error.message || 'Tente novamente mais tarde.',
          variant: 'destructive',
        });
        return null;
      }

      if (data?.error) {
        toast({
          title: 'Exportação não permitida',
          description: data.error,
          variant: 'destructive',
        });
        return null;
      }

      toast({
        title: 'Exportação iniciada',
        description: 'O relatório está sendo gerado. Verifique o progresso em breve.',
      });

      // Start polling for status
      const jobId = data.job_id;
      pollJobStatus(jobId);

      return jobId;
    } catch (err) {
      console.error('Export error:', err);
      toast({
        title: 'Erro',
        description: 'Falha ao iniciar exportação.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsExporting(false);
    }
  }, [toast]);

  const checkStatus = useCallback(async (jobId: string): Promise<ExportJob | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('export-report', {
        body: null,
        headers: {},
      });

      // Use query params for status check
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-report?action=status&job_id=${jobId}`,
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        }
      );

      if (!response.ok) {
        console.error('Status check failed');
        return null;
      }

      const job = await response.json();
      setCurrentJob(job);
      return job;
    } catch (err) {
      console.error('Status check error:', err);
      return null;
    }
  }, []);

  const listJobs = useCallback(async (workspaceId: string): Promise<ExportJob[]> => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return [];

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-report?action=list&workspace_id=${workspaceId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.jobs || [];
    } catch (err) {
      console.error('List jobs error:', err);
      return [];
    }
  }, []);

  const pollJobStatus = useCallback(async (jobId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max (5s intervals)

    const poll = async () => {
      const job = await checkStatus(jobId);
      
      if (!job) {
        return;
      }

      if (job.status === 'completed') {
        toast({
          title: 'Exportação concluída',
          description: 'O seu relatório está pronto para download.',
        });
        
        // Auto-download
        if (job.file_url) {
          window.open(job.file_url, '_blank');
        }
        return;
      }

      if (job.status === 'failed') {
        toast({
          title: 'Exportação falhou',
          description: job.error || 'Erro desconhecido. Tente novamente.',
          variant: 'destructive',
        });
        return;
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 5000); // Poll every 5 seconds
      }
    };

    // Start polling after initial delay
    setTimeout(poll, 3000);
  }, [checkStatus, toast]);

  return {
    startExport,
    checkStatus,
    listJobs,
    isExporting,
    currentJob,
  };
}
