import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Achievement definition
 */
export interface Achievement {
    id: string;
    name: string;
    title: string;
    description: string;
    icon: string;
    badge_color: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    criteria: any;
    points: number;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    created_at: string;
}

/**
 * User's unlocked achievement
 */
export interface UserAchievement {
    id: string;
    user_id: string;
    achievement_id: string;
    unlocked_at: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    progress_data: any;
    achievement?: Achievement;
}

/**
 * Hook for managing achievements and tracking unlocks
 * 
 * @returns Achievement data and functions
 */
export function useAchievements() {
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [unlockedAchievements, setUnlockedAchievements] = useState<UserAchievement[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement | null>(null);

    /**
     * Fetch all available achievements
     */
    const fetchAchievements = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('achievements')
                .select('*')
                .order('points', { ascending: true });

            if (error) throw error;

            setAchievements((data as unknown as Achievement[]) || []);
        } catch (error) {
            console.error('Error fetching achievements:', error);
            toast.error('Failed to load achievements');
        }
    }, []);

    /**
     * Fetch user's unlocked achievements
     */
    const fetchUnlockedAchievements = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            setCurrentUserId(user.id);

            const { data, error } = await supabase
                .from('user_achievements')
                .select(`
                    *,
                    achievement:achievement_id (*)
                `)
                .eq('user_id', user.id)
                .order('unlocked_at', { ascending: false });

            if (error) throw error;

            setUnlockedAchievements((data as unknown as UserAchievement[]) || []);
        } catch (error) {
            console.error('Error fetching unlocked achievements:', error);
            toast.error('Failed to load unlocked achievements');
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Check if an achievement is unlocked
     * 
     * @param achievementId - ID of the achievement
     * @returns True if unlocked
     */
    const isAchievementUnlocked = useCallback((achievementId: string): boolean => {
        return unlockedAchievements.some(ua => ua.achievement_id === achievementId);
    }, [unlockedAchievements]);

    /**
     * Get total points earned
     */
    const getTotalPoints = useCallback((): number => {
        return unlockedAchievements.reduce((total, ua) => {
            return total + (ua.achievement?.points || 0);
        }, 0);
    }, [unlockedAchievements]);

    /**
     * Get achievements by rarity
     * 
     * @param rarity - Rarity level
     * @returns Filtered achievements
     */
    const getAchievementsByRarity = useCallback((
        rarity: 'common' | 'rare' | 'epic' | 'legendary'
    ): Achievement[] => {
        return achievements.filter(a => a.rarity === rarity);
    }, [achievements]);

    /**
     * Get next achievement to unlock (lowest points not yet unlocked)
     */
    const getNextAchievement = useCallback((): Achievement | null => {
        const locked = achievements.filter(a => !isAchievementUnlocked(a.id));
        return locked.length > 0 ? locked[0] : null;
    }, [achievements, isAchievementUnlocked]);

    /**
     * Get recently unlocked achievements (last 5)
     */
    const getRecentlyUnlocked = useCallback((): UserAchievement[] => {
        return unlockedAchievements.slice(0, 5);
    }, [unlockedAchievements]);

    /**
     * Get achievement statistics
     */
    const getStats = useCallback(() => {
        const totalAchievements = achievements.length;
        const unlockedCount = unlockedAchievements.length;
        const totalPoints = getTotalPoints();
        const completionPercentage = totalAchievements > 0
            ? Math.round((unlockedCount / totalAchievements) * 100)
            : 0;

        const byRarity = {
            common: unlockedAchievements.filter(ua => ua.achievement?.rarity === 'common').length,
            rare: unlockedAchievements.filter(ua => ua.achievement?.rarity === 'rare').length,
            epic: unlockedAchievements.filter(ua => ua.achievement?.rarity === 'epic').length,
            legendary: unlockedAchievements.filter(ua => ua.achievement?.rarity === 'legendary').length,
        };

        return {
            totalAchievements,
            unlockedCount,
            totalPoints,
            completionPercentage,
            byRarity,
        };
    }, [achievements, unlockedAchievements, getTotalPoints]);

    /**
     * Show achievement unlock notification
     * 
     * @param achievement - The unlocked achievement
     */
    const showUnlockNotification = useCallback((achievement: Achievement) => {
        setNewlyUnlocked(achievement);
        toast.success(`Achievement Unlocked: ${achievement.title}! 🎉`);
    }, []);

    /**
     * Clear newly unlocked achievement (after showing modal)
     */
    const clearNewlyUnlocked = useCallback(() => {
        setNewlyUnlocked(null);
    }, []);

    // Fetch data on mount
    useEffect(() => {
        fetchAchievements();
        fetchUnlockedAchievements();
    }, [fetchAchievements, fetchUnlockedAchievements]);

    // Subscribe to real-time achievement unlocks
    useEffect(() => {
        if (!currentUserId) return;

        const channel = supabase
            .channel(`achievements:${currentUserId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'user_achievements',
                    filter: `user_id=eq.${currentUserId}`,
                },
                async (payload) => {
                    // Fetch the achievement details
                    const { data: achievement } = await supabase
                        .from('achievements')
                        .select('*')
                        .eq('id', payload.new.achievement_id)
                        .single();

                    if (achievement) {
                        showUnlockNotification(achievement as unknown as Achievement);
                        fetchUnlockedAchievements();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUserId, fetchUnlockedAchievements, showUnlockNotification]);

    return {
        achievements,
        unlockedAchievements,
        loading,
        newlyUnlocked,
        isAchievementUnlocked,
        getTotalPoints,
        getAchievementsByRarity,
        getNextAchievement,
        getRecentlyUnlocked,
        getStats,
        clearNewlyUnlocked,
        refetch: () => {
            fetchAchievements();
            fetchUnlockedAchievements();
        },
    };
}
