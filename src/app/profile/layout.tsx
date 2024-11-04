import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { api } from "~/trpc/server";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Profile | IndiKit",
  description: "Profile page",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await api.auth.user();

  if (!user) {
    return redirect("/auth/login");
  }

  return children;
}
