import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { listArticles } from '../../api/articles';
import { listCategories } from '../../api/categories';
import ArticleCard from '../../components/ArticleCard';

export default function NewsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    district: searchParams.get('district') || '',
    search: searchParams.get('search') || '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, []);

  async function loadData() {
    try {
      const [articlesRes, catsRes] = await Promise.all([
        listArticles({ limit: 1000 }),
        listCategories(),
      ]);
      setArticles(articlesRes.data.data.articles);
      setCategories(catsRes.data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load news');
    } finally {
      setLoading(false);
    }
  }

  async function applyFilters(e) {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const res = await listArticles({ ...filters, limit: 1000 });
      setArticles(res.data.data.articles);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to filter articles');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading">Loading news...</div>;
  if (error) return <div className="error">{error}</div>;

  const activeCategory = categories.find((c) => String(c.category_id) === filters.category);

  return (
    <div className="container">
      <h1 className="page-title">{activeCategory ? `${activeCategory.category_name} News` : 'Latest News'}</h1>

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
        <button type="submit" className="btn btn-primary">Filter</button>
        {(filters.category || filters.search) && (
          <button type="button" className="btn btn-secondary" onClick={() => { setFilters({ category: '', district: '', search: '' }); loadData(); }}>Clear</button>
        )}
      </form>

      {articles.length === 0 ? (
        <div className="empty">No articles found.</div>
      ) : (
        <div className="grid grid-3">
          {articles.map((a) => <ArticleCard key={a.article_id} article={a} />)}
        </div>
      )}
    </div>
  );
}
