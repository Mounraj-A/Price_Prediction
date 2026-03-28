import { useState, useCallback, useEffect } from 'react';
import {
  LayoutGrid, List, SlidersHorizontal, ShoppingCart,
  Zap, TrendingDown, Sparkles, ArrowRight, Heart
} from 'lucide-react';
import SearchBar          from '../components/SearchBar';
import Sidebar            from '../components/Sidebar';
import ProductGrid        from '../components/ProductGrid';
import { ProductCardSkeleton } from '../components/ProductCard';
import ProfileMenu        from '../components/ProfileMenu';
import NotificationPanel  from '../components/NotificationPanel';
import AIInsightsPanel    from '../components/AIInsightsPanel';
import Toast              from '../components/Toast';
import PriceChart         from '../components/PriceChart'; 
import { searchApi, historyApi, predictApi, savedApi } from '../services/api';
import { buildSaveKey }   from '../utils/groupProducts';
import { useNotifications } from '../context/NotificationContext';
import { useLocation, useNavigate } from 'react-router-dom';

const DEFAULT_FILTERS = { platforms: [], minRating: 0, priceRange: [0, 500000] };
const TRENDING = ['iPhone 15 Pro', 'Samsung Galaxy S24', 'MacBook Air M3', 'AirPods Pro', 'Sony WH-1000XM5', 'iPad Pro'];

/* ── Hero ── */
function HeroState({ onSearch }) {
  return (
    <div className="hero-section">
      <div className="hero-orb anim-float">
        <Sparkles size={40} color="#fff" />
        <div className="hero-badge">
          <TrendingDown size={13} color="#fff" />
        </div>
      </div>

      <h2 className="hero-title anim-fade-up">
        Find the <span className="gradient-text">best price</span>
      </h2>
      <p className="hero-sub anim-fade-up stagger-1">
        Compare prices across Flipkart, Amazon, eBay, Walmart and more — powered by AI semantic matching.
      </p>

      <div className="hero-stats anim-fade-up stagger-2">
        {[
          { label: 'Marketplaces', value: '5+' },
          { label: 'Products Tracked', value: '∞' },
          { label: 'Avg Savings', value: '23%' },
        ].map((s) => (
          <div key={s.label} className="hero-stat">
            <span className="hero-stat-value gradient-text">{s.value}</span>
            <span className="hero-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="anim-fade-up stagger-3">
        <p className="trending-label">Trending searches</p>
        <div className="trending-chips">
          {TRENDING.map((t) => (
            <button key={t} className="chip" onClick={() => onSearch(t)}>
              <Zap size={10} style={{ color: '#f59e0b' }} />
              {t}
              <ArrowRight size={10} style={{ opacity: 0.5 }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Stats bar ── */
function StatsBar({ count, total, query, platformCounts, sortBy, onSort, viewMode, onViewMode }) {
  return (
    <div className="stats-bar">
      <div className="stats-bar-left">
        <span className="stats-count">
          {count.toLocaleString()} <span>of {total.toLocaleString()} products</span>
          {query && <span style={{ color: 'var(--text-3)' }}> for &ldquo;<span style={{ color: 'var(--text-2)', fontWeight: 600 }}>{query}</span>&rdquo;</span>}
        </span>
        {Object.entries(platformCounts).map(([pl, cnt]) => (
          <span key={pl} className="platform-pill">{pl} <b>{cnt}</b></span>
        ))}
      </div>

      <div className="stats-bar-right">
        <select className="sort-select" value={sortBy} onChange={(e) => onSort(e.target.value)}>
          <option value="default">Sort: Relevance</option>
          <option value="price-asc">Price: Low → High</option>
          <option value="price-desc">Price: High → Low</option>
          <option value="rating">Highest Rated</option>
        </select>

        <div className="view-toggle">
          {[{ mode: 'grid', Icon: LayoutGrid }, { mode: 'list', Icon: List }].map(({ mode, Icon }) => (
            <button key={mode} className={`view-toggle-btn ${viewMode === mode ? 'active' : ''}`}
              onClick={() => onViewMode(mode)}>
              <Icon size={15} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function HomePage() {
  
  // Safely load ALL states including selectedProduct from sessionStorage
  const [query, setQuery]                   = useState(() => sessionStorage.getItem('omni_query') || '');
  const [products, setProducts]             = useState(() => { try { return JSON.parse(sessionStorage.getItem('omni_products')) || []; } catch { return []; } });
  const [prediction, setPrediction]         = useState(() => { try { return JSON.parse(sessionStorage.getItem('omni_prediction')) || null; } catch { return null; } });
  const [searched, setSearched]             = useState(() => sessionStorage.getItem('omni_searched') === 'true');
  const [selectedProduct, setSelected]      = useState(() => { try { return JSON.parse(sessionStorage.getItem('omni_selected')) || null; } catch { return null; } });

  const [priceHistory, setPriceHistory]     = useState([]);
  const [showHistory, setShowHistory]       = useState(false);
  const [loading, setLoading]               = useState(false);
  const [aiLoading, setAiLoading]           = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [filters, setFilters]               = useState(DEFAULT_FILTERS);
  const [sidebarOpen, setSidebar]           = useState(false);
  const [viewMode, setViewMode]             = useState('grid');
  const [sortBy, setSortBy]                 = useState('default');
  const [toast, setToast]                   = useState(null);
  const [notifOpen, setNotifOpen]           = useState(false);
  const [savedSet, setSavedSet]             = useState(() => {
    const all = savedApi.getAll();
    return new Set(all.map(buildSaveKey));
  });

  const { push: pushNotification } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  // Save selectedProduct to sessionStorage so the AI panel never disappears
  useEffect(() => {
    sessionStorage.setItem('omni_query', query);
    sessionStorage.setItem('omni_products', JSON.stringify(products));
    sessionStorage.setItem('omni_prediction', JSON.stringify(prediction));
    sessionStorage.setItem('omni_searched', searched);
    if (selectedProduct) {
      sessionStorage.setItem('omni_selected', JSON.stringify(selectedProduct));
    } else {
      sessionStorage.removeItem('omni_selected');
    }
  }, [query, products, prediction, searched, selectedProduct]);

  const showToast = (message, type = 'info') => setToast({ message, type, id: Date.now() });

  /* ── Go Home / Reset ── */
  const handleGoHome = useCallback(() => {
    setQuery('');
    setSearched(false);
    setProducts([]);
    setSelected(null);
    setPrediction(null);
    setPriceHistory([]);
    setShowHistory(false);
    
    // Clear session storage so refresh doesn't bring the old search back
    sessionStorage.removeItem('omni_query');
    sessionStorage.removeItem('omni_products');
    sessionStorage.removeItem('omni_prediction');
    sessionStorage.removeItem('omni_searched');
    sessionStorage.removeItem('omni_selected');
  }, []);

  /* ── Search ── */
  const handleSearch = useCallback(async (q) => {
    if (!q?.trim()) return;
    const trimmed = q.trim();
    setQuery(trimmed);
    setLoading(true);
    setSearched(true);
    setSelected(null);
    setPrediction(null);
    setPriceHistory([]);
    setShowHistory(false);

    try {
      const res  = await searchApi.search(trimmed);
      const data = Array.isArray(res?.products) ? res.products : (Array.isArray(res) ? res : []);
      const pred = res?.prediction || null;

      setProducts(data);
      setPrediction(pred);

      // Auto-open AI panel with prediction
      if (data.length > 0) setSelected(data[0]);

      // Push notification if present
      if (pred?.notifications?.message) {
        pushNotification({ productName: trimmed, ...pred.notifications });
      }

      if (!data.length) showToast('No products found. Try a different keyword.', 'info');
      else showToast(`Found ${data.length} results for "${trimmed}" 🎉`, 'success');
    } catch (err) {
      showToast('Could not reach AI backend. Make sure FastAPI is running on port 8000.', 'error');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [pushNotification]);

  /* ── Auto-Search from Saved Page ── */
  useEffect(() => {
    if (location.state?.autoSearchQuery) {
      handleSearch(location.state.autoSearchQuery);
      // Clear the state so it doesn't loop if they refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, handleSearch]);

  /* ── View Price History ── */
  const handleViewHistory = async () => {
    if (showHistory) { setShowHistory(false); return; }
    setShowHistory(true);
    setHistoryLoading(true);
    try {
      const hist = await historyApi.getHistory(query);
      setPriceHistory(Array.isArray(hist) ? hist : []);
    } catch {
      showToast('Could not load price history.', 'error');
      setPriceHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  /* ── Refresh Prediction ── */
  const handleRefreshPrediction = async () => {
    if (!query) return;
    setAiLoading(true);
    try {
      const pred = await predictApi.predict(query);
      setPrediction(pred);
    } catch {
      showToast('Could not refresh AI prediction.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  /* ── Save / Unsave ── */
  const handleSave = useCallback((product) => {
    const uniqueKey = buildSaveKey(product);
    
    if (savedSet.has(uniqueKey)) {
      savedApi.remove(product.productKey, product.platform, uniqueKey); 
      setSavedSet((prev) => { const s = new Set(prev); s.delete(uniqueKey); return s; });
      showToast('Removed from saved products.', 'info');
    } else {
      savedApi.save(product);
      setSavedSet((prev) => new Set([...prev, uniqueKey]));
      showToast(`${product.productName} saved! 💖`, 'success');
    }
  }, [savedSet]);

  /* ── Client-side filter + sort ── */
  const disableFilters = false;

  const KNOWN = ['amazon', 'ebay', 'walmart', 'flipkart', 'google'];

  const filteredProducts = disableFilters
    ? products
    : products.filter((p) => {
        const pl = (p.platform || '').toLowerCase().trim();

        const plMatch =
          filters.platforms.length === 0 ||
          filters.platforms.some(
            (selected) => selected.toLowerCase() === pl
          ) ||
          (filters.platforms.includes('others') && !KNOWN.includes(pl));

        const ratingMatch =
          filters.minRating === 0 || (p.rating || 0) >= filters.minRating;

        const price = parseFloat(p.price);
        const safePrice = isNaN(price) ? 0 : price;
        const priceMatch =
          safePrice >= filters.priceRange[0] &&
          safePrice <= filters.priceRange[1];

        return plMatch && ratingMatch && priceMatch;
      });

  const sortedFiltered = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-asc')  return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
    if (sortBy === 'price-desc') return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
    if (sortBy === 'rating')     return (b.rating || 0) - (a.rating || 0);
    return 0;
  });

  const platformCounts = products.reduce((acc, p) => {
    const pl = p.platform?.toLowerCase() || 'other';
    acc[pl] = (acc[pl] || 0) + 1;
    return acc;
  }, {});

  const activeFCount = filters.platforms.length + (filters.minRating > 0 ? 1 : 0);
  const selectedSaveKey = selectedProduct ? buildSaveKey(selectedProduct) : null;

  const displayProducts = sortedFiltered;

  return (
    <div className="page-shell">
      {/* ── HEADER ── */}
      <header className="header" style={{ display: 'flex', alignItems: 'center', padding: '0 20px' }}>
        
        {/* LEFT: Logo (Now Clickable to return Home) */}
        <div 
          onClick={handleGoHome} 
          style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer' }}
          title="Return to Home"
        >
          <div className="logo-mark">
            <ShoppingCart size={18} color="#fff" />
          </div>
          <span className="logo-name">OmniPrice</span>
          <span className="logo-badge">AI</span>
        </div>

        {/* CENTER: Search Bar + Heart + Notification Bell */}
        <div style={{ flex: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          <div className="header-search" style={{ width: '100%', maxWidth: '640px' }}>
            <SearchBar onSearch={handleSearch} loading={loading} initialQuery={query} />
          </div>
          
          <button 
            onClick={() => navigate('/saved')}
            style={{ position: 'relative', background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Saved Items"
          >
            <Heart size={20} />
            {savedSet.size > 0 && (
              <span style={{ 
                position: 'absolute', top: -5, right: -6, 
                background: '#ec4899', color: '#fff', fontSize: 10, fontWeight: 800, 
                minWidth: 16, height: 16, borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid var(--surface)'
              }}>
                {savedSet.size}
              </span>
            )}
          </button>

          <NotificationPanel isOpen={notifOpen} onToggle={setNotifOpen} />
        </div>

        {/* RIGHT: Action Icons & Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, justifyContent: 'flex-end' }}>
          <button className="filter-fab" onClick={() => setSidebar(true)}>
            <SlidersHorizontal size={15} />
            Filters
            {activeFCount > 0 && <span className="filter-badge">{activeFCount}</span>}
          </button>
          <ProfileMenu />
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="body-shell">
        <Sidebar
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters(DEFAULT_FILTERS)}
          isOpen={sidebarOpen}
          onClose={() => setSidebar(false)}
        />

        <main className="main-content">
          <div className="main-inner" style={{ display: 'flex', gap: 20 }}>
            {/* Results / Hero column */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {!searched && !loading && <HeroState onSearch={handleSearch} />}

              {searched && !loading && products.length > 0 && (
                <StatsBar
                  count={displayProducts.length} total={products.length}
                  query={query} platformCounts={platformCounts}
                  sortBy={sortBy} onSort={setSortBy}
                  viewMode={viewMode} onViewMode={setViewMode}
                />
              )}

              {loading && (
                <div className={viewMode === 'grid' ? 'products-grid' : 'products-list'}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              )}

              {!loading && displayProducts.length > 0 && (
                <ProductGrid
                  products={displayProducts}
                  savedSet={savedSet}
                  selectedProduct={selectedProduct}
                  onCardClick={(p) => {
                    setSelected(p);
                    setShowHistory(false);
                    setPriceHistory([]);
                  }}
                  onSave={handleSave}
                  viewMode={viewMode}
                />
              )}

              {!loading && searched && products.length > 0 && filteredProducts.length === 0 && !disableFilters && (
                <div className="empty-state">
                  <div className="empty-icon violet"><SlidersHorizontal size={32} style={{ color: 'var(--primary-light)' }} /></div>
                  <p className="empty-title">No matches for your filters</p>
                  <p className="empty-sub">Try broadening the price range or removing some filters.</p>
                </div>
              )}

              {/* Empty: no results */}
              {!loading && searched && products.length === 0 && (
                <div className="empty-state anim-fade-up" style={{ 
                  padding: '40px', textAlign: 'center', background: 'var(--surface-2)', 
                  border: '1px solid var(--border)', borderRadius: 24, margin: '40px auto',
                  maxWidth: 560, boxShadow: '0 24px 48px rgba(0,0,0,0.2)'
                }}>
                  <div style={{ 
                    width: 80, height: 80, margin: '0 auto 24px', background: 'rgba(99,102,241,0.1)', 
                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    border: '1px solid rgba(99,102,241,0.25)', boxShadow: '0 0 30px rgba(99,102,241,0.15)'
                  }}>
                    <span style={{ fontSize: 36, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}>📱</span>
                  </div>
                  <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 12, letterSpacing: '-0.02em' }}>
                    AI Optimized for Smartphones
                  </h3>
                  <p style={{ color: 'var(--text-2)', fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
                    We couldn't find any matches for <span style={{ color: 'var(--primary-light)', fontWeight: 600 }}>&ldquo;{query}&rdquo;</span>. 
                    Right now, our AI engine is exclusively trained to track, match, and predict prices for mobile devices. Support for more categories is coming soon!
                  </p>
                  <div style={{ background: 'var(--bg)', padding: '24px', borderRadius: 16, border: '1px dashed var(--border-2)' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
                      See the AI in action. Try searching for:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                      {['iPhone 15 Pro', 'Samsung Galaxy S24', 'Google Pixel 8'].map(suggest => (
                        <button 
                          key={suggest} onClick={() => handleSearch(suggest)}
                          style={{ 
                            padding: '10px 18px', borderRadius: 99, background: 'var(--surface-3)', 
                            border: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text)',
                            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary-light)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                          onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                          <Zap size={14} style={{ color: '#f59e0b' }} /> {suggest}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {searched && selectedProduct && (
              <AIInsightsPanel
                query={query}
                selectedProduct={selectedProduct}
                prediction={prediction}
                priceHistory={priceHistory}
                historyLoading={historyLoading}
                showHistory={showHistory}
                isSaved={selectedSaveKey ? savedSet.has(selectedSaveKey) : false}
                onSave={handleSave}
                onViewHistory={handleViewHistory}
                onRefreshPrediction={handleRefreshPrediction}
                onClose={() => setSelected(null)}
                loading={aiLoading}
              />
            )}
          </div>
        </main>
      </div>

      {/* Render the Full-Screen Modal Chart here instead of inside the panel */}
      {showHistory && (
        <PriceChart 
          data={priceHistory} 
          loading={historyLoading} 
          onClose={() => setShowHistory(false)} 
          productName={selectedProduct?.productName}
        />
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 99 }}>
          <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}