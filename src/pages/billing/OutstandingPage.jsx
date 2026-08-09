import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import BillingDateFilters from './BillingDateFilters';
import { currentFyRange, docTypeLabel, money } from './billingUtils';

function fmtDate(v) {
  return v ? String(v).slice(0, 10) : '—';
}

function paymentLabel(status) {
  if (status === 'paid') return 'Paid';
  if (status === 'partial') return 'Partial';
  return 'Unpaid';
}

function paymentBadgeClass(status) {
  if (status === 'paid') return 'bp-badge-paid';
  if (status === 'partial') return 'bp-badge-partial';
  return 'bp-badge-unpaid';
}

function docPath(doc) {
  if (doc.type === 'bill_of_supply') return `/portal/billing/bill-of-supply/${doc.id}`;
  return `/portal/billing/invoices/${doc.id}`;
}

function listPath(doc) {
  if (doc.type === 'bill_of_supply') return '/portal/billing/bill-of-supply';
  return '/portal/billing/invoices';
}

export default function OutstandingPage() {
  const fyDefault = currentFyRange();
  const [tab, setTab] = useState('unpaid');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [month, setMonth] = useState('');
  const [fy, setFy] = useState(fyDefault.fy);
  const [from, setFrom] = useState(fyDefault.from);
  const [to, setTo] = useState(fyDefault.to);

  const load = () => {
    setLoading(true);
    setMsg('');
    const type = tab === 'paid' ? 'paid_invoices' : 'outstanding_report';
    const qs = new URLSearchParams({ type });
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    api(`/billing/reports?${qs}`)
      .then((d) => setRows(Array.isArray(d?.data) ? d.data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab]);

  const markStatus = async (doc, status) => {
    setMsg('');
    try {
      await api(`/billing/documents/${doc.id}/payment-status`, {
        method: 'POST',
        body: { status },
      });
      if (status === 'paid') {
        setMsg(`${doc.number} marked Paid — removed from Outstanding. View it under ${doc.type === 'bill_of_supply' ? 'Bill of Supply' : 'Tax Invoice/Bill of Supply'}.`);
        setRows((prev) => prev.filter((r) => r.id !== doc.id));
      } else {
        setMsg(`${doc.number} marked Unpaid — moved back to Outstanding.`);
        if (tab === 'paid') setRows((prev) => prev.filter((r) => r.id !== doc.id));
        else load();
      }
    } catch (e) {
      setMsg(e.message || 'Failed to update payment status');
    }
  };

  const unpaidTotal = rows
    .filter((r) => r.status !== 'paid')
    .reduce((s, r) => s + Number(r.grand_total || r.total_amount || 0), 0);

  return (
    <div>
      <div className="bp-toolbar">
        <div>
          <h2 style={{ margin: 0 }}>Outstanding</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--bp-muted)' }}>
            Unpaid invoices stay here (red). Mark Paid to move them to Tax Invoice/Bill of Supply (green).
          </p>
        </div>
      </div>

      <div className="bp-toolbar" style={{ marginTop: 12 }}>
        <button
          type="button"
          className={`bp-btn ${tab === 'unpaid' ? 'bp-btn-danger' : 'bp-btn-outline'}`}
          onClick={() => setTab('unpaid')}
        >
          Unpaid
        </button>
        <button
          type="button"
          className={`bp-btn ${tab === 'paid' ? 'bp-btn-green' : 'bp-btn-outline'}`}
          onClick={() => setTab('paid')}
        >
          Paid
        </button>
        {tab === 'unpaid' && (
          <div className="bp-card bp-kpi" style={{ padding: '8px 14px', marginLeft: 'auto' }}>
            <div className="label">Outstanding Total</div>
            <div className="value" style={{ fontSize: 18, color: 'var(--bp-red)' }}>{money(unpaidTotal)}</div>
          </div>
        )}
      </div>

      <div className="bp-card" style={{ marginTop: 12 }}>
        <BillingDateFilters
          month={month}
          setMonth={setMonth}
          fy={fy}
          setFy={setFy}
          from={from}
          setFrom={setFrom}
          to={to}
          setTo={setTo}
          showSearch={false}
          onApply={load}
          onClear={() => {
            const next = currentFyRange();
            setFrom(next.from);
            setTo(next.to);
            setMonth('');
            setFy(next.fy);
            setTimeout(load, 0);
          }}
        />
      </div>

      {msg && (
        <p style={{ color: msg.includes('Failed') ? 'var(--bp-red)' : 'var(--bp-green)', marginTop: 12 }}>
          {msg}
          {msg.includes('Tax Invoice/Bill of Supply') && <>{' '}<Link to="/portal/billing/invoices">Open Tax Invoice/Bill of Supply</Link></>}
          {msg.includes('Bill of Supply') && !msg.includes('Tax Invoice/Bill of Supply') && <>{' '}<Link to="/portal/billing/bill-of-supply">Open Bill of Supply</Link></>}
        </p>
      )}

      <div className="bp-card" style={{ marginTop: 14, overflowX: 'auto' }}>
        {loading ? <p>Loading…</p> : (
          <table className="bp-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Date</th>
                <th>Due</th>
                <th>Party</th>
                <th>Type</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><Link to={docPath(r)}>{r.number}</Link></td>
                  <td>{fmtDate(r.document_date)}</td>
                  <td>{fmtDate(r.due_date)}</td>
                  <td>{r.customer?.name || '—'}</td>
                  <td>{docTypeLabel(r.type)}</td>
                  <td>{money(r.grand_total || r.total_amount)}</td>
                  <td>
                    <span className={`bp-badge ${paymentBadgeClass(r.status)}`}>
                      {paymentLabel(r.status)}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <Link className="bp-btn bp-btn-outline" style={{ padding: '2px 8px', fontSize: 11 }} to={docPath(r)}>
                      View
                    </Link>
                    {tab === 'unpaid' ? (
                      <>
                        {' '}
                        <button
                          type="button"
                          className="bp-btn bp-btn-green"
                          style={{ padding: '2px 8px', fontSize: 11 }}
                          onClick={() => markStatus(r, 'paid')}
                        >
                          Mark Paid
                        </button>
                      </>
                    ) : (
                      <>
                        {' '}
                        <button
                          type="button"
                          className="bp-btn bp-btn-danger"
                          style={{ padding: '2px 8px', fontSize: 11 }}
                          onClick={() => markStatus(r, 'unpaid')}
                        >
                          Mark Unpaid
                        </button>
                        {' '}
                        <Link to={listPath(r)} style={{ fontSize: 12 }}>Go to list</Link>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={8}>
                    {tab === 'unpaid'
                      ? 'No unpaid invoices — outstanding is clear.'
                      : 'No paid invoices in this period. Paid documents appear under Tax Invoice/Bill of Supply.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
