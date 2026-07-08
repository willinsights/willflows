import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Loading effect variant.
   * - `shimmer` (default): gradient sweep using the `.shimmer` design-system class
   * - `pulse`: fallback plain pulse for cases where shimmer contrasts badly
   *
   * Both variants shorten to near-instant when the user has
   * `prefers-reduced-motion: reduce` (handled globally in index.css).
   */
  variant?: "shimmer" | "pulse";
}

function Skeleton({ className, variant = "shimmer", ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md",
        variant === "shimmer" ? "shimmer" : "animate-pulse bg-muted",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
