import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { BytesOutputParser } from "langchain/schema/output_parser";
import { RunnableSequence } from "langchain/schema/runnable";
import { observable } from "@trpc/server/observable";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "~/server/db";
import { chatTable, messageTable } from "~/server/db/schema";
import { TRPCError } from "@trpc/server";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { env } from "~/env";
import {
  AIMessagePromptTemplate,
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
} from "langchain/prompts";

const model = new ChatOpenAI({
  modelName: env.OPEN_AI_MODEL,
  openAIApiKey: env.OPENAI_API_KEY,
  verbose: env.OPENAI_VERBOSE === "true",
  streaming: true,
});

const combineDocumentsPromptTemplate = ChatPromptTemplate.fromMessages([
  AIMessagePromptTemplate.fromTemplate(
    `You are a digital marketing manager, strictly talk only about marketing content. Otherwise respond with 'I am a marketing chatbot, i do not have answer to your question.
    Use the following pieces of chat_history to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.`,
  ),
  new MessagesPlaceholder("chat_history"),
  HumanMessagePromptTemplate.fromTemplate("Question: {question}"),
]);

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

  remove: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const chat = await db.query.chatTable.findFirst({
        where: and(eq(chatTable.id, input), eq(chatTable.userId, ctx.user.id)),
      });

      if (!chat) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await db
        .delete(chatTable)
        .where(and(eq(chatTable.id, input), eq(chatTable.userId, ctx.user.id)));

      return { success: true };
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

  clearChats: protectedProcedure.mutation(async ({ ctx }) => {
    const chats = await db.query.chatTable.findMany({
      where: eq(chatTable.userId, ctx.user.id),
    });

    if (!chats.length) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    await db.delete(messageTable).where(
      inArray(
        messageTable.chatId,
        chats.map((chat) => chat.id),
      ),
    );

    await db.delete(chatTable).where(eq(chatTable.userId, ctx.user.id));

    return { success: true };
  }),

  timeStream: protectedProcedure
    .input(
      z.object({
        interval: z.number().default(10000), // 100,00 ms = 10 seconds
      }),
    )
    .subscription(async ({ input }) => {
      return observable<{ timestamp: string }>((emit) => {
        const timer = setInterval(() => {
          emit.next({ timestamp: new Date().toISOString() });
        }, input.interval);

        return () => {
          clearInterval(timer);
          console.log("Client disconnected from timeStream");
        };
      });
    }),

  chatStream: protectedProcedure
    .input(
      z.object({
        messages: z.array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          }),
        ),
        chatId: z.string().optional(),
      }),
    )
    .subscription(async ({ input }) => {
      console.log("🚀 ~ file: chat.ts ~ line 158 ~ input", input);
      return observable<string>((emit) => {
        const lastMessage = input.messages.at(-1);

        if (!lastMessage || lastMessage.role !== "user") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid message format",
          });
        }

        const outputParser = new BytesOutputParser();

        const chain = RunnableSequence.from([
          {
            question: (input: { question: string }) => input.question,
            chat_history: async () => {
              return [];
            },
          },
          combineDocumentsPromptTemplate,
          model,
          outputParser,
        ]);

        const userQn = lastMessage.content;
        console.log("🚀 user qn:", userQn);

        let stream: Awaited<ReturnType<typeof chain.stream>> | null = null;
        let abort = false;

        chain
          .stream(
            {
              question: userQn,
            },
            {
              callbacks: [
                // Callback to save chat history
              ],
            },
          )
          .then((s) => {
            stream = s;

            if (stream[Symbol.asyncIterator]) {
              void (async () => {
                try {
                  for await (const chunk of stream) {
                    if (abort) break;
                    const decodedChunk = new TextDecoder().decode(chunk);
                    emit.next(decodedChunk);
                  }
                  emit.next("__END__END__");
                  emit.complete();
                } catch (error) {
                  emit.error(error);
                }
              })();
            } else {
              emit.error(new Error("Stream is not iterable"));
            }
          })
          .catch((error) => {
            emit.error(error);
          });

        return () => {
          abort = true;
          if (stream) {
            void stream.return();
          }
          console.log("Client disconnected from chatStream");
        };
      });
    }),
});
