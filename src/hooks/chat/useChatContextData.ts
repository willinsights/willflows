import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

import { logger } from '@/lib/logger';
export interface ProjectTeamMember {
  id: string;
  user_id: string;
  phase: string;
  profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  } | null;
}

export interface OpenTask {
  id: string;
  title: string;
  priority: string;
  due_date: string | null;
}

export interface SharedLink {
  url: string;
  userName: string;
  createdAt: string;
}

export interface SharedFile {
  id: string;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  file_size: number | null;
  userName: string;
  createdAt: string;
}

/**
 * Fetches project-specific data shown in the chat context panel:
 * team, open tasks, shared links (extracted from messages) and attachments.
 *
 * Extracted from ChatContextPanel for maintainability. Behavior preserved 1:1.
 */
export function useChatContextData(params: {
  enabled: boolean;
  projectId: string | undefined;
  conversationId: string | undefined;
}) {
  const { enabled, projectId, conversationId } = params;
  const [projectTeam, setProjectTeam] = useState<ProjectTeamMember[]>([]);
  const [openTasks, setOpenTasks] = useState<OpenTask[]>([]);
  const [sharedLinks, setSharedLinks] = useState<SharedLink[]>([]);
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(false);

  useEffect(() => {
    if (!enabled || !projectId || !conversationId) return;

    let cancelled = false;
    const fetchProjectData = async () => {
      setLoadingExtras(true);
      try {
        const { data: teamData } = await supabase
          .from('project_team')
          .select('id, user_id, phase')
          .eq('project_id', projectId);

        if (teamData && teamData.length > 0) {
          const userIds = teamData.map((t) => t.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, email')
            .in('id', userIds);

          const profilesMap: Record<string, any> = {};
          (profiles || []).forEach((p) => {
            profilesMap[p.id] = p;
          });

          if (!cancelled) {
            setProjectTeam(
              teamData.map((t) => ({
                ...t,
                profile: profilesMap[t.user_id] || null,
              }))
            );
          }
        } else if (!cancelled) {
          setProjectTeam([]);
        }

        const { data: tasksData } = await supabase
          .from('tasks')
          .select('id, title, priority, due_date')
          .eq('project_id', projectId)
          .eq('is_completed', false)
          .order('priority', { ascending: false })
          .limit(5);

        if (!cancelled) setOpenTasks(tasksData || []);

        const { data: messagesData } = await supabase
          .from('messages')
          .select('id, body, user_id, created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(100);

        const msgUserIds = [...new Set((messagesData || []).map((m) => m.user_id))];
        const msgProfilesMap: Record<string, string> = {};
        if (msgUserIds.length > 0) {
          const { data: msgProfiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', msgUserIds);
          (msgProfiles || []).forEach((p) => {
            msgProfilesMap[p.id] = p.full_name || 'Utilizador';
          });
        }

        const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
        const links: SharedLink[] = [];
        (messagesData || []).forEach((msg) => {
          const urls = msg.body.match(urlRegex) || [];
          urls.forEach((url) => {
            if (!links.some((l) => l.url === url)) {
              links.push({
                url,
                userName: msgProfilesMap[msg.user_id] || 'Utilizador',
                createdAt: msg.created_at,
              });
            }
          });
        });
        if (!cancelled) setSharedLinks(links.slice(0, 10));

        const { data: attachmentsData } = await supabase
          .from('message_attachments')
          .select('id, file_name, file_path, mime_type, file_size, message_id, created_at')
          .in('message_id', (messagesData || []).map((m) => m.id))
          .order('created_at', { ascending: false })
          .limit(10);

        const msgMap: Record<string, any> = {};
        (messagesData || []).forEach((m) => {
          msgMap[m.id] = m;
        });

        if (!cancelled) {
          setSharedFiles(
            (attachmentsData || []).map((a) => ({
              ...a,
              userName: msgProfilesMap[msgMap[a.message_id]?.user_id] || 'Utilizador',
              createdAt: a.created_at || '',
            }))
          );
        }
      } catch (error) {
        logger.error('Error fetching project data:', error);
      } finally {
        if (!cancelled) setLoadingExtras(false);
      }
    };

    fetchProjectData();
    return () => {
      cancelled = true;
    };
  }, [enabled, projectId, conversationId]);

  return { projectTeam, openTasks, sharedLinks, sharedFiles, loadingExtras };
}
