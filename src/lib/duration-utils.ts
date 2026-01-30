/**
 * Duration utilities for video structure timeline
 */

/**
 * Format seconds to professional SMPTE-style timecode
 * @example formatTimecode(5) => "00:05"
 * @example formatTimecode(90) => "01:30"
 * @example formatTimecode(3665) => "01:01:05"
 */
export function formatTimecode(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  
  // Compact format for videos under 1 hour
  if (hours === 0) {
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export interface VideoStructureSegment {
  id: string;
  name: string;
  description?: string | null;
  min_duration_seconds: number;
  max_duration_seconds?: number | null;
  position: number;
  notes?: string | null;
}

/**
 * Format seconds to a readable duration string
 * @example formatDuration(5) => "5s"
 * @example formatDuration(90) => "1m 30s"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Format duration range
 * @example formatDurationRange(5, null) => "5s"
 * @example formatDurationRange(4, 6) => "4-6s"
 * @example formatDurationRange(60, 90) => "1m-1m 30s"
 */
export function formatDurationRange(min: number, max: number | null | undefined): string {
  if (!max || max === min) {
    return formatDuration(min);
  }
  
  // For simple seconds ranges, use simplified format
  if (min < 60 && max < 60) {
    return `${min}-${max}s`;
  }
  
  return `${formatDuration(min)} - ${formatDuration(max)}`;
}

/**
 * Calculate total duration of all segments
 * Returns min and max bounds
 */
export function calculateTotalDuration(segments: VideoStructureSegment[]): { min: number; max: number } {
  let totalMin = 0;
  let totalMax = 0;
  
  for (const segment of segments) {
    totalMin += segment.min_duration_seconds;
    totalMax += segment.max_duration_seconds || segment.min_duration_seconds;
  }
  
  return { min: totalMin, max: totalMax };
}

/**
 * Calculate the width percentage of a segment on the timeline
 * Based on its average duration relative to total
 */
export function calculateSegmentWidth(segment: VideoStructureSegment, totalMax: number): number {
  if (totalMax === 0) return 0;
  
  const segmentAvg = segment.max_duration_seconds 
    ? (segment.min_duration_seconds + segment.max_duration_seconds) / 2
    : segment.min_duration_seconds;
  
  return (segmentAvg / totalMax) * 100;
}

/**
 * Generate time markers for the timeline
 * @param totalSeconds - Total duration in seconds
 * @param count - Number of markers to generate
 */
export function generateTimeMarkers(totalSeconds: number, count: number = 5): string[] {
  if (totalSeconds === 0 || count < 2) return [];
  
  const markers: string[] = [];
  const interval = totalSeconds / (count - 1);
  
  for (let i = 0; i < count; i++) {
    const time = Math.round(interval * i);
    markers.push(formatDuration(time));
  }
  
  return markers;
}

/**
 * Format total duration for display
 * @example formatTotalDuration({ min: 53, max: 65 }) => "53-65 segundos"
 * @example formatTotalDuration({ min: 60, max: 60 }) => "1 minuto"
 */
export function formatTotalDuration(duration: { min: number; max: number }): string {
  if (duration.min === duration.max) {
    if (duration.min < 60) {
      return `${duration.min} segundo${duration.min !== 1 ? 's' : ''}`;
    }
    const minutes = Math.floor(duration.min / 60);
    const seconds = duration.min % 60;
    if (seconds === 0) {
      return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    }
    return `${minutes}m ${seconds}s`;
  }
  
  // Range
  if (duration.max < 60) {
    return `${duration.min}-${duration.max} segundos`;
  }
  
  return `${formatDuration(duration.min)} - ${formatDuration(duration.max)}`;
}
