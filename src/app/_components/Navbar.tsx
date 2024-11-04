"use client";
import * as React from "react";
import Link from "next/link";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "~/components/ui/navigation-menu";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { Logo } from "./Logo";
import { PiHandCoinsBold } from "react-icons/pi";
import { type User } from "lucia";

function AuthenticatedMenu() {
  const router = useRouter();

  const subscription = api.sub.subscription.useQuery();

  const utils = api.useUtils();
  const logout = api.auth.logout.useMutation({
    async onSuccess() {
      await utils.auth.user.invalidate(undefined, {
        refetchType: "all",
      });
      window.location.href = "/auth/login";
    },
  });

  const createBillingPortalSession =
    api.sub.createBillingPortalSession.useMutation({
      onSuccess(url) {
        router.push(url);
      },
    });

  return (
    <>
      {!subscription.data && !subscription.isPending ? (
        <Button variant="outline" className="mr-4" asChild>
          <Link href="/pricing">Subscribe</Link>
        </Button>
      ) : null}

      {subscription.data ? (
        <div className="mr-4 flex items-center">
          <PiHandCoinsBold />
          <span className="ml-2">{subscription.data.credits}</span>
        </div>
      ) : null}

      {subscription.data ? (
        <Button variant="outline" className="mr-4" asChild>
          <Link href="/projects/new">New project</Link>
        </Button>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <HamburgerMenuIcon className="mr-4 h-4 w-4" />
            Menu
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <Link href="/profile">
              <DropdownMenuItem>Profile</DropdownMenuItem>
            </Link>
            <DropdownMenuItem
              onClick={() => createBillingPortalSession.mutate()}
            >
              Manage subscription
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => logout.mutate()}>
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

function UnauthenticatedMenu() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <Link href="/auth/login" legacyBehavior passHref>
            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
              Login
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <Link href="/auth/register" legacyBehavior passHref>
            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
              Register
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function UserMenu() {
  const { data: user, isPending } = api.auth.user.useQuery();

  if (isPending) {
    return null;
  }

  if (user) {
    return <AuthenticatedMenu />;
  }

  return <UnauthenticatedMenu />;
}

export function Navbar() {
  return (
    <header className="w-full border-b-2">
      <div className="container mx-auto flex items-center py-2">
        <div className="flex-1">
          <Logo />
        </div>

        <UserMenu />
      </div>
    </header>
  );
}
