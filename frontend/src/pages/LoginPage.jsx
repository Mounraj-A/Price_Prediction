import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, Loader2, ShoppingCart, Sparkles, ArrowRight } from 'lucide-react';
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
        ctx.fillStyle = '#6366f1'; // Primary color
        ctx.fill();
      }
      update() {
        if (this.x > canvas.width || this.x < 0) this.dx = -this.dx;
        if (this.y > canvas.height || this.y < 0) this.dy = -this.dy;

        // Mouse collision repulsion
        let dx = mouse.x - this.x;
        let dy = mouse.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < mouse.radius) {
          const force = (mouse.radius - distance) / mouse.radius;
          const pushX = (dx / distance) * force * 3;
          const pushY = (dy / distance) * force * 3;
          this.x -= pushX;
          this.y -= pushY;
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
            ctx.strokeStyle = `rgba(99,102,241,${opacity * 0.4})`; // Faint purple lines
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

    init();
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />;
};


export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  
  const fullText = "OmniPrice AI";
  const [typedText, setTypedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  const { login }               = useAuth();
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
    setError(''); setLoading(true);
    try { await login(email.trim(), password); navigate('/'); } 
    catch (err) { setError(err.message || 'Invalid credentials'); } 
    finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', position: 'relative', overflow: 'hidden', padding: '20px'
    }}>
      
      {/* Interactive Particle Network */}
      <ParticlesBackground />

      {/* Centered Login Card */}
      <div className="anim-fade-up" style={{
        width: '100%', maxWidth: 420,
        minHeight: 560, // Changed from fixed height so content doesn't break
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 24, padding: '40px 32px',
        boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
        zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'center'
      }}>
        
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div className="logo-mark" style={{ width: 48, height: 48, borderRadius: 14 }}>
              <ShoppingCart size={24} color="#fff" />
            </div>
          </div>
          
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', margin: 0, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {typedText}
            <span style={{ opacity: showCursor ? 1 : 0, color: 'var(--primary-light)', marginLeft: 2 }}>|</span>
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14, marginTop: 8 }}>
            Sign in to continue finding the best deals.
          </p>
        </div>

        {error && <div className="auth-error" style={{ marginBottom: 20 }}><span>⚠️</span> {error}</div>}

        <form className="auth-form" onSubmit={submit}>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} className="form-icon left" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}/>
              <input id="login-email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" className="input-field" style={{ width: '100%', padding: '12px 12px 12px 40px' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} className="form-icon left" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}/>
              <input id="login-password" type={showPwd ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" className="input-field" style={{ width: '100%', padding: '12px 40px 12px 40px' }} />
              <button type="button" onClick={() => setShowPwd(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button id="login-submit" type="submit" disabled={loading} className="btn btn-primary w-full" 
            style={{ padding: '14px 20px', borderRadius: 12, width: '100%', display: 'flex', justifyContent: 'center', gap: 8, fontSize: 15 }}
          >
            {loading ? <><Loader2 size={16} className="anim-spin" /> Signing in…</> : <><Sparkles size={16} /> Sign In <ArrowRight size={16} /></>}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <p style={{ color: 'var(--text-3)', fontSize: 13 }}>
            Don't have an account? <Link to="/register" style={{ color: 'var(--primary-light)', fontWeight: 600, textDecoration: 'none' }}>Create one free →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}