"use client";
import { Suspense } from "react";
import { type z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { resetPasswordSchema } from "~/shared/schema";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { CheckCircledIcon, ReloadIcon } from "@radix-ui/react-icons";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { FormError } from "~/app/_components/form/Error";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = api.useUtils();
  const action = api.auth.resetPassword.useMutation({
    onSuccess: async () => {
      await utils.auth.user.invalidate(undefined, {
        refetchType: "all",
      });
      router.push("/");
    },
  });

  const token = searchParams.get("token");

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: token ?? "",
      password: "",
      repeatPassword: "",
    },
  });

  if (!token) {
    return redirect("/auth/forgot-password");
  }

  if (action.isSuccess) {
    return (
      <div className="mx-auto max-w-[350px]">
        <Alert>
          <CheckCircledIcon className="h-4 w-4 text-green-600" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>
            We have sent you an email with a link to reset your password. If the
            email does not arrive it may be because you do not have an account
            with us.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>
            Enter your new password and repeat it to confirm
          </CardDescription>

          {action.isError ? (
            <FormError title="Opps!" description={action.error.message} />
          ) : null}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => action.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your password"
                        type="password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="repeatPassword"
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormLabel>Repeat password</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Repeat your password"
                          type="password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <Button
                className="w-full"
                type="submit"
                disabled={action.isPending}
              >
                {action.isPending ? (
                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Reset password
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
