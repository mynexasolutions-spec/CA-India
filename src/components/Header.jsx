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
          <Link to="/login" className="btn btn-gold">
            <span className="txt">Login</span>
            <svg className="mobile-icon-only" aria-hidden="true" viewBox="0 0 24 24" width="17" height="17">
              <path d="M7 10V7a5 5 0 0 1 10 0v3m-9 0h8a2 2 0 0 1 2 2v7H6v-7a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
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
