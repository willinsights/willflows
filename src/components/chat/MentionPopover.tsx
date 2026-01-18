import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export interface MentionMember {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  email?: string;
}

interface MentionPopoverProps {
  members: MentionMember[];
  filter: string;
  onSelect: (member: MentionMember) => void;
  onClose: () => void;
  selectedIndex: number;
}

export function MentionPopover({
  members,
  filter,
  onSelect,
  onClose,
  selectedIndex,
}: MentionPopoverProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Filter members by name or email
  const filteredMembers = members.filter((m) => {
    const searchTerm = filter.toLowerCase();
    const name = m.full_name?.toLowerCase() || '';
    const email = m.email?.toLowerCase() || '';
    return name.includes(searchTerm) || email.includes(searchTerm);
  });

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const selectedItem = listRef.current.children[selectedIndex] as HTMLElement;
      selectedItem?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (filteredMembers.length === 0) {
    return (
      <div className="absolute bottom-full left-0 mb-2 w-64 p-3 rounded-lg border border-border bg-popover shadow-lg z-50">
        <p className="text-sm text-muted-foreground">Nenhum membro encontrado</p>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-0 mb-2 w-64 max-h-48 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg z-50"
    >
      {filteredMembers.map((member, index) => {
        const initials =
          member.full_name
            ?.split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || '??';

        return (
          <button
            key={member.user_id}
            onClick={() => onSelect(member)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
              'hover:bg-muted focus:bg-muted focus:outline-none',
              index === selectedIndex && 'bg-muted'
            )}
          >
            <Avatar className="h-7 w-7">
              <AvatarImage src={member.avatar_url || undefined} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {member.full_name || 'Utilizador'}
              </p>
              {member.email && (
                <p className="text-xs text-muted-foreground truncate">
                  {member.email}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
