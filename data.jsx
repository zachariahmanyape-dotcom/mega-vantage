// Vantage — shared data, icons, utilities
// ALL style names prefixed to avoid collisions

const SUBJECTS = {
  "Professional Communication": "#7B8FF3",
  "Time Management":            "#4FB7A6",
  "Growth Mindset":             "#FF9A7B",
  "Early Career Development":   "#B79BED",
  "Personal Branding":          "#E8B24C",
  "CV Development":             "#5BC0DE",
  "Project Management":         "#0F52BA",
  "Public Speaking & Presentation": "#D76C82",
  "Habit Tracking":             "#4CAF88",
  "Personal Financial Management": "#4E7CE0",
  "Data Management":            "#8B8FA3",
  "Strategic Sales":            "#E66A5C",
  "Consulting":                 "#3A4A6B",
};

const MEMBER = {
  firstName: "Amira",
  lastName: "Khaled",
  initials: "AK",
  email: "amira.khaled@vantage.me",
  avatarColor: "#0F52BA",
  plan: "Breakthrough",
  product: "Mentorship",
  points: 4260,
  level: "Skilled",
  levelIndex: 2,        // 0..4 of [Beginner, Rising, Skilled, Advanced, Elite]
  pointsInLevel: 760,
  pointsToNext: 1240,
  streakDays: 14,
  learningThisMonth: "14h 32m",
  stats: {
    sessions: 11,
    modules: 23,
    habits: 6,
    townHalls: 4,
  },
  interests: ["Public speaking", "Startup strategy", "Running", "Arabic literature"],
  role: "Analyst",
  status: "Working professional",
  field: "Consulting",
  focus: "Professional Communication",
};

const LEVELS = ["Beginner", "Rising", "Skilled", "Advanced", "Elite"];

// ── XP tiers — tier is always derived from xp_total at read time, never stored ──
const XP_TIERS = [
  { tier: 1, name: "Rookie",      min: 0 },
  { tier: 2, name: "Rising Star", min: 1000 },
  { tier: 3, name: "Contender",   min: 2500 },
  { tier: 4, name: "Pro",         min: 4500 },
  { tier: 5, name: "Veteran",     min: 7000 },
  { tier: 6, name: "All-Star",    min: 10500 },
  { tier: 7, name: "MVP",         min: 14000 },
  { tier: 8, name: "Icon",        min: 18500 },
];

// Derive everything the UI needs about a member's tier from their cumulative XP.
function xpTier(total) {
  const xp = Math.max(0, Math.floor(total || 0));
  let i = 0;
  for (let j = 0; j < XP_TIERS.length; j++) if (xp >= XP_TIERS[j].min) i = j;
  const current = XP_TIERS[i];
  const next = XP_TIERS[i + 1] || null;       // null at Icon (max tier)
  const into = xp - current.min;              // XP earned within the current tier band
  const span = next ? next.min - current.min : 0;
  const toNext = next ? next.min - xp : 0;
  const pct = next ? Math.min(100, Math.round((into / span) * 100)) : 100;
  return { ...current, index: i, isMax: !next, next, into, span, toNext, pct, xp };
}

const TASKS = [
  {
    id: "t1",
    title: "Draft elevator pitch for your current role",
    subject: "Personal Branding",
    due: "Tomorrow · 6:00 PM",
    dueSort: 1,
    impact: [3, 3], // x=effort(1-4), y=impact(1-4)
    points: 120,
    subtasks: [
      { t: "Collect 3 references of strong elevator pitches", done: true },
      { t: "Draft version 1 (60 seconds)", done: true },
      { t: "Record yourself reading it aloud", done: true },
      { t: "Refine tone & remove filler words", done: false },
      { t: "Submit for mentor review", done: false },
    ],
  },
  {
    id: "t2",
    title: "Weekly reflection journal — Week 14",
    subject: "Growth Mindset",
    due: "Fri · 10:00 PM",
    dueSort: 3,
    impact: [1, 3],
    points: 60,
    subtasks: [
      { t: "One win this week", done: true },
      { t: "One friction or frustration", done: false },
      { t: "One thing to carry forward", done: false },
    ],
  },
  {
    id: "t3",
    title: "Refactor CV — results-first formatting",
    subject: "CV Development",
    due: "Apr 24",
    dueSort: 5,
    impact: [3, 4],
    points: 180,
    subtasks: [
      { t: "Replace duties with outcomes (last 2 roles)", done: false },
      { t: "Quantify impact with metrics", done: false },
      { t: "Trim to one page", done: false },
      { t: "Export ATS-safe PDF", done: false },
    ],
  },
  {
    id: "t4",
    title: "Complete Time Blocking module",
    subject: "Time Management",
    due: "Apr 26",
    dueSort: 7,
    impact: [2, 3],
    points: 90,
    subtasks: [
      { t: "Watch: Energy vs. hours (14m)", done: true },
      { t: "Template: Block your next Monday", done: false },
      { t: "Submit screenshot of calendar", done: false },
    ],
  },
  {
    id: "t5",
    title: "Prepare two questions for Ramy — 1:1 on Apr 22",
    subject: "Early Career Development",
    due: "Apr 22",
    dueSort: 4,
    impact: [1, 3],
    points: 40,
    subtasks: [
      { t: "Question 1 — career direction", done: false },
      { t: "Question 2 — skill gap", done: false },
    ],
  },
];

const GOALS = [
  {
    id: "g1",
    title: "Land a senior role by Q3",
    description: "Reposition your profile and network with intent. Two interviews scheduled by end of May.",
    taskIds: ["t3", "t1"],
    bonus: 35,
  },
  {
    id: "g2",
    title: "Build a durable weekly rhythm",
    description: "A repeatable week of deep work, learning, and recovery you could run for six months.",
    taskIds: ["t4", "t2"],
    bonus: 20,
  },
  {
    id: "g3",
    title: "Become the team's clearest communicator",
    description: "Writing, speaking, and presence — in meetings and on stage.",
    taskIds: ["t1", "t5"],
    bonus: 15,
  },
];

const RESOURCES = [
  { id: "r1", type: "video",    title: "Energy vs. hours: a new way to plan your week", folder: "Foundations / Core", subject: "Time Management", plan: "Both", addedDays: 1,  length: "14 min" },
  { id: "r2", type: "doc",      title: "CV Rewrite — Results-First template",           folder: "Breakthrough / Career Lab", subject: "CV Development", plan: "Breakthrough", addedDays: 2, length: "PDF · 6 pages" },
  { id: "r3", type: "video",    title: "Pitch yourself in 60 seconds",                   folder: "Foundations / Comms", subject: "Personal Branding", plan: "Both", addedDays: 4, length: "9 min" },
  { id: "r4", type: "link",     title: "Notion template: Weekly review",                 folder: "Habit Systems", subject: "Habit Tracking", plan: "Both", addedDays: 5, length: "External" },
  { id: "r5", type: "video",    title: "Speaking on stage: breath and pace",             folder: "Breakthrough / Speaking Lab", subject: "Public Speaking & Presentation", plan: "Breakthrough", addedDays: 7, length: "22 min" },
  { id: "r6", type: "doc",      title: "Consulting casebook — Chapter 1",                folder: "Management / Strategic", subject: "Consulting", plan: "Management", addedDays: 10, length: "PDF · 38 pages" },
  { id: "r7", type: "doc",      title: "The 1:1 agenda template",                        folder: "Foundations / Core", subject: "Professional Communication", plan: "Both", addedDays: 12, length: "PDF · 2 pages" },
  { id: "r8", type: "video",    title: "Financial independence — first principles",     folder: "Life / Money", subject: "Personal Financial Management", plan: "Both", addedDays: 20, length: "31 min" },
];

const CHANNELS = [
  { id: "c1", kind: "global", name: "MEGA Mentorship", unread: 3, avatar: "MG", color: "#0F52BA", members: 214 },
  { id: "c2", kind: "company", name: "Chalhoub", unread: 0, avatar: "CH", color: "#4FB7A6", members: 38, hidden: true /* membership only */ },
  { id: "c3", kind: "company", name: "RTA", unread: 1, avatar: "RT", color: "#FF6B6B", members: 22, hidden: true },
  { id: "c4", kind: "company", name: "DAMAC", unread: 0, avatar: "DM", color: "#B79BED", members: 14, hidden: true },
];

const CHAT_MESSAGES = [
  { id: "m1", author: "Ramy El-Sayed", role: "Founder, MEGA", color: "#0F52BA", initials: "RE",
    time: "Yesterday · 6:02 PM",
    text: "Quick reminder — April Town Hall is next Thursday at 7 PM GST. Guest: Lina Haddad, author of 'Portfolio Careers'. Bring one question you want her to answer on stage.",
    pinned: true },
  { id: "m2", author: "Ramy El-Sayed", role: "Founder, MEGA", color: "#0F52BA", initials: "RE",
    time: "Yesterday · 6:04 PM",
    text: "Prep worksheet is in Resources → Town Halls → April. Takes 10 minutes, worth doing." },
  { id: "m3", author: "Noura Al-Mansouri", role: "Breakthrough · member", color: "#4FB7A6", initials: "NA",
    time: "Today · 9:18 AM",
    text: "Registered. Also — shoutout to whoever made the CV template. I sent v2 to three recruiters this morning." },
  { id: "m4", author: "Omar Farouk", role: "Foundations · member", color: "#E8B24C", initials: "OF",
    time: "Today · 10:02 AM",
    text: "Agreed. The before/after example in the PDF made it click for me." },
  { id: "m5", author: "Ramy El-Sayed", role: "Founder, MEGA", color: "#0F52BA", initials: "RE",
    time: "Today · 11:30 AM",
    text: "Glad it's landing. We'll do a live CV teardown session at the May Town Hall — send me your latest version by May 1 if you want yours on the big screen (anonymized if you want)." },
];

const ADMIN_MEMBERS = [
  { name: "Amira Khaled",    plan: "Mentorship · Breakthrough", lastActive: "2m ago", points: 4260, streak: 14, status: "Active",       color: "#0F52BA", initials: "AK" },
  { name: "Noura Al-Mansouri", plan: "Mentorship · Breakthrough", lastActive: "34m ago", points: 3890, streak: 12, status: "Active",   color: "#4FB7A6", initials: "NA" },
  { name: "Omar Farouk",     plan: "Mentorship · Foundations",    lastActive: "2h ago", points: 1980, streak: 5,  status: "Active",    color: "#E8B24C", initials: "OF" },
  { name: "Yasmine Bakr",    plan: "Management · Advanced (DAMAC)", lastActive: "1d ago", points: 5320, streak: 21, status: "Active",  color: "#B79BED", initials: "YB" },
  { name: "Khalid Hassan",   plan: "Mentorship · Breakthrough",   lastActive: "3d ago", points: 2440, streak: 0,  status: "Idle",      color: "#FF6B6B", initials: "KH" },
  { name: "Fatima Al-Riyami", plan: "Management · Essentials (Chalhoub)", lastActive: "5h ago", points: 1210, streak: 3,  status: "Active", color: "#5BC0DE", initials: "FA" },
  { name: "Tariq Saleh",     plan: "Mentorship · Foundations",    lastActive: "9d ago", points: 540,  streak: 0,  status: "At risk",   color: "#8B8FA3", initials: "TS" },
  { name: "Lina Haddad",     plan: "Management · Advanced (RTA)", lastActive: "6h ago", points: 6110, streak: 28, status: "Top performer", color: "#D76C82", initials: "LH" },
];

// ---------- Icons (inline SVG) ----------
function Icon({name, size=18, stroke=1.8, style, className}) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round",
    style, className };
  switch(name) {
    case "dashboard": return (<svg {...p}><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>);
    case "tasks": return (<svg {...p}><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="4" cy="18" r="1.5"/></svg>);
    case "sessions": return (<svg {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>);
    case "resources": return (<svg {...p}><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z"/></svg>);
    case "chat": return (<svg {...p}><path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z"/></svg>);
    case "profile": return (<svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/></svg>);
    case "admin": return (<svg {...p}><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z"/></svg>);
    case "bell": return (<svg {...p}><path d="M6 8a6 6 0 0 1 12 0v5l2 3H4l2-3V8z"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>);
    case "search": return (<svg {...p}><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>);
    case "flame": return (<svg {...p}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>);
    case "play": return (<svg {...p}><polygon points="7 4 20 12 7 20 7 4" fill="currentColor" stroke="none"/></svg>);
    case "pause": return (<svg {...p}><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/></svg>);
    case "arrow-right": return (<svg {...p}><path d="M5 12h14M13 5l7 7-7 7"/></svg>);
    case "check": return (<svg {...p} strokeWidth="2.4"><path d="M5 12l5 5L20 7"/></svg>);
    case "plus": return (<svg {...p}><path d="M12 5v14M5 12h14"/></svg>);
    case "sun": return (<svg {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg>);
    case "moon": return (<svg {...p}><path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z"/></svg>);
    case "settings": return (<svg {...p}><circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>);
    case "grid": return (<svg {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>);
    case "list": return (<svg {...p}><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>);
    case "folder": return (<svg {...p}><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z"/></svg>);
    case "doc": return (<svg {...p}><path d="M7 3h8l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/></svg>);
    case "video": return (<svg {...p}><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/></svg>);
    case "link": return (<svg {...p}><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>);
    case "send": return (<svg {...p}><path d="M4 20l16-8-16-8 2 8-2 8z"/></svg>);
    case "pin": return (<svg {...p}><path d="M12 2l-2 6H6l4 4-4 8 6-4 6 4-4-8 4-4h-4l-2-6z"/></svg>);
    case "edit": return (<svg {...p}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>);
    case "chevron-right": return (<svg {...p}><path d="M9 6l6 6-6 6"/></svg>);
    case "chevron-down": return (<svg {...p}><path d="M6 9l6 6 6-6"/></svg>);
    case "trophy": return (<svg {...p}><path d="M8 4h8v4a4 4 0 0 1-8 0V4z"/><path d="M4 5h4v3a2 2 0 0 1-4 0V5zM16 5h4v3a2 2 0 0 1-4 0V5zM9 14h6v3l1 4H8l1-4v-3z"/></svg>);
    case "star": return (<svg {...p}><path d="M12 3l2.6 6 6.4.5-4.8 4.3 1.4 6.2L12 16.8 6.4 20l1.4-6.2L3 9.5l6.4-.5L12 3z"/></svg>);
    case "users": return (<svg {...p}><circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.5"/><path d="M2 20c.8-3.5 3.8-5 7-5s6.2 1.5 7 5M15 15c2.5.2 4.4 1.5 5 5"/></svg>);
    case "chart": return (<svg {...p}><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></svg>);
    case "logout": return (<svg {...p}><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l-5-5 5-5M5 12h10"/></svg>);
    case "external": return (<svg {...p}><path d="M7 17L17 7M9 7h8v8"/></svg>);
    case "clock": return (<svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>);
    case "target": return (<svg {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>);
    case "roadmap": return (<svg {...p}><path d="M9 5 4 7v12l5-2 6 2 5-2V5l-5 2-6-2z"/><path d="M9 5v12M15 7v12"/></svg>);
    case "sliders": return (<svg {...p}><path d="M4 6h8M16 6h4M4 12h12M4 18h4M12 18h8"/><circle cx="14" cy="6" r="2"/><circle cx="18" cy="12" r="2"/><circle cx="10" cy="18" r="2"/></svg>);
    case "lock": return (<svg {...p}><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>);
    case "trash": return (<svg {...p}><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/></svg>);
    case "radar": return (<svg {...p}><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14"/></svg>);
    default: return (<svg {...p}><circle cx="12" cy="12" r="9"/></svg>);
  }
}

// exports
Object.assign(window, { Icon, SUBJECTS, MEMBER, LEVELS, XP_TIERS, xpTier, TASKS, GOALS, RESOURCES, CHANNELS, CHAT_MESSAGES, ADMIN_MEMBERS });
