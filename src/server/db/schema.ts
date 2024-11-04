// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql } from "drizzle-orm";
import {
  int,
  integer,
  sqliteTableCreator,
  text,
} from "drizzle-orm/sqlite-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = sqliteTableCreator((name) => `indi-starter_${name}`);

const createdAtUpdatedAt = {
  createdAt: int("created_at", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
  updatedAt: int("updated_at", { mode: "timestamp" }).$onUpdate(
    () => new Date(),
  ),
};

export const userTable = createTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  verified: int("verified", {
    mode: "boolean",
  })
    .notNull()
    .default(false),
  stripeCustomerId: text("stripe_customer_id"),
});

export const sessionTable = createTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id),
  expiresAt: integer("expires_at").notNull(),
});

export const verificationTokenTable = createTable("verification_token", {
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id),
  token: text("token").notNull(),
  expiresAt: int("expires_at").notNull(),
  ...createdAtUpdatedAt,
});

export const subscriptionTable = createTable("subscription", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id),
  priceId: text("price_id").notNull(),
  status: text("status", {
    enum: [
      "trialing",
      "active",
      "canceled",
      "incomplete",
      "incomplete_expired",
      "past_due",
      "unpaid",
      "paused",
    ],
  }).notNull(),
  customerId: text("customer_id").notNull(),
  currentPeriodStart: integer("current_period_start").notNull(),
  currentPeriodEnd: int("current_period_end").notNull(),
  credits: int("credits").notNull(),
  metadata: text("metadata", { mode: "json" }),
  ...createdAtUpdatedAt,
});

export const interestedUserTable = createTable("interested_user", {
  email: text("email").primaryKey(),
  name: text("name"),
  ...createdAtUpdatedAt,
});
