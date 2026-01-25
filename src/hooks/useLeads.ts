import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { handleDatabaseError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import type { Tables } from '@/integrations/supabase/types';

export type LeadStatus = 'novo' | 'contactado' | 'qualificado' | 'proposta' | 'negociacao' | 'ganho' | 'perdido';

export interface Lead extends Tables<'clients'> {
  lead_status: LeadStatus | null;
  lead_source: string | null;
  estimated_value: number | null;
  converted_at: string | null;
  lost_reason: string | null;
  next_follow_up: string | null;
  last_contact_at: string | null;
}

export const LEAD_STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bgColor: string }> = {
  novo: { label: 'Novo', color: 'text-blue-600', bgColor: 'bg-blue-500' },
  contactado: { label: 'Contactado', color: 'text-cyan-600', bgColor: 'bg-cyan-500' },
  qualificado: { label: 'Qualificado', color: 'text-purple-600', bgColor: 'bg-purple-500' },
  proposta: { label: 'Proposta', color: 'text-amber-600', bgColor: 'bg-amber-500' },
  negociacao: { label: 'Negociação', color: 'text-orange-600', bgColor: 'bg-orange-500' },
  ganho: { label: 'Ganho', color: 'text-emerald-600', bgColor: 'bg-emerald-500' },
  perdido: { label: 'Perdido', color: 'text-red-600', bgColor: 'bg-red-500' },
};

export const LEAD_SOURCES = [
  { value: 'website', label: 'Website' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'referencia', label: 'Referência' },
  { value: 'google', label: 'Google' },
  { value: 'evento', label: 'Evento' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'outro', label: 'Outro' },
];

export function useLeads() {
  const { currentWorkspace, fetchError } = useWorkspace();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  
  const isFetchingRef = useRef(false);
  const lastFetchedWorkspaceIdRef = useRef<string | null>(null);

  const fetchLeads = useCallback(async () => {
    if (!currentWorkspace?.id || fetchError) return;
    if (isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      setLoading(true);
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_active', true)
        .not('lead_status', 'eq', 'ganho') // Exclude converted leads (they are clients now)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads((data || []) as Lead[]);
      lastFetchedWorkspaceIdRef.current = currentWorkspace.id;
    } catch (error) {
      logger.error('Error fetching leads:', error);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [currentWorkspace?.id, fetchError]);

  useEffect(() => {
    if (currentWorkspace?.id && currentWorkspace.id !== lastFetchedWorkspaceIdRef.current && !fetchError) {
      fetchLeads();
    } else if (!currentWorkspace) {
      setLoading(false);
    }
  }, [currentWorkspace?.id, fetchError, fetchLeads]);

  const updateLeadStatus = async (leadId: string, newStatus: LeadStatus, extraData?: Partial<Lead>) => {
    try {
      const updates: Record<string, unknown> = {
        lead_status: newStatus,
        ...extraData,
      };

      // If converting to client (ganho), set converted_at
      if (newStatus === 'ganho') {
        updates.converted_at = new Date().toISOString();
      }

      // If marking as lost, ensure lost_reason is provided
      if (newStatus === 'perdido' && !extraData?.lost_reason) {
        updates.lost_reason = 'Não especificado';
      }

      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', leadId)
        .select()
        .single();

      if (error) throw error;

      // Remove from leads list if converted
      if (newStatus === 'ganho') {
        setLeads(prev => prev.filter(l => l.id !== leadId));
        toast({ title: 'Lead convertido em cliente!' });
      } else {
        setLeads(prev => prev.map(l => l.id === leadId ? data as Lead : l));
      }

      return data;
    } catch (error) {
      toast({
        title: 'Erro ao atualizar lead',
        description: handleDatabaseError('updateLeadStatus', error),
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateLastContact = async (leadId: string) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .update({ last_contact_at: new Date().toISOString() })
        .eq('id', leadId)
        .select()
        .single();

      if (error) throw error;
      setLeads(prev => prev.map(l => l.id === leadId ? data as Lead : l));
      return data;
    } catch (error) {
      logger.error('Error updating last contact:', error);
      return null;
    }
  };

  const setNextFollowUp = async (leadId: string, date: Date | null) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .update({ next_follow_up: date?.toISOString() || null })
        .eq('id', leadId)
        .select()
        .single();

      if (error) throw error;
      setLeads(prev => prev.map(l => l.id === leadId ? data as Lead : l));
      toast({ title: date ? 'Follow-up agendado' : 'Follow-up removido' });
      return data;
    } catch (error) {
      toast({
        title: 'Erro ao agendar follow-up',
        description: handleDatabaseError('setNextFollowUp', error),
        variant: 'destructive',
      });
      return null;
    }
  };

  const createLead = async (leadData: {
    name: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    lead_source?: string | null;
    estimated_value?: number | null;
    notes?: string | null;
  }) => {
    if (!currentWorkspace) return null;

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          ...leadData,
          workspace_id: currentWorkspace.id,
          lead_status: 'novo' as LeadStatus,
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Lead criado com sucesso' });
      setLeads(prev => [data as Lead, ...prev]);
      return data;
    } catch (error) {
      toast({
        title: 'Erro ao criar lead',
        description: handleDatabaseError('createLead', error),
        variant: 'destructive',
      });
      return null;
    }
  };

  // Group leads by status for Kanban
  const leadsByStatus = useMemo(() => {
    const grouped: Record<LeadStatus, Lead[]> = {
      novo: [],
      contactado: [],
      qualificado: [],
      proposta: [],
      negociacao: [],
      ganho: [],
      perdido: [],
    };

    leads.forEach(lead => {
      const status = (lead.lead_status || 'novo') as LeadStatus;
      if (grouped[status]) {
        grouped[status].push(lead);
      }
    });

    return grouped;
  }, [leads]);

  // Pipeline metrics
  const pipelineMetrics = useMemo(() => {
    const totalLeads = leads.length;
    const totalValue = leads.reduce((sum, l) => sum + (l.estimated_value || 0), 0);
    const leadsWithFollowUp = leads.filter(l => l.next_follow_up).length;
    const overdueFollowUps = leads.filter(l => 
      l.next_follow_up && new Date(l.next_follow_up) < new Date()
    ).length;

    return {
      totalLeads,
      totalValue,
      leadsWithFollowUp,
      overdueFollowUps,
    };
  }, [leads]);

  const deleteLead = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_active: false })
        .eq('id', leadId);

      if (error) throw error;

      setLeads(prev => prev.filter(l => l.id !== leadId));
      toast({ title: 'Lead eliminado com sucesso' });
      return true;
    } catch (error) {
      toast({
        title: 'Erro ao eliminar lead',
        description: handleDatabaseError('deleteLead', error),
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    leads,
    leadsByStatus,
    loading,
    pipelineMetrics,
    createLead,
    updateLeadStatus,
    updateLastContact,
    setNextFollowUp,
    deleteLead,
    refresh: fetchLeads,
  };
}
