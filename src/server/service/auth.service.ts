// import { hash, verify } from "@node-rs/argon2";
import { db, type Transaction } from "../db";
import { userTable, verificationTokenTable } from "../db/schema";
import { and, eq } from "drizzle-orm";
import { generateIdFromEntropySize } from "lucia";
import { lucia } from "~/lib/auth";
import { type ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
// import Crypto from "node:crypto";

// const crypto = Crypto.webcrypto;

export const runtime = "edge";

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

// Function to hash a password
export async function hashPassword(password: string, salt: Uint8Array) {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);

  // Combine salt and password
  const combined = new Uint8Array(salt.length + passwordData.length);
  combined.set(salt);
  combined.set(passwordData, salt.length);

  // Use SHA-256 with multiple iterations
  let hash = combined;
  for (let i = 0; i < 100_000; i++) {
    const newHash = await crypto.subtle.digest("SHA-256", hash);
    hash = newHash as Uint8Array;
  }

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hash));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Combine salt and hash
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return saltHex + hashHex;
}

// Function to verify a password
export async function verifyPassword(password: string, storedHash: string) {
  // Extract salt and hash
  const saltHex = storedHash.slice(0, 32); // 16 bytes * 2 chars per byte
  const salt = new Uint8Array(
    saltHex.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) ?? [],
  );

  // Hash the input password
  const newHash = await hashPassword(password, salt);

  // Compare in constant time
  return timingSafeEqual(newHash, storedHash);
}

// async function demo() {
//   const password = 'mySecurePassword123';

//   // Hashing
//   const salt = generateSalt();
//   const hashedPassword = await hashPassword(password, salt);
//   console.log('Hashed password:', hashedPassword);

//   // Verifying
//   const isValid = await verifyPassword(password, hashedPassword);
//   console.log('Password is valid:', isValid);
// }

export async function getUserById(userId: string, tx: Transaction = db) {
  const users = await tx
    .select()
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  if (!users?.length || !users[0]) {
    return null;
  }

  return users[0];
}

export async function getUserByEmail(email: string, tx: Transaction = db) {
  const users = await tx
    .select()
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1);

  if (!users?.length || !users[0]) {
    return null;
  }

  return users[0];
}

export async function getUserByStripeCustomerId(
  customerId: string,
  tx: Transaction = db,
) {
  const users = await tx
    .select()
    .from(userTable)
    .where(eq(userTable.stripeCustomerId, customerId))
    .limit(1);

  if (!users?.length || !users[0]) {
    return null;
  }

  return users[0];
}

export async function createUser(
  user: {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
  },
  tx: Transaction = db,
) {
  const newUser = await tx
    .insert(userTable)
    .values({ ...user, verified: false })
    .execute();

  return newUser;
}

export async function createVerificationToken(
  userId: string,
  tx: Transaction = db,
) {
  const token = generateIdFromEntropySize(16); // 32 characters long

  await tx.insert(verificationTokenTable).values({
    userId: userId,
    token,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24, // 24 hours
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

  if (!existingTokens?.length || !existingTokens[0]) {
    return null;
  }

  return existingTokens[0];
}

export async function deleteVerificationToken(
  { userId, token }: { userId: string; token: string },
  tx: Transaction = db,
) {
  await tx
    .delete(verificationTokenTable)
    .where(
      and(
        eq(verificationTokenTable.userId, userId),
        eq(verificationTokenTable.token, token),
      ),
    )
    .execute();
}

export async function createSession({
  userId,
  user,
  cookieStore,
}: {
  userId: string;
  user: { email: string; name: string };
  cookieStore: ReadonlyRequestCookies;
}) {
  const session = await lucia.createSession(userId, user);
  const sessionCookie = lucia.createSessionCookie(session.id);

  cookieStore.set(sessionCookie);
}

export async function updateUser(
  userId: string,
  user: {
    email?: string;
    passwordHash?: string;
    name?: string;
    verified?: boolean;
    stripeCustomerId?: string;
  },
  tx: Transaction = db,
) {
  return tx.update(userTable).set(user).where(eq(userTable.id, userId));
}
