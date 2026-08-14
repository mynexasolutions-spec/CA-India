import { useEffect, useState } from 'react';
import { api } from '../../api/client';

export default function ClientGstDashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/client/gst-returns')
      .then(setData)
      .catch(e => setErr(e.message));
  }, []);

  if (err) {
    return (
      <div className="bp-container">
        <div className="bp-card" style={{ padding: '30px', textAlign: 'center' }}>
          <h3 style={{ color: '#e74c3c' }}>Notice</h3>
          <p>{err}</p>
        </div>
      </div>
    );
  }

  if (!data) return <div className="bp-container">Loading...</div>;

  return (
    <div className="bp-container">
      <div className="bp-toolbar">
        <h2 style={{ margin: 0 }}>My GST Returns</h2>
      </div>

      <div className="bp-card" style={{ padding: '20px', marginBottom: '20px', backgroundColor: 'var(--bp-surface)' }}>
        <h3 style={{ margin: '0 0 10px 0', color: 'var(--bp-navy)' }}>GST Profile</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--bp-muted)' }}>Dealer Type</div>
            <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{data.dealer_type} Dealer</div>
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--bp-muted)' }}>Filing Frequency</div>
            <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{data.frequency}</div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <div style={{ fontSize: '13px', color: 'var(--bp-muted)' }}>Last Filed Return</div>
            <div style={{ color: 'var(--bp-green)', fontWeight: 600 }}>{data.last_filed || 'None on record'}</div>
          </div>
        </div>
      </div>

      <div className="bp-card" style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 20px 0', color: 'var(--bp-navy)' }}>Filing History</h3>
        
        <table className="bp-table">
          <thead>
            <tr>
              <th>Tax Period</th>
              <th>Status</th>
              <th>Filed On</th>
            </tr>
          </thead>
          <tbody>
            {data.returns.length === 0 ? (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: 'var(--bp-muted)' }}>
                  No returns have been marked as filed yet.
                </td>
              </tr>
            ) : (
              data.returns.map(ret => (
                <tr key={ret.id}>
                  <td><strong>{ret.tax_period}</strong></td>
                  <td>
                    {ret.status === 'filed' ? (
                      <span className="bp-badge bp-badge-success">Filed</span>
                    ) : (
                      <span className="bp-badge bp-badge-warning">Pending</span>
                    )}
                  </td>
                  <td>{ret.filed_on ? new Date(ret.filed_on).toLocaleString() : 'N/A'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
