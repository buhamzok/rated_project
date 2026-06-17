# RATED UGANDA — Multi-Agent Build Orchestration Prompt
**Target runtime:** OpenCode (Kimi 2.7 / GLM 5.1 or similar)
**Timeframe:** 3 days to a functional, demoable system
**Stack:** React (frontend) + Express.js/Node.js (backend) + MySQL (database)
**Auth:** JWT (stateless)

---

## 0. HOW TO USE THIS DOCUMENT

This is not a single prompt — it is seven sequential agent prompts. **Agents must run
in the exact order below.** Each agent's output is the next agent's input. Do not let an
agent start work until the previous agent's deliverables exist on disk and have passed
the "Definition of Done" checklist at the end of its section.

Copy each `AGENT N PROMPT` block as the system/task prompt for a fresh OpenCode
session. Paste the **Shared Project Context** block (Section 1) into every agent's
context — it is the single source of truth all agents must agree with, and no agent may
contradict it.

If an agent proposes a change to a contract defined in Section 1 (e.g. renaming a field,
changing an endpoint path), it must STOP and output the proposed change as a diff
instead of silently implementing it. You (the human) approve contract changes; agents
do not.

---

## 1. SHARED PROJECT CONTEXT (paste into every agent)

```
PROJECT: RATED UGANDA — a Ugandan news platform.
Roles: public visitor, reader, journalist, editor, administrator (one user may hold
multiple roles via a user_roles bridge table).

CORE WORKFLOW:
1. Visitor browses/searches/filters published articles without logging in.
2. User registers -> account is "pending" -> admin approves -> role assigned.
3. TWO content sources feed the pipeline:
   a. Journalist creates article + uploads media -> submits for review
      (status: pending_review, source_type: 'staff').
   b. A scheduled scraper job pulls title + summary + source link + original author +
      source name from Ugandan news RSS feeds, has the LLM write a short ORIGINAL
      rewrite from only that summary (never inventing facts not present in the
      summary), and inserts the result directly as status: pending_review,
      source_type: 'scraped', journalist_id: NULL.
4. LLM-assisted backend validation runs on EVERY pending_review article (both staff and
   scraped) BEFORE it reaches a human editor: it reads the article, checks it isn't
   empty, checks it looks like genuine news content (not spam/gibberish), and either
   marks it invalid (status: rejected) or forwards it to the editor queue
   (status: pending_review -> stays pending_review but flagged llm_checked=true).
   For scraped articles this is the SAME validation step, run after the rewrite step,
   not a separate check.
5. Editor reviews (sees only llm_checked=true articles, staff AND scraped mixed in one
   queue, clearly labeled by source_type), approves (status: published, published_at
   set) or returns for correction (status: returned, feedback saved to
   editorial_reviews). Scraped articles that are "returned" simply stay rejected —
   there is no journalist to send them back to, so the editor's only real choices for
   source_type='scraped' are approve or reject.
6. Published articles are publicly visible, filterable by category/district, viewable,
   commentable (comment requires login), and view-tracked. Scraped articles display
   "Source: <source_name>" and link to the original; staff articles display the
   journalist's name.

FIXED PROJECT STRUCTURE (do not deviate):
rated_project/
├── backend/
│   ├── src/
│   │   ├── config/        (db.js, env.js)
│   │   ├── middleware/    (auth.js, roleCheck.js, errorHandler.js, validate.js)
│   │   ├── models/        (one file per table, raw SQL or query builder — NOT a full ORM)
│   │   ├── controllers/   (one file per resource)
│   │   ├── routes/        (one file per resource, mounted in app.js)
│   │   ├── services/      (llmValidation.service.js, auth.service.js, llmRewrite.service.js)
│   │   ├── scraper/       (sources.js, fetchFeeds.js, scrapeRunner.js, scheduler.js)
│   │   ├── utils/
│   │   └── app.js
│   ├── db/
│   │   ├── schema.sql      (full CREATE TABLE statements, matches ERD exactly)
│   │   └── seed.sql        (sample categories, districts, one admin, sample articles)
│   ├── tests/
│   ├── .env.example
│   ├── package.json
│   └── server.js           (entry point, just requires app.js and listens)
├── frontend/
│   ├── src/
│   │   ├── api/            (one file per resource: axios calls only, no UI logic)
│   │   ├── components/     (shared dumb components: Navbar, ArticleCard, RoleGuard, etc.)
│   │   ├── pages/           (one folder per role: Public/, Auth/, Journalist/, Editor/, Admin/)
│   │   ├── context/         (AuthContext.jsx)
│   │   ├── hooks/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
├── .gitignore
└── README.md

DATABASE — ENTITIES (hybrid model: role checking via roles/user_roles for speed and
multi-role support — e.g. one user can be BOTH journalist and editor — while subtype
tables hold role-specific extra fields only. Do not rename fields below):
users(user_id PK, full_name, email UNIQUE, password, phone_number, profile_picture,
      created_at, updated_at)
roles(role_id PK, role_name UNIQUE, description)
   -- exactly: 'reader','journalist','editor','administrator','super_admin'
user_roles(user_role_id PK, user_id FK, role_id FK, assigned_at)
   -- SOURCE OF TRUTH for "what can this user do" — auth middleware checks THIS table,
   -- not the subtype tables below. A user can have multiple rows here (e.g. both
   -- 'journalist' and 'editor'), which is exactly how one person holds both roles.
journalists(journalist_id PK, user_id FK UNIQUE, staff_number, specialization,
            employment_date, verification_status)
   -- extra fields ONLY for users who also have a 'journalist' row in user_roles.
   -- Created alongside (not instead of) the user_roles row when a journalist role is
   -- assigned. A user_id appears here at most once even if they hold other roles too.
readers(reader_id PK, user_id FK UNIQUE, preferences, subscription_status)
   -- extra fields for users with a 'reader' role. NOTE: every registered user is
   -- implicitly a reader by default (commenting requires login, not a readers row) —
   -- this table is only for readers who have explicit preferences/subscription data,
   -- it is not a gate on whether someone can comment.
editors(editor_id PK, user_id FK UNIQUE, editor_level, department, approval_limit)
   -- extra fields for users with an 'editor' role.
admin(admin_id PK, user_id FK UNIQUE, admin_level, permissions)
   -- manages categories, districts, and users (approvals/role assignment) — matches
   -- the report's original ERD scope. Cannot manage other admin or editor accounts.
super_admin(super_admin_id PK, user_id FK UNIQUE, access_level, system_permissions)
   -- a smaller, higher tier above admin. Manages editors and admin accounts
   -- specifically (promote/demote/deactivate), in addition to everything admin can do.
   -- Both admin and super_admin users still need a matching user_roles row
   -- ('administrator' or 'super_admin') for the auth middleware to recognize them —
   -- the subtype table alone does not grant access.
categories(category_id PK, category_name, description, admin_id FK)
districts(district_id PK, district_name, region, admin_id FK)
articles(article_id PK, title, content, status, llm_checked BOOLEAN DEFAULT FALSE,
         source_type ENUM('staff','scraped') DEFAULT 'staff',
         source_name VARCHAR(255) NULL, source_url VARCHAR(512) NULL,
         original_author VARCHAR(255) NULL,
         cover_image_url VARCHAR(512) NULL, cover_image_credit VARCHAR(255) NULL,
         published_at, created_at, updated_at,
         journalist_id FK NULLABLE, category_id FK, district_id FK)
   -- status ENUM: 'draft','pending_review','returned','published','rejected'
   -- IMPORTANT — OPEN ITEM, NOT YET RESOLVED: journalist_id FKs to
   -- journalists.journalist_id (per the team's approved diagram), NOT directly to
   -- users.user_id. This is fine for staff-written articles (a journalist always has
   -- a journalists row). It is NOT YET fine for scraped articles, which have no
   -- journalist at all — the team has explicitly deferred this decision ("leave as is
   -- for now, will edit later"). Agent 1 must make journalist_id NULLABLE so the
   -- schema does not block development, but Agent 4 (Scraper Engineer) MUST NOT
   -- silently invent a placeholder journalist row to work around this — instead it
   -- must insert scraped articles with journalist_id=NULL and surface this exact
   -- open question back to the human team before treating it as resolved.
   -- source_name/source_url/original_author are NULL when source_type='staff'
   -- cover_image_url: for staff articles, set from the journalist's uploaded media
   --   (first image in the media table for that article); for scraped articles, set
   --   from a cached stock-photo pool keyed by category (see stock_images table below)
   -- cover_image_credit: human-readable credit string (e.g. "Photo: Jane D. on Pexels")
   --   shown in small print under the thumbnail for scraped articles; NULL for staff
   --   articles since journalists own their uploaded photo outright
scraped_sources(source_id PK, source_name, feed_url, site_url, is_active BOOLEAN DEFAULT TRUE,
                 last_scraped_at, created_at)
   -- one row per configured RSS source, lets admin enable/disable a feed without code changes
stock_images(image_id PK, category_id FK, image_url, thumbnail_url, credit_text,
             source_provider VARCHAR(50), fetched_at)
   -- a small CACHED POOL of stock photos per category, refreshed periodically by the
   -- scraper's image-sourcing step, never queried live per-article (see Agent 4)
media(media_id PK, file_url, media_type, uploaded_at, article_id FK)
comments(comment_id PK, comment_text, created_at, user_id FK, article_id FK)
article_views(view_id PK, viewed_at, user_id FK NULLABLE, article_id FK)
editorial_reviews(review_id PK, review_status, feedback, review_date, article_id FK,
                   reviewer_id FK)
   -- reviewer_id FKs to users.user_id (an editor reviewing is still just a user_id;
   -- we don't need editors.editor_id here, this mirrors the report's original ERD)

API CONTRACT (frontend and backend MUST match this exactly — this is the seam between
Agent 2 and Agent 3, treat it as immutable unless approved):

POST   /api/auth/register        { full_name, email, password, phone_number? }
POST   /api/auth/login           { email, password } -> { token, user: {user_id, full_name, email, roles[]} }
GET    /api/auth/me              [auth required] -> current user + roles

GET    /api/articles                       ?category=&district=&search=&page=  (public, published only)
                                            -> { data: { articles: [{..., cover_image_url,
                                               cover_image_credit, source_type, source_name}],
                                               total, page } }
GET    /api/articles/:id                   (public, published only; increments view if not author)
POST   /api/articles                       [journalist] { title, content, category_id, district_id }
PATCH  /api/articles/:id                   [journalist, own article, status=draft/returned only]
POST   /api/articles/:id/submit            [journalist] -> sets status=pending_review, triggers LLM check
POST   /api/articles/:id/media             [journalist] multipart upload
GET    /api/articles/queue/editor          [editor] -> llm_checked=true AND status=pending_review
POST   /api/articles/:id/review            [editor] { decision: 'approve'|'return', feedback }
GET    /api/categories                     (public)
GET    /api/districts                      (public)
POST   /api/categories                     [administrator role ONLY — not super_admin,
                                             see admin_id FK note in shared schema;
                                             super_admin manages editors/admin accounts,
                                             not categories/districts directly]
POST   /api/districts                      [administrator role ONLY, same reasoning]
GET    /api/admin/users                    [administrator or super_admin]
PATCH  /api/admin/users/:id/approve        [administrator or super_admin]
PATCH  /api/admin/users/:id/roles          [administrator or super_admin may call this
                                             route; body-level restriction inside the
                                             controller: only super_admin may set
                                             role_name='super_admin' — see Agent 2 task 11]
POST   /api/comments                       [auth required] { article_id, comment_text }
GET    /api/comments/:articleId            (public)
POST   /api/articles/:id/views             (public, fire-and-forget)
GET    /api/health                         (public) -> {status:"success", message:"..."}

GET    /api/admin/scraper/sources          [admin] -> list of configured RSS sources
POST   /api/admin/scraper/sources          [admin] { source_name, feed_url, site_url }
PATCH  /api/admin/scraper/sources/:id      [admin] { is_active }
POST   /api/admin/scraper/run              [admin] -> manually triggers one scrape cycle now,
                                                       returns { fetched, inserted, skipped, errors[] }
GET    /api/admin/scraper/runs/last        [admin] -> summary of the most recent run (for demo UI)
POST   /api/admin/images/refresh           [admin] -> manually re-fetches the stock_images pool
   -- For all six /api/admin/scraper/* and /api/admin/images/* routes above, [admin]
   -- means EITHER 'administrator' OR 'super_admin' may call them — these are
   -- operational/maintenance actions, not account-management ones, so the tier split
   -- that matters for users/roles endpoints does not apply here.
                                                       for all categories now, returns
                                                       { refreshed: N, errors: [...] }

ALL error responses: { error: { message: string, code?: string } } with appropriate HTTP status.
ALL success responses with data: { data: ... } (keep this envelope consistent everywhere).
Auth header: Authorization: Bearer <token>

ENVIRONMENT VARIABLES (backend/.env):
PORT=5000
DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
JWT_SECRET, JWT_EXPIRES_IN=7d
LLM_API_KEY, LLM_API_URL, LLM_MODEL
SCRAPE_INTERVAL_MINUTES=60
PEXELS_API_KEY, IMAGE_REFRESH_HOURS=24

ENVIRONMENT VARIABLES (frontend/.env):
VITE_API_BASE_URL=http://localhost:5000/api

FIXED SCRAPER SOURCE LIST (Agent 4 seeds these into scraped_sources, do not invent
other sources without admin approval — every entry below is a genuine Ugandan news
outlet that publishes a public RSS feed; verify the exact feed path against the live
site at build time since paths can shift, do not hardcode a guessed path that 404s):
- Daily Monitor       — monitor.co.ug        (independent national daily)
- New Vision          — newvision.co.ug      (state-owned national daily)
- The Independent     — independent.co.ug    (current affairs / business)
- Nile Post           — nilepost.co.ug       (digital-native national news)
- PML Daily           — pmldaily.com         (digital-native, broad coverage)
- Chimp Reports       — chimpreports.com     (digital-native national news)
Use ONLY each site's published RSS/XML feed endpoint, never scrape raw HTML pages —
RSS is the explicitly supported, lightweight way these sites expect to be consumed
programmatically, and it already gives title+summary+link+author+pubDate without
needing to parse arbitrary page markup that breaks on redesign.
```

---

## 2. EXECUTION ORDER AND TIME BUDGET (3 days)

| Day | Agent | Task | Hours |
|---|---|---|---|
| 1 AM | Agent 1 — Database Architect | Schema, seed data, migrations | 1.5 |
| 1 AM–PM | Agent 2 — Backend Lead | Auth, core CRUD, middleware | 4 |
| 1 PM | Agent 3 — LLM Validation Engineer | Validation service + integration into article submit flow | 2 |
| 1 PM–Day 2 AM | Agent 4 — Scraper, Rewrite & Image Sourcing Engineer | RSS ingestion, LLM rewrite, Pexels stock image pool, scheduler, manual triggers | 3.5 |
| Day 2 | Agent 5 — Frontend Lead | All pages, routing, role guards, API wiring, scraped-source UI | 6 |
| Day 2 PM | Agent 6 — Integration & QA Engineer | End-to-end manual + scripted test pass, fix seam bugs | 3 |
| Day 3 AM | Agent 7 — Release Engineer | Env config, scripts, README, demo data, final smoke test | 2 |
| Day 3 PM | Buffer | Bug fixes surfaced by Agent 6/7, presentation prep | — |

Each agent must run `git add . && git commit -m "<agent name>: <summary>"` at the end of
its session so progress is checkpointed and reversible.

---

## AGENT 1 PROMPT — Database Architect

```
You are the Database Architect for RATED UGANDA. Read the SHARED PROJECT CONTEXT above
fully before doing anything.

TASK:
1. Create backend/db/schema.sql with CREATE TABLE statements for all 16 entities listed
   in the shared context (users, roles, user_roles, journalists, readers, editors,
   admin, super_admin, categories, districts, articles, scraped_sources, stock_images,
   media, comments, article_views, editorial_reviews), in MySQL syntax. Use InnoDB
   engine, utf8mb4 charset. Add appropriate FOREIGN KEY constraints with ON DELETE
   CASCADE for child records that should not outlive their parent (media, comments,
   article_views, editorial_reviews → cascade on article_id; user_roles → cascade on
   user_id; stock_images → cascade on category_id; journalists/readers/editors/admin/
   super_admin → cascade on user_id, since a subtype row is meaningless without its
   base user) and ON DELETE SET NULL or RESTRICT where deleting the parent should not
   silently delete history (article_views.user_id on user delete -> SET NULL, so
   anonymous historical views survive user deletion). Give journalists.user_id,
   readers.user_id, editors.user_id, admin.user_id, and super_admin.user_id each a
   UNIQUE constraint (not just FK) — this enforces the "at most one subtype row per
   role per user" rule the shared context describes, and is what makes these genuinely
   1-to-1 rather than 1-to-many. Make articles.journalist_id NULLABLE (see the OPEN
   ITEM note on journalist_id in the shared context — do not silently resolve it).
2. Add an index on articles(status), articles(category_id), articles(district_id),
   articles(llm_checked), articles(source_type), articles(source_url) (supports the
   scraper's duplicate-guard lookup), and a FULLTEXT index on articles(title, content)
   for search.
3. Create backend/db/seed.sql with:
   - 5 categories (Politics, Business, Sports, Technology, Health)
   - 5 districts (Kampala, Mukono, Wakiso, Jinja, Mbarara) with region field filled
   - roles table seeded with exactly: 'reader','journalist','editor','administrator',
     'super_admin'
   - 1 super_admin user (email: admin@rateduganda.ug, password will be a bcrypt hash —
     write a comment showing the plaintext is "Admin123!" for the team to use in demo).
     Give this user a user_roles row for 'super_admin' AND insert a matching row in
     super_admin (access_level, system_permissions — sensible placeholder values).
   - 1 seeded demo journalist user (e.g. demo.journalist@rateduganda.ug, plaintext
     password documented the same way) with a user_roles row for 'journalist' AND a
     matching row in journalists (staff_number, specialization, employment_date,
     verification_status='verified') — this is the placeholder author for the three
     sample articles below, NOT the admin, since articles.journalist_id FKs to
     journalists.journalist_id, not to users.user_id directly.
   - 3 sample published articles with realistic Ugandan news content (your own writing,
     not copied from any real outlet) spread across different categories/districts, so
     the frontend has something to render on day one. Set source_type='staff' and
     journalist_id=the seeded demo journalist's journalists.journalist_id (not the
     admin, and not a users.user_id) for these three.
   - scraped_sources seeded with the six entries from the FIXED SCRAPER SOURCE LIST in
     the shared context, feed_url left as a clearly-marked placeholder string like
     'PENDING_VERIFICATION' and is_active=false for each — Agent 4 is responsible for
     verifying the real feed URL per source and flipping is_active=true once confirmed,
     so seed.sql must not claim a feed is live before that verification happens.
   - Leave stock_images EMPTY in seed.sql — it is populated at runtime by Agent 4's
     refreshAllCategories(), not seeded statically, since its content depends on a live
     Pexels API key that won't exist at seed time.
4. Write backend/src/config/db.js — a mysql2/promise connection pool, reading from
   process.env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME), exporting the pool as default.
5. Add a single committed placeholder image at backend/src/assets/placeholder-cover.jpg
   (any simple neutral graphic — a flat color with the category name is fine, does not
   need to be elaborate) and serve backend/src/assets statically alongside /uploads in
   app.js (Agent 2 will wire the static mount; you just need the file to exist on disk
   now since Agent 4's getRandomStockImage() fallback path references it by a fixed
   path — write that path as a one-line comment in this file's README so Agent 4 does
   not have to guess it).
6. Write a short backend/db/README.md explaining how to run schema.sql then seed.sql
   against a local MySQL instance (mysql -u root -p ratedug < schema.sql), and noting
   the placeholder image path from step 5.

CONSTRAINTS:
- Do NOT use an ORM (no Sequelize/Prisma). Agent 2 will write raw parameterized queries
  against this schema using mysql2. This is a deliberate choice for a 3-day build —
  fewer abstractions, fewer surprises.
- Do NOT deviate from the field names given in the shared context. The backend and
  frontend agents will both assume these exact names.
- Password field stores a bcrypt hash, not plaintext — but that hashing happens in
  Agent 2's auth service, not here. Just make the column big enough (VARCHAR(255)).

DEFINITION OF DONE:
- schema.sql runs against a clean MySQL database with zero errors, creating all 16
  tables.
- seed.sql runs after schema.sql with zero errors, populates all lookup tables, the
  three sample articles, and the six scraped_sources rows (all is_active=false).
- backend/src/assets/placeholder-cover.jpg exists and its path is documented.
- db.js successfully exports a working pool (test with a throwaway script that runs
  SELECT 1 and logs the result, then delete the throwaway script).
- Commit with message "Agent 1 (DB Architect): schema, seed data, connection pool,
  placeholder image".
```

---

## AGENT 2 PROMPT — Backend Lead

```
You are the Backend Lead for RATED UGANDA. Read the SHARED PROJECT CONTEXT fully.
backend/db/schema.sql and backend/src/config/db.js already exist — read them before
writing any code so your queries match the real column names.

TASK — build the full Express backend EXCEPT the LLM validation service (Agent 3 owns
that; you only need to call it).

1. backend/server.js — entry point. Loads .env, requires app.js, listens on PORT.
2. backend/src/app.js — Express app: cors(), express.json(), helmet() for basic
   security headers, mounts all routers under /api, mounts a global error handler
   middleware LAST.
3. backend/src/middleware/auth.js — verifies JWT from Authorization header, attaches
   req.user = {user_id, roles[]} by querying user_roles+roles, calls next() or 401s.
4. backend/src/middleware/roleCheck.js — exports requireRole(...roleNames) that 403s
   if req.user.roles doesn't intersect with roleNames. This is a ROUTE-level gate only
   (e.g. mount PATCH /api/admin/users/:id/roles behind
   requireRole('administrator','super_admin') so either tier can call it at all). The
   finer-grained rule — a plain 'administrator' may not assign role_name='super_admin'
   even though they can call the route — depends on the request BODY, not just the
   caller's role, so it cannot live in this generic middleware. Implement that specific
   check inside the controller itself (see step 11 below), not here.
5. backend/src/middleware/errorHandler.js — catches thrown errors, returns the
   { error: { message, code } } envelope from the shared context, logs stack server-side
   only, never leaks stack traces to the client.
6. backend/src/middleware/validate.js — a small wrapper for request body validation
   (write simple manual checks, do not add a new dependency like Joi/Zod unless you
   already see one installed — keep dependencies minimal for a 3-day build).
7. backend/src/services/auth.service.js — bcrypt hash/compare, JWT sign/verify helpers.
8. For EACH resource (auth, articles, categories, districts, comments, admin) create:
   - models/<resource>.model.js — raw parameterized mysql2 queries only, no business
     logic, just data access functions (e.g. findArticleById, insertArticle, etc.)
   - controllers/<resource>.controller.js — request/response handling, calls models +
     services, no raw SQL here
   - routes/<resource>.routes.js — maps the exact paths from the API CONTRACT in shared
     context to controller functions, applies auth/roleCheck middleware per route
9. Implement every endpoint listed in the API CONTRACT exactly as specified — same
   paths, same methods, same request/response shape. Do not invent extra endpoints
   the frontend doesn't know about, and do not omit any listed endpoint.
10. For POST /api/articles/:id/submit — set status='pending_review', llm_checked=false,
    then call a function llmValidation.validateArticle(article) that Agent 3 will
    implement at backend/src/services/llmValidation.service.js. SINCE AGENT 3 HASN'T
    RUN YET, create that file now as a STUB that always returns
    { valid: true, reason: null } so your endpoint and tests work today. Add a clear
10. On valid:true set llm_checked=true; on valid:false set status='rejected' and store
    the reason in editorial_reviews with reviewer_id=null and review_status='auto_rejected'.
11. PATCH /api/admin/users/:id/roles [admin/super_admin only — see role split below]
    must do BOTH of the following atomically (wrap in a transaction): (a) insert a row
    into user_roles for the given role_name if one doesn't already exist for that user
    (a user can hold multiple roles, so do not delete/replace existing rows — this
    endpoint ADDS a role, it does not set a single role), and (b) insert a matching row
    into the corresponding subtype table if and only if one doesn't already exist:
    role_name='journalist' -> insert into journalists (staff_number can be
    auto-generated, e.g. "J-" + user_id, verification_status='pending');
    role_name='reader' -> insert into readers (preferences=null,
    subscription_status='free'); role_name='editor' -> insert into editors
    (editor_level='junior', department=null, approval_limit=null);
    role_name='administrator' -> insert into admin (admin_level='standard',
    permissions=null). Enforce the permission split from the shared context: a plain
    'administrator' can assign 'reader'/'journalist'/'editor'/'administrator' roles via
    this endpoint, but assigning role_name='super_admin' (and inserting into the
    super_admin subtype table) requires the caller to already hold 'super_admin'
    themselves — a plain admin cannot create another admin or super_admin account, nor
    manage editors' subtype-level fields like approval_limit (that remains a
    super_admin-only capability, enforced in roleCheck.js).
12. Media upload: use multer, store files in backend/uploads/ (create the folder, add it
    to .gitignore), serve it statically at /uploads, save the relative path as file_url.
    ALSO serve backend/src/assets statically at /assets (express.static) — Agent 1 has
    already committed a placeholder-cover.jpg there that the scraper pipeline's image
    fallback (built by Agent 4) depends on being reachable at that exact path.
    When a journalist uploads media for an article that has no cover_image_url yet, set
    articles.cover_image_url to that file's served path automatically (first image
    uploaded becomes the cover/thumbnail by default; this only applies to
    source_type='staff' articles, never overwritten by the scraper's stock-image logic).
13. Write backend/.env.example listing every variable from the shared context with
    placeholder values (no real secrets).
14. Write backend/tests/ — at minimum, a script (can be a simple node script run with
    `node tests/smoke.js`, doesn't need a test framework given the timeframe) that:
    registers a user, logs in, creates a category as admin, creates an article as
    journalist, submits it, approves it as editor, fetches it publicly. If any step
    fails, the script must exit non-zero and print which step failed. ALSO assert that
    after PATCH /api/admin/users/:id/roles assigns 'journalist' to a fresh user, a
    matching row now exists in the journalists table (not just user_roles) — this is
    the multi-table seam most likely to silently drift.

CONSTRAINTS:
- Every SQL query must be parameterized (?, never string-concatenated values) —
  no exceptions, this is a hard security requirement.
- Match the API CONTRACT paths and response envelope exactly. The frontend agent will
  not have read your code — only the shared context. Any drift here causes integration
  failures Agent 6 will have to debug, costing time you don't have.
- Keep controllers thin. Business logic belongs in services, data access in models.

DEFINITION OF DONE:
- `npm install && node server.js` starts with zero errors against the seeded database.
- GET /api/health returns the expected JSON.
- The smoke test script in tests/ passes end to end.
- Every endpoint in the API CONTRACT exists and returns the documented shape (verify
  with curl or a REST client, not just by reading your own code).
- Commit with message "Agent 2 (Backend Lead): full API, auth, middleware, LLM stub".
```

---

## AGENT 3 PROMPT — LLM Validation Engineer

```
You are the LLM Validation Engineer for RATED UGANDA. Read the SHARED PROJECT CONTEXT.
The backend already exists with a STUB at backend/src/services/llmValidation.service.js
that always returns {valid: true, reason: null}. Your job is to replace the stub with a
real implementation WITHOUT changing its function signature or the controller code that
calls it.

TASK:
1. Implement async function validateArticle(article) in
   backend/src/services/llmValidation.service.js that:
   - Rejects immediately without an API call if article.content is empty, under ~50
     characters, or title is empty (cheap pre-filter, saves API calls/cost).
   - Otherwise calls an LLM API (read LLM_API_URL, LLM_API_KEY, LLM_MODEL from env —
     these should work with any OpenAI-compatible chat completions endpoint, since the
     team has access to Kimi/GLM-style providers; use fetch with a JSON body matching
     the standard {model, messages, max_tokens} shape and Authorization: Bearer header,
     so it is provider-agnostic).
   - Sends a system prompt instructing the model to judge ONLY whether the text reads
     as genuine, coherent news article content (not spam, not gibberish, not empty
     boilerplate, not test text like "asdf asdf") — explicitly tell it NOT to judge
     factual accuracy, political bias, or quality of writing, only structural validity
     as news copy. This avoids the LLM acting as a censor beyond its intended scope per
     the report's flowchart, which only asks it to filter empty/invalid content.
   - Requires the model to respond in strict JSON: {"valid": true|false, "reason": "..."}
     and parses defensively (strip markdown code fences if present before JSON.parse).
   - On any network error, timeout (set an 8-second timeout), or parse failure: FAIL OPEN
     — return {valid: true, reason: "LLM check unavailable, forwarded for manual review"}
     rather than blocking the journalist's submission indefinitely. Log the failure
     server-side. This matters because a 3-day demo cannot depend on a third-party API
     having zero downtime.
2. Add LLM_API_URL, LLM_API_KEY, LLM_MODEL to backend/.env.example with comments
   showing example values for at least one free-tier-friendly provider.
3. Write backend/tests/llmValidation.test.js (simple node script, no framework needed)
   that tests: empty content -> invalid without network call, gibberish-like short
   string -> exercises the pre-filter, and one real call against a clearly valid sample
   news paragraph -> expect valid:true (skip this case gracefully with a console.warn
   if no API key is set in the environment, don't fail the whole script).

CONSTRAINTS:
- Do not change the function signature validateArticle(article) -> Promise<{valid, reason}>.
  Agent 2's controller code already calls it this way.
- Do not add a new database table for this. Reuse editorial_reviews for auto-rejections
  as already wired by Agent 2 (reviewer_id=null, review_status='auto_rejected').
- Keep the timeout strict. A hanging request must not hang the article submission endpoint.

DEFINITION OF DONE:
- Submitting an article with empty/very short content is auto-rejected without any
  network call (verify by checking logs/timing).
- Submitting a real article paragraph returns valid:true and the article becomes
  visible in GET /api/articles/queue/editor.
- If LLM_API_KEY is unset or the API is unreachable, submission still succeeds
  (fail-open) and is forwarded for manual review rather than crashing.
- Commit with message "Agent 3 (LLM Validation Engineer): real validation service
  replacing stub".
```

---

## AGENT 4 PROMPT — Scraper, Rewrite & Image Sourcing Engineer

```
You are the Scraper, Rewrite & Image Sourcing Engineer for RATED UGANDA. Read the
SHARED PROJECT CONTEXT fully, especially the FIXED SCRAPER SOURCE LIST and the
articles table's source_type/source_name/source_url/original_author/cover_image_url
fields, plus the stock_images table. The backend, database, and LLM validation service
already exist and work — you are adding a second content pipeline that feeds the SAME
pending_review queue Agent 2 and Agent 3 already built, AND a thumbnail-sourcing
pipeline for that content. Do not modify the validateArticle() function; you will call
it, not change it.

TASK:
1. backend/db/schema.sql already has scraped_sources and stock_images tables (added
   by Agent 1's updated schema — if either is missing, add it now matching the shared
   context exactly).
2. backend/src/scraper/sources.js — a seed list (as plain JS objects) of exactly the
   six sources in the FIXED SCRAPER SOURCE LIST. Agent 1's seed.sql already inserted
   these six rows into scraped_sources with feed_url='PENDING_VERIFICATION' and
   is_active=false. For each source, locate the real, currently-live RSS feed URL by
   checking the site directly (look for a /feed, /rss, or /feed/rss path, or a
   <link rel="alternate" type="application/rss+xml"> tag on the homepage) — do not
   guess a path and leave it unverified. Once verified, UPDATE that source's row in
   scraped_sources with the real feed_url and set is_active=true (write a small
   one-time script for this, e.g. backend/src/scraper/verifySources.js, run it once,
   and leave it in the repo so the team can re-run it if a feed path changes later). If
   a source genuinely has no working public feed at build time, leave is_active=false
   for it and note why in a code comment rather than blocking on it or scraping its
   HTML instead.
3. Install rss-parser (lightweight, well-maintained) as the only new dependency needed
   for feed parsing. Do not add a general-purpose HTML scraping library (no
   puppeteer/cheerio/playwright) — every source in the fixed list is consumed via RSS
   only, so headless browsing is unnecessary scope for a 3-day build.
4. backend/src/scraper/fetchFeeds.js — for each active row in scraped_sources, fetch
   and parse its feed_url with rss-parser, return normalized items:
   { title, summary (use the feed's description/contentSnippet, strip HTML tags),
   link, pubDate, original_author (feed item's creator/author field if present, else
   null), source_name }. Wrap each source's fetch in its own try/catch so one dead
   feed does not abort the whole run — collect per-source errors into an array to
   return to the caller instead. EXPLICITLY DO NOT extract or store any
   <media:thumbnail>/<enclosure> image URL from the feed item — per the team's
   decision, scraped articles never use the source outlet's own photography, only the
   stock image pool described below.
5. backend/src/services/llmRewrite.service.js — async function
   rewriteArticle({title, summary, source_name}) -> Promise<{title, content}> that
   calls the same LLM provider config as llmValidation.service.js (reuse
   LLM_API_URL/LLM_API_KEY/LLM_MODEL, do not add new env vars for this). System prompt
   must instruct the model to: write a short original news-style article (150-300
   words) based ONLY on the given title and summary, in the model's own words, never
   inventing names, numbers, quotes, or claims not present in the summary, and to
   always end the piece with a line crediting the original source by name. If the
   summary is too thin to responsibly expand (e.g. under ~15 words), return the
   original title/summary essentially unchanged rather than padding with invented
   detail — a short honest rewrite beats a longer fabricated one. On any LLM
   error/timeout (8s, matching llmValidation's pattern), fall back to using the raw
   title and summary as-is as the content, prefixed with "Source: <source_name>." —
   never drop the item silently just because the rewrite step failed.
6. backend/src/services/stockImages.service.js — image sourcing for scraped articles,
   using the Pexels API (read PEXELS_API_KEY from env; endpoint
   https://api.pexels.com/v1/search?query=<term>&per_page=10, header
   "Authorization: <PEXELS_API_KEY>" — note Pexels does NOT use a Bearer prefix).
   a. async function refreshStockImagePool(categoryName) -> fetches ~10 photos for a
      search term derived from the category (e.g. "politics" -> "uganda parliament
      politics", "sports" -> "uganda football sports", "technology" -> "africa
      technology office" — pick sensible, Uganda-flavored search terms per category
      rather than generic single words, since generic terms return generic Western
      stock photography that looks visually disconnected from the platform's subject).
      Stores each result's photo.src.large as image_url, photo.src.medium as
      thumbnail_url, a credit string built as "Photo: <photographer> on Pexels" as
      credit_text, source_provider='pexels', into the stock_images table, replacing
      that category's previous pool entirely (delete old rows for that category_id
      first, this is a refresh not an accumulation).
   b. async function refreshAllCategories() -> calls refreshStockImagePool for every
      row in the categories table, collecting per-category errors without aborting the
      whole batch (mirrors the fetchFeeds.js error-isolation pattern).
   c. async function getRandomStockImage(categoryId) -> SELECTs one random row from
      stock_images for that category_id (ORDER BY RAND() LIMIT 1 is fine at this
      scale) and returns {image_url, thumbnail_url, credit_text}; returns
      {image_url: '/assets/placeholder-cover.jpg', thumbnail_url:
      '/assets/placeholder-cover.jpg', credit_text: null} (the exact static path Agent
      1 committed and documented in backend/db/README.md, served by the static mount
      Agent 2 set up alongside /uploads) if the pool for that category is empty — this
      must NEVER throw or leave an article with a broken image during a live demo, and
      must NEVER make a live API call as its fallback.
   d. This module must be safe to call with an EMPTY or MISSING PEXELS_API_KEY: log a
      clear warning once and have refreshStockImagePool/refreshAllCategories no-op
      successfully (return {refreshed: 0, errors: ["PEXELS_API_KEY not configured"]})
      rather than crashing the scrape cycle that depends on getRandomStockImage's
      fallback path.
7. backend/src/scraper/scrapeRunner.js — the orchestration function runScrapeCycle():
   a. Call fetchFeeds.js across all active sources.
   b. For each item, check articles table for an existing row with the same
      source_url = item.link (simple duplicate guard) — skip if found.
   c. Call llmRewrite.service.js to get {title, content}.
   d. Insert into articles: source_type='scraped', journalist_id=NULL,
      status='pending_review', llm_checked=false, source_name, source_url=item.link,
      original_author, category_id=NULL, district_id=NULL (leave these for the editor
      to assign during review, since RSS rarely gives you a clean category/district
      mapping — do not guess one), cover_image_url=NULL, cover_image_credit=NULL for
      now (image is assigned in step f, AFTER the editor sets a category — see note
      below). REMINDER: journalist_id=NULL here only works because Agent 1 made that
      column nullable as an explicitly OPEN ITEM, not a settled design — do not treat
      this as resolved, and do not create a placeholder journalists row to avoid the
      NULL. If you hit any constraint that prevents journalist_id from being NULL,
      STOP and report it back rather than working around it with an invented
      placeholder journalist.
   e. Call the EXISTING validateArticle() from llmValidation.service.js on the new row,
      exactly as Agent 2's submit endpoint does, and update status/llm_checked the same
      way (valid -> llm_checked=true; invalid -> status='rejected').
   f. Update scraped_sources.last_scraped_at for each source attempted.
   g. Return a summary object: { fetched: N, inserted: N, skipped: N, errors: [...] }.
   NOTE on image timing: since category_id is NULL until an editor assigns it during
   review, cover_image_url cannot be set at scrape time. Instead, modify the EXISTING
   editorial review endpoint (POST /api/articles/:id/review, in Agent 2's
   articles.controller.js) so that when an editor approves a source_type='scraped'
   article AND assigns/confirms its category_id in that same request, the controller
   calls getRandomStockImage(category_id) and sets cover_image_url/cover_image_credit
   on the article before marking it published. This is the one specific, scoped
   change you are allowed to make to Agent 2's existing controller.
8. backend/src/scraper/scheduler.js — uses setInterval reading SCRAPE_INTERVAL_MINUTES
   from env (default 60) to call runScrapeCycle() automatically. ALSO schedule
   refreshAllCategories() on a separate, much longer interval read from
   IMAGE_REFRESH_HOURS (default 24) — stock photos do not need refreshing as often as
   news content. Both intervals started once from server.js, not from app.js (so
   neither runs twice if app.js is ever imported in a test context). Log each automatic
   run's summary to the console.
9. Add the four scraper endpoints plus the one image endpoint from the API CONTRACT
   (GET/POST /api/admin/scraper/sources, PATCH /api/admin/scraper/sources/:id,
   POST /api/admin/scraper/run, GET /api/admin/scraper/runs/last,
   POST /api/admin/images/refresh) as new admin resources following the existing
   models/controllers/routes pattern Agent 2 established — POST /api/admin/scraper/run
   simply calls runScrapeCycle() on demand, POST /api/admin/images/refresh calls
   refreshAllCategories() on demand, both for use as the demo's manual triggers.
10. Update the EXISTING editor queue endpoint behavior check: confirm
    GET /api/articles/queue/editor already returns scraped articles correctly since it
    filters on llm_checked=true AND status=pending_review regardless of source_type —
    if Agent 2's query explicitly filtered by source_type or journalist_id in a way
    that excludes NULL journalist_id rows, fix that query (this, plus the
    review-endpoint change in step 7's note, are the only two existing files you are
    allowed to touch, and only for these specific scoped reasons).
11. Write backend/tests/scraper.test.js (simple node script) that runs
    runScrapeCycle() once against the real feeds and asserts: fetched > 0 OR a clear
    per-source error is logged for any source that failed, inserted articles have
    source_type='scraped' and journalist_id=NULL, and running it twice in a row does
    not duplicate the same articles (tests the dedup guard from step 7b). Also test
    that refreshAllCategories() populates at least one stock_images row per category
    when PEXELS_API_KEY is set, and no-ops cleanly (no throw) when it is unset.

CONSTRAINTS:
- Never scrape full article HTML bodies from any source, even if it would be "easy" —
  the team's own design choice (confirmed by the human) is title+summary+link only,
  specifically to avoid republishing other outlets' full copy. Storing full body text
  scraped from another outlet's page would defeat that choice even if the LLM later
  rewrites it, since the raw body should never enter the system in the first place.
- Never use a scraped source's own photo/thumbnail for cover_image_url — only the
  Pexels-sourced stock_images pool, since the source outlet's photography is not the
  team's to republish, unlike licensed stock photography.
- Respect is_active=false sources — never fetch a disabled source.
- The scraper must be safe to run repeatedly without creating duplicate articles or
  crashing on a single dead/slow feed.
- Do not change validateArticle()'s signature or llmValidation.service.js's internals.
- getRandomStockImage() must never leave an article with a null/broken image in the
  published state — always fall back to the committed placeholder if the pool is empty
  or the provider is unreachable.

DEFINITION OF DONE:
- POST /api/admin/scraper/run (as admin) returns a summary with fetched/inserted/
  skipped counts and completes in well under a minute even if one source is slow/dead.
- At least one scraped article appears in GET /api/articles/queue/editor after a run,
  with source_type='scraped', a populated source_name/source_url, and rewritten
  content that is NOT a verbatim copy of the original feed's summary text.
- POST /api/admin/images/refresh (as admin, with a real PEXELS_API_KEY set) populates
  stock_images with at least a few rows per category, each with a working image_url
  and a non-empty credit_text.
- Approving a scraped article through the editor review flow while assigning a
  category results in that article having a non-null cover_image_url and
  cover_image_credit when fetched publicly afterward.
- Running the scrape cycle twice back to back does not insert duplicate articles.
- The automatic scheduler logs a run on its own after SCRAPE_INTERVAL_MINUTES elapses
  (verify by temporarily setting SCRAPE_INTERVAL_MINUTES=1 during testing only, then
  resetting it to a sane default like 60 before committing).
- Commit with message "Agent 4 (Scraper, Rewrite & Image Sourcing Engineer): RSS
  ingestion, LLM rewrite pipeline, Pexels stock image pool, scheduler, manual triggers".
```

---

## AGENT 5 PROMPT — Frontend Lead

```
You are the Frontend Lead for RATED UGANDA. Read the SHARED PROJECT CONTEXT fully,
especially the API CONTRACT — you are building against that contract, not against
backend source code. Assume the backend matches it exactly (Agents 2–4 have already
verified this, including the scraper endpoints under /api/admin/scraper/*).

TASK:
1. Scaffold with Vite + React (JavaScript, not TypeScript, to match the existing
   express_setup/index.js precedent and save time). Install react-router-dom, axios.
2. backend/.env.example already defines the contract; create frontend/.env.example with
   VITE_API_BASE_URL=http://localhost:5000/api.
3. src/api/ — one file per resource (auth.js, articles.js, categories.js, districts.js,
   comments.js, admin.js, scraper.js). Each exports plain async functions wrapping
   axios calls to the exact endpoints in the API CONTRACT. A single shared axios
   instance in src/api/client.js attaches the JWT from localStorage to every request
   automatically and redirects to /login on a 401 response (response interceptor).
4. src/context/AuthContext.jsx — holds {user, token, login(), logout(), loading},
   persists token to localStorage, exposes a useAuth() hook, and exposes hasRole(name)
   for convenience (checks user.roles array from /api/auth/me).
5. src/components/RoleGuard.jsx — wraps routes, redirects to /login if not authenticated
   or to / with a toast if authenticated but lacking the required role.
6. Pages (functional components, React Router v6 nested routes):
   - Public/: HomePage — NOT a plain filterable list. Build the richer magazine-style
     layout below, modeled directly on the team's approved RATED UGANDA reference
     design (desktop + mobile mockup). Match this reference's STRUCTURE and BRAND
     IDENTITY closely — this is no longer a loose "borrow the vibe" instruction, the
     team has signed off on a specific look:
     a. Top utility bar: thin black bar, "Follow Us:" + Instagram/X icons on the left,
        current date on the right (desktop only — drop this bar on mobile to save
        vertical space, the mobile version goes straight to the header).
     b. Header: "RATED" in black + "UGANDA" in red, stacked or inline (match the
        wordmark style in the reference — a thin vertical red/yellow/black bar sits
        immediately to the left of the wordmark as a small brand accent, reuse this
        exact mark as the site's favicon/logo treatment everywhere it appears, e.g.
        Navbar and any future loading screens). Desktop: full horizontal nav inline
        with the header (see step (c) for items) plus a search icon. Mobile: just the
        wordmark, a search icon, and a hamburger menu icon — full nav lives behind the
        hamburger, not inline.
     c. Nav items, desktop and inside the mobile hamburger menu alike: Home, Politics,
        Business, Sports, Technology — these four map directly to real rows in the
        categories table, fetch them dynamically, do not hardcode the labels. Health
        (the 5th seeded category) also gets a nav item for the same reason — add it
        after Technology. Do NOT add "Districts", "Features", or "Opinion" as nav
        items: Districts is a real filter dimension in the schema but is surfaced via
        the homepage's "Popular Districts" sidebar and the article filter UI instead of
        the top nav (so it isn't lost, just relocated); Features and Opinion have no
        backing data model in this build and must not become dead links — leave them
        out entirely rather than rendering a nav item that 404s.
     d. Breaking news ticker, directly under the header: a black bar with a red
        "BREAKING NEWS" pill on the left, followed by a horizontally-scrolling or
        auto-rotating strip of headlines, with left/right arrow controls on desktop
        (mobile shows one headline at a time with a right-chevron only, matching the
        reference). This is NOT a curated/manually-flagged feature — populate it
        automatically from the 3-4 most recently published articles platform-wide
        (regardless of category), refetched whenever the homepage loads. Clicking a
        ticker headline navigates to that article. If fewer than 2 published articles
        exist, hide the ticker entirely rather than showing an empty or single-item bar.
     e. Hero zone: the single most recent published article, full-width cover image,
        a small yellow "TOP STORY" pill badge top-left over the image, title and a
        short excerpt overlaid at the bottom of the image (white text over a dark
        gradient scrim for legibility, as in the reference) plus published_at and an
        estimated read time (derive read time client-side from content length, e.g.
        Math.ceil(wordCount / 200) + " min read" — do not invent a backend field for
        this). On mobile this same hero becomes a swipeable carousel of the 3-4 most
        recent articles (small dot indicators at the bottom, matching the reference)
        rather than a single static hero — reuse a touch/swipe library already
        available via npm rather than hand-rolling gesture detection if one is already
        a common lightweight choice (e.g. embla-carousel-react or keen-slider); if
        unsure, a simple CSS scroll-snap carousel with dot indicators driven by
        IntersectionObserver is an acceptable lower-dependency fallback.
     f. "Latest Articles" panel, beside the hero on desktop (right-hand column) and
        directly below the hero on mobile (matching the reference's stacked order):
        a "View all" link top-right, then 5 rows, each a small thumbnail + title +
        published_at, no excerpt text — this is intentionally a denser, more
        skimmable list than the hero, mirroring the reference exactly.
     g. "Explore by Category" row: one card per real category (icon, name, one-line
        description pulled from categories.description if present, else a sensible
        generic fallback sentence) — top border colored per category in a small
        rotating accent palette (red/yellow/dark, cycling) purely for visual rhythm,
        not semantically meaningful. On mobile this collapses to icon-only circular
        buttons in a horizontally scrollable row (matching the reference's compact
        mobile category strip) rather than the full desktop cards.
     h. "Latest News" panel: a "View all" link top-right, then a 2-column grid (1
        column on mobile) of larger cards (thumbnail + title + 2-line excerpt +
        published_at) for the next batch of recent articles after those already shown
        above — do not repeat the same articles already used in the hero/ticker/latest
        list, dedupe in the same page-load fetch.
     i. On MOBILE specifically, reorder sections vertically to match the
        reference exactly: ticker -> hero carousel -> Latest Articles -> Explore by
        Category -> Latest News. Desktop keeps hero+sidebar side by side as in (e)/(f)
        with category row and Latest News below, full-width.
     j. Category and district filtering plus the search bar still apply across this
        whole page exactly as before — when a filter/search is active, collapse the
        entire ticker+hero+grid+sidebar layout down to a simpler filtered results list
        (don't try to force search results into the magazine layout, that gets
        visually awkward).
     k. For every card/hero showing a thumbnail: if cover_image_url is null, render a
        plain category-colored placeholder block with the category name as text
        instead of a broken image tag — never let a missing image crash or blank out
        a card. If source_type==='scraped', render cover_image_credit as small,
        unobtrusive text in the corner of the image (e.g. "Photo: Jane D. / Pexels"),
        per the attribution requirement already established for scraped content.
     ArticleDetailPage (full-width cover_image_url at top with credit if present, full
       article, comments section, view tracking on mount)
   - Auth/: LoginPage, RegisterPage
   - Journalist/: DashboardPage (their own articles + status, each row showing its
     thumbnail if set), NewArticlePage (form + media upload — clarify in the UI that
     the first uploaded image becomes the article's cover/thumbnail automatically),
     EditArticlePage (only for draft/returned articles)
   - Editor/: QueuePage (lists llm_checked articles awaiting review, clearly tagged
     "Staff" or "Scraped from <source_name>" per article; for source_type='scraped'
     items the ReviewPage's category/district fields are required inputs since the
     scraper leaves them unset — show only Approve/Reject for scraped items, not
     Return, since there is no journalist to send corrections back to; note in the UI
     that approving a scraped article will auto-assign a stock thumbnail based on the
     category chosen, so the editor understands why no image preview exists yet at
     review time)
   - Admin/: UsersPage (approve pending accounts, assign roles via a dropdown/checkbox
     set — IMPORTANT: if the logged-in user only has the 'administrator' role and not
     'super_admin', the 'super_admin' option must not appear in that list at all,
     matching the backend's body-level restriction from Agent 2 task 11; a plain admin
     should never even see the option to grant a role they're not allowed to grant),
     CategoriesPage, DistrictsPage (simple CRUD forms/tables for both — note these are
     'administrator'-only per the API contract, so RoleGuard this route to
     'administrator' specifically, NOT super_admin, matching the admin_id FK reasoning
     in the shared schema), ScraperPage (table of scraped_sources with an
     active/inactive toggle per source, a "Run scrape now" button calling
     POST /api/admin/scraper/run and showing the returned fetched/inserted/skipped
     summary, and the result of GET /api/admin/scraper/runs/last on page load; also
     include, on the same page or a small adjacent panel, a "Refresh stock images"
     button calling POST /api/admin/images/refresh showing its returned summary)
7. src/components/Navbar.jsx — implements the utility bar, header, and nav structure
   from step 6(a)-(c) above, including the mobile hamburger collapse. Shows different
   role-specific links (Journalist Dashboard, Editor Queue, Admin panel) based on
   hasRole(), shows login/logout state, matching the reference's Login/Sign Up button
   styling when logged out (outlined "Login" + solid red "Sign Up").
8. src/components/ArticleCard.jsx — ONE shared card component (accepting a size prop:
   'hero' | 'medium' | 'small' | 'list-row') used everywhere a thumbnail+title+meta
   combination appears (homepage hero, grid, sidebar list rows, featured row,
   journalist dashboard, search results). Do not duplicate this markup across pages —
   every place a card appears should render this one component differently sized, so a
   later visual tweak only needs one edit.
9. src/components/BreakingNewsTicker.jsx — a separate small component (not folded into
   ArticleCard, since its layout is structurally different: a horizontal scrolling
   strip, not a card) implementing step 6(d) above, reused as-is with no
   page-specific variation needed.
10. Loading and error states are mandatory on every page that fetches data — never
    render a blank screen while waiting, never silently swallow a fetch error (show a
    visible message). For image-heavy cards specifically, reserve the thumbnail's
    aspect-ratio space before the image loads (e.g. via CSS aspect-ratio) so the layout
    doesn't jump/reflow as images come in — this matters more here than on a plain text
    list, since the whole point of this layout is visual stability and polish.
11. Visual design system — implement this EXACTLY via CSS variables in a single
    src/index.css, applied consistently across all pages (not just the homepage):
    --color-primary-red: a strong red (~#D62B2B or close) for the "Sign Up" button,
      "BREAKING NEWS" pill, "TOP NEWS" underline accents, and the "UGANDA" half of
      the wordmark.
    --color-accent-yellow: used sparingly for "TOP STORY" pill badges and small accent
      bars (e.g. the brand mark's stripe, category top-borders).
    --color-text-dark: near-black for the "RATED" half of the wordmark, nav links,
      and body headings.
    --color-bg-page: a very light gray/off-white (not pure white) for the page
      background, with white cards/panels sitting on top of it for contrast.
    --color-navbar-bg: black/near-black for the utility bar.
    Typography: one clean sans-serif (system-ui stack is fine, no need to add a
    webfont dependency) with a clear weight contrast between headline text (bold,
    larger) and meta text like dates (regular weight, smaller, muted gray). Apply
    these variables consistently — do not let pages drift into inconsistent ad hoc
    inline styles. This is a closer pixel-fidelity target than typical "borrow the
    vibe" guidance because the team has explicitly approved this exact look; spend
    real effort matching it rather than treating it as a loose suggestion.
12. App.jsx wires up all routes, wraps the app in AuthProvider, and includes a fallback
    404 route.
13. ArticleDetailPage and any article list/card component must render attribution
    conditionally: if source_type==='staff', show the author's full_name; if
    source_type==='scraped', show "Source: <source_name>" as a link to source_url
    instead of an author name, and never imply a RATED UGANDA journalist wrote it.

CONSTRAINTS:
- Never hardcode http://localhost:5000 anywhere except inside the one client.js file
  that reads import.meta.env.VITE_API_BASE_URL — this is what lets the team change the
  backend URL in one place during deployment.
- Do not invent endpoints not in the API CONTRACT. If a page seems to need data the
  contract doesn't provide, note it in a TODO comment and use a sensible client-side
  fallback (e.g. compute it from existing fields) rather than guessing at a new backend
  route, since you cannot modify the backend.
- Every form must show inline validation errors returned from
  error.response.data.error.message (the shared envelope) — never show a raw
  "Network Error" with no context if the backend already gave a clear message.
- This homepage spec replaces the earlier looser "borrow the vibe" guidance entirely —
  the team has approved a specific reference design (desktop + mobile), so match its
  structure (utility bar, ticker, hero/carousel, sidebar, category row, latest news
  grid), brand colors, and mobile/desktop layout differences closely. You do not need
  literal pixel-perfect spacing, and there is no live-TV button, weather widget, or
  similar element to add beyond what's specified above — but do not water the
  structure down to a generic list either; the specific sections and their order are
  part of the spec, not optional flourish.
- Add at most one small carousel/swipe dependency (per step 6e) if you use one — do not
  pull in a large UI kit or component library for this; the rest of the homepage should
  be hand-built with plain CSS/flexbox/grid against the index.css variables.

DEFINITION OF DONE:
- `npm run dev` starts cleanly.
- A full manual click-through works: register -> (note: needs admin approval, so also
  manually log in as the seeded admin) -> approve the new user as journalist -> log
  in as journalist -> write and submit an article -> log in as editor -> approve it ->
  log out -> view it as an anonymous visitor on the homepage -> open it -> see the view
  count increment -> log in as reader -> post a comment.
- The homepage renders the full structure from the reference: utility bar (desktop),
  breaking news ticker (auto-populated from recent articles, hidden gracefully if too
  few exist), hero (or mobile carousel), a "Latest Articles" panel, an "Explore by
  Category" row, and a "Latest News" grid — all populated from real data, not a flat
  unstyled list, and using the red/yellow/black brand palette from the visual design
  system in step 11.
- Resizing the browser to a mobile width (or testing in real mobile viewport) shows the
  hamburger nav, the carousel hero with dot indicators, and the section reorder
  described in step 6(i) — this is not just a responsive reflow of the desktop layout,
  the mobile experience has deliberately different components in a few places (ticker
  becomes single-headline, hero becomes a swipeable carousel, category row becomes
  icon-only).
- A staff article (with a journalist-uploaded photo) and an approved scraped article
  (with a Pexels-sourced thumbnail and visible credit text) both render correctly and
  distinctly in the same grid.
- An article with no image at all (e.g. before any thumbnail is set) shows the
  category-colored placeholder, never a broken image icon.
- As admin, trigger a manual scrape via the ScraperPage and confirm at least one
  scraped article subsequently appears in the editor queue, clearly labeled, and can
  be approved into the public homepage with correct "Source: ..." attribution.
- No console errors during that full click-through.
- Commit with message "Agent 5 (Frontend Lead): full React app wired to API contract,
  including scraped-source admin UI and attribution".
```

---

## AGENT 6 PROMPT — Integration & QA Engineer

```
You are the Integration & QA Engineer for RATED UGANDA. Backend, LLM validation,
scraper pipeline, and frontend are now all built independently against the shared API
CONTRACT. Your job is to find and fix every seam where they disagree, and every flow
that breaks end to end. You are the agent most likely to catch what the other agents
could not see in isolation.

TASK:
1. Start the database (run schema.sql + seed.sql fresh), start the backend, start the
   frontend. Confirm all three start with zero errors before testing anything else.
2. Walk through EVERY flow in the DEFINITION OF DONE checklists of Agents 2, 3, 4, and 5
   personally, end to end, in the actual running app — not by reading code.
3. For every mismatch you find between frontend expectations and backend reality
   (wrong field name, wrong status code, wrong envelope shape, missing CORS header,
   route typo, etc.), fix it at the source: prefer fixing the side that deviated from
   the documented API CONTRACT rather than bending the contract further. If both sides
   plausibly match the contract but still don't work together, fix whichever fix is
   smaller and note the discrepancy.
4. Specifically stress-test these failure-prone seams:
   - Role-gated routes: confirm a reader genuinely cannot reach journalist/editor/admin
     pages or call their APIs directly (test with curl using a reader's token, not just
     by checking the UI hides the button).
   - Admin/super_admin permission boundary: log in as a plain 'administrator' (not
     super_admin) and confirm via curl that PATCH /api/admin/users/:id/roles with
     {role_name:'super_admin'} is genuinely rejected (403), not just hidden in the UI.
     Confirm the same plain administrator CAN successfully assign 'journalist',
     'reader', and 'editor' roles. Confirm POST /api/categories and POST
     /api/districts work for 'administrator' but are appropriately scoped per the
     contract (these should not require super_admin).
   - Multi-role support: take one seeded user, assign them BOTH 'journalist' and
     'editor' roles via the admin UI/API, confirm a matching row now exists in BOTH
     journalists AND editors for that single user_id, and confirm that user can both
     submit their own article AND see/approve articles in the editor queue (including,
     if your test setup allows it, approving their own submitted article — the system
     should not specifically block this edge case unless you've deliberately added
     that rule, in which case document it in QA_REPORT.md rather than silently fixing
     it either way).
   - The full article lifecycle status machine: draft -> pending_review -> (llm check)
     -> editor queue -> published OR returned -> back to draft-like edit -> resubmit.
     Confirm an article can be returned and successfully resubmitted, not just approved
     on the first try.
   - Media upload: confirm an uploaded image actually renders on the article detail
     page (check the served URL resolves, not just that upload returns 200).
   - Empty states: zero articles, zero categories, zero pending users — confirm the UI
     doesn't crash, shows a sensible empty message instead. Specifically check the
     breaking news ticker and mobile hero carousel with fewer than 2 published
     articles — both must degrade gracefully (ticker hides entirely per spec; carousel
     should not show broken dot indicators for a single item or crash on zero items).
   - Mobile layout, tested at a real narrow viewport (browser dev tools mobile
     emulation is sufficient): confirm the hamburger menu opens and contains all nav
     items, the hero renders as a swipeable carousel (not a broken static image), the
     breaking news ticker shows one headline with a working chevron rather than
     overflowing the screen width, the category row collapses to icon-only scrollable
     buttons, and section order matches ticker -> hero carousel -> Latest Articles ->
     Explore by Category -> Latest News as specified. This is the area most likely to
     have drifted from spec since it is the most detailed, newest part of the build.
   - JWT expiry: confirm an expired/invalid token cleanly redirects to login instead of
     showing a frozen or broken page.
   - The LLM validation fail-open path: temporarily set an invalid LLM_API_KEY, confirm
     article submission still succeeds and reaches the editor queue rather than hanging
     or erroring.
   - Scraper run via the admin UI: confirm it completes and surfaces a result even if
     one of the six configured sources is down (one dead feed must not abort the whole
     run or hang the request).
   - Scraper dedup: trigger two manual scrape runs back to back, confirm the second run
     reports the same items as "skipped" rather than inserting duplicates.
   - Scraped article in editor queue: confirm the editor can set category/district
     (left null by the scraper) and approve it, and that it then renders publicly with
     "Source: <name>" attribution rather than a journalist's name.
   - A disabled source (is_active=false, toggled via the admin ScraperPage) is
     genuinely skipped on the next run, not fetched anyway.
   - Image fallback: temporarily unset/invalidate PEXELS_API_KEY, trigger an image
     refresh, confirm it fails gracefully (no crash, clear error in the response), and
     that an article approved with an empty stock_images pool for its category still
     gets the committed placeholder image rather than a null/broken thumbnail.
   - Approve one scraped article end to end and visually confirm on the live homepage
     that its thumbnail and "Photo: ... / Pexels" credit both render correctly next to
     a staff article's journalist-uploaded photo in the same grid, with visually
     distinct attribution for each.
5. Run backend/tests/smoke.js, backend/tests/llmValidation.test.js, and
   backend/tests/scraper.test.js, confirm all three pass after your fixes.
6. Produce a short backend/tests/QA_REPORT.md listing: every bug found, what caused it,
   how it was fixed, and any known remaining issue with a suggested workaround for the
   demo (e.g. "if X breaks live, do Y instead").

CONSTRAINTS:
- Do not silently change the API CONTRACT in the shared context document without
  flagging it clearly at the top of QA_REPORT.md as a "CONTRACT CHANGE" — the team
  needs to know if the documented contract no longer matches reality.
- Prefer minimal, targeted fixes over rewrites. You are debugging integration, not
  redesigning features, given the remaining time budget.

DEFINITION OF DONE:
- Every flow listed in step 4 above passes manually in the running app.
- All three test scripts pass.
- QA_REPORT.md exists and is honest about what still doesn't work, if anything.
- Commit with message "Agent 6 (QA Engineer): integration fixes + QA report".
```

---

## AGENT 7 PROMPT — DevOps / Release Engineer

```
You are the Release Engineer for RATED UGANDA, finishing the 3-day build for a Day Two
team demo. The app works locally per Agent 6's QA report. Your job is to make it easy
for anyone on the team (or the mentor) to start it from a clean checkout, and to leave
the repo in a state ready to present.

TASK:
1. Verify backend/.env.example and frontend/.env.example are complete and accurate
   against the actual code (cross-check every process.env / import.meta.env reference
   in the codebase against these files, including SCRAPE_INTERVAL_MINUTES,
   PEXELS_API_KEY, IMAGE_REFRESH_HOURS, and the LLM variables shared by both
   validation and rewrite services — missing variables here are the #1 cause of
   "works on my machine" demo failures).
2. Add npm scripts to both package.json files: a "dev" script for each, and a root-level
   instruction in README.md for running both concurrently (two terminals is fine, don't
   over-engineer a process manager for a 3-day project).
3. Write the final README.md covering: project description (pull from the Executive
   Summary in the report), tech stack, prerequisites, exact setup steps from a fresh
   clone (clone -> create MySQL db -> run schema.sql -> run seed.sql -> copy .env.example
   to .env in both folders and fill real values -> sign up for a free Pexels API key at
   pexels.com/api and set PEXELS_API_KEY -> npm install in both -> npm run dev in
   both -> trigger one manual image refresh via the admin ScraperPage before the first
   demo so the stock_images pool isn't empty on first load), demo login credentials for
   each role (use the seeded admin and instruct how to promote a test user to
   journalist/editor via the admin UI), how the scraper works (the six configured
   Ugandan RSS sources, the automatic interval, and where to click "Run scrape now" for
   a live demo moment), and a "Known Limitations" section pulled honestly from Agent
   6's QA_REPORT.md.
4. Confirm .gitignore at the root AND inside backend/ and frontend/ correctly excludes
   node_modules/, .env, backend/uploads/* (but keep the folder via .gitkeep), and any
   build output (dist/).
5. Run a final fresh-clone simulation: in a new temp directory, clone the repo, follow
   your own README instructions exactly, word for word, and confirm the app comes up,
   INCLUDING triggering one manual scrape run and confirming it succeeds (or fails
   gracefully with a clear message if outbound network access to the RSS sources is
   blocked in that environment — note this explicitly in Known Limitations if so, since
   it is exactly the kind of thing that surprises a team mid-demo).
   Fix the README or the code if any step fails — a setup guide that doesn't actually
   work is worse than no guide.
6. Confirm GET /api/health still returns the assignment-required response, and that the
   frontend homepage still displays it somewhere visible (the team's earlier Day One
   deliverable) OR document clearly that this check has been superseded by the full app
   if that endpoint's UI display was removed during Agent 5's build.

CONSTRAINTS:
- Do not introduce Docker, CI/CD pipelines, or deployment infrastructure unless
  explicitly asked — that is out of scope for a 3-day functional demo and risks eating
  the time buffer needed for last-minute fixes.
- Do not modify application logic. If you find a functional bug at this stage, document
  it in README's Known Limitations rather than attempting a fix that could destabilize
  a working demo on the day before presentation.

DEFINITION OF DONE:
- A genuinely fresh clone, following only the README, results in a running app with a
  working manual scrape trigger.
- README is honest, specific, and includes working demo credentials.
- Final commit message: "Agent 7 (Release Engineer): setup docs, env verification,
  fresh-clone test passed".
```

---

## 3. POST-BUILD CHECKLIST FOR YOU (the human)

- [ ] Confirm every team member has at least one commit under their own name/GitHub
  account for the assignment's contribution requirement — agent commits alone will not
  satisfy "at least one contribution from every team member."
- [ ] Screenshot the Agile board reflecting these seven phases moved through
  Backlog → In Progress → Testing → Done.
- [ ] Before the demo, re-run Agent 6's exact manual flow once yourself live, since
  agents can mark something "done" based on a state that has since drifted.
- [ ] Rotate or revoke the LLM_API_KEY used during development before making the repo
  public, and confirm it was never committed (check `git log -p -- backend/.env` returns
  nothing).
- [ ] Spot-check one or two scraped-and-rewritten articles by hand before the demo —
  read the original source link side by side with the LLM rewrite, and confirm the
  rewrite hasn't introduced any name, number, or claim that wasn't in the original
  summary. This is the one output an automated test can't fully judge for you.
