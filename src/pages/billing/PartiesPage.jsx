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

  const load = () => api(`/billing/parties?q=${encodeURIComponent(q)}`).then((d) => setItems(d.data || []));
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div>
    <div className="bp-split">
      <div className="bp-card">
        <div className="bp-toolbar">
          <h2 style={{ margin: 0, flex: 1 }}>Party Master</h2>
          <input className="bp-input" style={{ maxWidth: 220 }} placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="button" className="bp-btn bp-btn-outline" onClick={load}>Search</button>
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
                  <button type="button" className="bp-btn bp-btn-outline" style={{ padding: '4px 8px' }} onClick={() => { setEditing(p.id); setForm({ ...empty, ...p }); }}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bp-card">
        <h3 style={{ marginTop: 0 }}>{editing ? 'Edit Party' : 'Add Party'}</h3>
        <form
          className="bp-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (editing) await api(`/billing/parties/${editing}`, { method: 'PUT', body: form });
            else await api('/billing/parties', { method: 'POST', body: form });
            setMsg('Saved');
            setForm(empty);
            setEditing(null);
            load();
          }}
        >
          {FORM_KEYS.map((k) => (
            <label key={k}>
              <strong className="bp-field-title">
                {FIELD_LABELS[k] || k.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
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
          ))}
          <div className="bp-actions">
            <button type="submit" className="bp-btn bp-btn-primary">Save</button>
            {editing && (
              <button type="button" className="bp-btn bp-btn-outline" onClick={() => { setEditing(null); setForm(empty); }}>Cancel</button>
            )}
          </div>
          {msg && <p style={{ color: 'var(--bp-green)' }}>{msg}</p>}
        </form>
      </div>
    </div>
    </div>
  );
}
