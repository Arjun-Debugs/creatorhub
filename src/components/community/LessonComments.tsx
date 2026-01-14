import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThumbsUp, ThumbsDown, Reply, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Comment {
    id: string;
    lesson_id: string;
    user_id: string;
    content: string;
    parent_comment_id: string | null;
    likes: number;
    dislikes: number;
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
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState("");
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchComments();
        getCurrentUser();
        subscribeToComments();
    }, [lessonId]);

    const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || null);
    };

    const fetchComments = async () => {
        try {
            // Fetch all comments for this lesson
            const { data: commentsData, error } = await supabase
                .from("lesson_comments")
                .select(`
          *,
          profiles:user_id (name, email)
        `)
                .eq("lesson_id", lessonId)
                .order("created_at", { ascending: true });

            if (error) throw error;

            // Fetch user reactions if logged in
            const { data: { user } } = await supabase.auth.getUser();
            let reactionsMap: Record<string, 'like' | 'dislike'> = {};

            if (user) {
                const { data: reactions } = await supabase
                    .from("comment_reactions")
                    .select("comment_id, reaction_type")
                    .eq("user_id", user.id)
                    .in("comment_id", commentsData?.map(c => c.id) || []);

                reactionsMap = (reactions || []).reduce((acc, r) => ({
                    ...acc,
                    [r.comment_id]: r.reaction_type as 'like' | 'dislike'
                }), {});
            }

            // Build threaded structure
            const commentsWithReactions = (commentsData || []).map(c => ({
                ...c,
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
            console.error("Error fetching comments:", error);
            toast.error("Failed to load comments");
        } finally {
            setLoading(false);
        }
    };

    const subscribeToComments = () => {
        const channel = supabase
            .channel(`lesson_comments:${lessonId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'lesson_comments',
                    filter: `lesson_id=eq.${lessonId}`
                },
                () => {
                    fetchComments();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const handlePostComment = async () => {
        if (!newComment.trim()) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.error("Please sign in to comment");
            return;
        }

        const { error } = await supabase.from("lesson_comments").insert({
            lesson_id: lessonId,
            user_id: user.id,
            content: newComment,
            parent_comment_id: null,
        });

        if (error) {
            toast.error("Failed to post comment");
        } else {
            setNewComment("");
            toast.success("Comment posted!");
        }
    };

    const handlePostReply = async (parentId: string) => {
        if (!replyContent.trim()) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.error("Please sign in to reply");
            return;
        }

        const { error } = await supabase.from("lesson_comments").insert({
            lesson_id: lessonId,
            user_id: user.id,
            content: replyContent,
            parent_comment_id: parentId,
        });

        if (error) {
            toast.error("Failed to post reply");
        } else {
            setReplyContent("");
            setReplyingTo(null);
            toast.success("Reply posted!");
        }
    };

    const handleReaction = async (commentId: string, reactionType: 'like' | 'dislike') => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.error("Please sign in to react");
            return;
        }

        const comment = findComment(comments, commentId);
        if (!comment) return;

        // If same reaction, remove it
        if (comment.userReaction === reactionType) {
            await supabase
                .from("comment_reactions")
                .delete()
                .eq("comment_id", commentId)
                .eq("user_id", user.id);
        } else {
            // Upsert new reaction
            await supabase
                .from("comment_reactions")
                .upsert({
                    comment_id: commentId,
                    user_id: user.id,
                    reaction_type: reactionType,
                }, {
                    onConflict: 'comment_id,user_id'
                });
        }

        fetchComments();
    };

    const findComment = (commentList: Comment[], id: string): Comment | null => {
        for (const comment of commentList) {
            if (comment.id === id) return comment;
            if (comment.replies) {
                const found = findComment(comment.replies, id);
                if (found) return found;
            }
        }
        return null;
    };

    const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => (
        <div className={`${depth > 0 ? 'ml-12 border-l-2 border-muted pl-4' : ''} mb-4`}>
            <div className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback>{comment.profiles?.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{comment.profiles?.name || 'Anonymous'}</span>
                        <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                    </div>
                    <p className="text-sm mb-2 whitespace-pre-wrap">{comment.content}</p>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1"
                            onClick={() => handleReaction(comment.id, 'like')}
                        >
                            <ThumbsUp className={`h-3 w-3 ${comment.userReaction === 'like' ? 'fill-current text-primary' : ''}`} />
                            <span className="text-xs">{comment.likes || 0}</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1"
                            onClick={() => handleReaction(comment.id, 'dislike')}
                        >
                            <ThumbsDown className={`h-3 w-3 ${comment.userReaction === 'dislike' ? 'fill-current text-destructive' : ''}`} />
                            <span className="text-xs">{comment.dislikes || 0}</span>
                        </Button>
                        {depth < 2 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1"
                                onClick={() => setReplyingTo(comment.id)}
                            >
                                <Reply className="h-3 w-3" />
                                <span className="text-xs">Reply</span>
                            </Button>
                        )}
                    </div>

                    {replyingTo === comment.id && (
                        <div className="mt-3 flex gap-2">
                            <Textarea
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder="Write a reply..."
                                className="min-h-[60px]"
                            />
                            <div className="flex flex-col gap-2">
                                <Button size="sm" onClick={() => handlePostReply(comment.id)}>
                                    <Send className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setReplyingTo(null)}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}

                    {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3">
                            {comment.replies.map(reply => (
                                <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    if (loading) {
        return <div className="text-center py-8 text-muted-foreground">Loading comments...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-4">
                    Comments ({comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)})
                </h3>

                <div className="flex gap-3 mb-6">
                    <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback>You</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 flex gap-2">
                        <Textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment..."
                            className="min-h-[80px]"
                        />
                        <Button onClick={handlePostComment} disabled={!newComment.trim()}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {comments.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">
                        No comments yet. Be the first to comment!
                    </p>
                ) : (
                    comments.map(comment => (
                        <CommentItem key={comment.id} comment={comment} />
                    ))
                )}
            </div>
        </div>
    );
}
