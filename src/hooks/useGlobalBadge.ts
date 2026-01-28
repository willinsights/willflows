import { useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { useTotalUnreadMessages } from '@/hooks/useTotalUnreadMessages';
import { setAppBadge } from '@/hooks/usePWABadge';

/**
 * Hook that combines all unread counts and updates the PWA badge
 * Should be used in the app layout to keep badge in sync
 */
export function useGlobalBadge() {
  const { unreadCount: notificationUnread } = useNotifications();
  const { totalUnread: chatUnread } = useTotalUnreadMessages();

  // Calculate total unread
  const totalUnread = notificationUnread + chatUnread;

  // Update PWA badge whenever unread count changes
  useEffect(() => {
    setAppBadge(totalUnread);
  }, [totalUnread]);

  return { totalUnread, notificationUnread, chatUnread };
}
