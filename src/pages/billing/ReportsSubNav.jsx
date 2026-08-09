import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { isRetail } from './billingProfile';

const ALL_LINKS = [
  { to: '/portal/reports/gst-summary', label: 'GST Summary', gstOnly: true },
  { to: '/portal/reports/hsn-summary', label: 'HSN / SAC Summary', gstOnly: true },
  { to: '/portal/reports/party-wise', label: 'Party-wise Detail', gstOnly: false },
  { to: '/portal/reports/sales-register', label: 'Sales Register', gstOnly: false },
  { to: '/portal/reports/outstanding', label: 'Outstanding', gstOnly: false },
];

export default function ReportsSubNav() {
  const { user } = useAuth();
  const retail = isRetail(user?.client_profile);
  const links = ALL_LINKS.filter((l) => !(retail && l.gstOnly));

  if (!links.length) return null;

  return (
    <nav className="bp-section-nav" aria-label="Reports section">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          className={({ isActive }) => `bp-section-nav-link${isActive ? ' active' : ''}`}
        >
          {l.label}
        </NavLink>
      ))}
    </nav>
  );
}
