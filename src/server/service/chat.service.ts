import "server-only";
import { and, eq, desc, sql } from "drizzle-orm";
import { nanoid } from "~/lib/utils";
import { db, type Transaction } from "../db";
import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  AIMessagePromptTemplate,
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
} from "langchain/prompts";
import { RunnableSequence } from "langchain/schema/runnable";
import { BytesOutputParser } from "langchain/schema/output_parser";
import { chatTable, messageTable, type Chat, type Message } from "../db/schema";
import { logger } from "~/lib/logger";
import { env } from "~/env";

const LAST_K_CHAT_HISTORY = parseInt(env.LAST_K_CHAT_HISTORY || "5", 10);

// Initialize ChatOpenAI model
const model = new ChatOpenAI({
  modelName: env.OPEN_AI_MODEL,
  openAIApiKey: env.OPENAI_API_KEY,
  verbose: env.OPENAI_VERBOSE === "true",
  streaming: true,
});

// Prompt template
const combineDocumentsPromptTemplate = ChatPromptTemplate.fromMessages([
  AIMessagePromptTemplate.fromTemplate(
    `You are a digital marketing manager, strictly talk only about marketing content. Otherwise respond with 'I am a marketing chatbot, i do not have answer to your question.
    Use the following pieces of chat_history to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.`,
  ),
  new MessagesPlaceholder("chat_history"),
  HumanMessagePromptTemplate.fromTemplate("Question: {question}"),
]);

export async function createChat(
  userId: string,
  title: string,
  metadata: Record<string, any> = {},
  tx: Transaction = db,
): Promise<Chat | undefined> {
  const [chat] = await tx
    .insert(chatTable)
    .values({
      id: nanoid(),
      userId,
      title,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return chat;
}

export async function getChatById(
  chatId: string,
  userId: string,
  tx: Transaction = db,
): Promise<Chat | null> {
  const [chat] = await tx
    .select()
    .from(chatTable)
    .where(and(eq(chatTable.id, chatId), eq(chatTable.userId, userId)));

  return chat ?? null;
}

export async function getUserChats(
  userId: string,
  tx: Transaction = db,
): Promise<Chat[]> {
  return tx
    .select()
    .from(chatTable)
    .where(eq(chatTable.userId, userId))
    .orderBy(desc(chatTable.updatedAt));
}

export async function getChatMessages(
  chatId: string,
  userId: string,
  limit: number = LAST_K_CHAT_HISTORY,
  tx: Transaction = db,
): Promise<Message[]> {
  const chat = await getChatById(chatId, userId, tx);
  if (!chat) {
    throw new Error("Chat not found or access denied");
  }

  return tx
    .select()
    .from(messageTable)
    .where(eq(messageTable.chatId, chatId))
    .orderBy(desc(messageTable.createdAt))
    .limit(limit);
}

export async function deleteChat(
  chatId: string,
  userId: string,
  tx: Transaction = db,
): Promise<void> {
  const chat = await getChatById(chatId, userId, tx);
  if (!chat) {
    throw new Error("Chat not found or access denied");
  }

  await tx.delete(chatTable).where(eq(chatTable.id, chatId));
}

export async function createMessage(
  chatId: string,
  role: string,
  content: string,
  metadata: Record<string, any> = {},
  tx: Transaction = db,
): Promise<Message> {
  const [message] = await tx
    .insert(messageTable)
    .values({
      id: nanoid(),
      chatId,
      role,
      content,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  await tx
    .update(chatTable)
    .set({ updatedAt: new Date() })
    .where(eq(chatTable.id, chatId));

  return message;
}

export async function processUserMessage(
  userId: string,
  chatId: string,
  userQuestion: string,
  tx: Transaction = db,
) {
  const chat = await getChatById(chatId, userId, tx);
  if (!chat) {
    throw new Error("Chat not found or access denied");
  }

  const outputParser = new BytesOutputParser();

  const chain = RunnableSequence.from([
    {
      question: (input: { question: string }) => input.question,
      chat_history: async () => {
        const messages = await getChatMessages(
          chatId,
          userId,
          LAST_K_CHAT_HISTORY,
          tx,
        );
        return messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));
      },
    },
    combineDocumentsPromptTemplate,
    model,
    outputParser,
  ]);

  try {
    const stream = await chain.stream(
      { question: userQuestion },
      {
        callbacks: [
          {
            handleLLMEnd: async (output: any) => {
              const LLMOutput = output.generations[0][0].text;

              // Save user message
              await createMessage(
                chatId,
                "human",
                userQuestion,
                { timestamp: Date.now() },
                tx,
              );

              // Save AI response
              await createMessage(
                chatId,
                "assistant",
                LLMOutput,
                { timestamp: Date.now(), model: env.OPEN_AI_MODEL },
                tx,
              );
            },
          },
        ],
      },
    );

    return stream;
  } catch (error) {
    logger.error({
      message: "Error processing user message",
      error,
      userId,
      chatId,
    });
    throw error;
  }
}

export async function updateChatTitle(
  chatId: string,
  userId: string,
  title: string,
  metadata: Record<string, any> = {},
  tx: Transaction = db,
): Promise<Chat> {
  const chat = await getChatById(chatId, userId, tx);
  if (!chat) {
    throw new Error("Chat not found or access denied");
  }

  const [updatedChat] = await tx
    .update(chatTable)
    .set({
      title,
      metadata: { ...chat.metadata, ...metadata },
      updatedAt: new Date(),
    })
    .where(eq(chatTable.id, chatId))
    .returning();

  return updatedChat;
}

export async function getRecentChats(
  userId: string,
  limit = 10,
  tx: Transaction = db,
): Promise<Chat[]> {
  return tx
    .select()
    .from(chatTable)
    .where(eq(chatTable.userId, userId))
    .orderBy(desc(chatTable.updatedAt))
    .limit(limit);
}

export async function searchChats(
  userId: string,
  query: string,
  tx: Transaction = db,
): Promise<Chat[]> {
  return tx
    .select()
    .from(chatTable)
    .where(
      and(
        eq(chatTable.userId, userId),
        sql`to_tsvector('english', ${chatTable.title}) @@ plainto_tsquery('english', ${query})`,
      ),
    )
    .orderBy(desc(chatTable.updatedAt));
}
