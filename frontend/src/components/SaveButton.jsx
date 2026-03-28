import { useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';

/**
 * SaveButton
 * A toggle button embedded in ProductCard and AIInsightsPanel.
 *
 * Props:
 *   product   — Product object
 *   isSaved   — boolean (parent-managed)
 *   onToggle  — () => void  (parent handles save/remove logic)
 */
export default function SaveButton({ product, isSaved, onToggle }) {
  const [busy, setBusy] = useState(false);

  const handleClick = async (e) => {
    e.stopPropagation(); // don't trigger card click
    if (busy) return;
    setBusy(true);
    try {
      onToggle(product);
    } finally {
      // brief delay so the animation is visible
      setTimeout(() => setBusy(false), 500);
    }
  };

  return (
    <button
      id={`save-btn-${product.productKey}-${product.platform}`}
      className={`save-btn ${isSaved ? 'saved' : ''}`}
      onClick={handleClick}
      title={isSaved ? 'Remove from saved' : 'Save product'}
      aria-label={isSaved ? 'Remove from saved' : 'Save product'}
      disabled={busy}
    >
      {busy ? (
        <div className="save-btn-spinner" />
      ) : isSaved ? (
        <BookmarkCheck size={16} />
      ) : (
        <Bookmark size={16} />
      )}
    </button>
  );
}
