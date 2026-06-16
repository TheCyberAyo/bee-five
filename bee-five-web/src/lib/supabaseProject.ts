import { INTERNAL_EMAIL_DOMAIN } from './internalAuthEmail';

/** Project ref from NEXT_PUBLIC_SUPABASE_URL, e.g. nbyirvmueubdlsbtnrwh */
export function supabaseProjectRef(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) return null;
  const match = url.match(/^https:\/\/([^.]+)\.supabase\.co\/?$/i);
  return match?.[1] ?? null;
}

export function displayUsernameFromUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
} | null): string | null {
  if (!user) return null;
  const meta = user.user_metadata?.username;
  if (typeof meta === 'string' && meta.trim()) return meta.trim();
  const email = user.email?.trim();
  if (email?.toLowerCase().endsWith(`@${INTERNAL_EMAIL_DOMAIN}`)) {
    return email.split('@')[0];
  }
  return email ?? null;
}
