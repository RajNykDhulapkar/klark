import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { and, eq, sql } from "drizzle-orm";
import { db } from "~/server/db";
import { chatTable } from "~/server/db/schema";
import { TRPCError } from "@trpc/server";

export const chatRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.query.chatTable.findMany({
      where: eq(chatTable.userId, ctx.user.id),
      with: {
        messages: true,
      },
    });
  }),

  byId: protectedProcedure.input(z.string()).query(async ({ input }) => {
    return db.query.chatTable.findFirst({
      where: eq(chatTable.id, input),
      with: {
        messages: true,
      },
    });
  }),

  share: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const updatedChat = await db
        .update(chatTable)
        .set({
          metadata: { sharePath: `/share/${input}` },
          updatedAt: new Date(),
        })
        .where(and(eq(chatTable.id, input), eq(chatTable.userId, ctx.user.id)))
        .returning();

      if (!updatedChat || updatedChat.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return updatedChat[0];
    }),

  getShared: protectedProcedure.input(z.string()).query(async ({ input }) => {
    const chat = await db.query.chatTable.findFirst({
      where: and(
        eq(chatTable.id, input),
        sql`${chatTable.metadata}->>'sharePath' IS NOT NULL`,
      ),
      with: { messages: true },
    });

    if (!chat) throw new TRPCError({ code: "NOT_FOUND" });

    return chat;
  }),
});
