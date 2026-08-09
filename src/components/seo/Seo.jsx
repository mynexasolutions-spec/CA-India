import { useEffect } from 'react';

const SITE = 'https://abkhanassociates.com';
const DEFAULT_DESC =
  'A B KHAN & ASSOCIATES — Chartered Accountants in Navi Mumbai for Accounting, Taxation, Audit, GST, Business Registration and Corporate Compliance.';

export default function Seo({
  title = 'A B KHAN & ASSOCIATES | Chartered Accountants, Navi Mumbai',
  description = DEFAULT_DESC,
  path = '/',
  type = 'website',
  jsonLd,
}) {
  useEffect(() => {
    document.title = title;
    const setMeta = (attr, key, content) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:url', SITE + path);
    setMeta('property', 'og:site_name', 'A B KHAN & ASSOCIATES');
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);

    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', SITE + path);

    const scriptId = 'abkhan-jsonld';
    let script = document.getElementById(scriptId);
    if (jsonLd) {
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    }
  }, [title, description, path, type, jsonLd]);

  return null;
}

export const firmJsonLd = {
  '@context': 'https://schema.org',
  '@type': ['AccountingService', 'LocalBusiness'],
  name: 'A B KHAN & ASSOCIATES',
  description: DEFAULT_DESC,
  url: SITE,
  telephone: '+918286681960',
  email: 'abkhanassociates@gmail.com',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'A Wing 401, Nerul Aakash Ganga CHS, Plot No. B-71, Seawoods East, Sector 23',
    addressLocality: 'Navi Mumbai',
    addressRegion: 'Maharashtra',
    postalCode: '400706',
    addressCountry: 'IN',
  },
  openingHours: 'Mo-Sa 10:00-19:00',
};
