import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { isRetail } from '../billing/billingProfile';
import { billingDocPath, money } from '../billing/billingUtils';

export default function AmendmentsPage() {
  const { user } = useAuth();
  const retail = isRetail(user?.client_profile);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('bill') || '');
  const [type, setType] = useState('tax_invoice');
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');

  const search = () => {
    setErr('');
    const qs = new URLSearchParams({ type });
    if (q) qs.set('q', q);
    api(`/billing/documents?${qs}`)
      .then((d) => setRows((d.data || []).filter((r) => ['issued', 'paid', 'partial'].includes(r.status))))
      .catch((e) => setErr(e.message));
  };

  useEffect(() => { search(); }, [type]);

  const createAmendment = (doc) => {
    navigate(`/portal/amendments/new?ref=${doc.id}`);
  };

  return (
    <div>
      <div className="bp-toolbar" style={{ marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>Amendments</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--bp-muted)' }}>
            After an edit request is rejected, create an amendment document linked to the original bill.
          </p>
        </div>
        <Link className="bp-btn bp-btn-primary" to="/portal/amendments/new">+ Create Amendment</Link>
      </div>

      <div className="bp-card" style={{ marginBottom: 16 }}>
        <div className="bp-toolbar" style={{ marginBottom: 10 }}>
          {!retail && (
            <select className="bp-input" style={{ maxWidth: 180 }} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="tax_invoice">Tax Invoice/Bill of Supply</option>
              <option value="credit_note">Credit Note</option>
              <option value="debit_note">Debit Note</option>
            </select>
          )}
          <input className="bp-input" style={{ maxWidth: 240 }} placeholder="Bill number or customer" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="button" className="bp-btn bp-btn-primary" onClick={search}>Search</button>
        </div>
        {err && <p style={{ color: 'var(--bp-red)' }}>{err}</p>}
        <table className="bp-table">
          <thead>
            <tr>
              <th>Bill Number</th><th>Date</th><th>Customer</th><th>Amount</th><th>Status</th><th />
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id}>
                <td><Link to={billingDocPath(d.type, d.id)}>{d.number}</Link></td>
                <td>{String(d.document_date).slice(0, 10)}</td>
                <td>{d.customer?.name || '—'}</td>
                <td>{money(d.grand_total || d.total_amount)}</td>
                <td>{d.status}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button type="button" className="bp-btn bp-btn-primary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => createAmendment(d)}>Create Amendment</button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6}>No issued documents found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
