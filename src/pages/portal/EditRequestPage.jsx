import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { isRetail } from '../billing/billingProfile';
import { billingDocEditPath, billingDocPath, docTypeLabel } from '../billing/billingUtils';

const REASONS = [
  'Incorrect GST Rate',
  'Wrong Quantity',
  'Wrong Customer Name',
  'Wrong HSN',
  'Incorrect Amount',
  'Incorrect HSN/SAC',
  'Others',
];

const DOC_TYPES = [
  { value: 'tax_invoice', label: 'Tax Invoice', retailLabel: 'Invoice' },
  { value: 'bill_of_supply', label: 'Bill of Supply' },
  { value: 'debit_note', label: 'Debit Note' },
  { value: 'credit_note', label: 'Credit Note' },
  { value: 'quotation', label: 'Quotation' },
];

function HeaderEditIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M10.4 12.6a2 2 0 1 1 3 3L8 21l-1.5-.5.5-1.5z" />
    </svg>
  );
}

function DocSelectIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IllustrationIcon() {
  return (
    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.9 }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M10.4 12.6a2 2 0 1 1 3 3L8 21l-1.5-.5.5-1.5z" />
    </svg>
  );
}

function GreenCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function BlueCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 2 }}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4 }}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export default function EditRequestPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const retail = isRetail(user?.client_profile);
  const types = DOC_TYPES.filter((t) => !(retail && t.value !== 'tax_invoice'));

  const [documentType, setDocumentType] = useState(types[0]?.value || 'tax_invoice');
  const [billNumber, setBillNumber] = useState('');
  const [lookup, setLookup] = useState(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [remarks, setRemarks] = useState('');
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    api('/client/edit-requests?status=all')
      .then((d) => setRows(d.data?.data || d.data || []))
      .catch(console.error);
  };
  useEffect(() => { load(); }, []);

  const doLookup = async () => {
    setErr('');
    setLookup(null);
    if (!billNumber) {
      setErr('Please enter a bill number.');
      return;
    }
    try {
      const d = await api(`/client/edit-requests/lookup?document_type=${encodeURIComponent(documentType)}&bill_number=${encodeURIComponent(billNumber)}`);
      setLookup(d);
    } catch (e) {
      setErr(e.message || 'Document not found');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!lookup) {
      setErr('Please fetch a valid document first.');
      return;
    }
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const res = await api('/client/edit-requests', {
        method: 'POST',
        body: { document_type: documentType, bill_number: billNumber, reason, remarks },
      });
      setMsg(res.message || 'Submitted edit request successfully!');
      setLookup(null);
      setBillNumber('');
      setRemarks('');
      load();
    } catch (ex) {
      setErr(ex.message || 'Submit failed');
    } finally {
      setBusy(false);
    }
  };

  const formatPeriod = (dStr) => {
    if (!dStr) return '—';
    const date = new Date(dStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const d = String(date.getDate()).padStart(2, '0');
    const m = months[date.getMonth()];
    const y = date.getFullYear();
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${d} ${m} ${y}, ${time}`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="bp-badge" style={{ background: '#fff7ed', color: '#f97316', fontWeight: 600, border: '1px solid #ffedd5', padding: '3px 10px', borderRadius: 999 }}>Pending</span>;
      case 'approved':
        return <span className="bp-badge" style={{ background: '#f0fdf4', color: '#16a34a', fontWeight: 600, border: '1px solid #dcfce7', padding: '3px 10px', borderRadius: 999 }}>Approved</span>;
      case 'rejected':
        return <span className="bp-badge" style={{ background: '#fef2f2', color: '#ef4444', fontWeight: 600, border: '1px solid #fee2e2', padding: '3px 10px', borderRadius: 999 }}>Rejected</span>;
      default:
        return <span className="bp-badge" style={{ background: '#f8fafc', color: '#64748b', fontWeight: 600, padding: '3px 10px', borderRadius: 999 }}>{status}</span>;
    }
  };

  return (
    <div className="bp-content" style={{ maxWidth: '100%' }}>
      {/* Top Toolbar Header */}
      <div className="bp-toolbar" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: 44, height: 44, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #bfdbfe' }}>
            <HeaderEditIcon />
          </span>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--bp-navy)', letterSpacing: '-0.3px' }}>Document Change – Edit Request</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--bp-muted)' }}>
              Request changes for an issued document. Admin approval is required.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="bp-btn bp-btn-outline"
          style={{ height: 38, borderRadius: 8, borderColor: '#2563eb', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => navigate('/portal')}
        >
          <ArrowLeftIcon /> Back to Dashboard
        </button>
      </div>

      {/* Main Grid Wrapper */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', width: '100%', alignItems: 'flex-start' }}>
        
        {/* Left Hand Column (Forms & Table Grid) */}
        <div style={{ flex: '1 1 70%', minWidth: 320, display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Create Edit Request Form & Info Box */}
          <div className="bp-card" style={{ padding: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, color: '#2563eb', fontSize: 12, fontWeight: 750 }}>
                <span style={{ fontSize: 14, fontWeight: 'bold' }}>&#9998;</span> Create Edit Request
              </span>
            </div>

            <form onSubmit={submit}>
              {/* Flex Grid containing Form and Important Information Panel */}
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
                
                {/* Form Fields Column */}
                <div style={{ flex: '1 1 58%', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                    
                    {/* Document Type Dropdown */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-navy)' }}>Document Type</span>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 10, top: 12, zIndex: 2 }}>
                          <DocSelectIcon />
                        </span>
                        <select 
                          className="bp-select" 
                          style={{ height: 40, boxSizing: 'border-box', paddingLeft: 34, width: '100%' }}
                          value={documentType} 
                          onChange={(e) => { setDocumentType(e.target.value); setLookup(null); }}
                        >
                          {types.map((t) => (
                            <option key={t.value} value={t.value}>{retail && t.retailLabel ? t.retailLabel : t.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Bill number input */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-navy)' }}>Invoice / Bill Number</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input 
                          className="bp-input" 
                          style={{ height: 40, boxSizing: 'border-box', flex: 1, padding: '0 12px' }}
                          value={billNumber} 
                          onChange={(e) => setBillNumber(e.target.value)} 
                          placeholder="e.g. INV-1023" 
                          required 
                        />
                        <button 
                          type="button" 
                          className="bp-btn bp-btn-primary" 
                          style={{ height: 40, boxSizing: 'border-box', background: '#0052cc', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}
                          onClick={doLookup}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                          Fetch
                        </button>
                      </div>
                    </div>

                    {/* Reason for Edit */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-navy)' }}>Reason for Edit</span>
                      <select 
                        className="bp-select" 
                        style={{ height: 40, boxSizing: 'border-box', width: '100%' }}
                        value={reason} 
                        onChange={(e) => setReason(e.target.value)}
                      >
                        <option value="">Select Reason</option>
                        {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Remarks textarea */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-navy)' }}>Remarks *</span>
                    <textarea 
                      className="bp-input" 
                      rows={4} 
                      value={remarks} 
                      onChange={(e) => setRemarks(e.target.value.slice(0, 500))} 
                      placeholder="Describe the correction needed..." 
                      required
                      style={{ padding: 12, borderRadius: 8, fontSize: 13, minHeight: 90 }}
                    />
                    <span style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 11, color: 'var(--bp-muted)' }}>
                      {remarks.length}/500
                    </span>
                  </div>
                </div>

                {/* Important Side Box */}
                <div style={{ flex: '1 1 35%', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '16px', position: 'relative', minHeight: 180, display: 'flex', flexDirection: 'column' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 14, color: '#2563eb', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16 }}>&#9432;</span> Important
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.5, color: '#1e3a8a', display: 'flex', flexDirection: 'column', gap: 8, fontWeight: 500 }}>
                    <li>Issued documents cannot be edited directly.</li>
                    <li>Submit a request for Admin approval.</li>
                    <li>If rejected, you can create an amendment.</li>
                  </ul>
                  <div style={{ position: 'absolute', bottom: 10, right: 10 }}>
                    <IllustrationIcon />
                  </div>
                </div>

              </div>

              {/* Lookup Details Summary panel */}
              {lookup && (
                <div style={{ background: '#f8fafc', border: '1.5px solid var(--bp-border)', borderRadius: 10, padding: '14px', marginBottom: 16 }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 13, color: 'var(--bp-navy)', fontWeight: 800 }}>Document Reference Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                    <div>
                      <span style={{ fontSize: 10, color: 'var(--bp-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Bill Number</span>
                      <div style={{ fontSize: 13, fontWeight: 750, color: 'var(--bp-navy)', marginTop: 2 }}>{lookup.bill_number}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: 'var(--bp-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Date</span>
                      <div style={{ fontSize: 13, fontWeight: 750, color: 'var(--bp-navy)', marginTop: 2 }}>{String(lookup.document_date).slice(0, 10)}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: 'var(--bp-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Customer</span>
                      <div style={{ fontSize: 13, fontWeight: 750, color: 'var(--bp-navy)', marginTop: 2 }}>{lookup.customer_name || '—'}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: 'var(--bp-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Amount</span>
                      <div style={{ fontSize: 13, fontWeight: 750, color: '#166534', marginTop: 2 }}>₹{Number(lookup.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: 'var(--bp-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Status</span>
                      <div style={{ fontSize: 13, fontWeight: 750, color: 'var(--bp-navy)', marginTop: 2 }}>{lookup.status}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button 
                  type="submit" 
                  className="bp-btn bp-btn-primary" 
                  disabled={busy || !lookup}
                  style={{ height: 42, padding: '0 24px', background: '#0052cc', fontWeight: 800, borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Submit Request
                </button>
                {msg && <span style={{ color: '#16a34a', fontWeight: 750, fontSize: 13 }}>✓ {msg}</span>}
                {err && <span style={{ color: '#dc2626', fontWeight: 750, fontSize: 13 }}>⚠ {err}</span>}
              </div>
            </form>
          </div>

          {/* My Edit Requests table listing */}
          <div className="bp-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: 'var(--bp-navy)', fontSize: 16, fontWeight: 800 }}>My Edit Requests</h3>
              <button 
                type="button" 
                className="bp-btn bp-btn-outline" 
                style={{ height: 32, padding: '0 12px', fontSize: 12, fontWeight: 700, color: '#2563eb', borderColor: '#bfdbfe', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={load}
              >
                View All <ArrowRightIcon />
              </button>
            </div>

            <div className="bp-table-wrapper" style={{ overflowX: 'auto' }}>
              <table className="bp-table bp-doc-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center' }}>#</th>
                    <th style={{ textAlign: 'center' }}>Request ID</th>
                    <th style={{ textAlign: 'center' }}>Date &amp; Time</th>
                    <th style={{ textAlign: 'center' }}>Document Type</th>
                    <th style={{ textAlign: 'center' }}>Document No.</th>
                    <th style={{ textAlign: 'center' }}>Customer</th>
                    <th style={{ textAlign: 'center' }}>Reason</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--bp-muted)' }}>
                        No edit requests submitted yet.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, index) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 700, color: '#64748b' }}>{index + 1}</td>
                        <td style={{ fontWeight: 700 }}>ER-{String(r.id).padStart(4, '0')}</td>
                        <td>{formatPeriod(r.created_at)}</td>
                        <td style={{ fontWeight: 600 }}>{docTypeLabel(r.document_type)}</td>
                        <td style={{ fontWeight: 700, color: 'var(--bp-navy)' }}>{r.bill_number}</td>
                        <td style={{ fontWeight: 500 }}>{r.document?.customer?.name || r.customer_name || '—'}</td>
                        <td>{r.reason}</td>
                        <td>{getStatusBadge(r.status)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                            {r.status === 'approved' && r.document?.edit_allowed && billingDocEditPath(r.document_type, r.commercial_document_id) ? (
                              <Link
                                to={billingDocEditPath(r.document_type, r.commercial_document_id)}
                                className="bp-btn bp-btn-outline"
                                style={{ height: 28, padding: '0 10px', borderColor: '#16a34a', color: '#16a34a', fontSize: 11, fontWeight: 700, borderRadius: 999, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                              >
                                Edit Bill
                              </Link>
                            ) : r.status === 'rejected' ? (
                              <Link
                                to={`/portal/amendments?bill=${encodeURIComponent(r.bill_number)}`}
                                className="bp-btn bp-btn-outline"
                                style={{ height: 28, padding: '0 10px', borderColor: '#2563eb', color: '#2563eb', fontSize: 11, fontWeight: 700, borderRadius: 999, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                  <polyline points="14 2 14 8 20 8" />
                                  <path d="M10.4 12.6a2 2 0 1 1 3 3L8 21l-1.5-.5.5-1.5z" />
                                </svg>
                                Create Amendment
                              </Link>
                            ) : (
                              <Link
                                to={r.commercial_document_id ? billingDocPath(r.document_type, r.commercial_document_id) : '#'}
                                className="bp-btn bp-btn-outline"
                                style={{ height: 28, padding: '0 10px', borderColor: '#2563eb', color: '#2563eb', fontSize: 11, fontWeight: 700, borderRadius: 999, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                onClick={(e) => {
                                  if (!r.commercial_document_id) {
                                    e.preventDefault();
                                    alert('Document view not available.');
                                  }
                                }}
                              >
                                <EyeIcon /> View
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Info Footer Note */}
            <div style={{ background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginTop: 16, display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--bp-navy)', fontWeight: 600 }}>
              <span style={{ fontSize: 14 }}>ⓘ</span>
              <span>Only admin-approved requests will be applied to the documents. Rejected requests can be handled through Amendment Request.</span>
            </div>
          </div>

        </div>

        {/* Right Hand Column (Side Panels) */}
        <div style={{ flex: '1 1 25%', minWidth: 260, display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Card 1: About this Screen */}
          <div className="bp-card" style={{ padding: 16, borderLeft: '4px solid #2563eb' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: 14, color: '#2563eb', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>i</span> About this Screen
            </h4>
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--bp-text)', fontWeight: 500 }}>
              Create and track edit requests for issued documents. All requests require Admin approval before changes can be applied.
            </p>
          </div>

          {/* Card 2: Key Points */}
          <div className="bp-card" style={{ padding: 16 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: 'var(--bp-navy)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              Key Points
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.4, fontWeight: 600 }}>
                <GreenCheck /> <span>Select document and reason for edit.</span>
              </div>
              <div style={{ display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.4, fontWeight: 600 }}>
                <GreenCheck /> <span>Provide clear remarks for faster approval.</span>
              </div>
              <div style={{ display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.4, fontWeight: 600 }}>
                <GreenCheck /> <span>Track request status in My Edit Requests.</span>
              </div>
              <div style={{ display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.4, fontWeight: 600 }}>
                <GreenCheck /> <span>Approved requests will be updated in the document.</span>
              </div>
            </div>
          </div>

          {/* Card 3: Status Guide */}
          <div className="bp-card" style={{ padding: 16 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: 'var(--bp-navy)', fontWeight: 800 }}>
              Status Guide
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="bp-badge" style={{ background: '#fff7ed', color: '#f97316', fontWeight: 600, border: '1px solid #ffedd5', width: 70, textAlign: 'center', padding: '2px 0', borderRadius: 999 }}>Pending</span>
                <span style={{ fontSize: 11.5, color: 'var(--bp-muted)', fontWeight: 600 }}>Waiting for admin approval</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="bp-badge" style={{ background: '#f0fdf4', color: '#16a34a', fontWeight: 600, border: '1px solid #dcfce7', width: 70, textAlign: 'center', padding: '2px 0', borderRadius: 999 }}>Approved</span>
                <span style={{ fontSize: 11.5, color: 'var(--bp-muted)', fontWeight: 600 }}>Request approved by admin</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="bp-badge" style={{ background: '#fef2f2', color: '#ef4444', fontWeight: 600, border: '1px solid #fee2e2', width: 70, textAlign: 'center', padding: '2px 0', borderRadius: 999 }}>Rejected</span>
                <span style={{ fontSize: 11.5, color: 'var(--bp-muted)', fontWeight: 600 }}>Request rejected by admin</span>
              </div>
            </div>
          </div>

          {/* Card 4: Date & Time Format */}
          <div className="bp-card" style={{ padding: 16 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: 'var(--bp-navy)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Date &amp; Time Format
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.4, fontWeight: 600 }}>
                <BlueCheck /> <span>Date Format: DD/MM/YYYY</span>
              </div>
              <div style={{ display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.4, fontWeight: 600 }}>
                <BlueCheck /> <span>Time Format: 12-hour (hh:mm AM/PM)</span>
              </div>
              <div style={{ display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.4, fontWeight: 600 }}>
                <BlueCheck /> <span>All times shown in your local time zone</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
