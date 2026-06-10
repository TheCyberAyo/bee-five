export const INTERNAL_EMAIL_DOMAIN = 'beefive.app';

export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 10;

const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(raw: string): string | null {
  const value = raw.trim();
  if (!value) {
    return 'Please enter a username';
  }
  if (value.length < MIN_USERNAME_LENGTH) {
    return `Username must be at least ${MIN_USERNAME_LENGTH} characters`;
  }
  if (value.length > MAX_USERNAME_LENGTH) {
    return `Username must be at most ${MAX_USERNAME_LENGTH} characters`;
  }
  if (!USERNAME_REGEX.test(value)) {
    return 'Username can only contain letters, numbers, underscores, and hyphens';
  }
  return null;
}

export function internalEmailFromUsername(username: string): string {
  return `${normalizeUsername(username)}@${INTERNAL_EMAIL_DOMAIN}`;
}
