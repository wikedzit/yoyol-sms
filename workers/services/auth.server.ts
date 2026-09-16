import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import z from 'zod';
import jwt from '@tsndr/cloudflare-worker-jwt';
import { users, type SelectUser } from 'workers/database';
import {
  hashPassword,
  verifyPassword,
} from 'workers/utils/password.server';
import {
  createOtpAuthUri,
  createRecoveryCodes,
  createTotpSecret,
  hashRecoveryCode,
  verifyTotpCode,
} from 'workers/utils/totp.server';

const ACCOUNT_EXISTS_MESSAGE = 'An account with this email already exists';
const SIGNUP_FAILED_MESSAGE = 'Could not create account. Please try again.';

const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.string().default('admin'),
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export type SignUpResult =
  | { token: string }
  | { error: string };

export type LoginResult =
  | { token: string }
  | { twoFactorRequired: true; pendingToken: string };

export default class AuthService {
  private db: DrizzleD1Database;
  private jwtSecret: string;

  constructor(database: DrizzleD1Database, jwtSecret: string) {
    this.db = database;
    this.jwtSecret = jwtSecret;
  }

  async findUserByEmail(email: string): Promise<SelectUser | null> {
    const user = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .get();

    return user ?? null;
  }

  async createUser(data: CreateUserInput): Promise<SelectUser | undefined> {
    const input = createUserInputSchema.parse(data);
    const passwordHash = await hashPassword(input.password);

    const createdUsers = await this.db
      .insert(users)
      .values({
        email: input.email,
        role: input.role,
        passwordHash,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      .returning();

    return createdUsers[0];
  }

  async signup(email: string, password: string): Promise<SignUpResult> {
    const normalizedEmail = this.normalizeEmail(email);
    const existingAccount = await this.findUserByEmail(normalizedEmail);

    if (existingAccount) {
      return { error: ACCOUNT_EXISTS_MESSAGE };
    }

    try {
      await this.createUser({
        email: normalizedEmail,
        password,
        role: 'admin',
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        return { error: ACCOUNT_EXISTS_MESSAGE };
      }

      console.error('Signup failed:', error);
      return { error: SIGNUP_FAILED_MESSAGE };
    }

    const loginResult = await this.login(normalizedEmail, password);
    if (!loginResult || !('token' in loginResult)) {
      return { error: SIGNUP_FAILED_MESSAGE };
    }

    return { token: loginResult.token };
  }

  async login(email: string, password: string): Promise<LoginResult | null> {
    const user = await this.findUserByEmail(this.normalizeEmail(email));
    if (!user) return null;

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) return null;

    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const pendingToken = await jwt.sign(
        { purpose: 'two_factor_login', id: user.id, email: user.email },
        this.jwtSecret,
      );
      return { twoFactorRequired: true, pendingToken };
    }

    return { token: await this.finishLogin(user) };
  }

  async completeTwoFactorLogin(
    pendingToken: string,
    code: string,
  ): Promise<string | null> {
    if (!pendingToken || pendingToken.split('.').length < 2) return null;

    const validToken = await jwt.verify(pendingToken, this.jwtSecret);
    if (!validToken) return null;

    const payload = jwt.decode(pendingToken).payload as {
      purpose?: string;
      id?: number;
      email?: string;
    };
    if (payload.purpose !== 'two_factor_login' || !payload.id) return null;

    const user = await this.db.select().from(users).where(eq(users.id, payload.id)).get();
    if (!user?.twoFactorSecret) return null;

    const normalizedCode = code.replace(/\s|-/g, '').toUpperCase();
    let verified = await verifyTotpCode(user.twoFactorSecret, normalizedCode);
    if (!verified && user.twoFactorRecoveryCodes) {
      const recoveryCodes = JSON.parse(user.twoFactorRecoveryCodes) as string[];
      const codeHash = await hashRecoveryCode(normalizedCode);
      const index = recoveryCodes.indexOf(codeHash);
      if (index >= 0) {
        recoveryCodes.splice(index, 1);
        await this.db.update(users).set({
          twoFactorRecoveryCodes: JSON.stringify(recoveryCodes),
        }).where(eq(users.id, user.id));
        verified = true;
      }
    }
    if (!verified) return null;

    return this.finishLogin(user);
  }

  async beginTwoFactorSetup(id: number): Promise<{ secret: string; uri: string } | null> {
    const user = await this.db.select().from(users).where(eq(users.id, id)).get();
    if (!user) return null;
    const secret = createTotpSecret();
    await this.db.update(users).set({
      twoFactorSecret: secret,
      twoFactorEnabled: false,
      twoFactorConfirmedAt: null,
      twoFactorRecoveryCodes: null,
    }).where(eq(users.id, id));
    return { secret, uri: createOtpAuthUri(secret, user.email) };
  }

  async confirmTwoFactorSetup(
    id: number,
    code: string,
  ): Promise<{ recoveryCodes: string[] } | null> {
    const user = await this.db.select().from(users).where(eq(users.id, id)).get();
    if (!user?.twoFactorSecret || !(await verifyTotpCode(user.twoFactorSecret, code))) {
      return null;
    }

    const recoveryCodes = createRecoveryCodes();
    const hashes = await Promise.all(recoveryCodes.map(hashRecoveryCode));
    await this.db.update(users).set({
      twoFactorEnabled: true,
      twoFactorConfirmedAt: Date.now(),
      twoFactorRecoveryCodes: JSON.stringify(hashes),
    }).where(eq(users.id, id));
    return { recoveryCodes };
  }

  async disableTwoFactor(id: number, password: string): Promise<boolean> {
    const user = await this.db.select().from(users).where(eq(users.id, id)).get();
    if (!user || !(await verifyPassword(password, user.passwordHash))) return false;
    await this.db.update(users).set({
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorRecoveryCodes: null,
      twoFactorConfirmedAt: null,
    }).where(eq(users.id, id));
    return true;
  }

  private async finishLogin(user: SelectUser): Promise<string> {
    try {
      await this.db
        .update(users)
        .set({ lastLoginAt: Date.now(), updatedAt: Date.now() })
        .where(eq(users.id, user.id));
    } catch (error) {
      // Login should still succeed if this analytics column is missing.
      console.error('Could not record last login time:', error);
    }

    return this.createSessionToken(user);
  }

  async verifyToken(token: string) {
    const payload = await jwt.verify(token, this.jwtSecret);
    if (!payload) return null;

    return payload;
  }

  // UPDATE PROFILE (used for account holders with no linked teacher/
  // student record — e.g. Admin, Finance — whose only name lives on
  // `users`. preferredLanguage applies to every role, since it's a UI
  // preference tied to the login account itself.)
  async updateProfile(
    id: number,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      preferredLanguage?: string;
      avatarUrl?: string;
      jobTitle?: string;
      staffId?: string;
      bio?: string;
    }
  ) {
    const result = await this.db
      .update(users)
      .set({ ...data, updatedAt: Date.now() })
      .where(eq(users.id, id))
      .returning()
      .get();

    return result ?? null;
  }

  async changePassword(
    id: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: true } | { error: string }> {
    const user = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .get();

    if (!user) return { error: 'User not found' };

    const currentPasswordMatches = await verifyPassword(
      currentPassword,
      user.passwordHash,
    );
    if (!currentPasswordMatches) {
      return { error: 'Current password is incorrect' };
    }

    const passwordHash = await hashPassword(newPassword);
    await this.db
      .update(users)
      .set({ passwordHash, updatedAt: Date.now() })
      .where(eq(users.id, id));

    return { success: true };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private isUniqueConstraintError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /unique/i.test(message);
  }

  private async createSessionToken(user: SelectUser): Promise<string> {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      this.jwtSecret,
    );
  }
}
