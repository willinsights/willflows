import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';

export type FeedbackType = 'bug' | 'improvement';

interface FeedbackSubmission {
  type: FeedbackType;
  title: string;
  description: string;
  screenshotUrl?: string | null;
}

export function useFeedback() {
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const { toast } = useToast();

  const submitFeedback = async (feedback: FeedbackSubmission): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'É necessário estar autenticado para enviar feedback.',
        variant: 'destructive',
      });
      return false;
    }

    setSubmitting(true);
    
    try {
      const { error } = await supabase.from('feedback').insert({
        user_id: user.id,
        workspace_id: workspace?.id || null,
        type: feedback.type,
        title: feedback.title,
        description: feedback.description,
        screenshot_url: feedback.screenshotUrl || null,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
      });

      if (error) throw error;

      toast({
        title: 'Feedback enviado!',
        description: 'Obrigado pelo teu feedback. Vamos analisá-lo em breve.',
      });

      return true;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Erro ao enviar feedback',
        description: 'Ocorreu um erro. Por favor tenta novamente.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return { submitFeedback, submitting };
}
