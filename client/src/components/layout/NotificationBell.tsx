import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import { Link, useLocation } from 'wouter';

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedResourceType?: string;
  relatedResourceId?: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: notificationsData } = useQuery<{ notifications: Notification[]; unreadCount: number }>({
    queryKey: ['/api/notifications'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unreadCount || 0;

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      apiRequest('PATCH', `/api/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => apiRequest('PATCH', '/api/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: 'All notifications marked as read',
      });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: string) =>
      apiRequest('DELETE', `/api/notifications/${notificationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: 'Notification deleted',
      });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    
    // Navigate to related resource if applicable
    if (notification.relatedResourceType === 'content_writer_draft' && notification.relatedResourceId) {
      navigate('/app/content-history');
      setIsOpen(false);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              data-testid="badge-unread-count"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto" data-testid="dropdown-notifications">
        <div className="flex items-center justify-between px-2 py-2">
          <h3 className="font-semibold text-sm" data-testid="text-notifications-header">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => markAllAsReadMutation.mutate()}
              data-testid="button-mark-all-read"
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground" data-testid="text-no-notifications">
            No notifications yet
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.slice(0, 5).map((notification) => (
              <div
                key={notification.id}
                className={`relative px-3 py-2 hover:bg-accent/50 cursor-pointer transition-colors ${
                  !notification.isRead ? 'bg-accent/20' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
                data-testid={`notification-item-${notification.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate" data-testid={`notification-title-${notification.id}`}>
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" data-testid={`notification-unread-indicator-${notification.id}`} />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1" data-testid={`notification-message-${notification.id}`}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1" data-testid={`notification-time-${notification.id}`}>
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotificationMutation.mutate(notification.id);
                    }}
                    data-testid={`button-delete-notification-${notification.id}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {notifications.length > 5 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/app" data-testid="link-view-all-notifications">
                <span className="w-full text-center text-sm">View all notifications</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
