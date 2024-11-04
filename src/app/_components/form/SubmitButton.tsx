import { ReloadIcon } from "@radix-ui/react-icons";
import { Button } from "~/components/ui/button";

export function SubmitButton({
  children,
  isLoading,
}: {
  children: string;
  isLoading?: boolean;
}) {
  return (
    <Button type="submit" className="w-full" disabled={isLoading}>
      <span className="mr-4">{children}</span>
      {isLoading ? <ReloadIcon className="animate-spin" /> : null}
    </Button>
  );
}
