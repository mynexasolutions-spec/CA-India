import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import PasswordField from '../../components/PasswordField';

export default function AdminSettings() {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [confirmName, setConfirmName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [delMsg, setDelMsg] = useState('');
  const [delErr, setDelErr] = useState('');
  const [delBusy, setDelBusy] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdErr, setPwdErr] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);

  const loadClients = () => {
    api('/admin/billing/clients')
      .then((d) => setClients(d.data || []))
      .catch(console.error);
  };

  useEffect(() => { loadClients(); }, []);

  const selected = clients.find((c) => String(c.id) === String(clientId));
  const expectedName = selected ? (selected.business_name || selected.client_name || '') : '';

  const deleteCompany = async (e) => {
    e.preventDefault();
    setDelBusy(true);
    setDelMsg('');
    setDelErr('');
    try {
      const res = await api(`/admin/clients/${clientId}`, {
        method: 'DELETE',
        body: { password: adminPassword, confirm_name: confirmName },
      });
      setDelMsg(res.message || 'Company deleted.');
      setClientId('');
      setConfirmName('');
      setAdminPassword('');
      loadClients();
    } catch (ex) {
      setDelErr(ex.message || 'Delete failed');
    } finally {
      setDelBusy(false);
    }
  };

  const changeAdminPassword = async (e) => {
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

  return (
    <div>
      <div className="bp-toolbar" style={{ marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>Settings</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--bp-muted)' }}>
            Manage companies and your administrator password.
          </p>
        </div>
      </div>

      <div className="bp-card" style={{ marginBottom: 16, maxWidth: 640 }}>
        <h3 style={{ marginTop: 0 }}>Delete Company</h3>
        <p style={{ fontSize: 13, color: 'var(--bp-muted)' }}>
          Permanently removes a client company, login, invoices, parties, and related records. This cannot be undone.
        </p>
        <form onSubmit={deleteCompany} className="bp-form" style={{ display: 'grid', gap: 12 }}>
          <label>
            <span className="bp-field-title">Select Company</span>
            <select className="bp-input" value={clientId} onChange={(e) => { setClientId(e.target.value); setConfirmName(''); }} required>
              <option value="">Choose company…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.business_name || c.client_name} {c.client_code ? `(${c.client_code})` : ''}
                </option>
              ))}
            </select>
          </label>
          {selected && (
            <p style={{ margin: 0, fontSize: 13 }}>
              Type the company name exactly to confirm: <strong>{expectedName}</strong>
            </p>
          )}
          <label>
            <span className="bp-field-title">Confirm Company Name</span>
            <input className="bp-input" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} required disabled={!clientId} />
          </label>
          <PasswordField
            label="Your Administrator Password"
            className="bp-input"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <button type="submit" className="bp-btn bp-btn-danger" disabled={delBusy || !clientId}>
            {delBusy ? 'Deleting…' : 'Delete Company'}
          </button>
          {delMsg && <p style={{ color: 'var(--bp-green)', margin: 0 }}>{delMsg}</p>}
          {delErr && <p style={{ color: 'var(--bp-red)', margin: 0 }}>{delErr}</p>}
        </form>
      </div>

      <div className="bp-card" style={{ maxWidth: 640 }}>
        <h3 style={{ marginTop: 0 }}>Reset Administrator Password</h3>
        <p style={{ fontSize: 13, color: 'var(--bp-muted)' }}>
          Change the password for your Admin Portal login.
        </p>
        <form onSubmit={changeAdminPassword} className="bp-form" style={{ display: 'grid', gap: 12 }}>
          <PasswordField
            label="Current Password"
            className="bp-input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <PasswordField
            label="New Password"
            className="bp-input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm New Password"
            className="bp-input"
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
