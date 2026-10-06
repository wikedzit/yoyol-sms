const CSRF_COOKIE = 'yoyol_csrf';

if (typeof window !== 'undefined') {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const method = (init?.method || 'GET').toUpperCase();
    if (method === 'GET' || method === 'HEAD') {
      return originalFetch(input, init);
    }

    const token = readCookie(CSRF_COOKIE);
    const headers = new Headers(init?.headers);
    if (token && !headers.has('x-csrf-token')) {
      headers.set('x-csrf-token', token);
    }
    return originalFetch(input, { ...init, headers });
  };
}

function readCookie(name: string): string | null {
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}
