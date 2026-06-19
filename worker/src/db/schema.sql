-- Cloudflare D1 / SQLite schema for Rated Uganda
-- Drop tables in reverse dependency order
PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS editorial_reviews;
DROP TABLE IF EXISTS article_views;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS media;
DROP TABLE IF EXISTS stock_images;
DROP TABLE IF EXISTS articles;
DROP TABLE IF EXISTS scraped_sources;
DROP TABLE IF EXISTS districts;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS super_admin;
DROP TABLE IF EXISTS admin;
DROP TABLE IF EXISTS editors;
DROP TABLE IF EXISTS readers;
DROP TABLE IF EXISTS journalists;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS users;

PRAGMA foreign_keys = ON;

-- Core user table
CREATE TABLE users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  phone_number TEXT NULL,
  profile_picture TEXT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Role lookup table
CREATE TABLE roles (
  role_id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_name TEXT NOT NULL UNIQUE,
  description TEXT NULL
);

-- Many-to-many: users <-> roles
CREATE TABLE user_roles (
  user_role_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  assigned_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE
);

-- Journalist profile
CREATE TABLE journalists (
  journalist_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  staff_number TEXT NULL,
  specialization TEXT NULL,
  employment_date TEXT NULL,
  verification_status TEXT DEFAULT 'pending' CHECK(verification_status IN ('pending','verified','rejected')),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Reader profile
CREATE TABLE readers (
  reader_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  preferences TEXT NULL, -- JSON stored as text
  subscription_status TEXT DEFAULT 'free' CHECK(subscription_status IN ('free','paid')),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Editor profile
CREATE TABLE editors (
  editor_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  editor_level TEXT DEFAULT 'junior' CHECK(editor_level IN ('junior','senior','lead')),
  department TEXT NULL,
  approval_limit INTEGER NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Administrator profile
CREATE TABLE admin (
  admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  admin_level TEXT DEFAULT 'standard' CHECK(admin_level IN ('standard','supervisor')),
  permissions TEXT NULL, -- JSON stored as text
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Super administrator profile
CREATE TABLE super_admin (
  super_admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  access_level TEXT DEFAULT 'full' CHECK(access_level IN ('full','limited')),
  system_permissions TEXT NULL, -- JSON stored as text
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Categories (created by admins)
CREATE TABLE categories (
  category_id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_name TEXT NOT NULL UNIQUE,
  description TEXT NULL,
  admin_id INTEGER NULL,
  FOREIGN KEY (admin_id) REFERENCES admin(admin_id) ON DELETE SET NULL
);

-- Districts (created by admins)
CREATE TABLE districts (
  district_id INTEGER PRIMARY KEY AUTOINCREMENT,
  district_name TEXT NOT NULL UNIQUE,
  region TEXT NULL,
  admin_id INTEGER NULL,
  FOREIGN KEY (admin_id) REFERENCES admin(admin_id) ON DELETE SET NULL
);

-- RSS / scraped sources
CREATE TABLE scraped_sources (
  source_id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_name TEXT NOT NULL,
  feed_url TEXT NOT NULL,
  site_url TEXT NULL,
  is_active INTEGER DEFAULT 1,
  last_scraped_at TEXT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Stock images per category
CREATE TABLE stock_images (
  image_id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  credit_text TEXT NOT NULL,
  source_provider TEXT DEFAULT 'pexels',
  fetched_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE
);

-- Articles (staff-written or scraped)
CREATE TABLE articles (
  article_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','pending_review','returned','published','rejected')),
  llm_checked INTEGER DEFAULT 0,
  source_type TEXT DEFAULT 'staff' CHECK(source_type IN ('staff','scraped')),
  source_name TEXT NULL,
  source_url TEXT NULL,
  original_author TEXT NULL,
  cover_image_url TEXT NULL,
  cover_image_credit TEXT NULL,
  published_at TEXT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  journalist_id INTEGER NULL,
  category_id INTEGER NULL,
  district_id INTEGER NULL,
  FOREIGN KEY (journalist_id) REFERENCES journalists(journalist_id) ON DELETE SET NULL,
  FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL,
  FOREIGN KEY (district_id) REFERENCES districts(district_id) ON DELETE SET NULL
);

CREATE INDEX idx_status ON articles(status);
CREATE INDEX idx_category ON articles(category_id);
CREATE INDEX idx_district ON articles(district_id);
CREATE INDEX idx_llm_checked ON articles(llm_checked);
CREATE INDEX idx_source_type ON articles(source_type);
CREATE INDEX idx_source_url ON articles(source_url);
-- Full-text search: D1 supports limited FTS; use a LIKE fallback or FTS5 later.
CREATE INDEX idx_search_title ON articles(title);
CREATE INDEX idx_search_content ON articles(content);

-- Media attachments (uploads stored in R2)
CREATE TABLE media (
  media_id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_url TEXT NOT NULL,
  media_type TEXT NULL,
  uploaded_at TEXT DEFAULT (datetime('now')),
  article_id INTEGER NOT NULL,
  FOREIGN KEY (article_id) REFERENCES articles(article_id) ON DELETE CASCADE
);

-- Article comments
CREATE TABLE comments (
  comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_text TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  user_id INTEGER NOT NULL,
  article_id INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (article_id) REFERENCES articles(article_id) ON DELETE CASCADE
);

-- Article view log
CREATE TABLE article_views (
  view_id INTEGER PRIMARY KEY AUTOINCREMENT,
  viewed_at TEXT DEFAULT (datetime('now')),
  user_id INTEGER NULL,
  article_id INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
  FOREIGN KEY (article_id) REFERENCES articles(article_id) ON DELETE CASCADE
);

-- Editorial reviews
CREATE TABLE editorial_reviews (
  review_id INTEGER PRIMARY KEY AUTOINCREMENT,
  review_status TEXT NOT NULL CHECK(review_status IN ('approved','returned','rejected','auto_rejected')),
  feedback TEXT NULL,
  review_date TEXT DEFAULT (datetime('now')),
  article_id INTEGER NOT NULL,
  reviewer_id INTEGER NULL,
  FOREIGN KEY (article_id) REFERENCES articles(article_id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(user_id) ON DELETE SET NULL
);
