import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const pages = import.meta.glob('../pages/generated/*.json', { eager: true });

function getPage(slug) {
  const mod = pages[`../pages/generated/${slug}.json`];
  return mod?.default || mod || null;
}

function formToObject(form) {
  const data = {};
  new FormData(form).forEach((value, key) => {
    data[key] = value;
  });
  return data;
}

export default function HtmlPage({ slug }) {
  const navigate = useNavigate();
  const ref = useRef(null);
  const page = getPage(slug);

  useEffect(() => {
    if (!page) return;
    document.title = page.title || 'A B KHAN & ASSOCIATES';
    const meta = document.querySelector('meta[name="description"]');
    if (meta && page.description) meta.setAttribute('content', page.description);
  }, [page]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const onClick = (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) {
        return;
      }
      if (href.startsWith('/')) {
        e.preventDefault();
        navigate(href);
      }
    };

    const onFaq = (e) => {
      const q = e.target.closest('.faq-q');
      if (!q || !root.contains(q)) return;
      const item = q.closest('.faq-item');
      const group = item?.closest('.faq-list');
      if (group) {
        group.querySelectorAll('.faq-item').forEach((i) => {
          if (i !== item) i.classList.remove('open');
        });
      }
      item?.classList.toggle('open');
    };

    const onSubmit = async (e) => {
      const form = e.target.closest('form[data-demo-form], form[data-contact-form]');
      if (!form || !root.contains(form)) return;
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const payload = formToObject(form);
      const success = form.querySelector('.form-success');
      const errorEl = form.querySelector('.form-error');
      try {
        await api('/contact', {
          method: 'POST',
          body: {
            name: payload.name || payload.full_name || '',
            phone: payload.phone || payload.mobile || '',
            email: payload.email || '',
            service: payload.service || payload.subject || '',
            message: payload.message || payload.notes || 'Website enquiry',
          },
        });
        if (success) success.style.display = 'block';
        if (errorEl) errorEl.style.display = 'none';
        form.reset();
      } catch (err) {
        if (errorEl) {
          errorEl.textContent = err.message;
          errorEl.style.display = 'block';
        } else if (success) {
          success.style.display = 'block';
          success.textContent = err.message;
        }
      }
    };

    const counters = root.querySelectorAll('.why-item[data-count]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const target = +el.dataset.count;
          const span = el.querySelector('.counter');
          if (!span) return;
          let cur = 0;
          const step = Math.ceil(target / 40) || 1;
          const timer = setInterval(() => {
            cur += step;
            if (cur >= target) {
              cur = target;
              clearInterval(timer);
            }
            span.textContent = cur;
          }, 30);
          observer.unobserve(el);
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach((c) => observer.observe(c));

    root.addEventListener('click', onClick);
    root.addEventListener('click', onFaq);
    root.addEventListener('submit', onSubmit);

    return () => {
      root.removeEventListener('click', onClick);
      root.removeEventListener('click', onFaq);
      root.removeEventListener('submit', onSubmit);
      observer.disconnect();
    };
  }, [slug, navigate, page]);

  if (!page) {
    return (
      <section className="page-hero">
        <div className="container">
          <h1>Page not found</h1>
          <p>The page you requested could not be loaded.</p>
        </div>
      </section>
    );
  }

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: page.html }} />;
}
