import { useNavigate } from 'react-router-dom';
import { isDocTypeDisabled } from './billingProfile';

const ICON_PROPS = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

function TaxInvoiceIcon() {
  return <svg {...ICON_PROPS}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></svg>;
}
function BillOfSupplyIcon() {
  return <svg {...ICON_PROPS}><rect x="4" y="4" width="16" height="16" rx="1.5" /><path d="M4 10h16M4 15h16M10 4v16" /></svg>;
}
function DebitNoteIcon() {
  return <svg {...ICON_PROPS}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /><path d="M12 12v5M9.5 14.5h5" /></svg>;
}
function CreditNoteIcon() {
  return <svg {...ICON_PROPS}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /><path d="M9.5 14.5h5" /></svg>;
}

/** The four document types that share this reusable create-form component (spec §12-15).
 *  Quotation is a distinct module with its own creation flow, so it is not switchable here. */
const TILES = [
  { type: 'tax_invoice', label: 'Tax Invoice', desc: 'Create a new tax invoice', Icon: TaxInvoiceIcon, color: '#2563eb', bg: '#e8f0fe', newPath: '/portal/billing/invoices/new' },
  { type: 'bill_of_supply', label: 'Bill of Supply', desc: 'Create a new bill of supply', Icon: BillOfSupplyIcon, color: '#15803d', bg: '#e6f7ec', newPath: '/portal/billing/bill-of-supply/new' },
  { type: 'debit_note', label: 'Debit Note', desc: 'Create a new debit note', Icon: DebitNoteIcon, color: '#b45309', bg: '#fdf1de', newPath: '/portal/billing/debit-notes/new' },
  { type: 'credit_note', label: 'Credit Note', desc: 'Create a new credit note', Icon: CreditNoteIcon, color: '#7c3aed', bg: '#f1e9fd', newPath: '/portal/billing/credit-notes/new' },
];

export default function DocTypeTiles({ docType, profile }) {
  const navigate = useNavigate();

  return (
    <div className="bp-card" style={{ marginBottom: 14 }}>
      <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 14, color: 'var(--bp-navy)' }}>Select Document Type</h3>
      <div className="bp-doctype-tiles">
        {TILES.map((t) => {
          const locked = isDocTypeDisabled(profile, t.type);
          const active = t.type === docType;
          return (
            <button
              key={t.type}
              type="button"
              className={`bp-doctype-tile${active ? ' active' : ''}`}
              disabled={locked}
              title={locked ? 'Locked for your GST dealer type' : undefined}
              onClick={() => { if (!active) navigate(t.newPath); }}
            >
              <span className="bp-doctype-tile-icon" style={{ background: t.bg, color: t.color }}><t.Icon /></span>
              <span className="bp-doctype-tile-label">{t.label}</span>
              <span className="bp-doctype-tile-desc">{t.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
