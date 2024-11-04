import { generateIdFromEntropySize } from "lucia";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationEmailSchema,
  resetPasswordSchema,
  userSchema,
} from "~/shared/schema";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  sendForgotPasswordEmail,
  sendVerificationEmail,
} from "~/server/service/email.service";
import {
  createSession,
  createUser,
  createVerificationToken,
  deleteVerificationToken,
  findVerificationToken,
  generateSalt,
  getUserByEmail,
  getUserById,
  hashPassword,
  updateUser,
  verifyPassword,
} from "~/server/service/auth.service";
import { lucia } from "~/lib/auth";

export const authRouter = createTRPCRouter({
  user: publicProcedure.output(userSchema).query(async ({ ctx }) => {
    const { user } = ctx;
    return user;
  }),
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input, ctx }) => {
      const { db } = ctx;
      const { email, password, name } = input;

      try {
        const salt = generateSalt();
        const passwordHash = await hashPassword(password, salt);
        const userId = generateIdFromEntropySize(10); // 16 characters long

        return await db.transaction(async (tx) => {
          await createUser(
            {
              id: userId,
              name,
              email: email.toLowerCase(),
              passwordHash,
            },
            tx,
          );

          const token = await createVerificationToken(userId, tx);

          const encodedToken = Buffer.from(`${userId}:${token}`).toString(
            "base64",
          );

          await sendVerificationEmail({
            to: email,
            token: encodedToken,
            redirect: input.redirect ?? "/",
          });

          return true;
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "An error occurred";

        throw new TRPCError({
          code: "BAD_REQUEST",
          message,
        });
      }
    }),

  verifyEmail: publicProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const str = Buffer.from(input, "base64");

      const decoded = str.toString("utf-8");

      const [userId, token] = decoded.split(":");

      if (!userId || !token) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid token",
        });
      }

      const { db, cookieStore } = ctx;

      const existingToken = await findVerificationToken({
        userId,
        token,
      });

      if (!existingToken) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid token",
        });
      }

      if (existingToken.expiresAt < Date.now()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Token expired",
        });
      }

      await updateUser(
        userId,
        {
          verified: true,
        },
        db,
      );

      void deleteVerificationToken({
        userId,
        token,
      });

      const user = await getUserById(userId, db);

      if (!user) {
        return true;
      }

      await createSession({
        userId: user.id,
        user: {
          email: user.email,
          name: user.name,
        },
        cookieStore,
      });

      return true;
    }),

  login: publicProcedure.input(loginSchema).mutation(async ({ ctx, input }) => {
    const { email, password } = input;
    const { db, cookieStore } = ctx;

    const existingUser = await getUserByEmail(email, db);

    if (!existingUser) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Incorrect username or password",
      });
    }

    if (!existingUser.verified) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Please verify your email",
      });
    }

    const validPassword = await verifyPassword(
      password,
      existingUser.passwordHash,
    );
    if (!validPassword) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Incorrect username or password",
      });
    }

    await createSession({
      userId: existingUser.id,
      user: {
        email: existingUser.email,
        name: existingUser.name,
      },
      cookieStore,
    });

    return true;
  }),
  newVerificationToken: publicProcedure
    .input(resendVerificationEmailSchema)
    .mutation(async ({ input, ctx }) => {
      const { db } = ctx;
      const { email } = input;

      const user = await getUserByEmail(email, db);

      if (!user) {
        /*
         * we don't want to tell them if the email exists or not
         */
        return true;
      }

      const token = await createVerificationToken(user.id, db);

      const encodedToken = Buffer.from(`${user.id}:${token}`).toString(
        "base64",
      );

      await sendVerificationEmail({
        to: user.email,
        token: encodedToken,
        redirect: "/",
      });

      return true;
    }),

  forgotPassword: publicProcedure
    .input(forgotPasswordSchema)
    .mutation(async ({ input, ctx }) => {
      const { db } = ctx;
      const { email } = input;

      const user = await getUserByEmail(email, db);

      if (!user) {
        return true;
      }

      const token = await createVerificationToken(user.id, db);

      const encodedToken = Buffer.from(`${user.id}:${token}`).toString(
        "base64",
      );

      await sendForgotPasswordEmail({
        to: user.email,
        token: encodedToken,
      });

      return true;
    }),
  resetPassword: publicProcedure
    .input(resetPasswordSchema)
    .mutation(async ({ input, ctx }) => {
      const { db } = ctx;

      const str = Buffer.from(input.token, "base64");

      const decoded = str.toString("utf-8");

      const [userId, token] = decoded.split(":");

      if (!userId || !token) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid token",
        });
      }

      const existingToken = await findVerificationToken({
        userId,
        token,
      });

      if (!existingToken) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid token",
        });
      }

      if (existingToken.expiresAt < Date.now()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Token expired",
        });
      }

      const user = await getUserById(userId, db);

      if (!user) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User not found",
        });
      }

      const salt = generateSalt();
      const passwordHash = await hashPassword(input.password, salt);

      await updateUser(user.id, {
        passwordHash,
      });

      void deleteVerificationToken({
        userId,
        token,
      });

      await createSession({
        userId: user.id,
        user: {
          email: user.email,
          name: user.name,
        },
        cookieStore: ctx.cookieStore,
      });

      return true;
    }),
  changePassword: protectedProcedure
    .input(changePasswordSchema)
    .mutation(async ({ input, ctx }) => {
      const { user, db } = ctx;
      const { currentPassword, newPassword } = input;

      const existingUser = await getUserById(user.id, db);

      if (!existingUser) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User not found",
        });
      }

      const validPassword = await verifyPassword(
        currentPassword,
        existingUser.passwordHash,
      );

      if (!validPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Incorrect password",
        });
      }

      const salt = generateSalt();
      const passwordHash = await hashPassword(newPassword, salt);

      await updateUser(user.id, {
        passwordHash,
      });

      return true;
    }),
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    const { session } = ctx;

    await lucia.invalidateSession(session.id);

    const sessionCookie = lucia.createBlankSessionCookie();
    ctx.cookieStore.set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes,
    );
  }),
});
