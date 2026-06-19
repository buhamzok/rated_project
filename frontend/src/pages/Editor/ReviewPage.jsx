import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getArticle, reviewArticle } from '../../api/articles';
import { listCategories, listDistricts } from '../../api/categories';

export default function ReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [decision, setDecision] = useState('approved');
  const [feedback, setFeedback] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [articleRes, cats, dists] = await Promise.all([
          getArticle(id),
          listCategories(),
          listDistricts(),
        ]);
        const a = articleRes.data.data;
        setArticle(a);
        setCategories(cats.data.data);
        setDistricts(dists.data.data);
        setCategoryId(a.category_id || '');
        setDistrictId(a.district_id || '');
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Failed to load article');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (article.source_type === 'scraped' && !categoryId) {
      setError('Category is required for scraped articles.');
      return;
    }
    setLoading(true);
    try {
      await reviewArticle(id, {
        decision,
        feedback,
        category_id: categoryId ? Number(categoryId) : undefined,
        district_id: districtId ? Number(districtId) : undefined,
      });
      navigate('/editor');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Review failed');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!article) return <div className="empty">Article not found.</div>;

  const isScraped = article.source_type === 'scraped';

  return (
    <div className="container">
      <h1 className="page-title">Review Article</h1>
      <h2>{article.title}</h2>
      <p style={{ color: 'var(--text-muted)' }}>
        Source type: <strong>{isScraped ? `Scraped from ${article.source_name}` : 'Staff'}</strong>
      </p>
      <div style={{ background: 'var(--card)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
        {article.content.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
      </div>

      {isScraped && (
        <div className="error" style={{ marginBottom: '1rem' }}>
          Scraped articles require a category to auto-assign a stock thumbnail on approval.
        </div>
      )}

      <form className="form" onSubmit={handleSubmit}>
        <label>Decision</label>
        <select value={decision} onChange={(e) => setDecision(e.target.value)}>
          <option value="approved">Approve</option>
          {!isScraped && <option value="returned">Return for Correction</option>}
          <option value="rejected">Reject</option>
        </select>

        <label>Category</label>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Select category</option>
          {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
        </select>

        <label>District</label>
        <select value={districtId} onChange={(e) => setDistrictId(e.target.value)}>
          <option value="">Select district (optional)</option>
          {districts.map((d) => <option key={d.district_id} value={d.district_id}>{d.district_name}</option>)}
        </select>

        <label>Feedback</label>
        <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Optional notes for the journalist" />

        <button type="submit" className="btn btn-primary" disabled={loading}>Submit Review</button>
      </form>
    </div>
  );
}
