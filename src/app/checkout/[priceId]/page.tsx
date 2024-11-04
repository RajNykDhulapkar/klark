import { redirect } from "next/navigation";
import { api } from "~/trpc/server";

export const runtime = "edge";

export default async function CheckoutPage({
  params,
}: {
  params: {
    priceId: string;
  };
}) {
  const { priceId } = params;

  const url = await api.sub.createCheckoutSession({
    priceId,
  });

  return redirect(url);
}
