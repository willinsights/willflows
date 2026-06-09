import { memo } from 'react';
import { MessageSquareText } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useOpenVideoCommentsByProject } from '@/hooks/useOpenVideoCommentsByProject';
import { cn } from '@/lib/utils';

interface KanbanVideoCommentsIndicatorProps {
  projectId: string;
}

function KanbanVideoCommentsIndicatorComponent({ projectId }: KanbanVideoCommentsIndicatorProps) {
  const map = useOpenVideoCommentsByProject();
  const count = map.get(projectId) || 0;

  if (count === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative flex items-center">
            <MessageSquareText className="h-3 w-3 text-amber-500" />
            <span
              className={cn(
                'absolute -top-1 -right-1.5 flex h-3 w-3 items-center justify-center',
                'rounded-full bg-amber-500 text-[7px] font-bold text-white',
              )}
            >
              {count > 9 ? '9+' : count}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[10px] px-2 py-1">
          <p>{count} {count === 1 ? 'comentário de vídeo por resolver' : 'comentários de vídeo por resolver'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const KanbanVideoCommentsIndicator = memo(KanbanVideoCommentsIndicatorComponent);
