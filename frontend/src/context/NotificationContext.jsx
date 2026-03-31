import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchNotifications, markNotificationRead } from '../services/notificationService';

const NotificationContext = createContext(null);

/** Map backend enum to UI keys used by NotificationPanel / NotificationsPage */
export function normalizeBackendType(t) {
  const u = String(t || '').toUpperCase();
  if (u === 'PRICE_DROP') return 'price_drop';
  if (u === 'TARGET_PRICE') return 'target_price';
  if (u === 'BEST_DEAL') return 'best_deal';
  if (u === 'TREND') return 'trend_alert';
  return 'alert';
}

/** Single shape for list UI: read, type, timestamp, message */
function normalizeApiItem(n) {
  if (!n || typeof n !== 'object') return null;
  const ts = n.createdAt || n.timestamp;
  return {
    ...n,
    read: n.isRead === true || n.read === true,
    type: normalizeBackendType(n.type),
    timestamp: ts,
    productName: n.productName || n.productKey || 'Product',
  };
}

/**
 * NotificationProvider — server list from GET /api/notifications (+ optional local push from search).
 */
export function NotificationProvider({ children }) {
  const [apiNotifications, setApiNotifications] = useState([]);
  const [localPush, setLocalPush] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(() => new Set());

  const loadFromApi = useCallback(async () => {
    try {
      if (!localStorage.getItem('omni_token')) {
        setApiNotifications([]);
        return;
      }
      const data = await fetchNotifications();
      const list = Array.isArray(data) ? data : [];
      setApiNotifications(list.map(normalizeApiItem).filter(Boolean));
    } catch {
      setApiNotifications([]);
    }
  }, []);

  useEffect(() => {
    loadFromApi();
  }, [loadFromApi]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadFromApi();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadFromApi]);

  const notifications = useMemo(() => {
    const merged = [...localPush, ...apiNotifications];
    const seen = new Set();
    const out = [];
    for (const n of merged) {
      if (!n || !n.id) continue;
      if (dismissedIds.has(n.id)) continue;
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      out.push(n);
    }
    return out;
  }, [apiNotifications, localPush, dismissedIds]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  /** Local-only notifications after search (prediction); not stored on server */
  const push = useCallback((notif) => {
    const id = `local-${Date.now()}`;
    const message =
      notif?.message ||
      notif?.notifications?.message ||
      (Array.isArray(notif?.notifications) ? notif.notifications[0] : '') ||
      'Price update';
    setLocalPush((prev) =>
      [
        {
          id,
          read: false,
          type: 'price_drop',
          message,
          timestamp: new Date().toISOString(),
          productName: notif?.productName || 'Search',
          localOnly: true,
        },
        ...prev,
      ].slice(0, 30)
    );
  }, []);

  const refresh = useCallback(() => {
    loadFromApi();
  }, [loadFromApi]);

  const markOneRead = useCallback(
    async (id) => {
      if (!id) return;
      if (String(id).startsWith('local-')) {
        setLocalPush((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        return;
      }
      try {
        await markNotificationRead(id);
        setApiNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      } catch {
        /* keep UI stable */
      }
    },
    []
  );

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.read);
    for (const n of unread) {
      if (n.localOnly || String(n.id).startsWith('local-')) {
        setLocalPush((prev) => prev.map((x) => ({ ...x, read: true })));
      } else {
        try {
          await markNotificationRead(n.id);
        } catch {
          /* continue */
        }
      }
    }
    setApiNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setLocalPush((prev) => prev.map((n) => ({ ...n, read: true })));
    await loadFromApi();
  }, [notifications, loadFromApi]);

  const dismissOne = useCallback(
    async (id) => {
      if (!id) return;
      if (!String(id).startsWith('local-')) {
        try {
          await markNotificationRead(id);
        } catch {
          /* ignore */
        }
        setApiNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      } else {
        setLocalPush((prev) => prev.filter((n) => n.id !== id));
      }
      setDismissedIds((prev) => new Set(prev).add(id));
    },
    []
  );

  const clearLocalOnly = useCallback(() => {
    setLocalPush([]);
    setDismissedIds(new Set());
  }, []);

  /** Clear list visually: mark server items read, remove local, dismiss all current ids */
  const clearAllVisible = useCallback(async () => {
    const ids = notifications.map((n) => n.id).filter(Boolean);
    await markAllRead();
    setLocalPush([]);
    setDismissedIds(new Set(ids));
  }, [notifications, markAllRead]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        push,
        markAllRead,
        refresh,
        markOneRead,
        dismissOne,
        clearLocalOnly,
        clearAllVisible,
        reload: loadFromApi,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
  return ctx;
};
