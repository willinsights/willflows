import { motion } from 'framer-motion';
import { formatDurationRange } from '@/lib/duration-utils';
import type { VideoStructure } from '@/hooks/useVideoStructure';
import { cn } from '@/lib/utils';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

interface TimelineSegmentProps {
  segment: VideoStructure;
  width: number;
  index: number;
  onClick: () => void;
}

// Generate segment colors based on index
const segmentColors = [
  'bg-primary/80 hover:bg-primary',
  'bg-violet-500/80 hover:bg-violet-500',
  'bg-cyan-500/80 hover:bg-cyan-500',
  'bg-emerald-500/80 hover:bg-emerald-500',
  'bg-amber-500/80 hover:bg-amber-500',
  'bg-rose-500/80 hover:bg-rose-500',
  'bg-blue-500/80 hover:bg-blue-500',
  'bg-orange-500/80 hover:bg-orange-500',
];

export function TimelineSegment({ segment, width, index, onClick }: TimelineSegmentProps) {
  const colorClass = segmentColors[index % segmentColors.length];
  const hasDetails = segment.description || segment.notes;
  
  const segmentContent = (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'h-full flex flex-col items-center justify-center cursor-pointer transition-all duration-200 relative',
        'border-r border-background/50 last:border-r-0',
        'text-white',
        colorClass
      )}
      style={{ width: `${Math.max(width, 8)}%` }}
      onClick={onClick}
      whileHover={{ scale: 1.02, zIndex: 10 }}
    >
      {/* Indicator for segments with details */}
      {hasDetails && (
        <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-white/60 rounded-full" />
      )}
      <span className="text-xs font-medium truncate px-1 max-w-full">
        {segment.name}
      </span>
      <span className="text-[10px] opacity-80">
        {formatDurationRange(segment.min_duration_seconds, segment.max_duration_seconds)}
      </span>
    </motion.div>
  );

  // If no details, just return the segment without HoverCard
  if (!hasDetails) {
    return segmentContent;
  }

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        {segmentContent}
      </HoverCardTrigger>
      <HoverCardContent className="w-72" side="top" sideOffset={8}>
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm">{segment.name}</h4>
            <p className="text-xs text-muted-foreground">
              Duração: {formatDurationRange(segment.min_duration_seconds, segment.max_duration_seconds)}
            </p>
          </div>
          
          {segment.description && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Descrição</p>
              <p className="text-sm">{segment.description}</p>
            </div>
          )}
          
          {segment.notes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Notas</p>
              <p className="text-sm text-muted-foreground">{segment.notes}</p>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
