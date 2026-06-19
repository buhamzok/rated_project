import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyArticles, deleteArticle } from '../../api/articles';
import ArticleCard from '../../components/ArticleCard';

const statusLabels = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  returned: 'Returned',
  published: 'Published',
  rejected: 'Rejected',
};

export default function DashboardPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadArticles();
  }, []);

  async function loadArticles() {
    try {
      const res = await getMyArticles();
      setArticles(res.data.data);
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

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Journalist Dashboard</h1>
        <Link to="/journalist/new" className="btn btn-primary">+ New Article</Link>
      </div>

      {articles.length === 0 ? (
        <div className="empty">No articles yet. <Link to="/journalist/new">Write your first article</Link>.</div>
      ) : (
        <div className="grid grid-3">
          {articles.map((a) => (
            <div key={a.article_id} className="card">
              <ArticleCard article={a} />
              <div style={{ padding: '0 0.75rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="badge badge-default">{statusLabels[a.status] || a.status}</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {(a.status === 'draft' || a.status === 'returned') && (
                    <Link to={`/journalist/edit/${a.article_id}`} className="btn btn-secondary">Edit</Link>
                  )}
                  <button type="button" className="btn btn-danger" onClick={() => handleDelete(a.article_id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
