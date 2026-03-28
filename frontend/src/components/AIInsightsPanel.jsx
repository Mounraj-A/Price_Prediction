import { X, TrendingDown, TrendingUp, Minus, Brain, RefreshCw } from 'lucide-react';
import SaveButton from './SaveButton';

const TREND_META = {
  falling: { icon: TrendingDown, color: 'var(--success)', label: 'Falling', badge: '📉' },
  rising: { icon: TrendingUp, color: 'var(--danger)', label: 'Rising', badge: '📈' },
  stable: { icon: Minus, color: 'var(--text-2)', label: 'Stable', badge: '➡️' },
};

function getTrendMeta(trend) {
  // Handle different backend formats safely
  if (!trend) return TREND_META.stable;

  // If object → extract value
  if (typeof trend === 'object') {
    trend = trend.trend || trend.label || '';
  }

  // If array → take first value
  if (Array.isArray(trend)) {
    trend = trend[0];
  }

  // Ensure string
  if (typeof trend !== 'string') {
    return TREND_META.stable;
  }

  const clean = trend.toLowerCase().trim();

  if (clean.includes('fall')) return TREND_META.falling;
  if (clean.includes('rise')) return TREND_META.rising;

  return TREND_META.stable;
}

function formatINR(n) {
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function AIInsightsPanel({
  query,
  selectedProduct,
  prediction,
  priceHistory,
  historyLoading,
  showHistory,
  isSaved,
  onSave,
  onViewHistory,
  onRefreshPrediction,
  onClose,
  loading,
}) {
  const trend = prediction ? getTrendMeta(prediction.trend) : null;
  const TrendIcon = trend?.icon;

  // Use the exact price of the clicked card, fallback to AI base price
  const currentPrice = parseFloat(selectedProduct?.price) || prediction?.currentPrice || 0;

  // Dynamically calculate the predicted price for this specific variant
  let predictedPrice = prediction?.predictedPrice || 0;
  if (prediction?.currentPrice && prediction?.predictedPrice && currentPrice) {
    // Find the AI's predicted change ratio (e.g., drops by 5% = 0.95)
    const ratio = prediction.predictedPrice / prediction.currentPrice;
    // Apply that ratio to the specific card's price
    predictedPrice = currentPrice * ratio;
  }

  const savings =
    prediction && currentPrice && predictedPrice
      ? currentPrice - predictedPrice
      : null;

  const savingsPct =
    savings && currentPrice
      ? ((savings / currentPrice) * 100).toFixed(1)
      : null;

  const dealLabel = prediction?.deal?.label?.toUpperCase?.() || null;

  return (
    <aside className="ai-panel glass" id="ai-insights-panel">
      {/* Header */}
      <div className="ai-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="ai-panel-icon">
            <Brain size={16} color="#fff" />
          </div>
          <div>
            <p className="ai-panel-title">AI Price Intelligence</p>
            {query && <p className="ai-panel-query">"{query}"</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {onRefreshPrediction && (
            <button className="search-icon-btn" onClick={onRefreshPrediction} title="Refresh prediction">
              <RefreshCw size={14} />
            </button>
          )}
          <button className="search-icon-btn" onClick={onClose} title="Close">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Product info */}
      {selectedProduct && (
        <div className="ai-product-row">
          {selectedProduct.image && (
            <img
              src={selectedProduct.image}
              alt={selectedProduct.productName}
              className="ai-product-thumb"
              onError={(e) => (e.target.style.display = 'none')}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="ai-product-name">{selectedProduct.productName}</p>
            <p className="ai-product-platform">
              {selectedProduct.platform?.charAt(0).toUpperCase() +
                selectedProduct.platform?.slice(1)}
            </p>
          </div>
        </div>
      )}

      <div className="ai-divider" />

      {/* Loading */}
      {loading && (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="skeleton" style={{ height: 14, width: '60%' }} />
          <div className="skeleton" style={{ height: 14, width: '80%' }} />
          <div className="skeleton" style={{ height: 14, width: '50%' }} />
          <div className="skeleton" style={{ height: 14, width: '70%' }} />
        </div>
      )}

      {/* No prediction */}
      {!loading && !prediction && (
        <div className="empty-state" style={{ padding: '32px 16px' }}>
          <div className="empty-icon muted">🧠</div>
          <p className="empty-title" style={{ fontSize: 13 }}>AI insights not available</p>
          <p className="empty-sub" style={{ fontSize: 12 }}>
            The AI service may still be processing. Try refreshing.
          </p>
        </div>
      )}

      {/* Prediction */}
      {!loading && prediction && (
        <div className="ai-body">
          <div className="ai-price-grid">
            <div className="ai-price-row">
              <span className="ai-price-label">Current Price</span>
              <span className="ai-price-value">{formatINR(currentPrice)}</span>
            </div>

            {predictedPrice > 0 && (
              <div className="ai-price-row">
                <span className="ai-price-label">Predicted Price</span>
                <span className="ai-price-value" style={{ color: 'var(--primary-light)' }}>
                  {formatINR(predictedPrice)}
                </span>
              </div>
            )}

            {savings !== null && (
              <div className="ai-price-row">
                <span className="ai-price-label">Potential Saving</span>
                <span
                  className="ai-price-value"
                  style={{ color: savings > 0 ? 'var(--success)' : 'var(--danger)' }}
                >
                  {savings > 0
                    ? `${formatINR(savings)} (${savingsPct}%)`
                    : 'Price may rise'}
                </span>
              </div>
            )}
          </div>

          <div className="ai-divider" />

          {/* Trend */}
          {trend && (
            <div className="ai-stat-row">
              <span className="ai-stat-label">Trend</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: trend.color, fontWeight: 600 }}>
                {TrendIcon && <TrendIcon size={14} />}
                {trend.badge} {trend.label}
              </span>
            </div>
          )}

          {/* Deal */}
          {dealLabel && (
            <div className="ai-stat-row">
              <span className="ai-stat-label">Deal</span>
              <span className={dealLabel === 'BUY NOW' ? 'badge-buy-now' : 'badge-wait'}>
                {dealLabel === 'BUY NOW' ? '🔥 BUY NOW' : '⏳ WAIT'}
              </span>
            </div>
          )}

          {(prediction.deal?.reason || prediction.reason) && (
            <p className="ai-reason">{prediction.deal?.reason || prediction.reason}</p>
          )}

          <div className="ai-divider" />

          {/* Actions */}
          <div className="ai-actions">
            <button
              className="btn btn-ghost"
              style={{ width: '100%' }}
              onClick={onViewHistory}
            >
              📊 {showHistory ? 'Hide' : 'View'} Price History
            </button>

            {selectedProduct && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SaveButton product={selectedProduct} isSaved={isSaved} onToggle={onSave} />
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  {isSaved ? 'Saved — tracking price' : 'Save to track price'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}