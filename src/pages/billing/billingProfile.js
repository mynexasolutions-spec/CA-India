export function billingMode(profile) {
  if (!profile?.has_gst) return 'retail';
  if (profile?.dealer_type === 'composition') return 'composition';
  return 'regular';
}

export function isRetail(profile) {
  return billingMode(profile) === 'retail';
}

/** Primary list path for the main invoice-style documents. */
export function primaryInvoiceListPath(profile) {
  if (billingMode(profile) === 'composition') {
    return '/portal/billing/bill-of-supply';
  }
  return '/portal/billing/invoices';
}

/**
 * Lock rules for GST dealer types (tabs stay visible; locked = greyed / not clickable):
 * - Regular GST: Bill of Supply locked
 * - Composition GST: Tax Invoice + Debit Notes locked; Bill of Supply + Credit Notes active
 */
export function docTypeLock(profile, type) {
  const mode = billingMode(profile);

  if (mode === 'retail') {
    if (type === 'tax_invoice' || type === 'amendment') return null;
    if (type === 'bill_of_supply') {
      return 'Bill of Supply is not available for non-GST clients.';
    }
    if (type === 'credit_note' || type === 'debit_note' || type === 'quotation') {
      return 'This document type is not available for non-GST clients. Use Invoice only.';
    }
    return 'This document type is not available for non-GST clients.';
  }

  if (mode === 'regular') {
    if (type === 'bill_of_supply') {
      return 'Bill of Supply is locked because your business is configured as a Regular GST Dealer in Admin Portal.';
    }
    return null;
  }

  // composition
  if (type === 'tax_invoice') {
    return 'Tax Invoice is locked because your business is configured as a GST Composition Dealer in Admin Portal.';
  }
  if (type === 'debit_note') {
    return 'Debit Note is locked because your business is configured as a GST Composition Dealer in Admin Portal.';
  }
  return null;
}

export function isDocTypeDisabled(profile, type) {
  return Boolean(docTypeLock(profile, type));
}

export function showGstFields(profile) {
  return billingMode(profile) === 'regular';
}

export function showRcmCheckbox(profile) {
  return billingMode(profile) === 'regular';
}

export function showHsnFields(profile) {
  return !isRetail(profile);
}

export function retailBillLabel() {
  return 'Invoice';
}

/**
 * Party Document Details sections by GST dealer type.
 * - always: section always shown (rows or "No Records Found")
 * - ifExists: section shown only when documents of that type exist
 */
export function partyDocumentSections(profile) {
  const mode = billingMode(profile);

  if (mode === 'composition') {
    return [
      { type: 'bill_of_supply', label: 'Bill of Supply', mode: 'always' },
      { type: 'credit_note', label: 'Credit Notes', mode: 'always' },
      { type: 'tax_invoice', label: 'Tax Invoices', mode: 'ifExists' },
      { type: 'debit_note', label: 'Debit Notes', mode: 'ifExists' },
    ];
  }

  if (mode === 'retail') {
    return [
      { type: 'tax_invoice', label: 'Invoices', mode: 'always' },
    ];
  }

  // Regular GST dealer
  return [
    { type: 'tax_invoice', label: 'Tax Invoices', mode: 'always' },
    { type: 'debit_note', label: 'Debit Notes', mode: 'always' },
    { type: 'credit_note', label: 'Credit Notes', mode: 'always' },
    { type: 'bill_of_supply', label: 'Bill of Supply', mode: 'ifExists' },
  ];
}

export const LOCKED_LINK_STYLE = {
  opacity: 0.45,
  cursor: 'not-allowed',
  pointerEvents: 'none',
};
