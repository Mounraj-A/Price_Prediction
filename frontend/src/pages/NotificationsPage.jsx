import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BellOff, CheckCheck, Trash2, Bell, TrendingDown, Tag } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { notificationApi } from '../services/api';

const TYPE_META = {
  price_drop:  { icon: <TrendingDown size={20} />, label: 'Price Drop',  color: '#10b981', bg: 'rgba(16,185,129,0.15)' }, 
  best_deal:   { icon: <Tag size={20} />,          label: 'Best Deal',   color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' }, 
  trend_alert: { icon: <Bell size={20} />,         label: 'Trend Alert', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' }, 
};

function getTypeMeta(type) {
  return TYPE_META[type] || { icon: <Bell size={20} />, label: 'Alert', color: '#64748b', bg: 'rgba(100,116,139,0.15)' };
}

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

  // 3. If there is absolutely no valid time data, just say "Recently" instead of 56 years ago!
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

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { unreadCount, markAllRead } = useNotifications();
  const [localNotifs, setLocal] = useState(notificationApi.getAll());
  
  // Live ticker so times automatically update while sitting on the page
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000); // Updates every 30 seconds
    return () => clearInterval(timer);
  }, []);

  const removeNotif = (id) => {
    const updated = localNotifs.filter((n) => n.id !== id);
    localStorage.setItem('omni_notifications', JSON.stringify(updated));
    setLocal(updated);
  };

  const clearAll = () => {
    notificationApi.clear();
    setLocal([]);
  };

  const handleMarkAllRead = () => {
    markAllRead();
    setLocal(notificationApi.getAll());
  };

  const items = localNotifs;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      
      {/* Top Navigation Bar */}
      <header style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
        <button 
          onClick={() => navigate('/')} 
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </header>

      {/* Scrollable Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '40px 20px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 60 }}>
          
          {/* Header & Actions */}
          <div className="anim-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Notifications</h1>
                {unreadCount > 0 && (
                  <span style={{ background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 800, padding: '2px 10px', borderRadius: 99 }}>
                    {unreadCount} New
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--text-3)', margin: 0, fontSize: 14 }}>AI price drop alerts and deal updates.</p>
            </div>

            {items.length > 0 && (
              <div style={{ display: 'flex', gap: 12 }}>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead} 
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-3)', color: 'var(--text)', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--primary-light)'; e.currentTarget.style.color = 'var(--primary-light)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)'; }}
                  >
                    <CheckCheck size={14} /> Mark all read
                  </button>
                )}
                <button 
                  onClick={clearAll} 
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                >
                  <Trash2 size={14} /> Clear All
                </button>
              </div>
            )}
          </div>

          {/* Empty State */}
          {items.length === 0 ? (
            <div className="anim-fade-up stagger-1" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 24, padding: '80px 20px', textAlign: 'center' }}>
              <div style={{ width: 80, height: 80, margin: '0 auto 24px', background: 'rgba(99,102,241,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BellOff size={36} color="var(--primary-light)" />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>All caught up! 🎉</h3>
              <p style={{ color: 'var(--text-3)', maxWidth: 400, margin: '0 auto 24px', lineHeight: 1.5 }}>
                Alerts will appear here when our AI detects price drops or finds the best time to buy products you've searched for.
              </p>
              <button 
                className="btn btn-primary" 
                onClick={() => navigate('/')} 
                style={{ padding: '12px 24px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' }}
              >
                Go Search Products
              </button>
            </div>
          ) : (
            /* Notification List */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map((n, i) => {
                const meta = getTypeMeta(n.type);
                return (
                  <div
                    key={n.id}
                    className="anim-fade-up"
                    style={{
                      animationDelay: `${i * 40}ms`,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 16,
                      padding: '20px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 16,
                      position: 'relative',
                      overflow: 'hidden',
                      opacity: n.read ? 0.6 : 1,
                      transition: 'opacity 0.3s ease'
                    }}
                  >
                    {/* Unread Indicator Bar */}
                    {!n.read && (
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'var(--primary-light)' }} />
                    )}

                    {/* Icon Bubble */}
                    <div style={{
                      width: 48, height: 48, borderRadius: 14,
                      background: meta.bg, color: meta.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {meta.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
                        <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                          {n.productName || 'Product Alert'}
                        </h4>
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: meta.color,
                          background: meta.bg, padding: '2px 8px', borderRadius: 99,
                          textTransform: 'uppercase', letterSpacing: '0.05em'
                        }}>
                          {meta.label}
                        </span>
                      </div>
                      <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5, margin: '0 0 8px 0' }}>
                        {n.message}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0, fontWeight: 500 }}>
                        {/* Notice we pass the three variables here */}
                        {timeAgo(n.timestamp, n.id, currentTime)}
                      </p>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => removeNotif(n.id)}
                      style={{ 
                        background: 'none', border: 'none', color: 'var(--text-3)', 
                        padding: 8, borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-3)'; }}
                      title="Dismiss"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}