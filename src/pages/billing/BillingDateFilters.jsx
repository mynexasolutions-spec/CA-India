import { buildFyOptions, currentFyRange } from './billingUtils';
import { isDocTypeDisabled } from './billingProfile';

function FilterField({ label, children }) {
  return (
    <label className="bp-filter-field">
      <span className="bp-filter-title">{label}</span>
      {children}
    </label>
  );
}

export default function BillingDateFilters({
  q = '',
  setQ,
  month = '',
  setMonth,
  fy = '',
  setFy,
  from = '',
  setFrom,
  to = '',
  setTo,
  status = '',
  setStatus,
  docType = '',
  setDocType,
  onApply,
  onClear,
  showSearch = true,
  showDocType = false,
  profile = null,
}) {
  const fyOptions = buildFyOptions();

  const applyMonth = (value) => {
    setMonth(value);
    if (value) {
      setFy('');
      const [y, m] = value.split('-').map(Number);
      const last = new Date(y, m, 0).getDate();
      setFrom(`${value}-01`);
      setTo(`${value}-${String(last).padStart(2, '0')}`);
    }
  };

  const applyFy = (value) => {
    setFy(value);
    if (value) {
      setMonth('');
      const [y1] = value.split('-');
      const year = parseInt(y1, 10);
      if (year) {
        setFrom(`${year}-04-01`);
        setTo(`${year + 1}-03-31`);
      }
    }
  };

  const clearAll = () => {
    const next = currentFyRange();
    setQ?.('');
    setMonth?.('');
    setFy?.(next.fy);
    setFrom?.(next.from);
    setTo?.(next.to);
    setStatus?.('');
    setDocType?.('');
    onClear?.();
  };

  const applyCurrentMonth = () => {
    const now = new Date();
    const value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    applyMonth(value);
    onApply?.();
  };

  const applyPreviousMonth = () => {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    const value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    applyMonth(value);
    onApply?.();
  };

  return (
    <div className="bp-filters">
      <button type="button" className="bp-filter-item bp-filter-btn" onClick={applyCurrentMonth}>Current Month</button>
      <button type="button" className="bp-filter-item bp-filter-btn" onClick={applyPreviousMonth}>Previous Month</button>
      {showSearch && (
        <FilterField label="Search">
          <input
            className="bp-filter-item bp-filter-control"
            placeholder="Search no. / party"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </FilterField>
      )}
      <FilterField label="Financial Year">
        <select
          className="bp-filter-item bp-filter-control"
          value={fy}
          onChange={(e) => applyFy(e.target.value)}
        >
          <option value="">All FY</option>
          {fyOptions.map((opt) => (
            <option key={opt} value={opt}>FY {opt}</option>
          ))}
        </select>
      </FilterField>
      <FilterField label="From Date">
        <input
          className="bp-filter-item bp-filter-control"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </FilterField>
      <FilterField label="To Date">
        <input
          className="bp-filter-item bp-filter-control"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </FilterField>
      {setStatus && (
        <FilterField label="Status">
          <select
            className="bp-filter-item bp-filter-control"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All status</option>
            <option value="draft">Draft</option>
            <option value="issued">Unpaid</option>
            <option value="paid">Paid</option>
          </select>
        </FilterField>
      )}
      {showDocType && setDocType && (
        <FilterField label="Document Type">
          <select
            className="bp-filter-item bp-filter-control"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
          >
            <option value="">All types</option>
            <option value="quotation">Quotation</option>
            {!isDocTypeDisabled(profile, 'tax_invoice') && <option value="tax_invoice">Tax Invoice</option>}
            {!isDocTypeDisabled(profile, 'bill_of_supply') && <option value="bill_of_supply">Bill of Supply</option>}
            <option value="debit_note">Debit Note</option>
            <option value="credit_note">Credit Note</option>
          </select>
        </FilterField>
      )}
      <button type="button" className="bp-filter-item bp-filter-btn bp-filter-btn-primary" onClick={onApply}>Apply filters</button>
      <button type="button" className="bp-filter-item bp-filter-btn" onClick={clearAll}>Clear</button>
    </div>
  );
}
