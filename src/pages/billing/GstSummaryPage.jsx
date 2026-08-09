import { useEffect, useState } from 'react';
import { api, getAuthToken } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import BillingDateFilters from './BillingDateFilters';
import { currentFyRange } from './billingUtils';
import GstSummaryMatrix, { resolveGstMatrix } from './GstSummaryMatrix';

export default function GstSummaryPage({
  title = 'GST Summary',
  apiPath = '/billing/reports',
  exportPath = '/api/billing/reports/export',
}) {
  const { user } = useAuth();
  const profile = user?.client_profile;
  const fyDefault = currentFyRange();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState('');
  const [fy, setFy] = useState(fyDefault.fy);
  const [from, setFrom] = useState(fyDefault.from);
  const [to, setTo] = useState(fyDefault.to);
  const [err, setErr] = useState('');

  const run = () => {
    if (!from || !to) {
      setErr('Please select both From date and To date.');
      return;
    }
    if (from > to) {
      setErr('From date cannot be after To date.');
      return;
    }
    setErr('');
    setLoading(true);
    const qs = new URLSearchParams({ type: 'gst_summary', from, to });
    api(`${apiPath}?${qs}`)
      .then(setData)
      .catch((e) => setErr(e.message || 'Failed to load GST summary'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { run(); }, []);

  const download = async (format) => {
    if (!from || !to) {
      setErr('Please select From and To dates before export.');
      return;
    }
    const token = getAuthToken();
    const qs = new URLSearchParams({ type: 'gst_summary', from, to, format });
    const res = await fetch(`${exportPath}?${qs}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
    });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gst_summary_${from}_to_${to}.${format === 'xlsx' ? 'xls' : format}`;
    a.click();
  };

  const matrix = resolveGstMatrix(data, profile);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <p style={{ color: 'var(--bp-muted)', fontSize: 13, marginTop: 0 }}>
        Filter GST totals by period using From date and To date. Columns stay the same for all GST dealer types.
      </p>

      <div className="bp-card">
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
          onApply={run}
          onClear={() => {
            const next = currentFyRange();
            setFrom(next.from);
            setTo(next.to);
            setMonth('');
            setFy(next.fy);
            setTimeout(run, 0);
          }}
        />

        <div className="bp-toolbar" style={{ marginTop: 10 }}>
          <button type="button" className="bp-btn bp-btn-green" onClick={() => download('xlsx')}>Export Excel</button>
          <button type="button" className="bp-btn bp-btn-danger" onClick={() => download('pdf')}>Export PDF</button>
        </div>
      </div>

      {err && <p style={{ color: 'var(--bp-red)' }}>{err}</p>}

      <div className="bp-card" style={{ marginTop: 14 }}>
        {loading ? <p>Loading…</p> : (
          <>
            <div style={{ fontSize: 13, color: 'var(--bp-muted)', marginBottom: 10 }}>
              Period: <strong>{from || '—'}</strong> to <strong>{to || '—'}</strong>
            </div>
            <GstSummaryMatrix matrix={matrix} profile={profile} />
          </>
        )}
      </div>
    </div>
  );
}
