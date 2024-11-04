"use client";
import { Suspense, useState } from "react";
import { type z } from "zod";
import { api } from "~/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { loginSchema, registerSchema } from "~/shared/schema";
import {
  CheckCircledIcon,
  ExclamationTriangleIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

const pages = {
  login: {
    path: "/auth/login",
    label: "Login",
  },
  register: {
    path: "/auth/register",
    label: "Register",
  },
} as const;

function AuthFormContent({
  defaultTab = "login",
}: {
  defaultTab?: keyof typeof pages;
}) {
  const utils = api.useUtils();
  const router = useRouter();
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";

  const login = api.auth.login.useMutation({
    async onSuccess() {
      await utils.auth.user.invalidate(undefined, {
        refetchType: "all",
      });
      window.location.href = redirect;
    },
  });
  const register = api.auth.register.useMutation({});

  const [activeTab, setActiveTab] = useState<keyof typeof pages>(defaultTab);

  function handleTabChange(value: string) {
    const tab = value as keyof typeof pages;
    const page = pages[tab];
    router.push(page.path);
    setActiveTab(tab);
  }

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      redirect,
    },
  });

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  if (register.isSuccess) {
    return (
      <div className="mx-auto max-w-[350px]">
        <Alert>
          <CheckCircledIcon className="h-4 w-4 text-green-600" />
          <AlertTitle>{t("register.success.title")}</AlertTitle>
          <AlertDescription>
            {t("register.success.description")}
            your account.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (login.isError && login.error.message.includes("verify your email")) {
    return (
      <div className="mx-auto max-w-[350px]">
        <Alert>
          <ExclamationTriangleIcon className="h-4 w-4 text-red-700" />
          <AlertTitle>{t("login.verifyEmail.title")}</AlertTitle>
          <AlertDescription>
            <p className="mb-4">{t("login.verifyEmail.description")}</p>
            <Link
              href="/auth/resend-verification"
              className={buttonVariants({ variant: "outline" })}
            >
              {t("login.verifyEmail.button")}
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>

        {login.isError ? (
          <Alert>
            <ExclamationTriangleIcon className="h-4 w-4 text-red-700" />
            <AlertTitle>Opps!</AlertTitle>
            <AlertDescription>{login.error.message}</AlertDescription>
          </Alert>
        ) : null}
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            {Object.entries(pages).map(([key, page]) => (
              <TabsTrigger key={key} value={key}>
                {page.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="login">
            <Form {...loginForm}>
              <form
                onSubmit={loginForm.handleSubmit((data) => login.mutate(data))}
                className="space-y-4"
              >
                <FormField
                  control={loginForm.control}
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
                <FormField
                  control={loginForm.control}
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
                <Button
                  className="w-full"
                  type="submit"
                  disabled={register.isPending}
                >
                  {login.isPending ? (
                    <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Login
                </Button>
              </form>
            </Form>
          </TabsContent>
          <TabsContent value="register">
            <Form {...registerForm}>
              <form
                onSubmit={registerForm.handleSubmit((data) =>
                  register.mutate(data),
                )}
                className="space-y-4"
              >
                <FormField
                  control={registerForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
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
                <FormField
                  control={registerForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Create a password"
                          type="password"
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
                  disabled={register.isPending}
                >
                  {register.isPending ? (
                    <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Register
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </CardFooter>

      <CardFooter>
        <div>
          <Link href="/auth/forgot-password">Forgot password?</Link>
        </div>
      </CardFooter>
    </Card>
  );
}

export default function AuthForm({
  defaultTab = "login",
}: {
  defaultTab?: keyof typeof pages;
}) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthFormContent defaultTab={defaultTab} />
    </Suspense>
  );
}
