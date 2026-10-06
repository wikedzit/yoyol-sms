import type { AppDatabase } from '../database/app-database';
import { and, eq, gte } from 'drizzle-orm';
import z from 'zod';
import jwt from '@tsndr/cloudflare-worker-jwt';
import { roles, school, schoolMemberships, users, type SelectUser } from 'workers/database';
import { signInAttempts } from '../database/sign-in-attempts';
import {
  hashPassword,
  passwordIsStrong,
  passwordNeedsRehash,
  verifyPassword,
  WEAK_PASSWORD_MESSAGE,
} from 'workers/utils/password.server';
import { createTotpSecret, totpMatches } from '../utils/totp';
import {
  ACCOUNT_FAILURE_LIMIT,
  ADDRESS_FAILURE_LIMIT,
  isLockedOut,
  SIGN_IN_WINDOW_MS,
} from 'workers/utils/sign-in-lock';

const ACCOUNT_EXISTS_MESSAGE = 'An account with this email already exists';
const SIGNUP_FAILED_MESSAGE = 'Could not create account. Please try again.';

const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.string().default('admin'),
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export type SignUpResult =
  | { user: SelectUser }
  | { error: string };

export type AuthenticateResult =
  | { kind: 'invalid' }
  | { kind: 'locked' }
  | { kind: 'totp'; user: SelectUser }
  | { kind: 'user'; user: SelectUser; mustEnrollTotp: boolean };

export default class AuthService {
  private db: AppDatabase;
  private jwtSecret: string;

  constructor(database: AppDatabase, jwtSecret: string) {
    this.db = database;
    this.jwtSecret = jwtSecret;
  }

  async findUserById(id: number): Promise<SelectUser | null> {
    const user = await this.db.select().from(users).where(eq(users.id, id)).get();
    return user ?? null;
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
    if (!passwordIsStrong(password)) {
      return { error: WEAK_PASSWORD_MESSAGE };
    }

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

    const created = await this.findUserByEmail(normalizedEmail);
    if (!created) {
      return { error: SIGNUP_FAILED_MESSAGE };
    }

    return { user: created };
  }

  async authenticate(
    email: string,
    password: string,
    ip: string,
  ): Promise<AuthenticateResult> {
    const normalizedEmail = this.normalizeEmail(email);
    const now = Date.now();
    if (await this.isSignInLocked(normalizedEmail, ip, now)) {
      return { kind: 'locked' };
    }

    const user = await this.findUserByEmail(normalizedEmail);
    const passwordMatches = user
      ? await verifyPassword(password, user.passwordHash)
      : false;

    await this.db.insert(signInAttempts).values({
      email: normalizedEmail,
      ip,
      succeeded: passwordMatches ? 1 : 0,
      createdAt: now,
    });

    if (!user || !passwordMatches) {
      if (await this.isSignInLocked(normalizedEmail, ip, now + 1)) {
        return { kind: 'locked' };
      }
      return { kind: 'invalid' };
    }

    if (passwordNeedsRehash(user.passwordHash)) {
      await this.db
        .update(users)
        .set({ passwordHash: await hashPassword(password), updatedAt: now })
        .where(eq(users.id, user.id));
    }

    if (user.totpEnabled === 1 && user.totpSecret) {
      return { kind: 'totp', user };
    }

    return {
      kind: 'user',
      user,
      mustEnrollTotp: await this.mustEnrollTotp(user.id),
    };
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

    if (!passwordIsStrong(newPassword)) {
      return { error: WEAK_PASSWORD_MESSAGE };
    }

    const passwordHash = await hashPassword(newPassword);
    await this.db
      .update(users)
      .set({ passwordHash, updatedAt: Date.now() })
      .where(eq(users.id, id));

    return { success: true };
  }

  async issueTotpChallenge(userId: number): Promise<string> {
    return jwt.sign(
      {
        id: userId,
        purpose: 'totp',
        exp: Math.floor(Date.now() / 1000) + 60 * 5,
      },
      this.jwtSecret,
    );
  }

  async readTotpChallenge(token: string): Promise<number | null> {
    const valid = await jwt.verify(token, this.jwtSecret);
    if (!valid) return null;
    const payload = jwt.decode(token).payload as { id?: number; purpose?: string };
    if (payload.purpose !== 'totp' || typeof payload.id !== 'number') return null;
    return payload.id;
  }

  async beginTotp(userId: number): Promise<string> {
    const secret = createTotpSecret();
    await this.db
      .update(users)
      .set({ totpSecret: secret, totpEnabled: 0, updatedAt: Date.now() })
      .where(eq(users.id, userId));
    return secret;
  }

  async verifyTotp(userId: number, code: string): Promise<boolean> {
    const user = await this.db.select().from(users).where(eq(users.id, userId)).get();
    if (!user?.totpSecret || user.totpEnabled !== 1) return false;
    return totpMatches(user.totpSecret, code);
  }

  async confirmTotp(userId: number, code: string): Promise<boolean> {
    const user = await this.db.select().from(users).where(eq(users.id, userId)).get();
    if (!user?.totpSecret) return false;
    const matches = await totpMatches(user.totpSecret, code);
    if (!matches) return false;
    await this.db
      .update(users)
      .set({ totpEnabled: 1, updatedAt: Date.now() })
      .where(eq(users.id, userId));
    return true;
  }

  async setSchoolTotpPolicy(schoolId: number, required: boolean): Promise<void> {
    await this.db
      .update(school)
      .set({ requirePrivilegedTotp: required ? 1 : 0, updatedAt: Date.now() })
      .where(eq(school.id, schoolId));
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private isUniqueConstraintError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /unique/i.test(message);
  }

  async mustEnrollTotp(userId: number): Promise<boolean> {
    const user = await this.db.select().from(users).where(eq(users.id, userId)).get();
    if (!user || user.totpEnabled === 1) return false;

    const membership = await this.db
      .select({ roleKey: roles.key })
      .from(schoolMemberships)
      .innerJoin(roles, eq(roles.id, schoolMemberships.roleId))
      .innerJoin(school, eq(school.id, schoolMemberships.schoolId))
      .where(
        and(
          eq(schoolMemberships.userId, userId),
          eq(schoolMemberships.status, 'active'),
          eq(school.requirePrivilegedTotp, 1),
        ),
      );

    return membership.some((row) => row.roleKey === 'admin' || row.roleKey === 'finance');
  }

  private async isSignInLocked(email: string, ip: string, now: number): Promise<boolean> {
    const since = now - SIGN_IN_WINDOW_MS;
    const attempts = await this.db
      .select({
        email: signInAttempts.email,
        ip: signInAttempts.ip,
        createdAt: signInAttempts.createdAt,
      })
      .from(signInAttempts)
      .where(and(eq(signInAttempts.succeeded, 0), gte(signInAttempts.createdAt, since)));

    const accountTimes = attempts
      .filter((attempt) => attempt.email === email)
      .map((attempt) => attempt.createdAt);
    const addressTimes = attempts
      .filter((attempt) => attempt.ip === ip)
      .map((attempt) => attempt.createdAt);

    return (
      isLockedOut(accountTimes, now, SIGN_IN_WINDOW_MS, ACCOUNT_FAILURE_LIMIT) ||
      isLockedOut(addressTimes, now, SIGN_IN_WINDOW_MS, ADDRESS_FAILURE_LIMIT)
    );
  }
}
