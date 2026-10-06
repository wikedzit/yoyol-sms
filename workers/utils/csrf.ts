const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function requestNeedsCsrf(method: string): boolean {
  return UNSAFE_METHODS.has(method.toUpperCase());
}

export function csrfHeaderMatchesCookie(
  header: string | null,
  cookie: string | null,
): boolean {
  if (!header || !cookie || header.length !== cookie.length) return false;
  let mismatch = 0;
  for (let index = 0; index < header.length; index += 1) {
    mismatch |= header.charCodeAt(index) ^ cookie.charCodeAt(index);
  }
  return mismatch === 0;
}
