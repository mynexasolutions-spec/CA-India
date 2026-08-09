import { useState } from 'react';

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
}) {
  const [show, setShow] = useState(false);

  return (
    <label style={{ display: 'grid', gap: 6 }}>
      {label}
      <div style={{ position: 'relative' }}>
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
          style={{ paddingRight: 76, width: '100%', boxSizing: 'border-box' }}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          disabled={disabled}
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            border: 0,
            background: 'transparent',
            color: '#175888',
            fontWeight: 700,
            fontSize: 12,
            cursor: disabled ? 'not-allowed' : 'pointer',
            padding: '4px 6px',
          }}
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
    </label>
  );
}
