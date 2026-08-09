import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import PasswordField from '../../components/PasswordField';
import Seo from '../../components/seo/Seo';

export default function LoginPage({ portal = 'client' }) {
  const isAdmin = portal === 'admin';
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState('login'); // login | forgot

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    try {
      if (mode === 'forgot') {
        const res = await api('/auth/forgot-password', { method: 'POST', body: { email } });
        setInfo(res.message || 'Check your email for reset instructions.');
      } else {
        await login(email, password, portal);
        if (isAdmin) navigate('/admin');
        else navigate('/portal');
      }
    } catch (err) {
      setError(err.message || 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Seo
        title={`${isAdmin ? 'Admin' : 'Client'} Login | A B KHAN & ASSOCIATES`}
        path={isAdmin ? '/admin/login' : '/portal/login'}
      />
      <section className="section" style={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
        <div className="feature-card" style={{ width: '100%', maxWidth: 420, padding: 32 }}>
          <p className="eyebrow">{isAdmin ? 'Admin Portal' : 'Client Portal'}</p>
          <h1 style={{ fontSize: 26, marginTop: 0 }}>
            {mode === 'forgot' ? 'Reset Password' : isAdmin ? 'Admin Login' : 'Client Login'}
          </h1>
          <p style={{ opacity: 0.8 }}>
            {mode === 'forgot'
              ? 'Enter your account email. We will send reset instructions.'
              : 'Sign in with your credentials to continue.'}
          </p>
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
            <label>
              Email
              <input
                className="form-control"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </label>
            {mode === 'login' && (
              <PasswordField
                label="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            )}
            {error && <p style={{ color: 'crimson', margin: 0 }}>{error}</p>}
            {info && <p style={{ color: 'green', margin: 0 }}>{info}</p>}
            <button type="submit" className={`btn ${isAdmin ? 'btn-navy' : 'btn-gold'}`} disabled={busy}>
              {busy ? 'Please wait…' : mode === 'forgot' ? 'Send Reset Link' : 'Sign In'}
            </button>
          </form>
          <p style={{ marginTop: 16, fontSize: 14 }}>
            <button type="button" style={{ color: 'inherit', textDecoration: 'underline' }} onClick={() => setMode(mode === 'forgot' ? 'login' : 'forgot')}>
              {mode === 'forgot' ? 'Back to sign in' : 'Forgot password?'}
            </button>
            {' · '}
            <Link to="/portal/reset-password">Have a reset token?</Link>
            {' · '}
            <Link to="/">Website</Link>
            {' · '}
            <Link to={isAdmin ? '/portal/login' : '/admin/login'}>{isAdmin ? 'Client Login' : 'Admin Login'}</Link>
          </p>
        </div>
      </section>
    </>
  );
}
