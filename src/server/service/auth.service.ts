import { db, type Transaction } from "../db";
import {
  updateUserSchema,
  userTable,
  verificationTokenTable,
  type User,
} from "../db/schema";
import { and, eq } from "drizzle-orm";
import { generateIdFromEntropySize } from "lucia";
import { lucia } from "~/lib/auth";
import { type ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { type z } from "zod";

type UserUpdate = z.infer<typeof updateUserSchema>;

export function generateSalt(length = 16) {
  return crypto.getRandomValues(new Uint8Array(length));
}

// Constant-time comparison function
function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function hashPassword(
  password: string,
  salt: Uint8Array,
): Promise<string> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);

  const combined = new Uint8Array(salt.length + passwordData.length);
  combined.set(salt);
  combined.set(passwordData, salt.length);

  let hash = combined;
  for (let i = 0; i < 100_000; i++) {
    const newHash = await crypto.subtle.digest("SHA-256", hash);
    hash = new Uint8Array(newHash);
  }

  const hashArray = Array.from(new Uint8Array(hash));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return saltHex + hashHex;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const saltHex = storedHash.slice(0, 32);
  const salt = new Uint8Array(
    saltHex.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) ?? [],
  );

  const newHash = await hashPassword(password, salt);
  return timingSafeEqual(newHash, storedHash);
}

export async function getUserById(
  userId: string,
  tx: Transaction = db,
): Promise<User | null> {
  const users = await tx
    .select()
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  return users[0] ?? null;
}

export async function getUserByEmail(
  email: string,
  tx: Transaction = db,
): Promise<User | null> {
  const users = await tx
    .select()
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1);

  return users[0] ?? null;
}

export async function getUserByStripeCustomerId(
  customerId: string,
  tx: Transaction = db,
): Promise<User | null> {
  const users = await tx
    .select()
    .from(userTable)
    .where(eq(userTable.stripeCustomerId, customerId))
    .limit(1);

  return users[0] ?? null;
}

export async function createUser(
  user: {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    isGuest?: boolean;
  },
  tx: Transaction = db,
): Promise<void> {
  await tx.insert(userTable).values({
    ...user,
    verified: user.isGuest ?? false,
    isGuest: user.isGuest ?? false,
  });
}

export async function createVerificationToken(
  userId: string,
  tx: Transaction = db,
): Promise<string> {
  const token = generateIdFromEntropySize(16);
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + 24);

  await tx.insert(verificationTokenTable).values({
    userId,
    token,
    expiresAt: expiryDate,
  });

  return token;
}

export async function findVerificationToken(
  { userId, token }: { userId: string; token: string },
  tx: Transaction = db,
) {
  const existingTokens = await tx
    .select()
    .from(verificationTokenTable)
    .where(
      and(
        eq(verificationTokenTable.userId, userId),
        eq(verificationTokenTable.token, token),
      ),
    );

  return existingTokens[0] ?? null;
}

export async function deleteVerificationToken(
  { userId, token }: { userId: string; token: string },
  tx: Transaction = db,
): Promise<void> {
  await tx
    .delete(verificationTokenTable)
    .where(
      and(
        eq(verificationTokenTable.userId, userId),
        eq(verificationTokenTable.token, token),
      ),
    );
}

export async function createSession({
  userId,
  user,
  cookieStore,
}: {
  userId: string;
  user: { email: string; name: string };
  cookieStore: ReadonlyRequestCookies;
}): Promise<void> {
  const session = await lucia.createSession(userId, user);
  const sessionCookie = lucia.createSessionCookie(session.id);
  cookieStore.set(sessionCookie);
}

export async function updateUser(
  userId: string,
  userData: UserUpdate,
  tx: Transaction = db,
): Promise<void> {
  const validatedData = updateUserSchema.parse(userData);
  await tx.update(userTable).set(validatedData).where(eq(userTable.id, userId));
}

export type { User, UserUpdate };
