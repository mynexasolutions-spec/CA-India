import { useState } from 'react';

function EyeIcon({ off }) {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {off ? (
        <>
          <path d="M2.5 2.5l15 15" />
          <path d="M8.3 8.4a2.6 2.6 0 0 0 3.4 3.4M6.1 6.2C4 7.5 2.5 10 2.5 10s2.9 5.5 7.5 5.5c1.3 0 2.5-.4 3.5-1M11.9 4.6A8.5 8.5 0 0 1 17.5 10s-.6 1.2-1.8 2.4" />
        </>
      ) : (
        <>
          <path d="M2.5 10s2.9-5.5 7.5-5.5S17.5 10 17.5 10 14.6 15.5 10 15.5 2.5 10 2.5 10Z" />
          <circle cx="10" cy="10" r="2.5" />
        </>
      )}
    </svg>
  );
}

export default function PasswordField({
  label = 'Password',
  value,
  onChange,
  required = false,
  minLength,
  autoComplete = 'current-password',
  placeholder,
  className = 'form-control',
  disabled = false,
  icon = null,
}) {
  const [show, setShow] = useState(false);

  return (
    <label style={{ display: 'grid', gap: 6 }}>
      {label}
      <div style={{ position: 'relative' }}>
        {icon && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              color: '#8fa2c0',
              pointerEvents: 'none',
            }}
          >
            {icon}
          </span>
        )}
        <input
          className={className}
          type={show ? 'text' : 'password'}
          required={required}
          minLength={minLength}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            paddingRight: 42,
            paddingLeft: icon ? 42 : undefined,
            width: '100%',
            boxSizing: 'border-box',
          }}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          disabled={disabled}
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            border: 0,
            background: 'transparent',
            color: '#175888',
            display: 'flex',
            cursor: disabled ? 'not-allowed' : 'pointer',
            padding: 4,
          }}
        >
          <EyeIcon off={show} />
        </button>
      </div>
    </label>
  );
}
