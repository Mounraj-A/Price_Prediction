import { createContext, useContext, useState } from 'react';
import { notificationApi } from '../services/api';

const NotificationContext = createContext(null);

/**
 * NotificationProvider
 * Wraps the app to provide global notification state.
 * Notifications are derived from prediction.notifications on each search
 * and persisted to localStorage via notificationApi.
 */
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(() => notificationApi.getAll());

  /** Push a new notification (called after each successful search) */
  const push = (notif) => {
    notificationApi.push(notif);
    setNotifications(notificationApi.getAll());
  };

  /** Mark all existing notifications as read */
  const markAllRead = () => {
    notificationApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  /** Refresh from storage (used on page focus) */
  const refresh = () => {
    setNotifications(notificationApi.getAll());
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, push, markAllRead, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
  return ctx;
};
