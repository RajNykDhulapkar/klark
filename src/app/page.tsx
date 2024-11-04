import { api } from "~/trpc/server";
import { LandingPage } from "./_components/landing/LandingPage";

export const runtime = "edge";

export default async function Home() {
  const user = await api.auth.user();

  if (!user) {
    return <LandingPage />;
  }

  return (
    <div className="container mx-auto">
      <h1>Welcome back, {user.name}!</h1>
      <p>Your email is {user.email}</p>
    </div>
  );
}
