import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { User } from "../../drizzle/schema";
import {
  createLocalUser,
  deleteUser,
  getUserByEmail,
  getUserById,
  listUsers,
  updateUser,
  updateUserPassword,
} from "../db";
import { hashPassword } from "../_core/password";
import { adminProcedure, router } from "../_core/trpc";
import type { SafeUser } from "./auth";

function sanitizeUser(user: User): SafeUser {
  const { passwordHash: _, ...safe } = user;
  return safe;
}

export const usersRouter = router({
  list: adminProcedure.query(async () => {
    const rows = await listUsers();
    return rows.map((user) => sanitizeUser(user));
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(["user", "admin"]).default("user"),
      })
    )
    .mutation(async ({ input }) => {
      const existing = await getUserByEmail(input.email);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Email is already registered" });
      }

      const passwordHash = await hashPassword(input.password);
      const user = await createLocalUser({
        email: input.email,
        name: input.name,
        passwordHash,
        role: input.role,
      });

      return sanitizeUser(user);
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        role: z.enum(["user", "admin"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await getUserById(input.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      if (input.id === ctx.user.id && input.role && input.role !== "admin") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot remove your own admin role" });
      }

      const updated = await updateUser(input.id, {
        name: input.name,
        email: input.email,
        role: input.role,
      });

      return sanitizeUser(updated);
    }),

  resetPassword: adminProcedure
    .input(
      z.object({
        id: z.number(),
        newPassword: z.string().min(6),
      })
    )
    .mutation(async ({ input }) => {
      const user = await getUserById(input.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      const passwordHash = await hashPassword(input.newPassword);
      await updateUserPassword(input.id, passwordHash);
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (input.id === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot delete your own account" });
      }

      const user = await getUserById(input.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      await deleteUser(input.id);
      return { success: true };
    }),
});
