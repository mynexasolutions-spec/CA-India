import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { isRetail } from '../billing/billingProfile';
import { billingDocPath, money, docTypeLabel } from '../billing/billingUtils';

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4 }}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CreateAmendIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M10.4 12.6a2 2 0 1 1 3 3L8 21l-1.5-.5.5-1.5z" />
    </svg>
  );
}

export default function AmendmentsPage() {
  const { user } = useAuth();
  const retail = isRetail(user?.client_profile);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // Filter States
  const [q, setQ] = useState(params.get('bill') || '');
  const [type, setType] = useState('All');
  const [amendmentStatus, setAmendmentStatus] = useState('All');
  const [editRequestStatus, setEditRequestStatus] = useState('All');
  const [dateRange, setDateRange] = useState('');

  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');

  const search = () => {
    setErr('');
    const qs = new URLSearchParams();
    if (type !== 'All') {
      qs.set('type', type);
    }
    if (q) {
      qs.set('q', q);
    }
    api(`/billing/documents?${qs}`)
      .then((d) => {
        let fetched = d.data || [];
        // Only keep documents that are issued, paid, or partial
        fetched = fetched.filter((r) => ['issued', 'paid', 'partial'].includes(r.status));
        setRows(fetched);
      })
      .catch((e) => setErr(e.message));
  };

  useEffect(() => {
    search();
  }, [type]);

  const handleReset = () => {
    setQ('');
    setType('All');
    setAmendmentStatus('All');
    setEditRequestStatus('All');
    setDateRange('');
    search();
  };

  const createAmendment = (doc) => {
    navigate(`/portal/amendments/new?ref=${doc.id}`);
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    const date = new Date(isoStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Helper to resolve the amendment status based on document criteria
  const getAmendStatus = (doc) => {
    if (doc.status === 'draft') return 'Draft';
    if (doc.status === 'pending_approval') return 'Pending Approval';
    if (doc.status === 'approved') return 'Approved';
    if (doc.status === 'rejected') return 'Rejected';
    return 'Available';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Available':
        return <span className="bp-badge" style={{ background: '#eff6ff', color: '#2563eb', fontWeight: 700, border: '1px solid #bfdbfe', padding: '3px 10px', borderRadius: 999 }}>Available</span>;
      case 'Draft':
        return <span className="bp-badge" style={{ background: '#faf5ff', color: '#7c3aed', fontWeight: 700, border: '1px solid #e9d5ff', padding: '3px 10px', borderRadius: 999 }}>Draft</span>;
      case 'Pending Approval':
        return <span className="bp-badge" style={{ background: '#fff7ed', color: '#f97316', fontWeight: 700, border: '1px solid #ffedd5', padding: '3px 10px', borderRadius: 999 }}>Pending Approval</span>;
      case 'Approved':
        return <span className="bp-badge" style={{ background: '#f0fdf4', color: '#16a34a', fontWeight: 700, border: '1px solid #dcfce7', padding: '3px 10px', borderRadius: 999 }}>Approved</span>;
      case 'Rejected':
        return <span className="bp-badge" style={{ background: '#fef2f2', color: '#ef4444', fontWeight: 700, border: '1px solid #fee2e2', padding: '3px 10px', borderRadius: 999 }}>Rejected</span>;
      default:
        return <span className="bp-badge" style={{ background: '#f8fafc', color: '#64748b', fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>{status}</span>;
    }
  };

  return (
    <div className="bp-content" style={{ maxWidth: '100%' }}>
      {/* Top Header */}
      <div className="bp-toolbar" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: 44, height: 44, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #bfdbfe' }}>
            <DocumentIcon />
          </span>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--bp-navy)', letterSpacing: '-0.3px' }}>Amendments</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--bp-muted)' }}>
              Create and manage amendments for documents.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content — full width; side informational panels removed per spec */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>

          {/* Filters Card */}
          <div className="bp-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Row 1: Search, Document Type, Date Range */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'flex-end' }}>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: 13, color: 'var(--bp-muted)', pointerEvents: 'none' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </span>
                    <input
                      className="bp-input"
                      style={{ height: 40, boxSizing: 'border-box', width: '100%', paddingLeft: 36, paddingRight: 12 }}
                      placeholder="Search by document no. or customer..."
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-navy)', opacity: 0.9 }}>Document Type</span>
                  <select 
                    className="bp-select" 
                    style={{ height: 40, boxSizing: 'border-box', width: '100%' }}
                    value={type} 
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="All">All</option>
                    <option value="tax_invoice">Tax Invoice</option>
                    <option value="bill_of_supply">Bill of Supply</option>
                    <option value="credit_note">Credit Note</option>
                    <option value="debit_note">Debit Note</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-navy)', opacity: 0.9 }}>Date Range</span>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      className="bp-input" 
                      style={{ height: 40, boxSizing: 'border-box', width: '100%', paddingRight: 36 }}
                      placeholder="Select date range" 
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
                    />
                    <span style={{ position: 'absolute', right: 12, top: 12, color: 'var(--bp-muted)' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </span>
                  </div>
                </div>

              </div>

              {/* Row 2: Amendment Status, Edit Request Status, Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, alignItems: 'flex-end' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-navy)', opacity: 0.9 }}>Amendment Status</span>
                  <select 
                    className="bp-select" 
                    style={{ height: 40, boxSizing: 'border-box', width: '100%' }}
                    value={amendmentStatus} 
                    onChange={(e) => setAmendmentStatus(e.target.value)}
                  >
                    <option value="All">All</option>
                    <option value="Available">Available</option>
                    <option value="Draft">Draft</option>
                    <option value="Pending Approval">Pending Approval</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-navy)', opacity: 0.9 }}>Edit Request Status</span>
                  <select 
                    className="bp-select" 
                    style={{ height: 40, boxSizing: 'border-box', width: '100%' }}
                    value={editRequestStatus} 
                    onChange={(e) => setEditRequestStatus(e.target.value)}
                  >
                    <option value="All">All</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button 
                    type="button" 
                    className="bp-btn bp-btn-outline" 
                    style={{ height: 40, padding: '0 24px', borderColor: '#2563eb', color: '#2563eb', fontWeight: 700, borderRadius: 8, background: '#fff' }}
                    onClick={handleReset}
                  >
                    Reset
                  </button>
                  <button 
                    type="button" 
                    className="bp-btn bp-btn-primary" 
                    style={{ height: 40, padding: '0 24px', background: '#0052cc', fontWeight: 700, borderRadius: 8 }}
                    onClick={search}
                  >
                    Apply
                  </button>
                </div>

              </div>
            </div>
            {err && <p style={{ color: 'var(--bp-red)', margin: '12px 0 0 0', fontSize: 13, fontWeight: 600 }}>⚠ {err}</p>}
          </div>

          {/* Table Card */}
          <div className="bp-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="bp-table-wrapper" style={{ overflowX: 'auto' }}>
              <table className="bp-table bp-doc-table" style={{ width: '100%', marginBottom: 0 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center' }}>Document No.</th>
                    <th style={{ textAlign: 'center' }}>Date</th>
                    <th style={{ textAlign: 'center' }}>Document Type</th>
                    <th style={{ textAlign: 'center' }}>Customer</th>
                    <th style={{ textAlign: 'center' }}>Original Amount</th>
                    <th style={{ textAlign: 'center' }}>Amendment Status</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--bp-muted)' }}>
                        No matching documents found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((d) => {
                      const status = getAmendStatus(d);
                      return (
                        <tr key={d.id}>
                          <td style={{ fontWeight: 700, color: 'var(--bp-navy)' }}>{d.number}</td>
                          <td>{formatDate(d.document_date)}</td>
                          <td style={{ fontWeight: 600 }}>{docTypeLabel(d.type)}</td>
                          <td style={{ fontWeight: 500 }}>{d.customer?.name || '—'}</td>
                          <td style={{ fontWeight: 700 }}>{money(d.grand_total || d.total_amount)}</td>
                          <td>{getStatusBadge(status)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                              {status === 'Available' ? (
                                <button
                                  type="button"
                                  className="bp-btn bp-btn-outline"
                                  style={{ height: 28, padding: '0 10px', borderColor: '#2563eb', color: '#2563eb', fontSize: 11, fontWeight: 700, borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  onClick={() => createAmendment(d)}
                                >
                                  <CreateAmendIcon /> Create Amendment
                                </button>
                              ) : status === 'Draft' ? (
                                <Link
                                  to={`/portal/amendments/new?ref=${d.id}`}
                                  style={{ color: '#2563eb', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                  Continue <ArrowRightIcon />
                                </Link>
                              ) : (
                                <Link
                                  to={billingDocPath(d.type, d.id)}
                                  style={{ color: '#2563eb', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                  <EyeIcon /> View
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* View All Amendments footer link */}
            <div style={{ padding: '16px', textAlign: 'center', borderTop: '1px solid var(--bp-border)' }}>
              <Link 
                to="/portal/amendments" 
                style={{ fontSize: 14, fontWeight: 800, color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={(e) => {
                  e.preventDefault();
                  search();
                }}
              >
                View All Amendments <ArrowRightIcon />
              </Link>
            </div>
          </div>

          {/* Bottom Info Banner — admin/compliance notice, kept per spec */}
          <div style={{ background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--bp-navy)', fontWeight: 600 }}>
            <span style={{ fontSize: 14 }}>ⓘ</span>
            <span>Only admin-approved amendments will be applied to the documents. Rejected requests can be handled through Amendment Request.</span>
          </div>

      </div>
    </div>
  );
}
