import z from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  redirect: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const verifyEmailSchema = z.object({
  token: z.string(),
  userId: z.string(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string(),
    password: z.string().min(6, {
      message: "Password must be at least 6 characters",
    }),
    repeatPassword: z.string().min(6, {
      message: "Password must be at least 6 characters",
    }),
  })
  .refine(
    (data) => {
      return data.password === data.repeatPassword;
    },
    {
      path: ["repeatPassword"],
      message: "Passwords do not match",
    },
  );

export const resendVerificationEmailSchema = z.object({
  email: z.string().email(),
});

export const createCheckoutSessionSchema = z.object({
  priceId: z.string(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string(),
    newPassword: z.string().min(6, {
      message: "Password must be at least 6 characters",
    }),
    confirmPassword: z.string().min(6, {
      message: "Password must be at least 6 characters",
    }),
  })
  .refine(
    (data) => {
      return data.newPassword === data.confirmPassword;
    },
    {
      path: ["confirmPassword"],
      message: "Passwords do not match",
    },
  );

export const updateProfileSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
});

export const addInterestedUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

export const userSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
  })
  .nullable();
