import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { docTypeLabel } from '../billing/billingUtils';

function StatusBadge({ status }) {
  const cls = status === 'approved' ? 'bp-badge-paid' : status === 'rejected' ? 'bp-badge-cancelled' : 'bp-badge-partial';
  return <span className={`bp-badge ${cls}`}>{status}</span>;
}

export function AdminEditRequestList() {
  const [status, setStatus] = useState('pending');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const qs = new URLSearchParams({ status });
    if (q) qs.set('q', q);
    api(`/admin/edit-requests?${qs}`)
      .then((d) => setRows(d.data?.data || d.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [status]);

  return (
    <div>
      <div className="bp-toolbar" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>Edit Requests</h2>
          <p style={{ color: 'var(--bp-muted)', fontSize: 13, margin: '4px 0 0' }}>
            Client requests to unlock Tax Invoice/Bill of Supply / Credit Note / Debit Note for editing.
          </p>
        </div>
        <select className="bp-input" style={{ maxWidth: 160 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
        <input className="bp-input" style={{ maxWidth: 220 }} placeholder="Search bill / client" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" className="bp-btn bp-btn-primary" onClick={load}>Apply</button>
      </div>
      <div className="bp-card" style={{ overflowX: 'auto' }}>
        {loading ? <p>Loading…</p> : (
          <table className="bp-table">
            <thead>
              <tr>
                <th>Req #</th><th>Date</th><th>Client</th><th>Bill</th><th>Type</th><th>Reason</th><th>Status</th><th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.created_at ? new Date(r.created_at).toLocaleString('en-IN') : '—'}</td>
                  <td>{r.client_profile?.business_name || r.client_profile?.client_name}</td>
                  <td>{r.bill_number}</td>
                  <td>{docTypeLabel(r.document_type)}</td>
                  <td>{r.reason}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>
                    <Link className="bp-btn bp-btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} to={`/admin/edit-requests/${r.id}`}>
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={8}>No edit requests</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function AdminEditRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    api(`/admin/edit-requests/${id}`)
      .then((d) => {
        setData(d);
        setNote(d.admin_note || '');
      })
      .catch((e) => setErr(e.message));
  };
  useEffect(() => { load(); }, [id]);

  if (err && !data) return <p style={{ color: 'var(--bp-red)' }}>{err}</p>;
  if (!data) return <p>Loading…</p>;

  const pending = data.status === 'pending';

  const act = async (action) => {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const res = await api(`/admin/edit-requests/${id}/${action}`, {
        method: 'POST',
        body: { admin_note: note || null },
      });
      setMsg(res.message);
      setData(res.request);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="bp-toolbar" style={{ marginBottom: 14 }}>
        <h2 style={{ margin: 0, flex: 1 }}>
          Edit Request #{data.id} <StatusBadge status={data.status} />
        </h2>
        <button type="button" className="bp-btn bp-btn-outline" onClick={() => navigate('/admin/edit-requests')}>Back to list</button>
      </div>

      <div className="bp-card" style={{ marginBottom: 14 }}>
        <p style={{ margin: 0 }}>
          <strong>{data.client_profile?.business_name || data.client_profile?.client_name}</strong>
          {data.client_profile?.client_code ? ` · ${data.client_profile.client_code}` : ''}
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--bp-muted)' }}>
          Submitted {data.created_at ? new Date(data.created_at).toLocaleString('en-IN') : '—'}
          {data.submitter ? ` by ${data.submitter.name}` : ''}
        </p>
      </div>

      <div className="bp-card" style={{ marginBottom: 14 }}>
        <div className="bp-gst-box" style={{ maxWidth: 480 }}>
          <div className="bp-gst-row"><span>Bill Number</span><strong>{data.bill_number}</strong></div>
          <div className="bp-gst-row"><span>Document Type</span><strong>{docTypeLabel(data.document_type)}</strong></div>
          <div className="bp-gst-row"><span>Date</span><strong>{data.document?.document_date ? String(data.document.document_date).slice(0, 10) : '—'}</strong></div>
          <div className="bp-gst-row"><span>Customer</span><strong>{data.document?.customer?.name || '—'}</strong></div>
          <div className="bp-gst-row"><span>Amount</span><strong>₹{Number(data.document?.grand_total || 0).toLocaleString('en-IN')}</strong></div>
          <div className="bp-gst-row"><span>Reason</span><strong>{data.reason}</strong></div>
          <div className="bp-gst-row"><span>Remarks</span><strong>{data.remarks || '—'}</strong></div>
        </div>
      </div>

      <div className="bp-card">
        <label>
          <span className="bp-field-title">Admin Note</span>
          <textarea className="bp-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} disabled={!pending} />
        </label>
        {pending && (
          <div className="bp-actions" style={{ marginTop: 12 }}>
            <button type="button" className="bp-btn bp-btn-green" disabled={busy} onClick={() => act('approve')}>Approve</button>
            <button type="button" className="bp-btn bp-btn-danger" disabled={busy} onClick={() => act('reject')}>Reject</button>
          </div>
        )}
        {msg && <p style={{ color: 'var(--bp-green)' }}>{msg}</p>}
        {err && <p style={{ color: 'var(--bp-red)' }}>{err}</p>}
      </div>
    </div>
  );
}
