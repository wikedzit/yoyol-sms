import { createCookie } from 'react-router';

export const schoolCookie = createCookie('yoyol-school', {
  httpOnly: true,
  sameSite: 'lax',
  secure: true,
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
});

const TEN_MINUTES = 60 * 10;
const FOURTEEN_DAYS = 60 * 60 * 24 * 14;

export const accessCookie = createCookie('yoyol_access', {
  httpOnly: true,
  sameSite: 'lax',
  secure: true,
  path: '/',
  maxAge: TEN_MINUTES,
});

export const refreshCookie = createCookie('yoyol_refresh', {
  httpOnly: true,
  sameSite: 'lax',
  secure: true,
  path: '/',
  maxAge: FOURTEEN_DAYS,
});

export const csrfCookie = createCookie('yoyol_csrf', {
  httpOnly: false,
  sameSite: 'lax',
  secure: true,
  path: '/',
  maxAge: FOURTEEN_DAYS,
});

export const totpChallengeCookie = createCookie('yoyol_totp', {
  httpOnly: true,
  sameSite: 'lax',
  secure: true,
  path: '/',
  maxAge: 60 * 5,
});

export const authCookie = accessCookie;

export async function serializeSessionCookies(session: {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
}): Promise<string[]> {
  return [
    await accessCookie.serialize(session.accessToken),
    await refreshCookie.serialize(session.refreshToken),
    await csrfCookie.serialize(session.csrfToken),
  ];
}

export function appendSetCookies(headers: Headers, cookies: string[]): void {
  for (const cookie of cookies) {
    headers.append('Set-Cookie', cookie);
  }
}
