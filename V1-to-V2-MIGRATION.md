# Vantage V1 → V2 Migration Plan & Gap Analysis

_Generated 2026-06-20. Scope: how to cut over from the live V1 platform to the V2 redesign with zero breakage for active members._

---

## TL;DR — the one thing that makes this safe

**V2 is a frontend-only reskin of the *same* backend.** V2's `supabase.jsx` points at the identical Supabase project (`npsfarsblfewdclhoquo`) with the identical anon key as V1. Same tables, same RLS, same Edge Functions, same auth. There is **no database migration, no data move, and no schema change** in this cutover. The risk surface is therefore small and almost entirely about (a) two missing static files, (b) a demo-data flag, and (c) Vercel/Auth URL config — not data loss.

Verified live backend state (2026-06-20):
- **21 tables**, all RLS-enabled except one (see Gap #6).
- **14 Edge Functions**, all `ACTIVE`.
- Same project, region `ap-northeast-1`, Postgres 17.

---

## Gap Analysis (V1 → V2)

| # | Gap | Severity | Action owner |
|---|-----|----------|--------------|
| 1 | ~~`legal.html` missing from V2~~ → **RESOLVED 2026-06-20** (copied verbatim from V1) | ✅ Done | — |
| 2 | **Resources demo fallback is ON** (`RES_DEMO_FALLBACK = true`) and the live `resources` table has **0 rows** | 🔴 Blocker | Decide before cutover |
| 3 | **V2 files are untracked in git** (working tree only) | 🟠 Risk | Commit to branch |
| 4 | Vercel deploys the **repo root**, but V2 lives in the `Vantage V2/` subfolder | 🟠 Config | Vercel setup |
| 5 | **Supabase Auth redirect/site URL** must match the cutover domain | 🟠 Config | Verify before login testing |
| 6 | `radar_discovery_state` has **RLS disabled** (pre-existing, shared with V1) | 🟡 Security | Optional hardening |
| 7 | **`RESEND_API_KEY` secret** may still be unset (task-deadline reminder emails) | 🟡 Backend | Verify in Supabase |
| 8 | **Deliberate V2 functional divergences** (chat gating, focus stopwatch, task views) | 🟢 Confirm | Product decision |

### Gap #1 — `legal.html` missing → ✅ RESOLVED (2026-06-20)
`vercel.json` rewrites `/legal → /legal.html` and `LegalConsentModal` links members to `/legal`; the file was absent from `Vantage V2/`, which would have 404'd the policy link on cutover. **Fixed:** V1's `legal.html` was copied verbatim into `Vantage V2/legal.html` (36,062 bytes, identical). `/legal` now resolves.
**Note:** the page was also **reskinned to the V2 type/token system** (2026-06-20) — Montserrat body + Montserrat 800 sentence-case headings, Oswald wordmark, V2 light tokens (`--accent #003C90`, `--bg #FAF8FF`, `--border #E1E2EB`), and the inline brand mark recolored to the V2 accent. Still a single self-contained file.

### Gap #2 — Resources demo fallback (Blocker)
The live `resources` table has **0 rows**. V2 ships a demo fallback (`RES_DEMO` — 8 fake sample books) gated by `RES_DEMO_FALLBACK = true` in `resources.jsx`, which renders **only when the live query returns 0 rows**. If you cut over today, **real members would see 8 fake resources.**
**Fix — pick one before cutover:**
- (a) Set `RES_DEMO_FALLBACK = false` → members see the honest "Hang on tight, resources will be added shortly" empty state (matches V1 behavior), **or**
- (b) Add real resources via the Admin → Resources manager so the fallback auto-disappears.
Recommend (a) for the cutover unless you have real content ready.

### Gap #3 — V2 is untracked in git (Risk)
The entire `Vantage V2/` folder is uncommitted working-tree state. There's no version-control safety net and no way to deploy it through the normal Vercel→GitHub flow until it's committed. (This is consistent with the "don't push" constraint that's governed the redesign so far — but it must change to ship.)
**Fix:** commit the V2 folder to the `vantage-v2-redesign` branch. Nothing auto-deploys from a non-`main` branch, so committing is safe and reversible.

### Gap #4 — Subfolder vs. Vercel root (Config)
Vercel builds/serves from the **repository root**, where V1 currently lives. V2 is in `Vantage V2/`. Two ways to resolve at cutover time:
- **Move V2 files to repo root** (overwriting V1) on `main` — cleanest for a same-domain production swap, and keeps `legal.html`/favicons/logos at the paths the app expects.
- **Or** point a Vercel project's "Root Directory" setting at `Vantage V2/` — good for a parallel staging deploy without touching V1.

### Gap #5 — Supabase Auth URLs (Config)
V2 auth uses `redirectTo: window.location.origin` (magic link + Google OAuth). The Google OAuth callback / Calendar Edge Functions use a fixed `GOOGLE_REDIRECT_URI` (a Supabase function URL) — that's unchanged and fine.
- **If you cut over on the same domain** (`vantage.mega-mentorship.com`): **no auth config change needed.**
- **If you stage on a new `*.vercel.app` URL first:** add that URL to **Supabase → Auth → URL Configuration → Redirect URLs** (and Site URL), or magic links / OAuth will reject the redirect during QA.

### Gap #6 — `radar_discovery_state` RLS disabled (Security, pre-existing)
The security advisor flags `public.radar_discovery_state` (1 row) as having RLS **disabled** — readable/writable by anyone with the anon key. This is **not introduced by V2** (shared backend), but it's worth hardening. It's an automation bookkeeping table, not member data.
**Optional fix (your call — don't run blind):**
```sql
ALTER TABLE public.radar_discovery_state ENABLE ROW LEVEL SECURITY;
-- then add a policy, or leave it service-role-only (Edge Functions use the service key and bypass RLS):
-- no policy = no anon/authenticated access, which is the safe default for an automation table.
```
Other advisor notes are pre-existing and mostly intentional: `google_tokens` (RLS on, no policy = service-role-only, correct); several `SECURITY DEFINER` RPCs executable by anon/authenticated (guarded internally, but you may want to `REVOKE EXECUTE ... FROM anon`); Auth leaked-password protection is off (toggle on in Auth settings); `pg_net` installed in `public` (cosmetic).

### Gap #7 — `RESEND_API_KEY` (Backend)
`task-deadline-reminders` (daily 05:00 UTC cron) needs `RESEND_API_KEY` + a verified `mega-mentorship.com` domain in Resend. V1 notes flagged this as **not yet set**. This is shared backend (unaffected by the reskin) but part of "everything working."
**Fix:** confirm the secret exists in Supabase → Edge Functions → Secrets, and that the Resend domain is verified. Until then, reminder emails silently no-op.

### Gap #8 — Deliberate V2 divergences (Confirm)
V2 (Session 5) intentionally went beyond a pure reskin. These are **changes from V1 behavior** to confirm you want live:
- **Chat is gated to MEGA Management only** — non-management members lose the Chat nav item entirely. (V1 showed chat to everyone.)
- **Focus timer** gained a stopwatch mode + auto-save on countdown finish.
- **Tasks** gained List/Board/By-subject views; **Goals** gained Stacked/Grid.
- **Dashboard** XP-progress modal + weekly consistency strip.
All V1 features remain present; these are additive/gating changes. Just confirm the chat-gating is intended for the production audience.

**Net feature parity:** every V1 member + admin page and backend integration is present in V2 (file-by-file mirror of all 25 source files confirmed). The only true *missing* artifact is `legal.html` (Gap #1).

---

## Recommended Cutover Sequence

I recommend **staging first, then an in-place swap on the production domain** (so the live domain + auth config never change at the moment of cutover):

**Phase 0 — Pre-flight (fix the blockers)**
1. Copy `legal.html` into `Vantage V2/`.
2. Set `RES_DEMO_FALLBACK = false` in `resources.jsx` (or load real resources).
3. Commit the `Vantage V2/` folder to branch `vantage-v2-redesign`.
4. Confirm `RESEND_API_KEY` is set (Gap #7).

**Phase 1 — Stage & QA**
5. Deploy a **preview** (Vercel project with Root Directory = `Vantage V2/`, or a branch deploy).
6. Add the preview URL to Supabase Auth redirect/site URLs (Gap #5).
7. Click-through QA with a **real account** — prioritize: login (password + magic link + Google), onboarding + legal gate, dashboard (XP modal, consistency strip, stopwatch), Tasks view toggles, Corporate Radar (incl. new "See more" pagination), collapsible nav, and chat visibility on a `management`-tier account.

**Phase 2 — Production cutover (same domain)**
8. Move V2 files to repo root on `main` (overwrite V1), commit, push → Vercel auto-deploys to `vantage.mega-mentorship.com`. No auth config change because the origin is unchanged.
9. Smoke-test prod. **Rollback** if needed is a one-line `git revert` + redeploy (static files + shared backend = trivial, no data risk).

**Why this order:** the backend never changes, so the only thing that can break is the static frontend or a URL allowlist. Staging catches those without exposing members; the final swap keeps the production domain/auth identical so there's nothing new to allowlist at the riskiest moment.

---

## What is explicitly NOT at risk
- Member data (profiles, tasks, goals, focus sessions, wins, XP, badges, chat, radar saves) — untouched; same DB.
- Auth sessions — same Supabase project; existing logins stay valid.
- Edge Function automations (hiring refresh, company discovery, deadline reminders, Google Calendar) — server-side, unchanged.
- RLS policies — unchanged.
