import "server-only";
import { type MetadataParam } from "@stripe/stripe-js";
import { type InferInsertModel, and, eq } from "drizzle-orm";
import { db, type Transaction } from "../db";
import { stripe } from "~/lib/stripe/config";
import { env } from "~/env";
import { subscriptionTable, userTable } from "../db/schema";
import { logger } from "~/lib/logger";
import type Stripe from "stripe";
import { getUserByStripeCustomerId, updateUser } from "./auth.service";

export const runtime = "edge";

export async function createCustomerInStripe(userId: string, email: string) {
  const customerData = { metadata: { userId, email }, email };
  const newCustomer = await stripe.customers.create(customerData);
  if (!newCustomer) {
    throw new Error("Stripe customer creation failed.");
  }

  await db
    .update(userTable)
    .set({ stripeCustomerId: newCustomer.id })
    .where(eq(userTable.id, userId));

  return newCustomer.id;
}

export async function manageSubscriptionStatusChange(subscriptionId: string) {
  const stripeSubscription = await stripe.subscriptions.retrieve(
    subscriptionId,
    {
      expand: ["default_payment_method"],
    },
  );

  if (!stripeSubscription) {
    throw new Error("Subscription not found");
  }

  const customerId = stripeSubscription.customer as string;

  const price = stripeSubscription.items.data[0]?.price;

  if (!price) {
    throw new Error("Subscription does not have a price");
  }

  const priceId = price.id;
  if (!priceId) {
    throw new Error("Subscription does not have a price id");
  }

  const productId = price.product;
  if (!productId) {
    throw new Error("Subscription does not have a product");
  }

  if (typeof productId !== "string") {
    throw new Error("Product ID is not a string");
  }

  const product = await stripe.products.retrieve(productId);

  const credits = parseInt(product?.metadata?.credits ?? "0", 10);

  const user = await getUserByStripeCustomerId(customerId);

  if (!user) {
    throw new Error("User not found");
  }

  if (
    !stripeSubscription.current_period_start ||
    !stripeSubscription.current_period_end
  ) {
    throw new Error("Subscription does not have a current period start or end");
  }

  const params: InferInsertModel<typeof subscriptionTable> = {
    id: subscriptionId,
    userId: user.id,
    customerId,
    priceId,
    status: stripeSubscription.status,
    currentPeriodEnd: stripeSubscription.current_period_end,
    currentPeriodStart: stripeSubscription.current_period_start,
    metadata: stripeSubscription.metadata,
    credits,
  };

  await db.insert(subscriptionTable).values(params).onConflictDoUpdate({
    target: subscriptionTable.id,
    set: params,
  });
}

export async function findStripeCustomerByEmail(email: string) {
  const customer = await stripe.customers.list({ email });
  if (customer.data[0]) {
    return customer.data[0].id;
  }
  return null;
}

export async function createStripeCheckoutSessionForCustomer({
  priceId,
  customer,
  metadata,
}: {
  priceId: string;
  customer: string;
  metadata: MetadataParam;
}) {
  return stripe.checkout.sessions.create({
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    customer,
    mode: "subscription",
    customer_update: {
      address: "auto",
    },
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata,
    cancel_url: `${env.BASE_URL}`,
    success_url: `${env.BASE_URL}`,
  });
}

async function findOrCreateStripeCustomer({
  email,
  userId,
}: {
  email: string;
  userId: string;
}) {
  let stripeCustomerId = await findStripeCustomerByEmail(email);

  if (!stripeCustomerId) {
    stripeCustomerId = await createCustomerInStripe(userId, email);
  }

  if (!stripeCustomerId) {
    throw new Error("error creating customer");
  }

  await updateUser(userId, { stripeCustomerId });

  return stripeCustomerId;
}

export async function checkoutWithStripe({
  priceId,
  email,
  userId,
}: {
  priceId: string;
  email: string;
  userId: string;
}) {
  try {
    const stripeCustomerId = await findOrCreateStripeCustomer({
      email,
      userId,
    });

    const checkoutSession = await createStripeCheckoutSessionForCustomer({
      priceId,
      customer: stripeCustomerId,
      metadata: {
        email,
        userId,
      },
    });

    if (!checkoutSession) {
      throw new Error("error creating checkout session - no session returned");
    }

    return checkoutSession;
  } catch (e) {
    const error = e as Error;
    logger.error(
      {
        message: error.message,
        email,
        userId,
      },
      "checkoutWithStripe: error creating checkout session - could not create session",
    );
    throw e;
  }
}

export async function createBillingPortalSession({
  email,
  userId,
}: {
  email: string;
  userId: string;
}) {
  const stripeCustomerId = await findOrCreateStripeCustomer({
    email,
    userId,
  });

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${env.BASE_URL}`,
  });

  return portalSession;
}

export async function getProducts() {
  const prices = await stripe.prices.list({
    expand: ["data.product"],
    active: true,
    type: "recurring",
  });

  const mappedPrices = prices.data
    .map((price) => {
      const product = price.product as Stripe.Product;
      if (!product?.active) {
        return;
      }
      return {
        id: price.id,
        productId:
          typeof price.product === "string" ? price.product : price.product.id,
        unitAmount: price.unit_amount ?? 0,
        name: product.name,
        description: product.description ?? "",
        currency: price.currency,
        interval: price.recurring?.interval,
        marketingFeatures: (product.marketing_features ?? []).map(
          (i) => i.name,
        ),
        credits: product.metadata?.credits ?? 0,
      };
    })
    .filter((i) => i !== undefined); // Boolean doesn't work :(

  const monthly = mappedPrices
    .filter((price) => price.interval === "month")
    .sort((a, b) => a.unitAmount - b.unitAmount);

  const yearly = mappedPrices
    .filter((price) => price.interval === "year")
    .sort((a, b) => a.unitAmount - b.unitAmount);

  return {
    monthly,
    yearly,
  };
}

export async function getUserSubscription(
  userId: string,
  tx: Transaction = db,
) {
  const subscriptions = await tx
    .select()
    .from(subscriptionTable)
    .where(
      and(
        eq(subscriptionTable.userId, userId),
        eq(subscriptionTable.status, "active"),
      ),
    );

  const subscription = subscriptions[0] ?? null;

  return subscription;
}

export async function deductCreditsForSubscription(
  {
    userId,
    amount,
  }: {
    userId: string;
    amount: number;
  },
  tx: Transaction = db,
) {
  const subscription = await getUserSubscription(userId, tx);

  if (!subscription) {
    return;
  }

  const newCredits = Math.max(0, subscription.credits - amount);

  await tx
    .update(subscriptionTable)
    .set({ credits: newCredits })
    .where(eq(subscriptionTable.id, subscription.id));
}

export async function hasEnoughCreditsForSubscription(
  {
    userId,
    amount,
  }: {
    userId: string;
    amount: number;
  },
  tx: Transaction = db,
) {
  const subscription = await getUserSubscription(userId, tx);

  if (!subscription) {
    return false;
  }

  return subscription.credits >= amount;
}
