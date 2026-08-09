import { useState } from 'react';
import { api } from '../api/client';

export default function AppointmentWidget() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', service: '', notes: '' });
  const [msg, setMsg] = useState('');

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          left: 16,
          bottom: 90,
          zIndex: 90,
          background: '#175888',
          color: '#fff',
          border: 0,
          borderRadius: 999,
          padding: '12px 18px',
          fontWeight: 700,
          boxShadow: '0 4px 14px rgba(0,0,0,.2)',
          cursor: 'pointer',
        }}
      >
        Book Appointment
      </button>
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.45)',
            zIndex: 10000,
            display: 'grid',
            placeItems: 'center',
            padding: 16,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            className="feature-card"
            style={{ width: '100%', maxWidth: 420, padding: 24, background: '#fff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Book an Appointment</h3>
            <form
              style={{ display: 'grid', gap: 10 }}
              onSubmit={async (e) => {
                e.preventDefault();
                await api('/appointments', { method: 'POST', body: form });
                setMsg('Request received. We will confirm shortly.');
                setForm({ name: '', phone: '', email: '', service: '', notes: '' });
              }}
            >
              {['name', 'phone', 'email', 'service'].map((k) => (
                <input
                  key={k}
                  className="form-control"
                  placeholder={k}
                  value={form[k]}
                  required={k === 'name' || k === 'phone'}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                />
              ))}
              <textarea
                className="form-control"
                placeholder="Notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <button type="submit" className="btn btn-gold">
                Submit
              </button>
              {msg && <p style={{ color: 'green' }}>{msg}</p>}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
