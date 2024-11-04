import { updateUser } from "~/server/service/auth.service";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { addInterestedUserSchema, updateProfileSchema } from "~/shared/schema";
import { createInterestedUser } from "~/server/service/user.service";

export const useRouter = createTRPCRouter({
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ input, ctx }) => {
      const { db, user } = ctx;
      const { name } = input;

      await updateUser(user.id, { name }, db);

      return {
        name,
      };
    }),
  createInterestedUser: publicProcedure
    .input(addInterestedUserSchema)
    .mutation(async ({ input, ctx }) => {
      const { db } = ctx;
      const { email, name } = input;

      await createInterestedUser({ email, name }, db);

      return {
        name,
      };
    }),
});
