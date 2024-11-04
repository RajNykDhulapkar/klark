import "server-only";
import type Stripe from "stripe";
import { env } from "~/env";
import { logger } from "~/lib/logger";
import { stripe } from "~/lib/stripe/config";
import { manageSubscriptionStatusChange } from "~/server/service/sub.service";

export const runtime = "edge";

const relevantEvents = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    logger.error("No signature found.");
    return new Response("No signature found.", { status: 400 });
  }

  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret) {
      logger.error("Webhook secret not found.");
      return new Response("Webhook secret not found.", { status: 400 });
    }
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (e) {
    const error = e as Error;
    logger.error(`Webhook Error: ${error.message}`);
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }

  if (!relevantEvents.has(event.type)) {
    logger.info(`Unsupported event type: ${event.type}`);
    return new Response(`Unsupported event type: ${event.type}`, {
      status: 400,
    });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        const subscription = event.data.object;
        await manageSubscriptionStatusChange(subscription.id);
        break;

      default:
        throw new Error("Unhandled relevant event!");
    }
  } catch (e) {
    const error = e as Error;
    logger.error(`Webhook handler failed: ${error.message}`);
    return new Response(
      "Webhook handler failed. View your Next.js function logs.",
      {
        status: 400,
      },
    );
  }

  return new Response(JSON.stringify({ received: true }));
}
