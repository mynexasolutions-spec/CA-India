import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { buildFyOptions, currentFyLabel, fyMonthOptions, monthLabel } from '../billing/billingUtils';

function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function AdminClientGstr2b() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fy, setFy] = useState(currentFyLabel());
  const monthOptions = fyMonthOptions(fy);
  const [taxPeriod, setTaxPeriod] = useState(() => {
    const cur = currentMonthValue();
    return monthOptions.some((o) => o.value === cur) ? cur : (monthOptions[0]?.value || '');
  });
  const [file, setFile] = useState(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const replacePeriodRef = useRef(null);
  const replaceInputRef = useRef(null);

  const loadRecords = () => {
    setLoading(true);
    api(`/admin/clients/${id}/gstr2b`)
      .then((rows) => setRecords(rows || []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api(`/admin/clients/${id}`).then(setClient).catch((e) => setErr(e.message));
    loadRecords();
  }, [id]);

  const handleFyChange = (newFy) => {
    setFy(newFy);
    const opts = fyMonthOptions(newFy);
    setTaxPeriod(opts[0]?.value || '');
  };

  const doUpload = async (period, uploadFile) => {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('tax_period', period);
      fd.append('file', uploadFile);
      await api(`/admin/clients/${id}/gstr2b`, { method: 'POST', body: fd });
      setMsg(`Saved GSTR-2B for ${monthLabel(period)}`);
      setFile(null);
      loadRecords();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!file) {
      setErr('Choose a file to upload');
      return;
    }
    doUpload(taxPeriod, file);
  };

  const triggerReplace = (period) => {
    replacePeriodRef.current = period;
    replaceInputRef.current?.click();
  };

  const handleReplaceFileChange = (e) => {
    const picked = e.target.files?.[0];
    const period = replacePeriodRef.current;
    e.target.value = '';
    if (!picked || !period) return;
    doUpload(period, picked);
  };

  const handleDelete = async (record) => {
    if (!window.confirm(`Delete the GSTR-2B file for ${monthLabel(record.tax_period)}?`)) return;
    setErr('');
    setMsg('');
    try {
      await api(`/admin/clients/${id}/gstr2b/${record.id}`, { method: 'DELETE' });
      loadRecords();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div>
      <div className="bp-toolbar">
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>GSTR-2B</h2>
          <div style={{ fontSize: 12, color: 'var(--bp-muted)' }}>
            {client ? (
              <>{client.business_name || client.client_name} · {client.client_code}</>
            ) : 'Loading client…'}
          </div>
        </div>
        <Link className="bp-btn bp-btn-outline" to="/admin/gstr-2b">All Clients</Link>
      </div>

      <div className="bp-card" style={{ marginTop: 14 }}>
        <h3 style={{ marginTop: 0 }}>Upload GSTR-2B</h3>
        <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
          <label>
            Financial Year
            <select className="bp-select" value={fy} onChange={(e) => handleFyChange(e.target.value)}>
              {buildFyOptions().map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <label>
            Tax Period
            <select className="bp-select" value={taxPeriod} onChange={(e) => setTaxPeriod(e.target.value)}>
              {monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </label>
          <label>
            GSTR-2B File
            <input
              className="bp-file-input"
              type="file"
              accept=".pdf,.xls,.xlsx,.json,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <button type="submit" className="bp-btn bp-btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Upload & Save'}
          </button>
        </form>
        {msg && <p className="bp-alert bp-alert-success" style={{ marginTop: 12 }}>{msg}</p>}
        {err && <p className="bp-alert bp-alert-error" style={{ marginTop: 12 }}>{err}</p>}
      </div>

      <input
        ref={replaceInputRef}
        type="file"
        accept=".pdf,.xls,.xlsx,.json,.csv"
        style={{ display: 'none' }}
        onChange={handleReplaceFileChange}
      />

      <div className="bp-card" style={{ marginTop: 14, overflowX: 'auto' }}>
        <h3 style={{ marginTop: 0 }}>Uploaded Statements</h3>
        {loading ? <p>Loading…</p> : (
          <table className="bp-table">
            <thead>
              <tr>
                <th>Financial Year</th>
                <th>Tax Period</th>
                <th>File</th>
                <th>Uploaded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>{r.financial_year}</td>
                  <td>{monthLabel(r.tax_period)}</td>
                  <td>{r.file_name || '—'}</td>
                  <td>
                    {r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '—'}
                    {r.uploader?.name ? ` · ${r.uploader.name}` : ''}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <a href={`/storage/${r.file_path}`} target="_blank" rel="noreferrer">View</a>
                    {' · '}
                    <button
                      type="button"
                      className="bp-btn bp-btn-outline"
                      style={{ padding: '2px 8px', fontSize: 11 }}
                      disabled={busy}
                      onClick={() => triggerReplace(r.tax_period)}
                    >
                      Replace
                    </button>
                    {' '}
                    <button
                      type="button"
                      className="bp-btn bp-btn-danger"
                      style={{ padding: '2px 8px', fontSize: 11 }}
                      onClick={() => handleDelete(r)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!records.length && <tr><td colSpan={5}>No GSTR-2B statements uploaded yet</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
