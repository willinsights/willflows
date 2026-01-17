import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppToast } from './useAppToast';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  cover_image_credit: string | null;
  cover_image_source: string | null;
  author_name: string;
  category: string | null;
  published_at: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface GenerateOptions {
  topics?: string[];
  autoPublish?: boolean;
  category?: string;
}

export interface GenerateResult {
  success: boolean;
  postId?: string;
  title?: string;
  slug?: string;
  error?: string;
}

export function useBlogAdmin() {
  const { success: toastSuccess, error: toastError } = useAppToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [generatingImageId, setGeneratingImageId] = useState<string | null>(null);

  // Fetch all posts (including drafts)
  const { data: posts = [], isLoading: loading, error } = useQuery({
    queryKey: ['blog-admin-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BlogPost[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutos antes de considerar stale
    refetchOnWindowFocus: false, // Não refetch ao voltar à janela
  });

  // Generate new post with AI
  const generatePost = useCallback(async (options: GenerateOptions): Promise<GenerateResult> => {
    setIsGenerating(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Sessão expirada. Faz login novamente.');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-generate-blog-post`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(options),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao gerar artigo');
      }

      toastSuccess('Artigo gerado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['blog-admin-posts'] });
      
      return result;
    } catch (err: any) {
      const message = err.message || 'Erro ao gerar artigo';
      toastError(message);
      return { success: false, error: message };
    } finally {
      setIsGenerating(false);
    }
  }, [toastSuccess, toastError, queryClient]);

  // Regenerate image for a post
  const regenerateImage = useCallback(async (postId: string, title: string): Promise<{ success: boolean; imageUrl?: string; error?: string }> => {
    setIsRegeneratingImage(true);
    setGeneratingImageId(postId);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Sessão expirada. Faz login novamente.');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-generate-blog-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ postId, title, forceRegenerate: true }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao gerar imagem');
      }

      toastSuccess('Imagem gerada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['blog-admin-posts'] });
      
      return result;
    } catch (err: any) {
      const message = err.message || 'Erro ao gerar imagem';
      toastError(message);
      return { success: false, error: message };
    } finally {
      setIsRegeneratingImage(false);
      setGeneratingImageId(null);
    }
  }, [toastSuccess, toastError, queryClient]);

  // Publish post
  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('blog_posts')
        .update({ 
          is_published: true, 
          published_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toastSuccess('Artigo publicado!');
      queryClient.invalidateQueries({ queryKey: ['blog-admin-posts'] });
    },
    onError: () => {
      toastError('Erro ao publicar artigo');
    },
  });

  // Unpublish post
  const unpublishMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('blog_posts')
        .update({ 
          is_published: false, 
          published_at: null 
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toastSuccess('Artigo despublicado');
      queryClient.invalidateQueries({ queryKey: ['blog-admin-posts'] });
    },
    onError: () => {
      toastError('Erro ao despublicar artigo');
    },
  });

  // Delete post
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toastSuccess('Artigo eliminado');
      queryClient.invalidateQueries({ queryKey: ['blog-admin-posts'] });
    },
    onError: () => {
      toastError('Erro ao eliminar artigo');
    },
  });

  // Update post
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BlogPost> }) => {
      const { error } = await supabase
        .from('blog_posts')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toastSuccess('Artigo atualizado');
      queryClient.invalidateQueries({ queryKey: ['blog-admin-posts'] });
    },
    onError: () => {
      toastError('Erro ao atualizar artigo');
    },
  });

  return {
    posts,
    loading,
    error: error?.message || null,
    isGenerating,
    isRegeneratingImage,
    generatingImageId,
    generatePost,
    regenerateImage,
    publishPost: publishMutation.mutate,
    unpublishPost: unpublishMutation.mutate,
    deletePost: deleteMutation.mutate,
    updatePost: async (id: string, data: Partial<BlogPost>) => {
      await updateMutation.mutateAsync({ id, data });
    },
  };
}
