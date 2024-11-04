"use client";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Rocket, Mail, User } from "lucide-react";
import { api } from "~/trpc/react";
import { SubmitButton } from "./form/SubmitButton";
import { useTranslations } from "next-intl";

export function ComingSoon() {
  const t = useTranslations("comingSoon");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const createInterestedUser = api.user.createInterestedUser.useMutation({
    onSuccess() {
      setEmail("");
      setName("");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createInterestedUser.mutate({ email, name });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-r from-blue-100 to-purple-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center justify-center text-center text-3xl font-bold">
            <Rocket className="mr-2 h-6 w-6" />
            {t("title")}
          </CardTitle>
          <CardDescription className="text-center">
            {t("subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!createInterestedUser.submittedAt ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center space-x-2">
                <User className="text-gray-400" />
                <Input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="given-name"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="text-gray-400" />
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <SubmitButton isLoading={createInterestedUser.isPending}>
                {t("cta")}
              </SubmitButton>
            </form>
          ) : (
            <div className="text-center text-green-600">{t("thankYou")}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
