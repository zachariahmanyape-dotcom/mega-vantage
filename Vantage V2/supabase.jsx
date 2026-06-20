// supabase.jsx — Supabase client initialization and auth helpers
// This file must be loaded FIRST in index.html, before all other scripts

const SUPABASE_URL = 'https://npsfarsblfewdclhoquo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wc2ZhcnNibGZld2RjbGhvcXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NjM4OTEsImV4cCI6MjA5NTAzOTg5MX0.RdxYHNCu8giVF1tNGe3Rdz4UmMeqJA5GeuxtMGiQ27w';

// Initialize the Supabase client and attach to window so all files can use it
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window._supabase = supabase;

// ── Auth helpers ──────────────────────────────────────────────

// Sign up a new user with email + password
async function authSignUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  });
  return { data, error };
}

// Sign in with email + password
async function authSignIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

// Sign in with magic link (passwordless email)
async function authMagicLink(email) {
  const { data, error } = await supabase.auth.signInWithOtp({ email });
  return { data, error };
}

// Sign in with Google OAuth
async function authGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  });
  return { data, error };
}

// Sign out
async function authSignOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

// Get the currently logged-in user (returns null if not logged in)
async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Fetch the profile row for a given user ID
async function getProfile(userId) {
  const { data, error } = await window._supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
}

// Export helpers to window
Object.assign(window, {
  authSignUp,
  authSignIn,
  authMagicLink,
  authGoogle,
  authSignOut,
  getCurrentUser,
  getProfile,
});
