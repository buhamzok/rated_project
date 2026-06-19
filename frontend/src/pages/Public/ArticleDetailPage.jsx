import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getArticle, addView, deleteArticle } from '../../api/articles';
import { listComments, createComment } from '../../api/categories';
import { resolveImageUrl, isPlaceholderUrl } from '../../api/imageUtils';
import { useAuth } from '../../context/AuthContext';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' });
}

function categoryClass(name) {
  const map = { Politics: 'politics', Business: 'business', Sports: 'sports', Technology: 'technology', Health: 'health' };
  return map[name] || 'default';
}

function readTime(content) {
  if (!content) return '1 min read';
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

export default function ArticleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [article, setArticle] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadArticle();
    addView(id).catch(() => {});
  }, [id]);

  async function loadArticle() {
    try {
      const [articleRes, commentsRes] = await Promise.all([
        getArticle(id),
        listComments(id),
      ]);
      setArticle(articleRes.data.data);
      setComments(commentsRes.data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Article not found');
    } finally {
      setLoading(false);
    }
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await createComment({ article_id: id, comment_text: commentText });
      setCommentText('');
      const res = await listComments(id);
      setComments(res.data.data);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="loading">Loading article...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!article) return <div className="empty">Article not found.</div>;

  const isPlaceholder = isPlaceholderUrl(article.cover_image_url);
  const canManage = user && (user.roles.includes('editor') || user.roles.includes('super_admin') || user.roles.includes('administrator'));
  const attribution = article.source_type === 'scraped'
    ? (article.source_name ? `Source: ${article.source_name}` : 'Scraped')
    : (article.journalist_name || 'Staff writer');

  return (
    <div className="container article-detail">
      <div className="article-detail-header">
        <div className="card-meta">
          {article.category_name && <span className={`badge badge-${categoryClass(article.category_name)}`}>{article.category_name}</span>}
          {article.district_name && <span className="badge badge-default">{article.district_name}</span>}
          {article.source_type === 'scraped' && <span className="badge badge-source">Scraped</span>}
        </div>

        <h1>{article.title}</h1>
        <p className="byline">
          By {attribution} • {formatDate(article.published_at)} • {article.views} views • {readTime(article.content)}
        </p>
        {canManage && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <Link to={`/journalist/edit/${article.article_id}`} className="btn btn-secondary">Edit</Link>
            <button
              type="button"
              className="btn btn-danger"
              onClick={async () => {
                if (!window.confirm('Are you sure you want to delete this article?')) return;
                try {
                  await deleteArticle(article.article_id);
                  navigate('/');
                } catch (err) {
                  alert(err.response?.data?.error?.message || 'Failed to delete article');
                }
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {isPlaceholder ? (
        <div className="card-img-placeholder article-detail-cover">
          {article.category_name || 'News'}
        </div>
      ) : (
        <>
          <img
            className="article-detail-cover"
            src={resolveImageUrl(article.cover_image_url)}
            alt={article.title}
            onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
          />
          {article.cover_image_credit && <div className="credit">{article.cover_image_credit}</div>}
        </>
      )}

      <div className="content">
        {article.content.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
      </div>

      {article.source_type === 'scraped' && article.source_url && (
        <p className="source-link">
          <a href={article.source_url} target="_blank" rel="noreferrer">Read original at {article.source_name}</a>
        </p>
      )}

      <section className="comments-section">
        <h2>Comments ({comments.length})</h2>
        {comments.length === 0 && <p className="empty">No comments yet.</p>}
        {comments.map((c) => (
          <div key={c.comment_id} className="comment">
            <div className="author">{c.full_name}</div>
            <div className="date">{formatDate(c.created_at)}</div>
            <p>{c.comment_text}</p>
          </div>
        ))}

        {user ? (
          <form className="comment-form form" onSubmit={submitComment}>
            <label>Add a comment</label>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write your comment..."
              required
            />
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Posting...' : 'Post Comment'}
            </button>
          </form>
        ) : (
          <p><Link to="/login">Login</Link> to post a comment.</p>
        )}
      </section>
    </div>
  );
}
