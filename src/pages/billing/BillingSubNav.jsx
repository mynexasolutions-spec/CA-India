import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { docTypeLock, isRetail } from './billingProfile';

/** Always shown for GST dealers; locked tabs stay visible but greyed out.
 * Quotation is a separate workflow with its own sidebar entry (see PortalShell.jsx),
 * not one of these upper Billing document tabs. */
const GST_LINKS = [
  { to: '/portal/billing', label: 'All Bills', end: true, type: null },
  { to: '/portal/billing/invoices', label: 'Tax Invoices', type: 'tax_invoice' },
  { to: '/portal/billing/bill-of-supply', label: 'Bill of Supply', type: 'bill_of_supply' },
  { to: '/portal/billing/debit-notes', label: 'Debit Notes', type: 'debit_note' },
  { to: '/portal/billing/credit-notes', label: 'Credit Notes', type: 'credit_note' },
];

const RETAIL_LINKS = [
  { to: '/portal/billing', label: 'All Bills', end: true, type: null },
  { to: '/portal/billing/invoices', label: 'Invoices', type: 'tax_invoice' },
];

export default function BillingSubNav() {
  const { user } = useAuth();
  const profile = user?.client_profile;
  const retail = isRetail(profile);
  const links = retail ? RETAIL_LINKS : GST_LINKS;

  return (
    <nav className="bp-section-nav" aria-label="Billing section">
      {links.map((l) => {
        const locked = l.type ? Boolean(docTypeLock(profile, l.type)) : false;
        const lockMsg = locked ? docTypeLock(profile, l.type) : '';

        if (locked) {
          return (
            <span
              key={l.type || l.to}
              className="bp-section-nav-link locked"
              title={lockMsg}
              aria-disabled="true"
            >
              {l.label}
            </span>
          );
        }

        return (
          <NavLink
            key={l.type || l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => `bp-section-nav-link${isActive ? ' active' : ''}`}
          >
            {l.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
