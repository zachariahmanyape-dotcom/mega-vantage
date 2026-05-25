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
- `adminchat.jsx` is a thin alias (`AdminChatScreen = AdminChat`). The admin "Chat" page chains `admin-messaging` → `BulkMessaging` → `AdminChatScreen` → `AdminChat`, which now simply renders the member `ChatScreen`. The separate admin Channels page (`admin-chat`) was removed.
- Cross-file helpers live on `window`: `fetchSessions/fetchCalSessions/fetchListSessions/mapToCalSession/mapToListSession/AddToCalendar/fmtH` (calendar.jsx); `fetchFocusSessions/focusYmd/focusWeekStart/fmtMins/focusTimerRemaining/useNowTick` (dashboard.jsx); `mapTaskRow` (tasks.jsx).

## Member Views (route keys)
- `dashboard` → DashboardScreen (dashboard.jsx) — focus timer (adjustable length + Save→focus_sessions), "Next up" + "Focus this week" from live data. The pomodoro is a VIEW over the single shared focus timer (see Shared Focus Timer) — it reflects a session started on the Tasks page and vice versa. The "Hello, [name]" header shows a time-of-day greeting + a dynamic Smart Overview line (`buildSmartOverview` in dashboard.jsx — built from today's due/overdue tasks, today's sessions, and yesterday's completed tasks, with generic fallbacks). Hosts the Eisenhower matrix (now fully automatic — see Eisenhower note under tasks).
- `tasks` → TasksScreen (tasks.jsx) — Tasks / Goals / Focus Metrics tabs ("Focus" tab renamed); "+ New" create modal; Today/Tomorrow/Next-7-days/All views + collapsible Completed; Goals are collapsible (per-card chevron, GoalCard); Focus metrics + heatmaps. Drilling into a task row opens a detail panel (2-col `1fr / 180px`): left = Details + DB-backed Subtasks checklist (AI/Manual tags, inline add/edit/delete) + "Edit task" (center modal); right = the shared Focus Timer (presets 15/25/45/60, MM:SS countdown, pause/save) + cumulative focus line + AI "Break this down" / "Regenerate" (max 3, persisted). Detail panels stay open until closed (`expandedIds` is a Set). The old Effort×Impact matrix was removed. **Eisenhower matrix (eisenhower.jsx):** quadrant placement is now FULLY AUTOMATIC from `priority` + `due_date` (`getQuadrant`): Critical/Important + (overdue or due ≤3 days) → Do Now; Critical/Important + (beyond 3 days or no due date) → Do Next; Routine/Backlog + urgent → Handle Soon; else → Revisit Later. Completed tasks are excluded; recomputed every render. Manual drag/override was removed.
- `sessions` → SessionsScreen (sessions.jsx) — Supabase calendar + list, add-to-calendar (.ics/Google/Outlook); list-view date column text is blue (`--sapphire`, readable in dark mode), past sessions are collapsible (default collapsed)
- `roadmap` → RoadmapScreen (roadmap.jsx) — member's most-recent active goal as a phased roadmap (animated progress bar, collapsible phase cards with staggered reveal, checkable tasks → `is_completed`/`completed_at`, editable `due_date`/`member_notes` save-on-blur with inline "Saved" tick, teal reflection + coral "Note from Zach" callouts, soft-dimmed locked phases, friendly empty state). Nav: between Sessions and Wins.
- `wins` → WinsScreen (wins.jsx) — Supabase `wins` table (load + post); reactions persisted to `win_reactions` (load aggregated counts + own reacted state, optimistic toggle)
- `resources` → ResourcesScreen (resources.jsx) — content still mock (RESOURCES in data.jsx), but opening a card logs a `resource_views` row (dedup) for badge tracking
- `chat` → ChatScreen (chat.jsx) — multi-channel community chat backed by `channels`/`channel_members`/`messages`. Channel-list sidebar + message feed/composer (Enter to send; polls every 6s for new messages). One global default "MEGA Mentorship" channel everyone shares; all other channels are invite-only (private to added members). ADMINS ONLY get a "New channel" modal (name/description + searchable member multi-select via the `list_members()` RPC). Author info denormalized; no threads/reactions/realtime (polling only). `fetchCommunityPostCount` now counts `messages`.
- `profile` → ProfileScreen (profile.jsx) — real stat card / milestones; full badge wall (see Badge System). "Edit profile" opens a CENTERED MODAL (full_name editable; email read-only; Current role / Employment status [dropdown] / Industry-field / Growth focus / Interests → `profiles` job_title/employment_status/field/focus_area/interests). The Settings card's notification toggles are functional + persisted to `profiles.notification_preferences` (jsonb), with a note that delivery isn't wired yet.

## Admin Views (route keys)
- `admin-overview` → AdminOverview (admin.jsx)
- `admin-members` → AdminMembers (admin.jsx) — loads from Supabase `profiles` table
- `admin-tasks` → AdminTasks (admin.jsx)
- `admin-roadmap` → RoadmapBuilder (roadmapbuilder.jsx) — admin discovery-call tool: member selector, 5-section intake + MEGA diagnostic + focus pills, Generate (via `generate-roadmap` Edge Function), editable review panel, Save → inserts `goals` + `roadmap_steps` + `tasks` for the selected member. Nav: after Tasks & Goals.
- `admin-sessions` → AdminSessions (admin.jsx) — live scheduling (writes `sessions`), "Connect Google" + auto Meet links, Google-Calendar-style time pickers
- `admin-messaging` (nav label "Chat", icon `chat`) → BulkMessaging (adminplus.jsx) → `AdminChatScreen` → `AdminChat`, which now renders the member `ChatScreen` (admins get the "New channel" control).
- `admin-resources` → AdminResources (admin.jsx)
- `admin-chat` (the old "Channels" page) — REMOVED (was a duplicate of the Chat page; nav item + route deleted).
- `admin-analytics` → AdminAnalytics (analytics.jsx) — still mock data
- Overview "Schedule session" / "New task" buttons navigate to admin-sessions / admin-tasks.

Admin mode is triggered when `liveProfile.role === 'admin'` and route starts with `admin-`.
"View As" lets admins impersonate a member. `isRealAdmin` stays true during View As.

## Supabase Integration
URL and anon key are in supabase.jsx. Client is `window._supabase`.

Tables wired to live data:
- `profiles` — member auth, role (admin/member), membership_tier ('breakthrough'/'foundations'), account_type, trial status, member_status, joined_at, `google_connected`, `google_email`. Personal-info cols (editable from Profile, drive the Profile Complete badge): `job_title`, `employment_status`, `field`, `focus_area`, `interests` (text[]). `notification_preferences` (jsonb, with defaults) backs the Profile → Settings notification toggles. XP cols: `xp_total` (int, default 0 — cumulative XP, additive only; tier is DERIVED from it, never stored), `streak_days` + `last_streak_date` (weekday-streak engine state, also powers the dashboard Streak widget). (Note: the brief's `xp_regeneration_count` was intentionally SKIPPED — regeneration is already tracked per-task in `tasks.regen_count`.)
- `tasks` — member tasks. `roadmap_step_id` is now NULLABLE (standalone tasks allowed). Added columns: `goal_id` (direct goal link), `subject`, `priority`, `regen_count` (AI subtask regenerations used, max 3). `points`/`impact` are still client-side defaults (no columns) and `impact` is no longer rendered anywhere; completion uses the real `is_completed` column. Editable from the Tasks detail panel via `EditTaskModal` (title/notes/subject/priority/due_date/goal_id).
- `subtasks` — smallest unit of work, lives exclusively under a task. Cols: `task_id` (FK → tasks, ON DELETE CASCADE), `user_id`, `text`, `is_completed`, `source` (`ai`/`manual`), `order_index`, `created_at`. Own-row RLS (select/insert/update/delete) + `is_admin()` override on select/delete. Loaded lazily per task in `TaskDetailPanel`; AI ones come from the `generate-subtasks` Edge Function, manual ones from the inline add input. AI tag = `--sapphire`, Manual tag = `--coral`.
- `goals` — member goals (title, description, target_date, status).
- `roadmap_steps` — middle layer between goals and tasks (legacy GoalCard link path via `goal_id` OR `roadmap_step.goal_id`; also the phase layer for the Roadmap feature — `phase_label`, `reflection_prompt`, `admin_notes`, `order_index`, `status`, week range stored as prefix of `description`).
- `sessions` — 1:1s + town halls. Admin creates; members read own 1:1s (`attendee_id = auth.uid()`) + all town halls (`attendee_id` null) via RLS. Cols: type, title, session_date, start_time, end_time, mentor_name, meeting_link, recurrence, attendee_id, created_by, `google_event_id`.
- `wins` — community Wins board (load + post). Author info denormalized onto rows (`author_name`, `author_role`, `subject`) since profiles RLS is own-row-only. `is_public` gates the feed.
- `focus_sessions` — focus-timer "Save" writes here from BOTH the dashboard pomodoro and the Tasks-page panel timer (duration_minutes = actual elapsed, `selected_minutes` = chosen preset, label, subject, linked_id, linked_kind, started_at). For task-panel sessions `linked_kind='task'` / `linked_id=task.id`; the panel's cumulative "X h Ym focused on this task" line sums duration_minutes for that id. Read by the Focus metrics tab + dashboard "Focus this week" widgets.
- `win_reactions` — persisted reactions on wins (win_id, user_id, emoji; unique per trio). SELECT open to authenticated (counts + Win Of The Week computable); insert/delete own. Powers Wins reactions + the Win Of The Week badge.
- `resource_views` — one row per distinct resource a user opened (user_id, resource_id text; unique). Own-row RLS. Powers the Resources badge category. Logged via `window.logResourceView`; counted via `window.fetchResourceViewCount`.
- `channels` — chat channels (`name`, `description`, `created_by`, `is_default`, `created_at`). One seeded `is_default` channel ("MEGA Mentorship") everyone shares. RLS: SELECT = `is_channel_member(id) or is_admin()`; INSERT/UPDATE/DELETE = `is_admin()` (channel creation is admin-only).
- `channel_members` — channel membership (`channel_id` FK CASCADE, `user_id`, `role`, unique per pair). RLS: co-members + admins can read; admins/owners/self manage rows. The default channel needs NO membership rows (everyone is implicitly a member via `is_default`).
- `messages` — chat messages (`channel_id` FK CASCADE, `user_id`, `body`, denormalized `author_name`/`author_role`, `created_at`). RLS: read/write requires `is_channel_member(channel_id) or is_admin()`; author/admin can delete. Powers the chat feed AND the Community badge counter.
- `community_posts` — LEGACY single-channel feed (0 rows, superseded by `messages`). Kept but unused; do not build on it.
- `google_tokens` — admin Google OAuth tokens. SERVICE-ROLE ONLY (RLS on, no policies); never read client-side.
- `points_log` — NOW WIRED as the XP transaction log (reused per the XP brief's "map to existing, don't duplicate" rule instead of a new `xp_transactions` table). One row per XP award: `user_id`, `points` (= xp_awarded), `source` (= action_type), `reason`, `reference_id` (task/subtask/goal/session id), `created_at`. Its `points_log_source_check` was widened to the XP action types (`subtask_complete`/`task_complete`/`goal_complete`/`focus_session`/`town_hall`/`one_to_one`/`streak_bonus`/`badge_unlock`); legacy values kept for back-compat. Town-hall/1:1 attendance counts on the dashboard are derived from this table (own-row SELECT RLS). Written ONLY via the SECURITY DEFINER XP functions.
- `badge_unlocks` — one row per badge a member has unlocked (`user_id`, `badge_key` = the badge's display name, unique per pair). Own-row SELECT RLS; written only via `sync_badges`. Gives the +25-per-badge award idempotency.

DB function: `member_count()` — SECURITY DEFINER, returns total profile count (members can't read other profiles under RLS, so this powers community/chat member counts).
RLS helper: `is_admin()` — SECURITY DEFINER, true when the caller's profile role = 'admin'; used as the admin override across own-row policies.
Chat RLS helpers (all SECURITY DEFINER, anon EXECUTE revoked, authenticated-only): `is_channel_member(cid)` (membership row exists for caller OR channel is_default), `is_channel_owner(cid)` (caller = channels.created_by), `list_members()` (returns id/full_name/role/membership_tier/`xp_total` — the member directory for the create-channel multi-select AND the source of other members' XP for the community channel display, since `profiles` is own-row-only under RLS).
XP functions (all SECURITY DEFINER, anon EXECUTE revoked, authenticated-only; XP is additive — no deduction logic anywhere):
- `award_xp(p_action, p_xp, p_ref, p_once)` — atomic: inserts the `points_log` row AND increments `profiles.xp_total` in one transaction; returns `{awarded, total}`. `p_once=true` skips (returns awarded 0) if a row with the same `(user_id, source, reference_id)` already exists — this is how task/subtask/goal/attendance awards stay one-time even if a task is unchecked and re-checked.
- `record_activity(p_today date)` — weekday-streak engine. Weekends are ignored (neither advance nor break). Continues the streak when the previous weekday was active (Mon links back to Fri), awarding a +10 `streak_bonus`; otherwise resets to 1. Updates `streak_days`/`last_streak_date`; returns `{bonus, streak, total}`. Client passes its LOCAL date.
- `sync_badges(p_keys text[])` — given the currently-earned badge names, inserts any missing `badge_unlocks` rows and awards +25 each (one `points_log` row per badge); idempotent; returns `{awarded, count, total}`.

## Badge System (Profile badge wall)
- Catalog + earned-state are computed on load in profile.jsx (`computeBadgeCategories`) from live data — no badges table, no persistence (most triggers are monotonic). 11 categories; the spec listed "57" but its enumerated rows sum to 58, so the UI count is dynamic ("X of N earned"), never hardcoded.
- Data sources: focus_sessions (count + hours + Early Bird/Night Owl times), tasks (completed count), sessions (attended past), goals (set + completed), resource_views, community_posts, wins (own count) + win_reactions (Win Of The Week), profiles.joined_at (Milestones tenure), profile fields (Profile Complete). Streaks/Weekend/Perfect Week+Month derive from a combined active-day set.
- Interpretations (in code): Win Of The Week = top-reacted win within its Mon–Sun week, attributed to its author. Perfect Month = a calendar month where every Mon–Sun week is a Perfect Week (≥4 qualifying weeks).
- UI: compact wall shows 12 (earned first, then easiest locked) → 3 rows; "View all" opens a centered modal grouped by category. Prestige badges get a gold border + "Prestige" label (white in dark mode). BadgeTile takes a `theme` prop for the prestige label color.

Edge Functions (source mirrored in `supabase/functions/`):
- `invite-member` — member invite flow.
- `google-oauth-start` — builds Google consent URL (admin only).
- `google-oauth-callback` — OAuth redirect target (verify_jwt OFF); exchanges code, stores tokens, sets profiles.google_connected.
- `google-calendar-event` — creates a Calendar event with a Meet link + invites the member; writes meeting_link/google_event_id back to the session.
- `generate-roadmap` — admin-only (verifies `role='admin'` via the caller's JWT, verify_jwt ON); relays a prompt to Anthropic (`claude-sonnet-4-6`, max_tokens 2000) and returns the text. Keeps the Anthropic key server-side. Called from roadmapbuilder.jsx via `supabase.functions.invoke`.
- `generate-subtasks` — any authenticated member (verify_jwt ON, NOT admin-gated); takes `{ title, description }`, calls Anthropic (`claude-sonnet-4-6`, max_tokens 1000) with the productivity-assistant system prompt, parses/strips the JSON array server-side and returns `{ subtasks }` (3–5 strings). Called from tasks.jsx `TaskDetailPanel` for "Break this down" / "Regenerate".
Required Edge Function secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (= the google-oauth-callback URL; must match the Authorized redirect URI in Google Cloud); `ANTHROPIC_API_KEY` (used by generate-roadmap AND generate-subtasks). OAuth app is under a personal GCP project in Testing mode → publish to Production to avoid the ~7-day refresh-token expiry.

Still mock/placeholder (NOT wired): resources content (RESOURCES in data.jsx; only view-logging is real), admin analytics + members list, chat realtime/threads/reactions (chat itself is live + multi-channel, but new messages/channels surface via 6s polling + page reload, not websockets), session recurrence (label only, no repeating instances), automated reminders (notification preferences are saved but no delivery engine exists yet).

Membership tiers: `breakthrough` → "Breakthrough" plan, anything else → "Foundations" plan.
Role values: `admin` for admin users, anything else treated as member.

## XP System (live)
Cumulative XP rewards engagement; tier is ALWAYS derived from `xp_total` at read time (never stored). XP is additive only — no deductions anywhere, even if a task is uncompleted/deleted.
- **Tiers** (`XP_TIERS` + `xpTier(total)` helper in data.jsx, on `window`): 8 tiers — Rookie 0 / Rising Star 1,000 / Contender 2,500 / Pro 4,500 / Veteran 7,000 / All-Star 10,500 / MVP 14,000 / Icon 18,500. `xpTier` returns `{tier, name, index, isMax, next, into, span, toNext, pct, xp}`.
- **Earning actions** (all routed through `window.awardXp(action, xp, ref, once, qualifies)` in index.html, which calls `award_xp` then — when `qualifies` — `record_activity`): subtask complete +5 (tasks.jsx `toggleSub`), task complete +20 (tasks.jsx `completeTask` AND roadmap.jsx `toggleTask`), goal complete +100 (tasks.jsx `completeGoal` — NEW "Mark goal complete" button on `GoalCard`; goals previously had no complete action), focus session +10 base plus +15 per full 30-min block (index.html `focus.save`), town hall +30 / 1:1 +50 Breakthrough-only (index.html `onJoin`, fired by the Join buttons on Dashboard "Next up" + Sessions list), weekday streak +10/continued day (`record_activity`), badge unlock +25 each (profile.jsx effect → `window.syncBadges`). Task/subtask/goal/attendance use `once=true` (idempotent per entity); the four task/subtask/goal/focus actions pass `qualifies=true` to advance the streak.
- **Live state**: App (index.html) holds `xpTotal`/`streakDays` (seeded from the profile, updated by award/sync results); `member.xp`/`member.points`/`member.streakDays` read from them. Every award fires the existing point-pop reward animation.
- **Dashboard tile** (dashboard.jsx `DashLevel`): tier name + "Tier N / 8" + progress bar between current and next threshold; "X to {next}" or "Max Tier Reached" at Icon. 8-segment tier strip.
- **Conditional activity tiles** (dashboard.jsx `DashStats`, by `member.plan`): Breakthrough → [1:1 Sessions, Tasks, Goals, Town Halls]; Foundations → [Focus Time this week ("Xh Ym", Mon–Sun), Tasks, Goals, Town Halls]. 1:1 is NEVER shown to Foundations. Tasks/Goals counts from props; town-hall/1:1 counts from `points_log`; focus time from focus rows. (Replaced the old mock Modules/Habits tiles + fake mini-bar trends.)
- **Community channel** (chat.jsx): each author's XP shown inline beside their name ("Name · 1,840"), secondary text color; XP map fetched via `list_members()`.

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

### Shared Focus Timer
- There is ONE active focus timer for the whole member app. Its state (`focusTimer`) + the `focus` API (`start/pause/resume/save/reset`) + a `focusTick` counter live in the root App (index.html) and are passed to BOTH `DashboardScreen` and `TasksScreen` as `focus` / `focusTick`. The dashboard pomodoro and the Tasks-panel timer are just views over it, so a session is mirrored across pages and survives collapsing a row / navigating between pages. Starting a new timer replaces any running one (single active session).
- Wall-clock based: the timer object stores `endsAt` (ms) when running and a frozen `remainingSec` when paused; `window.focusTimerRemaining(t)` derives the live remaining (accurate across background-tab throttling). It does NOT survive a full page refresh (no localStorage persistence — that was deliberately out of scope).
- Per-second re-renders are localised via `window.useNowTick(active)` (a 1s force-update used only by the components actually showing a countdown), so App does not re-render every second. Collapsed task rows show a live `⏱ MM:SS` pill when their timer is running.
- `focus.save()` writes one `focus_sessions` row (elapsed minutes + selected_minutes + linked task) and bumps `focusTick`; `DashboardScreen` reloads its focus rows on `focusTick` and `TaskDetailPanel` re-fetches its cumulative total on `focusTick`.

## Current Status
- Auth: live (Supabase email/password + magic link)
- Member invite flow: live (Edge Function)
- Tasks + Goals: live (Supabase) — create UI (+ New modal, create-from-focus-picker), TickTick-style Today/Tomorrow/Next-7-days/All views + collapsible Completed (panels stay open until closed); completion driven by `tasks.is_completed`; per-task detail panel with edit modal; effort×impact removed
- Subtasks: live + deployed — `subtasks` table, AI generation via `generate-subtasks` Edge Function ("Break this down" + max-3 "Regenerate" with persisted `tasks.regen_count`), manual add, inline edit/delete, AI/Manual tags
- Sessions: live (Supabase) — admin scheduling, member calendar/list + dashboard "Next up", add-to-calendar (.ics/Google/Outlook), Google Meet auto-link + member invite on scheduling
- Focus: live — single shared timer across Dashboard + Tasks (wall-clock, survives collapse/navigation, single active session, live row pill), Save → focus_sessions (elapsed + selected_minutes, task-linked from the panel), Focus metrics tab (overview, trends, by-subject, records) + heatmaps (most-focused-time histogram, weekday×hour rhythm, year grid)
- Wins board: live (Supabase `wins`) — reactions persisted (`win_reactions`)
- Resources: content still mock; opening a card logs a view (`resource_views`) for badges
- Badges: live + deployed — full 57+ catalog computed on load across 11 categories, "View all" modal, prestige styling; backed by `win_reactions`/`resource_views`/`community_posts`/profile fields
- Roadmap: live + deployed — admin builds via Roadmap Builder (AI generate → edit → save) and members view/interact on the Roadmap page. `ANTHROPIC_API_KEY` Edge Function secret is set; `generate-roadmap` function deployed (verify_jwt ON). `goals` INSERT policy updated to allow `is_admin()` (matching `roadmap_steps`/`tasks`) so admins can save on a member's behalf.
- Notifications: notification center driven by real upcoming sessions; its footer links to Profile → Settings; the notification toggles are functional + persisted (`profiles.notification_preferences`) — preferences only (no delivery engine yet)
- Chat: live + multi-channel (`channels`/`channel_members`/`messages`) — global default channel + admin-created invite-only channels (searchable member multi-select), feed/composer, 6s polling; no realtime/threads/reactions
- Eisenhower matrix: live — fully automatic placement from priority + due date, completed tasks excluded, no manual override (eisenhower.jsx `getQuadrant`)
- XP system: live + deployed-pending — 8 derived tiers, `points_log` wired as the transaction log, `badge_unlocks` for badge idempotency; `award_xp`/`record_activity`/`sync_badges` SECURITY DEFINER functions; all 9 earning actions wired (subtask/task/goal/focus/town-hall/1:1/streak/badge), real dashboard tile + plan-conditional activity tiles + community-channel XP. RPCs verified end-to-end via a simulated authenticated session (rolled back). See the XP System section.
- Profile: stat card + milestones + full badge wall real; editing via a centered modal (full_name editable, email read-only, clearer labelled fields); notification toggles persisted
- Tweaks panel: gamification control removed (hard-coded); Tweaks icon is the distinct `sliders` glyph (data.jsx)
- Admin member management: live (profiles); admin analytics + members list still mock
- Dark mode: native date/time picker icons inverted to white
- Branding: real Vantage logo in the brand box (inline currentColor SVG, theme-inverting, enlarged) + dynamic rounded-square boxed favicons (blue for light browser UI, white for dark)
- Deployment: Vercel auto-deploy from GitHub `main` (confirmed active this session)
- Trial expiry enforcement: live (admin + auth flow)
- Not yet built: session recurrence instances, chat realtime/threads/reactions (multi-channel itself is live), automated reminder delivery (preferences saved, no engine), real resources content, focus-timer persistence across full page refresh, XP leaderboard / `xp_transactions` analytics UI (log table is backend-only by design)

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
2026-05-25 — Built + shipped the Roadmap feature: admin RoadmapBuilder (roadmapbuilder.jsx, route admin-roadmap) and member RoadmapScreen (roadmap.jsx, route roadmap), added `roadmap` icon + nav items + routes; deployed `generate-roadmap` Edge Function (Anthropic key server-side, admin-gated, claude-sonnet-4-6) and set the `ANTHROPIC_API_KEY` secret; fixed `goals` INSERT RLS to allow `is_admin()` on-behalf saves. Committed (51fbc1a) and pushed to `main` → Vercel deploy.
2026-05-25 — Replaced the placeholder badge wall with a real 57+ badge system (profile.jsx `computeBadgeCategories`, computed-on-load across 11 categories, "View all" modal, prestige styling, compact wall filled to 12). Added supporting backends (migration `badge_backends`): `win_reactions` (persisted Wins reactions, enables Win Of The Week), `resource_views` (logged on resource open), `community_posts` (lightweight chat posting backend), and `profiles` personal-info cols (`job_title`/`employment_status`/`field`/`focus_area`/`interests`) with an editable Profile card (drives Profile Complete). Committed (c8865a8, b84a184) and pushed to `main` → Vercel deploy. NOTE: the Claude preview sandbox lost OS read access to the Documents folder this session (getcwd "Operation not permitted"), so changes were verified via schema checks + on the deployed site, not the local preview.
2026-05-25 — Task panel redesign + shared focus timer. Removed Effort×Impact from the task detail panel; added DB-backed Subtasks (migration `task_panel_subtasks_and_focus`: `subtasks` table + own-row RLS, `tasks.regen_count`, `focus_sessions.selected_minutes`) with AI generation via the new `generate-subtasks` Edge Function (member-auth, claude-sonnet-4-6, max_tokens 1000), manual add, inline edit/delete, AI/Manual tags, and a max-3 "Regenerate" with persisted count. Unified the dashboard pomodoro and the new task-panel timer into ONE shared App-level focus timer (wall-clock via `focusTimerRemaining`, localised ticking via `useNowTick`, single active session, live collapsed-row pill) that survives collapse + page navigation and is mirrored on both pages; added an `EditTaskModal` (center popup) for task editing and made task detail panels stay open until closed (`expandedIds` Set). Committed (c1c6584, d2d1272) and pushed to `main` → Vercel deploy. NOTE: still couldn't run the local preview (Documents getcwd "Operation not permitted") or a JS compile-check — changes verified by code review + DB schema checks; interactive flows need a manual pass on the deployed site.
2026-05-25 — Sprint pass ("Vantage sprints - 25 May" doc), tiered easiest→hardest, pushed per tier. T1 (c826940): renamed Tasks "Focus" tab → "Focus Metrics"; new `sliders` icon for Tweaks (gear looked like the theme toggle) + removed the member gamification control (hard-coded); removed the duplicate admin "Channels" page (`admin-chat`) and swapped the admin Chat nav icon to `chat`. T2 (cba087e): sessions list date column → blue (dark-mode legible) + collapsible past sessions; collapsible Goals (GoalCard chevron); Roadmap Builder post-save "saved" stage with "Build another" reset; badge milestones declared already-covered by the 57+ rebuild. T3 (715a2b0): fixed View-As crash (MembersTable now passes a normalised name/initials/color/plan object); Eisenhower matrix made fully automatic (priority+due_date `getQuadrant`, completed excluded, drag/override removed); dashboard Smart Overview (dynamic greeting + `buildSmartOverview`); profile save hardened. Profile edit reworked (88e31f7): centered modal, full_name editable, clearer labelled fields (Employment status dropdown), email read-only. Chat (887fcff): migration `chat_channels_messages` (+ `chat_helpers_revoke_anon`) → `channels`/`channel_members`/`messages` + RLS + `is_channel_member`/`is_channel_owner`/`list_members` (anon revoked), seeded default channel; rewrote chat.jsx to multi-channel (invite-only, admin-only "New channel" with searchable member multi-select, 6s polling); admin Chat now renders ChatScreen; removed "Messaging coming soon"; Community badge counts `messages`. Notifications (13625fc): notification-center footer links to Profile; `profiles.notification_preferences` (jsonb) added and toggles made functional/persisted (+ UI note that delivery isn't wired). RLS verified via simulated authenticated sessions (set role + jwt claims). Doc item #11 (Effort×Impact) dropped; #4 reframed from "remove text" to "link + functional prefs". NOTE: local preview still blocked by the macOS ~/Documents TCC sandbox (dev server can't getcwd/import there) — all UI verified by code review only; recommend a click-through on the Vercel deploy. Durable fix: move repo out of ~/Documents or grant Full Disk Access to the Claude app.
2026-05-26 — Built the full XP system ("vantage-xp-system-build-brief.md"). Migrations `xp_system` (profiles.`xp_total`/`streak_days`/`last_streak_date`, `badge_unlocks` table, `award_xp`/`record_activity`/`sync_badges` SECURITY DEFINER fns, `list_members()` recreated to also return `xp_total`) + `xp_points_log_source_check` (widened the existing `points_log_source_check` to the XP action types). FLAGGED + RESOLVED 3 brief conflicts up front: (1) reused the unused `points_log` as the transaction log instead of a new `xp_transactions` (Section 7 anti-dup rule); (2) SKIPPED `xp_regeneration_count` (duplicates per-task `tasks.regen_count`); (3) user chose "build everything" so also built attendance (via Join → `points_log`), a weekday-streak engine, and badge-unlock persistence. A 4th conflict surfaced mid-build: `points_log`'s old CHECK constraint only allowed 5 legacy `source` values — widened it (table had 0 rows). Frontend: 8-tier helper (`XP_TIERS`/`xpTier` in data.jsx); App-level `xpTotal`/`streakDays` + `window.awardXp`/`window.syncBadges`; wired all 9 earning actions; rewrote `DashLevel` (8 tiers) + `DashStats` (plan-conditional real tiles, removed mock Modules/Habits + `MiniBars`); added a "Mark goal complete" button to `GoalCard` (goals had no complete path before); community-channel inline XP beside names; Profile tier chip + "XP" stat + badge-sync effect. RPCs verified end-to-end against a real member in a rolled-back transaction (award + once-dedup + focus math + streak-continue + weekend-ignore + badge idempotency all correct → 105 XP / 2-day streak). NOT committed/pushed yet (awaiting review) and NOT browser-verified — same ~/Documents TCC sandbox blocks the local dev server (confirmed again: server process gets 404s reading project files even when the Bash tool can). Recommend a click-through on the Vercel deploy after pushing.
