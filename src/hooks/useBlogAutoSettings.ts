import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAppToast } from "./useAppToast";

export interface BlogAutoSettings {
  id: string;
  is_enabled: boolean;
  articles_per_day: number;
  auto_publish: boolean;
  preferred_topics: string[];
  preferred_categories: string[];
  schedule_hour: number;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useBlogAutoSettings() {
  const { success: toastSuccess, error: toastError } = useAppToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["blog-auto-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_auto_settings")
        .select("*")
        .single();

      if (error) throw error;
      return data as BlogAutoSettings;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<BlogAutoSettings>) => {
      if (!settings?.id) throw new Error("Settings not found");

      const { error } = await supabase
        .from("blog_auto_settings")
        .update(updates)
        .eq("id", settings.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toastSuccess("Configurações guardadas!");
      queryClient.invalidateQueries({ queryKey: ["blog-auto-settings"] });
    },
    onError: () => {
      toastError("Erro ao guardar configurações");
    },
  });

  const triggerManualRun = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toastError("Sessão expirada");
        return { success: false };
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/blog-auto-generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({ manual: true }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao gerar artigo");
      }

      toastSuccess("Artigo gerado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["blog-admin-posts"] });
      return { success: true, ...result };
    } catch (err: any) {
      toastError(err.message || "Erro ao gerar artigo");
      return { success: false, error: err.message };
    }
  };

  return {
    settings,
    isLoading,
    error: error?.message || null,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    triggerManualRun,
  };
}
