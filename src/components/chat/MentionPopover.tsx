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
        <div ref={ref} className="w-64 p-3 rounded-lg border border-border bg-popover shadow-lg">
          <p className="text-sm text-muted-foreground">Nenhum membro encontrado</p>
        </div>
      );
    }

    return (
      <div
        ref={(node) => {
          listRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        className="w-64 max-h-52 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg"
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
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(member);
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                'hover:bg-primary/10 focus:bg-primary/10 focus:outline-none',
                index === selectedIndex && 'bg-primary/15'
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback className={cn('text-xs font-medium text-white', avatarColor)}>
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
);

MentionPopover.displayName = 'MentionPopover';
