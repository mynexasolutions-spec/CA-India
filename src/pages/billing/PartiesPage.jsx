import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import StateSelect from '../../components/StateSelect';
import { INDIAN_STATES } from '../../data/indianStates';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const empty = {
  name: '', contact_person: '', email: '', phone: '', gst_status: 'registered', gstin: '',
  state: 'Maharashtra', state_code: '27', billing_address: '', shipping_address: '',
};

const FIELD_LABELS = {
  name: 'Name',
  contact_person: 'Contact Person',
  email: 'Email',
  phone: 'Phone',
  state: 'State',
  billing_address: 'Billing Address',
  shipping_address: 'Shipping Address',
};

const FORM_KEYS = Object.keys(empty).filter((k) => k !== 'state_code' && k !== 'gst_status' && k !== 'gstin');

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

export default function PartiesPage() {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 10 });
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [gstFilter, setGstFilter] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [msg, setMsg] = useState('');
  const [gstinError, setGstinError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

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

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openAdd = () => {
    setEditing(null);
    setForm(empty);
    setMsg('');
    setGstinError('');
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p.id);
    setForm({ ...empty, ...p, gst_status: p.gst_status || (p.gstin ? 'registered' : 'unregistered'), gstin: p.gstin || '' });
    setMsg('');
    setGstinError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(empty);
    setGstinError('');
    setMsg('');
  };

  const onSave = async (e) => {
    e.preventDefault();
    setGstinError('');
    if (form.gst_status === 'registered') {
      const gstin = (form.gstin || '').trim().toUpperCase();
      if (!gstin) {
        setGstinError('GSTIN is required for a registered party.');
        return;
      }
      if (!GSTIN_REGEX.test(gstin)) {
        setGstinError('Enter a valid 15-character GSTIN (e.g. 27ABCDE1234F1Z5).');
        return;
      }
    }
    const payload = { ...form, gstin: form.gst_status === 'registered' ? form.gstin.trim().toUpperCase() : '' };
    if (editing) await api(`/billing/parties/${editing}`, { method: 'PUT', body: payload });
    else await api('/billing/parties', { method: 'POST', body: payload });
    setMsg('Saved');
    setModalOpen(false);
    setEditing(null);
    setForm(empty);
    load(page);
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
          <h2>Parties</h2>
          <p className="bp-section-desc">Manage your customers and billing parties.</p>
        </div>
        <span className="bp-parties-count">{meta.total} {meta.total === 1 ? 'Party' : 'Parties'}</span>
        <button type="button" className="bp-btn bp-btn-blue" onClick={openAdd}>+ Add Party</button>
      </div>

      <div className="bp-card">
        <div className="bp-parties-filters">
          <div className="bp-parties-search">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="9" r="6.2" />
              <path d="m17 17-3.8-3.8" />
            </svg>
            <input
              placeholder="Search by party name, GSTIN or phone"
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
              <th>Party</th>
              <th>GSTIN</th>
              <th>Contact</th>
              <th>State</th>
              <th>GST Status</th>
              <th />
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
                    <button type="button" className="bp-btn bp-btn-outline" style={{ padding: '4px 8px' }} onClick={() => openEdit(p)}>Edit</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {items.length === 0 && (
          <p className="bp-table-empty">No parties yet — click "+ Add Party" to add your first customer or vendor.</p>
        )}

        {meta.total > 0 && (
          <div className="bp-pagination">
            <span>Showing {from} to {to} of {meta.total} parties</span>
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

      {modalOpen && (
        <div
          role="presentation"
          onClick={closeModal}
          style={{
            position: 'fixed', inset: 0, zIndex: 80,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            className="bp-card bp-party-modal-card"
            role="dialog"
            aria-modal="true"
            aria-label={editing ? 'Edit Party' : 'Add Party'}
            onClick={(e) => e.stopPropagation()}
          >
            <form className="bp-party-modal-form" onSubmit={onSave}>
              <div className="bp-party-modal-head">
                <div>
                  <h3 style={{ margin: 0 }}>{editing ? 'Edit Party' : 'Add Party'}</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--bp-muted)' }}>Fields marked * are required.</p>
                </div>
                <button type="button" className="bp-btn bp-btn-outline" onClick={closeModal}>Close</button>
              </div>

              <div className="bp-party-modal-body">
                <div className="bp-form two">
                  <label style={{ gridColumn: '1 / -1' }}>
                    <strong className="bp-field-title">GST Registration Status *</strong>
                    <div className="bp-gst-radio-row">
                      <label className="bp-gst-radio">
                        <input
                          type="radio"
                          name="gst_status"
                          checked={form.gst_status === 'registered'}
                          onChange={() => { set('gst_status', 'registered'); setGstinError(''); }}
                        />
                        Registered
                      </label>
                      <label className="bp-gst-radio">
                        <input
                          type="radio"
                          name="gst_status"
                          checked={form.gst_status === 'unregistered'}
                          onChange={() => { set('gst_status', 'unregistered'); set('gstin', ''); setGstinError(''); }}
                        />
                        Unregistered
                      </label>
                    </div>
                  </label>

                  {form.gst_status === 'registered' && (
                    <label style={{ gridColumn: '1 / -1' }}>
                      <strong className="bp-field-title">GSTIN *</strong>
                      <input
                        className="bp-input"
                        value={form.gstin}
                        maxLength={15}
                        placeholder="e.g. 27ABCDE1234F1Z5"
                        style={{ textTransform: 'uppercase' }}
                        onChange={(e) => { set('gstin', e.target.value.toUpperCase()); setGstinError(''); }}
                        required
                      />
                      {gstinError && <span className="bp-gstin-error">{gstinError}</span>}
                    </label>
                  )}

                  {FORM_KEYS.map((k) => {
                    const fullWidth = k === 'billing_address' || k === 'shipping_address';
                    return (
                      <label key={k} style={fullWidth ? { gridColumn: '1 / -1' } : undefined}>
                        <strong className="bp-field-title">
                          {FIELD_LABELS[k] || k.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          {k === 'name' ? ' *' : ''}
                        </strong>
                        {k === 'state' ? (
                          <StateSelect
                            value={form.state_code}
                            onChange={(code, name) => setForm((f) => ({ ...f, state_code: code, state: name }))}
                            required
                          />
                        ) : (
                          <input className="bp-input" value={form[k] || ''} onChange={(e) => set(k, e.target.value)} required={k === 'name'} />
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="bp-actions bp-party-modal-foot">
                <button type="submit" className="bp-btn bp-btn-blue">{editing ? 'Update Party' : 'Save Party'}</button>
                <button type="button" className="bp-btn bp-btn-outline" onClick={closeModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {msg && <p className="bp-alert bp-alert-success">{msg}</p>}
    </div>
  );
}
