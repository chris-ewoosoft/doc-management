import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import type { User } from "../../drizzle/schema";
import {
  countUsers,
  createLocalUser,
  getUserByEmail,
  getUserById,
  updateUserPassword,
} from "../db";
import type { TrpcContext } from "../_core/context";
import { getSessionCookieOptions } from "../_core/cookies";
import { hashPassword, verifyPassword } from "../_core/password";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { sdk } from "../_core/sdk";

export type SafeUser = Omit<User, "passwordHash">;

function sanitizeUser(user: User): SafeUser {
  const { passwordHash: _, ...safe } = user;
  return safe;
}

async function issueSession(ctx: Pick<TrpcContext, "req" | "res">, user: User) {
  const sessionToken = await sdk.createSessionToken(user.openId, {
    name: user.name || user.email || "",
    expiresInMs: ONE_YEAR_MS,
  });

  const cookieOptions = getSessionCookieOptions(ctx.req);
  ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

  return sanitizeUser(user);
}

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => (ctx.user ? sanitizeUser(ctx.user) : null)),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await getUserByEmail(input.email);
      if (!user?.passwordHash) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }

      const valid = await verifyPassword(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }

      return issueSession(ctx, user);
    }),

  bootstrap: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const total = await countUsers();
      if (total > 0) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Bootstrap is only available when no users exist" });
      }

      const passwordHash = await hashPassword(input.password);
      const user = await createLocalUser({
        email: input.email,
        name: input.name,
        passwordHash,
        role: "admin",
      });

      return issueSession(ctx, user);
    }),

  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await getUserById(ctx.user.id);
      if (!user?.passwordHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Password change is not available for OAuth accounts",
        });
      }

      const valid = await verifyPassword(input.currentPassword, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect" });
      }

      const passwordHash = await hashPassword(input.newPassword);
      await updateUserPassword(user.id, passwordHash);
      return { success: true };
    }),
});
