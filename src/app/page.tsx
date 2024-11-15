import { api } from "~/trpc/server";
import { LandingPage } from "./_components/landing/LandingPage";
import { nanoid } from "~/lib/utils";
import { Chat } from "~/components/chat";

export default async function Home() {
  const user = await api.auth.user();

  if (!user) {
    return <LandingPage />;
  }

  const id = nanoid();

  return (
    <div className="container mx-auto">
      <Chat id={id} />
    </div>
  );
}
