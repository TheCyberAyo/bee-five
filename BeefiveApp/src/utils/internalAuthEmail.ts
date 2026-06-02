export const INTERNAL_EMAIL_DOMAIN = 'beefive.app';

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function internalEmailFromUsername(username: string): string {
  return `${normalizeUsername(username)}@${INTERNAL_EMAIL_DOMAIN}`;
}
