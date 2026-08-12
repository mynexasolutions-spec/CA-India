import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import PasswordField from '../../components/PasswordField';
import Seo from '../../components/seo/Seo';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get('email') || '');
  const [token, setToken] = useState(params.get('token') || '');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  return (
    <>
      <Seo title="Reset Password | A B KHAN & ASSOCIATES" path="/portal/reset-password" />
      <section className="section" style={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
        <div className="feature-card" style={{ width: '100%', maxWidth: 440, padding: 32 }}>
          <h1 style={{ fontSize: 24, marginTop: 0 }}>Reset Password</h1>
          <form
            style={{ display: 'grid', gap: 12 }}
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              try {
                const res = await api('/auth/reset-password', {
                  method: 'POST',
                  body: {
                    email,
                    token,
                    password,
                    password_confirmation: passwordConfirmation,
                  },
                });
                setMsg(res.message || 'Password updated');
              } catch (err) {
                setError(err.message);
              }
            }}
          >
            <label>Email<input className="form-control" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label>Reset token<input className="form-control" required value={token} onChange={(e) => setToken(e.target.value)} /></label>
            <PasswordField
              label="New password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <PasswordField
              label="Confirm password"
              required
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              autoComplete="new-password"
            />
            {error && <p style={{ color: 'crimson' }}>{error}</p>}
            {msg && <p style={{ color: 'green' }}>{msg}</p>}
            <button type="submit" className="btn btn-navy">Update Password</button>
          </form>
          <p style={{ marginTop: 12 }}><Link to="/login">Back to login</Link></p>
        </div>
      </section>
    </>
  );
}
