/**
 * Waitlist submission: one row per signed-in pilot in Supabase `public.waitlist`.
 * RLS only lets a user write their own row, and a database trigger fills in the X identity
 * from Supabase Auth, so only the wallet comes from the browser.
 * Without Supabase configured — local development — signups are kept in localStorage.
 */
import { supabase } from './supabase';

export interface WaitlistEntry {
  address: string;
  /** the wallet's signature over the link message (kept for later verification) */
  signature: string;
  chainId: number;
  /** where the signup started (hero, nav, journey-end) */
  source: string;
}

export async function joinWaitlist(entry: WaitlistEntry, username: string): Promise<void> {
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new Error('Your X session expired. Please continue with X again.');
    const { error } = await supabase.from('waitlist').upsert(
      {
        user_id: data.user.id,
        // overwritten by the database trigger from the auth user; sent to satisfy NOT NULL
        x_id: data.user.id,
        x_username: username,
        wallet_address: entry.address,
        chain_id: entry.chainId,
        signature: entry.signature,
        source: entry.source,
      },
      { onConflict: 'user_id' },
    );
    if (error) {
      if (error.code === '23505') throw new Error('This wallet is already linked to another X account.');
      console.error('[waitlist]', error);
      throw new Error('Transmission failed. Please try again in a moment.');
    }
    return;
  }

  await new Promise((r) => setTimeout(r, 500));
  try {
    const key = 'btde-waitlist';
    const list: { x: string; wallet: string; source: string }[] = JSON.parse(localStorage.getItem(key) ?? '[]');
    const next = list.filter((e) => e.x !== username);
    next.push({ x: username, wallet: entry.address, source: entry.source });
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // storage unavailable (private mode) — the dev fallback simply does not persist
  }
}
