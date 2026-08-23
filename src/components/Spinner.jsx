export default function Spinner({ size = 20, color = '#2563eb', thickness = 2.5, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="spin" style={{ flexShrink: 0, ...style }}>
      <circle cx="12" cy="12" r="9.25" stroke={color} strokeOpacity="0.15" strokeWidth={thickness} />
      <path d="M21.25 12a9.25 9.25 0 0 0-9.25-9.25" stroke={color} strokeWidth={thickness} strokeLinecap="round" />
    </svg>
  );
}

/** Centered spinner + label — the standard "loading this section" block. */
export function LoadingBlock({ label = 'Loading…', size = 22, color, minHeight = 160, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight, padding: '32px 16px', color: 'var(--bp-muted, #6b8499)', fontSize: 13, fontWeight: 600, ...style }}>
      <Spinner size={size} color={color} />
      {label}
    </div>
  );
}

/** Inline spinner + label for tight spaces (e.g. next to a button or a one-line status). */
export function LoadingInline({ label = 'Loading…', size = 14, color, style }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: 'var(--bp-muted, #6b8499)', fontSize: 13, fontWeight: 600, ...style }}>
      <Spinner size={size} color={color} />
      {label}
    </span>
  );
}
