import { useState, useEffect } from 'react';
import { Navigate, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import BillingSubNav from '../../pages/billing/BillingSubNav';
import ReportsSubNav from '../../pages/billing/ReportsSubNav';

let portalStylesLoaded = false;
function usePortalStyles() {
  useEffect(() => {
    if (portalStylesLoaded) return;
    portalStylesLoaded = true;
    import('../../pages/billing/billing.css');
    import('../../pages/billing/admin-overview.css');
  }, []);
}

const ADMIN_BILLING_NAV = [
  { to: '/admin/firm-billing', label: 'Dashboard', end: true },
  { to: '/admin/firm-billing/invoices', label: 'Tax Invoice' },
  { to: '/admin/firm-billing/debit-notes', label: 'Debit Notes' },
  { to: '/admin/firm-billing/credit-notes', label: 'Credit Notes' },
  { to: '/admin/firm-billing/reports', label: 'Reports' },
  { to: '/admin/firm-billing/gst-summary', label: 'GST Summary' },
  { to: '/admin/firm-billing/hsn-summary', label: 'HSN Summary' },
];

export function RequireAuth({ roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="section container">Loading…</div>;
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (roles && !roles.includes(user.role)) {
    if (['super_admin', 'admin', 'staff'].includes(user.role)) return <Navigate to="/admin" replace />;
    return <Navigate to="/portal" replace />;
  }
  return <Outlet />;
}

function PortalFrame({ brand, subtitle, title, userLabel, nav, loginPath, extraTopRight, footLinks = [] }) {
  usePortalStyles();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <div className="bp-shell">
      {open && <div className="bp-backdrop" role="presentation" onClick={() => setOpen(false)} />}
      <aside className={`bp-sidebar ${open ? 'open' : ''}`}>
        <div className="bp-brand">
          <Link to="/" className="bp-brand-link" title="A B Khan & Associates">
            <img src="/assets/ca-india-logo.png" alt="A B Khan & Associates" className="bp-brand-logo" />
            <span className="bp-brand-text">
              <strong className="bp-brand-name">A B KHAN & ASSOCIATES</strong>
              <span className="bp-brand-tagline">Chartered Accountants</span>
            </span>
          </Link>
          {brand ? <div className="bp-brand-portal">{brand}</div> : null}
          {subtitle ? <div className="bp-brand-sub">{subtitle}</div> : null}
        </div>
        <nav className="bp-nav" onClick={() => setOpen(false)}>
          {nav.map((item) => {
            const active = item.isActive
              ? item.isActive(null, location)
              : item.end
                ? location.pathname === item.to
                : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            return (
              <Link key={item.to} to={item.to} className={active ? 'active' : undefined}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        {footLinks.length > 0 && (
          <div className="bp-sidebar-foot">
            {footLinks.map((link) => (
              <Link key={link.to} to={link.to} className="bp-btn bp-btn-outline bp-back-site">{link.label}</Link>
            ))}
          </div>
        )}
      </aside>
      <div className="bp-main">
        <header className="bp-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" className="bp-mobile-toggle" onClick={() => setOpen((v) => !v)} aria-label="Open menu">☰</button>
            <div>
              <h1>{title}</h1>
              <div style={{ fontSize: 12, color: 'var(--bp-muted)' }}>{userLabel}</div>
            </div>
          </div>
          <div className="bp-topbar-right">
            {extraTopRight}
            <button type="button" className="bp-btn bp-btn-outline bp-logout-btn" onClick={async () => { await logout(); navigate(loginPath); }}>
              Logout
            </button>
          </div>
        </header>
        <div className="bp-content"><Outlet /></div>
      </div>
    </div>
  );
}

export function ClientPortalLayout() {
  const { user } = useAuth();

  const nav = [
    { to: '/portal', label: 'Dashboard', end: true },
    { to: '/portal/profile', label: 'Profile' },
    { to: '/portal/billing/parties', label: 'Manage Billing Parties' },
    {
      to: '/portal/billing',
      label: 'Billing',
      isActive: (_, { pathname }) =>
        pathname.startsWith('/portal/billing') && !pathname.startsWith('/portal/billing/parties'),
    },
    { to: '/portal/edit-requests', label: 'Edit Request' },
    { to: '/portal/amendments', label: 'Amendments' },
    { to: '/portal/reports', label: 'Reports' },
    { to: '/portal/settings', label: 'Settings' },
  ];

  return (
    <PortalFrame
      title="Client Portal"
      userLabel={user?.client_profile?.business_name || user?.name}
      loginPath="/login"
      nav={nav}
    />
  );
}

export function ClientBillingLayout() {
  return (
    <div className="bp-section-wrap">
      <div className="bp-section-head">
        <div>
          <div className="bp-section-kicker">Billing Section</div>
          <p className="bp-section-desc">Tax invoices, bill of supply, debit notes, and credit notes.</p>
        </div>
      </div>
      <BillingSubNav />
      <Outlet />
    </div>
  );
}

export function ClientReportsLayout() {
  return (
    <div className="bp-section-wrap">
      <div className="bp-section-head">
        <div>
          <div className="bp-section-kicker">Reports Section</div>
          <p className="bp-section-desc">Data extraction, filtering, and ledger summary matrices.</p>
        </div>
      </div>
      <ReportsSubNav />
      <Outlet />
    </div>
  );
}

export function AdminPortalLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isOverview = location.pathname === '/admin' || location.pathname === '/admin/';

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/admin');
  };

  return (
    <PortalFrame
      brand=""
      title="Admin Portal"
      userLabel={`${user?.name || ''} · ${user?.role || ''}`}
      loginPath="/login"
      nav={[
        { to: '/admin', label: 'Overview', end: true },
        { to: '/admin/clients', label: 'Clients' },
        { to: '/admin/billing', label: 'Billing' },
        { to: '/admin/edit-requests', label: 'Edit Requests' },
        { to: '/admin/pending-approval', label: 'Pending Approval' },
        { to: '/admin/settings', label: 'Settings' },
      ]}
      extraTopRight={
        isOverview ? null : (
          <button type="button" className="bp-back-arrow" onClick={goBack} aria-label="Go back" title="Back">
            ←
          </button>
        )
      }
    />
  );
}

export function AdminBillingLayout() {
  const { user } = useAuth();
  return (
    <PortalFrame
      brand="BILLING SECTION"
      title="Billing"
      userLabel={`${user?.name || ''} · ${user?.role || ''}`}
      loginPath="/login"
      nav={ADMIN_BILLING_NAV}
      footLinks={[{ to: '/admin', label: '← Back to Admin' }]}
    />
  );
}
