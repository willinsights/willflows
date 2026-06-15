import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { handleDatabaseError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

export type ContractStatus = 'draft' | 'sent' | 'viewed' | 'signed' | 'expired' | 'cancelled';

export interface Contract {
  id: string;
  workspace_id: string;
  project_id: string | null;
  client_id: string;
  template_id: string | null;
  title: string;
  content: string;
  status: ContractStatus;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  expires_at: string | null;
  signature_token?: string; // not returned to workspace members; only available via secure RPC
  client_signature_data: string | null;
  client_signed_name: string | null;
  client_signed_ip: string | null;
  client_signed_user_agent: string | null;
  total_value: number | null;
  payment_terms: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  client?: {
    id: string;
    name: string;
    company: string | null;
    email: string | null;
  };
  project?: {
    id: string;
    name: string;
  } | null;
}

export interface ContractInsert {
  client_id: string;
  project_id?: string | null;
  template_id?: string | null;
  title: string;
  content: string;
  total_value?: number | null;
  payment_terms?: string | null;
  expires_at?: string | null;
}

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'bg-muted text-muted-foreground' },
  sent: { label: 'Enviado', color: 'bg-blue-500/20 text-blue-600' },
  viewed: { label: 'Visualizado', color: 'bg-amber-500/20 text-amber-600' },
  signed: { label: 'Assinado', color: 'bg-emerald-500/20 text-emerald-600' },
  expired: { label: 'Expirado', color: 'bg-red-500/20 text-red-600' },
  cancelled: { label: 'Cancelado', color: 'bg-gray-500/20 text-gray-600' },
};

export function useContracts() {
  const { currentWorkspace, fetchError } = useWorkspace();
  const { toast } = useToast();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  
  const isFetchingRef = useRef(false);
  const lastFetchedWorkspaceIdRef = useRef<string | null>(null);

  const fetchContracts = useCallback(async () => {
    if (!currentWorkspace?.id || fetchError) return;
    if (isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      setLoading(true);
      
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          client:clients(id, name, company, email),
          project:projects(id, name)
        `)
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts((data || []) as Contract[]);
      lastFetchedWorkspaceIdRef.current = currentWorkspace.id;
    } catch (error) {
      logger.error('Error fetching contracts:', error);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [currentWorkspace?.id, fetchError]);

  useEffect(() => {
    if (currentWorkspace?.id && currentWorkspace.id !== lastFetchedWorkspaceIdRef.current && !fetchError) {
      fetchContracts();
    } else if (!currentWorkspace) {
      setLoading(false);
    }
  }, [currentWorkspace?.id, fetchError, fetchContracts]);

  const createContract = async (contract: ContractInsert) => {
    if (!currentWorkspace) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('contracts')
        .insert({
          ...contract,
          workspace_id: currentWorkspace.id,
          created_by: user?.id,
        })
        .select(`
          *,
          client:clients(id, name, company, email),
          project:projects(id, name)
        `)
        .single();

      if (error) throw error;

      toast({ title: 'Contrato criado com sucesso' });
      setContracts(prev => [data as Contract, ...prev]);
      return data as Contract;
    } catch (error) {
      toast({
        title: 'Erro ao criar contrato',
        description: handleDatabaseError('createContract', error),
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateContract = async (id: string, updates: Partial<ContractInsert & { status: ContractStatus }>) => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          client:clients(id, name, company, email),
          project:projects(id, name)
        `)
        .single();

      if (error) throw error;

      toast({ title: 'Contrato actualizado com sucesso' });
      setContracts(prev => prev.map(c => c.id === id ? data as Contract : c));
      return data as Contract;
    } catch (error) {
      toast({
        title: 'Erro ao actualizar contrato',
        description: handleDatabaseError('updateContract', error),
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteContract = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Contrato eliminado com sucesso' });
      setContracts(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (error) {
      toast({
        title: 'Erro ao eliminar contrato',
        description: handleDatabaseError('deleteContract', error),
        variant: 'destructive',
      });
      return false;
    }
  };

  const sendContract = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          client:clients(id, name, company, email),
          project:projects(id, name)
        `)
        .single();

      if (error) throw error;

      toast({ title: 'Contrato marcado como enviado' });
      setContracts(prev => prev.map(c => c.id === id ? data as Contract : c));
      return data as Contract;
    } catch (error) {
      toast({
        title: 'Erro ao enviar contrato',
        description: handleDatabaseError('sendContract', error),
        variant: 'destructive',
      });
      return null;
    }
  };

  const cancelContract = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select(`
          *,
          client:clients(id, name, company, email),
          project:projects(id, name)
        `)
        .single();

      if (error) throw error;

      toast({ title: 'Contrato cancelado' });
      setContracts(prev => prev.map(c => c.id === id ? data as Contract : c));
      return data as Contract;
    } catch (error) {
      toast({
        title: 'Erro ao cancelar contrato',
        description: handleDatabaseError('cancelContract', error),
        variant: 'destructive',
      });
      return null;
    }
  };

  // Helper to fill template placeholders
  const fillPlaceholders = (
    template: string,
    client: { name: string; company?: string | null; email?: string | null; phone?: string | null; nif?: string | null; address?: string | null },
    project?: { name: string; date?: string; location?: string } | null,
    contract?: { value?: number; expiresAt?: string }
  ) => {
    let filled = template;
    
    // Client placeholders
    filled = filled.replace(/\{\{cliente\.nome\}\}/g, client.name || '');
    filled = filled.replace(/\{\{cliente\.empresa\}\}/g, client.company || '');
    filled = filled.replace(/\{\{cliente\.email\}\}/g, client.email || '');
    filled = filled.replace(/\{\{cliente\.telefone\}\}/g, client.phone || '');
    filled = filled.replace(/\{\{cliente\.nif\}\}/g, client.nif || '');
    filled = filled.replace(/\{\{cliente\.morada\}\}/g, client.address || '');
    
    // Project placeholders
    if (project) {
      filled = filled.replace(/\{\{projeto\.nome\}\}/g, project.name || '');
      filled = filled.replace(/\{\{projeto\.data\}\}/g, project.date || '');
      filled = filled.replace(/\{\{projeto\.local\}\}/g, project.location || '');
    }
    
    // Contract placeholders
    filled = filled.replace(/\{\{contrato\.data_hoje\}\}/g, format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: pt }));
    if (contract?.value) {
      filled = filled.replace(/\{\{contrato\.valor\}\}/g, new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(contract.value));
    }
    if (contract?.expiresAt) {
      filled = filled.replace(/\{\{contrato\.validade\}\}/g, format(new Date(contract.expiresAt), "d 'de' MMMM 'de' yyyy", { locale: pt }));
    }
    
    return filled;
  };

  // Metrics
  const metrics = {
    total: contracts.length,
    draft: contracts.filter(c => c.status === 'draft').length,
    sent: contracts.filter(c => c.status === 'sent').length,
    viewed: contracts.filter(c => c.status === 'viewed').length,
    signed: contracts.filter(c => c.status === 'signed').length,
    expired: contracts.filter(c => c.status === 'expired').length,
    totalValue: contracts
      .filter(c => c.status === 'signed')
      .reduce((sum, c) => sum + (c.total_value || 0), 0),
  };

  return {
    contracts,
    loading,
    metrics,
    createContract,
    updateContract,
    deleteContract,
    sendContract,
    cancelContract,
    fillPlaceholders,
    refresh: fetchContracts,
  };
}

// RPC result types for secure contract access
interface GetContractByTokenResult {
  found: boolean;
  error?: string;
  contract?: {
    id: string;
    workspace_id: string;
    client_id: string;
    project_id: string | null;
    title: string;
    content: string;
    status: ContractStatus;
    sent_at: string | null;
    viewed_at: string | null;
    signed_at: string | null;
    expires_at: string | null;
    signature_token: string;
    client_signature_data: string | null;
    client_signed_name: string | null;
    client_signed_ip: string | null;
    client_signed_user_agent: string | null;
    total_value: number | null;
    payment_terms: string | null;
    created_at: string;
    updated_at: string;
    template_id: string | null;
    created_by: string | null;
  };
  client?: {
    id: string;
    name: string;
    company: string | null;
    email: string | null;
  };
}

interface SignContractResult {
  success: boolean;
  error?: string;
}

// Hook for public contract signing - uses secure RPC functions
export function usePublicContract(token: string | undefined) {
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Token inválido');
      return;
    }

    const fetchContract = async () => {
      try {
        // Use secure RPC function to fetch contract by exact token match
        const { data: rpcResult, error: rpcError } = await supabase
          .rpc('get_contract_by_token', { _token: token });

        if (rpcError) throw rpcError;
        
        const result = rpcResult as unknown as GetContractByTokenResult;
        
        if (!result || !result.found) {
          setError('Contrato não encontrado');
          return;
        }

        const contractData = result.contract!;
        const clientData = result.client;

        // Construct contract object
        const fetchedContract: Contract = {
          ...contractData,
          client: clientData ? {
            id: clientData.id,
            name: clientData.name,
            company: clientData.company,
            email: clientData.email,
          } : undefined,
        };

        // Check if already signed
        if (fetchedContract.status === 'signed') {
          setContract(fetchedContract);
          return;
        }

        // Check if expired
        if (fetchedContract.expires_at && new Date(fetchedContract.expires_at) < new Date()) {
          setError('Este contrato expirou');
          return;
        }

        // Check if cancelled
        if (fetchedContract.status === 'cancelled') {
          setError('Este contrato foi cancelado');
          return;
        }

        // Mark as viewed using secure RPC if not already viewed
        if (fetchedContract.status === 'sent') {
          await supabase.rpc('mark_contract_viewed', { _token: token });
          
          // Log the view
          await supabase
            .from('contract_views')
            .insert({
              contract_id: fetchedContract.id,
              ip_address: null,
              user_agent: navigator.userAgent,
            });

          fetchedContract.status = 'viewed';
          fetchedContract.viewed_at = new Date().toISOString();
        }

        setContract(fetchedContract);
      } catch (err) {
        logger.error('Error fetching public contract:', err);
        setError('Erro ao carregar contrato');
      } finally {
        setLoading(false);
      }
    };

    fetchContract();
  }, [token]);

  const signContract = async (signatureName: string, signatureData: string) => {
    if (!contract || !token) return false;

    try {
      // Use secure RPC function to sign contract
      const { data: rpcResult, error: signError } = await supabase
        .rpc('sign_contract_public', { 
          _token: token, 
          _signer_name: signatureName, 
          _signature_data: signatureData 
        });

      if (signError) throw signError;
      
      const result = rpcResult as unknown as SignContractResult;
      
      if (!result || !result.success) {
        logger.error('Contract signing failed:', result?.error);
        return false;
      }

      setContract(prev => prev ? {
        ...prev,
        status: 'signed',
        signed_at: new Date().toISOString(),
        client_signed_name: signatureName,
      } : null);

      return true;
    } catch (err) {
      logger.error('Error signing contract:', err);
      return false;
    }
  };

  return { contract, loading, error, signContract };
}
