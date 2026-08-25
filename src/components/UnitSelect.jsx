/** Official GST UQC (Unit Quantity Code) list — the same fixed set the GST portal itself
 * uses for e-invoicing/GSTR filings. Predefined only, no arbitrary text entry, per the
 * Invoice Item Table spec. */
export const UNIT_CODES = [
  'NOS', 'PCS', 'SET', 'PRS', 'BOX', 'PAC', 'BAG', 'CTN', 'BDL', 'BTL',
  'CAN', 'DRM', 'TUB', 'ROL', 'REL', 'UNT',
  'KGS', 'GMS', 'MTS', 'MTR', 'CMS', 'MLT', 'LTR', 'KLR',
  'SQM', 'SQF', 'SQY', 'CBM', 'CCM',
  'DOZ', 'GRS', 'GYD', 'TON', 'QTL', 'BAL', 'BKL', 'BOU', 'BUN', 'OTH',
];

export default function UnitSelect({ value, onChange, className = 'bp-input', disabled = false, required = false }) {
  const current = UNIT_CODES.includes(value) ? value : 'NOS';

  return (
    <select
      className={className}
      value={current}
      disabled={disabled}
      required={required}
      onChange={(e) => onChange(e.target.value)}
    >
      {UNIT_CODES.map((u) => <option key={u} value={u}>{u}</option>)}
    </select>
  );
}
