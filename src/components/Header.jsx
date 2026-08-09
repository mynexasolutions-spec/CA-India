import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { REGISTRATIONS, SERVICES } from '../data/nav';

export default function Header({ onOpenMenu }) {
  const { pathname } = useLocation();
  const [openDrop, setOpenDrop] = useState(null);

  return (
    <header className="main-header">
      <div className="container nav-wrap">
        <Link to="/" className="logo header-brand-link">
          <img src="/assets/ca-india-logo.png" alt="CA India - A B KHAN & ASSOCIATES logo" />
          <span className="header-brand-text">
            <span className="header-brand-name">A B KHAN & ASSOCIATES</span>
            <span className="header-brand-tagline">Chartered Accountants</span>
          </span>
        </Link>

        <nav className="primary-nav" aria-label="Primary">
          <ul>
            <li>
              <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : undefined)}>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink to="/about" className={({ isActive }) => (isActive ? 'active' : undefined)}>
                About Us
              </NavLink>
            </li>
            <li
              className="has-dropdown"
              onMouseEnter={() => setOpenDrop('services')}
              onMouseLeave={() => setOpenDrop(null)}
            >
              <NavLink
                to="/services"
                className={({ isActive }) => (isActive || pathname.startsWith('/services/') ? 'active' : undefined)}
              >
                Services <span className="caret" />
              </NavLink>
              <ul className="dropdown" style={openDrop === 'services' ? { opacity: 1, visibility: 'visible', transform: 'translateY(0)' } : undefined}>
                {SERVICES.map((item) => (
                  <li key={item.path}>
                    <Link to={item.path}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </li>
            <li
              className="has-dropdown"
              onMouseEnter={() => setOpenDrop('reg')}
              onMouseLeave={() => setOpenDrop(null)}
            >
              <NavLink
                to="/business-registration"
                className={({ isActive }) =>
                  isActive || pathname.startsWith('/business-registration/') ? 'active' : undefined
                }
              >
                Business Reg. <span className="caret" />
              </NavLink>
              <ul className="dropdown" style={openDrop === 'reg' ? { opacity: 1, visibility: 'visible', transform: 'translateY(0)' } : undefined}>
                {REGISTRATIONS.map((item) => (
                  <li key={item.path}>
                    <Link to={item.path}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </li>
            <li>
              <NavLink to="/billing-management" className={({ isActive }) => (isActive ? 'active' : undefined)}>
                Billing
              </NavLink>
            </li>
            <li>
              <NavLink to="/knowledge-centre" className={({ isActive }) => (isActive || pathname.startsWith('/knowledge-centre') ? 'active' : undefined)}>
                Knowledge
              </NavLink>
            </li>
            <li>
              <NavLink to="/contact" className={({ isActive }) => (isActive ? 'active' : undefined)}>
                Contact
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="header-cta">
          <Link to="/admin/login" className="btn btn-navy">
            <span className="txt">Admin Login</span>
            <span className="mobile-icon-only">🛡️</span>
          </Link>
          <Link to="/portal/login" className="btn btn-gold">
            <span className="txt">Client Login</span>
            <span className="mobile-icon-only">👤</span>
          </Link>
          <button className="menu-toggle" aria-label="Open menu" aria-expanded="false" onClick={onOpenMenu}>
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}
