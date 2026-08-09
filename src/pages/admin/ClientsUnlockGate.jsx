import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { api } from '../../api/client';
import PasswordField from '../../components/PasswordField';

export default function ClientsUnlockGate() {
  const [checking, setChecking] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const check = () => {
    setChecking(true);
    api('/admin/clients/unlock-status')
      .then((d) => setUnlocked(!!d.unlocked))
      .catch(() => setUnlocked(false))
      .finally(() => setChecking(false));
  };

  useEffect(() => { check(); }, []);

  const unlock = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await api('/admin/clients/unlock', { method: 'POST', body: { password } });
      setPassword('');
      setUnlocked(true);
    } catch (ex) {
      setErr(ex.message || 'Unlock failed');
    } finally {
      setBusy(false);
    }
  };

  if (checking) return <p>Verifying access…</p>;

  if (!unlocked) {
    return (
      <div className="bp-card" style={{ maxWidth: 420 }}>
        <h2 style={{ marginTop: 0 }}>Clients Access</h2>
        <p style={{ color: 'var(--bp-muted)', fontSize: 13 }}>
          Enter your administrator password to view and manage client records.
        </p>
        <form onSubmit={unlock} className="bp-form" style={{ display: 'grid', gap: 12 }}>
          <PasswordField
            label="Administrator Password"
            className="bp-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <button type="submit" className="bp-btn bp-btn-primary" disabled={busy}>
            {busy ? 'Verifying…' : 'Unlock Clients'}
          </button>
          {err && <p style={{ color: 'var(--bp-red)', margin: 0 }}>{err}</p>}
        </form>
      </div>
    );
  }

  return <Outlet />;
}
