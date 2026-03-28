import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Moon, Sun, Bell, Smartphone, Mail, CheckCircle2 } from 'lucide-react';

function getPrefs() {
  try {
    return JSON.parse(localStorage.getItem('omni_prefs')) || {
      darkMode: true,
      priceDrop: true, 
      dealAlerts: true, 
      weeklyDigest: false,
    };
  } catch {
    return { darkMode: true, priceDrop: true, dealAlerts: true, weeklyDigest: false };
  }
}

const ToggleSwitch = ({ checked, onChange }) => (
  <div 
    onClick={onChange} 
    style={{
      width: 48, height: 26, borderRadius: 99,
      background: checked ? 'var(--primary-light, #6366f1)' : 'var(--surface-3, #3f3f46)',
      position: 'relative', cursor: 'pointer', transition: 'background 0.2s ease',
      flexShrink: 0
    }}
  >
    <div style={{
      width: 20, height: 20, borderRadius: '50%', background: '#fff',
      position: 'absolute', top: 3, left: checked ? 25 : 3,
      transition: 'left 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)', 
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    }} />
  </div>
);

export default function SettingsPage() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState(getPrefs());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = (key) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  // Triggers the global CSS we just added to index.css
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    
    if (prefs.darkMode) {
      root.classList.remove('light', 'light-mode');
      body.classList.remove('light', 'light-mode');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.add('light-mode', 'light');
      body.classList.add('light-mode', 'light');
      root.setAttribute('data-theme', 'light');
    }
  }, [prefs.darkMode]);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    localStorage.setItem('omni_prefs', JSON.stringify(prefs));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const SettingRow = ({ icon: Icon, title, desc, settingKey, isLast }) => (
    <div style={{ 
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
      padding: '20px 0', borderBottom: isLast ? 'none' : '1px solid var(--border)' 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ 
          width: 48, height: 48, borderRadius: 12, background: 'var(--surface-3)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' 
        }}>
          <Icon size={20} />
        </div>
        <div>
          <p style={{ margin: '0 0 6px 0', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)' }}>{desc}</p>
        </div>
      </div>
      <ToggleSwitch checked={prefs[settingKey]} onChange={() => toggle(settingKey)} />
    </div>
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      
      {/* Top Navigation Bar */}
      <header style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          <ArrowLeft size={16} /> Back
        </button>
      </header>

      {/* Scrollable Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '40px 20px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 60 }}>
          
          <div className="anim-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px 0' }}>Settings</h1>
              <p style={{ color: 'var(--text-3)', margin: 0, fontSize: 14 }}>Manage your app appearance and alert preferences.</p>
            </div>
          </div>

          {/* APPEARANCE CARD */}
          <div className="anim-fade-up stagger-1" style={{ 
            background: 'var(--surface-2)', border: '1px solid var(--border)', 
            borderRadius: 16, padding: '24px 32px', marginBottom: 24 
          }}>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px 0' }}>
              Appearance
            </h3>
            <SettingRow 
              icon={prefs.darkMode ? Moon : Sun} 
              title="Dark Mode" 
              desc="Toggle between dark and light themes" 
              settingKey="darkMode" 
              isLast={true}
            />
          </div>

          {/* NOTIFICATIONS CARD */}
          <div className="anim-fade-up stagger-2" style={{ 
            background: 'var(--surface-2)', border: '1px solid var(--border)', 
            borderRadius: 16, padding: '24px 32px', marginBottom: 24 
          }}>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px 0' }}>
              Alert Preferences
            </h3>
            <SettingRow icon={Bell} title="Price Drop Alerts" desc="Get notified instantly when saved prices fall" settingKey="priceDrop" />
            <SettingRow icon={Smartphone} title="Push Notifications" desc="Allow browser flash deal notifications" settingKey="dealAlerts" />
            <SettingRow icon={Mail} title="Weekly Digest" desc="Receive a summary of the best deals every Monday" settingKey="weeklyDigest" isLast={true} />
          </div>

          {/* ACTION BAR */}
          <div className="anim-fade-up stagger-3" style={{ 
            background: 'var(--surface-2)', border: '1px solid var(--border)', 
            borderRadius: 16, padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px 0' }}>Unsaved Changes</h4>
              <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>Apply your changes to update your experience.</p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {saved && (
                <span style={{ fontSize: 13, color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={16} /> Applied
                </span>
              )}
              <button 
                onClick={handleSave} 
                disabled={saving} 
                style={{ 
                  background: 'var(--primary)', color: '#fff', padding: '12px 24px', borderRadius: 10, 
                  display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, 
                  border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 
                }}
              >
                {saving
                  ? <><Loader2 size={16} className="anim-spin" /> Saving…</>
                  : <><Save size={16} /> Apply Settings</>
                }
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}