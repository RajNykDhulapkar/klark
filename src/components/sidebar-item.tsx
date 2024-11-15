"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "~/lib/utils";
import { buttonVariants } from "~/components/ui/button";
import { IconMessage, IconUsers } from "~/components/ui/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { type Chat } from "~/server/db/schema";

interface SidebarItemProps {
  chat: Chat;
  children: React.ReactNode;
}

export function SidebarItem({ chat, children }: SidebarItemProps) {
  const pathname = usePathname();
  const isActive = pathname === `/chat/${chat.id}`;

  if (!chat?.id) return null;

  const isShared = chat.metadata?.sharePath;
  const chatPath = `/chat/${chat.id}`;

  return (
    <div className="relative">
      <div className="absolute left-2 top-1 flex h-6 w-6 items-center justify-center">
        {isShared ? (
          <Tooltip>
            <TooltipTrigger
              tabIndex={-1}
              className="focus:bg-muted focus:ring-1 focus:ring-ring"
              aria-label="Shared chat indicator"
            >
              <IconUsers className="mr-2" />
            </TooltipTrigger>
            <TooltipContent>This is a shared chat</TooltipContent>
          </Tooltip>
        ) : (
          <IconMessage className="mr-2" aria-hidden="true" />
        )}
      </div>
      <Link
        href={chatPath}
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "group w-full pl-8 pr-16",
          isActive && "bg-accent",
        )}
        aria-current={isActive ? "page" : undefined}
      >
        <div
          className="relative max-h-5 flex-1 select-none overflow-hidden text-ellipsis break-all"
          title={chat.title}
        >
          <span className="whitespace-nowrap">{chat.title}</span>
        </div>
      </Link>
      {isActive && (
        <div className="absolute right-2 top-1" aria-label="Chat actions">
          {children}
        </div>
      )}
    </div>
  );
}
