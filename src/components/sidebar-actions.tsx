"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { cn } from "~/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  IconShare,
  IconSpinner,
  IconTrash,
  IconUsers,
} from "~/components/ui/icons";
import Link from "next/link";
import { badgeVariants } from "~/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useToast } from "~/hooks/use-toast";
import { type Chat } from "~/server/db/schema";
import { api } from "~/trpc/react";

interface SidebarActionsProps {
  chat: Chat;
}

export function SidebarActions({ chat }: SidebarActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const utils = api.useUtils();

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [shareDialogOpen, setShareDialogOpen] = React.useState(false);

  const deleteMutation = api.chat.remove.useMutation({
    onSuccess: async () => {
      setDeleteDialogOpen(false);
      await utils.chat.list.invalidate();
      router.push("/");
      toast({ title: "Success", description: "Chat deleted" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message });
    },
  });

  const shareMutation = api.chat.share.useMutation({
    onSuccess: async (updatedChat) => {
      if (updatedChat?.metadata?.sharePath) {
        await copyShareLink(updatedChat);
      }
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message });
    },
  });

  const copyShareLink = React.useCallback(
    async (chat: Chat) => {
      const sharePath = chat.metadata?.sharePath;
      if (!sharePath) {
        toast({
          title: "Error",
          description: "Could not copy share link to clipboard",
        });
        return;
      }

      const url = new URL(window.location.href);
      url.pathname = sharePath;
      await navigator.clipboard.writeText(url.toString());
      setShareDialogOpen(false);
      toast({
        title: "Success",
        description: "Share link copied to clipboard",
      });
    },
    [toast],
  );

  return (
    <>
      <div className="space-x-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="h-6 w-6 p-0 hover:bg-background"
              onClick={() => setShareDialogOpen(true)}
            >
              <IconShare />
              <span className="sr-only">Share</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Share chat</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="h-6 w-6 p-0 hover:bg-background"
              disabled={deleteMutation.isPending}
              onClick={() => setDeleteDialogOpen(true)}
            >
              <IconTrash />
              <span className="sr-only">Delete</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete chat</TooltipContent>
        </Tooltip>
      </div>
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share link to chat</DialogTitle>
            <DialogDescription>
              Anyone with the URL will be able to view the shared chat.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 rounded-md border p-4 text-sm">
            <div className="font-medium">{chat.title}</div>
          </div>
          <DialogFooter className="items-center">
            {chat.metadata?.sharePath && (
              <Link
                href={chat.metadata.sharePath}
                className={cn(
                  badgeVariants({ variant: "secondary" }),
                  "mr-auto",
                )}
                target="_blank"
              >
                <IconUsers className="mr-2" />
                {chat.metadata.sharePath}
              </Link>
            )}
            <Button
              disabled={shareMutation.isPending}
              onClick={() => {
                if (chat.metadata?.sharePath) {
                  void copyShareLink(chat);
                  return;
                }
                shareMutation.mutate(chat.id);
              }}
            >
              {shareMutation.isPending ? (
                <>
                  <IconSpinner className="mr-2 animate-spin" />
                  Copying...
                </>
              ) : (
                <>Copy link</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your chat message and remove your
              data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                deleteMutation.mutate(chat.id);
              }}
            >
              {deleteMutation.isPending && (
                <IconSpinner className="mr-2 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
