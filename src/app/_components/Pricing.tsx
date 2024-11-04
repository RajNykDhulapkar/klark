"use client";
import { ArrowRightIcon, CheckIcon, ReloadIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Switch } from "~/components/ui/switch";
import { api } from "~/trpc/react";
import { LargeHeading } from "./Text";

export function Pricing() {
  const [priceLoading, setPriceLoading] = useState<string | null>(null);
  const router = useRouter();
  const products = api.sub.products.useQuery();
  const user = api.auth.user.useQuery().data;

  const [isYearly, setIsYearly] = useState(false);
  const prices = isYearly
    ? (products.data?.yearly ?? [])
    : (products.data?.monthly ?? []);

  const formatPrice = (amount: number | null) => {
    if (amount === null) return "Free";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  function handleCheckout(priceId: string) {
    setPriceLoading(priceId);
    if (!user) {
      return router.push(`/auth/register?redirect=/checkout/${priceId}`);
    }

    return router.push(`/checkout/${priceId}`);
  }

  if (products.isPending) {
    return (
      <div className="container mx-auto">
        <Skeleton className="mx-auto mb-4 h-10 w-40" />
        <div className="flex space-x-4">
          {Array(3)
            .fill(null)
            .map((_, i) => {
              return <Skeleton key={i} className="h-60 w-full" />;
            })}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <LargeHeading>Pricing</LargeHeading>
      <p className="mb-4 text-muted-foreground">
        IndiKit is free but you can follow the subscribe flow to see how it
        works. It iss in test mode so you will not be charged.
      </p>
      <div className="mb-8 flex items-center justify-center space-x-4">
        <span
          className={`text-sm font-medium ${!isYearly ? "text-primary" : "text-muted-foreground"}`}
        >
          Monthly
        </span>
        <Switch checked={isYearly} onCheckedChange={setIsYearly} />
        <span
          className={`text-sm font-medium ${isYearly ? "text-primary" : "text-muted-foreground"}`}
        >
          Yearly
        </span>
      </div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {prices.map((price, index) => (
          <Card
            key={price.id}
            className={`flex flex-col ${index === 1 ? "scale-105 border-primary shadow-lg" : ""}`}
          >
            <CardHeader>
              <CardTitle>{price.name}</CardTitle>
              <CardDescription>{price.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="mb-4 text-3xl font-bold">
                {formatPrice(price.unitAmount)}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  /{isYearly ? "year" : "month"}
                </span>
              </div>
              <ul className="space-y-2">
                {price.marketingFeatures.map((feature, i) => (
                  <li key={i} className="flex items-center">
                    <CheckIcon className="mr-2 h-5 w-5 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={() => handleCheckout(price.id)}
              >
                <span className="mr-4">Get started</span>
                {priceLoading === price.id ? (
                  <ReloadIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRightIcon />
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
