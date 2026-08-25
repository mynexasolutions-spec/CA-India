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
 * Action Confirmation Popups spec (§12) — shared "discard unsaved changes" guard for
 * every form's Cancel button (Billing document forms, Party/Company form, etc.), so a
 * click on Cancel never silently loses in-progress work.
 */
export default function DiscardChangesModal({ onContinueEditing, onConfirmCancel }) {
  return (
    <div className="bp-modal-backdrop" role="presentation" onClick={onContinueEditing}>
      <div className="bp-modal" role="dialog" aria-modal="true" aria-label="Are You Sure You Want to Cancel?" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="bp-modal-close" onClick={onContinueEditing} aria-label="Close">×</button>
        <div className="bp-modal-icon"><AlertIcon /></div>
        <p className="bp-modal-title" style={{ color: 'var(--bp-red)' }}>Are You Sure You Want to Cancel?</p>
        <p className="bp-modal-text">Any unsaved changes may be lost. Do you want to cancel this action?</p>
        <div className="bp-modal-actions">
          <button type="button" className="bp-btn bp-btn-outline" style={{ color: 'var(--bp-red)', borderColor: 'var(--bp-red)' }} onClick={onConfirmCancel}>
            Yes, Cancel
          </button>
          <button type="button" className="bp-btn bp-btn-danger" onClick={onContinueEditing} autoFocus>
            Continue Editing
          </button>
        </div>
      </div>
    </div>
  );
}
