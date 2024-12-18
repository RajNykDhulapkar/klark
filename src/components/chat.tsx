"use client";

import { type Message } from "ai/react";

import { cn } from "~/lib/utils";
import { ChatList } from "~/components/chat-list";
import { ChatPanel } from "~/components/chat-panel";
import { EmptyScreen } from "~/components/empty-screen";
import { ChatScrollAnchor } from "~/components/chat-scroll-anchor";
import { useTRPCChat } from "~/hooks/use-trpc-chat";

export interface ChatProps extends React.ComponentProps<"div"> {
  initialMessages?: Message[];
  id: string;
}

export function Chat({ id, initialMessages, className }: ChatProps) {
  const { messages, append, reload, stop, isLoading, input, setInput } =
    useTRPCChat({
      id,
      initialMessages,
    });

  return (
    <>
      <div className={cn("pb-[200px] pt-4 md:pt-10", className)}>
        {messages.length ? (
          <>
            <ChatList messages={messages} />
            <ChatScrollAnchor trackVisibility={isLoading} />
          </>
        ) : (
          <EmptyScreen chatId={id} setInput={setInput} />
        )}
      </div>
      <ChatPanel
        chatId={id}
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
