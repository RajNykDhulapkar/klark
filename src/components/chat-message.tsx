// Inspired by Chatbot-UI and modified to fit the needs of this project
// @see https://github.com/mckaywrigley/chatbot-ui/blob/main/components/Chat/ChatMessage.tsx

import { type Message } from "ai";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { cn } from "~/lib/utils";
import { CodeBlock } from "~/components/ui/codeblock";
import { MemoizedReactMarkdown } from "~/components/markdown";
import { IconOpenAI, IconUser } from "~/components/ui/icons";
import { ChatMessageActions } from "~/components/chat-message-actions";
import { ChatBotRole } from "~/lib/types";

export interface ChatMessageProps {
  message: Message;
}

interface CodeProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function ChatMessage({ message, ...props }: ChatMessageProps) {
  return (
    <div
      className={cn("group relative mb-4 flex items-start md:-ml-12")}
      {...props}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow",
          message.role === ChatBotRole.Human
            ? "bg-background"
            : "bg-primary text-primary-foreground",
        )}
      >
        {message.role === ChatBotRole.Human ? <IconUser /> : <IconOpenAI />}
      </div>
      <div className="ml-4 flex-1 space-y-2 overflow-hidden px-1">
        <MemoizedReactMarkdown
          className="prose dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 break-words"
          remarkPlugins={[remarkGfm, remarkMath]}
          components={{
            p({ children }) {
              return <p className="mb-2 last:mb-0">{children}</p>;
            },
            code({ inline, className, children, ...props }: CodeProps) {
              const content = String(children).replace(/\n$/, "");

              if (typeof content === "string") {
                if (content === "▍") {
                  return (
                    <span className="mt-1 animate-pulse cursor-default">▍</span>
                  );
                }

                if (inline) {
                  return (
                    <code className={className} {...props}>
                      {content.replace("`▍`", "▍")}
                    </code>
                  );
                }

                const match = /language-(\w+)/.exec(className ?? "");
                return (
                  <CodeBlock
                    key={Math.random()}
                    language={match?.[1] ?? ""}
                    value={content}
                    {...props}
                  />
                );
              }

              return null;
            },
          }}
        >
          {message.content}
        </MemoizedReactMarkdown>
        <ChatMessageActions message={message} />
      </div>
    </div>
  );
}
