import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Achievement } from '@/hooks/useAchievements';
import CompletionCelebration from '../animations/CompletionCelebration';

interface AchievementUnlockModalProps {
    achievement: Achievement | null;
    open: boolean;
    onClose: () => void;
}

const rarityColors = {
    common: 'from-gray-400 to-gray-600',
    rare: 'from-blue-400 to-blue-600',
    epic: 'from-purple-400 to-purple-600',
    legendary: 'from-amber-400 to-amber-600',
};

/**
 * Celebration modal displayed when an achievement is unlocked
 * Shows the achievement with animations and confetti
 */
export default function AchievementUnlockModal({
    achievement,
    open,
    onClose,
}: AchievementUnlockModalProps) {
    if (!achievement) return null;

    return (
        <>
            <CompletionCelebration
                trigger={open}
                type="achievement"
            />

            <Dialog open={open} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-md">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-4 top-4"
                        onClick={onClose}
                    >
                        <X className="h-4 w-4" />
                    </Button>

                    <DialogHeader>
                        <DialogTitle className="text-center text-2xl">
                            🎉 Achievement Unlocked!
                        </DialogTitle>
                        <DialogDescription className="text-center">
                            You've earned a new achievement
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center space-y-6 py-6">
                        {/* Achievement Icon with Glow */}
                        <div className="relative">
                            <div
                                className={cn(
                                    'absolute inset-0 blur-2xl opacity-50 rounded-full',
                                    `bg-gradient-to-br ${rarityColors[achievement.rarity]}`
                                )}
                            />
                            <div className="relative text-8xl animate-bounce">
                                {achievement.icon}
                            </div>
                        </div>

                        {/* Achievement Details */}
                        <div className="text-center space-y-2">
                            <Badge
                                variant="secondary"
                                className={cn(
                                    'text-sm capitalize px-3 py-1',
                                    achievement.rarity === 'legendary' && 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
                                    achievement.rarity === 'epic' && 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
                                    achievement.rarity === 'rare' && 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
                                    achievement.rarity === 'common' && 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100'
                                )}
                            >
                                {achievement.rarity}
                            </Badge>

                            <h3 className="text-2xl font-bold">
                                {achievement.title}
                            </h3>

                            <p className="text-muted-foreground max-w-sm">
                                {achievement.description}
                            </p>

                            <div className="flex items-center justify-center gap-2 pt-4">
                                <Trophy className="h-5 w-5 text-primary" />
                                <span className="text-lg font-semibold">
                                    +{achievement.points} points
                                </span>
                            </div>
                        </div>

                        {/* Action Button */}
                        <Button
                            onClick={onClose}
                            className="w-full"
                            size="lg"
                        >
                            Awesome!
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
