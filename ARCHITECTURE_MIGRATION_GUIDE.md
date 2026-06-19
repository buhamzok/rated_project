# Rated Uganda — Architecture Migration Guide

> **For the team:** This document explains what the original project looked like, why we moved to Cloudflare, and what changed in the code. It also maps the API calls the frontend makes to the backend files that handle them.

---

## 1. Original architecture (the "Express + MySQL" stack)

Before the migration, the project lived in the `backend/` folder and was a traditional Node.js server.

### 1.1 High-level parts

| Part | Technology | Role |
|------|------------|------|
| Runtime | Node.js (CommonJS) | Runs the API server locally or on a VPS |
| Web framework | Express.js (`express`) | Handles HTTP routes, middleware, JSON parsing |
| Database | MySQL (`mysql2/promise`) | Stores all data: users, articles, comments, etc. |
| Auth | `bcryptjs` + `jsonwebtoken` | Password hashing and JWT signing |
| File uploads | `multer` + local `uploads/` folder | Saves journalist images on the server disk |
| RSS scraping | `rss-parser` | Reads RSS feeds from Ugandan news sites |
| Security | `helmet`, `cors` | Basic HTTP headers and cross-origin support |
| Frontend | React + Vite (in `frontend/`) | Reads from the backend API |

### 1.2 Important files in the old backend

- `backend/server.js` — starts Express on port 5000.
- `backend/src/app.js` — wires routes, static file serving, CORS, error handling.
- `backend/src/config/db.js` — creates a MySQL connection pool.
- `backend/src/routes/*.routes.js` — Express route definitions.
- `backend/src/controllers/*.controller.js` — business logic (auth, articles, scraper, etc.).
- `backend/src/models/*.model.js` — SQL queries using `mysql2`.
- `backend/src/services/` — helpers for auth, JWT, LLM rewriting, stock images.
- `backend/src/scraper/` — RSS feed fetching and scheduled scraping.
- `backend/uploads/` — local folder for uploaded media.

### 1.3 How the old data flow worked

1. A user opens the React frontend served from Cloudflare Pages (or Vercel, or localhost).
2. The frontend calls `http://localhost:5000/api/...` (or the deployed API URL).
3. Express receives the request, runs middleware (auth, CORS, JSON parsing), then calls a controller.
4. The controller uses a model to run SQL against MySQL.
5. Results go back as JSON to the frontend.
6. Uploaded images were saved to `backend/uploads/` and served via `express.static` at `/uploads`.

---

## 2. Why we moved to Cloudflare

The original stack worked, but it needed a server that stays online 24/7 and a MySQL database that also stays online. For a student/pilot project, that usually means:

- Renting a VPS (DigitalOcean, AWS EC2, etc.)
- Managing a MySQL instance (RDS, or running MySQL on the VPS)
- Worrying about SSL certificates, uptime, backups, and costs after free tiers expire

**Cloudflare gives us the same features for free, permanently:**

| Feature | Old stack | New Cloudflare stack |
|---------|-----------|----------------------|
| API hosting | VPS / EC2 | Cloudflare Workers (serverless, runs at the edge) |
| Database | MySQL | D1 (SQLite-compatible, serverless) |
| File storage | Local disk / AWS S3 | R2 (S3-compatible, no egress fees) |
| Static frontend | Vercel / Pages | Cloudflare Pages |
| Scheduled jobs | `node-cron` on VPS | Cron Triggers inside the Worker |
| Global CDN | Add Cloudflare in front | Built into everything |

Because everything is serverless, there is no server to keep running. The Worker starts instantly when a request arrives, D1 is managed by Cloudflare, and R2 stores files reliably.

---

## 3. New architecture (Cloudflare-native)

The new backend is in the `worker/` folder.

### 3.1 High-level parts

| Part | Technology | Role |
|------|------------|------|
| Runtime | Cloudflare Workers | Serverless functions at the edge |
| Web framework | Hono (`hono`) | Lightweight router, similar to Express |
| Database | D1 (`@cloudflare/workers-types`) | SQLite serverless database |
| Auth | Web Crypto PBKDF2 + `jose` | Password hashing and JWT signing |
| File uploads | R2 binding (`UPLOADS`) | Object storage for journalist images |
| RSS scraping | `fast-xml-parser` | Parses RSS/Atom XML in the Worker |
| Validation | `zod` | Schema validation for request bodies |
| Cron jobs | Worker `scheduled` export | Runs scraper every hour, refreshes stock images daily |
| Frontend | Same React + Vite | Deployed to Cloudflare Pages |

### 3.2 Important files in the new backend

- `worker/src/index.ts` — Worker entry point. Exports `fetch` (HTTP) and `scheduled` (cron).
- `worker/wrangler.toml` — Cloudflare config: Worker name, D1 database ID, R2 bucket, cron triggers.
- `worker/src/routes/*.ts` — Hono route files, same purpose as old `routes/*.routes.js`.
- `worker/src/controllers/*.controller.ts` — Business logic, ported from old controllers.
- `worker/src/models/*.model.ts` — SQL queries, now using D1's prepared-statement API.
- `worker/src/db/schema.sql` — D1/SQLite schema.
- `worker/src/db/seed.sql` — Minimal seed data: roles, two admins, real categories/districts.
- `worker/src/utils/db.ts` — Thin wrapper around D1 (`first`, `all`, `run`, `batch`).
- `worker/src/services/` — Auth, LLM rewriting, LLM validation, stock images.
- `worker/src/scraper/` — RSS feed fetching and scraping runner.
- `worker/src/types/index.ts` — TypeScript types including `Env` (Worker bindings).

### 3.3 How the new data flow works

1. User opens the React frontend hosted on Cloudflare Pages.
2. The frontend calls `https://rateduganda-api.buhamzok.workers.dev/api/...`.
3. Cloudflare runs the Worker, Hono routes the request, middleware checks auth, and calls a controller.
4. The controller builds a D1 client (`buildD1(c.env.DB)`) and runs SQLite queries.
5. JSON response returns to the frontend.
6. Uploaded images go into the R2 bucket (`c.env.UPLOADS.put(...)`).
7. Images are served by a new route: `GET /uploads/:key` reads the R2 object and returns it.

---

## 4. Key code changes from Express to Cloudflare

### 4.1 Server setup

**Before (Express):**
```js
// backend/src/app.js
const app = require('express')();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.listen(5000);
```

**After (Hono + Worker):**
```ts
// worker/src/index.ts
const app = new Hono<{ Bindings: Env }>();
app.use('*', cors());
app.route('/api/auth', authRoutes);
export default { async fetch(request, env, ctx) { return app.fetch(request, env, ctx); } };
```

The biggest difference: there is no `app.listen()`. Cloudflare calls the `fetch` function for every request.

### 4.2 Database connection

**Before:** a persistent MySQL pool object is created once and reused.
```js
// backend/src/config/db.js
const pool = mysql.createPool({ host, user, password, database });
module.exports = pool;
```

**After:** a fresh D1 wrapper is built from the request environment.
```ts
// worker/src/utils/db.ts
export function buildD1(db: D1Database) { return { first, all, run, batch, prepare }; }

// inside a controller
const db = buildD1(c.env.DB);
const article = await articleModel.findById(db, id);
```

D1 uses prepared statements (`db.prepare(sql).bind(...).all()/run()/first()`). The wrapper keeps the model code readable.

### 4.3 Password hashing and JWT

**Before:**
```js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
```

Cloudflare Workers do **not** support native Node modules like `bcryptjs` or `jsonwebtoken` easily, and `bcrypt` is too slow for the Worker's CPU limits. We switched to:

- **Web Crypto PBKDF2** for password hashing (`worker/src/services/auth.service.ts`)
- **`jose`** for JWT signing/verification

This keeps everything inside the Web Crypto standard that Workers support.

### 4.4 File uploads

**Before:** `multer` saved files to `backend/uploads/`, then `express.static` served them.

**After:**
- File is received via Hono's `c.req.parseBody()`.
- File buffer is stored in R2: `c.env.UPLOADS.put(key, fileBuffer, { httpMetadata: { contentType } })`.
- Public URL is saved to the article.
- A new `GET /uploads/:key` route (`worker/src/routes/uploads.ts`, `worker/src/controllers/uploads.controller.ts`) streams the R2 object back to the browser.

### 4.5 Scraping and cron jobs

**Before:** `node-cron` ran inside the always-on Node server.

**After:** the Worker exports a `scheduled` function. Cloudflare calls it based on cron triggers defined in `wrangler.toml`:
```toml
[triggers]
crons = ["0 * * * *", "0 0 * * *"]
```

The Worker then runs the scraper (`0 * * * *` = every hour) or refreshes stock images (`0 0 * * *` = daily).

### 4.6 Request validation

**Before:** mostly manual checks inside controllers.

**After:** `zod` schemas at the top of controllers ensure the body/query has the right shape and types. Example:
```ts
const articleCreateSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(10),
  category_id: z.number().int().optional(),
  district_id: z.number().int().optional(),
});
```

This caught several frontend bugs where `<select>` values were sent as strings instead of numbers.

---

## 5. API calls the frontend makes and the files behind them

The frontend API helpers live in `frontend/src/api/`. Each helper uses `axios` through `frontend/src/api/client.js`, which sets the base URL from `VITE_API_BASE_URL` and adds the JWT token.

### 5.1 Authentication

| Frontend helper | HTTP call | Old backend file | New backend file | What it does |
|-----------------|-----------|------------------|------------------|--------------|
| `login(credentials)` | `POST /api/auth/login` | `backend/src/controllers/auth.controller.js` | `worker/src/controllers/auth.controller.ts` | Verifies password, returns JWT + user |
| `register(data)` | `POST /api/auth/register` | `backend/src/controllers/auth.controller.js` | `worker/src/controllers/auth.controller.ts` | Creates reader account, pending approval |
| `getMe()` | `GET /api/auth/me` | `backend/src/controllers/authMe.routes.js` | `worker/src/controllers/auth.controller.ts` | Returns current user from token |

### 5.2 Articles (public and journalist)

| Frontend helper | HTTP call | Old backend file | New backend file | What it does |
|-----------------|-----------|------------------|------------------|--------------|
| `listArticles(params)` | `GET /api/articles` | `backend/src/controllers/article.controller.js` | `worker/src/controllers/article.controller.ts` | Lists published articles with filters |
| `getArticle(id)` | `GET /api/articles/:id` | `backend/src/controllers/article.controller.js` | `worker/src/controllers/article.controller.ts` | Gets one article, records a view |
| `createArticle(data)` | `POST /api/articles` | `backend/src/controllers/article.controller.js` | `worker/src/controllers/article.controller.ts` | Journalist saves a draft |
| `updateArticle(id, data)` | `PATCH /api/articles/:id` | `backend/src/controllers/article.controller.js` | `worker/src/controllers/article.controller.ts` | Edits an article |
| `submitArticle(id)` | `POST /api/articles/:id/submit` | `backend/src/controllers/article.controller.js` | `worker/src/controllers/article.controller.ts` | Sends draft to LLM + editor review |
| `uploadMedia(id, file)` | `POST /api/articles/:id/media` | `backend/src/controllers/article.controller.js` | `worker/src/controllers/article.controller.ts` | Uploads image to R2, sets cover |
| `getMyArticles()` | `GET /api/articles/mine` | `backend/src/controllers/article.controller.js` | `worker/src/controllers/article.controller.ts` | Journalist's own articles |
| `deleteArticle(id)` | `DELETE /api/articles/:id` | Not present originally | `worker/src/controllers/article.controller.ts` | Deletes an article |
| `addView(id)` | `POST /api/articles/:id/views` | `backend/src/controllers/article.controller.js` | `worker/src/controllers/article.controller.ts` | Records a view |

### 5.3 Editor/admin workflow

| Frontend helper | HTTP call | Old backend file | New backend file | What it does |
|-----------------|-----------|------------------|------------------|--------------|
| `getEditorQueue()` | `GET /api/articles/queue/editor` | `backend/src/controllers/article.controller.js` | `worker/src/controllers/article.controller.ts` | Articles awaiting editor review |
| `reviewArticle(id, data)` | `POST /api/articles/:id/review` | `backend/src/controllers/article.controller.js` | `worker/src/controllers/article.controller.ts` | Approve/return/reject, assign category/image |

### 5.4 Categories, districts, comments

| Frontend helper | HTTP call | Old backend file | New backend file | What it does |
|-----------------|-----------|------------------|------------------|--------------|
| `listCategories()` | `GET /api/categories` | `backend/src/controllers/category.controller.js` | `worker/src/controllers/category.controller.ts` | All categories |
| `createCategory(data)` | `POST /api/categories` | `backend/src/controllers/category.controller.js` | `worker/src/controllers/category.controller.ts` | Admin creates category |
| `listDistricts()` | `GET /api/districts` | `backend/src/controllers/district.controller.js` | `worker/src/controllers/district.controller.ts` | All districts |
| `createDistrict(data)` | `POST /api/districts` | `backend/src/controllers/district.controller.js` | `worker/src/controllers/district.controller.ts` | Admin creates district |
| `listComments(id)` | `GET /api/comments/:id` | `backend/src/controllers/comment.controller.js` | `worker/src/controllers/comment.controller.ts` | Comments for an article |
| `createComment(data)` | `POST /api/comments` | `backend/src/controllers/comment.controller.js` | `worker/src/controllers/comment.controller.ts` | Post a comment |

### 5.5 Admin/scraper

| Frontend helper | HTTP call | Old backend file | New backend file | What it does |
|-----------------|-----------|------------------|------------------|--------------|
| `listUsers()` | `GET /api/admin/users` | `backend/src/controllers/admin.controller.js` | `worker/src/controllers/admin.controller.ts` | Admin user list |
| `approveUser(id)` | `PATCH /api/admin/users/:id/approve` | `backend/src/controllers/admin.controller.js` | `worker/src/controllers/admin.controller.ts` | Approve reader registration |
| `assignRole(id, role)` | `PATCH /api/admin/users/:id/roles` | `backend/src/controllers/admin.controller.js` | `worker/src/controllers/admin.controller.ts` | Assign journalist/editor/admin role |
| `listSources()` | `GET /api/admin/scraper/sources` | `backend/src/controllers/scraper.controller.js` | `worker/src/controllers/scraper.controller.ts` | RSS sources |
| `toggleSource(id, active)` | `PATCH /api/admin/scraper/sources/:id` | `backend/src/controllers/scraper.controller.js` | `worker/src/controllers/scraper.controller.ts` | Enable/disable source |
| `runScraper()` | `POST /api/admin/scraper/run` | `backend/src/controllers/scraper.controller.js` | `worker/src/controllers/scraper.controller.ts` | Manually run RSS scraper |
| `refreshImages()` | `POST /api/admin/images/refresh` | `backend/src/controllers/scraper.controller.js` | `worker/src/controllers/scraper.controller.ts` | Refresh Pexels stock images + backfill articles |

---

## 6. Frontend-specific changes

Most frontend pages stayed the same, but a few were adapted for the new backend:

- `frontend/src/api/client.js` — base URL now comes from `import.meta.env.VITE_API_BASE_URL` instead of hardcoding `localhost:5000`.
- `frontend/src/api/imageUtils.js` — resolves image URLs relative to the API origin (handles both R2 absolute URLs and `/uploads/...` paths).
- `frontend/src/pages/Public/HomePage.jsx` — redesigned for mobile-first, added category filtering from URL, slideshow, and `/news` page link.
- `frontend/src/pages/Public/NewsPage.jsx` — new page showing all articles.
- `frontend/src/pages/Public/ArticleDetailPage.jsx` — added Edit/Delete buttons for editors/admins.
- `frontend/src/pages/Editor/PublishedArticlesPage.jsx` — new page for editors/admins to manage all articles.
- `frontend/src/pages/Editor/ReviewPage.jsx` — fixed decision/category_id types.
- `frontend/src/pages/Journalist/NewArticlePage.jsx` and `EditArticlePage.jsx` — convert `category_id`/`district_id` to numbers.
- `frontend/src/components/Navbar.jsx` — mobile menu, links to Editor Queue + Articles.
- `frontend/src/index.css` — mobile-first responsive CSS.

---

## 7. Deployment commands (current workflow)

All commands are run from the project root.

```bash
# Backend (Worker)
npx --prefix worker wrangler deploy --config worker/wrangler.toml

# Frontend (Pages) — must set the production API URL first
$env:VITE_API_BASE_URL = 'https://rateduganda-api.buhamzok.workers.dev/api'
npm --prefix frontend run build
npx --prefix frontend wrangler pages deploy frontend/dist --project-name=rateduganda-frontend --branch=main
```

---

## 8. Summary of why each change was made

| Change | Reason |
|--------|--------|
| Express → Hono | Hono is tiny, fast, and designed for edge runtimes like Cloudflare Workers |
| MySQL → D1 | D1 is serverless, SQLite-based, and has no server to manage or pay for |
| `bcryptjs`/`jsonwebtoken` → Web Crypto + `jose` | Workers cannot easily use Node native crypto libraries; Web Crypto is native and fast enough |
| Local disk uploads → R2 | Workers have no persistent local disk; R2 is durable object storage |
| `rss-parser` → `fast-xml-parser` | `rss-parser` depends on Node streams; `fast-xml-parser` works in the Worker runtime |
| `node-cron` → Worker Cron Triggers | No long-running server needed; Cloudflare triggers the Worker on a schedule |
| Manual validation → `zod` | Catches type mismatches early (e.g., strings vs numbers from `<select>`) |
| New `/news` + slideshow + mobile CSS | Better user experience, especially on phones |

---

## 9. Live endpoints

- **Frontend (production):** `https://rateduganda-frontend.pages.dev`
- **Backend (Worker):** `https://rateduganda-api.buhamzok.workers.dev/api`
- **D1 database:** `rateduganda-db`
- **R2 bucket:** `rateduganda-uploads`

---

*Document generated for the Rated Uganda team after the Cloudflare migration.*
