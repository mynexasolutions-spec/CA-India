export const GST_RATES = [0, 1, 5, 6, 12, 18, 28, 40];

export function normalizeGstRate(rate) {
  const n = Number(rate);
  return GST_RATES.includes(n) ? n : 18;
}

export function documentDateLabel(docType) {
  if (docType === 'tax_invoice') return 'Tax Invoice Date';
  if (docType === 'debit_note') return 'Debit Note Date';
  if (docType === 'credit_note') return 'Credit Note Date';
  if (docType === 'bill_of_supply') return 'Bill of Supply Date';
  if (docType === 'quotation') return 'Quotation Date';
  if (docType === 'amendment') return 'Amendment Date';
  return 'Document Date';
}

/** Inclusive YYYY-MM-DD date range check. */
export function isDateInRange(dateStr, from = '', to = '') {
  const d = String(dateStr || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  if (from && d < String(from).slice(0, 10)) return false;
  if (to && d > String(to).slice(0, 10)) return false;
  return true;
}

/** Filter documents by From / To date (and optional FY bounds already reflected in from/to). */
export function filterDocsByPeriod(docs, { from = '', to = '' } = {}) {
  if (!Array.isArray(docs)) return [];
  if (!from && !to) return docs;
  return docs.filter((doc) => isDateInRange(doc.document_date, from, to));
}

export function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

/** Indian FY labels e.g. 2025-26 (Apr–Mar) */
export function buildFyOptions(count = 6) {
  const now = new Date();
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const options = [];
  for (let i = 0; i < count; i += 1) {
    const y1 = startYear - i;
    options.push(`${y1}-${String(y1 + 1).slice(-2)}`);
  }
  return options;
}

/** Current Indian FY start year (April–March). Auto-switches on 1 April. */
export function currentFyStartYear(date = new Date()) {
  return date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
}

/** e.g. 2025-26 */
export function currentFyLabel(date = new Date()) {
  const y1 = currentFyStartYear(date);
  return `${y1}-${String(y1 + 1).slice(-2)}`;
}

/** Current FY date range (1 Apr → 31 Mar). */
export function currentFyRange(date = new Date()) {
  const y1 = currentFyStartYear(date);
  return {
    from: `${y1}-04-01`,
    to: `${y1 + 1}-03-31`,
    fy: currentFyLabel(date),
  };
}

export function fyDateRange(fy) {
  const [y1] = String(fy).split('-');
  const year = parseInt(y1, 10);
  if (!year) return null;
  return {
    from: `${year}-04-01`,
    to: `${year + 1}-03-31`,
  };
}

export function monthDateRange(month) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return null;
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(last).padStart(2, '0')}`,
  };
}

export function billingDocPath(type, id) {
  const base = {
    tax_invoice: '/portal/billing/invoices',
    debit_note: '/portal/billing/debit-notes',
    credit_note: '/portal/billing/credit-notes',
    bill_of_supply: '/portal/billing/bill-of-supply',
    quotation: '/portal/quotation',
    amendment: '/portal/amendments',
  }[type] || '/portal/billing/invoices';
  return `${base}/${id}`;
}

export function billingDocEditPath(type, id) {
  const base = {
    tax_invoice: '/portal/billing/invoices',
    bill_of_supply: '/portal/billing/bill-of-supply',
    quotation: '/portal/quotation',
    debit_note: '/portal/billing/debit-notes',
    credit_note: '/portal/billing/credit-notes',
    amendment: '/portal/amendments',
  }[type];
  return base ? `${base}/${id}/edit` : null;
}

export function createButtonLabel(type, profile = null) {
  if (profile && !profile.has_gst && type === 'tax_invoice') {
    return '+ Create Invoice';
  }
  return {
    quotation: '+ Create Quotation',
    tax_invoice: '+ Create Tax Invoice',
    bill_of_supply: '+ Create Bill of Supply',
    debit_note: '+ Create Debit Note',
    credit_note: '+ Create Credit Note',
    amendment: '+ Create Amendment',
  }[type] || '+ Create';
}

export function docTypeLabel(type) {
  const key = String(type || '').toLowerCase();
  return {
    tax_invoice: 'Tax Invoice',
    bill_of_supply: 'Bill of Supply',
    debit_note: 'Debit Note',
    credit_note: 'Credit Note',
    quotation: 'Quotation',
    amendment: 'Amendment',
    invoice: 'Invoice',
  }[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function paymentStatusLabel(status) {
  if (status === 'paid') return 'Paid';
  if (status === 'partial') return 'Partial';
  if (status === 'draft') return 'Draft';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'issued' || status === 'unpaid') return 'Unpaid';
  return status || '—';
}

export function paymentStatusBadge(status) {
  if (status === 'paid') return 'bp-badge-paid';
  if (status === 'partial') return 'bp-badge-partial';
  if (status === 'draft') return 'bp-badge-draft';
  if (status === 'cancelled') return 'bp-badge-cancelled';
  if (status === 'issued' || status === 'unpaid') return 'bp-badge-unpaid';
  return `bp-badge-${status || 'draft'}`;
}
