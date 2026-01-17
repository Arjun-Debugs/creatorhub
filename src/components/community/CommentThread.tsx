import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThumbsUp, ThumbsDown, Reply, MoreVertical, Pin, Award, Edit, Trash2, Flag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import CommentForm from './CommentForm';
import MarkdownRenderer from './MarkdownRenderer';

/**
 * Represents a comment with all its metadata and nested replies
 */

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

/**
 * User information for mention autocomplete
 */
interface User {
    id: string;
    name: string;
    email: string;
}

/**
 * Props for the CommentThread component
 * 
 * @property comment - The comment data to render
 * @property depth - Current nesting depth (0 for top-level, max 2)
 * @property currentUserId - ID of the currently logged-in user
 * @property isCreator - Whether the current user is the course creator
 * @property enrolledUsers - List of users enrolled in the course for mentions
 * @property onReply - Callback when user posts a reply
 * @property onEdit - Callback when user edits a comment
 * @property onDelete - Callback when user deletes a comment
 * @property onReaction - Callback when user reacts (like/dislike) to a comment
 * @property onPin - Callback when creator pins/unpins a comment
 * @property onMarkHelpful - Callback when creator marks comment as helpful
 * @property onFlag - Callback when user flags a comment
 */

interface CommentThreadProps {
    comment: Comment;
    depth?: number;
    currentUserId: string | null;
    isCreator: boolean;
    enrolledUsers: User[];
    onReply: (parentId: string, content: string) => Promise<void>;
    onEdit: (commentId: string, content: string) => Promise<void>;
    onDelete: (commentId: string) => void;
    onReaction: (commentId: string, reactionType: 'like' | 'dislike') => void;
    onPin: (commentId: string, isPinned: boolean) => void;
    onMarkHelpful: (commentId: string, isHelpful: boolean) => void;
    onFlag: (commentId: string) => void;
}

/**
 * CommentThread component handles rendering of individual comments and their nested replies.
 * Supports up to 2 levels of nesting for better readability.
 */
export default function CommentThread({
    comment,
    depth = 0,
    currentUserId,
    isCreator,
    enrolledUsers,
    onReply,
    onEdit,
    onDelete,
    onReaction,
    onPin,
    onMarkHelpful,
    onFlag,
}: CommentThreadProps) {
    const [replyingTo, setReplyingTo] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const isOwnComment = currentUserId === comment.user_id;
    const maxDepth = 2; // Limit nesting to 2 levels

    const handleReply = async (content: string) => {
        await onReply(comment.id, content);
        setReplyingTo(false);
    };

    const handleEdit = async (content: string) => {
        await onEdit(comment.id, content);
        setIsEditing(false);
    };

    return (
        <div
            id={`comment-${comment.id}`}
            className={`${depth > 0 ? 'ml-12 border-l-2 border-muted pl-4' : ''} mb-4 scroll-mt-20`}
        >
            <div className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback>{comment.profiles?.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                    {/* Comment Header */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-sm">{comment.profiles?.name || 'Anonymous'}</span>

                        {comment.is_pinned && (
                            <Badge variant="secondary" className="text-xs gap-1">
                                <Pin className="h-3 w-3" />
                                Pinned
                            </Badge>
                        )}

                        {comment.is_helpful && (
                            <Badge variant="default" className="text-xs gap-1">
                                <Award className="h-3 w-3" />
                                Helpful
                            </Badge>
                        )}

                        <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>

                        {comment.is_edited && (
                            <span className="text-xs text-muted-foreground italic">
                                (edited)
                            </span>
                        )}
                    </div>

                    {/* Comment Content */}
                    {isEditing ? (
                        <div className="mb-2">
                            <CommentForm
                                onSubmit={handleEdit}
                                onCancel={() => setIsEditing(false)}
                                initialValue={comment.content}
                                submitLabel="Save"
                                enrolledUsers={enrolledUsers}
                                showPreview={false}
                            />
                        </div>
                    ) : (
                        <div className="mb-2">
                            <MarkdownRenderer content={comment.content} />
                        </div>
                    )}

                    {/* Comment Actions */}
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Like Button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1"
                            onClick={() => onReaction(comment.id, 'like')}
                        >
                            <ThumbsUp
                                className={`h-3 w-3 ${comment.userReaction === 'like' ? 'fill-current text-primary' : ''}`}
                            />
                            <span className="text-xs">{comment.likes || 0}</span>
                        </Button>

                        {/* Dislike Button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1"
                            onClick={() => onReaction(comment.id, 'dislike')}
                        >
                            <ThumbsDown
                                className={`h-3 w-3 ${comment.userReaction === 'dislike' ? 'fill-current text-destructive' : ''}`}
                            />
                            <span className="text-xs">{comment.dislikes || 0}</span>
                        </Button>

                        {/* Reply Button - Only show if depth < maxDepth */}
                        {depth < maxDepth && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1"
                                onClick={() => setReplyingTo(true)}
                            >
                                <Reply className="h-3 w-3" />
                                <span className="text-xs">Reply</span>
                            </Button>
                        )}

                        {/* More Actions Menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <MoreVertical className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {/* Creator-only actions */}
                                {isCreator && (
                                    <>
                                        <DropdownMenuItem onClick={() => onPin(comment.id, comment.is_pinned)}>
                                            <Pin className="h-4 w-4 mr-2" />
                                            {comment.is_pinned ? 'Unpin' : 'Pin'} Comment
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onMarkHelpful(comment.id, comment.is_helpful)}>
                                            <Award className="h-4 w-4 mr-2" />
                                            {comment.is_helpful ? 'Remove Helpful' : 'Mark as Helpful'}
                                        </DropdownMenuItem>
                                    </>
                                )}

                                {/* Own comment actions */}
                                {isOwnComment && (
                                    <>
                                        <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => onDelete(comment.id)}
                                            className="text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </>
                                )}

                                {/* Flag option for other users' comments */}
                                {!isOwnComment && (
                                    <DropdownMenuItem onClick={() => onFlag(comment.id)}>
                                        <Flag className="h-4 w-4 mr-2" />
                                        Report
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Reply Form */}
                    {replyingTo && (
                        <div className="mt-3">
                            <CommentForm
                                onSubmit={handleReply}
                                onCancel={() => setReplyingTo(false)}
                                placeholder="Write a reply..."
                                submitLabel="Reply"
                                enrolledUsers={enrolledUsers}
                                showPreview={false}
                            />
                        </div>
                    )}

                    {/* Nested Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3">
                            {comment.replies.map((reply) => (
                                <CommentThread
                                    key={reply.id}
                                    comment={reply}
                                    depth={depth + 1}
                                    currentUserId={currentUserId}
                                    isCreator={isCreator}
                                    enrolledUsers={enrolledUsers}
                                    onReply={onReply}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    onReaction={onReaction}
                                    onPin={onPin}
                                    onMarkHelpful={onMarkHelpful}
                                    onFlag={onFlag}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
