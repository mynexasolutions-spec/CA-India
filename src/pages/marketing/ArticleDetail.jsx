import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import Seo from '../../components/seo/Seo';

export default function ArticleDetail() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/articles/${slug}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [slug]);

  if (error) {
    return (
      <section className="page-hero">
        <div className="container">
          <h1>Article not found</h1>
          <p>{error}</p>
          <Link to="/knowledge-centre" className="btn btn-gold">
            Back to Knowledge Centre
          </Link>
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="section">
        <div className="container">Loading…</div>
      </section>
    );
  }

  const a = data.article;

  return (
    <>
      <Seo
        title={a.meta_title || `${a.title} | A B KHAN & ASSOCIATES`}
        description={a.meta_description || a.excerpt || ''}
        path={`/knowledge-centre/${a.slug}`}
        type="article"
      />
      <div className="breadcrumb">
        <div className="container">
          <Link to="/">Home</Link>
          <span className="sep">/</span>
          <Link to="/knowledge-centre">Knowledge Centre</Link>
          <span className="sep">/</span>
          <span className="current">{a.title}</span>
        </div>
      </div>
      <article className="section">
        <div className="container" style={{ maxWidth: 800 }}>
          <p className="eyebrow">{a.category?.name}</p>
          <h1>{a.title}</h1>
          <p style={{ opacity: 0.7 }}>
            {a.published_at ? new Date(a.published_at).toLocaleDateString('en-IN') : ''}
            {a.author?.name ? ` · ${a.author.name}` : ''}
          </p>
          <div dangerouslySetInnerHTML={{ __html: a.body }} />
          {!!data.related?.length && (
            <div style={{ marginTop: 40 }}>
              <h3>Related articles</h3>
              <ul>
                {data.related.map((r) => (
                  <li key={r.id}>
                    <Link to={`/knowledge-centre/${r.slug}`}>{r.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </article>
    </>
  );
}
