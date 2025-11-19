import { createCookie } from 'react-router';

export const authCookie = createCookie('auth_token', {
  httpOnly: true,
  sameSite: 'lax',
  secure: true,
  path: '/',
  maxAge: 60 * 60 * 24, // 1 day
});
