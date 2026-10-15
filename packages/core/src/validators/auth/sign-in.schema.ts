import { z } from "zod";

/** Sign-in form input. Limits match Better Auth's defaults (8–128 characters). */
export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Enter your password.").max(128, "Enter your password."),
});

export type SignInInput = z.infer<typeof signInSchema>;
