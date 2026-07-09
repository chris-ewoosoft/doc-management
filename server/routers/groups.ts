import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  countDocumentsInGroup,
  createDocumentGroup,
  deleteDocumentGroup,
  getDocumentGroupById,
  getDocumentGroupByName,
  listDocumentGroups,
  updateDocumentGroup,
} from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { eq } from "drizzle-orm";
import { documents } from "../../drizzle/schema";
import { getDb } from "../db";

export const groupsRouter = router({
  list: protectedProcedure.query(async () => {
    return listDocumentGroups();
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const existing = await getDocumentGroupByName(input.name);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "A group with this name already exists" });
      }

      return createDocumentGroup({
        name: input.name,
        description: input.description,
        sortOrder: input.sortOrder ?? 0,
      });
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const group = await getDocumentGroupById(input.id);
      if (!group) throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });

      if (input.name && input.name !== group.name) {
        const existing = await getDocumentGroupByName(input.name);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "A group with this name already exists" });
        }
      }

      const updated = await updateDocumentGroup(input.id, {
        name: input.name,
        description: input.description,
        sortOrder: input.sortOrder,
      });

      if (input.name && input.name !== group.name) {
        const db = await getDb();
        if (db) {
          await db
            .update(documents)
            .set({ projectCategory: input.name })
            .where(eq(documents.groupId, input.id));
        }
      }

      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const group = await getDocumentGroupById(input.id);
      if (!group) throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });

      const docCount = await countDocumentsInGroup(input.id);
      if (docCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete group with ${docCount} document(s). Reassign documents first.`,
        });
      }

      await deleteDocumentGroup(input.id);
      return { success: true };
    }),
});
