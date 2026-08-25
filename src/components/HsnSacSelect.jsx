import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

/**
 * Searchable picker backed by the official government HSN / SAC master.
 * Free text is never accepted — the value is committed only when a listed
 * code is chosen, so documents can only carry valid codes.
 */
export default function HsnSacSelect({
  value = '',
  onChange,
  type = '',
  placeholder = 'Search code or description…',
  disabled = false,
  className = 'bp-input',
  required = false,
  name,
  // Invoice Item Table spec: the per-row HSN/SAC field is manual numeric entry only,
  // max 8 digits, extra digits rejected — not a free-text description search.
  numericOnly = false,
}) {
  const [query, setQuery] = useState(value || '');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);
  const skipNextSearch = useRef(false);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    if (!open) return undefined;
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return undefined;
    }
    const handle = setTimeout(() => {
      setLoading(true);
      const qs = new URLSearchParams();
      if (query) qs.set('q', query);
      if (type) qs.set('type', type);
      api(`/billing/hsn-sac-codes?${qs}`)
        .then((d) => { setOptions(d.data || []); setHighlight(0); })
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [query, type, open]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery(value || '');
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [value]);

  const pick = (row) => {
    skipNextSearch.current = true;
    setQuery(row.code);
    setOpen(false);
    onChange?.(row.code, row);
  };

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (options[highlight]) {
        e.preventDefault();
        pick(options[highlight]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery(value || '');
    }
  };

  return (
    <div className="hsn-select" ref={wrapRef}>
      <input
        className={className}
        name={name}
        value={query}
        disabled={disabled}
        required={required}
        aria-required={required || undefined}
        placeholder={placeholder}
        autoComplete="off"
        inputMode={numericOnly ? 'numeric' : undefined}
        maxLength={numericOnly ? 8 : undefined}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          const raw = numericOnly ? e.target.value.replace(/[^0-9]/g, '').slice(0, 8) : e.target.value;
          setQuery(raw);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <div className="hsn-select-menu">
          {loading && <div className="hsn-select-note">Searching…</div>}
          {!loading && !options.length && (
            <div className="hsn-select-note">No matching code in the government master</div>
          )}
          {options.map((row, i) => (
            <button
              type="button"
              key={`${row.type}-${row.code}`}
              className={`hsn-select-item${i === highlight ? ' active' : ''}`}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(row);
              }}
            >
              <span className="hsn-select-code">{row.code}</span>
              <span className="hsn-select-tag">{row.type === 'sac' ? 'SAC' : 'HSN'}</span>
              <span className="hsn-select-desc">{row.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
