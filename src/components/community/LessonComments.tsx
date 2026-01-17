import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLessonComments } from '@/hooks/useLessonComments';
import { useCommentMentions } from '@/hooks/useCommentMentions';
import CommentForm from './CommentForm';
import CommentThread from './CommentThread';

interface Comment {
    id: string;
    lesson_id: string;
    user_id: string;
    content: string;
    parent_comment_id: string | null;
    likes: number;
    dislikes: number;
    is_pinned: boolean;
    is_helpful: boolean;
    is_edited: boolean;
    edited_at: string | null;
    created_at: string;
    profiles?: {
        name: string;
        email: string;
    };
    replies?: Comment[];
    userReaction?: 'like' | 'dislike' | null;
}

interface LessonCommentsProps {
    lessonId: string;
}

export default function LessonComments({ lessonId }: LessonCommentsProps) {
    const {
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
    } = useLessonComments(lessonId);

    const { enrolledUsers, createMentions } = useCommentMentions(lessonId);

    const [deletingComment, setDeletingComment] = useState<string | null>(null);

    const handlePostComment = async (content: string) => {
        const comment = await createComment(content, null);
        if (comment) {
            await createMentions(comment.id, content);
        }
    };

    const handlePostReply = async (parentId: string, content: string) => {
        const comment = await createComment(content, parentId);
        if (comment) {
            await createMentions(comment.id, content);
        }
    };

    const handleEditComment = async (commentId: string, content: string) => {
        const success = await updateComment(commentId, content);
        if (success) {
            await createMentions(commentId, content);
        }
    };

    const handleDeleteComment = async () => {
        if (!deletingComment) return;
        await deleteComment(deletingComment);
        setDeletingComment(null);
    };

    const handleFlagComment = async (commentId: string) => {
        const reason = prompt('Please provide a reason for flagging this comment:');
        if (reason) {
            await flagComment(commentId, reason);
        }
    };

    if (loading) {
        return <div className="text-center py-8 text-muted-foreground">Loading comments...</div>;
    }

    const totalComments = comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);

    return (
        <>
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-4">
                        Comments ({totalComments})
                    </h3>

                    <CommentForm
                        onSubmit={handlePostComment}
                        placeholder="Add a comment... (Markdown supported, @ to mention)"
                        submitLabel="Post Comment"
                        enrolledUsers={enrolledUsers}
                        showPreview={true}
                    />
                </div>

                <div className="space-y-4">
                    {comments.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">
                            No comments yet. Be the first to comment!
                        </p>
                    ) : (
                        comments.map((comment) => (
                            <CommentThread
                                key={comment.id}
                                comment={comment}
                                depth={0}
                                currentUserId={currentUserId}
                                isCreator={isCreator}
                                enrolledUsers={enrolledUsers}
                                onReply={handlePostReply}
                                onEdit={handleEditComment}
                                onDelete={setDeletingComment}
                                onReaction={handleReaction}
                                onPin={togglePin}
                                onMarkHelpful={toggleHelpful}
                                onFlag={handleFlagComment}
                            />
                        ))
                    )}
                </div>
            </div>

            <AlertDialog open={!!deletingComment} onOpenChange={() => setDeletingComment(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this comment? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteComment} className="bg-destructive text-destructive-foreground">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
