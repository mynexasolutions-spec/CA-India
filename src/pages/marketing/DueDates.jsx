import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import Seo from '../../components/seo/Seo';

export default function DueDates() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api('/due-dates').then(setItems).catch(() => setItems([]));
  }, []);

  return (
    <>
      <Seo
        title="Compliance Due Date Calendar | A B KHAN & ASSOCIATES"
        description="Upcoming GST, Income Tax, TDS and ROC compliance due dates."
        path="/knowledge-centre/due-dates"
      />
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow" style={{ color: 'var(--gold-light)' }}>
            Due Dates
          </p>
          <h1>Compliance Calendar</h1>
          <p>Stay ahead of filing deadlines with our curated due date list.</p>
          <Link to="/knowledge-centre" className="btn btn-outline">
            ← Knowledge Centre
          </Link>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 12, borderBottom: '2px solid #ddd' }}>Due date</th>
                  <th style={{ textAlign: 'left', padding: 12, borderBottom: '2px solid #ddd' }}>Title</th>
                  <th style={{ textAlign: 'left', padding: 12, borderBottom: '2px solid #ddd' }}>Type</th>
                  <th style={{ textAlign: 'left', padding: 12, borderBottom: '2px solid #ddd' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.id}>
                    <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>
                      {new Date(d.due_on).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>{d.title}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>{(d.type || '').toUpperCase()}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>{d.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
