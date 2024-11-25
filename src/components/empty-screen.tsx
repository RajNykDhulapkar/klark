import { type UseChatHelpers } from "ai/react";
import { Button, buttonVariants } from "~/components/ui/button";
import { IconArrowRight, IconPlus } from "~/components/ui/icons";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import FileUploader from "~/app/_components/FileUpload";
import { cn } from "~/lib/utils";

const exampleMessages = [
  {
    heading: "Upload and analyze documents",
    message:
      "I'd like to upload a document and analyze its contents. Can you help me understand the process?",
  },
  {
    heading: "Search through documents",
    message:
      "How can I search through my uploaded documents effectively? What search features are available?",
  },
  {
    heading: "Document management",
    message:
      "Can you show me how to manage my uploaded documents? I'd like to know about organizing, viewing, and deleting files.",
  },
  {
    heading: "Document insights",
    message:
      "What kind of insights can you provide about my uploaded documents? How can I get summaries or key points?",
  },
];

export interface EmptyScreenProps extends Pick<UseChatHelpers, "setInput"> {
  chatId: string;
}

export function EmptyScreen({ chatId, setInput }: EmptyScreenProps) {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="rounded-lg border bg-background p-8">
        <h1 className="mb-2 text-lg font-semibold">
          Welcome to Klark Document Assistant!
        </h1>
        <p className="mb-2 leading-normal text-muted-foreground">
          Hi there! I&apos;m your document analysis assistant, ready to help you
          manage and understand your documents. Whether you need to upload new
          files, search through existing ones, or extract valuable insights,
          I&apos;m here to guide you through the process.
        </p>
        <p className="leading-normal text-muted-foreground">
          You can start by trying one of these common tasks:
        </p>
        <div className="mt-4 flex flex-col items-start space-y-2">
          {exampleMessages.map((message, index) => (
            <Button
              key={index}
              variant="link"
              className="h-auto p-0 text-base"
              onClick={() => setInput(message.message)}
            >
              <IconArrowRight className="mr-2 text-muted-foreground" />
              {message.heading}
            </Button>
          ))}
        </div>
        <div className="pt-4">
          <Dialog>
            <DialogTrigger asChild>
              <button
                className={cn(
                  buttonVariants({ size: "default", variant: "default" }),
                  "space-x-2 rounded-full px-5",
                )}
              >
                <IconPlus />
                <span className="text-base">Upload Files</span>
                <span className="sr-only">Upload Files</span>
              </button>
            </DialogTrigger>

            <DialogContent className="z-[100] pl-7">
              <FileUploader chatId={chatId} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
