# Pro Value-Add Features — Change Log

## Summary
Added 3 major Pro-only features to justify the $9.99/week subscription: Application Tracker, Salary Insights, and auto-tracking of "View Original Posting" clicks. Also updated the Pricing page and Navigation.

---

## Feature 1: Application Tracker (`/tracker`)

### `shared/schema.ts`
- Added `applications` table schema with fields: `id`, `userId`, `jobId` (nullable), `jobTitle`, `company`, `location`, `status` (applied/interviewing/offer/rejected/ghosted), `appliedAt`, `notes`, `followUpDate`, `url`
- Added `insertApplicationSchema` (drizzle-zod)
- Added `Application` and `InsertApplication` TypeScript types

### `server/storage.ts`
- Imported `applications` table and related types from schema
- Added `CREATE TABLE IF NOT EXISTS applications` DDL block
- Added to `IStorage` interface: `getApplicationsByUser`, `createApplication`, `updateApplication`, `deleteApplication`, `getApplicationStats`
- Implemented all 5 methods in `SqliteStorage`

### `server/routes.ts`
- Imported `insertApplicationSchema`
- Added `GET /api/applications/stats` — returns count by status for the current user (requireAuth + requireSubscription)
- Added `GET /api/applications` — list user's applications (requireAuth + requireSubscription)
- Added `POST /api/applications` — create new application (requireAuth + requireSubscription)
- Added `PATCH /api/applications/:id` — update status/notes/etc. with ownership check (requireAuth + requireSubscription)
- Added `DELETE /api/applications/:id` — delete with ownership check (requireAuth + requireSubscription)

### `client/src/pages/tracker.tsx` (new file)
- Full kanban-style board with 5 status columns: Applied, Interviewing, Offer, Rejected, Ghosted
- Stats summary row at top showing counts per status + total
- Each application card shows: title, company, location, status badge, applied date, follow-up date, notes, and link to original posting
- Edit and delete buttons on each card
- Add Application dialog with form fields: job title, company, location, status, applied date, follow-up date, URL, notes
- Pro gate with upgrade CTA for non-Pro users
- Uses TanStack Query for data fetching with proper cache invalidation

---

## Feature 2: Salary Insights (`/insights`)

### `server/routes.ts`
- Added `GET /api/insights/salary` — Pro-only endpoint that:
  - Fetches up to 1,000 active jobs
  - Parses pay range strings to extract min/max hourly values
  - Groups by trade and by county
  - Returns `{ byTrade, byCounty, overall }` with avgMin, avgMax, count per group

### `client/src/pages/insights.tsx` (new file)
- "Know Your Worth" messaging banner
- Overall KPI cards: avg low range, avg high range, listings with pay data
- Horizontal bar chart (Recharts) showing avg high pay by trade, sorted highest to lowest
- Trade breakdown table: trade | avg low | avg high | listings count
- County comparison table: county | avg low | avg high | listings count
- Blurred preview with upgrade CTA for non-Pro users
- Custom tooltip on chart

---

## Feature 3: Auto-Track "View Original Posting" Clicks

### `client/src/pages/dashboard.tsx`
- Added `trackApplicationMutation` (useMutation) inside `JobDetailSheet` component
- Converted "View Original Posting" from `<Button asChild><a>` to a regular `<Button onClick={handleViewOriginal}>`
- `handleViewOriginal` opens the URL in a new tab AND (if Pro) posts to `/api/applications` to auto-create an application record with status "applied"
- Shows toast: "Added to your Application Tracker" on success
- Invalidates `/api/applications` and `/api/applications/stats` query caches

---

## Feature 4: Updated Pricing Page

### `client/src/pages/pricing.tsx`
- Updated Free tier features: removed "Google Maps directions", added "Application Tracker" and "Salary Insights & Market Data" as unavailable features
- Updated Pro tier features: removed "Google Maps directions", added "Application Tracker" (highlighted with ClipboardList icon + NEW badge) and "Salary Insights & Market Data" (highlighted with TrendingUp icon + NEW badge)
- Pro highlighted features rendered with bold text and NEW badge
- Imported `ClipboardList` and `TrendingUp` from lucide-react

---

## Feature 5: Updated Navigation

### `client/src/App.tsx`
- Imported `ClipboardList` and `TrendingUp` icons from lucide-react
- Imported `TrackerPage` and `InsightsPage` components
- Added nav items: "Tracker" (`/tracker`, ClipboardList icon, pro: true) and "Salary Insights" (`/insights`, TrendingUp icon, pro: true)
- Added `<Route path="/tracker" component={TrackerPage} />` and `<Route path="/insights" component={InsightsPage} />` to main Switch

---

## Build
Build verified: `npm run build` completes with no errors or TypeScript compilation failures.
