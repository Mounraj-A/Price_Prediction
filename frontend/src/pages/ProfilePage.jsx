import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Mail, Shield, Camera, Save, Loader2, Edit3
} from 'lucide-react';

const PALETTE = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#06b6d4'];

function InteractiveAvatar({ name, imagePreview, onImageClick }) {
  const initials = (name || 'U').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const color = PALETTE[(name?.charCodeAt(0) || 0) % PALETTE.length];
  
  return (
    <div 
      style={{ 
        position: 'relative', width: 100, height: 100, cursor: 'pointer',
        borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
        boxShadow: imagePreview ? '0 8px 32px rgba(0,0,0,0.5)' : `0 8px 32px ${color}44`,
        border: '3px solid var(--surface-2)', outline: '2px solid var(--primary-light)'
      }}
      onClick={onImageClick}
      className="avatar-hover-group"
    >
      {imagePreview ? (
        <img src={imagePreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${color}, ${color}bb)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 700, color: '#fff' }}>
          {initials}
        </div>
      )}
      
      {/* Hover Overlay */}
      <div className="avatar-overlay" style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        opacity: 0, transition: 'opacity 0.2s ease', gap: 6
      }}>
        <Camera size={20} color="#fff" />
        <span style={{ color: '#fff', fontSize: 11, fontWeight: 600 }}>Change</span>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [name, setName] = useState(user?.fullName || user?.name || user?.username || '');
  const [email] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // 🔥 FIX: Initialize the preview with the user's existing avatar!
  const [imagePreview, setImagePreview] = useState(user?.avatar || null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result); 
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    
    const savedUser = JSON.parse(localStorage.getItem('omni_user') || '{}');
    
    savedUser.fullName = name;
    savedUser.name = name; 
    if (imagePreview) savedUser.avatar = imagePreview; // Save the base64 image string
    
    localStorage.setItem('omni_user', JSON.stringify(savedUser));
    
    if (updateUser) {
      updateUser(savedUser);
    }
    
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      
      {/* Top Navigation Bar */}
      <header style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <button 
          onClick={() => navigate('/')} 
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </header>

      {/* Scrollable Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '40px 20px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          
          <div className="anim-fade-up" style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px 0' }}>Profile Settings</h1>
            <p style={{ color: 'var(--text-3)', margin: 0, fontSize: 14 }}>Manage your personal details and app preferences.</p>
          </div>

          <div className="anim-fade-up stagger-1" style={{ 
            background: 'var(--surface-2)', 
            border: '1px solid var(--border)', 
            borderRadius: 24, 
            padding: '32px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.2)'
          }}>
            
            {/* Avatar & Verification Banner */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, paddingBottom: 32, borderBottom: '1px solid var(--border)', marginBottom: 32 }}>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                accept="image/*" 
                style={{ display: 'none' }} 
              />
              <InteractiveAvatar name={name} imagePreview={imagePreview} onImageClick={() => fileInputRef.current.click()} />
              
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px 0' }}>{name || 'Your Name'}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{email}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                    <Shield size={10} /> Verified
                  </span>
                </div>
                <button onClick={() => fileInputRef.current.click()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--primary-light)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, marginTop: 12 }}>
                  <Edit3 size={13} /> Update Picture
                </button>
              </div>
            </div>

            {/* Edit Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              <div className="form-group">
                <label className="form-label" style={{ marginBottom: 8 }}>Display Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} className="form-icon left" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                  <input 
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    className="input-field" placeholder="What should we call you?" 
                    style={{ width: '100%', padding: '14px 14px 14px 40px', background: 'var(--bg)', border: '1px solid var(--border)' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                  <label className="form-label" style={{ margin: 0 }}>Email Address</label>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Contact support to change</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} className="form-icon left" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                  <input 
                    type="email" value={email} readOnly
                    className="input-field" 
                    style={{ width: '100%', padding: '14px 14px 14px 40px', background: 'var(--bg)', border: '1px solid var(--border)', opacity: 0.5, cursor: 'not-allowed' }} 
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Floating Action Bar */}
          <div className="anim-fade-up stagger-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 24px', marginTop: 24, boxShadow: '0 12px 24px rgba(0,0,0,0.1)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Changes are saved locally.</span>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {saved && (
                <span className="anim-scale-in" style={{ fontSize: 13, color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Shield size={14} /> Profile updated!
                </span>
              )}
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', borderRadius: 10 }}>
                {saving
                  ? <><Loader2 size={16} className="anim-spin" /> Saving…</>
                  : <><Save size={16} /> Save Changes</>
                }
              </button>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        .avatar-hover-group:hover .avatar-overlay { opacity: 1 !important; }
      `}</style>
    </div>
  );
}