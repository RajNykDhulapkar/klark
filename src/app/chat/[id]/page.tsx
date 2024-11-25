import { type Message } from "ai";
import { type Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Chat } from "~/components/chat";
import { api } from "~/trpc/server";

export interface ChatPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({
  params,
}: ChatPageProps): Promise<Metadata> {
  const user = await api.auth.user();

  if (!user) {
    return {};
  }

  const chat = await api.chat.byId(params.id);

  return {
    title: chat?.title.toString().slice(0, 50) ?? "Chat",
  };
}

export default async function ChatPage({ params }: ChatPageProps) {
  const user = await api.auth.user();

  if (!user) {
    redirect(`/auth/login?next=/chat/${params.id}`);
  }

  const chat = await api.chat.byId(params.id);

  if (!chat) {
    notFound();
  }

  if (chat?.userId !== user?.id) {
    notFound();
  }

  const messages: Message[] = chat.messages.map((msg) => ({
    id: msg.id,
    role: msg.role === "user" ? "user" : "assistant",
    content: msg.content,
  }));

  return <Chat id={chat.id} initialMessages={messages} />;
}
