import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export interface Category {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  created_at: string;
}

export function useCategories() {
  const { currentWorkspace, fetchError } = useWorkspace();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Refs to prevent duplicate fetches
  const isFetchingRef = useRef(false);
  const lastFetchedWorkspaceIdRef = useRef<string | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!currentWorkspace?.id || fetchError) return;
    if (isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      setLoading(true);
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
      lastFetchedWorkspaceIdRef.current = currentWorkspace.id;
    } catch (error) {
      logger.error('Error fetching categories:', error);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [currentWorkspace?.id, fetchError]);

  useEffect(() => {
    // Only fetch if workspace ID changed
    if (currentWorkspace?.id && currentWorkspace.id !== lastFetchedWorkspaceIdRef.current && !fetchError) {
      fetchCategories();
    } else if (!currentWorkspace) {
      setLoading(false);
    }
  }, [currentWorkspace?.id, fetchError]);

  const createCategory = async (name: string, color: string = '#8224e3') => {
    if (!currentWorkspace) return null;

    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          name,
          color,
          workspace_id: currentWorkspace.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Categoria criada com sucesso' });
      setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return data;
    } catch (error: any) {
      logger.error('Error creating category:', error);
      toast({
        title: 'Erro ao criar categoria',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  return {
    categories,
    loading,
    createCategory,
    refresh: fetchCategories,
  };
}
