export const DEFAULT_LOGIN_REDIRECT = '/dashboard';
const INTERNAL_ORIGIN = 'https://login.internal';

/** Accept only local paths. Invalid input is rejected, never trimmed or repaired. */
export function getSafeLoginRedirect(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048) return DEFAULT_LOGIN_REDIRECT;
  const safePrefix = (candidate: string) => /^\/[a-z0-9]/i.test(candidate)
    && !/[\\\s\u0000-\u001f\u007f]/u.test(candidate)
    && !/https?:/i.test(candidate);
  if (!safePrefix(value)) return DEFAULT_LOGIN_REDIRECT;
  try {
    // URLSearchParams already decodes once. Check remaining escaped separators,
    // controls and protocols as well, without navigating to a decoded variant.
    const decoded = decodeURIComponent(value);
    if (!safePrefix(decoded)) return DEFAULT_LOGIN_REDIRECT;
    for (const candidate of [value, decoded]) {
      const target = new URL(candidate, INTERNAL_ORIGIN);
      if (target.origin !== INTERNAL_ORIGIN || !/^\/[a-z0-9][a-z0-9/_.-]*$/i.test(target.pathname)) {
        return DEFAULT_LOGIN_REDIRECT;
      }
    }
    return value;
  } catch {
    return DEFAULT_LOGIN_REDIRECT;
  }
}
