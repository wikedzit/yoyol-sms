import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import jwt from '@tsndr/cloudflare-worker-jwt';
import {
  accessCookie,
  csrfCookie,
  refreshCookie,
  totpChallengeCookie,
} from 'workers/utils/cookies.server';
import { clientIp } from 'workers/services/sessions';

export async function loader({ request, context }: LoaderFunctionArgs) {
  return endSession(request, context, false);
}

export async function action({ request, context }: ActionFunctionArgs) {
  const form = await request.formData();
  return endSession(request, context, form.get('everywhere') === '1');
}

async function endSession(
  request: Request,
  context: LoaderFunctionArgs['context'],
  everywhere: boolean,
) {
  const token = await accessCookie.parse(request.headers.get('Cookie') || '');
  if (typeof token === 'string') {
    const payload = jwt.decode(token).payload as { id?: number; sid?: string };
    if (everywhere && typeof payload.id === 'number') {
      await context.services.sessions.revokeAll(payload.id);
      await context.services.sessions.recordAudit({
        action: 'sign_out_everywhere',
        userId: payload.id,
        ip: clientIp(request),
      });
    } else if (typeof payload.sid === 'string') {
      await context.services.sessions.revoke(payload.sid);
      await context.services.sessions.recordAudit({
        action: 'sign_out',
        userId: typeof payload.id === 'number' ? payload.id : null,
        ip: clientIp(request),
      });
    }
  }

  const headers = new Headers();
  headers.append('Set-Cookie', await accessCookie.serialize('', { maxAge: 0 }));
  headers.append('Set-Cookie', await refreshCookie.serialize('', { maxAge: 0 }));
  headers.append('Set-Cookie', await csrfCookie.serialize('', { maxAge: 0 }));
  headers.append('Set-Cookie', await totpChallengeCookie.serialize('', { maxAge: 0 }));
  return redirect('/auth/login', { headers });
}
