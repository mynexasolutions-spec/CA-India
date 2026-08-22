import { useEffect, useState, useCallback } from 'react';
import { api } from '../../api/client';

// Generate last 12 months for selector
const getRecentMonths = () => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    months.push({ value: val, label });
  }
  return months;
};

// Generate last 4 quarters for selector
const getRecentQuarters = () => {
  const quarters = [];
  const now = new Date();
  let y = now.getFullYear();
  let q = Math.ceil((now.getMonth() + 1) / 3);

  for (let i = 0; i < 4; i++) {
    quarters.push({ value: `${y}-Q${q}`, label: `Q${q} ${y}` });
    q--;
    if (q === 0) {
      q = 4;
      y--;
    }
  }
  return quarters;
};

export default function AdminGstReturns() {
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState({ data: [], current_page: 1, last_page: 1 });
  
  const [month, setMonth] = useState(getRecentMonths()[0].value);
  const [quarter, setQuarter] = useState(getRecentQuarters()[0].value);
  
  // Table filters
  const [periodFilter, setPeriodFilter] = useState(month);
  const [freqFilter, setFreqFilter] = useState('monthly');
  const [returnType, setReturnType] = useState('GSTR3B');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api(`/admin/gst-returns/dashboard?month=${month}&quarter=${quarter}`);
      setStats(data);
    } catch (e) {
      console.error(e);
    }
  }, [month, quarter]);

  const fetchClients = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      let q = `/admin/gst-returns/clients?page=${page}&period=${periodFilter}&return_type=${returnType}`;
      if (freqFilter !== 'all') q += `&frequency=${freqFilter}`;
      if (search) q += `&q=${encodeURIComponent(search)}`;

      const res = await api(q);
      setClients(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [periodFilter, freqFilter, returnType, search]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const toggleStatus = async (clientId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'filed' ? 'pending' : 'filed';
      await api(`/admin/gst-returns/${clientId}`, {
        method: 'POST',
        body: {
          tax_period: periodFilter,
          return_type: returnType,
          status: newStatus
        }
      });
      // Refresh both to update counts
      fetchClients(clients.current_page);
      fetchStats();
    } catch (e) {
      alert(e.message);
    }
  };

  if (!stats) return <div className="bp-container">Loading...</div>;

  return (
    <div className="bp-container">
      <div className="bp-toolbar">
        <h2 style={{ margin: 0 }}>GST Returns Dashboard</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        
        {/* Monthly Card */}
        <div className="bp-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, color: 'var(--bp-navy)' }}>Monthly Returns</h3>
            <select className="bp-select" style={{ width: 'auto', padding: '2px 8px' }} value={month} onChange={e => setMonth(e.target.value)}>
              {getRecentMonths().map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 600 }}>{stats.monthly.total} <span style={{ fontSize: '14px', color: 'var(--bp-muted)', fontWeight: 400 }}>Clients</span></div>
          <div style={{ marginTop: '10px', display: 'flex', gap: '15px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--bp-muted)' }}>Filed</div>
              <div style={{ color: 'var(--bp-green)', fontWeight: 600 }}>{stats.monthly.filed}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--bp-muted)' }}>Pending</div>
              <div style={{ color: '#e74c3c', fontWeight: 600 }}>{stats.monthly.pending}</div>
            </div>
          </div>
          <button className="bp-btn bp-btn-outline" style={{ marginTop: '15px', width: '100%' }} onClick={() => { setFreqFilter('monthly'); setPeriodFilter(month); }}>
            View Monthly Clients
          </button>
        </div>

        {/* Quarterly Card */}
        <div className="bp-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, color: 'var(--bp-navy)' }}>Quarterly Returns</h3>
            <select className="bp-select" style={{ width: 'auto', padding: '2px 8px' }} value={quarter} onChange={e => setQuarter(e.target.value)}>
              {getRecentQuarters().map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
            </select>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 600 }}>{stats.quarterly.total} <span style={{ fontSize: '14px', color: 'var(--bp-muted)', fontWeight: 400 }}>Clients</span></div>
          <div style={{ marginTop: '10px', display: 'flex', gap: '15px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--bp-muted)' }}>Filed</div>
              <div style={{ color: 'var(--bp-green)', fontWeight: 600 }}>{stats.quarterly.filed}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--bp-muted)' }}>Pending</div>
              <div style={{ color: '#e74c3c', fontWeight: 600 }}>{stats.quarterly.pending}</div>
            </div>
          </div>
          <button className="bp-btn bp-btn-outline" style={{ marginTop: '15px', width: '100%' }} onClick={() => { setFreqFilter('quarterly'); setPeriodFilter(quarter); }}>
            View Quarterly Clients
          </button>
        </div>

        {/* Overall Card */}
        <div className="bp-card" style={{ padding: '20px', backgroundColor: 'var(--bp-surface)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: 'var(--bp-navy)' }}>Overall Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--bp-muted)' }}>Total GST Clients</div>
              <div style={{ fontWeight: 600 }}>{stats.overall.total}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--bp-muted)' }}>Regular / Comp.</div>
              <div style={{ fontWeight: 600 }}>{stats.overall.regular} / {stats.overall.composition}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--bp-muted)' }}>Total Filed (M+Q)</div>
              <div style={{ color: 'var(--bp-green)', fontWeight: 600 }}>{stats.overall.total_filed}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--bp-muted)' }}>Total Pending (M+Q)</div>
              <div style={{ color: '#e74c3c', fontWeight: 600 }}>{stats.overall.total_pending}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bp-card" style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 20px 0', color: 'var(--bp-navy)' }}>
          Client Return Status — {returnType === 'GSTR1' ? 'GSTR-1' : returnType === 'CMP08' ? 'CMP-08' : 'GSTR-3B'}
        </h3>
        
        <div className="bp-toolbar" style={{ backgroundColor: 'transparent', padding: 0, border: 'none', marginBottom: '15px' }}>
          <input
            type="text"
            className="bp-input"
            placeholder="Search client, business name, or GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '250px' }}
          />
          <select className="bp-select" value={freqFilter} onChange={(e) => setFreqFilter(e.target.value)}>
            <option value="all">All Frequencies</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
          <select className="bp-select" value={returnType} onChange={(e) => setReturnType(e.target.value)}>
            <option value="GSTR3B">GSTR-3B</option>
            <option value="GSTR1">GSTR-1</option>
            <option value="CMP08">CMP-08 (Composition)</option>
          </select>
          <select className="bp-select" value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}>
            <optgroup label="Months">
              {getRecentMonths().map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </optgroup>
            <optgroup label="Quarters">
              {getRecentQuarters().map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
            </optgroup>
          </select>
        </div>

        <table className="bp-table">
          <thead>
            <tr>
              <th>Client / Business Name</th>
              <th>GSTIN</th>
              <th>Frequency</th>
              <th>Selected Period</th>
              <th>Filing Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Loading clients...</td></tr>
            ) : clients.data.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'var(--bp-muted)' }}>No clients found for this criteria.</td></tr>
            ) : (
              clients.data.map(client => (
                <tr key={client.id}>
                  <td>
                    <strong>{client.business_name || client.client_name}</strong>
                    {client.business_name && client.client_name && <div style={{ fontSize: '12px', color: 'var(--bp-muted)' }}>{client.client_name}</div>}
                  </td>
                  <td>{client.gstin}</td>
                  <td style={{ textTransform: 'capitalize' }}>{client.frequency || 'Monthly'}</td>
                  <td>{periodFilter}</td>
                  <td>
                    {client.status === 'filed' ? (
                      <span className="bp-badge bp-badge-success">Filed</span>
                    ) : (
                      <span className="bp-badge bp-badge-warning">Pending</span>
                    )}
                  </td>
                  <td>
                    <button
                      className={`bp-btn ${client.status === 'filed' ? 'bp-btn-outline' : 'bp-btn-primary'}`}
                      style={{ padding: '4px 12px', fontSize: '13px' }}
                      onClick={() => toggleStatus(client.id, client.status)}
                    >
                      {client.status === 'filed' ? 'Mark Pending' : 'Mark Filed'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {clients.last_page > 1 && (
          <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
            <button className="bp-btn bp-btn-outline" disabled={clients.current_page === 1} onClick={() => fetchClients(clients.current_page - 1)}>Prev</button>
            <button className="bp-btn bp-btn-outline" disabled={clients.current_page === clients.last_page} onClick={() => fetchClients(clients.current_page + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
