import { useState } from 'react';
import { ArrowUpDown, ExternalLink } from 'lucide-react';
import ProductCard, { ProductListCard } from './ProductCard';
import { groupByProductKey, getCheapest, buildSaveKey } from '../utils/groupProducts';

/* ── Group Header with Compare toggle ── */
function GroupHeader({ productKey, cheapestPrice, count, showCompare, onToggleCompare }) {
  return (
    <div className="group-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="group-title" style={{ textTransform: 'capitalize' }}>{productKey}</span>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{count} platform{count !== 1 ? 's' : ''}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="group-cheapest">
          From ₹{Number(cheapestPrice).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </span>
        <button
          className="btn btn-ghost"
          style={{ padding: '4px 10px', fontSize: 11, gap: 4 }}
          onClick={onToggleCompare}
          title="Compare platforms"
        >
          <ArrowUpDown size={11} />
          {showCompare ? 'Hide' : 'Compare'}
        </button>
      </div>
    </div>
  );
}

/* ── Compare Table ── */
function CompareTable({ group, cheapest }) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: 16 }}>
      <table className="compare-table">
        <thead>
          <tr>
            <th>Platform</th>
            <th>Price</th>
            <th>Rating</th>
            <th>Link</th>
          </tr>
        </thead>
        <tbody>
          {group.map((p, i) => (
            <tr key={i} className={p === cheapest ? 'cheapest-row' : ''}>
              <td style={{ fontWeight: 600, color: 'var(--text)' }}>
                {p === cheapest && '🔥 '}
                {p.platform?.charAt(0).toUpperCase() + p.platform?.slice(1)}
              </td>
              <td style={{ fontWeight: 700, color: p === cheapest ? 'var(--success)' : 'var(--text)' }}>
                ₹{Number(p.price).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                {p === cheapest && ' ✓'}
              </td>
              <td>{p.rating ? `★ ${Number(p.rating).toFixed(1)}` : '—'}</td>
              <td>
                {p.link ? (
                  <a href={p.link} target="_blank" rel="noopener noreferrer"
                     style={{ color: 'var(--primary-light)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    Buy <ExternalLink size={10} />
                  </a>
                ) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── ProductGrid ── */
export default function ProductGrid({ products, savedSet, selectedProduct, onCardClick, onSave, viewMode }) {
  const [openCompare, setOpenCompare] = useState(new Set());

  if (!products || products.length === 0) return null;

  const grouped = groupByProductKey(products);

  const toggleCompare = (key) => {
    setOpenCompare((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const selectedKey = selectedProduct ? buildSaveKey(selectedProduct) : null;

  return (
    <div className="product-groups">
      {Array.from(grouped.entries()).map(([key, group]) => {
        const cheapest    = getCheapest(group);
        const showCompare = openCompare.has(key);

        return (
          <div key={key} className="product-group anim-fade-up">
            <GroupHeader
              productKey={key}
              cheapestPrice={cheapest.price}
              count={group.length}
              showCompare={showCompare}
              onToggleCompare={() => toggleCompare(key)}
            />

            {showCompare && <CompareTable group={group} cheapest={cheapest} />}

            {viewMode === 'grid' ? (
              <div className="products-grid">
                {group.map((p, i) => {
                  const uniqueKey = buildSaveKey(p);
                  return (
                    <ProductCard
                      key={uniqueKey}
                      product={p}
                      index={i}
                      isCheapest={p === cheapest}
                      isSaved={savedSet ? savedSet.has(uniqueKey) : false}
                      isSelected={selectedKey === uniqueKey}
                      onSave={onSave}
                      onClick={() => onCardClick(p)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="products-list">
                {group.map((p, i) => {
                  const uniqueKey = buildSaveKey(p);
                  return (
                    <ProductListCard
                      key={uniqueKey}
                      product={p}
                      index={i}
                      isCheapest={p === cheapest}
                      isSaved={savedSet ? savedSet.has(uniqueKey) : false}
                      isSelected={selectedKey === uniqueKey}
                      onSave={onSave}
                      onClick={() => onCardClick(p)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}