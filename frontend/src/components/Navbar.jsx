import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listCategories } from '../api/categories';

const X_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const INSTAGRAM_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zm0 10.162a3.999 3.999 0 110-7.998 3.999 3.999 0 010 7.998zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

const MENU_ICON = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const CLOSE_ICON = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SEARCH_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export default function Navbar() {
  const { user, logout, hasRole } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let mounted = true;
    listCategories().then((res) => {
      if (mounted) setCategories(res.data.data.slice(0, 6));
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const today = new Date().toLocaleDateString('en-UG', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const roleLinks = [
    { role: 'journalist', label: 'Journalist', to: '/journalist' },
    { role: 'editor', label: 'Editor', to: '/editor' },
    { role: 'administrator', label: 'Admin', to: '/admin' },
    { role: 'super_admin', label: 'Admin', to: '/admin' },
  ];

  return (
    <>
      <div className="utility-bar">
        <div className="utility-bar-left">
          <span>Follow Us:</span>
          <div className="social-links">
            <a href="https://x.com/rateduganda?s=11" target="_blank" rel="noreferrer" aria-label="X (Twitter)">{X_ICON}</a>
            <a href="https://www.instagram.com/rateduganda?igsh=MTkxaHBrNmM3YTV2aw%3D%3D&utm_source=qr" target="_blank" rel="noreferrer" aria-label="Instagram">{INSTAGRAM_ICON}</a>
          </div>
        </div>
        <div className="utility-bar-right">{today}</div>
      </div>

      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="wordmark">
            <span className="wordmark-stripe">
              <span className="stripe-red" />
              <span className="stripe-yellow" />
              <span className="stripe-black" />
            </span>
            <span className="wordmark-text">
              <span className="wordmark-rated">RATED</span>
              <span className="wordmark-uganda">UGANDA</span>
            </span>
          </Link>

          <nav className="desktop-nav">
            <Link to="/">Home</Link>
            {categories.map((c) => (
              <Link key={c.category_id} to={`/?category=${c.category_id}`}>{c.category_name}</Link>
            ))}
            {roleLinks
              .filter((l) => hasRole(l.role))
              .filter((l, i, arr) => arr.findIndex((x) => x.to === l.to) === i)
              .map((l) => (
                <Link key={l.to} to={l.to}>{l.label}</Link>
              ))}
          </nav>

          <div className="header-actions">
            <button className="icon-button" type="button" aria-label="Search">{SEARCH_ICON}</button>
            {user ? (
              <div className="user-menu">
                <span>{user.full_name}</span>
                <button onClick={logout}>Logout</button>
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-login">Login</Link>
                <Link to="/register" className="btn-signup">Sign Up</Link>
              </>
            )}
            <button
              className="hamburger"
              type="button"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileOpen((o) => !o)}
            >
              {mobileOpen ? CLOSE_ICON : MENU_ICON}
            </button>
          </div>
        </div>
      </header>

      <nav className={`mobile-menu ${mobileOpen ? 'open' : ''}`}>
        <Link to="/" onClick={() => setMobileOpen(false)}>Home</Link>
        {categories.map((c) => (
          <Link key={c.category_id} to={`/?category=${c.category_id}`} onClick={() => setMobileOpen(false)}>{c.category_name}</Link>
        ))}
        {roleLinks
          .filter((l) => hasRole(l.role))
          .filter((l, i, arr) => arr.findIndex((x) => x.to === l.to) === i)
          .map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)}>{l.label}</Link>
          ))}
        {user ? (
          <button onClick={() => { setMobileOpen(false); logout(); }}>Logout</button>
        ) : (
          <>
            <Link to="/login" onClick={() => setMobileOpen(false)}>Login</Link>
            <Link to="/register" onClick={() => setMobileOpen(false)}>Sign Up</Link>
          </>
        )}
      </nav>
    </>
  );
}
