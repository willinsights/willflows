import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Clock, Info, AlertTriangle, X, Trash2, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications, Notification, NotificationType } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

const typeConfig: Record<NotificationType, { icon: typeof Check; color: string; bg: string; border: string }> = {
  success: {
    icon: Check,
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/20',
  },
  error: {
    icon: AlertTriangle,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    border: 'border-destructive/20',
  },
  warning: {
    icon: Clock,
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/20',
  },
  info: {
    icon: Info,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
  },
};

function formatTimeAgo(dateString: string): string {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: false, locale: pt });
  } catch {
    return '';
  }
}

// Maps entity_type to navigation routes
function getNotificationRoute(notification: Notification): string | null {
  if (!notification.entity_type || !notification.entity_id) return null;
  
  switch (notification.entity_type) {
    case 'project':
      return `/app/captacao?projeto=${notification.entity_id}`;
    case 'task':
      return `/app/captacao?tarefa=${notification.entity_id}`;
    case 'payment':
      return `/app/pagamentos?id=${notification.entity_id}`;
    case 'calendar_event':
      return `/app/calendario?evento=${notification.entity_id}`;
    case 'conversation':
      return `/app/chat?c=${notification.entity_id}`;
    case 'follow_up':
      return `/app/chat`;
    case 'client':
      return `/app/clientes?id=${notification.entity_id}`;
    case 'export_job':
      return `/app/relatorios`;
    default:
      return null;
  }
}

export function NotificationCenter() {
  const navigate = useNavigate();
  const {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    const route = getNotificationRoute(notification);
    if (route) {
      setIsOpen(false);
      navigate(route);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" type="button">
          <Bell className="h-5 w-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-primary text-primary-foreground text-[10px] font-bold rounded-full"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className={cn(
          'w-[380px] p-0 overflow-hidden',
          // Glass effect
          'bg-background/80 dark:bg-background/70',
          'backdrop-blur-xl backdrop-saturate-150',
          'border border-border/50',
          'shadow-xl shadow-black/10 dark:shadow-black/30'
        )}
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Notificações</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full">
                {unreadCount} {unreadCount === 1 ? 'nova' : 'novas'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Marcar todas
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="max-h-[400px]">
          <AnimatePresence mode="popLayout">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-muted-foreground"
              >
                <Bell className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">Sem notificações</p>
              </motion.div>
            ) : (
              <div className="py-1">
                {notifications.map((notification, index) => {
                  const config = typeConfig[notification.type];
                  const Icon = config.icon;

                  return (
                      <motion.div
                        key={notification.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20, height: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={cn(
                          'group relative px-4 py-3 cursor-pointer transition-all duration-200',
                          'hover:bg-muted/40',
                          !notification.read && 'bg-primary/[0.03]',
                          notification.entity_type && 'hover:pr-10'
                        )}
                        onClick={() => handleNotificationClick(notification)}
                      >
                      {/* Unread indicator */}
                      {!notification.read && (
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                      )}

                      <div className="flex gap-3">
                        {/* Icon */}
                        <div
                          className={cn(
                            'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border',
                            config.bg,
                            config.border
                          )}
                        >
                          <Icon className={cn('h-4 w-4', config.color)} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={cn(
                                'text-sm font-medium truncate',
                                notification.read && 'text-muted-foreground'
                              )}
                            >
                              {notification.title}
                            </p>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {formatTimeAgo(notification.created_at)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                        </div>

                        {/* Delete button */}
                        <div className="shrink-0 flex items-center gap-1">
                          {/* Navigate indicator */}
                          {notification.entity_type && (
                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-2.5 border-t border-border/50 bg-muted/20">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs text-muted-foreground hover:text-primary"
            >
              Ver todas as notificações
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
