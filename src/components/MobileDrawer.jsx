import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { REGISTRATIONS, SERVICES } from '../data/nav';

export default function MobileDrawer({ open, onClose }) {
  const [openSub, setOpenSub] = useState(null);

  const toggle = (id) => setOpenSub((prev) => (prev === id ? null : id));

  return (
    <>
      <div className={`scrim ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`mobile-drawer ${open ? 'open' : ''}`} id="mobileDrawer">
        <div className="mobile-drawer-head">
          <div className="mobile-drawer-brand">
            <img src="/assets/ca-india-logo.png" alt="CA India logo" />
            <div className="header-brand-text">
              <span className="header-brand-name">A B KHAN & ASSOCIATES</span>
              <span className="header-brand-tagline">Chartered Accountants</span>
            </div>
          </div>
          <button className="mobile-close" aria-label="Close menu" onClick={onClose}>
            ✕
          </button>
        </div>
        <ul>
          <li>
            <NavLink to="/" end onClick={onClose}>
              Home
            </NavLink>
          </li>
          <li>
            <NavLink to="/about" onClick={onClose}>
              About Us
            </NavLink>
          </li>
          <li>
            <button className="mobile-acc-trigger" type="button" onClick={() => toggle('services')}>
              Our Services <span className="plus">{openSub === 'services' ? '−' : '+'}</span>
            </button>
            <ul className={`mobile-sub ${openSub === 'services' ? 'open' : ''}`}>
              {SERVICES.map((item) => (
                <li key={item.path}>
                  <Link to={item.path} onClick={onClose}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
          <li>
            <button className="mobile-acc-trigger" type="button" onClick={() => toggle('reg')}>
              Business Registration <span className="plus">{openSub === 'reg' ? '−' : '+'}</span>
            </button>
            <ul className={`mobile-sub ${openSub === 'reg' ? 'open' : ''}`}>
              {REGISTRATIONS.map((item) => (
                <li key={item.path}>
                  <Link to={item.path} onClick={onClose}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
          <li>
            <NavLink to="/billing-management" onClick={onClose}>
              Billing Management
            </NavLink>
          </li>
          <li>
            <NavLink to="/knowledge-centre" onClick={onClose}>
              Knowledge Centre
            </NavLink>
          </li>
          <li>
            <NavLink to="/contact" onClick={onClose}>
              Contact Us
            </NavLink>
          </li>
        </ul>
        <div className="mobile-cta">
          <Link to="/admin/login" className="btn btn-navy" onClick={onClose}>
            Admin Login
          </Link>
          <Link to="/portal/login" className="btn btn-gold" onClick={onClose}>
            Client Login
          </Link>
        </div>
      </div>
    </>
  );
}
