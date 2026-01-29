import { motion } from 'framer-motion';
import { formatDurationRange } from '@/lib/duration-utils';
import type { VideoStructure } from '@/hooks/useVideoStructure';
import { cn } from '@/lib/utils';

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
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'h-full flex flex-col items-center justify-center cursor-pointer transition-all duration-200',
        'border-r border-background/50 last:border-r-0',
        'text-white',
        colorClass
      )}
      style={{ width: `${Math.max(width, 8)}%` }}
      onClick={onClick}
      whileHover={{ scale: 1.02, zIndex: 10 }}
    >
      <span className="text-xs font-medium truncate px-1 max-w-full">
        {segment.name}
      </span>
      <span className="text-[10px] opacity-80">
        {formatDurationRange(segment.min_duration_seconds, segment.max_duration_seconds)}
      </span>
    </motion.div>
  );
}
