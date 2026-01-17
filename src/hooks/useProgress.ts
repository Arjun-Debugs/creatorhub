import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Progress data for a lesson
 */
interface LessonProgress {
    id: string;
    user_id: string;
    course_id: string;
    module_id: string | null;
    lesson_id: string;
    completed: boolean;
    progress_percentage: number;
    time_spent_seconds: number;
    last_accessed_at: string;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Aggregated progress statistics
 */
interface ProgressStats {
    totalLessons: number;
    completedLessons: number;
    totalTimeSpent: number;
    completionPercentage: number;
    lastAccessedAt: string | null;
}

/**
 * Main hook for progress tracking across lessons, modules, and courses
 * 
 * @param courseId - Optional course ID to filter progress
 * @returns Progress data and functions to update progress
 */
export function useProgress(courseId?: string) {
    const [progress, setProgress] = useState<LessonProgress[]>([]);
    const [stats, setStats] = useState<ProgressStats>({
        totalLessons: 0,
        completedLessons: 0,
        totalTimeSpent: 0,
        completionPercentage: 0,
        lastAccessedAt: null,
    });
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    /**
     * Fetch user's progress data
     */
    const fetchProgress = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            setCurrentUserId(user.id);

            let query = supabase
                .from('course_progress')
                .select('*')
                .eq('user_id', user.id);

            if (courseId) {
                query = query.eq('course_id', courseId);
            }

            const { data, error } = await query.order('last_accessed_at', { ascending: false });

            if (error) throw error;

            setProgress(data || []);

            // Calculate stats
            const completed = data?.filter(p => p.completed) || [];
            const totalTime = data?.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0) || 0;
            const percentage = data && data.length > 0
                ? Math.round((completed.length / data.length) * 100)
                : 0;

            setStats({
                totalLessons: data?.length || 0,
                completedLessons: completed.length,
                totalTimeSpent: totalTime,
                completionPercentage: percentage,
                lastAccessedAt: data?.[0]?.last_accessed_at || null,
            });
        } catch (error) {
            console.error('Error fetching progress:', error);
            toast.error('Failed to load progress data');
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    /**
     * Mark a lesson as complete
     * 
     * @param lessonId - ID of the lesson to mark complete
     * @param timeSpent - Time spent on the lesson in seconds
     * @returns The updated progress record
     */
    const markLessonComplete = useCallback(async (
        lessonId: string,
        timeSpent: number = 0
    ): Promise<LessonProgress | null> => {
        try {
            const { data, error } = await supabase.rpc('update_lesson_progress', {
                p_lesson_id: lessonId,
                p_completed: true,
                p_time_spent: timeSpent,
            });

            if (error) throw error;

            toast.success('Lesson completed! 🎉');
            await fetchProgress(); // Refresh progress data
            return data;
        } catch (error) {
            console.error('Error marking lesson complete:', error);
            toast.error('Failed to update progress');
            return null;
        }
    }, [fetchProgress]);

    /**
     * Update lesson progress without marking as complete
     * 
     * @param lessonId - ID of the lesson
     * @param timeSpent - Time spent on the lesson in seconds
     */
    const updateLessonProgress = useCallback(async (
        lessonId: string,
        timeSpent: number = 0
    ): Promise<void> => {
        try {
            await supabase.rpc('update_lesson_progress', {
                p_lesson_id: lessonId,
                p_completed: false,
                p_time_spent: timeSpent,
            });

            await fetchProgress();
        } catch (error) {
            console.error('Error updating lesson progress:', error);
        }
    }, [fetchProgress]);

    /**
     * Get progress for a specific lesson
     * 
     * @param lessonId - ID of the lesson
     * @returns Progress data for the lesson or null
     */
    const getLessonProgress = useCallback((lessonId: string): LessonProgress | null => {
        return progress.find(p => p.lesson_id === lessonId) || null;
    }, [progress]);

    /**
     * Get progress for a specific module
     * 
     * @param moduleId - ID of the module
     * @returns Aggregated progress stats for the module
     */
    const getModuleProgress = useCallback((moduleId: string): ProgressStats => {
        const moduleProgress = progress.filter(p => p.module_id === moduleId);
        const completed = moduleProgress.filter(p => p.completed);
        const totalTime = moduleProgress.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0);
        const percentage = moduleProgress.length > 0
            ? Math.round((completed.length / moduleProgress.length) * 100)
            : 0;

        return {
            totalLessons: moduleProgress.length,
            completedLessons: completed.length,
            totalTimeSpent: totalTime,
            completionPercentage: percentage,
            lastAccessedAt: moduleProgress[0]?.last_accessed_at || null,
        };
    }, [progress]);

    /**
     * Get progress for a specific course
     * 
     * @param courseId - ID of the course
     * @returns Aggregated progress stats for the course
     */
    const getCourseProgress = useCallback((courseId: string): ProgressStats => {
        const courseProgress = progress.filter(p => p.course_id === courseId);
        const completed = courseProgress.filter(p => p.completed);
        const totalTime = courseProgress.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0);
        const percentage = courseProgress.length > 0
            ? Math.round((completed.length / courseProgress.length) * 100)
            : 0;

        return {
            totalLessons: courseProgress.length,
            completedLessons: completed.length,
            totalTimeSpent: totalTime,
            completionPercentage: percentage,
            lastAccessedAt: courseProgress[0]?.last_accessed_at || null,
        };
    }, [progress]);

    /**
     * Check if a lesson is completed
     * 
     * @param lessonId - ID of the lesson
     * @returns True if lesson is completed
     */
    const isLessonCompleted = useCallback((lessonId: string): boolean => {
        const lessonProgress = progress.find(p => p.lesson_id === lessonId);
        return lessonProgress?.completed || false;
    }, [progress]);

    // Fetch progress on mount and when courseId changes
    useEffect(() => {
        fetchProgress();
    }, [fetchProgress]);

    // Subscribe to real-time progress updates
    useEffect(() => {
        if (!currentUserId) return;

        const channel = supabase
            .channel(`progress:${currentUserId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'course_progress',
                    filter: `user_id=eq.${currentUserId}`,
                },
                () => {
                    fetchProgress();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUserId, fetchProgress]);

    return {
        progress,
        stats,
        loading,
        markLessonComplete,
        updateLessonProgress,
        getLessonProgress,
        getModuleProgress,
        getCourseProgress,
        isLessonCompleted,
        refetch: fetchProgress,
    };
}
