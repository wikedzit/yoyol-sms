import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import z from 'zod';
import jwt from '@tsndr/cloudflare-worker-jwt';
import { users } from 'workers/database';
import { verifyPassword } from 'workers/utils/password.server';
import { hashPassword } from 'workers/utils/password.server';

const CreateUserSchema = z.object({
  email: z.string().email(),
  passwordHash: z.string(),
  role: z.string().default('admin'),
});
export type CreateUserSchema = z.infer<typeof CreateUserSchema>;

export default class LoginService {
  private db: DrizzleD1Database;
  private jwtSecret: string;

  constructor(database: DrizzleD1Database, jwtSecret: string) {
    this.db = database;
    this.jwtSecret = jwtSecret;
  }

  //find user by email
  async findUserByEmail(email: string) {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .get();

    return result || null;
  }

  // CREATE USER
  async createUser(data: CreateUserSchema) {
    const validated = CreateUserSchema.parse(data);

    // hash password BEFORE saving
    const passwordHash = await hashPassword(validated.passwordHash);

    const result = await this.db
      .insert(users)
      .values({
        email: validated.email,
        role: validated.role,
        passwordHash,
      })
      .returning()
      .get();

    return result;
  }

  // LOGIN USER
  async login(email: string, password: string) {
    const user = await this.findUserByEmail(email);
    if (!user) return null;

    const match = await verifyPassword(password, user.passwordHash);
    if (!match) return null;

    // Create JWT using Web Crypto API (Cloudflare Workers compatible)
    const token = await jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      this.jwtSecret
    );

    return token;
  }

  // VERIFY TOKEN
  async verifyToken(token: string) {
    const payload = await jwt.verify(token, this.jwtSecret);
    if (!payload) return null;

    return payload;
  }
}
function sign(
  arg0: { id: number; role: string | null },
  jwtSecret: string,
  arg2: number
) {
  throw new Error('Function not implemented.');
}
