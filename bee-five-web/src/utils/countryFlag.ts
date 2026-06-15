export function countryCodeToFlagEmoji(code: string): string {
  const cc = code.trim().toUpperCase();
  if (cc.length !== 2 || !/^[A-Z]{2}$/.test(cc)) return '';
  const base = 0x1f1e6;
  return String.fromCodePoint(
    ...[...cc].map((c) => base + c.charCodeAt(0) - 65),
  );
}

export function usernameWithFlag(username: string, countryCode?: string | null): string {
  const flag = countryCode ? countryCodeToFlagEmoji(countryCode) : '';
  return flag ? `${flag} ${username}` : username;
}
