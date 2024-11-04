import { createCheckoutSessionSchema } from "~/shared/schema";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import {
  checkoutWithStripe,
  createBillingPortalSession,
  getProducts,
  getUserSubscription,
} from "~/server/service/sub.service";

export const subscriptionRouter = createTRPCRouter({
  subscription: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx;

    const sub = await getUserSubscription(user.id);

    return sub;
  }),
  products: publicProcedure.query(() => {
    return getProducts();
  }),
  createCheckoutSession: protectedProcedure
    .input(createCheckoutSessionSchema)
    .mutation(async ({ input, ctx }) => {
      const { user } = ctx;
      const { priceId } = input;

      const session = await checkoutWithStripe({
        email: user.email,
        userId: user.id,
        priceId,
      });

      return session.url!;
    }),
  createBillingPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    const { user } = ctx;

    const session = await createBillingPortalSession({
      email: user.email,
      userId: user.id,
    });

    return session.url;
  }),
});
