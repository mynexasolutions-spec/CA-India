import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import Seo from '../../components/seo/Seo';

export default function KnowledgeCentre() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || '';
  const search = params.get('q') || '';
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/categories').then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (category) qs.set('category', category);
    if (search) qs.set('search', search);
    api(`/articles?${qs}`)
      .then((data) => {
        setArticles(data.data || []);
        setMeta(data);
        setError('');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [category, search]);

  return (
    <>
      <Seo
        title="Knowledge Centre | Tax & Compliance Updates | A B KHAN & ASSOCIATES"
        description="Latest Income Tax, GST, ROC and compliance updates from A B KHAN & ASSOCIATES, Navi Mumbai."
        path="/knowledge-centre"
      />
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow" style={{ color: 'var(--gold-light)' }}>
            Knowledge Centre
          </p>
          <h1>Tax Updates, Guides & Due Dates</h1>
          <p>Practical insights for business owners, founders and finance teams.</p>
          <div className="hero-actions">
            <Link to="/knowledge-centre/due-dates" className="btn btn-outline">
              Due Date Calendar
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="kc-toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
            <input
              className="form-control"
              style={{ maxWidth: 280 }}
              placeholder="Search articles…"
              defaultValue={search}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const next = new URLSearchParams(params);
                  if (e.target.value) next.set('q', e.target.value);
                  else next.delete('q');
                  setParams(next);
                }
              }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                className={`btn ${!category ? 'btn-navy' : 'btn-outline-navy'}`}
                onClick={() => {
                  const next = new URLSearchParams(params);
                  next.delete('category');
                  setParams(next);
                }}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`btn ${category === c.slug ? 'btn-navy' : 'btn-outline-navy'}`}
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.set('category', c.slug);
                    setParams(next);
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {loading && <p>Loading articles…</p>}
          {error && <p style={{ color: 'crimson' }}>{error}</p>}
          {!loading && !articles.length && <p>No articles found.</p>}

          <div className="card-grid" style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' }}>
            {articles.map((a) => (
              <article key={a.id} className="feature-card" style={{ padding: 20 }}>
                <p className="eyebrow">{a.category?.name || 'Update'}</p>
                <h3 style={{ fontSize: 18 }}>
                  <Link to={`/knowledge-centre/${a.slug}`}>{a.title}</Link>
                </h3>
                <p>{a.excerpt}</p>
                <small>{a.published_at ? new Date(a.published_at).toLocaleDateString('en-IN') : ''}</small>
              </article>
            ))}
          </div>
          {meta?.last_page > 1 && (
            <p style={{ marginTop: 16, opacity: 0.7 }}>
              Page {meta.current_page} of {meta.last_page}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
