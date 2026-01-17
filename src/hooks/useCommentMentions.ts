import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { extractMentions } from '@/lib/markdown';

interface User {
    id: string;
    name: string;
    email: string;
}

export function useCommentMentions(lessonId: string) {
    const [enrolledUsers, setEnrolledUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch enrolled users for autocomplete
    const fetchEnrolledUsers = useCallback(async () => {
        try {
            setLoading(true);

            // Get course_id from lesson
            const { data: lesson } = await supabase
                .from('lessons')
                .select('course_id')
                .eq('id', lessonId)
                .single();

            if (!lesson) return;

            // Get enrolled users
            const { data: enrollments } = await supabase
                .from('enrollments')
                .select(`
          user_id,
          profiles:user_id (
            id,
            name,
            email
          )
        `)
                .eq('course_id', lesson.course_id);

            if (enrollments) {
                const users = enrollments
                    .map(e => e.profiles)
                    .filter(Boolean) as User[];
                setEnrolledUsers(users);
            }
        } catch (error) {
            console.error('Error fetching enrolled users:', error);
        } finally {
            setLoading(false);
        }
    }, [lessonId]);

    // Create mention records in database
    const createMentions = useCallback(async (commentId: string, content: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const mentionedNames = extractMentions(content);
            if (mentionedNames.length === 0) return;

            // Find user IDs for mentioned names
            const mentionedUsers = enrolledUsers.filter(u =>
                mentionedNames.includes(u.name)
            );

            if (mentionedUsers.length === 0) return;

            // Create mention records
            const mentions = mentionedUsers.map(mentionedUser => ({
                comment_id: commentId,
                mentioned_user_id: mentionedUser.id,
                mentioner_user_id: user.id,
            }));

            const { error } = await supabase
                .from('comment_mentions')
                .insert(mentions);

            if (error) throw error;
        } catch (error) {
            console.error('Error creating mentions:', error);
        }
    }, [enrolledUsers]);

    // Search users for autocomplete
    const searchUsers = useCallback((query: string): User[] => {
        if (!query) return enrolledUsers;

        const lowerQuery = query.toLowerCase();
        return enrolledUsers.filter(user =>
            user.name.toLowerCase().includes(lowerQuery) ||
            user.email.toLowerCase().includes(lowerQuery)
        );
    }, [enrolledUsers]);

    useEffect(() => {
        fetchEnrolledUsers();
    }, [fetchEnrolledUsers]);

    return {
        enrolledUsers,
        loading,
        createMentions,
        searchUsers,
        refetch: fetchEnrolledUsers,
    };
}
