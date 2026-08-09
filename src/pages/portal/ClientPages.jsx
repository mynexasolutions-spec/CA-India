import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import PasswordField from '../../components/PasswordField';
import BillingOverviewStats from '../billing/BillingOverviewStats';
import { currentFyRange } from '../billing/billingUtils';

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

export function ClientDashboard() {
  const fy = currentFyRange();
  const [data, setData] = useState(null);
  const [billing, setBilling] = useState(null);
  const [from, setFrom] = useState(fy.from);
  const [to, setTo] = useState(fy.to);

  const loadBilling = () => {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    api(`/billing/dashboard?${qs}`).then(setBilling).catch(console.error);
  };

  useEffect(() => {
    api('/client/dashboard').then(setData).catch(console.error);
    loadBilling();
  }, []);

  if (!data || !billing) return <p>Loading dashboard…</p>;
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Welcome back</h1>
      <p style={{ marginBottom: 4 }}>{data.profile?.business_name}</p>
      <p style={{ color: 'var(--bp-muted)', fontSize: 13, marginTop: 0, marginBottom: 16 }}>
        Current Financial Year by Default — Automatically displays the current Financial Year
        (1 April – 31 March) and updates dashboard statistics for each new Financial Year.
      </p>
      <BillingOverviewStats
        data={billing}
        from={from}
        to={to}
        setFrom={setFrom}
        setTo={setTo}
        onApply={loadBilling}
      />
      <div style={{ ...card, marginTop: 20, maxWidth: 480 }}>
        <h3 style={{ marginTop: 0 }}>Billing workspace</h3>
        <p style={{ opacity: 0.75, marginBottom: 16 }}>
          Create invoices, filter by date, and open reports.
        </p>
        <Link to="/portal/billing" className="btn btn-gold">Open Billing</Link>
        {' '}
        <Link to="/portal/reports" className="btn btn-outline">Open Reports</Link>
      </div>
    </div>
  );
}

export function ClientProfile() {
  const [profile, setProfile] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdErr, setPwdErr] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);

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

  if (!profile) return <p>Loading…</p>;
  return (
    <div>
      <div style={{ ...card, maxWidth: 720, marginBottom: 16 }}>
        <h1 style={{ marginTop: 0 }}>Business Profile</h1>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          {FIELDS.map(([key, label]) => (
            <label key={key} style={{ gridColumn: key === 'address' ? '1 / -1' : undefined }}>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--bp-muted)', marginBottom: 4 }}>{label}</span>
              <input className="form-control" value={profile[key] || '—'} readOnly disabled />
            </label>
          ))}
        </div>
      </div>

      <div style={{ ...card, maxWidth: 720 }}>
        <h2 style={{ marginTop: 0 }}>Reset Client Password</h2>
        <p style={{ color: 'var(--bp-muted)', fontSize: 13, marginTop: 0 }}>
          Change the password for this Client Portal login.
        </p>
        <form onSubmit={changePassword} style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
          <PasswordField
            label="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <PasswordField
            label="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm New Password"
            value={newPasswordConfirm}
            onChange={(e) => setNewPasswordConfirm(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <button type="submit" className="bp-btn bp-btn-primary" disabled={pwdBusy}>
            {pwdBusy ? 'Updating…' : 'Update Password'}
          </button>
          {pwdMsg && <p style={{ color: 'var(--bp-green)', margin: 0 }}>{pwdMsg}</p>}
          {pwdErr && <p style={{ color: 'var(--bp-red)', margin: 0 }}>{pwdErr}</p>}
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
