import { useState, useRef, useEffect } from 'react';
import {
  User, LogOut, Settings, ChevronDown,
  Bell, Shield, Bookmark
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const PALETTE = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#06b6d4'];

// 🔥 FIX: Passed imageUrl as a prop to render the uploaded picture
function Avatar({ name, imageUrl, size = 36 }) {
  if (imageUrl) {
    return (
      <img 
        src={imageUrl} 
        alt={name} 
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }} 
      />
    );
  }

  const initials = (name || 'U').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const color    = PALETTE[(name?.charCodeAt(0) || 0) % PALETTE.length];
  
  return (
    <div className="avatar"
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, ${color}, ${color}bb)`,
        fontSize: size * 0.36,
        boxShadow: `0 4px 14px ${color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', borderRadius: '50%', fontWeight: 700, flexShrink: 0
      }}
    >
      {initials}
    </div>
  );
}

const MENU_ITEMS = [
  { icon: User,     label: 'My Profile',   sub: 'View your details',   href: '/profile'       },
  { icon: Bookmark, label: 'Saved Items',   sub: 'Your wishlist',       href: '/saved'         },
  { icon: Bell,     label: 'Notifications', sub: 'Price drop alerts',   href: '/notifications' },
  { icon: Settings, label: 'Settings',      sub: 'Preferences',         href: '/settings'      },
];

export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const [open, setOpen]  = useState(false);
  const ref              = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  if (!user) return null;

  const displayName = user?.fullName || user?.name || user?.username || 'Your Name';
  const displayEmail = user?.email || 'user@omniprice.ai';
  // 🔥 FIX: Extract avatar from user context
  const userAvatar = user?.avatar || null; 

  const handleNav = (href) => {
    setOpen(false);
    navigate(href);
  };

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <div style={{ position: 'relative', marginLeft: 'auto' }} ref={ref}>

      {/* ── Trigger Button ── */}
      <button
        id="profile-menu-btn"
        className="profile-trigger"
        onClick={() => setOpen(o => !o)}
        aria-label="Profile menu"
        aria-expanded={open}
        style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <Avatar name={displayName} imageUrl={userAvatar} size={36} />

        <div className="profile-trigger-text" style={{ textAlign: 'left' }}>
          <p className="profile-name" style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
            {displayName}
          </p>
        </div>

        <ChevronDown
          size={14}
          style={{
            color: 'var(--text-3)',
            transition: 'transform 0.25s',
            transform: open ? 'rotate(180deg)' : 'none',
            flexShrink: 0,
          }}
        />
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div className="profile-dropdown anim-scale-in" role="menu" style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 240, background: 'var(--surface)', border: '1px solid var(--border-2)',
          borderRadius: 16, padding: 8, zIndex: 100,
          boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)'
        }}>
          {/* Header banner */}
          <div className="profile-header" style={{ padding: '12px 12px 16px', display: 'flex', gap: 12, borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
            <Avatar name={displayName} imageUrl={userAvatar} size={42} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', margin: '0 0 2px 0' }}>{displayName}</p>
              <p style={{
                fontSize: 11, color: 'var(--text-3)', margin: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {displayEmail}
              </p>
              <div className="profile-verified" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#10b981', fontWeight: 600, marginTop: 6 }}>
                <Shield size={11} /> Verified Member
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="profile-menu-list">
            {MENU_ITEMS.map(({ icon: Icon, label, sub, href }) => (
              <button
                key={label}
                className="profile-menu-item"
                onClick={() => handleNav(href)}
                role="menuitem"
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'none', border: 'none', borderRadius: 10, cursor: 'pointer', transition: 'background 0.2s', textAlign: 'left' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'var(--surface-3)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div className="menu-item-icon" style={{ color: 'var(--text-2)' }}>
                  <Icon size={16} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: '0 0 2px 0', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-3)' }}>{sub}</p>
                </div>
              </button>
            ))}
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

          {/* Sign out */}
          <div className="profile-footer">
            <button
              id="logout-btn"
              className="logout-item"
              onClick={handleLogout}
              role="menuitem"
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'none', border: 'none', borderRadius: 10, cursor: 'pointer', transition: 'background 0.2s', textAlign: 'left' }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div className="menu-item-icon" style={{ background: 'rgba(239,68,68,0.15)', padding: 6, borderRadius: 8 }}>
                <LogOut size={14} style={{ color: '#ef4444' }} />
              </div>
              <div>
                <p style={{ margin: '0 0 2px 0', fontSize: 13, fontWeight: 600, color: '#ef4444' }}>Sign Out</p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-3)' }}>See you next time</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}