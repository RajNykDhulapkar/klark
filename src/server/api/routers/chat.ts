import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  BytesOutputParser,
  StringOutputParser,
} from "langchain/schema/output_parser";
import { RunnableLambda, RunnableSequence } from "langchain/schema/runnable";
import { observable } from "@trpc/server/observable";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "~/server/db";
import { chatTable, messageTable } from "~/server/db/schema";
import { TRPCError } from "@trpc/server";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { env } from "~/env";
import { ChatPromptTemplate } from "langchain/prompts";
import { nanoid } from "~/lib/utils";
import { type LLMResult } from "node_modules/langchain/dist/schema";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Chroma } from "langchain/vectorstores/chroma";

interface ChainInput {
  question: string;
}

interface ChainOutput {
  context: string;
  question: string;
  chat_history: string;
}

const QA_TEMPLATE = `You are a document analysis assistant that helps users understand and extract insights from their uploaded documents.
Use the following context from the uploaded documents to answer the question. If unsure, say you don't know.
Context: {context}
Chat History: {chat_history}
Question: {question}
Answer:`;

const CONDENSE_TEMPLATE = `Given the conversation and follow up question, rephrase it as a standalone question about the uploaded documents.
Chat History: {chat_history}
Follow Up Question: {question}
Standalone question:`;

const model = new ChatOpenAI({
  modelName: env.OPEN_AI_MODEL,
  openAIApiKey: env.OPENAI_API_KEY,
  verbose: env.OPENAI_VERBOSE === "true",
  streaming: true,
});

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: env.OPENAI_API_KEY,
});

const condensePrompt = ChatPromptTemplate.fromTemplate(CONDENSE_TEMPLATE);
const qaPrompt = ChatPromptTemplate.fromTemplate(QA_TEMPLATE);

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
    .subscription(async ({ ctx, input }) => {
      const vectorStore = new Chroma(embeddings, {
        url: env.CHROMA_URL,
        collectionName: "documents",
      });

      const userId = ctx.user.id;
      const chatId = input.chatId ?? nanoid();
      console.log(`🚀 chatId: ${chatId}, userId: ${userId}`);

      // Create/update chat if needed
      const title = input.messages[0]?.content.slice(0, 100) ?? "New Chat";
      const path = `/chat/${chatId}`;
      const createdAt = new Date();

      // Check if chat exists
      const existingChat = await db.query.chatTable.findFirst({
        where: eq(chatTable.id, chatId),
      });

      if (!existingChat) {
        // Create new chat
        await db.insert(chatTable).values({
          id: chatId,
          userId,
          title,
          metadata: { sharePath: path },
          createdAt,
          updatedAt: createdAt,
        });
      }

      return observable<string>((emit) => {
        let stream: Awaited<ReturnType<typeof chain.stream>> | null = null;
        let abort = false;

        const handleError = (error: unknown) => {
          console.error("Error in chat stream:", error);
          emit.next(
            "An error occurred while processing your request. Please try again.",
          );
          emit.next("__END__END__");
          emit.complete();
        };

        const lastMessage = input.messages.at(-1);

        if (!lastMessage || lastMessage.role !== "user") {
          handleError(new Error("Invalid message format"));
          return () => {
            abort = true;
          };
        }

        const outputParser = new BytesOutputParser();

        const retriever = vectorStore.asRetriever({
          k: 4,
          filter: {
            $and: [{ chatId: { $eq: chatId } }, { userId: { $eq: userId } }],
          },
        });

        const chain = RunnableSequence.from([
          new RunnableLambda<ChainInput, ChainOutput>({
            func: async (input: ChainInput): Promise<ChainOutput> => {
              try {
                const messages = await db.query.messageTable.findMany({
                  where: eq(messageTable.chatId, chatId),
                  orderBy: (messages, { desc }) => [desc(messages.createdAt)],
                  limit: Number(env.LAST_K_CHAT_HISTORY),
                });

                const chat_history = messages
                  .reverse()
                  .map(
                    (m) =>
                      `${m.role === "user" ? "Human" : "Assistant"}: ${m.content}`,
                  )
                  .join("\n");

                // First get the standalone question
                const standaloneQuestion = await RunnableSequence.from([
                  condensePrompt,
                  model,
                  new StringOutputParser(),
                ]).invoke({
                  chat_history,
                  question: input.question,
                });

                // Then get relevant documents
                const docs =
                  await retriever.getRelevantDocuments(standaloneQuestion);
                const context =
                  docs.length > 0
                    ? docs.map((d) => d.pageContent).join("\n\n")
                    : "No relevant documents found. Please upload a document first or try a different question.";

                return {
                  context,
                  question: standaloneQuestion,
                  chat_history,
                };
              } catch (error) {
                console.error("Error in chain:", error);
                if (error instanceof Error) {
                  throw error;
                }
                throw new Error(
                  "An error occurred while processing your request.",
                );
              }
            },
          }),
          qaPrompt,
          model,
          outputParser,
        ]);

        const userQn = lastMessage.content;

        db.insert(messageTable)
          .values({
            id: nanoid(),
            chatId,
            role: lastMessage.role,
            content: userQn,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .then(() =>
            chain.stream(
              {
                question: userQn,
              },
              {
                callbacks: [
                  {
                    handleLLMEnd: async (output: LLMResult) => {
                      try {
                        const LLMOutput =
                          output?.generations?.[0]?.[0]?.text ?? "";

                        await db.insert(messageTable).values({
                          id: nanoid(),
                          chatId,
                          role: "assistant",
                          content: LLMOutput,
                          createdAt: new Date(),
                          updatedAt: new Date(),
                        });

                        await db
                          .update(chatTable)
                          .set({ updatedAt: new Date() })
                          .where(eq(chatTable.id, chatId));
                      } catch (error) {
                        console.error("Error saving messages:", error);
                      }
                    },
                  },
                ],
              },
            ),
          )
          .then((s) => {
            stream = s;
            if (!stream[Symbol.asyncIterator]) {
              throw new Error("Stream is not iterable");
            }

            void (async () => {
              try {
                for await (const chunk of stream) {
                  if (abort) break;
                  emit.next(new TextDecoder().decode(chunk));
                }
                emit.next("__END__END__");
                emit.complete();
              } catch (error) {
                emit.error(error);
              }
            })();
          })
          .catch((error) => {
            handleError(error);
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
