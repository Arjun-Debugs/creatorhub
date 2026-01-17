import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Comment {
    id: string;
    lesson_id: string; // Changed from null check to string as it seems required in logic, though nullable in DB. Logic filters by lessonId so it should be fine.
    user_id: string;
    content: string;
    parent_comment_id: string | null;
    likes: number;     // calculated
    dislikes: number;  // calculated
    is_pinned: boolean;
    is_helpful: boolean;
    is_edited: boolean;
    is_deleted: boolean;
    edited_at: string | null; // derived or null
    created_at: string;
    profiles?: {
        name: string | null;
        email: string; // email is usually required in profiles? DB says email is string (not null) in profiles table.
    } | null;
    replies?: Comment[];
    userReaction?: 'like' | 'dislike' | null;
}

export function useLessonComments(lessonId: string) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isCreator, setIsCreator] = useState(false);

    const getCurrentUser = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || null);

        // Check if user is the course creator
        if (user) {
            const { data: lesson } = await supabase
                .from('lessons')
                .select('course_id, courses(creator_id)')
                .eq('id', lessonId)
                .single();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((lesson?.courses as any)?.creator_id === user.id) {
                setIsCreator(true);
            }
        }
    }, [lessonId]);

    const fetchComments = useCallback(async () => {
        try {
            const { data: commentsData, error } = await supabase
                .from('lesson_comments')
                .select(`
          *,
          profiles:user_id (name, email)
        `)
                .eq('lesson_id', lessonId)
                .eq('is_deleted', false)
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Fetch user reactions
            const { data: { user } } = await supabase.auth.getUser();
            let reactionsMap: Record<string, 'like' | 'dislike'> = {};

            if (user) {
                const { data: reactions } = await supabase
                    .from('comment_reactions')
                    .select('comment_id, reaction_type')
                    .eq('user_id', user.id)
                    .in('comment_id', commentsData?.map(c => c.id) || []);

                reactionsMap = (reactions || []).reduce((acc, r) => ({
                    ...acc,
                    [r.comment_id]: r.reaction_type as 'like' | 'dislike'
                }), {});
            }

            // Build threaded structure
            const commentsWithReactions: Comment[] = (commentsData || []).map(c => ({
                id: c.id,
                lesson_id: c.lesson_id || '', // Handle potential null
                user_id: c.user_id,
                content: c.content,
                parent_comment_id: c.parent_comment_id,
                likes: 0, // Placeholder
                dislikes: 0, // Placeholder
                is_pinned: c.is_pinned || false,
                is_helpful: c.is_helpful || false,
                is_edited: c.updated_at !== c.created_at,
                is_deleted: c.is_deleted || false,
                edited_at: c.updated_at !== c.created_at ? c.updated_at : null,
                created_at: c.created_at,
                profiles: c.profiles as { name: string | null; email: string; } | null, // Type cast to handle Supabase join shape
                userReaction: reactionsMap[c.id] || null,
                replies: []
            }));

            const topLevel: Comment[] = [];
            const commentMap = new Map<string, Comment>();

            commentsWithReactions.forEach(comment => {
                commentMap.set(comment.id, comment);
            });

            commentsWithReactions.forEach(comment => {
                if (comment.parent_comment_id) {
                    const parent = commentMap.get(comment.parent_comment_id);
                    if (parent) {
                        parent.replies = parent.replies || [];
                        parent.replies.push(comment);
                    }
                } else {
                    topLevel.push(comment);
                }
            });

            setComments(topLevel);
        } catch (error) {
            console.error('Error fetching comments:', error);
            toast.error('Failed to load comments');
        } finally {
            setLoading(false);
        }
    }, [lessonId]);

    const createComment = useCallback(async (content: string, parentId: string | null = null) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.error('Please sign in to comment');
            return null;
        }

        const { data, error } = await supabase
            .from('lesson_comments')
            .insert({
                lesson_id: lessonId,
                user_id: user.id,
                content,
                parent_comment_id: parentId,
            })
            .select()
            .single();

        if (error) {
            toast.error('Failed to post comment');
            return null;
        }

        toast.success(parentId ? 'Reply posted!' : 'Comment posted!');
        return data;
    }, [lessonId]);

    const updateComment = useCallback(async (commentId: string, content: string) => {
        const { error } = await supabase
            .from('lesson_comments')
            .update({
                content,
                is_edited: true,
                edited_at: new Date().toISOString(),
            })
            .eq('id', commentId);

        if (error) {
            toast.error('Failed to update comment');
            return false;
        }

        toast.success('Comment updated!');
        fetchComments();
        return true;
    }, [fetchComments]);

    const deleteComment = useCallback(async (commentId: string) => {
        const { error } = await supabase
            .from('lesson_comments')
            .update({
                is_deleted: true,
                deleted_at: new Date().toISOString(),
            })
            .eq('id', commentId);

        if (error) {
            toast.error('Failed to delete comment');
            return false;
        }

        toast.success('Comment deleted!');
        fetchComments();
        return true;
    }, [fetchComments]);

    const togglePin = useCallback(async (commentId: string, isPinned: boolean) => {
        if (!isCreator) {
            toast.error('Only course creators can pin comments');
            return false;
        }

        const { error } = await supabase
            .from('lesson_comments')
            .update({ is_pinned: !isPinned })
            .eq('id', commentId);

        if (error) {
            toast.error('Failed to pin comment');
            return false;
        }

        toast.success(isPinned ? 'Comment unpinned' : 'Comment pinned!');
        fetchComments();
        return true;
    }, [isCreator, fetchComments]);

    const toggleHelpful = useCallback(async (commentId: string, isHelpful: boolean) => {
        if (!isCreator) {
            toast.error('Only course creators can mark comments as helpful');
            return false;
        }

        const { error } = await supabase
            .from('lesson_comments')
            .update({ is_helpful: !isHelpful })
            .eq('id', commentId);

        if (error) {
            toast.error('Failed to mark comment');
            return false;
        }

        toast.success(isHelpful ? 'Removed helpful mark' : 'Marked as helpful!');
        fetchComments();
        return true;
    }, [isCreator, fetchComments]);

    const findComment = useCallback((commentList: Comment[], id: string): Comment | null => {
        for (const comment of commentList) {
            if (comment.id === id) return comment;
            if (comment.replies) {
                const found = findComment(comment.replies, id);
                if (found) return found;
            }
        }
        return null;
    }, []);

    const handleReaction = useCallback(async (commentId: string, reactionType: 'like' | 'dislike') => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.error('Please sign in to react');
            return;
        }

        const comment = findComment(comments, commentId);
        if (!comment) return;

        if (comment.userReaction === reactionType) {
            await supabase
                .from('comment_reactions')
                .delete()
                .eq('comment_id', commentId)
                .eq('user_id', user.id);
        } else {
            await supabase
                .from('comment_reactions')
                .upsert({
                    comment_id: commentId,
                    user_id: user.id,
                    reaction_type: reactionType,
                }, {
                    onConflict: 'comment_id,user_id'
                });
        }

        fetchComments();
    }, [comments, fetchComments, findComment]);

    const flagComment = useCallback(async (commentId: string, reason: string) => {
        const { error } = await supabase
            .from('lesson_comments')
            .update({
                is_flagged: true,
                flag_reason: reason,
            })
            .eq('id', commentId);

        if (error) {
            toast.error('Failed to flag comment');
            return false;
        }

        toast.success('Comment flagged for review');
        return true;
    }, []);

    useEffect(() => {
        getCurrentUser();
        fetchComments();

        const channel = supabase
            .channel(`lesson_comments:${lessonId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'lesson_comments',
                    filter: `lesson_id=eq.${lessonId}`,
                },
                () => {
                    fetchComments();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [lessonId, getCurrentUser, fetchComments]);

    return {
        comments,
        loading,
        currentUserId,
        isCreator,
        createComment,
        updateComment,
        deleteComment,
        togglePin,
        toggleHelpful,
        handleReaction,
        flagComment,
        refetch: fetchComments,
    };
}
