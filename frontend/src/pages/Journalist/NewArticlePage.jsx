import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createArticle, submitArticle, uploadMedia } from '../../api/articles';
import { listCategories, listDistricts } from '../../api/categories';

export default function NewArticlePage() {
  const [form, setForm] = useState({ title: '', content: '', category_id: '', district_id: '' });
  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [articleId, setArticleId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const [cats, dists] = await Promise.all([listCategories(), listDistricts()]);
      setCategories(cats.data.data);
      setDistricts(dists.data.data);
    }
    load().catch((err) => setError('Failed to load form data'));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        category_id: form.category_id ? Number(form.category_id) : undefined,
        district_id: form.district_id ? Number(form.district_id) : undefined,
      };
      const res = await createArticle(payload);
      setArticleId(res.data.data.article_id);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save article');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!articleId) return;
    setLoading(true);
    try {
      await submitArticle(articleId);
      navigate('/journalist');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to submit article');
    } finally {
      setLoading(false);
    }
  }

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file || !articleId) return;
    try {
      await uploadMedia(articleId, file);
      setError('');
      alert('Media uploaded. The first image becomes the cover/thumbnail.');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Upload failed');
    }
  }

  return (
    <div className="container">
      <h1 className="page-title">New Article</h1>
      {error && <div className="error">{error}</div>}
      <form className="form" onSubmit={handleSave}>
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
          <button type="submit" className="btn btn-secondary" disabled={loading || articleId}>
            {articleId ? 'Saved' : 'Save Draft'}
          </button>
          {articleId && (
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              Submit for Review
            </button>
          )}
        </div>
      </form>

      {articleId && (
        <div className="upload-area">
          <label>Upload media (first image becomes cover)</label>
          <input type="file" accept="image/*" onChange={handleFile} />
        </div>
      )}
    </div>
  );
}
