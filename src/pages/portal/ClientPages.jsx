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
          Create and Manage Invoices, Filter Transactions by Date, and Access Summary Reports. .
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
