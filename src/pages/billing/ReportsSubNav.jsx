import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { billingMode } from './billingProfile';

const ALL_LINKS = [
  { to: '/portal/reports/gst-summary', label: 'GST Summary', gstOnly: true },
  { to: '/portal/reports/gst-liability', label: 'GST Liability', regularOnly: true },
  { to: '/portal/reports/hsn-summary', label: 'HSN / SAC Summary', gstOnly: true },
  { to: '/portal/reports/party-wise', label: 'Party-wise Detail', gstOnly: false },
  { to: '/portal/reports/outstanding', label: 'Outstanding', gstOnly: false },
];

export default function ReportsSubNav() {
  const { user } = useAuth();
  const mode = billingMode(user?.client_profile);
  const links = ALL_LINKS.filter((link) => {
    if (mode === 'retail' && link.gstOnly) return false;
    if (mode !== 'regular' && link.regularOnly) return false;
    return true;
  });

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
