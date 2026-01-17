import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { Achievement } from '@/hooks/useAchievements';

interface AchievementBadgeProps {
    achievement: Achievement;
    unlocked?: boolean;
    unlockedAt?: string;
    size?: 'sm' | 'md' | 'lg';
    showDetails?: boolean;
    className?: string;
}

const rarityColors = {
    common: {
        bg: 'bg-gray-100 dark:bg-gray-800',
        border: 'border-gray-300 dark:border-gray-700',
        text: 'text-gray-700 dark:text-gray-300',
        glow: 'shadow-gray-500/20',
    },
    rare: {
        bg: 'bg-blue-50 dark:bg-blue-950',
        border: 'border-blue-300 dark:border-blue-700',
        text: 'text-blue-700 dark:text-blue-300',
        glow: 'shadow-blue-500/30',
    },
    epic: {
        bg: 'bg-purple-50 dark:bg-purple-950',
        border: 'border-purple-300 dark:border-purple-700',
        text: 'text-purple-700 dark:text-purple-300',
        glow: 'shadow-purple-500/40',
    },
    legendary: {
        bg: 'bg-amber-50 dark:bg-amber-950',
        border: 'border-amber-300 dark:border-amber-700',
        text: 'text-amber-700 dark:text-amber-300',
        glow: 'shadow-amber-500/50',
    },
};

const sizeClasses = {
    sm: {
        card: 'p-3',
        icon: 'text-3xl',
        title: 'text-sm',
        desc: 'text-xs',
    },
    md: {
        card: 'p-4',
        icon: 'text-4xl',
        title: 'text-base',
        desc: 'text-sm',
    },
    lg: {
        card: 'p-6',
        icon: 'text-5xl',
        title: 'text-lg',
        desc: 'text-base',
    },
};

/**
 * Individual achievement badge component
 * Shows achievement icon, title, and status (locked/unlocked)
 */
export default function AchievementBadge({
    achievement,
    unlocked = false,
    unlockedAt,
    size = 'md',
    showDetails = true,
    className,
}: AchievementBadgeProps) {
    const colors = rarityColors[achievement.rarity];
    const sizes = sizeClasses[size];

    const badge = (
        <Card
            className={cn(
                'relative transition-all duration-300',
                sizes.card,
                unlocked ? colors.bg : 'bg-muted/50',
                unlocked ? colors.border : 'border-muted',
                unlocked ? `shadow-lg ${colors.glow}` : 'opacity-60 grayscale',
                unlocked && 'hover:scale-105 hover:shadow-xl',
                className
            )}
        >
            {/* Rarity badge */}
            {unlocked && (
                <Badge
                    variant="secondary"
                    className={cn('absolute top-2 right-2 text-xs capitalize', colors.text)}
                >
                    {achievement.rarity}
                </Badge>
            )}

            <div className="flex flex-col items-center text-center space-y-2">
                {/* Icon */}
                <div className={cn(sizes.icon, unlocked ? '' : 'opacity-40')}>
                    {achievement.icon}
                </div>

                {showDetails && (
                    <>
                        {/* Title */}
                        <h3 className={cn('font-semibold', sizes.title, unlocked ? colors.text : 'text-muted-foreground')}>
                            {achievement.title}
                        </h3>

                        {/* Description */}
                        <p className={cn('text-muted-foreground', sizes.desc)}>
                            {achievement.description}
                        </p>

                        {/* Points */}
                        <div className="flex items-center gap-2 text-xs">
                            <span className={cn('font-medium', unlocked ? colors.text : 'text-muted-foreground')}>
                                {achievement.points} points
                            </span>
                        </div>

                        {/* Unlock date */}
                        {unlocked && unlockedAt && (
                            <p className="text-xs text-muted-foreground">
                                Unlocked {formatDistanceToNow(new Date(unlockedAt), { addSuffix: true })}
                            </p>
                        )}

                        {/* Locked indicator */}
                        {!unlocked && (
                            <p className="text-xs text-muted-foreground font-medium">
                                🔒 Locked
                            </p>
                        )}
                    </>
                )}
            </div>
        </Card>
    );

    if (!showDetails) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        {badge}
                    </TooltipTrigger>
                    <TooltipContent>
                        <div className="space-y-1">
                            <p className="font-semibold">{achievement.title}</p>
                            <p className="text-sm text-muted-foreground">{achievement.description}</p>
                            <p className="text-xs text-muted-foreground">{achievement.points} points</p>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return badge;
}
