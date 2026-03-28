import React, { useEffect, useRef, useState } from 'react';
import { X, TrendingDown, Activity } from 'lucide-react';

export default function PriceChart({ data, loading, onClose, productName }) {
  const pathRef = useRef(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Animate chart line
  useEffect(() => {
    if (!pathRef.current) return;
    const length = pathRef.current.getTotalLength?.() || 2000;
    pathRef.current.style.strokeDasharray = length;
    pathRef.current.style.strokeDashoffset = length;
    pathRef.current.style.transition = 'none';
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        pathRef.current.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.2, 0.8, 0.2, 1)';
        pathRef.current.style.strokeDashoffset = '0';
      });
    });
  }, [data, loading]);

  // Wrapper for the Full-Screen Modal
  const ModalWrapper = ({ children }) => (
    <div style={{ 
      position: 'fixed', inset: 0, zIndex: 99999, 
      display: 'flex', alignItems: 'center', justifyContent: 'center', 
      background: 'rgba(9, 9, 11, 0.85)', backdropFilter: 'blur(8px)', padding: '20px',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div className="anim-scale-in" style={{ 
        position: 'relative', background: 'var(--surface)', border: '1px solid var(--border-2)', 
        borderRadius: 20, padding: '32px', width: '100%', maxWidth: 900, 
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255,255,255,0.05)' 
      }}>
        
        {/* Close Button */}
        <button onClick={onClose} style={{ 
          position: 'absolute', top: 24, right: 24, background: 'var(--surface-2)', 
          border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: '8px', 
          width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', 
          cursor: 'pointer', transition: 'all 0.2s'
        }}
        onMouseOver={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
        onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.background = 'var(--surface-2)'; }}
        >
          <X size={18} />
        </button>

        <div style={{ marginBottom: 32, paddingRight: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Activity size={20} style={{ color: '#3b82f6' }} />
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Price History</h2>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Tracking market trends for <span style={{ color: '#fff', fontWeight: 500 }}>{productName || 'this item'}</span>
          </p>
        </div>

        {children}
      </div>
    </div>
  );

  if (loading) {
    return (
      <ModalWrapper>
        <div className="skeleton" style={{ width: '100%', height: 350, borderRadius: 12 }} />
      </ModalWrapper>
    );
  }

  if (!data || data.length < 2) {
    return (
      <ModalWrapper>
        <div style={{ width: '100%', padding: '80px 20px', textAlign: 'center', backgroundColor: 'var(--surface-2)', borderRadius: 16, border: '1px dashed var(--border-2)' }}>
          <TrendingDown size={48} style={{ color: 'var(--text-3)', margin: '0 auto 16px', opacity: 0.5 }} />
          <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>Not enough price history</p>
          <p style={{ margin: '8px 0 0 0', fontSize: 14, color: 'var(--text-3)', maxWidth: 400, marginInline: 'auto' }}>
            We've just started tracking this item. Check back soon as our AI collects more market data!
          </p>
        </div>
      </ModalWrapper>
    );
  }

  // Formatting and Math
  const points = data
    .map((d) => ({
      x: new Date(d.createdAt).getTime(),
      y: d.price,
      label: new Date(d.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      fullDate: new Date(d.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    }))
    .sort((a, b) => a.x - b.x);

  const W = 800, H = 340;
  const PAD = { top: 20, right: 30, bottom: 40, left: 60 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;

  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  
  const yBuffer = (maxY - minY) * 0.1 || 10;
  const adjustedMinY = Math.max(0, minY - yBuffer); 
  const adjustedMaxY = maxY + yBuffer;
  
  const rangeX = maxX - minX || 1;
  const rangeY = adjustedMaxY - adjustedMinY || 1;

  const toSvgX = (x) => PAD.left + ((x - minX) / rangeX) * cw;
  const toSvgY = (y) => PAD.top + ch - ((y - adjustedMinY) / rangeY) * ch;

  // 🔥 FIXED BEZIER LOGIC: Mathematically prevents the line from ever looping backwards vertically
  const dPath = points.reduce((acc, p, i) => {
    const sx = toSvgX(p.x);
    const sy = toSvgY(p.y);
    if (i === 0) return `M ${sx},${sy}`;
    const prev = points[i - 1];
    const px = toSvgX(prev.x);
    const py = toSvgY(prev.y);
    // Control points are horizontally in the middle between the two points
    const cpx = (px + sx) / 2;
    return `${acc} C ${cpx},${py} ${cpx},${sy} ${sx},${sy}`;
  }, '');

  const firstX = toSvgX(points[0].x);
  const lastX = toSvgX(points[points.length - 1].x);
  const bottom = PAD.top + ch;
  const areaPath = `${dPath} L ${lastX},${bottom} L ${firstX},${bottom} Z`;

  // Grid Ticks
  const yTicks = [
    adjustedMinY, 
    adjustedMinY + (adjustedMaxY - adjustedMinY) * 0.33, 
    adjustedMinY + (adjustedMaxY - adjustedMinY) * 0.66, 
    adjustedMaxY
  ].map(v => ({ y: toSvgY(v), label: `₹${Math.round(v).toLocaleString('en-IN')}` }));

  // Show roughly 5 evenly spaced X-axis labels
  const xTicks = [];
  const numXTicks = Math.min(points.length, 5);
  for (let i = 0; i < numXTicks; i++) {
    const index = Math.floor(i * (points.length - 1) / (numXTicks - 1));
    xTicks.push(points[index]);
  }

  const themeColor = "#3b82f6"; // Professional Google Blue

  return (
    <ModalWrapper>
      <div style={{ position: 'relative', width: '100%', fontFamily: 'system-ui, sans-serif' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={themeColor} stopOpacity="0.25" />
              <stop offset="80%" stopColor={themeColor} stopOpacity="0.01" />
              <stop offset="100%" stopColor={themeColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines & Y-Labels */}
          {yTicks.map((t, i) => (
            <g key={`y-${i}`}>
              <line 
                x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y}
                stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 4"
              />
              <text 
                x={PAD.left - 12} y={t.y + 4}
                textAnchor="end" fontSize="12" fill="#71717a" fontWeight="500"
              >
                {t.label}
              </text>
            </g>
          ))}

          {/* Vertical Grid lines & X-Labels */}
          {xTicks.map((t, i) => {
            const tx = toSvgX(t.x);
            return (
              <g key={`x-${i}`}>
                <line 
                  x1={tx} y1={PAD.top} x2={tx} y2={bottom}
                  stroke="rgba(255,255,255,0.03)" strokeWidth="1"
                />
                <text 
                  x={tx} y={H - 5}
                  textAnchor="middle" fontSize="12" fill="#71717a" fontWeight="500"
                >
                  {t.label}
                </text>
              </g>
            );
          })}

          {/* X and Y Axis Base Lines */}
          <line x1={PAD.left} y1={bottom} x2={W - PAD.right} y2={bottom} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={bottom} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

          {/* Area fill & Crisp Line */}
          <path d={areaPath} fill="url(#chartGradient)" />
          <path 
            ref={pathRef} d={dPath} fill="none" stroke={themeColor} 
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          />

          {/* Interactive Hover Layer */}
          {points.map((p, i) => {
            const px = toSvgX(p.x);
            const py = toSvgY(p.y);
            return (
              <g key={`hover-${i}`}>
                {/* Invisible rects to catch hover */}
                <rect
                  x={px - (cw / points.length) / 2} y={PAD.top}
                  width={cw / points.length} height={ch} fill="transparent"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{ cursor: 'crosshair' }}
                />
                
                {hoveredIndex === i && (
                  <>
                    {/* The Full-Height Dotted Line */}
                    <line 
                      x1={px} y1={PAD.top} x2={px} y2={bottom} 
                      stroke={themeColor} strokeWidth="1.5" strokeDasharray="4 4" 
                    />
                    {/* The Hover Dot */}
                    <circle 
                      cx={px} cy={py} r="5"
                      fill="#fff" stroke={themeColor} strokeWidth="2.5"
                      style={{ pointerEvents: 'none' }}
                    />
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* Clean, Dark Tooltip */}
        {hoveredIndex !== null && (
          <div style={{
            position: 'absolute',
            left: `${(toSvgX(points[hoveredIndex].x) / W) * 100}%`,
            top: `${(toSvgY(points[hoveredIndex].y) / H) * 100}%`,
            transform: 'translate(-50%, -120%)',
            background: '#09090b',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            padding: '8px 14px',
            borderRadius: '8px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
            zIndex: 10,
          }}>
            <div style={{ fontWeight: 600, fontSize: '15px', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: themeColor }}></div>
              ₹{points[hoveredIndex].y.toLocaleString('en-IN')}
            </div>
            <div style={{ color: '#a1a1aa', fontSize: '11px', marginTop: '4px', paddingLeft: 14 }}>
              {points[hoveredIndex].fullDate}
            </div>
          </div>
        )}
      </div>
    </ModalWrapper>
  );
}