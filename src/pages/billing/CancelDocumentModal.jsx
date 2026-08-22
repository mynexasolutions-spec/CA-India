import { useState } from 'react';

function CancelIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </svg>
  );
}

/**
 * Billing Module spec §18 — Cancel opens a confirmation popup and requires a
 * reason. Cancellation is a status change only; the document is never deleted.
 */
export default function CancelDocumentModal({ docLabel, onCancel, onConfirm, busy }) {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();

  return (
    <div className="bp-modal-backdrop" role="presentation" onClick={onCancel}>
      <div className="bp-modal" role="dialog" aria-modal="true" aria-label="Cancel Document" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="bp-modal-close" onClick={onCancel} disabled={busy} aria-label="Close">×</button>
        <div className="bp-modal-icon"><CancelIcon /></div>
        <p className="bp-modal-title">Cancel {docLabel}?</p>
        <p className="bp-modal-text">
          This will mark {docLabel} as Cancelled. It will remain viewable and downloadable, and is never deleted.
        </p>
        <label style={{ display: 'block', textAlign: 'left', marginTop: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--bp-text)' }}>
            Reason for cancellation <span className="bp-required">*</span>
          </span>
          <textarea
            className="bp-input"
            style={{ width: '100%', marginTop: 6, minHeight: 72, resize: 'vertical' }}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="E.g. Duplicate entry, order cancelled by party, incorrect amount…"
            disabled={busy}
            autoFocus
          />
        </label>
        <div className="bp-modal-actions">
          <button type="button" className="bp-btn bp-btn-outline" onClick={onCancel} disabled={busy}>Keep Document</button>
          <button
            type="button"
            className="bp-btn bp-btn-danger"
            disabled={busy || !trimmed}
            onClick={() => onConfirm(trimmed)}
          >
            {busy ? 'Cancelling…' : 'Confirm Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
