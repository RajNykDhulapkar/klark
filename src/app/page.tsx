import React from "react";
import { api } from "~/trpc/server";
import { LandingPage } from "./_components/landing/LandingPage";
import { nanoid } from "~/lib/utils";
import { Chat } from "~/components/chat";
import { Sidebar } from "~/components/sidebar";
import { SidebarList } from "~/components/sidebar-list";
import { SidebarFooter } from "~/components/sidebar-footer";
import { ClearHistory } from "~/components/clear-history";

export default async function Home() {
  const user = await api.auth.user();

  if (!user) {
    return <LandingPage />;
  }

  const id = nanoid();

  return (
    <>
      <div className="container relative mx-auto">
        <Chat id={id} />
      </div>

      <div className="absolute bottom-[1rem] right-[1rem] z-[10] size-fit">
        <Sidebar>
          <React.Suspense fallback={<div className="flex-1 overflow-auto" />}>
            <SidebarList />
          </React.Suspense>
          <SidebarFooter>
            <ClearHistory />
          </SidebarFooter>
        </Sidebar>
      </div>
    </>
  );
}
