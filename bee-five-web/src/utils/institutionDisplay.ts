/** Join code for the shared default lobby bucket (same as Dart `00BEE00`). */
export const DEFAULT_LOBBY_JOIN_CODE = '00BEE00';

/** Public label for default-lobby players in rankings and presence (matches live DB / Dart). */
export const DEFAULT_LOBBY_DISPLAY_NAME = 'Unclassified';

const LEGACY_DEFAULT_LOBBY_NAMES = new Set([
  'bee five default lobby',
  'bee-five default lobby',
]);

export function displayInstitutionName(
  name: string | null | undefined,
  joinCode?: string | null,
): string {
  const code = joinCode?.trim().toUpperCase();
  if (code === DEFAULT_LOBBY_JOIN_CODE) return DEFAULT_LOBBY_DISPLAY_NAME;

  const trimmed = name?.trim();
  if (!trimmed) return '—';
  if (LEGACY_DEFAULT_LOBBY_NAMES.has(trimmed.toLowerCase())) {
    return DEFAULT_LOBBY_DISPLAY_NAME;
  }
  return trimmed;
}

/** Institution string from realtime presence payloads. */
export function presenceInstitutionLabel(raw: string | null | undefined): string {
  const trimmed = raw?.trim();
  if (!trimmed) return '—';
  if (LEGACY_DEFAULT_LOBBY_NAMES.has(trimmed.toLowerCase())) {
    return DEFAULT_LOBBY_DISPLAY_NAME;
  }
  return trimmed;
}
