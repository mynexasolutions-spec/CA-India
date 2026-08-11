import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import StateSelect from '../../components/StateSelect';

const empty = {
  name: '', contact_person: '', email: '', phone: '', gstin: '',
  state: 'Maharashtra', state_code: '27', billing_address: '', shipping_address: '',
};

const FIELD_LABELS = {
  name: 'Name',
  contact_person: 'Contact Person',
  email: 'Email',
  phone: 'Phone',
  gstin: 'GSTIN',
  state: 'State',
  billing_address: 'Billing Address',
  shipping_address: 'Shipping Address',
};

const FORM_KEYS = Object.keys(empty).filter((k) => k !== 'state_code');

export default function PartiesPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const load = () => api(`/billing/parties?q=${encodeURIComponent(q)}`).then((d) => setItems(d.data || []));
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openAdd = () => {
    setEditing(null);
    setForm(empty);
    setMsg('');
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p.id);
    setForm({ ...empty, ...p });
    setMsg('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(empty);
    setMsg('');
  };

  return (
    <div className="bp-section-wrap">
      <div className="bp-section-head">
        <div>
          <div className="bp-section-kicker">Party Master</div>
          <p className="bp-section-desc">Customers and vendors available when creating invoices and billing documents.</p>
        </div>
      </div>

      <div className="bp-card">
        <div className="bp-toolbar">
          <input className="bp-input" style={{ maxWidth: 240 }} placeholder="Search by name, GSTIN or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="button" className="bp-btn bp-btn-outline" onClick={load}>Search</button>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--bp-muted)', fontWeight: 600 }}>
            {items.length} {items.length === 1 ? 'party' : 'parties'}
          </span>
          <button type="button" className="bp-btn bp-btn-blue" onClick={openAdd}>+ Add Party</button>
        </div>
        <table className="bp-table">
          <thead>
            <tr><th>Name</th><th>GSTIN</th><th>Phone</th><th>State</th><th /></tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td>{p.name}<div style={{ fontSize: 11, color: 'var(--bp-muted)' }}>{p.contact_person}</div></td>
                <td>{p.gstin || '—'}</td>
                <td>{p.phone || '—'}</td>
                <td>{p.state || p.state_code}</td>
                <td>
                  <button type="button" className="bp-btn bp-btn-outline" style={{ padding: '4px 8px' }} onClick={() => openEdit(p)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <p className="bp-table-empty">No parties yet — click "+ Add Party" to add your first customer or vendor.</p>
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
            <form
              className="bp-party-modal-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (editing) await api(`/billing/parties/${editing}`, { method: 'PUT', body: form });
                else await api('/billing/parties', { method: 'POST', body: form });
                setMsg('Saved');
                setForm(empty);
                setEditing(null);
                setModalOpen(false);
                load();
              }}
            >
              <div className="bp-party-modal-head">
                <div>
                  <h3 style={{ margin: 0 }}>{editing ? 'Edit Party' : 'Add Party'}</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--bp-muted)' }}>Fields marked * are required.</p>
                </div>
                <button type="button" className="bp-btn bp-btn-outline" onClick={closeModal}>Close</button>
              </div>

              <div className="bp-party-modal-body">
                <div className="bp-form two">
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
