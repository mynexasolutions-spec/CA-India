import { useCallback, useEffect, useState } from 'react';
import { api, getAuthToken } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { billingMode } from './billingProfile';
import { buildFyOptions, currentFyLabel, fyMonthOptions, money } from './billingUtils';

const QUARTERS = [
  { value: 'Q1', label: 'Q1 · April–June' },
  { value: 'Q2', label: 'Q2 · July–September' },
  { value: 'Q3', label: 'Q3 · October–December' },
  { value: 'Q4', label: 'Q4 · January–March' },
];

function currentQuarter() {
  const month = new Date().getMonth() + 1;
  if (month >= 4 && month <= 6) return 'Q1';
  if (month >= 7 && month <= 9) return 'Q2';
  if (month >= 10) return 'Q3';
  return 'Q4';
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function GstLiabilityReport() {
  const { user } = useAuth();
  const profile = user?.client_profile;
  const [periodType, setPeriodType] = useState('month');
  const [financialYear, setFinancialYear] = useState(currentFyLabel());
  const [month, setMonth] = useState(currentMonth());
  const [quarter, setQuarter] = useState(currentQuarter());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const monthOptions = fyMonthOptions(financialYear);

  const buildQuery = useCallback((format) => {
    const params = new URLSearchParams({
      type: 'gst_liability',
      period_type: periodType,
      financial_year: financialYear,
    });
    if (periodType === 'month') params.set('month', month);
    if (periodType === 'quarter') params.set('quarter', quarter);
    if (format) params.set('format', format);
    return params;
  }, [financialYear, month, periodType, quarter]);

  const run = useCallback(() => {
    setErr('');
    setLoading(true);
    return api(`/billing/reports?${buildQuery()}`)
      .then(setReport)
      .catch((e) => setErr(e.message || 'Failed to load GST liability report.'))
      .finally(() => setLoading(false));
  }, [buildQuery]);

  useEffect(() => {
    if (billingMode(profile) === 'regular') run();
  }, [profile, run]);

  const changeFinancialYear = (nextFinancialYear) => {
    setFinancialYear(nextFinancialYear);
    const options = fyMonthOptions(nextFinancialYear);
    setMonth(options[0]?.value || '');
  };

  const download = async (format) => {
    setErr('');
    try {
      const response = await fetch(`/api/billing/reports/export?${buildQuery(format)}`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          Accept: '*/*',
        },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || 'Failed to export GST liability report.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `gst_liability_${financialYear}.${format === 'xlsx' ? 'xls' : format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e.message || 'Failed to export GST liability report.');
    }
  };

  if (billingMode(profile) !== 'regular') {
    return (
      <div className="bp-card">
        <h2 style={{ marginTop: 0 }}>GST Liability Report</h2>
        <p style={{ marginBottom: 0 }}>
          This report is available only for regular GST dealers.
        </p>
      </div>
    );
  }

  const data = report?.data || {};
  const isPayable = data.result === 'gst_payable';
  const isExcess = data.result === 'excess_itc';
  const resultAmount = isPayable ? data.gst_payable : (isExcess ? data.itc_carry_forward : 0);
  const resultColors = isPayable
    ? { background: '#fff1f2', border: '#fecdd3', color: '#9f1239' }
    : isExcess
      ? { background: '#ecfdf5', border: '#a7f3d0', color: '#065f46' }
      : { background: '#eff6ff', border: '#bfdbfe', color: '#1e3a8a' };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>GST Liability Report</h2>
      <p style={{ color: 'var(--bp-muted)', fontSize: 13, marginTop: 0 }}>
        Net GST Liability = Output GST − eligible ITC from matched GSTR-2B invoices.
      </p>

      <div className="bp-card no-print">
        <div className="bp-filters">
          <label className="bp-filter-field">
            <span className="bp-filter-title">Report Period</span>
            <select className="bp-filter-item bp-filter-control" value={periodType} onChange={(e) => setPeriodType(e.target.value)}>
              <option value="month">Month-wise</option>
              <option value="quarter">Quarter-wise</option>
              <option value="financial_year">Financial Year-wise</option>
            </select>
          </label>

          <label className="bp-filter-field">
            <span className="bp-filter-title">Financial Year</span>
            <select className="bp-filter-item bp-filter-control" value={financialYear} onChange={(e) => changeFinancialYear(e.target.value)}>
              {buildFyOptions().map((fy) => <option key={fy} value={fy}>FY {fy}</option>)}
            </select>
          </label>

          {periodType === 'month' && (
            <label className="bp-filter-field">
              <span className="bp-filter-title">Month</span>
              <select className="bp-filter-item bp-filter-control" value={month} onChange={(e) => setMonth(e.target.value)}>
                {monthOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          )}

          {periodType === 'quarter' && (
            <label className="bp-filter-field">
              <span className="bp-filter-title">Quarter</span>
              <select className="bp-filter-item bp-filter-control" value={quarter} onChange={(e) => setQuarter(e.target.value)}>
                {QUARTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          )}

          <button type="button" className="bp-filter-item bp-filter-btn bp-filter-btn-primary" onClick={run}>Generate Report</button>
        </div>

        <div className="bp-toolbar" style={{ marginTop: 12 }}>
          <button type="button" className="bp-btn bp-btn-green" onClick={() => download('xlsx')}>Export Excel</button>
          <button type="button" className="bp-btn bp-btn-danger" onClick={() => download('pdf')}>Export PDF</button>
          <button type="button" className="bp-btn bp-btn-outline" onClick={() => window.print()}>Print</button>
        </div>
      </div>

      {err && <p className="bp-alert bp-alert-error" style={{ marginTop: 12 }}>{err}</p>}

      {loading ? <div className="bp-card" style={{ marginTop: 14 }}><p>Loading…</p></div> : (
        <>
          <div style={{ marginTop: 14, color: 'var(--bp-muted)', fontSize: 13 }}>
            Period: <strong>{report?.period_label || '—'}</strong>
          </div>

          <div className="bp-grid-4" style={{ marginTop: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            {[
              ['Total Output GST', money(data.total_output_gst)],
              ['Total Eligible ITC', money(data.total_eligible_itc)],
              ['Net GST Liability', money(Math.abs(Number(data.net_gst_liability || 0)))],
            ].map(([label, value]) => (
              <div key={label} className="bp-card bp-kpi">
                <div className="label">{label}</div>
                <div className="value">{value}</div>
              </div>
            ))}
          </div>

          <div
            className="bp-card"
            style={{
              marginTop: 14,
              background: resultColors.background,
              borderColor: resultColors.border,
              color: resultColors.color,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700 }}>{data.result_label || 'No GST Payable'}</div>
            <div style={{ fontSize: 30, fontWeight: 800, marginTop: 5 }}>{money(resultAmount)}</div>
          </div>
        </>
      )}
    </div>
  );
}
