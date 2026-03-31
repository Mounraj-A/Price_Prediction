import { useRef, useEffect, useState } from 'react';
import { Bell, Check, Tag, TrendingDown } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

// 🔥 BUG FIX: Prevent the "1970" 20000+ days ago glitch
function timeAgo(timestamp, fallbackId, currentTime) {
  let timeVal = null;

  // 1. Try to parse the actual timestamp string
  if (timestamp) {
    const parsed = new Date(timestamp).getTime();
    if (!isNaN(parsed) && parsed > 0) timeVal = parsed;
  }

  // 2. Try the ID, but ONLY if it's a huge number (meaning it's an actual Date.now() timestamp, > year 2020)
  if (!timeVal && typeof fallbackId === 'number' && fallbackId > 1577836800000) {
    timeVal = fallbackId;
  }

  // 3. If there is absolutely no valid time data, just say "Recently"
  if (!timeVal) return 'Recently';

  const diff = currentTime - timeVal;

  // Prevent negative times if the clock is slightly off
  if (diff < 0) return 'Just now';

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';

  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ago`;

  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;

  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationPanel({ isOpen, onToggle }) {
  const { notifications, unreadCount, markAllRead, markOneRead } = useNotifications();
  const panelRef = useRef(null);
  
  // Live ticker so times automatically update while dropdown is open
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    if (!isOpen) return; // Only tick if the panel is actually open to save performance
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        if (isOpen) onToggle(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  return (
    <div ref={panelRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      
      {/* Bell Trigger */}
      <button 
        onClick={() => onToggle(!isOpen)}
        style={{ position: 'relative', background: 'none', border: 'none', color: isOpen ? 'var(--text)' : 'var(--text-2)', cursor: 'pointer', transition: 'color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{ 
            position: 'absolute', top: -4, right: -6, 
            background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 800, 
            minWidth: 16, height: 16, borderRadius: '50%', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--surface)' // Adds a nice cutout effect
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="anim-scale-in" style={{
          position: 'absolute', top: 'calc(100% + 16px)', right: -10,
          width: 320, maxHeight: 400, overflowY: 'auto',
          background: 'var(--surface)', // Solid background
          border: '1px solid var(--border-2)',
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
          zIndex: 100, // Forces it above everything else
          display: 'flex', flexDirection: 'column'
        }}>
          
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text)' }}>Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--primary-light)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                <Check size={12} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {(!notifications || notifications.length === 0) ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-3)' }}>
                <Bell size={24} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
                <p style={{ fontSize: 13, margin: 0 }}>You're all caught up!</p>
              </div>
            ) : (
              notifications.map((notif, i) => (
                <div
                  key={notif.id || i}
                  role="button"
                  tabIndex={0}
                  onClick={() => notif.id && markOneRead(notif.id)}
                  onKeyDown={(e) => e.key === 'Enter' && notif.id && markOneRead(notif.id)}
                  style={{ 
                  padding: '16px 20px', borderBottom: '1px solid var(--border)',
                  background: notif.read ? 'transparent' : 'rgba(99,102,241,0.05)',
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  cursor: notif.read ? 'default' : 'pointer'
                }}
                >
                  <div style={{ 
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: notif.type === 'price_drop' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                    color: notif.type === 'price_drop' ? '#10b981' : '#f59e0b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {notif.type === 'price_drop' ? <TrendingDown size={16} /> : <Tag size={16} />}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, margin: '0 0 4px 0', color: 'var(--text)', lineHeight: 1.4 }}>
                      {notif.message || notif.title}
                    </p>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      {/* Using the new timeAgo with the required variables */}
                      {timeAgo(notif.timestamp || notif.createdAt, notif.id, currentTime)}
                    </span>
                  </div>

                  {!notif.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary-light)', flexShrink: 0, marginTop: 6 }} />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}