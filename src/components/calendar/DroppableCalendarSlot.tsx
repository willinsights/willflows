import { useDroppable } from '@dnd-kit/core';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DroppableCalendarSlotProps {
  id: string;
  date: Date;
  hour?: number;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function DroppableCalendarSlot({ 
  id, 
  date, 
  hour,
  children, 
  className,
  onClick 
}: DroppableCalendarSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { date, hour },
  });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        className,
        isOver && 'bg-primary/20 ring-2 ring-primary ring-inset'
      )}
    >
      {children}
    </div>
  );
}
