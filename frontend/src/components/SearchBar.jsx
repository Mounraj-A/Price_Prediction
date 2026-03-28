import { useState, useRef, useEffect } from 'react';
import { Search, Mic, MicOff, X, Sparkles } from 'lucide-react';

const SUGGESTIONS = [
  'iPhone 15 Pro', 'Samsung Galaxy S24', 'AirPods Pro',
  'MacBook Air M3', 'Sony WH-1000XM5', 'iPad Pro',
  'Pixel 8', 'Dell XPS 15',
];

export default function SearchBar({ onSearch, loading, initialQuery = '' }) {
  const [query, setQuery]       = useState(initialQuery);
  const [listening, setListening] = useState(false);
  const [focused, setFocused]   = useState(false);
  const [showSugg, setShowSugg] = useState(false);
  const inputRef   = useRef(null);
  const recogniRef = useRef(null);
  const wrapRef    = useRef(null);
  const voiceOk    = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  const filtered = SUGGESTIONS.filter(s =>
    query.length > 0 && s.toLowerCase().includes(query.toLowerCase()) && s.toLowerCase() !== query.toLowerCase()
  );

  useEffect(() => {
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowSugg(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const doSearch = q => {
    const val = (q ?? query).trim();
    if (!val) return;
    setQuery(val);
    setShowSugg(false);
    inputRef.current?.blur();
    onSearch(val);
  };

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    recogniRef.current = r;
    r.lang = 'en-US';
    r.interimResults = false;
    r.onstart  = () => setListening(true);
    r.onend    = () => setListening(false);
    r.onerror  = () => setListening(false);
    r.onresult = e => { const t = e.results[0][0].transcript; setQuery(t); doSearch(t); };
    r.start();
  };
  const stopVoice = () => { recogniRef.current?.stop(); setListening(false); };

  return (
    <div ref={wrapRef} className="search-wrap">
      <div className={`search-box ${focused ? 'focused' : ''}`}>
        {/* Left icon */}
        <div className={`search-icon-wrap ${focused ? 'focused' : ''}`}>
          {loading
            ? <div className="search-spinner" />
            : <Search size={18} />
          }
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          id="search-input"
          type="text"
          value={query}
          placeholder="Search across all marketplaces…"
          onChange={e => { setQuery(e.target.value); setShowSugg(true); }}
          onFocus={() => { setFocused(true); setShowSugg(true); }}
          onBlur={() => setFocused(false)}
          onKeyDown={e => {
            if (e.key === 'Enter') doSearch();
            if (e.key === 'Escape') { setShowSugg(false); inputRef.current?.blur(); }
          }}
          className="search-input"
        />

        {/* Actions */}
        <div className="search-actions">
          {query && !loading && (
            <button className="search-icon-btn" onClick={() => { setQuery(''); setShowSugg(false); inputRef.current?.focus(); }}>
              <X size={15} />
            </button>
          )}
          {voiceOk && (
            <button
              className={`search-icon-btn ${listening ? 'listening' : ''}`}
              onClick={listening ? stopVoice : startVoice}
              title={listening ? 'Stop' : 'Voice search'}
            >
              {listening ? <MicOff size={17} /> : <Mic size={17} />}
            </button>
          )}
          <button
            id="search-btn"
            className="search-submit-btn"
            onClick={() => doSearch()}
            disabled={loading || !query.trim()}
          >
            <Sparkles size={13} /> Search
          </button>
        </div>
      </div>

      {/* Suggestions */}
      {showSugg && filtered.length > 0 && (
        <div className="search-dropdown">
          {filtered.map((s, i) => (
            <button key={i} className="search-suggestion"
              onMouseDown={e => { e.preventDefault(); doSearch(s); }}
            >
              <Search size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
