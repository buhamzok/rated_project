import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getArticle, updateArticle } from '../../api/articles';
import { listCategories, listDistricts } from '../../api/categories';

export default function EditArticlePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [articleRes, cats, dists] = await Promise.all([
          getArticle(id),
          listCategories(),
          listDistricts(),
        ]);
        const a = articleRes.data.data;
        if (!['draft', 'returned'].includes(a.status)) {
          setError('This article cannot be edited in its current status.');
          setLoading(false);
          return;
        }
        setForm({
          title: a.title,
          content: a.content,
          category_id: a.category_id || '',
          district_id: a.district_id || '',
        });
        setCategories(cats.data.data);
        setDistricts(dists.data.data);
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
    setLoading(true);
    try {
      const payload = {
        ...form,
        category_id: form.category_id ? Number(form.category_id) : undefined,
        district_id: form.district_id ? Number(form.district_id) : undefined,
      };
      await updateArticle(id, payload);
      navigate('/journalist');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update article');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!form) return null;

  return (
    <div className="container">
      <h1 className="page-title">Edit Article</h1>
      <form className="form" onSubmit={handleSubmit}>
        <label>Title</label>
        <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

        <label>Content</label>
        <textarea required minLength={50} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />

        <label>Category</label>
        <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
          <option value="">Select category</option>
          {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
        </select>

        <label>District</label>
        <select value={form.district_id} onChange={(e) => setForm({ ...form, district_id: e.target.value })}>
          <option value="">Select district</option>
          {districts.map((d) => <option key={d.district_id} value={d.district_id}>{d.district_name}</option>)}
        </select>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>Save Changes</button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/journalist')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
