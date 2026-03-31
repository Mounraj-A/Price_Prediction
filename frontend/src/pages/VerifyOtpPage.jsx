import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Loader2, ShieldCheck, RefreshCw, ShoppingCart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Reuse the same particle background style as login/register (keeps UI consistent)
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
      constructor(x, y, dx, dy, size) { this.x = x; this.y = y; this.dx = dx; this.dy = dy; this.size = size; }
      draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fillStyle = '#6366f1'; ctx.fill(); }
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

export default function VerifyOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyOtp, resendOtp } = useAuth();

  const initialEmail = useMemo(() => {
    const st = location.state?.email;
    const qp = new URLSearchParams(location.search).get('email');
    return (st || qp || '').toString();
  }, [location.state, location.search]);

  const [email] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [resending, setResending] = useState(false);

  const onVerify = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    if (!email) { setErr('Email is missing. Please register again.'); return; }
    if (!otp || otp.trim().length !== 6) { setErr('Enter the 6-digit OTP'); return; }
    setLoading(true);
    try {
      const r = await verifyOtp(email.trim(), otp.trim());
      setMsg(r?.message || 'Email verified successfully');
      setTimeout(() => navigate('/login', { state: { email } }), 700);
    } catch (e2) {
      setErr(e2.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    setErr(''); setMsg('');
    if (!email) { setErr('Email is missing.'); return; }
    setResending(true);
    try {
      const r = await resendOtp(email.trim());
      setMsg(r?.message || 'OTP sent to email');
    } catch (e2) {
      setErr(e2.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', position: 'relative', overflow: 'hidden', padding: '20px'
    }}>
      <ParticlesBackground />

      <div className="anim-fade-up" style={{
        width: '100%', maxWidth: 420,
        minHeight: 520,
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        borderRadius: 24, padding: '36px 32px 24px 32px',
        boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
        zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <div className="logo-mark" style={{ width: 48, height: 48, borderRadius: 14 }}>
              <ShoppingCart size={24} color="#fff" />
            </div>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
            Verify Email
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 6 }}>
            Enter the OTP sent to your email (valid for 5 minutes).
          </p>
        </div>

        {err && <div className="auth-error" style={{ marginBottom: 16 }}><span>⚠️</span> {err}</div>}
        {msg && <div className="auth-success" style={{ marginBottom: 16 }}><span>✅</span> {msg}</div>}

        <form className="auth-form" onSubmit={onVerify}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label" style={{ marginBottom: 4 }}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} className="form-icon left" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}/>
              <input type="email" value={email} readOnly
                className="input-field" style={{ width: '100%', padding: '10px 12px 10px 36px', opacity: 0.9 }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 18 }}>
            <label className="form-label" style={{ marginBottom: 4 }}>OTP</label>
            <div style={{ position: 'relative' }}>
              <ShieldCheck size={15} className="form-icon left" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}/>
              <input type="text" inputMode="numeric" pattern="[0-9]*"
                value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit OTP" className="input-field"
                style={{ width: '100%', padding: '10px 12px 10px 36px', letterSpacing: '0.25em' }} />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary w-full"
            style={{ padding: '14px 20px', borderRadius: 12, width: '100%', display: 'flex', justifyContent: 'center', gap: 8, fontSize: 15 }}
          >
            {loading ? <><Loader2 size={16} className="anim-spin" /> Verifying…</> : <>Verify OTP</>}
          </button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, gap: 12 }}>
          <button type="button" onClick={onResend} disabled={resending}
            className="btn"
            style={{ flex: 1, padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-3)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {resending ? <><Loader2 size={16} className="anim-spin" /> Sending…</> : <><RefreshCw size={16} /> Resend OTP</>}
          </button>
          <Link to="/login" style={{ flex: 1, textAlign: 'center', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', textDecoration: 'none', fontWeight: 700 }}>
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

