import { INDIAN_STATES } from '../data/indianStates';

/**
 * GST state dropdown.
 * - valueMode "code": value is state_code (e.g. "27")
 * - valueMode "name": value is state name (e.g. "Maharashtra")
 * onChange(code, name) always receives both.
 */
export default function StateSelect({
  value = '',
  onChange,
  valueMode = 'code',
  className = 'bp-select',
  required = false,
  placeholder = 'Select state…',
  id,
  disabled = false,
}) {
  const selected = (() => {
    if (!value) return '';
    if (valueMode === 'name') {
      const byName = INDIAN_STATES.find((s) => s.name === value);
      return byName?.code || '';
    }
    return String(value).padStart(2, '0');
  })();

  return (
    <select
      id={id}
      className={className}
      value={selected}
      required={required}
      disabled={disabled}
      onChange={(e) => {
        const code = e.target.value;
        const row = INDIAN_STATES.find((s) => s.code === code);
        onChange?.(code, row?.name || '');
      }}
    >
      <option value="">{placeholder}</option>
      {INDIAN_STATES.map((s) => (
        <option key={s.code} value={s.code}>
          {s.code} — {s.name}
        </option>
      ))}
    </select>
  );
}
