import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { HydratedRouter } from 'react-router/dom';

const originalFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  const method = (init?.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD') {
    return originalFetch(input, init);
  }

  const token = readCsrfCookie();
  const headers = new Headers(init?.headers);
  if (token && !headers.has('x-csrf-token')) {
    headers.set('x-csrf-token', token);
  }
  return originalFetch(input, { ...init, headers });
};

function readCsrfCookie(): string | null {
  for (const part of document.cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === 'yoyol_csrf') return decodeURIComponent(rest.join('='));
  }
  return null;
}

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  );
});
