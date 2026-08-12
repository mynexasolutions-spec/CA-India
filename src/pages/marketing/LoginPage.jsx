import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import PasswordField from '../../components/PasswordField';
import Seo from '../../components/seo/Seo';

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState(() => (
    searchParams.get('timeout') === '1' ? 'Your session expired due to inactivity. Please sign in again.' : ''
  ));
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
        const user = await login(email, password);
        if (['super_admin', 'admin', 'staff'].includes(user.role)) navigate('/admin');
        else navigate('/portal');
      }
    } catch (err) {
      setError(err.message || 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  if (!loading && user) {
    const destination = ['super_admin', 'admin', 'staff'].includes(user.role) ? '/admin' : '/portal';
    return <Navigate to={destination} replace />;
  }

  return (
    <>
      <Seo
        title="Login | A B KHAN & ASSOCIATES"
        path="/login"
      />
      <section className="login-page">
        <div className="login-page__shell">
          <div className="login-page__hero">
            <div className="login-page__brand">
              <img src="/assets/ca-india-logo.png" alt="CA India - A B KHAN & ASSOCIATES logo" />
              <div>
                <strong>A B KHAN &amp; ASSOCIATES</strong>
                <span>Chartered Accountants</span>
              </div>
            </div>
            <p className="eyebrow">Secure Access</p>
            <h1>One login for client and admin access.</h1>
            <p>
              Sign in with your email and password. The portal detects your role automatically and sends you to the right dashboard.
            </p>
            <ul className="login-page__features">
              <li>Role-aware routing to the correct dashboard</li>
              <li>Encrypted, secure sign-in session</li>
              <li>Billing, invoices, reports &amp; compliance records</li>
            </ul>
          </div>
          <div className="login-page__card">
            <p className="eyebrow">Account Login</p>
            <h2>{mode === 'forgot' ? 'Reset Password' : 'Sign in'}</h2>
            <p className="login-page__copy">
              {mode === 'forgot'
                ? 'Enter your account email and we will send reset instructions.'
                : 'Client and admin accounts share this single sign-in form.'}
            </p>
            <form onSubmit={onSubmit} className="login-page__form">
              <label>
                Email
                <input
                  className="form-control"
                  type="email"
                  required
                  placeholder="you@example.com"
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
              {error && <p className="login-page__error" role="alert">{error}</p>}
              {info && <p className="login-page__info">{info}</p>}
              <button type="submit" className="btn btn-gold login-page__submit" disabled={busy}>
                {busy ? 'Please wait…' : mode === 'forgot' ? 'Send Reset Link' : 'Sign In'}
              </button>
            </form>
            <p className="login-page__links">
              <button type="button" onClick={() => setMode(mode === 'forgot' ? 'login' : 'forgot')}>
                {mode === 'forgot' ? 'Back to sign in' : 'Forgot password?'}
              </button>
              <Link to="/portal/reset-password">Have a reset token?</Link>
              <Link to="/">Website</Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
