"use client";
import { type z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { forgotPasswordSchema } from "~/shared/schema";
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
import {
  CheckCircledIcon,
  ExclamationTriangleIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";

export default function Page() {
  const action = api.auth.newVerificationToken.useMutation();

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  if (action.isSuccess) {
    return (
      <div className="mx-auto max-w-[350px]">
        <Alert>
          <CheckCircledIcon className="h-4 w-4 text-green-600" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>
            We have sent you an email with a link to verify your email address.
            If you do not receive the email, please check your spam folder.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Resend verification</CardTitle>
          <CardDescription>
            Enter your email and we will send you a new verification link
          </CardDescription>

          {action.isError ? (
            <Alert>
              <ExclamationTriangleIcon className="h-4 w-4 text-red-700" />
              <AlertTitle>Opps!</AlertTitle>
              <AlertDescription>{action.error.message}</AlertDescription>
            </Alert>
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your email"
                        type="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                className="w-full"
                type="submit"
                disabled={action.isPending}
              >
                {action.isPending ? (
                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Send verification link
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
