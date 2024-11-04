import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { env } from "~/env";

let stripePromise: Promise<Stripe | null>;

export function getStripe() {
  if (!Boolean(stripePromise)) {
    stripePromise = loadStripe(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  }

  return stripePromise;
}
