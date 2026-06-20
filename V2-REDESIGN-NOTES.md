# Vantage V2 — Design Redesign Context

## CRITICAL: Scope Boundary

**All work MUST stay inside the `Vantage V2/` subfolder. Do not read, edit, or touch any file in the parent directory (`Vantage/`).**

The parent folder contains the **live V1 production platform** actively used by real MEGA members at `vantage.mega-mentorship.com`. Modifying anything there — even accidentally — risks breaking the live product. The root `CLAUDE.md` and root JSX/CSS files are reference material only; treat them as read-only.

If a task would require changing a file outside `Vantage V2/`, stop and ask first.

---

## What This Folder Is

This is a **visual-only redesign** of the Vantage platform, built on top of the same functional codebase as V1. All business logic, Supabase queries, auth flows, and data fetching are inherited from V1 unchanged. The only thing being reworked is the visual layer: design tokens, layout, typography, spacing, color, and component styling.

The V2 design system is derived from **Google Stitch / Material Design 3** (M3) tokens.

---

## Strict Working Constraints

These apply for every future session in this folder. No exceptions.

**Permitted to change:**
- CSS classes and CSS variable values in `styles.css`
- Layout structure in JSX markup (class names, wrapper divs, structural order)
- Typography (font family, size, weight, letter-spacing)
- Spacing and sizing tokens
- Color tokens and their assignments
- Component visual styling (backgrounds, borders, shadows, radius)

**NOT permitted to change:**
- Any Supabase queries or table references
- RLS logic or auth flows
- State management, `useState`, `useEffect` logic
- Event handlers and callbacks
- Data fetching functions (`loadProfile`, `loadUserData`, `fetchFocusSessions`, etc.)
- The script load order in `index.html`

**Never do:**
- Push to GitHub
- Deploy or merge to `main`
- Modify the production V1 files (parent folder)

---

## Branch

`vantage-v2-redesign` — tracked from the root `Vantage/` git repo (one level up from this folder). The V2 files live inside the `Vantage V2/` subfolder on this branch.

---

## How to Run Locally

The V2 app must be served over HTTP (not `file://`) for Supabase auth to work.

```bash
python3 -m http.server 3456 --directory "/Users/zachariahmanyapye/Documents/Claude/Vantage/Vantage V2"
```

Then open `http://localhost:3456` in Chrome. The Supabase credentials in `supabase.jsx` point to the same live database as V1.

---

## Key Differences from V1

### Design Tokens (`styles.css`)
- **Typography (updated Session 3 — three roles):**
  - `--ff-wordmark: 'Oswald'` — the sidebar wordmark only. Rendered ALL CAPS (via `text-transform: uppercase` on `.sb-brand-name`), weight 700, letter-spacing `-0.01em`. This is the "VANTAGE" logotype.
  - `--ff-heading: 'Montserrat'` (weight 800) — every page-top heading. `.page-title` / `.page-title.xl` use this; the old all-caps treatment was removed and all page-title strings are now sentence case ("Ship the work", "Your calendar", "Wins board", "Resources", "Roadmap", "Community", "Mission control", "The numbers"). The dashboard "Welcome back" inline heading was also moved to `--ff-heading` 800.
  - `--ff-display: 'Work Sans'` — RETAINED but now scoped to big stat numerals / `.display` elements (dashboard tiles, %s, focus stats), NOT page headings.
  - `--ff-sub` / `--ff-body`: `Montserrat` (unchanged). `--ff-mono`: JetBrains Mono.
  - Google Fonts load (index.html) adds `Oswald:500;600;700` and `Montserrat ...;800`.
- **Display font (legacy note)**: `Work Sans` (was `Bebas Neue` in V1) — see typography above for current role.
- **Body font**: `Montserrat` (unchanged)
- **Primary accent**: `--accent: #003C90` in light mode, `#4F86E6` in dark mode (M3 primary)
- **Background**: `--bg: #FAF8FF` light / `#111317` dark (M3 surface)
- **Elevation**: `--bg-elev: #FFFFFF` light / `#1E2024` dark
- **Border**: `--border: #E1E2EB` light / `#434653` dark
- **Radius scale**: tighter than V1 — `--radius: 8px`, `--radius-lg: 12px`, `--radius-xl: 20px`
- **Shadows**: lighter, blue-toned (Stitch system)
- All V1 brand tokens (`--sapphire`, `--coral`, `--teal`, etc.) are preserved alongside the new M3 tokens so the JSX files continue to work without modification

### Icon System
V1 used an `<Icon name="..." size={N} />` SVG component defined in `data.jsx`.

V2 replaced **every single `<Icon>` call** across all JSX files with:
```jsx
<span className="material-symbols-outlined" style={{fontSize: N, lineHeight: 1}}>icon_name</span>
```

Material Symbols Outlined is loaded via Google Fonts in `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">
```

Zero `<Icon>` calls remain in the V2 codebase. The `Icon` component in `data.jsx` still exists but is unused.

### Sidebar Brand
V1 used an inline SVG wordmark with the Vantage logotype.
V2 uses a text-based brand box:
```jsx
<div className="sb-brand">
  <div className="sb-brand-name">Vantage</div>
  <div className="sb-brand-sub">Built for momentum</div>
</div>
```
Styled with Work Sans for a cleaner, more modern identity. (Tagline updated from "Professional Intelligence" → "Built for momentum" in S5.)

### `SidebarWithWins` (in `index.html`)
V1: `<Icon name={it.icon} size={18} />`
V2: Material Symbol spans via a `MAT` lookup object:
```js
const MAT = {
  dashboard: 'dashboard', tasks: 'assignment_turned_in', sessions: 'event',
  roadmap: 'timeline', trophy: 'military_tech', resources: 'menu_book',
  chat: 'chat', profile: 'person', radar: 'radar', users: 'group',
  chart: 'bar_chart', logout: 'logout', admin: 'admin_panel_settings',
};
```

---

## What This Folder Contains

All files mirror the V1 root folder with the above visual changes applied:

| File | Notes |
|---|---|
| `index.html` | V2 version with new fonts, updated SidebarWithWins, Material Symbol inline script |
| `styles.css` | Full V2 design token system (Stitch/M3) |
| `shell.jsx` | V2 Sidebar/Topbar with Material Symbols (no Icon calls) |
| `dashboard.jsx` | Material Symbols replacing all Icon calls |
| `calendar.jsx` | Material Symbols replacing all Icon calls |
| `modals.jsx` | Material Symbols replacing all Icon calls |
| `eisenhower.jsx` | Material Symbols replacing all Icon calls |
| `tasks.jsx` | Material Symbols replacing all Icon calls |
| `sessions.jsx` | Material Symbols replacing all Icon calls |
| `wins.jsx` | Material Symbols replacing all Icon calls |
| `roadmap.jsx` | Material Symbols replacing all Icon calls |
| `resources.jsx` | Material Symbols replacing all Icon calls |
| `chat.jsx` | Material Symbols replacing all Icon calls |
| `profile.jsx` | Material Symbols replacing all Icon calls |
| `corporate-radar.jsx` | Material Symbols replacing all Icon calls |
| `admin.jsx` | Material Symbols replacing all Icon calls |
| `adminplus.jsx` | Material Symbols replacing all Icon calls |
| `adminchat.jsx` | Material Symbols replacing all Icon calls |
| `analytics.jsx` | Material Symbols replacing all Icon calls |
| `roadmapbuilder.jsx` | Material Symbols replacing all Icon calls |
| `tour.jsx` | Material Symbols replacing all Icon calls |
| `milestone.jsx` | Material Symbols replacing all Icon calls |
| `data.jsx` | Icon component still present but unused; all other logic unchanged |
| `supabase.jsx` | Identical to V1 — same Supabase credentials |
| `logo-white.svg` | Copied from V1 (needed for login screen + trial-expired screen) |
| `logo-blue.svg` | Copied from V1 |
| `favicon-light.svg` | Copied from V1 |
| `favicon-dark.svg` | Copied from V1 |
| `vercel.json` | Identical to V1 |

---

## Session History

### Session 1 (2026-06-16)

**Goal:** Diagnose and fix "blank page after login."

**Investigation:**
- Exhaustive static analysis across all 20+ JSX files
- Confirmed zero remaining `<Icon>` calls in the V2 codebase (all replaced)
- Confirmed all component exports (`Object.assign(window, {...})`) are correct in every file
- Confirmed all CSS classes used by JSX components are defined in `styles.css`
- Confirmed all CSS variables (brand tokens + M3 tokens) are correctly defined in `:root` and `[data-theme="dark"]`
- Confirmed auth flow, `loadProfile`, and `loadUserData` logic is sound
- Started a local HTTP server and loaded the app in Chrome via MCP

**Findings:**
- The app was working correctly — full dashboard rendered with real user data, dark mode applied, zero console errors
- Root cause of blank page: **local server was not running**. The V2 files must be served over HTTP; opening via `file://` will not work for Supabase auth
- Secondary fix: `logo-white.svg`, `logo-blue.svg`, `favicon-light.svg`, `favicon-dark.svg` were missing from V2 (not copied from V1). These are now present — they're referenced by the login screen and trial-expired screen

**Status:** V2 is working. No bugs. Ready for design iteration.

---

### Session 2 (2026-06-17)

**Goal:** Rebuild the member Dashboard (`dashboard.jsx`) to match the Google Stitch reference (`stitch-assets/dashboard-matrix.html`) while keeping all V1 functional logic intact.

**Sidebar brand (`styles.css`):** Enlarged the `.sb-brand-name` wordmark to fill the sidebar header per the Stitch reference — font-size `28px → 44px`, letter-spacing `-0.02em → -0.03em`; `.sb-brand` padding `22px 20px 16px → 28px 22px 20px`; `.sb-brand-sub` font-size `10px → 9.5px`, letter-spacing `0.12em → 0.16em`.

**Dashboard layout rebuild (`dashboard.jsx`):**
- **Headline stat tiles (`DashStats`)** — replaced the old plan-conditional tiles (1:1 Sessions/Focus Time, Tasks, Goals, Town Halls) with the four Stitch tiles: **XP Total** (`military_tech`, value + tier name/number from `xpTier`), **Streak** (`local_fire_department`, `member.streakDays` + weekdays), **Active Tasks** (`task_alt`, incomplete count + "in progress", "X done" tag), **Upcoming Sessions** (`calendar_today`, count of `sessions.status==='upcoming'` + "scheduled"). Rendered as 4 separate `.bento-card`s in a gapped grid (icon top-left, contextual tag top-right, uppercase label, big value + suffix) instead of the old single divided bar. `DashStats` now also takes a `sessions` prop (passed the already-fetched `fetchListSessions` data from `DashboardScreen` — no new fetch). The old `attend`/`points_log` `useEffect` is left in place but unused (kept to honor the "don't change useEffect logic" constraint).
- **Focus ring (`DashPomodoro`)** — replaced the SVG `<circle>` progress ring (which crashed Babel Standalone in the browser — see below) with a CSS **`conic-gradient`** ring: an outer 200px circle (`conic-gradient(from -90deg, ringColor pct%, var(--border) pct%)`) + a 176px inner mask circle (`var(--bg-elev)`) + absolutely-centered time text. Same visual, zero SVG-specific JSX attributes.
- **New `DashWins` component** — a "Recent Wins" feed mirroring the Stitch right-rail tile (trophy avatar bubble tinted by `SUBJECTS[subject]`, `author_name · title`, relative time). Reads the 4 most recent `is_public=true` wins via the same query shape `WinsScreen` already uses. **NOTE:** this is the one *new* read added this session (display-only, no writes / no RLS or auth change); flagged because the strict V2 scope is visual-only — easy to revert to a static tile if desired.
- **Bento grid** — `DashboardScreen` restructured from the old 3-col + full-width-Eisenhower into a **2-column bento (left widgets / right feed)** per the Stitch HTML: **left** = [Quick Tasks | Focus Timer] row then the **Eisenhower Matrix** (now constrained to the left, no longer full-bleed end-to-end); **right** = **Level → Next session → Recent Wins → Focus-this-week-by-subject** stacked.
- **Removed** the `DashWeeklyChart` "Activity this week" tile from the layout (per request — the by-subject focus breakdown is more useful). Component definition left in the file, just not rendered. `DashStreak` likewise no longer rendered (its data is now the Streak stat tile).
- **Card unification** — the right-column widgets (`DashLevel`, all three `DashUpcoming` returns, `DashFocusBreakdown`) were converted from the heavier `.card` class to `.bento-card` so they read as part of the same glass dashboard surface instead of floating widgets. (`FocusTimerModal` keeps `.card` — it's a popup; `DashStreak` keeps `.card` but is unrendered.)

**Bugs fixed this session:**
- **`DashboardScreen is not defined` / blank page** — Babel Standalone 7.29.0 (browser build) failed to compile `dashboard.jsx`. Root cause was **curly/smart quotes** (`"` `"`) that had crept into two JSX attributes in `FocusTimerModal` (`className=”btn primary sm”`, `className=”material-symbols-outlined”`) — Babel choked on the non-ASCII character, so `window.DashboardScreen` was never assigned. Replaced with straight ASCII quotes. (Node-based Babel checking was unreliable/false-positive on template literals here; the smart quotes were the real culprit.) A compile gate via `@babel/standalone` in Node is now used to verify the file parses after edits.
- **Right column overlapping the focus tile** — classic CSS-grid blowout: the focus timer's hard-200px ring forced its `2fr` column wider than its share, pushing the right `1fr` column on top of it. Fixed with **`minmax(0, …)` tracks** on both the outer grid (`minmax(0, 1.85fr) minmax(0, 1fr)`) and the inner left grid (`minmax(0, 1fr) minmax(0, 1fr)`), plus `minWidth:0` on the focus/quick-tasks/right-column cards so content can compress within its track.

**Constraints honored:** No Supabase query, RLS, auth, state, event-handler, or data-fetching-function logic was changed (only the additive display-read in `DashWins`). All work stayed inside `Vantage V2/`. Not committed/pushed. Verified via `@babel/standalone` compile checks; visual confirmation done by the user on their local `python3 -m http.server` (the preview tool remains blocked by the macOS ~/Documents TCC sandbox).

---

### Session 3 (2026-06-17)

**Goal:** Carry the dashboard's V2 look into the remaining member pages; overhaul platform typography; rebuild Resources as a 3D book library.

**Local-server / TCC fix (important for future sessions):** The "blank page / 404 on every file" symptom is the macOS **TCC sandbox**, not a code bug. A Python `http.server` launched from a *sandboxed* context (e.g. an agent tool) cannot READ files under `~/Documents`, so it returns 404 for every path even though the files exist and the shell can `cat` them (confirmed: same server serving `/tmp` returns 200, serving the V2 folder returns 404). **Fix:** the user runs the server from their OWN Terminal with **Full Disk Access** granted (System Settings → Privacy & Security → Full Disk Access → enable Terminal → **Cmd+Q and relaunch Terminal**). Also kill any stale sandboxed server holding port 3456 first (`lsof -ti TCP:3456 | xargs kill -9`) to avoid `Errno 48 Address already in use`. URL is `http://localhost:3456`.

**Compile gate:** `@babel/standalone` isn't in the project; install once to a temp dir and require by absolute path: `npm install --prefix /tmp/babelcheck @babel/standalone`, then `babel.transform(src,{presets:['react']})` per edited file. Every file touched this session passed.

**Typography overhaul (see Design Tokens above for the live spec):** Split the single display font into three roles per the user's direction (Oswald all-caps wordmark from a Canva mock; Montserrat 800 sentence-case page headings matching the Stitch reference; Work Sans retained only for stat numerals). Removed `text-transform: uppercase` from `.page-title.xl` and converted all page-title strings to sentence case.

**Tasks & Goals (`tasks.jsx`):** Finished the Material-Symbols migration the row internals had missed + closed Stitch gaps — squared uppercase priority chips; due-date badge now a Material `calendar_month` chip (was `📅`); task title 15px/700 + roomier row padding; running-timer pill and "focused" line use `timer`/`pause`; AI buttons `auto_awesome`/`refresh`; all `✕` → Material `close`; empty-state emojis → Material icons in soft accent tiles. Zero emojis remain in the file (reaction-style emojis only live in Wins).

**Sessions (`sessions.jsx` + `calendar.jsx`):** (1) List-view date column no longer uses the coral/sapphire tint (looked "brownish" on upcoming Town Halls) — all date blocks now use `var(--bg-sunken)` (dark bg + blue text, matching past sessions). (2) Day view's oversized centered blue date (which duplicated the toolbar date) replaced with a clean `week-col-header`-style header bar (uppercase weekday + date, accent when today).

**Wins (`wins.jsx`):** Minimal — already on-system (page header, bento cards, sticky stats rail). Composer close `✕` → Material `close`; dropped stray `🎯` from the Post button. Reaction emojis (👍🔥👏⭐) intentionally kept (they match the Stitch reference).

**Resources — Stripe-Press → Letterboxd pivot (`resources.jsx` + `styles.css`):** The user wanted a "floating library of books." Feasibility consult delivered first (CSS 3D transforms, NO WebGL/Three.js — our stack handles it). Built Phase 1 as a 3D book **spine shelf** + click-through detail sub-page (big standing 3D book = cover + spine + page-edge faces via `preserve-3d`). User found the spine shelf too flat/static, so **pivoted to a Letterboxd-style poster grid**: forward-facing generated **covers** (2:3) in `.rb-grid` (auto-fill), each with a **pointer-tracked 3D tilt + moving glare** (`ResourceCover`, direct style mutation via ref — no per-move re-render). Covers are stylized/generated (subject color gradient + title in Oswald + "V" mark + content-type chip/watermark) since there's no bespoke cover art. Locked (Breakthrough/Management) covers dim + lock overlay + upgrade modal. The detail sub-page (`ResourceDetail`) keeps the standing `ResourceBook3D` + content-aware CTA (video/pdf → existing `ResourceViewer`; template/article → external link). **All data/tier/viewer logic preserved**; the one addition is a presentational `selected` state for the detail view (mirrors the existing `viewing`/`upgrading` modal state). Phase 2 (scroll-driven parallax depth) deferred as optional. CSS: `.rb-grid`/`.rb-cover*` (poster grid) + `.rb-book*`/`.rb-detail` (detail). The old `.rb-spine*`/`.rb-shelf` CSS and `ResourceSpine` component were removed.

**Resources DEMO FALLBACK (must-know):** The live `resources` table is currently **EMPTY (0 rows)** — confirmed via Supabase SQL — so the page legitimately showed the "Hang on tight" empty state. Added a client-side **demo fallback** in `resources.jsx`: a `RES_DEMO` array (8 sample books across all content types/folders/tiers) gated by `const RES_DEMO_FALLBACK = true`, rendered ONLY when the live query returns 0 rows. **No DB writes** (the table is shared with live V1 — never insert sample rows there). It auto-disappears once real resources exist. To remove: set `RES_DEMO_FALLBACK = false` or delete the marked block + its use in `ResourcesScreen` (`baseRows`).

**Constraints honored:** No Supabase query/RLS/auth/data-fetching logic changed. The only new state is presentational (`selected` in Resources). All work inside `Vantage V2/`. Not committed/pushed. Verified via `@babel/standalone`; visual review by the user on their local server (preview tool still TCC-blocked). **Open items for next session:** user to review the new Resources poster grid + tilt strength (the `* 18` rotation multiplier) and decide on cover styling (subject-colored vs lighter/varied); remaining pages not yet rebuilt — Profile, Corporate Radar, Roadmap, Chat, Admin Overview, Analytics, Login; Resources Phase 2 (scroll parallax) optional.

---

### Session 4 (2026-06-19)

**Goal:** Finish the V2 page rebuild — bring the remaining pages onto the V2 system, worked quickest → most complex.

- **Login (`index.html`):** Full rebuild to `stitch-assets/login-light.html` — ambient glow background (`.login-glow` + radial `::before`), centered brand glyph (blue box + `logo-white.svg`), Oswald wordmark, input icons (mail/lock/person via Material Symbols), "Or continue with" divider, legal footer (`/legal`). Replaced all legacy fonts (Bebas Neue / Fira Sans) and hardcoded `#0F52BA` in the login `<style>` block with V2 tokens (`--accent`, `--accent-container`, `--bg-sunken`, `--ff-wordmark/heading/body`, `--radius*`). All auth handlers + `mode` (signin/signup/magic) logic untouched.
- **Roadmap (`roadmap.jsx`):** Phase cards + loading card `.card` → `.bento-card`; progress card now leads with a Work Sans `%` numeral; empty-state heading moved to Montserrat 800 (`--ff-heading`).
- **Profile (`profile.jsx`):** Restructured toward `member-profile-v3` — identity card → `.bento-card` (dropped the duplicated name; page-header owns the title now), the three figures (Total learning / Sessions / Upcoming) broken out into **separate stat tiles** with the Upcoming tile accent-bordered; badge-wall / personal-info / settings cards → `.bento-card`; both modal `✕` → Material `close`.
- **Analytics (`analytics.jsx`):** All `.card` → `.bento-card` (no modals here) for the unified glass look; already had the sentence-case "The numbers" title + display numerals.
- **Chat (`chat.jsx`):** Already on-system; swapped the two modal `✕` → Material `close`.
- **Corporate Radar (`corporate-radar.jsx`):** Left its self-contained `.cr-*` toolbar system (dense search/filter UI — intentionally NOT the page-header pattern). Cleaned up all 4 `✕` → Material `close`.
- **Admin Overview:** Found **already rebuilt** ("Mission control" title, `.stat-tile` tiles, bento panels, 7-day chart, top performers) — no work needed. The remaining `.card` uses in `admin.jsx` are all modals (correct).

**Constraints honored:** visual layer only; no Supabase/RLS/auth/state/effect/handler changes; all inside `Vantage V2/`; not committed/pushed. Every edited `.jsx` passed the `@babel/standalone` compile gate.

### Session 5 (2026-06-19)

**Goal:** Member-feedback tweak batch (11 items), quickest → most complex. **This session intentionally went beyond the "visual-only" rule** — several items are functional changes (chat gating, XP modal, task views, focus-timer logic). All confined to `Vantage V2/` files; the live V1 parent folder was never touched; nothing pushed.

- **Sidebar tagline:** "Professional Intelligence" → **"Built for momentum"** (live `SidebarWithWins` in `index.html`; legacy `shell.jsx` `Sidebar` synced too — note the rendered sidebar is the one in `index.html`, `shell.jsx`'s `Sidebar` is unused; `Topbar` IS `shell.jsx`'s).
- **Reflection banner (dark mode):** `[data-theme="dark"] .reflection-header` teal tint `rgba(79,183,166,0.16)` → neutral `rgba(255,255,255,0.04)` so it blends with the near-black surface; teal identity stays in `.refl-accent`.
- **Favicon → Oswald "V":** both `favicon-light.svg` / `favicon-dark.svg` replaced the old brand-mark path with a hand-drawn condensed bold **"V"** vector path (`M285,300 L415,300 L512,560 L609,300 L739,300 L512,752 Z`) in the same rounded-square boxes. (Path, not `<text>` — SVG favicons can't load the Oswald webfont.)
- **Corporate Radar header:** `.cr-title` → `--ff-heading` (Montserrat) 800, sentence case, `letter-spacing:-0.01em`, 20px (was `--ff-display` uppercase, wide-spaced); **UAE flag badge removed** from the header JSX.
- **Top search bar (`shell.jsx` `Topbar`):** the decorative pill (`readOnly`) now renders **only on `tasks` / `admin-tasks`**; every other route shows a `.topbar-crumb` breadcrumb (`{section} › {page}`) instead. New `.topbar-crumb*` styles in `styles.css`.
- **Chat gated to MEGA Management:** nav item built conditionally (`member.membershipTier === 'management'`) in BOTH `index.html` `SidebarWithWins` and `shell.jsx`; route guard in `index.html` (`case 'chat'`) falls back to the dashboard for non-management. Admin keeps `admin-messaging`.
- **Dashboard "Consistency this week" (`dashboard.jsx`):** replaced `DashFocusBreakdown` (focus-by-subject, removed from the right column) with a new **full-bleed** `DashConsistency` strip below the bento grid — Mon–Sun cells, a day is "active" if it has any focus session / completed task (`completed_at`) / attended session. Reuses already-fetched `focusRows` + `tasks` + `sessions` (no new queries).
- **XP progress modal (`dashboard.jsx`):** new `XpProgressModal` (tier name, progress bar to next tier, exact XP-to-next, all 8 `XP_TIERS` with achieved/current state). Opened by clicking the **XP Total** stat tile (`DashStats` gained `onOpenXp`, only that tile is clickable) or the **Level** card (`DashLevel` gained `onOpenXp` + an `open_in_full` affordance). `xpOpen` state lives in `DashboardScreen`.
- **Task & Goal views (`tasks.jsx`):** Tasks tab gained a **List / Board / By subject** switcher (`taskView` state). List & Subject reuse `TaskRow` (via a `renderRow` helper); Board is a priority-column Kanban of compact `TaskBoardCard`s (click a card → `openInList` jumps to List + expands it). Goals tab gained a **Stacked / Grid** toggle (`goalView`; grid = `repeat(auto-fill, minmax(380px,1fr))`). View-toggle labels collapse to icons under 1180px (`.view-opt-label`).
- **Focus timer — auto-save + stopwatch (`index.html` focus API + `dashboard.jsx`):** the shared App timer now carries a **`mode`** (`'timer'` countdown | `'stopwatch'` count-up). Countdowns **auto-save the instant they finish** via a wall-clock `setTimeout(endsAt - now)` effect in App (no per-second polling; task-linked countdowns auto-save too). Stopwatch tracks `baseElapsedSec` + `runStartMs` (frozen on pause), runs until the member saves. New `window.focusTimerElapsed(t)` helper (handles both modes) added in `dashboard.jsx` and used by `focus.save()`. `DashPomodoro` gained a Timer/Stopwatch toggle (duration adjuster only in Timer mode), stopwatch count-up display (full ring), and "Time's up — saving…" note. `selected_minutes` is `null` for stopwatch sessions.

**Constraints honored:** all inside `Vantage V2/`; live V1 parent untouched; not committed/pushed. All edited `.jsx` + the inline `index.html` babel block pass the `@babel/standalone` compile gate. Not browser-verified (preview still TCC-blocked) — recommend a click-through on the local server, especially the dashboard (XP popup, consistency strip, stopwatch) and Tasks (view toggles), and testing chat visibility with a `management`-tier account.

---

### Session 6 (2026-06-20)

**Goal:** V1→V2 migration plan + gap analysis, Corporate Radar pagination, collapsible nav.

- **Migration plan + gap analysis (`V1-to-V2-MIGRATION.md`, new file in this folder):** Verified the live backend via Supabase MCP — V2's `supabase.jsx` targets the **same** project `npsfarsblfewdclhoquo` + same anon key as V1, so the cutover is a **frontend-only static swap with no DB/schema/auth migration**. Backend confirmed healthy: 21 tables (all RLS-enabled except `radar_discovery_state`), 14 Edge Functions all `ACTIVE`. Documented 8 gaps; the two **blockers**: (1) **`legal.html` is missing from `Vantage V2/`** while `vercel.json` still rewrites `/legal` and `LegalConsentModal` links there → 404 (user must copy it from V1; I can't read the parent per scope rule); (2) **Resources demo fallback is ON** (`RES_DEMO_FALLBACK=true` in resources.jsx) and the live `resources` table has 0 rows → real members would see 8 fake books; set the flag false or load real content before cutover. Other gaps: V2 folder untracked in git; Vercel deploys repo root vs. the `Vantage V2/` subfolder; Supabase Auth redirect URLs only matter if staging on a new domain; `radar_discovery_state` RLS-disabled (pre-existing); `RESEND_API_KEY` may be unset; and the deliberate S5 divergences (chat gated to management, focus stopwatch, task views) to confirm. Recommended sequence: fix blockers → stage on a Vercel preview + QA with a real account → in-place swap to `main` on the same production domain (so auth config never changes; rollback = `git revert`).
- **Corporate Radar pagination (`corporate-radar.jsx` + `styles.css`):** the grid rendered all `sorted` companies (71 live rows, growing weekly via discovery) → long scroll. Added presentational `visibleCount` state (page size `CR_PAGE=12`), `sorted.slice(0, visibleCount)`, a reset `useEffect` on `[search, sort, filters]`, a "Showing X of Y companies" toolbar count, and a centered **"See more companies (N more)"** button (+ a "See all" shortcut when >1 page remains). New `.cr-more*` styles. No query/filter/scoring logic changed — only how many cards render.
- **Collapsible nav (`index.html` + `styles.css`):** added `navCollapsed` state in App (persisted to `localStorage['vantage-nav-collapsed']`) + `toggleNav`; `.app` gets a `nav-collapsed` class (grid track `288px → 76px`, transitioned). `SidebarWithWins` gained `collapsed`/`onToggleCollapse` props, a chevron toggle button in the brand row (`.sb-collapse-btn`), and `title` tooltips on every nav item (+ footer admin buttons) for the icon-only rail. Collapsed CSS hides the wordmark/sub, section headers, item labels, and the user-card meta/points (avatar-only), centering icons. `shell.jsx`'s unused `Sidebar` left as-is (the rendered sidebar is the one in `index.html`).

**Constraints honored:** all inside `Vantage V2/`; live V1 parent never read or edited (the one needed parent asset, `legal.html`, was flagged for the user to copy rather than read); no Supabase/RLS/auth/state/effect/handler logic changed (only additive presentational state: `visibleCount`, `navCollapsed`); not committed/pushed. `corporate-radar.jsx` + all 22 `index.html` inline babel blocks pass the `@babel/standalone` compile gate. Not browser-verified (preview TCC-blocked) — recommend a click-through on the local server.

---

## Next Steps (Design Work Queue)

**All member + admin pages are now on the V2 system** (S1–S4): Dashboard, Tasks & Goals, Sessions, Wins, Resources, Roadmap, Profile, Analytics, Chat, Corporate Radar, Admin Overview, Login. S5 layered on the member-feedback tweak batch (tagline, reflection color, Oswald-V favicon, search gating, chat gating, consistency tile, XP modal, task/goal views, auto-save + stopwatch focus timer).

Remaining iteration / open items:
- **Browser verification:** none of S2–S5 was browser-verified (preview blocked by the `~/Documents` TCC sandbox). Click-through on the local server is still pending — prioritize the dashboard (XP popup, consistency strip, stopwatch), Tasks (view toggles), Login, and chat visibility on a `management` account.
- Resources: user review of the poster grid (tilt strength = `* 18` multiplier in `ResourceCover`) + cover styling decision; optional Phase 2 scroll parallax.
- Refine card, button, and input component styling; verify topbar sticky behavior.
- Dark mode polish pass; responsive layout review at different viewport widths.
- Optional consistency sweep: `✕` glyphs still remain in some non-feedback files' modals (`admin.jsx` AdminSessions, `calendar.jsx`, `eisenhower.jsx`, `roadmapbuilder.jsx`, `tour.jsx`).

---

## Project Context

For full context on the underlying platform (data model, Supabase tables, RLS, Edge Functions, badge system, XP system, etc.) see the root `CLAUDE.md` at:
```
/Users/zachariahmanyapye/Documents/Claude/Vantage/CLAUDE.md
```
