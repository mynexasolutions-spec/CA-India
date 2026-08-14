import { useEffect, useState } from 'react';
import { api } from '../../api/client';

export default function AdminConfiguration() {
  const [activeTab, setActiveTab] = useState('hsn_sac');

  return (
    <div>
      <div className="bp-toolbar no-print" style={{ marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>System Configuration</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--bp-muted)' }}>
            Manage core masters for GST (HSN/SAC) and TDS/TCS.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <button
          type="button"
          className={`bp-btn ${activeTab === 'hsn_sac' ? 'bp-btn-primary' : 'bp-btn-outline'}`}
          onClick={() => setActiveTab('hsn_sac')}
        >
          HSN / SAC Codes
        </button>
        <button
          type="button"
          className={`bp-btn ${activeTab === 'tds_tcs' ? 'bp-btn-primary' : 'bp-btn-outline'}`}
          onClick={() => setActiveTab('tds_tcs')}
        >
          TDS / TCS Sections
        </button>
      </div>

      {activeTab === 'hsn_sac' && <HsnSacManager />}
      {activeTab === 'tds_tcs' && <TdsTcsManager />}
    </div>
  );
}

function HsnSacManager() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ id: null, type: 'hsn', code: '', description: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page) });
    if (search) qs.set('search', search);
    api(`/admin/master-config/hsn-sac?${qs}`)
      .then(setData)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, search]);

  const save = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    try {
      if (form.id) {
        await api(`/admin/master-config/hsn-sac/${form.id}`, { method: 'PUT', body: form });
        setMsg('Code updated.');
      } else {
        await api('/admin/master-config/hsn-sac', { method: 'POST', body: form });
        setMsg('Code created.');
      }
      setForm({ id: null, type: 'hsn', code: '', description: '' });
      load();
    } catch (ex) {
      setErr(ex.message || 'Failed to save');
    }
  };

  const destroy = async (id) => {
    if (!window.confirm('Delete this code?')) return;
    setMsg(''); setErr('');
    try {
      await api(`/admin/master-config/hsn-sac/${id}`, { method: 'DELETE' });
      setMsg('Code deleted.');
      load();
    } catch (ex) {
      setErr(ex.message || 'Failed to delete');
    }
  };

  const rows = data?.data || [];
  
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="bp-card">
        <h3 style={{ marginTop: 0 }}>{form.id ? 'Edit Code' : 'Add New Code'}</h3>
        <form onSubmit={save} style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <label>
            Type
            <select className="form-control" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="hsn">HSN (Goods)</option>
              <option value="sac">SAC (Services)</option>
            </select>
          </label>
          <label>
            Code
            <input className="form-control" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Description
            <input className="form-control" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </label>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
            <button className="bp-btn bp-btn-primary" type="submit">Save Code</button>
            {form.id && <button className="bp-btn bp-btn-outline" type="button" onClick={() => setForm({ id: null, type: 'hsn', code: '', description: '' })}>Cancel Edit</button>}
          </div>
          {msg && <p style={{ color: 'var(--bp-green)', margin: 0, gridColumn: '1 / -1' }}>{msg}</p>}
          {err && <p style={{ color: 'var(--bp-red)', margin: 0, gridColumn: '1 / -1' }}>{err}</p>}
        </form>
      </div>

      <div className="bp-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Existing Codes</h3>
          <input 
            className="form-control" 
            placeholder="Search code or desc..." 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 250 }} 
          />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="bp-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Code</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td><span className="bp-badge">{r.type.toUpperCase()}</span></td>
                  <td style={{ fontWeight: 600 }}>{r.code}</td>
                  <td>{r.description}</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="bp-btn bp-btn-outline" style={{ padding: '4px 8px' }} onClick={() => setForm(r)}>Edit</button>
                    <button type="button" className="bp-btn bp-btn-danger" style={{ padding: '4px 8px' }} onClick={() => destroy(r.id)}>Del</button>
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={4}>No codes found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 13, color: 'var(--bp-muted)' }}>
          <span>Page {data?.current_page || 1} of {data?.last_page || 1} (Total {data?.total || 0})</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="bp-btn bp-btn-outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
            <button type="button" className="bp-btn bp-btn-outline" disabled={page >= (data?.last_page || 1)} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TdsTcsManager() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ id: null, type: 'tds', code: '', description: '', rate: 0, is_active: true, sort_order: 0 });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = () => {
    api(`/admin/master-config/tds-tcs?page=${page}`)
      .then(setData)
      .catch(console.error);
  };

  useEffect(() => { load(); }, [page]);

  const save = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    try {
      const payload = { ...form, rate: Number(form.rate), sort_order: Number(form.sort_order) };
      if (form.id) {
        await api(`/admin/master-config/tds-tcs/${form.id}`, { method: 'PUT', body: payload });
        setMsg('Section updated.');
      } else {
        await api('/admin/master-config/tds-tcs', { method: 'POST', body: payload });
        setMsg('Section created.');
      }
      setForm({ id: null, type: 'tds', code: '', description: '', rate: 0, is_active: true, sort_order: 0 });
      load();
    } catch (ex) {
      setErr(ex.message || 'Failed to save');
    }
  };

  const destroy = async (id) => {
    if (!window.confirm('Delete this section?')) return;
    setMsg(''); setErr('');
    try {
      await api(`/admin/master-config/tds-tcs/${id}`, { method: 'DELETE' });
      setMsg('Section deleted.');
      load();
    } catch (ex) {
      setErr(ex.message || 'Failed to delete');
    }
  };

  const rows = data?.data || [];
  
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="bp-card">
        <h3 style={{ marginTop: 0 }}>{form.id ? 'Edit Section' : 'Add New Section'}</h3>
        <form onSubmit={save} style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <label>
            Type
            <select className="form-control" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="tds">TDS</option>
              <option value="tcs">TCS</option>
            </select>
          </label>
          <label>
            Section Code
            <input className="form-control" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          </label>
          <label>
            Rate (%)
            <input className="form-control" type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} required />
          </label>
          <label>
            Sort Order
            <input className="form-control" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Description
            <input className="form-control" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </label>
          <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Active (Visible to clients)
          </label>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
            <button className="bp-btn bp-btn-primary" type="submit">Save Section</button>
            {form.id && <button className="bp-btn bp-btn-outline" type="button" onClick={() => setForm({ id: null, type: 'tds', code: '', description: '', rate: 0, is_active: true, sort_order: 0 })}>Cancel Edit</button>}
          </div>
          {msg && <p style={{ color: 'var(--bp-green)', margin: 0, gridColumn: '1 / -1' }}>{msg}</p>}
          {err && <p style={{ color: 'var(--bp-red)', margin: 0, gridColumn: '1 / -1' }}>{err}</p>}
        </form>
      </div>

      <div className="bp-card">
        <h3 style={{ margin: '0 0 12px 0' }}>Existing Sections</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="bp-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Code</th>
                <th>Rate</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td><span className="bp-badge">{r.type.toUpperCase()}</span></td>
                  <td style={{ fontWeight: 600 }}>{r.code}</td>
                  <td>{r.rate}%</td>
                  <td>{r.description}</td>
                  <td>{r.is_active ? <span style={{ color: 'green' }}>Active</span> : <span style={{ color: 'red' }}>Inactive</span>}</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="bp-btn bp-btn-outline" style={{ padding: '4px 8px' }} onClick={() => setForm(r)}>Edit</button>
                    <button type="button" className="bp-btn bp-btn-danger" style={{ padding: '4px 8px' }} onClick={() => destroy(r.id)}>Del</button>
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={6}>No sections found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 13, color: 'var(--bp-muted)' }}>
          <span>Page {data?.current_page || 1} of {data?.last_page || 1} (Total {data?.total || 0})</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="bp-btn bp-btn-outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
            <button type="button" className="bp-btn bp-btn-outline" disabled={page >= (data?.last_page || 1)} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
