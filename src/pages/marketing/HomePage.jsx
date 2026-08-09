import HtmlPage from '../../components/HtmlPage';
import Seo, { firmJsonLd } from '../../components/seo/Seo';

export default function HomePage() {
  return (
    <>
      <Seo path="/" jsonLd={firmJsonLd} />
      <HtmlPage slug="index" />
    </>
  );
}
