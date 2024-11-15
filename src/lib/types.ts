import { type Message } from "ai";

export interface Chat
  extends Record<string, string | Date | Message[] | undefined> {
  id: string;
  title: string;
  createdAt: Date;
  userId: string;
  path: string;
  messages: Message[];
  sharePath?: string;
}

export type ServerActionResult<Result> = Promise<
  | Result
  | {
      error: string;
    }
>;

export enum ChatBotRole {
  Human = "user",
  AI = "ai",
}
