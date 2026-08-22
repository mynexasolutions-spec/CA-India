import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Billing Module spec §6/§10 — a single three-dot action menu component reused
 * across every document table row. `actions` is an ordered array of:
 *   { label, to } — internal Link
 *   { label, onClick } — button action
 *   { divider: true } — visual separator
 * Falsy entries are skipped so callers can conditionally include an action.
 */
export default function DocActionMenu({ actions }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const items = (actions || []).filter(Boolean);
  if (!items.length) return null;

  return (
    <div className="bp-action-menu" ref={ref}>
      <button
        type="button"
        className="bp-action-menu-trigger"
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        ⋮
      </button>
      {open && (
        <div className="bp-action-menu-popover" role="menu">
          {items.map((a, i) => {
            if (a.divider) return <div key={`d${i}`} className="bp-action-menu-divider" />;
            const className = `bp-action-menu-item${a.danger ? ' danger' : ''}`;
            if (a.disabled) {
              return (
                <span key={a.label} className={`${className} disabled`} role="menuitem" aria-disabled="true" title={a.disabledReason}>
                  {a.label}
                </span>
              );
            }
            if (a.to) {
              return (
                <Link key={a.label} to={a.to} className={className} role="menuitem" onClick={() => setOpen(false)}>
                  {a.label}
                </Link>
              );
            }
            return (
              <button
                key={a.label}
                type="button"
                className={className}
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  a.onClick?.();
                }}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
