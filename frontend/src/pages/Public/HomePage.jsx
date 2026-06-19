import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listArticles } from '../../api/articles';
import { listCategories, listDistricts } from '../../api/categories';
import ArticleCard from '../../components/ArticleCard';
import { resolveImageUrl, isPlaceholderUrl } from '../../api/imageUtils';

const CHEVRON_RIGHT = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function categoryIconColor(name) {
  const map = {
    Politics: '#dc2626',
    Business: '#059669',
    Sports: '#2563eb',
    Technology: '#7c3aed',
    Health: '#0891b2',
  };
  return map[name] || '#6b7280';
}

function categoryInitial(name) {
  return name ? name.slice(0, 1) : 'N';
}

function resolveThumb(url) {
  return resolveImageUrl(url);
}

function ArticleSlideshow({ articles }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (articles.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % articles.length);
    }, 6000);
    return () => clearInterval(id);
  }, [articles.length]);

  if (articles.length === 0) return <div className="empty">No featured articles.</div>;

  const current = articles[index];

  return (
    <div className="slideshow">
      <div className="slideshow-card">
        <ArticleCard article={current} size="large" />
      </div>
      {articles.length > 1 && (
        <div className="slideshow-dots">
          {articles.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`slideshow-dot ${i === index ? 'active' : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`Show featured article ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    district: searchParams.get('district') || '',
    search: searchParams.get('search') || '',
  });
  const [breakingIndex, setBreakingIndex] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (filters.category || filters.district || filters.search) {
      applyFilters();
    }
  }, []);

  useEffect(() => {
    if (articles.length < 2) return;
    const id = setInterval(() => {
      setBreakingIndex((i) => (i + 1) % Math.min(articles.length, 4));
    }, 5000);
    return () => clearInterval(id);
  }, [articles.length]);

  async function loadData() {
    try {
      const [articlesRes, catsRes, distRes] = await Promise.all([
        listArticles(),
        listCategories(),
        listDistricts(),
      ]);
      setArticles(articlesRes.data.data.articles);
      setCategories(catsRes.data.data);
      setDistricts(distRes.data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load homepage');
    } finally {
      setLoading(false);
    }
  }

  async function applyFilters(e) {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const res = await listArticles(filters);
      setArticles(res.data.data.articles);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to filter articles');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading">Loading news...</div>;
  if (error) return <div className="error">{error}</div>;

  const isFiltering = filters.category || filters.district || filters.search;
  const hero = articles[0];
  const breakingHeadlines = articles.slice(0, 4);
  const latest = articles.slice(1, 6);
  const latestNews = articles.slice(1);
  const featured = articles;

  const districtCounts = districts.map((d) => ({
    ...d,
    count: articles.filter((a) => a.district_name === d.district_name).length,
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="container">
      {!isFiltering && breakingHeadlines.length >= 2 && (
        <div className="breaking-strip">
          <div className="breaking-inner">
            <span className="badge badge-breaking">BREAKING NEWS</span>
            <div className="breaking-headlines">
              <Link to={`/article/${breakingHeadlines[breakingIndex].article_id}`}>
                {breakingHeadlines[breakingIndex].title}
              </Link>
            </div>
            <div className="breaking-dots">
              {breakingHeadlines.map((_, i) => (
                <button
                  key={i}
                  className={`breaking-dot ${i === breakingIndex ? 'active' : ''}`}
                  onClick={() => setBreakingIndex(i)}
                  aria-label={`Breaking headline ${i + 1}`}
                  type="button"
                />
              ))}
            </div>
            {CHEVRON_RIGHT}
          </div>
        </div>
      )}

      <form className="filters" onSubmit={applyFilters}>
        <input
          type="text"
          placeholder="Search articles..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
        </select>
        <select value={filters.district} onChange={(e) => setFilters({ ...filters, district: e.target.value })}>
          <option value="">All Districts</option>
          {districts.map((d) => <option key={d.district_id} value={d.district_id}>{d.district_name}</option>)}
        </select>
        <button type="submit" className="btn btn-primary">Filter</button>
        {isFiltering && <button type="button" className="btn btn-secondary" onClick={() => { setFilters({ category: '', district: '', search: '' }); loadData(); }}>Clear</button>}
      </form>

      {articles.length === 0 ? (
        <div className="empty">No published articles yet.</div>
      ) : isFiltering ? (
        <div className="grid grid-3">
          {articles.map((a) => <ArticleCard key={a.article_id} article={a} />)}
        </div>
      ) : (
        <>
          <section className="hero">
            <div className="hero-main">
              {hero && <ArticleCard article={hero} size="hero" />}
            </div>

            <div className="mobile-hero-scroll">
              {articles.slice(0, 3).map((a) => (
                <ArticleCard key={a.article_id} article={a} size="hero" />
              ))}
            </div>

            <aside className="hero-side">
              <h3>Latest Updates</h3>
              <div className="sidebar-list">
                {latest.map((a) => {
                  const thumb = resolveThumb(a.cover_image_url);
                  return (
                    <div key={a.article_id} className="side-article">
                      {thumb ? (
                        <img className="side-thumb" src={thumb} alt={a.title} loading="lazy" />
                      ) : (
                        <div className="side-thumb-placeholder">{categoryInitial(a.category_name)}</div>
                      )}
                      <div>
                        <div className="side-article-title">
                          <Link to={`/article/${a.article_id}`}>{a.title}</Link>
                        </div>
                        <div className="card-meta">{formatDate(a.published_at || a.created_at)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <h3 style={{ marginTop: '1rem' }}>Popular Districts</h3>
              <ul className="sidebar-list">
                {districtCounts.slice(0, 5).map((d) => (
                  <li key={d.district_id}>
                    {d.district_name} <span className="card-meta">({d.count} articles)</span>
                  </li>
                ))}
              </ul>
            </aside>
          </section>

          <nav className="category-row">
            {categories.map((c) => (
              <Link key={c.category_id} to={`/?category=${c.category_id}`} className="category-chip">
                <span className="category-icon" style={{ backgroundColor: categoryIconColor(c.category_name) }}>{categoryInitial(c.category_name)}</span>
                <span>{c.category_name}</span>
              </Link>
            ))}
          </nav>

          <section className="latest-news">
            <div className="section-heading">
              <h2>Latest News</h2>
              <Link to="/news">View all</Link>
            </div>
            <div className="grid grid-3">
              {latestNews.slice(0, 6).length > 0 ? latestNews.slice(0, 6).map((a) => <ArticleCard key={a.article_id} article={a} />) : (
                <div className="empty">No more articles.</div>
              )}
            </div>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <div className="section-heading">
              <h2>Featured Articles</h2>
            </div>
            <ArticleSlideshow articles={featured} />
          </section>
        </>
      )}
    </div>
  );
}
