import { Card } from '@/components/ui/card';
import { Clock, BookOpen, Trophy } from 'lucide-react';
import { useProgress } from '@/hooks/useProgress';
import ProgressBar from './ProgressBar';

interface CourseProgressProps {
    courseId: string;
    showDetails?: boolean;
}

/**
 * Displays overall course progress with statistics
 */
export default function CourseProgress({ courseId, showDetails = true }: CourseProgressProps) {
    const { getCourseProgress, loading } = useProgress(courseId);
    const progress = getCourseProgress(courseId);

    if (loading) {
        return (
            <Card className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                </div>
            </Card>
        );
    }

    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    return (
        <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Course Progress</h3>
                <Trophy className="h-5 w-5 text-primary" />
            </div>

            <ProgressBar
                value={progress.completionPercentage}
                label="Overall Completion"
                variant={progress.completionPercentage === 100 ? 'success' : 'primary'}
                size="lg"
            />

            {showDetails && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="text-sm text-muted-foreground">Lessons</p>
                            <p className="text-lg font-semibold">
                                {progress.completedLessons} / {progress.totalLessons}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="text-sm text-muted-foreground">Time Spent</p>
                            <p className="text-lg font-semibold">
                                {formatTime(progress.totalTimeSpent)}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {progress.completionPercentage === 100 && (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                    <p className="text-green-700 dark:text-green-300 font-medium">
                        🎉 Course Completed!
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                        Your certificate is ready to download
                    </p>
                </div>
            )}
        </Card>
    );
}
