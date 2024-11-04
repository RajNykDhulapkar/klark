"use client";
import { redirect } from "next/navigation";
import { useEffect } from "react";
import { api } from "~/trpc/react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { ExclamationTriangleIcon, ReloadIcon } from "@radix-ui/react-icons";

export const runtime = "edge";

export default function VerifyPage({
  searchParams,
}: {
  searchParams: {
    token: string;
    redirect?: string;
  };
}) {
  const utils = api.useUtils();
  const token = searchParams.token;

  const { mutate, error, submittedAt, isPending } =
    api.auth.verifyEmail.useMutation({
      async onSuccess() {
        await utils.auth.user.invalidate(undefined, {
          refetchType: "all",
        });
      },
    });

  useEffect(() => {
    if (!submittedAt && token) {
      mutate(token);
    }
  }, [submittedAt, token, mutate]);

  if (!token) {
    return redirect("/auth/login");
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl">
        <Alert>
          <ExclamationTriangleIcon className="h-4 w-4 text-red-700" />
          <AlertTitle>Opps!</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isPending || !submittedAt) {
    return (
      <div className="mx-auto flex max-w-xl justify-center">
        <ReloadIcon className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  return redirect(searchParams.redirect ?? "/");
}
