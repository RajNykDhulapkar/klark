"use client";

import { type Message } from "ai/react";

import { cn, nanoid } from "~/lib/utils";
import { ChatList } from "~/components/chat-list";
import { ChatPanel } from "~/components/chat-panel";
import { EmptyScreen } from "~/components/empty-screen";
import { ChatScrollAnchor } from "~/components/chat-scroll-anchor";
import { useCallback, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { skipToken } from "@tanstack/react-query";

export interface ChatProps extends React.ComponentProps<"div"> {
  initialMessages?: Message[];
  id?: string;
}

export function Chat({ id, initialMessages, className }: ChatProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? []);

  const messagesForSub = useRef<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);

  const [activeSubscriptionId, setActiveSubscriptionId] = useState<
    string | null
  >(null);

  const stop = useCallback(() => {
    setActiveSubscriptionId(null);
    setIsLoading(false);
  }, []);

  const append = useCallback(
    (message: Message) => {
      messagesForSub.current = [...messages, message].map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

      setActiveSubscriptionId(nanoid());
      setMessages((prev) => [...prev, message]);
      setIsLoading(true);
    },
    [messages],
  );

  const reload = useCallback(() => {
    messagesForSub.current = messages.slice(0, -1).map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));
    setActiveSubscriptionId(nanoid());
    setMessages((prev) => prev.slice(0, -1));
    setIsLoading(true);
  }, [messages]);

  api.chat.chatStream.useSubscription(
    activeSubscriptionId
      ? {
          chatId: id,
          messages: messagesForSub.current,
        }
      : skipToken,
    {
      onStarted: () => {
        const assistantMessage = {
          id: nanoid(),
          role: "assistant" as const,
          content: "",
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      },
      onData: (chunk) => {
        if (chunk === "__END__END__") {
          setActiveSubscriptionId(null);
          setIsLoading(false);
          return;
        }

        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.role === "assistant") {
            return [
              ...prev.slice(0, -1),
              { ...lastMessage, content: lastMessage.content + chunk },
            ];
          }
          return prev;
        });
      },
      onError: () => {
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.role === "assistant") {
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                content: "Sorry, there was an error generating the response.",
              },
            ];
          }
          return prev;
        });
        setActiveSubscriptionId(null);
        setIsLoading(false);
      },
    },
  );

  return (
    <>
      <div className={cn("pb-[200px] pt-4 md:pt-10", className)}>
        {messages.length ? (
          <>
            <ChatList messages={messages} />
            <ChatScrollAnchor trackVisibility={isLoading} />
          </>
        ) : (
          <EmptyScreen setInput={setInput} />
        )}
      </div>
      <ChatPanel
        isLoading={isLoading}
        stop={stop}
        append={append}
        reload={reload}
        messages={messages}
        input={input}
        setInput={setInput}
      />
    </>
  );
}
