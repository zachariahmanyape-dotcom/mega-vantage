# Vantage by MEGA — Project Context

## Project Overview
Vantage is a member-facing learning platform built for MEGA (Middle East Growth Academy).
Live URL: vantage.mega-mentorship.com
Stack: Vanilla React 18 (UMD/CDN), Babel Standalone, Supabase JS v2, no bundler.
All JSX files are loaded via `<script type="text/babel" src="...">` in index.html.
Hosted on Vercel (vercel.json: `{ "framework": null }`). Git repo is initialized.

## File Architecture
Script load order in index.html is strict — do not reorder:
1. supabase.jsx — Supabase client init; exposes `window._supabase`. MUST load first.
2. data.jsx — Shared constants, SUBJECTS map, mock MEMBER object, Icon component, utilities.
3. shell.jsx — Sidebar, Topbar, SidebarWithWins wrapper, Avatar component.
4. calendar.jsx, tour.jsx, modals.jsx, eisenhower.jsx, milestone.jsx — Supporting components.
5. dashboard.jsx, tasks.jsx, sessions.jsx, wins.jsx, resources.jsx, chat.jsx, profile.jsx — Member views.
6. admin.jsx, adminplus.jsx, adminchat.jsx, analytics.jsx — Admin views.
7. Inline `<script type="text/babel">` in index.html — Login screen + root App component.

There are no imports between files. All components are globals on the window scope via Babel.
- `supabase/functions/` — source mirror of the deployed Edge Functions (not served to the browser; for version control / redeploys).
- `adminchat.jsx` is now a thin alias only (`AdminChatScreen = AdminChat`); the real admin Channels view is `AdminChat` in admin.jsx.
- Cross-file helpers live on `window`: `fetchSessions/fetchCalSessions/fetchListSessions/mapToCalSession/mapToListSession/AddToCalendar/fmtH` (calendar.jsx); `fetchFocusSessions/focusYmd/focusWeekStart/fmtMins` (dashboard.jsx); `mapTaskRow` (tasks.jsx).

## Member Views (route keys)
- `dashboard` → DashboardScreen (dashboard.jsx) — focus timer (adjustable length + Save→focus_sessions), "Next up" + "Focus this week" from live data
- `tasks` → TasksScreen (tasks.jsx) — Tasks / Goals / Focus tabs; "+ New" create modal; Today/Tomorrow/Next-7-days/All views + collapsible Completed; Focus metrics + heatmaps
- `sessions` → SessionsScreen (sessions.jsx) — Supabase calendar + list, add-to-calendar (.ics/Google/Outlook)
- `roadmap` → RoadmapScreen (roadmap.jsx) — member's most-recent active goal as a phased roadmap (animated progress bar, collapsible phase cards with staggered reveal, checkable tasks → `is_completed`/`completed_at`, editable `due_date`/`member_notes` save-on-blur with inline "Saved" tick, teal reflection + coral "Note from Zach" callouts, soft-dimmed locked phases, friendly empty state). Nav: between Sessions and Wins.
- `wins` → WinsScreen (wins.jsx) — Supabase `wins` table (load + post)
- `resources` → ResourcesScreen (resources.jsx) — still mock (RESOURCES in data.jsx)
- `chat` → ChatScreen (chat.jsx) — single placeholder "MEGA Mentorship" channel (real member count, no messaging backend)
- `profile` → ProfileScreen (profile.jsx) — real stat card / milestones / badges; personal-info + interests still placeholder

## Admin Views (route keys)
- `admin-overview` → AdminOverview (admin.jsx)
- `admin-members` → AdminMembers (admin.jsx) — loads from Supabase `profiles` table
- `admin-tasks` → AdminTasks (admin.jsx)
- `admin-roadmap` → RoadmapBuilder (roadmapbuilder.jsx) — admin discovery-call tool: member selector, 5-section intake + MEGA diagnostic + focus pills, Generate (via `generate-roadmap` Edge Function), editable review panel, Save → inserts `goals` + `roadmap_steps` + `tasks` for the selected member. Nav: after Tasks & Goals.
- `admin-sessions` → AdminSessions (admin.jsx) — live scheduling (writes `sessions`), "Connect Google" + auto Meet links, Google-Calendar-style time pickers
- `admin-messaging` → BulkMessaging (adminplus.jsx)
- `admin-resources` → AdminResources (admin.jsx)
- `admin-chat` → AdminChat (admin.jsx) — single real channel + `member_count()`. NOTE: adminchat.jsx is now just a thin alias (`AdminChatScreen = AdminChat`); its old DM/channel code was removed.
- `admin-analytics` → AdminAnalytics (analytics.jsx) — still mock data
- Overview "Schedule session" / "New task" buttons navigate to admin-sessions / admin-tasks.

Admin mode is triggered when `liveProfile.role === 'admin'` and route starts with `admin-`.
"View As" lets admins impersonate a member. `isRealAdmin` stays true during View As.

## Supabase Integration
URL and anon key are in supabase.jsx. Client is `window._supabase`.

Tables wired to live data:
- `profiles` — member auth, role (admin/member), membership_tier ('breakthrough'/'foundations'), account_type, trial status, member_status, joined_at. Added this session: `google_connected`, `google_email`.
- `tasks` — member tasks. `roadmap_step_id` is now NULLABLE (standalone tasks allowed). Added columns: `goal_id` (direct goal link), `subject`, `priority`. subtasks/points/impact are still client-side defaults (no columns); completion uses the real `is_completed` column.
- `goals` — member goals (title, description, target_date, status).
- `roadmap_steps` — middle layer between goals and tasks (legacy GoalCard link path via `goal_id` OR `roadmap_step.goal_id`; also the phase layer for the Roadmap feature — `phase_label`, `reflection_prompt`, `admin_notes`, `order_index`, `status`, week range stored as prefix of `description`).
- `sessions` — 1:1s + town halls. Admin creates; members read own 1:1s (`attendee_id = auth.uid()`) + all town halls (`attendee_id` null) via RLS. Cols: type, title, session_date, start_time, end_time, mentor_name, meeting_link, recurrence, attendee_id, created_by, `google_event_id`.
- `wins` — community Wins board (load + post). Author info denormalized onto rows (`author_name`, `author_role`, `subject`) since profiles RLS is own-row-only. `is_public` gates the feed.
- `focus_sessions` — dashboard focus-timer "Save" writes here (duration_minutes, label, subject, linked_id, linked_kind, started_at). Read by the Focus metrics tab + dashboard "Focus this week" widgets.
- `google_tokens` — admin Google OAuth tokens. SERVICE-ROLE ONLY (RLS on, no policies); never read client-side.
- `points_log` — exists but NOT wired (gamification unpowered).

DB function: `member_count()` — SECURITY DEFINER, returns total profile count (members can't read other profiles under RLS, so this powers community/chat member counts).

Edge Functions (source mirrored in `supabase/functions/`):
- `invite-member` — member invite flow.
- `google-oauth-start` — builds Google consent URL (admin only).
- `google-oauth-callback` — OAuth redirect target (verify_jwt OFF); exchanges code, stores tokens, sets profiles.google_connected.
- `google-calendar-event` — creates a Calendar event with a Meet link + invites the member; writes meeting_link/google_event_id back to the session.
- `generate-roadmap` — admin-only (verifies `role='admin'` via the caller's JWT, verify_jwt ON); relays a prompt to Anthropic (`claude-sonnet-4-6`, max_tokens 2000) and returns the text. Keeps the Anthropic key server-side. Called from roadmapbuilder.jsx via `supabase.functions.invoke`.
Required Edge Function secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (= the google-oauth-callback URL; must match the Authorized redirect URI in Google Cloud); `ANTHROPIC_API_KEY` (for generate-roadmap). OAuth app is under a personal GCP project in Testing mode → publish to Production to avoid the ~7-day refresh-token expiry.

Still mock/placeholder (NOT wired): resources, admin analytics + members list, real chat messaging (single-channel shell), gamification (points/level/day-streak read 0), session recurrence (label only, no repeating instances), task subtasks, profile personal-info/interests, automated reminders.

Membership tiers: `breakthrough` → "Breakthrough" plan, anything else → "Foundations" plan.
Role values: `admin` for admin users, anything else treated as member.

## Brand Tokens (never change these)
Defined in styles.css as CSS variables:
- `--sapphire: #0F52BA` — primary accent
- `--sapphire-600: #0B47A3`
- `--sapphire-100: #E6EEFB`
- `--coral: #FF6B6B` — secondary accent (also used for admin sidebar logo)
- `--coral-100: #FFE4E4`
- `--teal: #A3E4DB`
- `--teal-600: #4FB7A6`
- `--black: #0A0A0A`
- `--ff-display: 'Bebas Neue'` — headings only
- `--ff-body: 'Montserrat'` — all body text
- `--ff-sub: 'Trebuchet MS'` — subheadings/metadata
- `--ff-mono: 'JetBrains Mono'` — code/mono contexts

Dark mode tokens are defined under `[data-theme="dark"]` in styles.css.
Always use CSS variables, never hardcode hex values in JSX or inline styles.

## Branding & Assets
- Logo SVGs at the web root: `logo-white.svg` (used on the login + trial-expired blue boxes), `logo-black.svg` + `logo-blue.svg` (kept for reference, currently unused). All are a single-path mark on viewBox `0 0 1024 1024`; the mark only fills ~32% of that canvas, so crop the viewBox when you need it visually larger. Source set lives in `Vantage Logo V1/` (not committed).
- Sidebar brand box (`.brand-logo`): an INLINE cropped SVG in index.html using `fill="currentColor"`, so it auto-inverts with the theme — color is `var(--bg-elev)` (white logo on the black light-mode box, dark logo on the white dark-mode box). `.sidebar.admin .brand-logo` forces white on the coral box. Size via `.brand-logo-img` (26px in the 32px box); cropped viewBox is `190 170 645 645`.
- Favicons: `favicon-light.svg` (blue rounded box + white mark) and `favicon-dark.svg` (white rounded box + blue mark), mark scaled to ~62% fill via the `<g transform>`. Switched with `<link rel="icon" media="(prefers-color-scheme: dark)">`; the bare no-media link is the blue/light fallback for browsers that ignore media on icons.

## Key Patterns and Conventions
- State lives in the root App component in index.html; passed down as props.
- Route persistence: `localStorage.getItem('vantage-route')`.
- Onboarding, tour, and intention state are all persisted in localStorage.
- Tasks and goals are lifted to App state and passed to both DashboardScreen and TasksScreen.
- Global rewards animation uses `rewards` state array in App (point-pop XP display).
- `SidebarWithWins` wraps `Sidebar` from shell.jsx — use this wrapper, not Sidebar directly.
- Do not use ES module imports. All shared functions must be globally accessible.
- Class names in styles.css are not namespaced — check for collisions before adding new ones.

## Current Status
- Auth: live (Supabase email/password + magic link)
- Member invite flow: live (Edge Function)
- Tasks + Goals: live (Supabase) — create UI (+ New modal, create-from-focus-picker), TickTick-style Today/Tomorrow/Next-7-days/All views + collapsible Completed; completion driven by `tasks.is_completed`
- Sessions: live (Supabase) — admin scheduling, member calendar/list + dashboard "Next up", add-to-calendar (.ics/Google/Outlook), Google Meet auto-link + member invite on scheduling
- Focus: live — dashboard timer (adjustable length, Save → focus_sessions), Focus metrics tab (overview, trends, by-subject, records) + heatmaps (most-focused-time histogram, weekday×hour rhythm, year grid)
- Wins board: live (Supabase `wins`)
- Roadmap: live — admin builds via Roadmap Builder (AI generate → edit → save) and members view/interact on the Roadmap page. Requires `ANTHROPIC_API_KEY` Edge Function secret to be set. `goals` INSERT policy updated to allow `is_admin()` (matching `roadmap_steps`/`tasks`) so admins can save on a member's behalf.
- Notifications: driven by real upcoming sessions
- Chat: placeholder single "MEGA Mentorship" channel (real member count, no messaging backend)
- Profile: stat card + milestones + badges real; personal-info/interests still placeholder
- Admin member management: live (profiles); admin analytics + members list still mock
- Dark mode: native date/time picker icons inverted to white
- Branding: real Vantage logo in the brand box (inline currentColor SVG, theme-inverting, enlarged) + dynamic rounded-square boxed favicons (blue for light browser UI, white for dark)
- Deployment: Vercel auto-deploy from GitHub `main` (confirmed active this session)
- Trial expiry enforcement: live (admin + auth flow)
- Not yet built: gamification (points/level/streak), session recurrence instances, real chat, task subtasks, automated reminders, profile personal-info/interests editing

## What Not to Change
- Script load order in index.html
- CSS variable names in styles.css
- `window._supabase` global — other files depend on this exact reference
- `MEMBER` object shape in data.jsx — used as fallback when Supabase profile is unavailable
- `SUBJECTS` map in data.jsx — used across tasks, goals, and dashboard for color coding

## Session Log
<!-- Claude: append one line here after any session where a structural change is made -->
<!-- Format: YYYY-MM-DD — [one sentence describing what changed] -->
2026-05-24 — Fixed dashboard greeting + calendar "Today"; built real sessions backend (table + admin scheduling + member views + add-to-calendar) and Google Meet OAuth integration (3 Edge Functions); wired Wins board + collapsed Chat to one channel (`member_count()`); made profile stat card/milestones/badges real; added focus timer Save + `focus_sessions` + Focus metrics tab with heatmaps; added create Task/Goal modal + create-from-focus-picker + TickTick-style task views (fixed is_completed bug); real notifications; dark-mode date/time icons + Google-Calendar-style session time pickers.
2026-05-24 — Replaced the placeholder "V" with the real Vantage logo (inline currentColor SVG in the sidebar brand box, theme-inverting + enlarged via viewBox crop; white logo on login/trial/admin boxes) and added dynamic rounded-square boxed favicons (favicon-light.svg blue / favicon-dark.svg white).
2026-05-25 — Built the Roadmap feature: admin RoadmapBuilder (roadmapbuilder.jsx, route admin-roadmap) and member RoadmapScreen (roadmap.jsx, route roadmap), added `roadmap` icon + nav items + routes; deployed `generate-roadmap` Edge Function (Anthropic key server-side, admin-gated, claude-sonnet-4-6); fixed `goals` INSERT RLS to allow `is_admin()` on-behalf saves. Remaining manual step: set the `ANTHROPIC_API_KEY` Edge Function secret in Supabase.
