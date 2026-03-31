import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Bookmark, Trash2, ExternalLink, ShoppingCart,
  RefreshCw, TrendingDown, TrendingUp, Sparkles, Brain, Bell
} from 'lucide-react';
import { savedApi, predictApi } from '../services/api';
import { buildSaveKey, priceDiff } from '../utils/groupProducts';
import Toast from '../components/Toast';
import AlertModal from '../components/AlertModal';

const PLATFORM_EMOJI = {
  flipkart: '🛒', amazon: '📦', ebay: '🔖',
  walmart: '🏪', google: '🌐',
};

export default function SavedItemsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState(() => savedApi.getAll());
  
  const [predictions, setPreds] = useState({});
  const [loadingStates, setLoadingStates] = useState({});
  const [toast, setToast] = useState(null);
  const [alertModal, setAlertModal] = useState({ isOpen: false, product: null });

  const showToast = (msg, type = 'info') => setToast({ message: msg, type, id: Date.now() });

  // 🔥 FIX: Made async so it waits for MongoDB to actually delete the item
  const removeItem = useCallback(async (product) => {
    const uniqueKey = buildSaveKey(product);
    await savedApi.remove(product.productKey, product.platform, uniqueKey);
    setItems(savedApi.getAll());
    showToast('Removed from saved products.', 'info');
  }, []);

  // 🔥 FIX: Made async so it waits for MongoDB to clear the whole database table
  const clearAll = async () => {
    await savedApi.clear();
    setItems([]);
    showToast('All saved products cleared.', 'info');
  };

  const handleRecheck = async (item) => {
    const uniqueKey = buildSaveKey(item);
    setLoadingStates((prev) => ({ ...prev, [uniqueKey]: true }));
    try {
      const pred = await predictApi.predict(item.productName);
      setPreds((prev) => ({ ...prev, [uniqueKey]: pred }));
      showToast(`AI Insights updated for ${item.productName.substring(0, 15)}...`, 'success');
    } catch {
      showToast('Could not refresh AI prediction. Ensure backend is running.', 'error');
    } finally {
      setLoadingStates((prev) => ({ ...prev, [uniqueKey]: false }));
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      
      {/* Top Navigation Bar */}
      <header style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          <ArrowLeft size={16} /> Back
        </button>
      </header>

      {/* Scrollable Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '40px 20px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
            <div className="anim-fade-up">
              <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px 0' }}>Saved Products</h1>
              <p style={{ color: 'var(--text-3)', margin: 0, fontSize: 14 }}>Your wishlist of tracked products. Click AI Re-check to get the latest trends.</p>
            </div>
            
            {items.length > 0 && (
              <button onClick={clearAll} className="anim-fade-up" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
              >
                <Trash2 size={14} /> Clear All
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="anim-fade-up stagger-1" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 24, padding: '80px 20px', textAlign: 'center' }}>
              <div style={{ width: 80, height: 80, margin: '0 auto 24px', background: 'rgba(99,102,241,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bookmark size={36} color="var(--primary-light)" />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>No saved products yet</h3>
              <p style={{ color: 'var(--text-3)', maxWidth: 400, margin: '0 auto 24px', lineHeight: 1.5 }}>
                Search for a product on the home page and click the bookmark icon to save it here for quick tracking.
              </p>
              <button className="btn btn-primary" onClick={() => navigate('/')} style={{ padding: '12px 24px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                <ShoppingCart size={16} /> Start Searching
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
              {items.map((item, i) => {
                const uniqueKey = buildSaveKey(item);
                const emoji = PLATFORM_EMOJI[item.platform?.toLowerCase()] || '✨';
                
                // AI Data Extraction
                const pred = predictions[uniqueKey];
                const busy = loadingStates[uniqueKey];
                
                const safeCurrentPrice = pred?.currentPrice ? parseFloat(pred.currentPrice) : parseFloat(item.price);
                const diff = pred?.currentPrice ? priceDiff(item.price, safeCurrentPrice) : null;
                const dealLabel = pred?.deal?.label?.toUpperCase?.();

                return (
                  <div key={uniqueKey} className="anim-fade-up" style={{ animationDelay: `${i * 50}ms`, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    
                    {/* Top Info Section */}
                    <div style={{ padding: 20, flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface-3)', border: '1px solid var(--border)', padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>
                          {emoji} {item.platform?.charAt(0).toUpperCase() + item.platform?.slice(1)}
                        </span>
                        <button onClick={() => removeItem(item)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 4, borderRadius: 6, transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }} onMouseOut={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-3)'; }} title="Remove item">
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ width: 80, height: 80, background: '#fff', borderRadius: 12, padding: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                           {item.image 
                             ? <img src={item.image} alt="product" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
                             : <ShoppingCart size={32} color="#e5e7eb" />
                           }
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>
                            {item.productName}
                          </h4>
                          <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>
                            Saved: {new Date(item.savedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 8 }}>
                             ₹{Number(item.price).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Prediction UI Area */}
                    {pred && (
                      <div className="anim-scale-in" style={{ padding: '16px 20px', background: 'rgba(99,102,241,0.05)', borderTop: '1px solid rgba(99,102,241,0.15)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <Brain size={12} /> AI Insights
                          </span>
                          {dealLabel && (
                            <span style={{ 
                              fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 99, letterSpacing: '0.05em',
                              background: dealLabel.includes('BUY') ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                              color: dealLabel.includes('BUY') ? '#10b981' : '#f59e0b',
                              border: `1px solid ${dealLabel.includes('BUY') ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`
                            }}>
                              {dealLabel === 'BUY NOW' ? '🔥 BUY NOW' : '⏳ WAIT'}
                            </span>
                          )}
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <div>
                            <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 2, fontWeight: 600 }}>Current Market Avg</span>
                            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
                              ₹{safeCurrentPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                          
                          <div style={{ textAlign: 'right' }}>
                            {pred.trend && (
                              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4, fontWeight: 500 }}>
                                Trend: <strong style={{ color: 'var(--text)' }}>{typeof pred.trend === 'string' ? pred.trend : pred.trend?.trend || 'unknown'}</strong>
                              </div>
                            )}
                            {diff && (
                              <div style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, color: diff.direction === 'down' ? '#10b981' : '#ef4444' }}>
                                {diff.direction === 'down' ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                                {diff.label}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons Section */}
                    <div style={{ padding: '16px 20px', background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', gap: 12 }}>
                      <button 
                        onClick={() => handleRecheck(item)}
                        disabled={busy}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: busy ? 0.7 : 1 }}
                        onMouseOver={(e) => { if(!busy) e.currentTarget.style.borderColor = 'var(--primary-light)'; }}
                        onMouseOut={(e) => { if(!busy) e.currentTarget.style.borderColor = 'var(--border)'; }}
                      >
                        <RefreshCw size={14} className={busy ? 'anim-spin' : ''} color={busy ? 'var(--text-3)' : 'var(--primary-light)'} /> 
                        {busy ? 'Analyzing...' : 'AI Re-check'}
                      </button>

                      <button
                        onClick={() => setAlertModal({ isOpen: true, product: item })}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary-light)'}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                      >
                        <Bell size={14} color="var(--primary-light)" /> Set Alert
                      </button>
                      
                      {item.link && (
                        <a 
                          href={item.link} target="_blank" rel="noopener noreferrer"
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--primary)', color: '#fff', padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', transition: 'opacity 0.2s' }}
                          onMouseOver={(e) => e.currentTarget.style.opacity = 0.9}
                          onMouseOut={(e) => e.currentTarget.style.opacity = 1}
                        >
                          <ExternalLink size={14} /> Buy Now
                        </a>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 99 }}>
          <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        product={alertModal.product}
        onClose={() => setAlertModal({ isOpen: false, product: null })}
        onSuccess={() => {
          setAlertModal({ isOpen: false, product: null });
          showToast('Alert created successfully!', 'success');
        }}
      />
    </div>
  );
}