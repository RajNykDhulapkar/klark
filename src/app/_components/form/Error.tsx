import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";

export function FormError({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Alert>
      <ExclamationTriangleIcon className="h-4 w-4 text-red-700" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}
