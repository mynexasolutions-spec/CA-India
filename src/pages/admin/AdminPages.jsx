import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

const card = {
  background: '#fff',
  borderRadius: 12,
  padding: 20,
  boxShadow: '0 1px 3px rgba(0,0,0,.08)',
};

export function AdminDashboard() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api('/admin/dashboard').then(setData).catch(console.error);
  }, []);
  if (!data) return <p>Loading…</p>;
  const s = data.stats;
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Admin Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
        {[
          ['Clients', s.clients],
          ['Staff', s.staff],
          ['New enquiries', s.enquiries],
          ['Appointments', s.appointments],
          ['Articles', s.articles],
          ['Pending compliance', s.pending_compliance],
          ['Invoices (month)', s.invoices_month],
          ['Revenue (month)', `₹${Number(s.revenue_month || 0).toLocaleString('en-IN')}`],
        ].map(([label, val]) => (
          <div key={label} style={card}>
            <div style={{ opacity: 0.7, fontSize: 13 }}>{label}</div>
            <strong style={{ fontSize: 22 }}>{val}</strong>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr', marginTop: 20 }}>
        <div style={card}>
          <h3>Recent enquiries</h3>
          <ul>
            {(data.recent_enquiries || []).map((e) => (
              <li key={e.id}>
                <Link to="/admin/enquiries">{e.name} · {e.email}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div style={card}>
          <h3>Activity</h3>
          <ul>
            {(data.recent_activity || []).map((a) => (
              <li key={a.id}>{a.action} {a.user?.name ? `· ${a.user.name}` : ''}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function AdminResourceList({ resource, title, columns }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api(`/admin/${resource}`).then(setData).catch(console.error);
  }, [resource]);
  const rows = data?.data || data || [];
  return (
    <div style={card}>
      <h1 style={{ marginTop: 0 }}>{title}</h1>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} align="left" style={{ borderBottom: '1px solid #ddd', padding: 8 }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(rows) ? rows : []).map((row) => (
              <tr key={row.id}>
                {columns.map((c) => (
                  <td key={c.key} style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminClients() {
  const [form, setForm] = useState({
    name: '', email: '', password: 'Client@2026', phone: '', business_name: '', gstin: '', pan: '', city: 'Navi Mumbai', state_code: '27',
  });
  const [clients, setClients] = useState([]);
  const [msg, setMsg] = useState('');
  const [history, setHistory] = useState(null);

  const load = () => api('/admin/clients').then((d) => setClients(d.data || []));
  useEffect(() => { load(); }, []);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Add Client</h2>
        <form
          style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}
          onSubmit={async (e) => {
            e.preventDefault();
            await api('/admin/clients', { method: 'POST', body: form });
            setMsg('Client created');
            load();
          }}
        >
          {Object.keys(form).map((k) => (
            <label key={k}>
              {k}
              <input className="form-control" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} required={['name', 'email', 'password'].includes(k)} />
            </label>
          ))}
          <button className="btn btn-navy" type="submit">Create</button>
          {msg && <p style={{ color: 'green' }}>{msg}</p>}
        </form>
      </div>
      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Clients</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th align="left">Business</th>
              <th align="left">Email</th>
              <th align="left">GSTIN</th>
              <th align="left">Status</th>
              <th align="left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id}>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{c.business_name}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{c.user?.email}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{c.gstin}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{c.user?.is_active ? 'Active' : 'Inactive'}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-outline-navy"
                    style={{ padding: '4px 8px' }}
                    onClick={async () => {
                      await api(`/admin/clients/${c.id}/active`, {
                        method: 'POST',
                        body: { is_active: !c.user?.is_active },
                      });
                      load();
                    }}
                  >
                    {c.user?.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-navy"
                    style={{ padding: '4px 8px' }}
                    onClick={async () => {
                      const password = window.prompt('New password (min 8 chars)', 'Client@2026');
                      if (!password) return;
                      await api(`/admin/clients/${c.id}/reset-password`, { method: 'POST', body: { password } });
                      setMsg(`Password reset for ${c.business_name}`);
                    }}
                  >
                    Reset Password
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-navy"
                    style={{ padding: '4px 8px' }}
                    onClick={async () => {
                      const h = await api(`/admin/clients/${c.id}/login-history`);
                      setHistory({ name: c.business_name, rows: h.data || [] });
                    }}
                  >
                    Login History
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {history && (
          <div style={{ marginTop: 16 }}>
            <h3>Login history — {history.name}</h3>
            <ul>
              {history.rows.map((r) => (
                <li key={r.id}>{r.created_at} · IP {r.ip_address || '—'}</li>
              ))}
              {!history.rows.length && <li>No logins yet</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function plainToHtml(text) {
  const t = String(text || '').trim();
  if (!t) return '';
  return t
    .split(/\n\s*\n/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function htmlToPlain(html) {
  return String(html || '')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?p>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

export function AdminArticles() {
  const [form, setForm] = useState({
    title: '', excerpt: '', body: '', status: 'published', category_id: 1, published_at: new Date().toISOString().slice(0, 16),
  });
  const [msg, setMsg] = useState('');
  const [refresh, setRefresh] = useState(0);
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Publish Article</h2>
        <form
          style={{ display: 'grid', gap: 8 }}
          onSubmit={async (e) => {
            e.preventDefault();
            await api('/admin/articles', {
              method: 'POST',
              body: {
                ...form,
                body: plainToHtml(form.body),
                category_id: +form.category_id,
                published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
              },
            });
            setMsg('Article saved');
            setForm({
              title: '', excerpt: '', body: '', status: 'published', category_id: 1, published_at: new Date().toISOString().slice(0, 16),
            });
            setRefresh((n) => n + 1);
          }}
        >
          <input className="form-control" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <input className="form-control" placeholder="Short excerpt / summary" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
          <textarea
            className="form-control"
            rows={8}
            placeholder="Write article content in plain text. Use blank lines for new paragraphs."
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            required
          />
          <button className="btn btn-navy" type="submit">Publish</button>
          {msg && <p style={{ color: 'green' }}>{msg}</p>}
        </form>
      </div>
      <AdminArticlesList key={refresh} />
    </div>
  );
}

function AdminArticlesList() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api('/admin/articles').then(setData).catch(console.error);
  }, []);
  const rows = data?.data || [];
  return (
    <div style={card}>
      <h2 style={{ marginTop: 0 }}>Articles</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['ID', 'Title', 'Status', 'Category', 'Preview'].map((h) => (
              <th key={h} align="left" style={{ borderBottom: '1px solid #ddd', padding: 8 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{r.id}</td>
              <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{r.title}</td>
              <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{r.status}</td>
              <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{r.category?.name || '—'}</td>
              <td style={{ borderBottom: '1px solid #eee', padding: 8, maxWidth: 280, fontSize: 13, color: '#555' }}>
                {(r.excerpt || htmlToPlain(r.body) || '').slice(0, 120)}
                {(r.excerpt || htmlToPlain(r.body) || '').length > 120 ? '…' : ''}
              </td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={5} style={{ padding: 8 }}>No articles yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export function AdminEnquiries() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState('');

  const load = () => api('/admin/enquiries').then(setData).catch(console.error);
  useEffect(() => { load(); }, []);

  const rows = data?.data || [];

  const openDetail = async (id) => {
    const full = await api(`/admin/enquiries/${id}`);
    setSelected(full);
    setMsg('');
  };

  const updateStatus = async (status) => {
    if (!selected) return;
    const updated = await api(`/admin/enquiries/${selected.id}`, { method: 'PUT', body: { status } });
    setSelected(updated);
    setMsg(`Status updated to ${status}`);
    load();
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={card}>
        <h1 style={{ marginTop: 0 }}>Enquiries</h1>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['ID', 'Name', 'Email', 'Phone', 'Service', 'Status', ''].map((h) => (
                  <th key={h || 'a'} align="left" style={{ borderBottom: '1px solid #ddd', padding: 8 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{row.id}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{row.name}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{row.email}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{row.phone}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{row.service}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{row.status}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                    <button type="button" className="bp-btn bp-btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => openDetail(row.id)}>View</button>
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={7} style={{ padding: 8 }}>No enquiries</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
            <h2 style={{ marginTop: 0 }}>Enquiry #{selected.id}</h2>
            <button type="button" className="bp-btn bp-btn-outline" onClick={() => setSelected(null)}>Close</button>
          </div>
          <div style={{ display: 'grid', gap: 8, fontSize: 14 }}>
            <p style={{ margin: 0 }}><strong>Name:</strong> {selected.name}</p>
            <p style={{ margin: 0 }}><strong>Email:</strong> {selected.email || '—'}</p>
            <p style={{ margin: 0 }}><strong>Phone:</strong> {selected.phone || '—'}</p>
            <p style={{ margin: 0 }}><strong>Service:</strong> {selected.service || '—'}</p>
            <p style={{ margin: 0 }}><strong>Status:</strong> {selected.status}</p>
            <p style={{ margin: 0 }}><strong>Received:</strong> {selected.created_at ? new Date(selected.created_at).toLocaleString('en-IN') : '—'}</p>
            <div style={{ marginTop: 8, padding: 12, background: '#f5f8fb', borderRadius: 8, whiteSpace: 'pre-wrap' }}>
              <strong>Message</strong>
              <p style={{ margin: '8px 0 0' }}>{selected.message || '—'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {['new', 'in_progress', 'closed', 'spam'].map((s) => (
              <button key={s} type="button" className="bp-btn bp-btn-outline" onClick={() => updateStatus(s)}>
                Mark {s.replaceAll('_', ' ')}
              </button>
            ))}
          </div>
          {msg && <p style={{ color: 'green' }}>{msg}</p>}
        </div>
      )}
    </div>
  );
}

export function AdminAppointments() {
  return (
    <AdminResourceList
      resource="appointments"
      title="Appointments"
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'service', label: 'Service' },
        { key: 'preferred_at', label: 'Preferred' },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}

export function AdminCompliance() {
  const [form, setForm] = useState({
    client_profile_id: '',
    title: '',
    description: '',
    due_on: '',
    status: 'pending',
  });
  const [clients, setClients] = useState([]);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    api('/admin/clients').then((d) => setClients(d.data || [])).catch(() => {});
  }, []);
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Assign Compliance Task</h2>
        <form
          style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}
          onSubmit={async (e) => {
            e.preventDefault();
            await api('/admin/compliance/assign', {
              method: 'POST',
              body: { ...form, client_profile_id: +form.client_profile_id },
            });
            setMsg('Task assigned');
          }}
        >
          <label>
            Client
            <select className="form-control" value={form.client_profile_id} onChange={(e) => setForm({ ...form, client_profile_id: e.target.value })} required>
              <option value="">Select…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.business_name}</option>
              ))}
            </select>
          </label>
          <label>
            Due date
            <input className="form-control" type="date" value={form.due_on} onChange={(e) => setForm({ ...form, due_on: e.target.value })} />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Title
            <input className="form-control" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Description
            <textarea className="form-control" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <button className="btn btn-navy" type="submit">Assign</button>
          {msg && <p style={{ color: 'green' }}>{msg}</p>}
        </form>
      </div>
      <AdminResourceList
        resource="compliance"
        title="Compliance Tasks"
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'title', label: 'Title' },
          { key: 'status', label: 'Status' },
          { key: 'due_on', label: 'Due' },
          { key: 'client', label: 'Client', render: (r) => r.client_profile?.business_name },
        ]}
      />
    </div>
  );
}

export function AdminStaff() {
  const [form, setForm] = useState({ name: '', email: '', password: 'Staff@2026', role: 'staff', phone: '' });
  const [staff, setStaff] = useState([]);
  const [msg, setMsg] = useState('');
  const load = () => api('/admin/staff').then(setStaff);
  useEffect(() => { load(); }, []);
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Add Staff / Admin</h2>
        <p style={{ opacity: 0.8 }}>Roles: <code>admin</code> (full portal) · <code>staff</code> (operations)</p>
        <form
          style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}
          onSubmit={async (e) => {
            e.preventDefault();
            await api('/admin/staff', { method: 'POST', body: form });
            setMsg('Staff created');
            load();
          }}
        >
          {['name', 'email', 'password', 'phone'].map((k) => (
            <label key={k}>
              {k}
              <input className="form-control" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} required={k !== 'phone'} />
            </label>
          ))}
          <label>
            role
            <select className="form-control" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="staff">staff</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <button className="btn btn-navy" type="submit">Create</button>
          {msg && <p style={{ color: 'green' }}>{msg}</p>}
        </form>
      </div>
      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Team</h2>
        <ul>
          {staff.map((u) => (
            <li key={u.id}>{u.name} · {u.email} · <strong>{u.role}</strong></li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function AdminDueDates() {
  const [form, setForm] = useState({ title: '', type: 'gst', due_on: '', description: '', is_active: true });
  const [msg, setMsg] = useState('');
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Add Due Date</h2>
        <form
          style={{ display: 'grid', gap: 8 }}
          onSubmit={async (e) => {
            e.preventDefault();
            await api('/admin/due-dates', { method: 'POST', body: form });
            setMsg('Saved');
          }}
        >
          <input className="form-control" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <input className="form-control" placeholder="Type (gst/it/tds/roc)" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          <input className="form-control" type="date" value={form.due_on} onChange={(e) => setForm({ ...form, due_on: e.target.value })} required />
          <textarea className="form-control" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button className="btn btn-navy" type="submit">Publish</button>
          {msg && <p style={{ color: 'green' }}>{msg}</p>}
        </form>
      </div>
      <AdminResourceList
        resource="due-dates"
        title="Due Dates"
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'title', label: 'Title' },
          { key: 'type', label: 'Type' },
          { key: 'due_on', label: 'Due' },
        ]}
      />
    </div>
  );
}

export function AdminActivity() {
  return (
    <AdminResourceList
      resource="activity"
      title="Activity Logs"
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'action', label: 'Action' },
        { key: 'user', label: 'User', render: (r) => r.user?.name },
        { key: 'ip_address', label: 'IP' },
        { key: 'created_at', label: 'When' },
      ]}
    />
  );
}

export function AdminBillingMonitor() {
  const [files, setFiles] = useState([]);
  const [msg, setMsg] = useState('');
  const load = () => api('/admin/backups').then((d) => setFiles(d.files || []));
  useEffect(() => { load(); }, []);
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={card}>
        <h1 style={{ marginTop: 0 }}>Billing Monitoring</h1>
        <p>Open the billing workspace with your admin billing profile to create and monitor documents.</p>
        <Link to="/portal/billing" className="btn btn-gold">Open Billing</Link>
      </div>
      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Database Backups</h2>
        <button
          type="button"
          className="btn btn-navy"
          onClick={async () => {
            const r = await api('/admin/backups/run', { method: 'POST', body: {} });
            setMsg(r.message || 'Backup complete');
            load();
          }}
        >
          Run Backup Now
        </button>
        {msg && <p style={{ color: 'green' }}>{msg}</p>}
        <ul style={{ marginTop: 12 }}>
          {files.map((f) => (
            <li key={f.name}>{f.name} · {(f.size / 1024).toFixed(1)} KB · {f.modified}</li>
          ))}
          {!files.length && <li>No backups yet</li>}
        </ul>
      </div>
    </div>
  );
}
