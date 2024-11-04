import "server-only";
import { db, type Transaction } from "../db";
import { interestedUserTable } from "../db/schema";

export const runtime = "edge";

export async function createInterestedUser(
  {
    email,
    name,
  }: {
    email: string;
    name: string;
  },
  tx: Transaction = db,
) {
  const interestedUser = await tx
    .insert(interestedUserTable)
    .values({ email, name })
    .execute();

  return interestedUser;
}
