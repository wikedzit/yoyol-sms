import { createCookie } from 'react-router';
const isProd = import.meta.env.PROD;

export const authCookie = createCookie('auth_token', {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd,
  path: '/',
  maxAge: 60 * 60 * 24, // 1 day
});

export const pendingAuthCookie = createCookie('pending_auth_token', {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd,
  path: '/',
  maxAge: 60 * 5,
});
