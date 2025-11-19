import { drizzle } from 'drizzle-orm/d1';
import { users } from 'workers/database';
import { hashPassword } from 'workers/utils/password.server';

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    const db = drizzle(env.DB as D1Database);
    const hash = await hashPassword('admin123');

    await db.insert(users).values({
      email: 'admin@gmail.com',
      passwordHash: hash,
      role: 'admin',
    });

    return new Response('Admin seeded');
  },
};
