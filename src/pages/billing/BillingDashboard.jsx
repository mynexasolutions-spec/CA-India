import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import BillingDateFilters from './BillingDateFilters';
import { billingDocEditPath, billingDocPath, currentFyRange, docTypeLabel, money, paymentStatusBadge, paymentStatusLabel } from './billingUtils';

export default function BillingDashboard() {
  const { user } = useAuth();
  const profile = user?.client_profile;
  const fyDefault = currentFyRange();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [month, setMonth] = useState('');
  const [fy, setFy] = useState(fyDefault.fy);
  const [from, setFrom] = useState(fyDefault.from);
  const [to, setTo] = useState(fyDefault.to);
  const [status, setStatus] = useState('');
  const [docType, setDocType] = useState('');

  const load = () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (month) qs.set('month', month);
    if (fy) qs.set('fy', fy);
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    if (status) qs.set('status', status);
    if (docType) qs.set('type', docType);
    api(`/billing/documents?${qs}`)
      .then((d) => setRows(d.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <p style={{ color: 'var(--bp-muted)', fontSize: 13, marginTop: 0, marginBottom: 14 }}>
        Filter Documents by Financial Year, Date Range, or Document type.
      </p>

      <div className="bp-card">
        <h3 style={{ marginTop: 0 }}>All Bills &amp; Documents</h3>
        <BillingDateFilters
          q={q}
          setQ={setQ}
          month={month}
          setMonth={setMonth}
          fy={fy}
          setFy={setFy}
          from={from}
          setFrom={setFrom}
          to={to}
          setTo={setTo}
          status={status}
          setStatus={setStatus}
          docType={docType}
          setDocType={setDocType}
          showDocType
          profile={profile}
          onApply={load}
          onClear={load}
        />
        {loading ? <p>Loading…</p> : (
          <table className="bp-table">
            <thead>
              <tr>
                <th>Number</th>
                <th>Date</th>
                <th>Type</th>
                <th>Party</th>
                <th>Taxable</th>
                <th>GST</th>
                <th>Total</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const editPath = billingDocEditPath(d.type, d.id);
                return (
                  <tr key={d.id}>
                    <td><Link to={billingDocPath(d.type, d.id)}>{d.number}</Link></td>
                    <td>{String(d.document_date).slice(0, 10)}</td>
                    <td>{docTypeLabel(d.type)}</td>
                    <td>{d.customer?.name || '—'}</td>
                    <td>{money(d.taxable_amount)}</td>
                    <td>{money(Number(d.cgst_amount) + Number(d.sgst_amount) + Number(d.igst_amount))}</td>
                    <td>{money(d.grand_total || d.total_amount)}</td>
                    <td><span className={`bp-badge ${paymentStatusBadge(d.status)}`}>{paymentStatusLabel(d.status)}</span></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <Link className="bp-btn bp-btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} to={billingDocPath(d.type, d.id)}>View</Link>
                      {d.status === 'draft' && editPath && (
                        <> · <Link to={editPath}>Edit</Link></>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={9}>No documents for selected filters</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
