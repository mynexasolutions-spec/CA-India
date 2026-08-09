import { useEffect, useState } from 'react';
import { api } from '../../api/client';

export default function AdminOverview() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/admin/dashboard').then(setData).catch(console.error); }, []);
  if (!data) return <p>Loading…</p>;
  const o = data.overview || {};

  return (
    <div className="ao-wrap">
      <h2 className="ao-title">OVERVIEW</h2>
      <div className="ao-grid-3">
        <div className="ao-stat ao-stat-blue">
          <div className="ao-stat-icon">👥</div>
          <div className="ao-stat-num">{o.total_clients ?? 0}</div>
          <div className="ao-stat-label">TOTAL CLIENTS</div>
          <div className="ao-stat-sub">All registered clients</div>
        </div>
        <div className="ao-stat ao-stat-green">
          <div className="ao-stat-icon">✓</div>
          <div className="ao-stat-num">{o.active_clients ?? 0}</div>
          <div className="ao-stat-label">ACTIVE CLIENTS</div>
          <div className="ao-stat-sub">Currently active clients</div>
        </div>
        <div className="ao-stat ao-stat-red">
          <div className="ao-stat-icon">✕</div>
          <div className="ao-stat-num">{o.inactive_clients ?? 0}</div>
          <div className="ao-stat-label">INACTIVE CLIENTS</div>
          <div className="ao-stat-sub">Inactive / closed clients</div>
        </div>
      </div>
    </div>
  );
}
