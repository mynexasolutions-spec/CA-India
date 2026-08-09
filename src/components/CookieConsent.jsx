import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const KEY = 'abkhan_cookie_consent';

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 9999,
        background: '#0f2d44',
        color: '#fff',
        padding: '16px 20px',
        borderRadius: 12,
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 8px 24px rgba(0,0,0,.25)',
        maxWidth: 960,
        margin: '0 auto',
      }}
    >
      <p style={{ margin: 0, flex: 1, fontSize: 14 }}>
        We use essential cookies to run this site securely. See our{' '}
        <Link to="/cookie-policy" style={{ color: '#f5c542' }}>
          Cookie Policy
        </Link>
        .
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          className="btn btn-outline"
          style={{ color: '#fff', borderColor: '#fff' }}
          onClick={() => {
            localStorage.setItem(KEY, 'essential');
            setShow(false);
          }}
        >
          Essential only
        </button>
        <button
          type="button"
          className="btn btn-gold"
          onClick={() => {
            localStorage.setItem(KEY, 'accepted');
            setShow(false);
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
