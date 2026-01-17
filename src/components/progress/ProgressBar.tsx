import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
    value: number; // 0-100
    label?: string;
    showPercentage?: boolean;
    variant?: 'primary' | 'success' | 'warning' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    animated?: boolean;
    className?: string;
}

/**
 * Enhanced progress bar with labels, percentages, and color variants
 */
export default function ProgressBar({
    value,
    label,
    showPercentage = true,
    variant = 'primary',
    size = 'md',
    animated = true,
    className,
}: ProgressBarProps) {
    const sizeClasses = {
        sm: 'h-2',
        md: 'h-4',
        lg: 'h-6',
    };

    const variantClasses = {
        primary: '[&>div]:bg-primary',
        success: '[&>div]:bg-green-500',
        warning: '[&>div]:bg-yellow-500',
        danger: '[&>div]:bg-red-500',
    };

    const clampedValue = Math.min(100, Math.max(0, value));

    return (
        <div className={cn('w-full space-y-2', className)}>
            {(label || showPercentage) && (
                <div className="flex items-center justify-between text-sm">
                    {label && <span className="font-medium">{label}</span>}
                    {showPercentage && (
                        <span className="text-muted-foreground">
                            {Math.round(clampedValue)}%
                        </span>
                    )}
                </div>
            )}

            <Progress
                value={clampedValue}
                className={cn(
                    sizeClasses[size],
                    variantClasses[variant],
                    animated && 'transition-all duration-500 ease-out',
                    'relative overflow-hidden'
                )}
            />
        </div>
    );
}
