import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthContext';
import './../billing.css';

const NAV = [
  { to: '/portal/billing', label: 'Dashboard', end: true },
  { to: '/portal/billing/parties', label: 'Parties' },
  { to: '/portal/billing/quotations', label: 'Quotations' },
  { to: '/portal/billing/invoices', label: 'Tax Invoice' },
  { to: '/portal/billing/debit-notes', label: 'Debit Notes' },
  { to: '/portal/billing/credit-notes', label: 'Credit Notes' },
  { to: '/portal/settings', label: 'Settings' },
];

export default function BillingLayout({ title = 'Client Billing Portal' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="bp-shell">
      <aside className={`bp-sidebar ${open ? 'open' : ''}`}>
        <div className="bp-brand">
          <strong>CLIENT BILLING</strong>
          <span>GST Compliant · Smart Invoicing</span>
        </div>
        <nav className="bp-nav" onClick={() => setOpen(false)}>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              {item.label}
            </NavLink>
          ))}
          <Link to="/portal">Back to Portal</Link>
        </nav>
        <button
          type="button"
          className="bp-btn bp-btn-outline"
          style={{ margin: 12 }}
          onClick={async () => {
            await logout();
            navigate('/portal/login');
          }}
        >
          Logout
        </button>
      </aside>
      <div className="bp-main">
        <header className="bp-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" className="bp-mobile-toggle" style={{ color: 'var(--bp-navy)' }} onClick={() => setOpen((v) => !v)}>
              ☰
            </button>
            <div>
              <h1>{title}</h1>
              <div style={{ fontSize: 12, color: 'var(--bp-muted)' }}>{user?.client_profile?.business_name || user?.name}</div>
            </div>
          </div>
        </header>
        <div className="bp-content">
          <Outlet />
        </div>
      </div>
      {open && (
        <div
          role="presentation"
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 30 }}
        />
      )}
    </div>
  );
}
