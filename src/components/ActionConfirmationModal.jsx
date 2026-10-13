function CheckIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.5" />
      <line x1="12" y1="7.5" x2="12" y2="13" />
      <circle cx="12" cy="16.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Action Confirmation Popups spec (§11) — a dynamic popup reused for
 * actions, driven by props rather than one hardcoded popup per action.
 * `refLabel`/`refValue` render the reference-number box only when supplied.
 * When `onConfirm` is passed, renders both Cancel and Confirm action buttons.
 */
export default function ActionConfirmationModal({
  title,
  message,
  refLabel,
  refValue,
  onClose,
  onConfirm,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
}) {
  return (
    <div className="bp-modal-backdrop" role="presentation" onClick={busy ? undefined : onClose}>
      <div className="bp-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="bp-modal-close" onClick={onClose} disabled={busy} aria-label="Close">×</button>
        <div className={`bp-modal-icon ${danger ? '' : 'bp-modal-icon-success'}`} style={danger ? { background: '#fee2e2', color: 'var(--bp-red)' } : undefined}>
          {danger ? <AlertIcon /> : <CheckIcon />}
        </div>
        <p className="bp-modal-title" style={{ color: danger ? 'var(--bp-red)' : 'var(--bp-green)' }}>{title}</p>
        <p className="bp-modal-text" style={{ marginBottom: refLabel && refValue ? 12 : 22 }}>{message}</p>
        {refLabel && refValue && (
          <div className="bp-modal-ref-box">{refLabel}: {refValue}</div>
        )}
        <div className="bp-modal-actions">
          {onConfirm ? (
            <>
              <button type="button" className="bp-btn bp-btn-outline" onClick={onClose} disabled={busy}>
                {cancelLabel}
              </button>
              <button
                type="button"
                className={`bp-btn ${danger ? 'bp-btn-danger' : 'bp-btn-blue'}`}
                onClick={onConfirm}
                disabled={busy}
                autoFocus
              >
                {busy ? 'Deleting…' : confirmLabel}
              </button>
            </>
          ) : (
            <button type="button" className="bp-btn bp-btn-green" onClick={onClose} autoFocus>OK</button>
          )}
        </div>
      </div>
    </div>
  );
}
