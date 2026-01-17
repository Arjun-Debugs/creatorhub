import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Lock, Star } from 'lucide-react';
import { useAchievements } from '@/hooks/useAchievements';
import AchievementBadge from './AchievementBadge';

type FilterType = 'all' | 'unlocked' | 'locked';
type SortType = 'rarity' | 'points' | 'recent';

/**
 * Grid display of all achievements with filtering and sorting
 */
export default function AchievementBadges() {
    const { achievements, unlockedAchievements, loading, getTotalPoints, getStats } = useAchievements();
    const [filter, setFilter] = useState<FilterType>('all');
    const [sort, setSort] = useState<SortType>('rarity');

    const stats = getStats();
    const totalPoints = getTotalPoints();

    // Create a map of unlocked achievements for quick lookup
    const unlockedMap = new Map(
        unlockedAchievements.map(ua => [ua.achievement_id, ua.unlocked_at])
    );

    // Filter achievements
    const filteredAchievements = achievements.filter(achievement => {
        if (filter === 'unlocked') return unlockedMap.has(achievement.id);
        if (filter === 'locked') return !unlockedMap.has(achievement.id);
        return true;
    });

    // Sort achievements
    const sortedAchievements = [...filteredAchievements].sort((a, b) => {
        if (sort === 'rarity') {
            const rarityOrder = { common: 0, rare: 1, epic: 2, legendary: 3 };
            return rarityOrder[b.rarity] - rarityOrder[a.rarity];
        }
        if (sort === 'points') {
            return b.points - a.points;
        }
        if (sort === 'recent') {
            const aUnlocked = unlockedMap.get(a.id);
            const bUnlocked = unlockedMap.get(b.id);
            if (!aUnlocked && !bUnlocked) return 0;
            if (!aUnlocked) return 1;
            if (!bUnlocked) return -1;
            return new Date(bUnlocked).getTime() - new Date(aUnlocked).getTime();
        }
        return 0;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                    <Trophy className="h-12 w-12 mx-auto text-muted-foreground animate-pulse" />
                    <p className="text-muted-foreground">Loading achievements...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Header */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-card border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Trophy className="h-4 w-4 text-primary" />
                        <span className="text-sm text-muted-foreground">Total Points</span>
                    </div>
                    <p className="text-2xl font-bold">{totalPoints}</p>
                </div>

                <div className="bg-card border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Star className="h-4 w-4 text-amber-500" />
                        <span className="text-sm text-muted-foreground">Unlocked</span>
                    </div>
                    <p className="text-2xl font-bold">
                        {stats.unlockedCount} / {stats.totalAchievements}
                    </p>
                </div>

                <div className="bg-card border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Completion</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.completionPercentage}%</p>
                </div>

                <div className="bg-card border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-muted-foreground">By Rarity</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                            L: {stats.byRarity.legendary}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                            E: {stats.byRarity.epic}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                            R: {stats.byRarity.rare}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                            C: {stats.byRarity.common}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Filters and Sort */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
                    <TabsList>
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="unlocked">Unlocked</TabsTrigger>
                        <TabsTrigger value="locked">Locked</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex gap-2">
                    <Button
                        variant={sort === 'rarity' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSort('rarity')}
                    >
                        Rarity
                    </Button>
                    <Button
                        variant={sort === 'points' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSort('points')}
                    >
                        Points
                    </Button>
                    <Button
                        variant={sort === 'recent' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSort('recent')}
                    >
                        Recent
                    </Button>
                </div>
            </div>

            {/* Achievement Grid */}
            {sortedAchievements.length === 0 ? (
                <div className="text-center py-12">
                    <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No achievements found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {sortedAchievements.map((achievement) => (
                        <AchievementBadge
                            key={achievement.id}
                            achievement={achievement}
                            unlocked={unlockedMap.has(achievement.id)}
                            unlockedAt={unlockedMap.get(achievement.id)}
                            size="md"
                            showDetails={true}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
