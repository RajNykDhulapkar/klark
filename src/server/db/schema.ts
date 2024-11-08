import {
  pgTable,
  text,
  timestamp,
  boolean,
  varchar,
  json,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const userTable = pgTable("klark_user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  verified: boolean("verified").notNull().default(false),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessionTable = pgTable("klark_session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id),
  expiresAt: timestamp("expires_at").notNull(),
});

export const verificationTokenTable = pgTable("klark_verification_token", {
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriptionTable = pgTable("klark_subscription", {
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
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  credits: integer("credits").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const interestedUserTable = pgTable("klark_interested_user", {
  email: varchar("email", { length: 255 }).primaryKey(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof userTable.$inferSelect;
export type Session = typeof sessionTable.$inferSelect;
export type VerificationToken = typeof verificationTokenTable.$inferSelect;
export type Subscription = typeof subscriptionTable.$inferSelect;
export type InterestedUser = typeof interestedUserTable.$inferSelect;

// Zod Schemas
export const insertUserSchema = createInsertSchema(userTable);
export const selectUserSchema = createSelectSchema(userTable);
export const updateUserSchema = createInsertSchema(userTable)
  .omit({
    id: true,
    email: true,
    createdAt: true,
  })
  .partial();
