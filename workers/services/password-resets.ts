import { eq } from 'drizzle-orm';
import type { AppDatabase } from '../database/app-database';
import { passwordResets } from '../database/password-resets';
import { users } from '../database/users';
import {
  hashPassword,
  passwordIsStrong,
  WEAK_PASSWORD_MESSAGE,
} from '../utils/password.server';

const RESET_MS = 1000 * 60 * 30;
export const RESET_MESSAGE =
  'If an account exists for that email, a reset link is ready. It expires in 30 minutes.';

export default class PasswordResetService {
  constructor(private db: AppDatabase) {}

  async request(email: string): Promise<{ message: string; devToken: string | null }> {
    const normalized = email.trim().toLowerCase();
    const user = await this.db.select().from(users).where(eq(users.email, normalized)).get();
    if (!user) {
      return { message: RESET_MESSAGE, devToken: null };
    }

    const token = randomToken();
    await this.db.insert(passwordResets).values({
      tokenHash: await sha256(token),
      userId: user.id,
      expiresAt: Date.now() + RESET_MS,
      createdAt: Date.now(),
    });

    return { message: RESET_MESSAGE, devToken: token };
  }

  async reset(token: string, password: string): Promise<{ userId: number } | { error: string }> {
    if (!passwordIsStrong(password)) {
      return { error: WEAK_PASSWORD_MESSAGE };
    }

    const row = await this.db
      .select()
      .from(passwordResets)
      .where(eq(passwordResets.tokenHash, await sha256(token)))
      .get();

    if (!row || row.usedAt || row.expiresAt <= Date.now() || !row.userId) {
      return { error: 'This reset link is no longer valid.' };
    }

    await this.db
      .update(users)
      .set({ passwordHash: await hashPassword(password), updatedAt: Date.now() })
      .where(eq(users.id, row.userId));

    await this.db
      .update(passwordResets)
      .set({ usedAt: Date.now() })
      .where(eq(passwordResets.id, row.id));

    return { userId: row.userId };
  }
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
