/**
 * The API mixes DateTime kinds: computed values (EtaUtc) serialize WITH a trailing 'Z',
 * DB-read values (WindowEndUtc, DeliveredAtUtc) serialize WITHOUT it. Normalize before
 * the date pipe — blindly appending 'Z' produced invalid dates (NG02100).
 */
export function utc(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.endsWith('Z') ? value : `${value}Z`;
}
