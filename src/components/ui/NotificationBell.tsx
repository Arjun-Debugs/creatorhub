import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCommentNotifications } from '@/hooks/useCommentNotifications';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useCommentNotifications();
    const navigate = useNavigate();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleNotificationClick = (notification: any) => {
        markAsRead(notification.id);
        // Navigate to the lesson with the comment
        navigate(`/course-viewer?lesson=${notification.lesson_id}#comment-${notification.comment_id}`);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getNotificationMessage = (notification: any) => {
        const userName = notification.triggered_by?.name || 'Someone';

        switch (notification.notification_type) {
            case 'mention':
                return `${userName} mentioned you in a comment`;
            case 'reply':
                return `${userName} replied to your comment`;
            case 'reaction':
                return `${userName} reacted to your comment`;
            default:
                return 'New notification';
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-2 py-1.5">
                    <h3 className="font-semibold">Notifications</h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1 text-xs"
                            onClick={markAllAsRead}
                        >
                            Mark all read
                        </Button>
                    )}
                </div>

                <DropdownMenuSeparator />

                <ScrollArea className="h-[400px]">
                    {notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No notifications yet
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className={`cursor-pointer p-3 ${!notification.is_read ? 'bg-muted/50' : ''}`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="flex flex-col gap-1 w-full">
                                    <p className="text-sm font-medium">
                                        {getNotificationMessage(notification)}
                                    </p>
                                    {notification.lesson?.title && (
                                        <p className="text-xs text-muted-foreground">
                                            in "{notification.lesson.title}"
                                        </p>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                    </p>
                                </div>
                            </DropdownMenuItem>
                        ))
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
