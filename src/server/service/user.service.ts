import "server-only";
import { db, type Transaction } from "../db";
import { type InterestedUser, interestedUserTable } from "../db/schema";
import { z } from "zod";
import { eq } from "drizzle-orm";

const InterestedUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

type CreateInterestedUserInput = z.infer<typeof InterestedUserSchema>;

export async function createInterestedUser(
  input: CreateInterestedUserInput,
  tx: Transaction = db,
): Promise<void> {
  // Validate input
  const validatedData = InterestedUserSchema.parse(input);

  await tx.insert(interestedUserTable).values({
    ...validatedData,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function getInterestedUser(
  email: string,
  tx: Transaction = db,
): Promise<InterestedUser | null> {
  const result = await tx
    .select()
    .from(interestedUserTable)
    .where(eq(interestedUserTable.email, email))
    .limit(1);

  return result[0] ?? null;
}
