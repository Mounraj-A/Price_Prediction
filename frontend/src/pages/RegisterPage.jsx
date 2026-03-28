import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Loader2, ShoppingCart, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Canvas Particle Network Background
const ParticlesBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particlesArray = [];
    const mouse = { x: null, y: null, radius: 120 };

    const handleMouseMove = (e) => { mouse.x = e.x; mouse.y = e.y; };
    const handleMouseOut = () => { mouse.x = null; mouse.y = null; };
    const handleResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; init(); };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseOut);
    window.addEventListener('resize', handleResize);

    class Particle {
      constructor(x, y, dx, dy, size) {
        this.x = x; this.y = y; this.dx = dx; this.dy = dy; this.size = size;
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = '#6366f1'; 
        ctx.fill();
      }
      update() {
        if (this.x > canvas.width || this.x < 0) this.dx = -this.dx;
        if (this.y > canvas.height || this.y < 0) this.dy = -this.dy;

        let dx = mouse.x - this.x;
        let dy = mouse.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < mouse.radius) {
          const force = (mouse.radius - distance) / mouse.radius;
          this.x -= (dx / distance) * force * 3;
          this.y -= (dy / distance) * force * 3;
        }

        this.x += this.dx;
        this.y += this.dy;
        this.draw();
      }
    }

    function init() {
      particlesArray = [];
      const numberOfParticles = (canvas.width * canvas.height) / 12000;
      for (let i = 0; i < numberOfParticles; i++) {
        const size = Math.random() * 2 + 1;
        const x = Math.random() * (innerWidth - size * 2) + size;
        const y = Math.random() * (innerHeight - size * 2) + size;
        const dx = (Math.random() - 0.5) * 1;
        const dy = (Math.random() - 0.5) * 1;
        particlesArray.push(new Particle(x, y, dx, dy, size));
      }
    }

    function connect() {
      for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
          let dist = Math.pow(particlesArray[a].x - particlesArray[b].x, 2) + Math.pow(particlesArray[a].y - particlesArray[b].y, 2);
          if (dist < 15000) {
            const opacity = 1 - dist / 15000;
            ctx.strokeStyle = `rgba(99,102,241,${opacity * 0.4})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
            ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
            ctx.stroke();
          }
        }
      }
    }

    function animate() {
      requestAnimationFrame(animate);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      particlesArray.forEach(p => p.update());
      connect();
    }

    init(); animate();
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />;
};

export default function RegisterPage() {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  
  const fullText = "OmniPrice AI";
  const [typedText, setTypedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  const { register }            = useAuth();
  const navigate                = useNavigate();

  useEffect(() => {
    let currentText = ""; let i = 0;
    const interval = setInterval(() => {
      if (i < fullText.length) { currentText += fullText[i]; setTypedText(currentText); i++; } 
      else clearInterval(interval);
    }, 120);
    const cursorInterval = setInterval(() => setShowCursor(prev => !prev), 500);
    return () => { clearInterval(interval); clearInterval(cursorInterval); };
  }, []);

  const submit = async e => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 6)  { setError('Password must be at least 6 characters'); return; }
    if (!name.trim()) { setError('Full name is required'); return; }
    
    setLoading(true);
    try { 
      // Generate username from name (remove spaces and convert to lowercase)
      const username = name.trim().toLowerCase().replace(/\s+/g, '_');
      await register(username, email.trim(), password, name.trim());
      navigate('/'); 
    } 
    catch (err) { setError(err.message || 'Registration failed'); } 
    finally { setLoading(false); }
  };

  const pwdStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthClass = ['', 'weak', 'medium', 'strong'];
  const strengthLabel = ['', 'Weak', 'Good', 'Strong'];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', position: 'relative', overflow: 'hidden', padding: '20px'
    }}>
      
      {/* Interactive Particle Network */}
      <ParticlesBackground />

      {/* Centered Register Card */}
      <div className="anim-fade-up" style={{
        width: '100%', maxWidth: 420,
        minHeight: 560, // Automatically expands downward to fit content safely!
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        borderRadius: 24, padding: '36px 32px 24px 32px', // Bottom padding adjusted
        boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
        zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'center'
      }}>
        
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <div className="logo-mark" style={{ width: 48, height: 48, borderRadius: 14 }}>
              <ShoppingCart size={24} color="#fff" />
            </div>
          </div>
          
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', margin: 0, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {typedText}
            <span style={{ opacity: showCursor ? 1 : 0, color: 'var(--primary-light)', marginLeft: 2 }}>|</span>
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 6 }}>
            Create an account to track deals for free.
          </p>
        </div>

        {error && <div className="auth-error" style={{ marginBottom: 16 }}><span>⚠️</span> {error}</div>}

        <form className="auth-form" onSubmit={submit}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label" style={{ marginBottom: 4 }}>Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={15} className="form-icon left" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}/>
              <input id="reg-name" type="text" required value={name} onChange={e => setName(e.target.value)}
                placeholder="John Doe" className="input-field" style={{ width: '100%', padding: '10px 12px 10px 36px' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label" style={{ marginBottom: 4 }}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} className="form-icon left" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}/>
              <input id="reg-email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" className="input-field" style={{ width: '100%', padding: '10px 12px 10px 36px' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label" style={{ marginBottom: 4 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} className="form-icon left" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}/>
              <input id="reg-password" type={showPwd ? 'text' : 'password'} required
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters" className="input-field" style={{ width: '100%', padding: '10px 36px' }} />
              <button type="button" onClick={() => setShowPwd(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            
            {password.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <div className="strength-bar" style={{ display: 'flex', gap: 4, height: 4 }}>
                  {[1,2,3].map(n => (
                    <div key={n} style={{ flex: 1, borderRadius: 2, background: n <= pwdStrength ? (pwdStrength === 1 ? '#ef4444' : pwdStrength === 2 ? '#f59e0b' : '#10b981') : 'var(--surface-3)', transition: 'background 0.3s' }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label" style={{ marginBottom: 4 }}>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} className="form-icon left" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}/>
              <input id="reg-confirm" type={showPwd ? 'text' : 'password'} required
                value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter password" className="input-field" style={{ width: '100%', padding: '10px 36px' }} />
              {confirm.length > 0 && password === confirm && (
                <CheckCircle2 size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#10b981' }} />
              )}
            </div>
          </div>

          <button id="reg-submit" type="submit" disabled={loading} className="btn btn-primary w-full" 
            style={{ padding: '14px 20px', borderRadius: 12, width: '100%', display: 'flex', justifyContent: 'center', gap: 8, fontSize: 15 }}
          >
            {loading ? <><Loader2 size={16} className="anim-spin" /> Creating account…</> : <><Sparkles size={16} /> Create Account <ArrowRight size={16} /></>}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <p style={{ color: 'var(--text-3)', fontSize: 13, margin: 0 }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--primary-light)', fontWeight: 600, textDecoration: 'none' }}>Sign in →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}