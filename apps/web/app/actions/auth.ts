"use server";

import { createClient } from "@/lib/supabase/server";
import { getSiteUrl, isRelativePath } from "@/lib/auth/url";
import { redirect } from "next/navigation";
import { z } from "zod";

const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be 128 characters or fewer");

const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

const forgotPasswordSchema = z.object({
  email: emailSchema,
});

const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type AuthFormState =
  | {
      success?: boolean;
      message?: string;
      errors?: Record<string, string[]>;
    }
  | undefined;

function parseFormData<T>(schema: z.ZodSchema<T>, formData: FormData) {
  const entries = Object.fromEntries(formData.entries());
  const result = schema.safeParse(entries);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    } as const;
  }
  return { success: true, data: result.data } as const;
}

export async function signUp(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = parseFormData(signUpSchema, formData);
  if (!parsed.success) {
    return { success: false, errors: parsed.errors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      success: false,
      message: error.message || "Unable to create account. Please try again.",
    };
  }

  if (data.user?.identities?.length === 0) {
    return {
      success: false,
      message:
        "An account with this email already exists. Try signing in instead.",
    };
  }

  redirect("/login?message=check-email");
}

export async function signIn(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = parseFormData(signInSchema, formData);
  if (!parsed.success) {
    return { success: false, errors: parsed.errors };
  }

  const next = String(formData.get("next") ?? "/app");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      success: false,
      message:
        error.message ||
        "Invalid email or password. Please check and try again.",
    };
  }

  redirect(isRelativePath(next) ? next : "/app");
}

export async function signInWithGoogle(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const next = String(formData.get("next") ?? "/app");
  const supabase = await createClient();
  const siteUrl = getSiteUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return {
      success: false,
      message:
        error.message || "Unable to sign in with Google. Please try again.",
    };
  }

  if (data.url) {
    redirect(data.url);
  }

  return {
    success: false,
    message: "Unable to start Google sign in. Please try again.",
  };
}

export async function forgotPassword(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = parseFormData(forgotPasswordSchema, formData);
  if (!parsed.success) {
    return { success: false, errors: parsed.errors };
  }

  const supabase = await createClient();
  const siteUrl = getSiteUrl();

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${siteUrl}/auth/callback?next=/update-password`,
    }
  );

  if (error) {
    return {
      success: false,
      message: error.message || "Unable to send reset email. Please try again.",
    };
  }

  return {
    success: true,
    message:
      "If an account exists for this email, you will receive a password reset link.",
  };
}

export async function updatePassword(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = parseFormData(updatePasswordSchema, formData);
  if (!parsed.success) {
    return { success: false, errors: parsed.errors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      success: false,
      message: error.message || "Unable to update password. Please try again.",
    };
  }

  await supabase.auth.signOut();
  redirect("/login?message=password-updated");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
