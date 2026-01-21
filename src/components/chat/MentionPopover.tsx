import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export interface MentionMember {
  id: string;
  user_id?: string;
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

// Cores dinâmicas para avatares - baseadas na imagem de referência
const AVATAR_COLORS = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-teal-500',
];

function getAvatarColor(identifier: string): string {
  const hash = identifier.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export const MentionPopover = React.forwardRef<HTMLDivElement, MentionPopoverProps>(
  ({ members, filter, onSelect, onClose, selectedIndex }, ref) => {
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
        <div ref={ref} className="w-80 p-4 rounded-xl border border-border/50 bg-popover shadow-xl">
          <p className="text-sm text-muted-foreground">Nenhum membro encontrado</p>
        </div>
      );
    }

    return (
      <div
        ref={(node) => {
          // Merge refs
          listRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        className="w-80 max-h-64 overflow-y-auto rounded-xl border border-border/50 bg-popover shadow-xl"
      >
        {filteredMembers.map((member, index) => {
          const initials =
            member.full_name
              ?.split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || '??';
          
          const avatarColor = getAvatarColor(member.id || member.user_id || member.email || 'default');

          return (
            <button
              key={member.id || member.user_id}
              onClick={() => onSelect(member)}
              className={cn(
                'w-full flex items-center gap-4 px-4 py-3 text-left transition-all duration-150',
                'hover:bg-muted/60 focus:bg-muted/60 focus:outline-none',
                index === selectedIndex && 'bg-muted/80 border-l-2 border-primary'
              )}
            >
              <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback className={cn('text-sm font-semibold text-white', avatarColor)}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">
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
);

MentionPopover.displayName = 'MentionPopover';
