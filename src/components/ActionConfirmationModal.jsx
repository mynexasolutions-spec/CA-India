function CheckIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/**
 * Action Confirmation Popups spec (§11) — a single dynamic success popup reused for
 * every "Save Draft" / "Generate <Document Type>" / "Save Company" action, driven by
 * props rather than one hardcoded popup per action. `refLabel`/`refValue` render the
 * reference-number box (e.g. "Invoice No.: INV-001") only when both are supplied —
 * Save Draft and Save Company have no reference box in the spec.
 */
export default function ActionConfirmationModal({ title, message, refLabel, refValue, onClose }) {
  return (
    <div className="bp-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="bp-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="bp-modal-close" onClick={onClose} aria-label="Close">×</button>
        <div className="bp-modal-icon bp-modal-icon-success"><CheckIcon /></div>
        <p className="bp-modal-title" style={{ color: 'var(--bp-green)' }}>{title}</p>
        <p className="bp-modal-text" style={{ marginBottom: refLabel && refValue ? 12 : 22 }}>{message}</p>
        {refLabel && refValue && (
          <div className="bp-modal-ref-box">{refLabel}: {refValue}</div>
        )}
        <div className="bp-modal-actions">
          <button type="button" className="bp-btn bp-btn-green" onClick={onClose} autoFocus>OK</button>
        </div>
      </div>
    </div>
  );
}
