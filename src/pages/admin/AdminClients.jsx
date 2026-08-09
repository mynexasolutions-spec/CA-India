import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

const CONSTITUTIONS = ['Proprietorship', 'Partnership Firm', 'LLP', 'Private Limited Company', 'One Person Company', 'Trust', 'Society'];

export default function AdminClients() {
  const [overview, setOverview] = useState(null);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('active');
  const [constitution, setConstitution] = useState('');
  const [registration, setRegistration] = useState('');
  const [registeredFrom, setRegisteredFrom] = useState('');
  const [registeredTo, setRegisteredTo] = useState('');
  const [sort, setSort] = useState('created_at');
  const [msg, setMsg] = useState('');

  const loadOverview = () => api('/admin/dashboard').then((d) => setOverview(d.overview));
  const load = () => {
    const qs = new URLSearchParams({ sort, dir: 'desc' });
    if (q) qs.set('q', q);
    if (status) qs.set('status', status);
    if (constitution) qs.set('constitution_type', constitution);
    if (registration) qs.set('registration_type', registration);
    if (registeredFrom) qs.set('registered_from', registeredFrom);
    if (registeredTo) qs.set('registered_to', registeredTo);
    api(`/admin/clients?${qs}`).then((d) => setRows(d.data || []));
  };

  useEffect(() => { loadOverview(); load(); }, []);
  useEffect(() => { load(); }, [status, sort, constitution, registration]);

  const toggleStatus = async (c) => {
    await api(`/admin/clients/${c.id}/active`, { method: 'POST', body: { is_active: !c.user?.is_active } });
    setMsg(`Client marked ${c.user?.is_active ? 'inactive' : 'active'}`);
    loadOverview();
    load();
  };

  const o = overview || {};

  return (
    <div>
      <div className="ao-grid-3" style={{ marginBottom: 20 }}>
        <div className="ao-stat ao-stat-blue"><div className="ao-stat-num">{o.total_clients ?? '—'}</div><div className="ao-stat-label">TOTAL CLIENTS</div></div>
        <div className="ao-stat ao-stat-green"><div className="ao-stat-num">{o.active_clients ?? '—'}</div><div className="ao-stat-label">ACTIVE CLIENTS</div></div>
        <div className="ao-stat ao-stat-red"><div className="ao-stat-num">{o.inactive_clients ?? '—'}</div><div className="ao-stat-label">INACTIVE CLIENTS</div></div>
      </div>

      <div className="bp-toolbar">
        <h2 style={{ margin: 0, flex: 1 }}>Client Management</h2>
        <Link className="bp-btn bp-btn-primary" to="/admin/clients/new">+ Add New Client</Link>
      </div>

      <div className="bp-toolbar" style={{ marginTop: 10 }}>
        {[
          ['active', 'Active Clients'],
          ['inactive', 'Inactive Clients'],
          ['', 'All Clients'],
        ].map(([v, label]) => (
          <button key={label} type="button" className={`bp-btn ${status === v ? 'bp-btn-primary' : 'bp-btn-outline'}`} onClick={() => setStatus(v)}>
            {label}
          </button>
        ))}
      </div>

      <div className="bp-card" style={{ marginTop: 12 }}>
        <div className="bp-toolbar">
          <input className="bp-input" style={{ maxWidth: 260 }} placeholder="Search name, ID, PAN, GSTIN, TAN, mobile, email…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="bp-select" value={constitution} onChange={(e) => setConstitution(e.target.value)}>
            <option value="">All constitution</option>
            {CONSTITUTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="bp-select" value={registration} onChange={(e) => setRegistration(e.target.value)}>
            <option value="">Registration type</option>
            <option value="gst">GST Registered</option>
            <option value="pan">PAN Registered</option>
            <option value="tan">TAN Registered</option>
            <option value="udyam">UDYAM Registered</option>
          </select>
          <input className="bp-input" type="date" value={registeredFrom} onChange={(e) => setRegisteredFrom(e.target.value)} title="Registered from" />
          <input className="bp-input" type="date" value={registeredTo} onChange={(e) => setRegisteredTo(e.target.value)} title="Registered to" />
          <select className="bp-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="created_at">Date Created</option>
            <option value="updated_at">Last Updated</option>
            <option value="client_name">Client Name</option>
            <option value="client_code">Client ID</option>
          </select>
          <button type="button" className="bp-btn bp-btn-outline" onClick={load}>Search</button>
        </div>

        {msg && <p style={{ color: 'var(--bp-green)' }}>{msg}</p>}

        <table className="bp-table">
          <thead>
            <tr>
              <th>Client ID</th><th>Name</th><th>Business</th><th>GSTIN</th><th>Mobile</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{c.client_code || c.id}</td>
                <td>
                  <Link to={`/admin/clients/${c.id}/billing`}>{c.client_name || c.user?.name}</Link>
                </td>
                <td>{c.business_name}</td>
                <td>{c.gstin || '—'}</td>
                <td>{c.mobile || c.user?.phone || '—'}</td>
                <td><span className={`bp-badge ${c.user?.is_active ? 'bp-badge-issued' : 'bp-badge-draft'}`}>{c.user?.is_active ? 'Active' : 'Inactive'}</span></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <Link to={`/admin/clients/${c.id}/edit`}>View Profile</Link>
                  {' · '}
                  <Link to={`/admin/clients/${c.id}/billing`}>Billing</Link>
                  {' · '}
                  <Link to={`/admin/clients/${c.id}/edit`}>Edit</Link>
                  {' · '}
                  <button type="button" className="bp-btn bp-btn-outline" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => toggleStatus(c)}>
                    {c.user?.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7}>No clients found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
