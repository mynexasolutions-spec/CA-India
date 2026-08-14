import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';

export default function GstFilingConfirmation() {
  const [financialYear, setFinancialYear] = useState('2026-2027');
  const [filingPeriod, setFilingPeriod] = useState('');
  const [returnType, setReturnType] = useState('Both');
  
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [clientDeclaration, setClientDeclaration] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const [pastRequests, setPastRequests] = useState([]);

  useEffect(() => {
    fetchPastRequests();
  }, []);

  const fetchPastRequests = async () => {
    try {
      const res = await api('/client/gst-filing/requests');
      setPastRequests(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFetchPreview = async () => {
    if (!filingPeriod) {
      alert('Please select a filing period.');
      return;
    }
    
    setLoading(true);
    setPreviewData(null);
    setClientDeclaration(false);
    
    try {
      const params = new URLSearchParams({
        financial_year: financialYear,
        filing_period: filingPeriod,
        return_type: returnType,
      });
      const res = await api(`/client/gst-filing/preview?${params.toString()}`);
      setPreviewData(res);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch billing data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    setSubmitting(true);
    try {
      const res = await api('/client/gst-filing/request', {
        method: 'POST',
        body: {
          financial_year: financialYear,
          filing_period: filingPeriod,
          return_type: returnType,
          client_declaration: clientDeclaration,
        }
      });
      alert(res.message);
      setShowConfirmModal(false);
      setPreviewData(null);
      fetchPastRequests();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to submit request.');
      setShowConfirmModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending CA Review': return <span className="bp-badge bp-badge-draft">Pending CA Review</span>;
      case 'Correction Required': return <span className="bp-badge bp-badge-unpaid">Correction Required</span>;
      case 'Approved for Filing': return <span className="bp-badge bp-badge-paid">Approved for Filing</span>;
      case 'GST Filed': return <span className="bp-badge bp-badge-paid">GST Filed</span>;
      default: return <span className="bp-badge" style={{ background: '#f1f5f9', color: '#64748b' }}>{status}</span>;
    }
  };

  return (
    <div className="bp-content" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div className="bp-toolbar">
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', color: 'var(--bp-navy)' }}>GST Filing Confirmation</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--bp-muted)' }}>Review your monthly bills and send a GST filing request to your CA.</p>
        </div>
      </div>

      <div className="bp-card" style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--bp-navy)', borderBottom: '1px solid var(--bp-border)', paddingBottom: '12px' }}>
          1. Period Selection
        </h3>
        <div className="bp-filters" style={{ margin: 0 }}>
          <label className="bp-filter-field">
            <span className="bp-filter-title">Financial Year</span>
            <select 
              className="bp-filter-control bp-filter-item"
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
            >
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027</option>
            </select>
          </label>
          <label className="bp-filter-field">
            <span className="bp-filter-title">Filing Period (Month)</span>
            <input 
              type="month" 
              className="bp-filter-control bp-filter-item"
              value={filingPeriod}
              onChange={(e) => setFilingPeriod(e.target.value)}
            />
          </label>
          <label className="bp-filter-field">
            <span className="bp-filter-title">Return Type</span>
            <select 
              className="bp-filter-control bp-filter-item"
              style={{ width: '180px' }}
              value={returnType}
              onChange={(e) => setReturnType(e.target.value)}
            >
              <option value="Both">GSTR-1 & GSTR-3B</option>
              <option value="GSTR-1">GSTR-1 Only</option>
              <option value="GSTR-3B">GSTR-3B Only</option>
            </select>
          </label>
          <button 
            onClick={handleFetchPreview}
            disabled={loading}
            className="bp-btn bp-btn-primary"
            style={{ height: '38px' }}
          >
            {loading ? 'Fetching...' : 'Fetch Bills & Summary'}
          </button>
        </div>
      </div>

      {previewData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>
          <div className="bp-card">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--bp-navy)' }}>
              2. Bill Review <span style={{ fontSize: '13px', color: 'var(--bp-muted)', fontWeight: 'normal' }}>({previewData.summary.total_bills} Bills)</span>
            </h3>
            
            {previewData.bills.length > 0 ? (
              <div style={{ overflowX: 'auto', border: '1px solid var(--bp-border)', borderRadius: '8px' }}>
                <table className="bp-table" style={{ margin: 0 }}>
                  <thead style={{ background: '#f8fafc' }}>
                    <tr>
                      <th>Invoice No</th>
                      <th>Date</th>
                      <th style={{ textAlign: 'right' }}>Taxable Val</th>
                      <th style={{ textAlign: 'right' }}>CGST</th>
                      <th style={{ textAlign: 'right' }}>SGST</th>
                      <th style={{ textAlign: 'right' }}>IGST</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.bills.map((bill) => (
                      <tr key={bill.id}>
                        <td style={{ fontWeight: 600 }}>{bill.number}</td>
                        <td>{new Date(bill.document_date).toLocaleDateString()}</td>
                        <td style={{ textAlign: 'right' }}>₹{Number(bill.taxable_amount).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>₹{Number(bill.cgst_amount).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>₹{Number(bill.sgst_amount).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>₹{Number(bill.igst_amount).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{Number(bill.total_amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bp-table-empty">
                No bills found for this period. Please create bills in the Billing Module first.
              </div>
            )}
          </div>

          {previewData.bills.length > 0 && (
            <div className="bp-card" style={{ background: 'var(--bp-sky)', borderColor: 'var(--bp-border)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--bp-navy)' }}>
                3. GST Filing Summary
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                <div className="bp-card" style={{ padding: '12px', textAlign: 'center' }}>
                  <div className="bp-kpi"><div className="label">Total Bills</div><div className="value">{previewData.summary.total_bills}</div></div>
                </div>
                <div className="bp-card" style={{ padding: '12px', textAlign: 'center' }}>
                  <div className="bp-kpi"><div className="label">Taxable Value</div><div className="value" style={{ fontSize: '20px' }}>₹{previewData.summary.taxable_value.toFixed(2)}</div></div>
                </div>
                <div className="bp-card" style={{ padding: '12px', textAlign: 'center' }}>
                  <div className="bp-kpi"><div className="label">Total CGST</div><div className="value" style={{ fontSize: '20px' }}>₹{previewData.summary.total_cgst.toFixed(2)}</div></div>
                </div>
                <div className="bp-card" style={{ padding: '12px', textAlign: 'center' }}>
                  <div className="bp-kpi"><div className="label">Total SGST</div><div className="value" style={{ fontSize: '20px' }}>₹{previewData.summary.total_sgst.toFixed(2)}</div></div>
                </div>
                <div className="bp-card" style={{ padding: '12px', textAlign: 'center' }}>
                  <div className="bp-kpi"><div className="label">Total IGST</div><div className="value" style={{ fontSize: '20px' }}>₹{previewData.summary.total_igst.toFixed(2)}</div></div>
                </div>
                <div className="bp-card" style={{ padding: '12px', textAlign: 'center', borderColor: 'var(--bp-blue)' }}>
                  <div className="bp-kpi"><div className="label" style={{ color: 'var(--bp-blue)' }}>Total GST</div><div className="value" style={{ fontSize: '20px', color: 'var(--bp-blue)' }}>₹{previewData.summary.total_gst.toFixed(2)}</div></div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--bp-border)', paddingTop: '20px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: 'var(--bp-navy)' }}>4. Client Confirmation</h3>
                <div className="bp-card" style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => setClientDeclaration(!clientDeclaration)}>
                  <input
                    type="checkbox"
                    style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '2px' }}
                    checked={clientDeclaration}
                    onChange={(e) => setClientDeclaration(e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--bp-text)', fontWeight: 500 }}>
                    “I confirm that I have reviewed the above bills and GST summary and request the CA to proceed with GST filing for the selected period.”
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    disabled={!clientDeclaration}
                    className="bp-btn bp-btn-green"
                    style={{ padding: '12px 24px', fontSize: '15px' }}
                  >
                    Proceed to GST Filing
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {pastRequests.length > 0 && (
        <div className="bp-card">
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--bp-navy)', borderBottom: '1px solid var(--bp-border)', paddingBottom: '12px' }}>
            Past Filing Requests
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="bp-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Period</th>
                  <th>Return Type</th>
                  <th style={{ textAlign: 'right' }}>Bills</th>
                  <th style={{ textAlign: 'right' }}>Total GST</th>
                  <th>Status</th>
                  <th>Submitted On</th>
                </tr>
              </thead>
              <tbody>
                {pastRequests.map((req) => (
                  <tr key={req.id}>
                    <td style={{ fontWeight: 600 }}>REQ-{req.id.toString().padStart(4, '0')}</td>
                    <td>{req.filing_period}</td>
                    <td>{req.return_type}</td>
                    <td style={{ textAlign: 'right' }}>{req.total_bills}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{Number(req.total_gst).toFixed(2)}</td>
                    <td>{getStatusBadge(req.status)}</td>
                    <td style={{ color: 'var(--bp-muted)' }}>{new Date(req.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showConfirmModal && previewData && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(22, 58, 82, 0.4)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px'
        }}>
          <div className="bp-card" style={{ width: '100%', maxWidth: '440px', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bp-border)', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--bp-navy)' }}>Confirm Submission</h3>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 16px 0', color: 'var(--bp-text)', fontWeight: 500 }}>
                Are you sure you want to send this GST filing confirmation to the CA?
              </p>
              
              <div style={{ background: 'var(--bp-sky)', padding: '16px', borderRadius: '8px', display: 'grid', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--bp-muted)' }}>Filing Period:</span> <span style={{ fontWeight: 600 }}>{filingPeriod}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--bp-muted)' }}>Total Bills:</span> <span style={{ fontWeight: 600 }}>{previewData.summary.total_bills}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--bp-muted)' }}>Taxable Value:</span> <span style={{ fontWeight: 600 }}>₹{previewData.summary.taxable_value.toFixed(2)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--bp-border)', paddingTop: '8px', marginTop: '4px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--bp-navy)' }}>Total GST:</span> 
                  <span style={{ fontWeight: 700, color: 'var(--bp-navy)' }}>₹{previewData.summary.total_gst.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div style={{ padding: '12px 20px 16px', borderTop: '1px solid var(--bp-border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="bp-btn bp-btn-outline"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmitRequest}
                disabled={submitting}
                className="bp-btn bp-btn-primary"
              >
                {submitting ? 'Sending...' : 'Send Request to CA'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
