import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ReactionUsersPopoverProps {
  emoji: string;
  userIds: string[];
  onToggle: () => void;
  reactedByMe: boolean;
  count: number;
}

export function ReactionUsersPopover({ 
  emoji, 
  userIds, 
  onToggle, 
  reactedByMe, 
  count 
}: ReactionUsersPopoverProps) {
  // Fetch user profiles for the reaction
  const { data: users = [] } = useQuery({
    queryKey: ['reaction-users', userIds.join(',')],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', userIds);
      
      return (data || []).map(u => ({
        user_id: u.id,
        full_name: u.full_name || u.email?.split('@')[0] || 'Utilizador',
        avatar_url: u.avatar_url,
      }));
    },
    enabled: userIds.length > 0,
    staleTime: 60000,
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all',
            reactedByMe
              ? 'bg-primary/15 text-primary border border-primary/20 hover:bg-primary/20'
              : 'bg-muted hover:bg-muted/80 border border-transparent'
          )}
        >
          <span>{emoji}</span>
          <span className="font-medium">{count}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="text-sm font-medium mb-2 flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <span>{count} {count === 1 ? 'reação' : 'reações'}</span>
        </div>
        <ScrollArea className="max-h-48">
          <div className="space-y-1">
            {users.map((u) => (
              <div key={u.user_id} className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-muted/50">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={u.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {u.full_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm truncate">{u.full_name}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onToggle} 
          className="w-full mt-2 h-8"
        >
          {reactedByMe ? 'Remover reação' : 'Reagir também'}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
