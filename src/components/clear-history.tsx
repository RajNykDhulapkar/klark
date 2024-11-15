"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "~/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { IconSpinner } from "~/components/ui/icons";
import { useToast } from "~/hooks/use-toast";
import { api } from "~/trpc/react";

export function ClearHistory() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const utils = api.useUtils();

  const clearChatsMutation = api.chat.clearChats.useMutation({
    onSuccess: async () => {
      setOpen(false);
      toast({
        title: "Success",
        description: "Chat history cleared successfully",
      });
      await utils.chat.list.invalidate();
      router.push("/");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" disabled={clearChatsMutation.isPending}>
          {clearChatsMutation.isPending && <IconSpinner className="mr-2" />}
          Clear history
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete your chat history and remove your data
            from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={clearChatsMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={clearChatsMutation.isPending}
            onClick={(event) => {
              event.preventDefault();
              clearChatsMutation.mutate();
            }}
          >
            {clearChatsMutation.isPending && (
              <IconSpinner className="mr-2 animate-spin" />
            )}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
