'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { X, Bell, CheckCircle2 } from 'lucide-react';

type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'reminder';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'destructive' | 'outline';
  }>;
  duration?: number;
  autoDismiss?: boolean;
  persistent?: boolean;
  createdAt: Date;
}

interface NotificationContextType {
  notify: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}

export function useNotify() {
  return useNotification();
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback(
    (notification: Omit<Notification, 'id' | 'createdAt'>) => {
      const newNotification: Notification = {
        ...notification,
        id: crypto.randomUUID(),
        createdAt: new Date(),
      };

      setNotifications((prev) => [newNotification, ...prev].slice(0, 10));
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notify, dismiss }}>
      {children}
      <NotificationContainer notifications={notifications} onDismiss={dismiss} />
    </NotificationContext.Provider>
  );
}

function NotificationContainer({
  notifications,
  onDismiss,
}: {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed top-4 right-4 w-full max-w-[450px] z-50 flex flex-col gap-2">
      {notifications.map((notification) => (
        <NotificationCard key={notification.id} notification={notification} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function NotificationCard({
  notification,
  onDismiss,
}: {
  notification: Notification;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (notification.autoDismiss) {
      const timer = setTimeout(() => {
        onDismiss(notification.id);
      }, notification.duration || 5000);
      return () => clearTimeout(timer);
    }
  }, [notification.id, notification.autoDismiss, notification.duration, onDismiss]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <Bell className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <Bell className="h-5 w-5 text-yellow-500" />;
      case 'reminder':
        return <Bell className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5 text-blue-500" />;
    }
  };

  if (!visible) return null;

  return (
    <div
      className={`group relative flex flex-col gap-3 bg-background border rounded-lg shadow-lg p-4 animate-in slide-in-from-right-10 fade-in duration-300 ${
        notification.type === 'success'
          ? 'border-green-500/20'
          : notification.type === 'warning'
            ? 'border-yellow-500/20'
            : notification.type === 'error'
              ? 'border-red-500/20'
              : notification.type === 'reminder'
                ? 'border-blue-500/20'
                : 'border-gray-200 dark:border-gray-800'
      }`}
    >
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold leading-none tracking-tight">
              {notification.title}
            </h4>
            <button
              onClick={() => onDismiss(notification.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {notification.message && (
            <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
          )}
        </div>
      </div>

      {notification.actions?.map((action, index) => (
        <div key={index} className="flex items-center justify-end">
          <button
            onClick={action.onClick}
            className="text-xs bg-muted hover:bg-muted/80 transition-colors rounded px-2.5 py-1"
          >
            {action.label}
          </button>
        </div>
      ))}
    </div>
  );
}