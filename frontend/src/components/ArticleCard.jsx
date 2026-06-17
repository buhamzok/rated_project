import { useState } from 'react';
import { Link } from 'react-router-dom';
import { resolveImageUrl, isPlaceholderUrl } from '../api/imageUtils';
import { apiOrigin } from '../api/client';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
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

function excerpt(text, max = 140) {
  if (!text) return '';
  const plain = text.replace(/\*\*/g, '').replace(/\n/g, ' ').trim();
  if (plain.length <= max) return plain;
  return plain.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

export default function ArticleCard({ article, size = 'medium' }) {
  const [imgError, setImgError] = useState(false);
  const rawUrl = article.cover_image_url;
  let resolvedUrl = resolveImageUrl(rawUrl);
  if (resolvedUrl && resolvedUrl.startsWith('/')) {
    resolvedUrl = `${apiOrigin}${resolvedUrl}`;
  }
  const isPlaceholder = !resolvedUrl || isPlaceholderUrl(rawUrl) || imgError;

  const attribution = article.source_type === 'scraped'
    ? (article.source_name ? `Source: ${article.source_name}` : 'Scraped')
    : (article.journalist_name || 'Staff writer');

  if (size === 'hero') {
    return (
      <article className="card card-hero">
        <span className="badge badge-top-story">TOP STORY</span>
        {isPlaceholder ? (
          <div className="card-img-placeholder">{article.category_name || 'News'}</div>
        ) : (
          <img className="card-img" src={resolvedUrl} alt={article.title} loading="eager" onError={() => setImgError(true)} />
        )}
        <div className="hero-overlay" />
        <div className="card-body">
          <div className="card-meta">
            {article.category_name && <span className={`badge badge-${categoryClass(article.category_name)}`}>{article.category_name}</span>}
            <span>{formatDate(article.published_at || article.created_at)}</span>
            <span>{readTime(article.content)}</span>
          </div>
          <h2 className="card-title">
            <Link to={`/article/${article.article_id}`}>{article.title}</Link>
          </h2>
          <p className="hero-excerpt">{excerpt(article.content)}</p>
          <div className="card-meta">
            <span>{attribution}</span>
            {article.district_name && <span>• {article.district_name}</span>}
            {article.views !== undefined && <span>• {article.views} views</span>}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={`card card-${size}`}>
      {isPlaceholder ? (
        <div className="card-img-placeholder" style={{ backgroundColor: getCategoryColor(article.category_name) }}>
          {article.category_name || 'News'}
        </div>
      ) : (
        <img className="card-img" src={resolvedUrl} alt={article.title} loading="lazy" onError={() => setImgError(true)} />
      )}
      <div className="card-body">
        <div className="card-meta">
          {article.category_name && <span className={`badge badge-${categoryClass(article.category_name)}`}>{article.category_name}</span>}
          {article.source_type === 'scraped' && <span className="badge badge-source">Scraped</span>}
          <span>{formatDate(article.published_at || article.created_at)}</span>
        </div>
        <h3 className="card-title">
          <Link to={`/article/${article.article_id}`}>{article.title}</Link>
        </h3>
        <div className="card-meta">
          <span>{attribution}</span>
          {article.district_name && <span>• {article.district_name}</span>}
          {article.views !== undefined && <span>• {article.views} views</span>}
        </div>
      </div>
    </article>
  );
}

function getCategoryColor(name) {
  const colors = {
    Politics: '#fee2e2',
    Business: '#d1fae5',
    Sports: '#dbeafe',
    Technology: '#ede9fe',
    Health: '#cffafe',
  };
  return colors[name] || '#f3f4f6';
}
