import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';

export type FeedbackType = 'bug' | 'improvement';

interface SubmitFeedbackParams {
  type: FeedbackType;
  title: string;
  description: string;
  screenshotUrl?: string;
}

export function useFeedback() {
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();

  const submitFeedback = async ({ type, title, description, screenshotUrl }: SubmitFeedbackParams) => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Precisas de estar autenticado para enviar feedback.',
        variant: 'destructive',
      });
      return false;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('feedback').insert({
        user_id: user.id,
        workspace_id: currentWorkspace?.id || null,
        type,
        title,
        description,
        screenshot_url: screenshotUrl || null,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
      });

      if (error) throw error;

      toast({
        title: 'Feedback enviado!',
        description: 'Obrigado pelo teu feedback. Vamos analisar em breve.',
      });

      return true;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Erro ao enviar',
        description: 'Não foi possível enviar o feedback. Tenta novamente.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    submitFeedback,
    submitting,
  };
}
