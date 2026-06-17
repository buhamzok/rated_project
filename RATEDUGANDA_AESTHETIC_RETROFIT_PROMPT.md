# RATED UGANDA — Aesthetic Retrofit Prompt
**Context:** The app is already built and functional (auth, articles, scraper, admin,
everything works end to end). This is a STYLING-ONLY pass to bring the existing
HomePage, Navbar, and ArticleDetailPage in line with an approved visual reference.
No new features, no new endpoints, no new routes, no schema changes.

---

## PROMPT — Aesthetic Retrofit Engineer

```
You are doing a visual retrofit of an already-working React app called RATED UGANDA —
a Ugandan news platform. The application logic, API calls, routing, auth, and data
fetching all already work correctly. Your ONLY job is to change how things look:
colors, typography, spacing, layout structure, and a small number of new presentational
elements (described below). You are not building new features.

FIRST, before changing anything:
1. Locate and read the current implementations of: the Navbar/header component, the
   HomePage component, the ArticleDetailPage component, and the global stylesheet
   (likely src/index.css or similar — find wherever shared styles/CSS variables
   currently live, if any exist yet).
2. Identify how data currently gets to these components (props, context, hooks, API
   calls) — you need to know this so you preserve every data dependency exactly as-is
   while changing only the markup/CSS around it. Do NOT change a prop name, a function
   call, an API endpoint, or any piece of state management logic anywhere in this pass.
3. If the project does not yet have a single shared stylesheet with CSS variables for
   color/typography, create one (e.g. src/styles/theme.css, imported once in
   main.jsx/App.jsx) rather than adding ad hoc inline styles or scattering new colors
   across multiple files. If one already exists, extend it rather than creating a
   second, competing one.

TARGET VISUAL DIRECTION (a Ugandan news platform called RATED UGANDA, reference design
approved by the team):

Brand identity:
- Wordmark: "RATED" in near-black, "UGANDA" in a strong red, sitting side by side or
  stacked, with a thin vertical accent stripe (red/yellow/black) immediately to its
  left as a small logo mark. Use this same wordmark treatment everywhere the site name
  appears (Navbar, browser tab favicon if easy to add, any loading state).
- Color palette (define as CSS variables, do not hardcode hex values inline anywhere):
  --color-primary-red: a strong red, used for the "Sign Up" button, any "BREAKING" or
    "TOP NEWS" pill badges, link-hover accents, and the "UGANDA" half of the wordmark.
  --color-accent-yellow: used sparingly — small accent bars/stripes, a "TOP STORY"
    pill badge on the hero image, category top-border accents.
  --color-text-dark: near-black, used for the "RATED" half of the wordmark, headings,
    and primary nav text.
  --color-text-muted: a medium gray for secondary text like dates and bylines.
  --color-bg-page: a very light gray/off-white (not pure white) for the page
    background.
  --color-bg-card: white, for cards/panels sitting on top of the page background, so
    there is visible contrast between page and card.
  --color-navbar-bg: black or near-black, for a slim utility bar above the main header.
- Typography: one clean sans-serif (the existing system font stack is fine — do not add
  a new webfont/Google Fonts dependency for this). Headlines should be visibly bolder
  and larger than meta text (dates, bylines), and meta text should use
  --color-text-muted, not full black, to create a clear visual hierarchy.

Navbar / header structure (desktop):
- A slim black utility bar above the main header: "Follow Us:" plus small social icons
  on the left (these can be static/non-functional placeholder icons/links — no real
  social integration exists, this is purely decorative), and the current date on the
  right. If adding live social icons feels like scope creep, simple inline SVG icons
  or a small icon font already available in the project's dependencies is sufficient —
  do not add a new icon library dependency just for this.
- Main header below it: the wordmark on the left, horizontal nav links in the middle
  (Home, plus one link per real category already in the system — fetch these
  dynamically from whatever the app already uses to get categories, do not hardcode
  category names), and a search icon plus Login/Sign Up (or user menu, if already
  logged in) on the right. Style the "Sign Up" button as a solid red filled button and
  "Login" as an outlined button beside it, matching typical primary/secondary button
  conventions.
- On narrow/mobile viewports: collapse the horizontal nav into a hamburger menu icon
  that reveals the nav items (and any role-specific links like Journalist Dashboard,
  Editor Queue, Admin panel that already exist in the current Navbar) in a slide-down
  or slide-in panel. Drop the utility bar entirely on mobile to save vertical space.
- Do not add nav items for anything without a real underlying page already in the app
  (no dead links). If the app does not currently have, for example, an "Opinion"
  section, do not add a nav item for it just because it looks nice.

Breaking news strip (new small presentational element, NOT a new feature):
- A slim black bar directly under the header with a red "BREAKING NEWS" pill on the
  left, followed by a headline (or horizontally scrolling/rotating set of headlines on
  desktop, single headline with a forward arrow on mobile).
- Populate this from data the app already has available — the most recently published
  articles, however that's currently fetched for the homepage (reuse the existing
  article-fetching logic/hook/API call rather than adding a new one). Do not build a
  new backend endpoint or new "is this breaking news" flag for this — derive it
  client-side from whatever "most recent published articles" data is already on the
  homepage.
- If there are fewer than 2 published articles available, hide this strip entirely
  rather than rendering an empty or single-item bar.
- Clicking a headline in the strip navigates to that article exactly the way clicking
  any other article link already does elsewhere in the app — reuse the existing
  navigation logic, do not write new routing.

HomePage layout (restructure the existing markup/CSS, keep all existing data fetching
exactly as-is):
- Hero zone: the single most recent published article, large, with its cover image
  full-width, a small yellow "TOP STORY" pill badge over the top-left of the image,
  and the title + a short excerpt overlaid near the bottom of the image (white text
  over a dark gradient for legibility). Show published date and an estimated read time
  if the app already computes one; if it doesn't, you may compute a rough one
  client-side from the article's existing content length, but do not add a new
  backend field for this.
- A "Latest Articles" panel beside the hero on desktop, below it on mobile: a "View
  all" link, then a handful of rows, each a small thumbnail + title + date, no excerpt
  — deliberately denser/more skimmable than the hero.
- A category row: one small card or icon per real category already in the system
  (icon + name), collapsing to icon-only scrollable circles on mobile.
- A "Latest News" section below: a multi-column grid (single column on mobile) of
  cards with thumbnail + title + short excerpt + date, for further recent articles.
- On mobile, the hero becomes a swipeable carousel of the few most recent articles
  (small dot indicators) instead of a single static hero, if this is a reasonable
  amount of added complexity — if the existing codebase already has a carousel/slider
  pattern used anywhere, reuse it; if not and adding one feels disproportionate to a
  styling pass, a simple CSS scroll-snap row with dot indicators is an acceptable
  lighter-weight version. Use your judgment on effort here, but do not skip the mobile
  layout entirely — at minimum the hero should look intentional and not broken on a
  narrow screen.
- For ANY thumbnail/cover image the app already handles as potentially missing/null:
  preserve whatever existing fallback behavior is there, but make sure the fallback
  itself looks intentional (a clean colored placeholder block, not a broken image
  icon) rather than changing the underlying logic for when a fallback is shown.
- If the app already distinguishes staff-written vs. scraped/sourced articles visually
  (e.g. author name vs. "Source: X" attribution), preserve that distinction exactly,
  just restyle it to fit the new visual language (e.g. small muted-gray credit text in
  the corner of an image) rather than removing or changing the underlying condition
  that decides which one to show.

ArticleDetailPage:
- Full-width cover image at the top (if one exists for that article), with the title,
  byline/source-attribution (preserve existing logic for which one is shown), and date
  styled consistently with the new typography/color system.
- Body content should use generous line-height and a comfortable reading width (don't
  let paragraphs stretch edge-to-edge on wide screens — constrain to a readable
  max-width and center it).
- Comments section and any existing interactive elements (view counter, comment form,
  etc.) keep their exact current behavior — just restyle their visual appearance
  (spacing, borders, button colors pulled from the new CSS variables) to match the rest
  of the site.

CONSTRAINTS — read this twice, this is the part most likely to go wrong:
- Do NOT change any API call, fetch URL, prop name, function signature, route path, or
  piece of state management anywhywhere. If you find yourself editing a .js/.jsx file
  that contains both markup and logic, change ONLY the JSX/markup/className/style
  portions and leave every line of logic (data fetching, event handlers, conditionals
  that decide WHAT to show) completely untouched. You are allowed to wrap existing
  elements in new container divs/CSS classes for layout purposes — that is a styling
  change, not a logic change.
- Do NOT add new npm dependencies unless genuinely necessary for one specific piece
  (e.g. a carousel library, per the HomePage section above) — and if you do, justify it
  in a one-line comment and prefer the smallest/lightest option. Do not add a CSS
  framework (Tailwind, Bootstrap, MUI, etc.) on top of an app that currently uses plain
  CSS — that would be a much bigger change than "aesthetics" and risks breaking
  existing styles elsewhere in ways that are hard to predict.
- Do NOT touch any backend file, any file under a /server, /api, or /backend directory,
  any database schema, or any environment variable. This is a frontend-only,
  styling-only pass.
- Do NOT remove or rename any existing CSS class that other components might also
  depend on without first checking whether it's used elsewhere (grep/search the
  codebase before deleting any shared class or component).
- Do NOT change the content/copy of anything — page text, button labels, error
  messages — only how it looks. If something is currently labeled "Submit" and the
  reference design happens to show different wording, keep the existing label.
- If implementing something exactly as described above would require changing
  application logic (for example, if there's currently no concept of "most recently
  published articles" available anywhere on the homepage to power the breaking news
  strip), STOP and describe the smallest possible read-only addition needed (e.g. "the
  homepage already fetches an articles array sorted by date, I can reuse the first 3
  items of that same array with no new fetch") rather than silently writing a new
  backend endpoint or new piece of state to solve it.
- Test in both a desktop-width and a narrow mobile-width browser view (dev tools
  device emulation is fine) before considering this done — a styling pass that only
  looks right at one width is not finished.

DEFINITION OF DONE:
- The app still runs and every existing feature still works exactly as before this
  pass started: registration, login, article submission/review/publishing, comments,
  view tracking, admin actions, the scraper trigger — none of that behavior changed,
  only its appearance.
- Navbar, HomePage, and ArticleDetailPage visually reflect the brand colors,
  typography, and layout structure described above, consistently, using shared CSS
  variables rather than one-off hardcoded values scattered across files.
- The breaking news strip appears when there's enough recent content and hides
  cleanly when there isn't, without any new backend changes.
- The layout holds together sensibly at both desktop and mobile widths.
- No console errors introduced by this pass.
- Commit with a clear message, e.g. "Aesthetic retrofit: brand colors, homepage
  layout, navbar, article detail styling — no logic changes".
```
