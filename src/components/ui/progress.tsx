import * as React from 'react';
import { cn } from '../../lib/utils';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number; // 0-100
  indicatorClassName?: string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, indicatorClassName, ...props }, ref) => (
    <div ref={ref} className={cn('relative h-2 w-full overflow-hidden rounded-sm bg-black/30 border border-border', className)} {...props}>
      <div
        className={cn('h-full bg-gradient-to-r from-gold/60 via-gold to-yellow-200 transition-all duration-500', indicatorClassName)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  ),
);
Progress.displayName = 'Progress';

export { Progress };
