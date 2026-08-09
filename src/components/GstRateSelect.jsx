import { GST_RATES } from '../pages/billing/billingUtils';

export default function GstRateSelect({ value, onChange, disabled = false, className = 'bp-input' }) {
  const rate = GST_RATES.includes(Number(value)) ? Number(value) : 18;

  return (
    <select
      className={className}
      value={rate}
      onChange={(e) => onChange(+e.target.value)}
      disabled={disabled}
    >
      {GST_RATES.map((r) => (
        <option key={r} value={r}>{r}%</option>
      ))}
    </select>
  );
}
