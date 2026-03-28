import { useState } from 'react';
import { SlidersHorizontal, Star, DollarSign, Store, X, ChevronDown, RotateCcw, CheckSquare, Square } from 'lucide-react';

const PLATFORMS = [
  { id: 'flipkart', label: 'Flipkart', emoji: '🛒' },
  { id: 'amazon', label: 'Amazon', emoji: '📦' },
  { id: 'ebay', label: 'eBay', emoji: '🔖' },
  { id: 'walmart', label: 'Walmart', emoji: '🏪' },
  { id: 'google', label: 'Google', emoji: '🌐' },
  { id: 'others', label: 'Others', emoji: '✨' },
];

function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 2 }}>
      <button className="section-toggle" onClick={() => setOpen(o => !o)}>
        <span className="section-toggle-label">
          <Icon size={14} style={{ color: 'var(--primary-light)' }} />
          {title}
        </span>
        <ChevronDown size={14} className={`section-chevron ${open ? 'open' : ''}`} />
      </button>
      <div className={`section-body ${open ? '' : 'collapsed'}`} style={{ maxHeight: open ? 400 : 0 }}>
        {children}
      </div>
    </div>
  );
}

export default function Sidebar({ filters, onChange, onReset, isOpen, onClose }) {
  const togglePlatform = id => {
    const cur = filters.platforms || [];
    onChange({ ...filters, platforms: cur.includes(id) ? cur.filter(p => p !== id) : [...cur, id] });
  };

  const activeCount =
    (filters.platforms?.length || 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.priceRange[1] < 500000 ? 1 : 0);

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-title">
            <div className="sidebar-icon-wrap">
              <SlidersHorizontal size={13} color="#fff" />
            </div>
            Filters
            {activeCount > 0 && <span className="filter-count">{activeCount}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {activeCount > 0 && (
              <button className="btn btn-danger" style={{ padding: '5px 10px', fontSize: 12, gap: 4 }} onClick={onReset}>
                <RotateCcw size={11} /> Reset
              </button>
            )}
            <button className="search-icon-btn" onClick={onClose} style={{ display: 'flex' }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="sidebar-body">

          {/* Marketplace Checkboxes */}
          <Section title="Marketplace" icon={Store}>
            <div style={{ padding: '4px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {PLATFORMS.map(p => {
                const active = (filters.platforms || []).includes(p.id);
                return (
                  <button key={p.id} className={`filter-btn ${active ? 'active' : ''}`}
                    onClick={() => togglePlatform(p.id)}
                    style={{ padding: '8px 12px', justifyContent: 'flex-start' }}
                  >
                    {active ? <CheckSquare size={16} color="var(--primary-light)" /> : <Square size={16} color="var(--text-3)" />}
                    <span style={{ fontSize: 16, lineHeight: 1, marginLeft: 4 }}>{p.emoji}</span>
                    <span style={{ flex: 1, textAlign: 'left' }}>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          <div className="sidebar-divider" />

          {/* Rating — Interactive Single Row */}
          <Section title="Minimum Rating" icon={Star}>
            <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {[1, 2, 3, 4, 5].map(star => {
                  const active = filters.minRating >= star;
                  return (
                    <button
                      key={star}
                      onClick={() => onChange({ ...filters, minRating: filters.minRating === star ? 0 : star })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                      title={`${star} Stars & Up`}
                    >
                      <Star
                        size={26}
                        fill={active ? '#f59e0b' : 'none'}
                        color={active ? '#f59e0b' : '#3f3f5a'}
                        style={{ filter: active ? 'drop-shadow(0 0 6px rgba(245,158,11,0.3))' : 'none', transition: 'all 0.2s' }}
                      />
                    </button>
                  );
                })}
              </div>
              <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>
                {filters.minRating === 0 ? 'Any rating' : `${filters.minRating} Stars & Up`}
              </div>
            </div>
          </Section>

          <div className="sidebar-divider" />

          {/* Price — Single Max Slider */}
          <Section title="Max Price" icon={DollarSign}>
            <div style={{ padding: '8px 16px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>Under</span>
                <span className="price-tag" style={{ fontSize: 14 }}>
                  {filters.priceRange[1] >= 500000 ? '₹5,00,000+' : `₹${filters.priceRange[1].toLocaleString('en-IN')}`}
                </span>
              </div>
              
              <input 
                type="range" 
                min={0} 
                max={500000} 
                step={1000}
                value={filters.priceRange[1]}
                onChange={e => onChange({ ...filters, priceRange: [0, +e.target.value] })}
              />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>
                <span>₹0</span>
                <span>₹5L+</span>
              </div>
            </div>
          </Section>

        </div>
      </aside>
    </>
  );
}