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

    return this.createSessionToken(user);
  }

  async verifyToken(token: string) {
    const payload = await jwt.verify(token, this.jwtSecret);
    if (!payload) return null;

    return payload;
  }

  // Account holders with no teacher/student record (Admin, Finance) store
  // their name only on `users`. preferredLanguage and avatarUrl apply to
  // every role, since those belong to the login account itself.
  async updateProfile(
    id: number,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      preferredLanguage?: string;
      avatarUrl?: string;
    },
  ): Promise<SelectUser | null> {
    const updatedUser = await this.db
      .update(users)
      .set({ ...data, updatedAt: Date.now() })
      .where(eq(users.id, id))
      .returning()
      .get();

    return result ?? null;
  }

  async updateName(
    id: number,
    firstName: string,
    lastName: string,
  ): Promise<SelectUser | null> {
    return this.updateProfile(id, { firstName, lastName });
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
