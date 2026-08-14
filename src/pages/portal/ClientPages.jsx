import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import PasswordField from '../../components/PasswordField';
import BillingOverviewStats from '../billing/BillingOverviewStats';
import { billingMode } from '../billing/billingProfile';
import { currentFyRange, money } from '../billing/billingUtils';

const card = {
  background: '#fff',
  borderRadius: 12,
  padding: 20,
  boxShadow: '0 1px 3px rgba(0,0,0,.08)',
};

const FIELDS = [
  ['business_name', 'Legal Entity / Company Name'],
  ['client_name', 'Authorized Proprietor / Legal Name'],
  ['gstin', 'GSTN'],
  ['pan', 'PAN'],
  ['address', 'Registered Corporate Address'],
  ['city', 'City'],
  ['pincode', 'Pincode'],
  ['state_code', 'State Code'],
  ['phone', 'Contact No.'],
  ['email', 'Corporate Email'],
];

function GstDashboardCards({ summary, from, to }) {
  const mainCards = [
    ['Output GST', money(summary.output_gst), 'rgba(37, 99, 235, 0.1)', '#2563eb', 'var(--bp-navy)'],
    ['Eligible ITC', money(summary.eligible_itc), 'rgba(15, 118, 110, 0.1)', '#0f766e', 'var(--bp-navy)'],
    ['GST Payable', money(summary.gst_payable), 'rgba(190, 18, 60, 0.1)', '#be123c', '#be123c'],
    ['Excess ITC Available', money(summary.excess_itc), 'rgba(21, 128, 61, 0.1)', '#15803d', '#15803d'],
  ];

  const subCards = [
    ['Total GSTR-2B Invoices', summary.total_gstr2b_invoices ?? 0, '#f8fafc', '#475569', 'var(--bp-navy)'],
    ['Matched Invoices', summary.matched_invoices ?? 0, '#f0fdf4', '#15803d', 'var(--bp-navy)'],
    ['Unmatched Invoices', summary.unmatched_invoices ?? 0, '#fff7ed', '#c2410c', 'var(--bp-navy)'],
  ];

  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--bp-navy)', display: 'flex', alignItems: 'center', gap: 8 }}>
            GST Position
            <span style={{ fontSize: 10, background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Live Data</span>
          </h2>
          <div style={{ color: 'var(--bp-muted)', fontSize: 12, marginTop: 4, fontWeight: 500 }}>
            Period: <strong style={{ color: 'var(--bp-text)' }}>{from}</strong> to <strong style={{ color: 'var(--bp-text)' }}>{to}</strong>
            <span style={{ margin: '0 8px', opacity: 0.5 }}>|</span>
            Refreshes every 15s
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16, marginBottom: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {mainCards.map(([label, value, bg, accent, textCol]) => (
          <div key={label} style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: accent }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--bp-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: textCol, lineHeight: 1 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {subCards.map(([label, value, bg, accent, textCol]) => (
          <div key={label} style={{ background: bg, borderRadius: 12, padding: '16px 20px', border: `1px solid ${bg === '#fff' ? 'rgba(0,0,0,0.05)' : 'transparent'}` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: accent, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: textCol, lineHeight: 1 }}>{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ClientDashboard() {
  const fy = currentFyRange();
  const [data, setData] = useState(null);
  const [billing, setBilling] = useState(null);
  const [from, setFrom] = useState(fy.from);
  const [to, setTo] = useState(fy.to);
  const periodRef = useRef({ from: fy.from, to: fy.to });

  useEffect(() => {
    periodRef.current = { from, to };
  }, [from, to]);

  const loadBilling = useCallback(() => {
    const period = periodRef.current;
    const qs = new URLSearchParams();
    if (period.from) qs.set('from', period.from);
    if (period.to) qs.set('to', period.to);
    api(`/billing/dashboard?${qs}`).then(setBilling).catch(console.error);
  }, []);

  const applyBillingPeriod = useCallback(() => {
    periodRef.current = { from, to };
    loadBilling();
  }, [from, loadBilling, to]);

  useEffect(() => {
    api('/client/dashboard').then(setData).catch(console.error);
    loadBilling();

    const refreshInterval = window.setInterval(loadBilling, 15000);
    window.addEventListener('focus', loadBilling);

    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', loadBilling);
    };
  }, [loadBilling]);

  if (!data || !billing) return <p>Loading dashboard…</p>;
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ background: 'linear-gradient(135deg, var(--bp-navy) 0%, #1a365d 100%)', borderRadius: 16, padding: '24px 32px', color: '#fff', marginBottom: 24, boxShadow: '0 8px 24px rgba(13, 31, 60, 0.12)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-5%', width: 250, height: 250, background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }} />
        <h1 style={{ marginTop: 0, fontSize: 24, color: '#fff', fontWeight: 800, marginBottom: 4, position: 'relative', zIndex: 1 }}>Welcome back</h1>
        <p style={{ fontSize: 18, fontWeight: 600, color: '#90cdf4', marginBottom: 12, position: 'relative', zIndex: 1 }}>{data.profile?.business_name}</p>
        <p style={{ color: '#cbd5e1', fontSize: 13, marginTop: 0, maxWidth: 650, lineHeight: 1.5, position: 'relative', zIndex: 1, margin: 0 }}>
          Your dashboard automatically displays the current Financial Year (1 April – 31 March). Stay on top of your GST position, track matched invoices, and manage your billing efficiently.
        </p>
      </div>

      {billingMode(data.profile) === 'regular' && billing.gst_dashboard && (
        <GstDashboardCards summary={billing.gst_dashboard} from={from} to={to} />
      )}
      
      <div style={{ marginBottom: 32 }}>
         <BillingOverviewStats
           data={billing}
           from={from}
           to={to}
           setFrom={setFrom}
           setTo={setTo}
           onApply={applyBillingPeriod}
         />
      </div>

      <div style={{ background: '#fff', borderRadius: 16, padding: '24px 32px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.05)', maxWidth: 500 }}>
        <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: 700, color: 'var(--bp-navy)', marginBottom: 8 }}>Billing Workspace</h3>
        <p style={{ color: 'var(--bp-muted)', fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
          Create and manage tax invoices, bills of supply, and track payments. Generate detailed reports for your records.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/portal/billing" className="bp-btn bp-btn-primary" style={{ padding: '10px 20px', borderRadius: 8 }}>Open Billing</Link>
          <Link to="/portal/reports" className="bp-btn bp-btn-outline" style={{ padding: '10px 20px', borderRadius: 8 }}>View Reports</Link>
        </div>
      </div>
    </div>
  );
}

export function ClientProfile() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    api('/client/profile').then((d) => {
      const u = d.user;
      const p = u.client_profile || {};
      setProfile({
        business_name: p.business_name || '',
        client_name: p.client_name || u.name || '',
        gstin: p.gstin || '—',
        pan: p.pan || '—',
        address: p.address || '',
        city: p.city || '',
        pincode: p.pincode || '',
        state_code: p.state_code || '',
        phone: u.phone || p.mobile || '—',
        email: p.email || u.email || '—',
      });
    });
  }, []);

  if (!profile) return <p>Loading…</p>;
  return (
    <div>
      <div style={{ ...card, maxWidth: 760 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            flexWrap: 'wrap',
            paddingBottom: 16,
            marginBottom: 20,
            borderBottom: '1px solid var(--bp-border)',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 22 }}>Business Profile</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--bp-muted)' }}>
              Registered business and contact details on file with us.
            </p>
          </div>
          <Link to="/portal/profile/reset-password" className="bp-btn bp-btn-primary">
            Change Password 
          </Link>
        </div>
        <div
          style={{
            display: 'grid',
            gap: '16px 20px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}
        >
          {FIELDS.map(([key, label]) => (
            <label key={key} style={{ gridColumn: key === 'address' ? '1 / -1' : undefined }}>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--bp-muted)', marginBottom: 4 }}>{label}</span>
              <input
                className="form-control"
                value={profile[key] || '—'}
                readOnly
                disabled
                style={{ background: 'var(--bp-sky)', color: 'var(--bp-text)', cursor: 'default' }}
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ClientResetPassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdErr, setPwdErr] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);

  const changePassword = async (e) => {
    e.preventDefault();
    setPwdBusy(true);
    setPwdMsg('');
    setPwdErr('');
    try {
      const res = await api('/auth/change-password', {
        method: 'POST',
        body: {
          current_password: currentPassword,
          password: newPassword,
          password_confirmation: newPasswordConfirm,
        },
      });
      setPwdMsg(res.message || 'Password updated.');
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
    } catch (ex) {
      setPwdErr(ex.message || 'Password update failed');
    } finally {
      setPwdBusy(false);
    }
  };

  const canSubmit = currentPassword && newPassword.length >= 8 && newPasswordConfirm.length >= 8;

  return (
    <div>
      <Link
        to="/portal/profile"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--bp-navy)', textDecoration: 'none', marginBottom: 12, fontWeight: 600 }}
      >
        ← Back to Profile
      </Link>
      <div style={{ ...card, maxWidth: 420 }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>Reset Client Password</h1>
        <p style={{ color: 'var(--bp-muted)', fontSize: 13, marginTop: 6, marginBottom: 20 }}>
          Change the password used to sign in to this Client Portal account.
        </p>
        <form onSubmit={changePassword} style={{ display: 'grid', gap: 14, maxWidth: 240 }}>
          <PasswordField
            label="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <div>
            <PasswordField
              label="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <span style={{ display: 'block', fontSize: 11, color: 'var(--bp-muted)', marginTop: 4 }}>
              Minimum 8 characters.
            </span>
          </div>
          <PasswordField
            label="Confirm New Password"
            value={newPasswordConfirm}
            onChange={(e) => setNewPasswordConfirm(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />

          {pwdMsg && <p className="bp-alert bp-alert-success">{pwdMsg}</p>}
          {pwdErr && <p className="bp-alert bp-alert-error">{pwdErr}</p>}

          <button
            type="submit"
            className="bp-btn bp-btn-primary"
            disabled={pwdBusy || !canSubmit}
            style={{ width: '100%', marginTop: 4 }}
          >
            {pwdBusy ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function ClientDocuments() {
  return null;
}

export function ClientCompliance() {
  return null;
}
