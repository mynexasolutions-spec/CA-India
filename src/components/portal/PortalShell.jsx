import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import BillingSubNav from '../../pages/billing/BillingSubNav';
import ReportsSubNav from '../../pages/billing/ReportsSubNav';
import { billingMode } from '../../pages/billing/billingProfile';
import { buildFyOptions, currentFyLabel, currentFyRange, fyDateRange } from '../../pages/billing/billingUtils';

/** Financial Year + Refresh Data are global controls, shared by every Client Portal page via
 * this context (provided by ClientPortalLayout, rendered in the shared topbar) — not owned by
 * any single page. A page that has its own data to refresh calls registerRefresh(fn) in a
 * useEffect; pages that don't just leave the button to fall back to a full reload. */
const ClientPortalCtx = createContext(null);

export function useClientPortal() {
  return useContext(ClientPortalCtx);
}

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

/** A nav item is either a flat link {to, label, end?, isActive?} or a group {label, children:[...]}. */
function isItemActive(item, location) {
  if (item.isActive) return item.isActive(null, location);
  if (item.end) return location.pathname === item.to;
  return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
}

function NavGroup({ item, location, closeSidebar }) {
  const hasActiveChild = item.children.some((c) => isItemActive(c, location));
  const [open, setOpen] = useState(hasActiveChild);

  useEffect(() => {
    if (hasActiveChild) setOpen(true);
  }, [hasActiveChild]);

  return (
    <div className={`bp-nav-group${open ? ' open' : ''}`}>
      <button
        type="button"
        className={`bp-nav-group-header${hasActiveChild ? ' has-active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{item.label}</span>
        <span className="bp-nav-chevron">▸</span>
      </button>
      <div className="bp-nav-children">
        {item.children.map((child) => (
          <Link
            key={child.to}
            to={child.to}
            className={isItemActive(child, location) ? 'active' : undefined}
            onClick={closeSidebar}
          >
            {child.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function useOutsideClose(onClose) {
  const ref = useRef(null);
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);
  return ref;
}

function timeAgo(iso) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

/** Bell icon with unread badge; polls the client dashboard notifications feed. */
export function ClientNotificationBell() {
  const [open, setOpen] = useState(false);
  const [notices, setNotices] = useState(null);
  const [unread, setUnread] = useState(0);
  const ref = useOutsideClose(() => setOpen(false));

  const load = () => {
    api('/client/dashboard')
      .then((d) => {
        setNotices(d.notifications || []);
        setUnread(d.stats?.unread_notifications ?? 0);
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
    const t = window.setInterval(load, 30000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="bp-dropdown-wrap" ref={ref}>
      <button type="button" className="bp-topbar-icon-btn" onClick={() => setOpen((v) => !v)} aria-label="Notifications">
        🔔
        {unread > 0 && <span className="bp-topbar-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="bp-dropdown-panel">
          <div className="bp-dropdown-panel-head">Notifications</div>
          {!notices || notices.length === 0 ? (
            <div className="bp-dropdown-empty">You're all caught up.</div>
          ) : (
            notices.slice(0, 8).map((n) => (
              <div key={n.id} className="bp-dropdown-item" style={{ opacity: n.read_at ? 0.65 : 1 }}>
                <div style={{ fontWeight: 700 }}>{n.title}</div>
                {n.body && <div style={{ color: 'var(--bp-muted)', marginTop: 2 }}>{n.body}</div>}
                <div style={{ color: 'var(--bp-muted)', fontSize: 11, marginTop: 4 }}>{timeAgo(n.created_at)}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function initialsOf(name) {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  return words.slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

const ICON_PROPS = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

function ProfileIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  );
}
function CalendarIcon({ size = 20 }) {
  return (
    <svg {...ICON_PROPS} width={size} height={size}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.96 19a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.96a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  );
}
function ExitIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

/** Confirmation modal shown before actually signing out. */
function LogoutConfirmModal({ onCancel, onConfirm, busy }) {
  return (
    <div className="bp-modal-backdrop" role="presentation" onClick={onCancel}>
      <div className="bp-modal" role="dialog" aria-modal="true" aria-label="Logout Confirmation" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="bp-modal-close" onClick={onCancel} disabled={busy} aria-label="Close">×</button>
        <div className="bp-modal-icon"><ExitIcon /></div>
        <p className="bp-modal-title">Logout Confirmation</p>
        <p className="bp-modal-text">
          Are you sure you want to logout?
          <br />
          You will be signed out from your account and redirected to the login page.
        </p>
        <div className="bp-modal-actions">
          <button type="button" className="bp-btn bp-btn-outline" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="bp-btn bp-btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Signing out…' : 'Logout'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Avatar + name button revealing Profile / Change Password / Settings / Logout. */
export function ClientAvatarMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useOutsideClose(() => setOpen(false));
  const name = user?.client_profile?.business_name || user?.name || 'Client';

  const doLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate('/login');
  };

  return (
    <>
      <div className="bp-dropdown-wrap" ref={ref}>
        <button type="button" className="bp-avatar-btn" onClick={() => setOpen((v) => !v)}>
          <span className="bp-avatar-circle">{initialsOf(user?.name)}</span>
          <span className="bp-avatar-name">{name}</span>
          <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
        </button>
        {open && (
          <div className="bp-dropdown-panel" style={{ minWidth: 230 }}>
            <Link to="/portal/profile" className="bp-dropdown-row" onClick={() => setOpen(false)}>
              <span className="bp-dropdown-row-icon"><ProfileIcon /></span>
              <span>
                <span className="bp-dropdown-row-title">Profile</span>
                <span className="bp-dropdown-row-sub">Business Profile</span>
              </span>
            </Link>
            <Link to="/portal/profile/reset-password" className="bp-dropdown-row" onClick={() => setOpen(false)}>
              <span className="bp-dropdown-row-icon"><LockIcon /></span>
              <span>
                <span className="bp-dropdown-row-title">Change Password</span>
                <span className="bp-dropdown-row-sub">Update your password</span>
              </span>
            </Link>
            <Link to="/portal/settings" className="bp-dropdown-row" onClick={() => setOpen(false)}>
              <span className="bp-dropdown-row-icon"><GearIcon /></span>
              <span>
                <span className="bp-dropdown-row-title">Settings</span>
                <span className="bp-dropdown-row-sub">Billing &amp; Invoice Settings</span>
              </span>
            </Link>
            <button
              type="button"
              className="bp-dropdown-row danger"
              onClick={() => { setOpen(false); setConfirmingLogout(true); }}
            >
              <span className="bp-dropdown-row-icon"><ExitIcon /></span>
              <span>
                <span className="bp-dropdown-row-title">Logout</span>
                <span className="bp-dropdown-row-sub">Sign out from your account</span>
              </span>
            </button>
          </div>
        )}
      </div>
      {confirmingLogout && (
        <LogoutConfirmModal
          busy={loggingOut}
          onCancel={() => setConfirmingLogout(false)}
          onConfirm={doLogout}
        />
      )}
    </>
  );
}

/** "Need Help?" card pinned to the bottom of the Client Portal sidebar. */
function NeedHelpCard() {
  return (
    <div className="bp-help-card">
      <div className="bp-help-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 13a8 8 0 1 1 16 0v4a2 2 0 0 1-2 2h-1v-6h3" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 13v3a2 2 0 0 0 2 2h1v-6H4z" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 19a2 2 0 0 0 2 2h1" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="bp-help-title">Need Help?</p>
      <p className="bp-help-text">We're here to help you with any queries.</p>
      <a href="/contact" target="_blank" rel="noreferrer" className="bp-help-btn">
        💬 Contact Support <span className="bp-help-arrow" aria-hidden="true">›</span>
      </a>
    </div>
  );
}

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

function PortalFrame({
  brand, subtitle, title, userLabel, nav, loginPath, extraTopRight, footLinks = [],
  shellClassName = '', headerContent, rightContent, sidebarFoot,
}) {
  usePortalStyles();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const closeSidebar = () => setOpen(false);

  return (
    <div className={`bp-shell ${shellClassName}`.trim()}>
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
        <nav className="bp-nav">
          {nav.map((item) =>
            item.children ? (
              <NavGroup key={item.label} item={item} location={location} closeSidebar={closeSidebar} />
            ) : (
              <Link
                key={item.to}
                to={item.to}
                className={isItemActive(item, location) ? 'active' : undefined}
                onClick={closeSidebar}
              >
                {item.label}
              </Link>
            )
          )}
        </nav>
        {sidebarFoot}
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
            {headerContent || (
              <div>
                <h1>{title}</h1>
                <div style={{ fontSize: 12, color: 'var(--bp-muted)' }}>{userLabel}</div>
              </div>
            )}
          </div>
          <div className="bp-topbar-right">
            {rightContent || (
              <>
                {extraTopRight}
                <button type="button" className="bp-btn bp-btn-outline bp-logout-btn" onClick={async () => { await logout(); navigate(loginPath); }}>
                  Logout
                </button>
              </>
            )}
          </div>
        </header>
        <div className="bp-content"><Outlet /></div>
      </div>
    </div>
  );
}

/** GST-registration label shown under the "Client Portal" header title. */
function gstModeLabel(profile) {
  const mode = billingMode(profile);
  if (mode === 'retail') return 'Non-GST';
  if (mode === 'composition') return 'GST Composition';
  return profile?.gst_filing_frequency === 'quarterly' ? 'GST Quarterly' : 'GST Monthly';
}

/** Title + GSTIN badge — the left side of the shared topbar, same spot as before. */
function ClientTopbarHeader() {
  const { user } = useAuth();
  const profile = user?.client_profile;
  const name = profile?.business_name || user?.name || 'Client';

  return (
    <div>
      <h1>Client Portal</h1>
      <div style={{ fontSize: 12, color: 'var(--bp-muted)' }}>
        {name} <span style={{ opacity: 0.5 }}>·</span> ({gstModeLabel(profile)})
      </div>
      {profile?.has_gst && profile?.gstin && (
        <span style={{ display: 'inline-block', marginTop: 6, background: '#dcfce7', color: '#15803d', fontSize: 12, fontWeight: 800, padding: '4px 12px', borderRadius: 20, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
          GSTIN: {profile.gstin}
        </span>
      )}
    </div>
  );
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "2026-04-01" -> "01 Apr 2026" */
function ddMonYyyy(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d} ${SHORT_MONTHS[Number(m) - 1]} ${y}`;
}

/** Financial Year selector + Refresh Data — right side of the shared topbar, ahead of the
 * notification bell and avatar menu, same spot they occupied on the Dashboard before this
 * became a global control. Reads FY state from ClientPortalCtx. */
function ClientTopbarControls() {
  const ctx = useClientPortal();
  if (!ctx) return null;

  return (
    <>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, color: 'var(--bp-text)', fontWeight: 700, whiteSpace: 'nowrap' }}>
        <CalendarIcon size={22} />
        Financial Year
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 52, boxSizing: 'border-box', border: '1px solid var(--bp-border)', borderRadius: 8, padding: '0 14px', lineHeight: 1.3 }}>
        <select
          className="bp-select"
          style={{ border: 'none', padding: 0, fontWeight: 800, fontSize: 15, color: 'var(--bp-navy)', background: 'transparent', height: 'auto', textAlign: 'center' }}
          value={ctx.fy}
          onChange={(e) => ctx.setFy(e.target.value)}
        >
          {ctx.fyOptions.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <span style={{ fontSize: 10, color: 'var(--bp-muted)', whiteSpace: 'nowrap' }}>
          {ddMonYyyy(ctx.range.from)} - {ddMonYyyy(ctx.range.to)}
        </span>
      </div>
      <button
        type="button"
        className="bp-btn bp-btn-outline"
        style={{ height: 52, boxSizing: 'border-box', padding: '0 14px', fontSize: 12, whiteSpace: 'nowrap' }}
        onClick={ctx.triggerRefresh}
        disabled={ctx.refreshing}
      >
        {ctx.refreshing ? 'Refreshing…' : '↻ Refresh Data'}
      </button>
    </>
  );
}

export function ClientPortalLayout() {
  const { user } = useAuth();
  const profile = user?.client_profile;
  const hasGst = Boolean(profile?.has_gst);
  const mode = billingMode(profile);

  const fyOptions = buildFyOptions(6);
  const [fy, setFy] = useState(currentFyLabel());
  const range = fyDateRange(fy) || currentFyRange();
  const [refreshing, setRefreshing] = useState(false);
  const refreshFnRef = useRef(null);

  const registerRefresh = useCallback((fn) => {
    refreshFnRef.current = fn;
    return () => {
      if (refreshFnRef.current === fn) refreshFnRef.current = null;
    };
  }, []);

  const triggerRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (refreshFnRef.current) {
        await refreshFnRef.current();
      } else {
        window.location.reload();
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  const portalCtx = { fy, setFy, fyOptions, range, refreshing, triggerRefresh, registerRefresh };

  const nav = [
    { to: '/portal', label: 'Dashboard', end: true },
    { to: '/portal/billing/parties', label: 'Parties' },
    {
      to: '/portal/billing',
      label: 'Billing',
      isActive: (_, { pathname }) =>
        pathname.startsWith('/portal/billing') && !pathname.startsWith('/portal/billing/parties'),
    },
    hasGst && {
      label: 'GST Compliance',
      children: [
        { to: '/portal/gstr-2b', label: 'GSTR-2B' },
        { to: '/portal/gst-returns', label: 'GST Returns' },
        { to: '/portal/gst-filing', label: 'GST Filing Confirmation' },
      ],
    },
    {
      label: 'Document Change',
      children: [
        { to: '/portal/edit-requests', label: 'Edit Request' },
        { to: '/portal/amendments', label: 'Amendment Request' },
      ],
    },
    {
      label: 'Reports',
      children: [
        hasGst && { to: '/portal/reports/gst-summary', label: 'GST Summary' },
        mode === 'regular' && { to: '/portal/reports/gst-liability', label: 'GST Liability / ITC' },
        hasGst && { to: '/portal/reports/hsn-summary', label: 'HSN / SAC Summary' },
        { to: '/portal/reports/party-wise', label: 'Party-wise Details' },
        { to: '/portal/reports/outstanding', label: 'Outstanding' },
      ].filter(Boolean),
    },
  ].filter(Boolean);

  return (
    <ClientPortalCtx.Provider value={portalCtx}>
      <PortalFrame
        shellClassName="bp-shell-client"
        loginPath="/login"
        nav={nav}
        headerContent={<ClientTopbarHeader />}
        rightContent={
          <>
            <ClientTopbarControls />
            <ClientNotificationBell />
            <ClientAvatarMenu />
          </>
        }
        sidebarFoot={<NeedHelpCard />}
      />
    </ClientPortalCtx.Provider>
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
        { to: '/admin/gstr-2b', label: 'GSTR-2B' },
        { to: '/admin/gst-returns', label: 'GST Returns' },
        { to: '/admin/gst-filing-requests', label: 'Filing Requests' },
        { to: '/admin/edit-requests', label: 'Edit Requests' },
        { to: '/admin/pending-approval', label: 'Pending Approval' },
        { to: '/admin/configuration', label: 'Configuration' },
        { to: '/admin/settings', label: 'Settings' },
      ]}
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
