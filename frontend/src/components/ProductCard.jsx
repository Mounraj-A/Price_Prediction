import { useState } from 'react';
import { Star, ExternalLink, ShoppingCart } from 'lucide-react';
import SaveButton from './SaveButton';

const PLATFORM_META = {
  flipkart: { label: 'Flipkart', cls: 'badge-flipkart', emoji: '🛒' },
  amazon:   { label: 'Amazon',   cls: 'badge-amazon',   emoji: '📦' },
  ebay:     { label: 'eBay',     cls: 'badge-ebay',     emoji: '🔖' },
  walmart:  { label: 'Walmart',  cls: 'badge-walmart',  emoji: '🏪' },
  google:   { label: 'Google',   cls: 'badge-google',   emoji: '🌐' },
};

function getPlatform(p) {
  return PLATFORM_META[p?.toLowerCase()] || { label: p || 'Unknown', cls: 'badge-other', emoji: '✨' };
}

function Stars({ rating }) {
  const r = Math.round((rating || 0) * 2) / 2;
  return (
    <div className="stars">
      <div className="stars-row">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star key={s} size={12}
            fill={s <= r ? '#f59e0b' : 'none'}
            stroke={s <= r ? '#f59e0b' : '#3f3f5a'}
          />
        ))}
      </div>
      {rating > 0 && <span className="stars-score">{Number(rating).toFixed(1)}</span>}
    </div>
  );
}

/* ── Grid Card ── */
export default function ProductCard({ product, index, isCheapest, isSaved, isSelected, onSave, onClick }) {
  const pm     = getPlatform(product.platform);
  const hasImg = !!product.image;

  const cardClass = [
    'product-card',
    isCheapest  ? 'product-card--best-deal' : '',
    isSelected  ? 'product-card--selected'  : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      <div
        id={`card-${product.productKey}-${product.platform}`}
        className={cardClass}
        style={{ animationDelay: `${Math.min(index * 50, 400)}ms`, cursor: 'pointer' }}
        onClick={onClick}
      >
      {/* Image */}
      <div className="card-img-wrap">
        {hasImg ? (
          <img src={product.image} alt={product.productName} className="card-img"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
        ) : null}
        <div className="card-img-placeholder" style={{ display: hasImg ? 'none' : 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
          📦
        </div>
        <span className={`card-platform-badge ${pm.cls}`}>{pm.emoji} {pm.label}</span>
        {isCheapest && <span className="card-best-badge">🔥 Best Deal</span>}
        {/* Save button overlay */}
        {onSave && (
          <div className="card-save-overlay">
            <SaveButton product={product} isSaved={isSaved} onToggle={onSave} />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="card-body">
        <h3 className="card-name">{product.productName}</h3>
        {product.brand && <p className="card-brand">{product.brand}</p>}
        <Stars rating={product.rating} />

        <div>
          <p className="card-price">
            ₹{Number(product.price).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          {isCheapest && (
            <span className="price-diff-down" style={{ fontSize: 11 }}>✓ Lowest price</span>
          )}
        </div>

        {product.link ? (
          <a href={product.link} target="_blank" rel="noopener noreferrer" className="card-cta"
             onClick={(e) => e.stopPropagation()}>
            <ShoppingCart size={12} /> View Deal <ExternalLink size={10} />
          </a>
        ) : (
          <div className="card-cta-empty">No link available</div>
        )}
      </div>
    </div>
  </>
);
}

/* ── List Card ── */
export function ProductListCard({ product, index, isCheapest, isSaved, isSelected, onSave, onClick }) {
  const pm = getPlatform(product.platform);

  const cardClass = [
    'list-card',
    isCheapest ? 'product-card--best-deal' : '',
    isSelected  ? 'product-card--selected'  : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      <div
        className={cardClass}
        style={{ animationDelay: `${Math.min(index * 40, 300)}ms`, cursor: 'pointer' }}
        onClick={onClick}
      >
      <div className="list-img-wrap">
        {product.image
          ? <img src={product.image} alt={product.productName} className="list-img" onError={(e) => e.target.style.display = 'none'} />
          : <span style={{ fontSize: 28, opacity: 0.15 }}>📦</span>
        }
      </div>

      <div className="list-body">
        <div className="list-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className={`card-platform-badge ${pm.cls}`} style={{ position: 'static' }}>{pm.emoji} {pm.label}</span>
            {isCheapest && <span className="card-best-badge" style={{ position: 'static' }}>🔥 Best</span>}
          </div>
          <p className="list-name">{product.productName}</p>
          {product.brand && <p className="list-brand">{product.brand}</p>}
          <Stars rating={product.rating} />
        </div>
      </div>

      <div className="list-right">
        <div style={{ textAlign: 'right' }}>
          <p className="list-price">₹{Number(product.price).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          {isCheapest && <span className="price-diff-down" style={{ fontSize: 11 }}>✓ Lowest</span>}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {onSave && <SaveButton product={product} isSaved={isSaved} onToggle={onSave} />}
          {product.link && (
            <a href={product.link} target="_blank" rel="noopener noreferrer" className="list-cta"
               onClick={(e) => e.stopPropagation()}>
              View Deal <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>
    </div>
  </>
);
}

/* ── Skeletons ── */
export function ProductCardSkeleton() {
  return (
    <div className="card-skeleton">
      <div className="skeleton sk-img" />
      <div className="sk-body">
        <div className="skeleton sk-line sk-w-80" />
        <div className="skeleton sk-line sk-w-60" />
        <div className="skeleton sk-line sk-w-40" />
        <div className="skeleton sk-line" style={{ height: 20, width: '35%' }} />
        <div className="skeleton" style={{ height: 36, width: '100%', borderRadius: 10 }} />
      </div>
    </div>
  );
}

export function ListCardSkeleton() {
  return (
    <div className="list-skeleton">
      <div className="skeleton sk-list-img" />
      <div className="sk-list-body">
        <div className="skeleton sk-line" style={{ width: '25%' }} />
        <div className="skeleton sk-line sk-w-80" style={{ height: 14 }} />
        <div className="skeleton sk-line" style={{ width: '40%' }} />
        <div className="skeleton sk-line" style={{ width: '30%' }} />
      </div>
    </div>
  );
}
