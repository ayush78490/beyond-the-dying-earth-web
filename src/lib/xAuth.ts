/**
 * "Continue with X" through Supabase Auth's X / Twitter (OAuth 2.0) provider.
 *
 *   1. startXAuth() remembers where the signup started and sends the page to X (via Supabase).
 *   2. X → Supabase → back to this page with ?code=…; supabase-js swaps it for a session.
 *   3. takeXAuthReturn() tells the dialog to reopen on the wallet stage.
 */
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { DEFAULT_CHAIN_ID, ROBINHOOD_CHAINS } from './wallet';

export interface XProfile {
  username: string;
  name?: string;
  avatar?: string;
}

export interface XSession {
  profile: XProfile;
  userId: string;
  /** text the wallet signs to prove ownership */
  message: string;
  chainId: number;
}

const PENDING_KEY = 'btde-x-pending';
const DEV_KEY = 'btde-x-dev-session';

let current: XSession | null = null;
let resolveReady: () => void;
const ready = new Promise<void>((r) => (resolveReady = r));

function toXSession(s: Session | null): XSession | null {
  if (!s) return null;
  const m = s.user.user_metadata ?? {};
  const username = m.user_name ?? m.preferred_username ?? m.name;
  if (!username) return null;
  const profile: XProfile = { username, name: m.full_name ?? m.name, avatar: m.avatar_url ?? m.picture };
  return { profile, userId: s.user.id, chainId: DEFAULT_CHAIN_ID, message: linkMessage(profile.username, s.user.id) };
}

/** The exact text the wallet signs: binds the wallet to this X account, on this chain. */
function linkMessage(username: string, userId: string) {
  const chain = ROBINHOOD_CHAINS[DEFAULT_CHAIN_ID];
  return [
    'Beyond the Dying Earth — waitlist',
    '',
    `Link this wallet to X account @${username} on ${chain.name}.`,
    '',
    `Chain ID: ${chain.id}`,
    `Account: ${userId}`,
    `Issued At: ${new Date().toISOString()}`,
  ].join('\n');
}

if (supabase) {
  supabase.auth.onAuthStateChange((event, s) => {
    current = toXSession(s);
    if (event === 'INITIAL_SESSION') resolveReady();
  });
} else {
  try {
    current = JSON.parse(sessionStorage.getItem(DEV_KEY) ?? 'null');
  } catch {
    current = null;
  }
  resolveReady!();
}

/** The signed-in pilot, if any (kept in sync with Supabase Auth). */
export function savedXSession(): XSession | null {
  return current;
}

/** Resolves once Supabase has restored the session (including one arriving in the URL). */
export function whenXAuthReady() {
  return ready;
}

export async function forgetXSession() {
  current = null;
  if (supabase) await supabase.auth.signOut();
  else sessionStorage.removeItem(DEV_KEY);
}

/** Leaves the page for X (resolves only in the simulated dev flow). */
export async function startXAuth(source: string): Promise<XSession> {
  if (!supabase) return devSession();
  sessionStorage.setItem(PENDING_KEY, source);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'x',
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
  if (error) {
    sessionStorage.removeItem(PENDING_KEY);
    throw new Error(error.message);
  }
  return new Promise(() => {}); // the page is navigating away
}

export type XReturn = { source: string; error?: string };

/** After the trip to X: where the signup started, and the error if X/Supabase reported one. */
export function takeXAuthReturn(): XReturn | null {
  let source: string | null = null;
  try {
    source = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // storage unavailable
  }
  if (!source) return null;
  const params = new URLSearchParams(window.location.search + window.location.hash.replace(/^#/, '&'));
  const err = params.get('error');
  if (err) {
    // supabase-js leaves the error params in place: tidy the address bar
    window.history.replaceState(null, '', window.location.pathname);
    return { source, error: err === 'access_denied' ? 'X sign-in was cancelled.' : 'X sign-in failed. Please try again.' };
  }
  return { source };
}

async function devSession(): Promise<XSession> {
  if (!import.meta.env.DEV) throw new Error('X sign-in is not configured yet.');
  await new Promise((r) => setTimeout(r, 1200));
  const profile = { username: 'astrion_pilot', name: 'Astrion Pilot' };
  current = { profile, userId: 'dev', chainId: DEFAULT_CHAIN_ID, message: linkMessage(profile.username, 'dev') };
  try {
    sessionStorage.setItem(DEV_KEY, JSON.stringify(current));
  } catch {
    // storage unavailable
  }
  return current;
}
