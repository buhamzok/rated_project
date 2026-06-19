import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listArticles, deleteArticle } from '../../api/articles';
import ArticleCard from '../../components/ArticleCard';

const statusLabels = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  returned: 'Returned',
  published: 'Published',
  rejected: 'Rejected',
};

export default function PublishedArticlesPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadArticles();
  }, []);

  async function loadArticles() {
    try {
      const res = await listArticles({ limit: 1000 });
      setArticles(res.data.data.articles);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this article?')) return;
    try {
      await deleteArticle(id);
      setArticles((prev) => prev.filter((a) => a.article_id !== id));
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete article');
    }
  }

  if (loading) return <div className="loading">Loading articles...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="container">
      <h1 className="page-title">Published Articles</h1>

      {articles.length === 0 ? (
        <div className="empty">No articles found.</div>
      ) : (
        <div className="grid grid-3">
          {articles.map((a) => (
            <div key={a.article_id} className="card">
              <ArticleCard article={a} />
              <div style={{ padding: '0 0.75rem 0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="badge badge-default">{statusLabels[a.status] || a.status}</span>
                <Link to={`/journalist/edit/${a.article_id}`} className="btn btn-secondary">Edit</Link>
                <button type="button" className="btn btn-danger" onClick={() => handleDelete(a.article_id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
