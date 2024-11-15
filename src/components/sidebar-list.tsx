import { SidebarActions } from "~/components/sidebar-actions";
import { SidebarItem } from "~/components/sidebar-item";
import { api } from "~/trpc/react";
import { Skeleton } from "./ui/skeleton";

export async function SidebarList() {
  const {
    data: chats,
    isLoading,
    error,
  } = api.chat.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-2">
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-destructive">
          Error loading chats: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      {chats?.length ? (
        <div className="space-y-2 px-2">
          {chats.map(
            (chat) =>
              chat && (
                <SidebarItem key={chat?.id} chat={chat}>
                  <SidebarActions chat={chat} />
                </SidebarItem>
              ),
          )}
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground">No chat history</p>
        </div>
      )}
    </div>
  );
}
