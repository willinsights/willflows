import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { MessageSquare, Plus, Pencil, Trash2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { cn } from '@/lib/utils';
import { projectCommentSchema, validateWithSchema } from '@/lib/validation-schemas';

interface ProjectComment {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface ProjectCommentsTabProps {
  projectId: string;
  workspaceId: string;
}

export function ProjectCommentsTab({ projectId, workspaceId }: ProjectCommentsTabProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { members } = useWorkspaceMembers();
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [projectId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('project_comments')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMember = (userId: string) => {
    return members.find(m => m.user_id === userId);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;
    
    // Validate comment data
    const validation = validateWithSchema(projectCommentSchema, {
      content: newComment,
      project_id: projectId,
    });
    
    if (!validation.success) {
      toast({ title: 'Dados inválidos', description: validation.error, variant: 'destructive' });
      return;
    }
    
    setSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('project_comments')
        .insert({
          project_id: projectId,
          user_id: user.id,
          content: validation.data.content,
        })
        .select()
        .single();

      if (error) throw error;

      setComments(prev => [...prev, data]);
      setNewComment('');
      toast({ title: 'Comentário adicionado' });
    } catch (error: any) {
      toast({ title: 'Erro ao adicionar comentário', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (comment: ProjectComment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    
    // Validate edit data
    const validation = validateWithSchema(projectCommentSchema, {
      content: editContent,
      project_id: projectId,
    });
    
    if (!validation.success) {
      toast({ title: 'Dados inválidos', description: validation.error, variant: 'destructive' });
      return;
    }
    
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('project_comments')
        .update({ content: validation.data.content })
        .eq('id', editingId);

      if (error) throw error;

      setComments(prev => 
        prev.map(c => c.id === editingId ? { ...c, content: validation.data.content, updated_at: new Date().toISOString() } : c)
      );
      setEditingId(null);
      setEditContent('');
      toast({ title: 'Comentário atualizado' });
    } catch (error: any) {
      toast({ title: 'Erro ao editar comentário', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleDelete = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('project_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      setComments(prev => prev.filter(c => c.id !== commentId));
      toast({ title: 'Comentário removido' });
    } catch (error: any) {
      toast({ title: 'Erro ao remover comentário', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comments list */}
      {comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) => {
            const member = getMember(comment.user_id);
            const isOwner = user?.id === comment.user_id;
            const isEditing = editingId === comment.id;

            return (
              <div key={comment.id} className="flex gap-3 group">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={member?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {(member?.full_name || member?.email || 'U').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {member?.full_name || member?.email || 'Utilizador'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.created_at), "dd MMM 'às' HH:mm", { locale: pt })}
                    </span>
                    {comment.updated_at !== comment.created_at && (
                      <span className="text-xs text-muted-foreground">(editado)</span>
                    )}
                  </div>
                  
                  {isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[80px]"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit} disabled={submitting}>
                          Salvar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap flex-1">
                        {comment.content}
                      </p>
                      
                      {isOwner && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEdit(comment)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(comment.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum comentário ainda</p>
        </div>
      )}

      {/* Add new comment */}
      <div className="border-t pt-4 space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Escreva um comentário..."
          className="min-h-[80px]"
        />
        <div className="flex justify-end">
          <Button 
            size="sm" 
            onClick={handleAddComment} 
            disabled={!newComment.trim() || submitting}
          >
            <Send className="h-4 w-4 mr-2" />
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
