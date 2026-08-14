import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

export default function AdminGstr2bClientPicker() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    api(`/admin/billing/clients?${qs}`)
      .then((d) => setRows(d.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="bp-toolbar" style={{ marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>GSTR-2B</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--bp-muted)' }}>
            Select a client to upload and manage their GSTR-2B statements by Financial Year and Tax Period.
          </p>
        </div>
        <input
          className="bp-input"
          style={{ maxWidth: 240 }}
          placeholder="Search client…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="button" className="bp-btn bp-btn-primary" onClick={load}>Search</button>
      </div>

      <div className="bp-card" style={{ overflowX: 'auto' }}>
        {loading ? <p>Loading…</p> : (
          <table className="bp-table">
            <thead>
              <tr>
                <th>Client ID</th>
                <th>Business Name</th>
                <th>GST</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>{c.client_code || '—'}</td>
                  <td>
                    <strong>{c.business_name || c.client_name}</strong>
                    <div style={{ fontSize: 11, color: 'var(--bp-muted)' }}>{c.user?.email}</div>
                  </td>
                  <td>{c.has_gst ? (c.gstin || 'Registered') : 'Non-GST'}</td>
                  <td>{c.user?.is_active === false ? 'Inactive' : 'Active'}</td>
                  <td>
                    <Link className="bp-btn bp-btn-primary" style={{ padding: '4px 10px', fontSize: 12 }} to={`/admin/clients/${c.id}/gstr-2b`}>
                      Open GSTR-2B
                    </Link>
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={5}>No clients found</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
