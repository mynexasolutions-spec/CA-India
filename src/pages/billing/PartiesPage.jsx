import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { INDIAN_STATES } from '../../data/indianStates';

const AVATAR_COLORS = [
  { bg: '#e3ecfb', fg: '#1c4b9c' },
  { bg: '#e2f6ea', fg: '#1d7a45' },
  { bg: '#fdf1dc', fg: '#9b6a10' },
  { bg: '#fbe7ec', fg: '#a52e5a' },
];

function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

function initialsOf(name) {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const HELP_ICON_PROPS = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
function StarIcon() {
  return <svg {...HELP_ICON_PROPS} width="18" height="18"><path d="m12 3 2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L12 17l-5.6 3.1 1.4-6.3-4.8-4.3 6.4-.6L12 3Z" /></svg>;
}
function SearchIcon() {
  return <svg {...HELP_ICON_PROPS}><circle cx="10" cy="10" r="6.5" /><path d="m20 20-4.5-4.5" /></svg>;
}
function ShieldCheckIcon() {
  return <svg {...HELP_ICON_PROPS}><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
}
function EditIcon() {
  return <svg {...HELP_ICON_PROPS}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></svg>;
}
function PlusCircleIcon() {
  return <svg {...HELP_ICON_PROPS}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>;
}
function InfoBadgeIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.01" /></svg>;
}

const HIGHLIGHTS = [
  { Icon: SearchIcon, title: 'Search & Filter', desc: 'Search companies by name, GSTIN, phone and filter by State or GST Status.' },
  { Icon: ShieldCheckIcon, title: 'GST Status', desc: 'Quickly identify Registered and Unregistered companies.' },
  { Icon: EditIcon, title: 'Edit Company', desc: 'Click on Edit to view and update company details.' },
  { Icon: PlusCircleIcon, title: 'Add New Company', desc: 'Add a new company to manage GST compliance and invoicing.' },
];

/** Parties Dashboard — displays every company/party created by the logged-in client (the
 * backend scopes every query to the authenticated client's own client_profile_id, so this
 * list can never show another client's parties). Add New Company / Edit Company are their
 * own routed pages, not a modal — matching how the rest of the portal (invoices, etc.) works. */
export default function PartiesPage() {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 10 });
  const [q, setQ] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [gstFilter, setGstFilter] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);

  const load = (targetPage = page) => {
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (stateFilter) qs.set('state', stateFilter);
    if (gstFilter) qs.set('gst_status', gstFilter);
    qs.set('per_page', perPage);
    qs.set('page', targetPage);
    api(`/billing/parties?${qs}`).then((d) => {
      setItems(d.data || []);
      setMeta({ current_page: d.current_page || 1, last_page: d.last_page || 1, total: d.total || 0, per_page: d.per_page || perPage });
    });
  };

  useEffect(() => { load(page); }, [page, perPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live search: re-query a short moment after the user stops typing, instead of requiring
  // Enter/Apply. Skips the very first render so it doesn't duplicate the mount-time load above.
  const searchMounted = useRef(false);
  useEffect(() => {
    if (!searchMounted.current) {
      searchMounted.current = true;
      return;
    }
    const t = setTimeout(() => {
      setPage(1);
      load(1);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const changePerPage = (value) => {
    setPerPage(value);
    setPage(1);
  };

  const applyFilters = () => { setPage(1); load(1); };

  const resetFilters = () => {
    setQ('');
    setStateFilter('');
    setGstFilter('');
    setPage(1);
    setTimeout(() => load(1), 0);
  };

  const from = meta.total ? (meta.current_page - 1) * meta.per_page + 1 : 0;
  const to = Math.min(meta.current_page * meta.per_page, meta.total);

  return (
    <div className="bp-section-wrap">
      <div className="bp-parties-head">
        <span className="bp-parties-head-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7.5" cy="6" r="3" />
            <path d="M2 17c.7-3 2.7-4.7 5.5-4.7S12.8 14 13.5 17" />
            <circle cx="14.5" cy="7" r="2.3" />
            <path d="M13 12.6c2.4.2 3.9 1.8 4.5 4.4" />
          </svg>
        </span>
        <div>
          <h2>Parties (Company Management)</h2>
          <p className="bp-section-desc">Manage your companies and billing parties.</p>
        </div>
        <span className="bp-parties-count">{meta.total} {meta.total === 1 ? 'Company' : 'Companies'}</span>
        <Link to="/portal/billing/parties/new" className="bp-btn bp-btn-blue">+ New Company</Link>
      </div>

      <div className="bp-card">
        <div className="bp-parties-filters">
          <div className="bp-parties-search">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="9" r="6.2" />
              <path d="m17 17-3.8-3.8" />
            </svg>
            <input
              placeholder="Search by Company Name, GSTIN or Phone"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <select className="bp-select" style={{ maxWidth: 170 }} value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); }}>
            <option value="">State</option>
            {INDIAN_STATES.map((s) => (
              <option key={s.code} value={s.name}>{s.name}</option>
            ))}
          </select>
          <select className="bp-select" style={{ maxWidth: 170 }} value={gstFilter} onChange={(e) => setGstFilter(e.target.value)}>
            <option value="">GST Status</option>
            <option value="registered">Registered</option>
            <option value="unregistered">Unregistered</option>
          </select>
          <button type="button" className="bp-btn bp-btn-blue" onClick={applyFilters}>Apply</button>
          <button type="button" className="bp-btn bp-btn-outline" onClick={resetFilters}>↺ Reset</button>
        </div>

        <table className="bp-table bp-parties-table">
          <thead>
            <tr>
              <th>Company Name</th>
              <th>GSTIN</th>
              <th>Contact</th>
              <th>State</th>
              <th>GST Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => {
              const color = avatarColor(p.name || '');
              const registered = (p.gst_status || (p.gstin ? 'registered' : 'unregistered')) === 'registered';
              return (
                <tr key={p.id}>
                  <td>
                    <div className="bp-party-cell">
                      <span className="bp-party-avatar" style={{ background: color.bg, color: color.fg }}>{initialsOf(p.name)}</span>
                      <div>
                        <div className="bp-party-name">{p.name}</div>
                        {p.phone && <div className="bp-party-sub">{p.phone}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    {registered
                      ? (p.gstin || <span className="bp-party-muted">—</span>)
                      : <span className="bp-party-muted">Unregistered</span>}
                  </td>
                  <td>{p.phone || '—'}</td>
                  <td>{p.state || p.state_code || '—'}</td>
                  <td>
                    <span className={`bp-gst-badge ${registered ? 'is-registered' : 'is-unregistered'}`}>
                      <span className="dot" /> {registered ? 'Registered' : 'Unregistered'}
                    </span>
                  </td>
                  <td>
                    <Link to={`/portal/billing/parties/${p.id}/edit`} className="bp-btn bp-btn-outline" style={{ padding: '4px 8px' }}>Edit</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {items.length === 0 && (
          <p className="bp-table-empty">
            {(q || stateFilter || gstFilter)
              ? 'No companies found matching your search or filters.'
              : 'No companies yet — click "+ New Company" to add your first customer or vendor.'}
          </p>
        )}

        {meta.total > 0 && (
          <div className="bp-pagination">
            <span>Showing {from} to {to} of {meta.total} companies</span>
            <div className="bp-pagination-controls">
              <label>
                Rows per page:
                <select className="bp-select" style={{ width: 72 }} value={perPage} onChange={(e) => changePerPage(Number(e.target.value))}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </label>
              <button type="button" className="bp-btn bp-btn-outline" disabled={meta.current_page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>«</button>
              <span>{meta.current_page}</span>
              <button type="button" className="bp-btn bp-btn-outline" disabled={meta.current_page >= meta.last_page} onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}>»</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 1fr) minmax(0, 1fr)', gap: 20 }}>
        <div className="bp-card">
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 800, color: 'var(--bp-navy)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bp-blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><StarIcon /></span>
            Key Highlights
          </h3>
          <div className="bp-parties-highlights" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {HIGHLIGHTS.map(({ Icon, title, desc }) => (
              <div key={title}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bp-sky)', color: 'var(--bp-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <Icon />
                </span>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-blue)', marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--bp-muted)', lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bp-card">
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 800, color: 'var(--bp-navy)' }}>GST Status Guide</h3>
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ marginTop: 5, width: 8, height: 8, borderRadius: '50%', background: '#15803d', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>Registered</div>
                <div style={{ fontSize: 11.5, color: 'var(--bp-muted)' }}>Company is registered under GST.</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ marginTop: 5, width: 8, height: 8, borderRadius: '50%', background: '#6b8499', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-text)' }}>Unregistered</div>
                <div style={{ fontSize: 11.5, color: 'var(--bp-muted)' }}>Company is not registered under GST.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bp-card">
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 800, color: 'var(--bp-navy)' }}>Actions Available</h3>
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--bp-blue)', flexShrink: 0 }}><EditIcon /></span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-blue)' }}>Edit</div>
                <div style={{ fontSize: 11.5, color: 'var(--bp-muted)' }}>Update company information anytime.</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--bp-blue)', flexShrink: 0 }}><PlusCircleIcon /></span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-blue)' }}>New Company</div>
                <div style={{ fontSize: 11.5, color: 'var(--bp-muted)' }}>Add a new company to manage compliance.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px' }}>
        <span style={{ color: '#92400e', flexShrink: 0 }}><InfoBadgeIcon /></span>
        <span style={{ fontSize: 12.5, color: '#92400e' }}>
          <strong>Note:</strong> Only authorised client users can add or edit companies. Each company will be used for GST compliance, invoicing and reporting.
        </span>
      </div>
    </div>
  );
}
