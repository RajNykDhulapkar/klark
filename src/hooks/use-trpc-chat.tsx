import { useState, useCallback, useRef } from "react";
import { api } from "~/trpc/react";
import { skipToken } from "@tanstack/react-query";
import { type Message } from "ai/react";
import { nanoid } from "~/lib/utils";
import { usePathname, useRouter } from "next/navigation";

export function useTRPCChat({
  id,
  initialMessages = [],
}: {
  id?: string;
  initialMessages?: Message[];
}) {
  const router = useRouter();
  const path = usePathname();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");
  const [activeSubscriptionId, setActiveSubscriptionId] = useState<
    string | null
  >(null);
  const messagesForSub = useRef<Message[]>(messages);

  const stop = useCallback(() => {
    setActiveSubscriptionId(null);
    setIsLoading(false);
  }, []);

  const append = useCallback(
    (message: Message) => {
      messagesForSub.current = [...messages, message];

      setActiveSubscriptionId(nanoid());
      setMessages((prev) => [...prev, message]);
      setIsLoading(true);
    },
    [messages],
  );

  const reload = useCallback(() => {
    messagesForSub.current = messages.slice(0, -1);
    setActiveSubscriptionId(nanoid());
    setMessages((prev) => prev.slice(0, -1));
    setIsLoading(true);
  }, [messages]);

  api.chat.chatStream.useSubscription(
    activeSubscriptionId
      ? {
          chatId: id,
          messages: [
            {
              role: messagesForSub.current[messagesForSub.current.length - 1]
                ?.role as "user" | "assistant",
              content:
                messagesForSub.current[messagesForSub.current.length - 1]
                  ?.content ?? "",
            },
          ],
        }
      : skipToken,
    {
      onStarted: () => {
        setMessages((prev) => [
          ...prev,
          {
            id: nanoid(),
            role: "assistant",
            content: "",
            createdAt: new Date(),
          },
        ]);
      },
      onData: (chunk) => {
        if (chunk === "__END__END__") {
          setActiveSubscriptionId(null);
          setIsLoading(false);

          if (!path.includes("chat")) {
            router.push(`/chat/${id}`);
          }

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

  return { messages, append, reload, stop, isLoading, input, setInput };
}
