import { useEffect, useRef, useState } from 'react';

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="6" />
      <path d="m17 17-3.5-3.5" />
    </svg>
  );
}

/** Search-as-you-type party picker (Reference 2 mockup), reusing the already-loaded
 *  `parties` list — no extra network calls. "+ New" opens Add Company in a new tab so
 *  in-progress document details here are never lost. */
export default function PartySearchSelect({ parties, value, onSelect }) {
  const selected = parties.find((p) => String(p.id) === String(value));
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const matches = query.trim()
    ? parties.filter((p) => (
      p.name.toLowerCase().includes(query.trim().toLowerCase())
      || (p.gstin || '').toLowerCase().includes(query.trim().toLowerCase())
    )).slice(0, 30)
    : parties.slice(0, 30);

  return (
    <div className="bp-party-search" ref={ref}>
      <div className="bp-party-search-row">
        <div className="bp-party-search-input-wrap">
          <SearchIcon />
          <input
            className="bp-input"
            style={{ paddingLeft: 30 }}
            placeholder="Search and select party…"
            value={open ? query : (selected?.name || '')}
            onFocus={() => { setOpen(true); setQuery(''); }}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          />
        </div>
        <a className="bp-btn bp-btn-outline" href="/portal/billing/parties/new" target="_blank" rel="noreferrer" style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}>
          + New
        </a>
      </div>
      {open && (
        <div className="bp-party-search-panel">
          {matches.length === 0 && <div className="bp-dropdown-empty">No matching parties</div>}
          {matches.map((p) => (
            <button
              key={p.id}
              type="button"
              className="bp-party-search-item"
              onClick={() => { onSelect(String(p.id)); setOpen(false); setQuery(''); }}
            >
              <span className="bp-party-search-item-name">{p.name}</span>
              <span className="bp-party-search-item-sub">{p.gstin_display || p.gstin || 'Unregistered'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
