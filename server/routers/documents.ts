import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createDocument,
  getDocumentById,
  listDocuments,
  updateDocument,
  deleteDocument,
  createRevision,
  getDocumentRevisions,
  getRevisionById,
  createComment,
  getDocumentComments,
  updateComment,
  deleteComment,
  createAttachment,
  getDocumentAttachments,
  deleteAttachment,
  getDocumentLocales,
  upsertDocumentLocales,
  getDocumentNotes,
  createDocumentNote,
  updateDocumentNote,
  deleteDocumentNote,
  getDocumentFileNotes,
  createDocumentFileNote,
  updateDocumentFileNote,
  deleteDocumentFileNote,
} from "../db";
import { storagePut } from "../storage";

const localeSchema = z.enum(["en", "vi", "ko"]);

const ALLOWED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024;

export const documentsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "Title is required"),
        description: z.string().optional(),
        content: z.string().min(1, "Content is required"),
        projectCategory: z.string().min(1, "Project category is required").optional(),
        groupId: z.number().optional(),
        locales: z
          .array(
            z.object({
              locale: localeSchema,
              title: z.string(),
              content: z.string(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let projectCategory = input.projectCategory ?? "";
      let groupId = input.groupId;

      if (groupId) {
        const { getDocumentGroupById } = await import("../db");
        const group = await getDocumentGroupById(groupId);
        if (!group) throw new Error("Document group not found");
        projectCategory = group.name;
      }

      if (!projectCategory) {
        throw new Error("Project category or group is required");
      }

      const result = await createDocument({
        title: input.title,
        description: input.description,
        content: input.content,
        projectCategory,
        groupId: groupId ?? null,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      });

      const documentId = result.id;

      const localePayload =
        input.locales ??
        ([
          { locale: "en" as const, title: input.title, content: input.content },
          { locale: "vi" as const, title: "", content: "" },
          { locale: "ko" as const, title: "", content: "" },
        ] as const);

      await upsertDocumentLocales(
        documentId,
        localePayload.map((l) => ({
          locale: l.locale,
          title: l.title,
          content: l.content,
        }))
      );

      await createRevision({
        documentId: Number(documentId),
        content: input.content,
        title: input.title,
        changedBy: ctx.user.id,
        changeDescription: "Initial creation",
      });

      return { id: documentId };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const doc = await getDocumentById(input.id);
      if (!doc) return null;

      const locales = await getDocumentLocales(input.id);
      return { ...doc, locales };
    }),

  list: protectedProcedure
    .input(
      z.object({
        projectCategory: z.string().optional(),
        groupId: z.number().optional(),
        limit: z.number().optional().default(20),
        offset: z.number().optional().default(0),
      })
    )
    .query(async ({ input }) => {
      try {
        return await listDocuments({
          projectCategory: input.projectCategory,
          groupId: input.groupId,
          limit: input.limit,
          offset: input.offset,
        });
      } catch (error) {
        console.warn("[Documents] Failed to list documents:", error);
        return [];
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        content: z.string().optional(),
        projectCategory: z.string().optional(),
        groupId: z.number().optional(),
        locales: z
          .array(
            z.object({
              locale: localeSchema,
              title: z.string(),
              content: z.string(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, locales, groupId, ...updateData } = input;

      const currentDoc = await getDocumentById(id);
      if (!currentDoc) throw new Error("Document not found");

      let projectCategory = updateData.projectCategory;
      if (groupId !== undefined) {
        const { getDocumentGroupById } = await import("../db");
        const group = await getDocumentGroupById(groupId);
        if (!group) throw new Error("Document group not found");
        projectCategory = group.name;
      }

      const hasContentChange = input.content && input.content !== currentDoc.content;
      const hasTitleChange = input.title && input.title !== currentDoc.title;
      const hasDescriptionChange =
        input.description !== undefined && input.description !== currentDoc.description;
      const hasCategoryChange =
        projectCategory !== undefined && projectCategory !== currentDoc.projectCategory;
      const hasGroupChange = groupId !== undefined && groupId !== currentDoc.groupId;

      let localeChanged = false;
      if (locales?.length) {
        const currentLocales = await getDocumentLocales(id);
        localeChanged = locales.some((l) => {
          const cur = currentLocales.find((c) => c.locale === l.locale);
          return !cur || cur.content !== l.content || cur.title !== l.title;
        });
      }

      if (
        hasContentChange ||
        hasTitleChange ||
        hasDescriptionChange ||
        hasCategoryChange ||
        hasGroupChange ||
        localeChanged
      ) {
        const changes: string[] = [];
        if (hasContentChange) changes.push("content");
        if (hasTitleChange) changes.push("title");
        if (hasDescriptionChange) changes.push("description");
        if (hasCategoryChange || hasGroupChange) changes.push("category");
        if (localeChanged) changes.push("locales");

        await createRevision({
          documentId: id,
          content: input.content || currentDoc.content,
          title: input.title || currentDoc.title,
          changedBy: ctx.user.id,
          changeDescription: `Updated: ${changes.join(", ")}`,
        });
      }

      await updateDocument(id, {
        ...updateData,
        ...(projectCategory !== undefined ? { projectCategory } : {}),
        ...(groupId !== undefined ? { groupId } : {}),
        updatedBy: ctx.user.id,
      });

      if (locales?.length) {
        await upsertDocumentLocales(id, locales);
      }

      return { success: true };
    }),

  getLocales: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ input }) => {
      return getDocumentLocales(input.documentId);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteDocument(input.id);
      return { success: true };
    }),

  getRevisions: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ input }) => {
      return getDocumentRevisions(input.documentId);
    }),

  getRevision: protectedProcedure
    .input(z.object({ revisionId: z.number() }))
    .query(async ({ input }) => {
      return getRevisionById(input.revisionId);
    }),

  createComment: protectedProcedure
    .input(
      z.object({
        documentId: z.number(),
        content: z.string().min(1, "Comment content is required"),
        position: z.number().optional(),
        selectionEnd: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const doc = await getDocumentById(input.documentId);
      if (!doc) throw new Error("Document not found");

      const result = await createComment({
        documentId: input.documentId,
        authorId: ctx.user.id,
        content: input.content,
        position: input.position,
        selectionEnd: input.selectionEnd,
        resolved: 0,
      });

      return { id: result.id };
    }),

  getComments: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ input }) => {
      return getDocumentComments(input.documentId);
    }),

  updateComment: protectedProcedure
    .input(
      z.object({
        commentId: z.number(),
        content: z.string().optional(),
        resolved: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await updateComment(input.commentId, {
        content: input.content,
        resolved: input.resolved,
      });

      return { success: true };
    }),

  deleteComment: protectedProcedure
    .input(z.object({ commentId: z.number() }))
    .mutation(async ({ input }) => {
      await deleteComment(input.commentId);
      return { success: true };
    }),

  uploadAttachment: protectedProcedure
    .input(
      z.object({
        documentId: z.number(),
        fileName: z.string(),
        fileData: z.string(),
        mimeType: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const doc = await getDocumentById(input.documentId);
      if (!doc) throw new Error("Document not found");

      const mimeType = input.mimeType || "application/octet-stream";
      if (!ALLOWED_ATTACHMENT_TYPES.includes(mimeType)) {
        throw new Error(
          `Unsupported file type: ${mimeType}. Allowed: images, PDF, PPT/PPTX`
        );
      }

      const buffer = Buffer.from(input.fileData, "base64");
      if (buffer.length > MAX_ATTACHMENT_SIZE) {
        throw new Error(
          `File size exceeds maximum of 20MB. Size: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`
        );
      }

      const { key, url } = await storagePut(
        `documents/${input.documentId}/${input.fileName}`,
        buffer,
        mimeType
      );

      const result = await createAttachment({
        documentId: input.documentId,
        fileName: input.fileName,
        fileKey: key,
        fileUrl: url,
        mimeType,
        uploadedBy: ctx.user.id,
      });

      return { id: result.id, url, mimeType, fileName: input.fileName };
    }),

  getAttachments: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ input }) => {
      return getDocumentAttachments(input.documentId);
    }),

  deleteAttachment: protectedProcedure
    .input(z.object({ attachmentId: z.number() }))
    .mutation(async ({ input }) => {
      await deleteAttachment(input.attachmentId);
      return { success: true };
    }),

  getNotes: protectedProcedure
    .input(
      z.object({
        documentId: z.number(),
        locale: localeSchema.optional(),
      })
    )
    .query(async ({ input }) => {
      return getDocumentNotes(input.documentId, input.locale);
    }),

  createNote: protectedProcedure
    .input(
      z.object({
        documentId: z.number(),
        locale: localeSchema,
        content: z.string().min(1),
        position: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const doc = await getDocumentById(input.documentId);
      if (!doc) throw new Error("Document not found");

      const note = await createDocumentNote({
        documentId: input.documentId,
        locale: input.locale,
        authorId: ctx.user.id,
        content: input.content,
        position: input.position,
      });

      return { id: note.id, noteNumber: note.noteNumber };
    }),

  updateNote: protectedProcedure
    .input(
      z.object({
        noteId: z.number(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      await updateDocumentNote(input.noteId, { content: input.content });
      return { success: true };
    }),

  deleteNote: protectedProcedure
    .input(z.object({ noteId: z.number() }))
    .mutation(async ({ input }) => {
      await deleteDocumentNote(input.noteId);
      return { success: true };
    }),

  getFileNotes: protectedProcedure
    .input(
      z.object({
        documentId: z.number(),
        locale: localeSchema.optional(),
      })
    )
    .query(async ({ input }) => {
      return getDocumentFileNotes(input.documentId, input.locale);
    }),

  createFileNote: protectedProcedure
    .input(
      z.object({
        documentId: z.number(),
        locale: localeSchema,
        embeddedId: z.string().min(1),
        fileUrl: z.string().min(1),
        fileName: z.string().min(1),
        fileType: z.enum(["pdf", "ppt"]),
        pageNumber: z.number().int().min(1),
        xPercent: z.number().min(0).max(100),
        yPercent: z.number().min(0).max(100),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const doc = await getDocumentById(input.documentId);
      if (!doc) throw new Error("Document not found");

      const note = await createDocumentFileNote({
        documentId: input.documentId,
        locale: input.locale,
        authorId: ctx.user.id,
        embeddedId: input.embeddedId,
        fileUrl: input.fileUrl,
        fileName: input.fileName,
        fileType: input.fileType,
        pageNumber: input.pageNumber,
        xPercent: input.xPercent,
        yPercent: input.yPercent,
        content: input.content,
      });

      return { id: note.id, noteNumber: note.noteNumber };
    }),

  updateFileNote: protectedProcedure
    .input(
      z
        .object({
          noteId: z.number(),
          content: z.string().min(1).optional(),
          xPercent: z.number().min(0).max(100).optional(),
          yPercent: z.number().min(0).max(100).optional(),
          pageNumber: z.number().int().min(1).optional(),
        })
        .refine(
          (data) =>
            data.content !== undefined ||
            data.xPercent !== undefined ||
            data.yPercent !== undefined ||
            data.pageNumber !== undefined,
          { message: "At least one field to update is required" }
        )
    )
    .mutation(async ({ input }) => {
      const { noteId, ...updateData } = input;
      await updateDocumentFileNote(noteId, updateData);
      return { success: true };
    }),

  deleteFileNote: protectedProcedure
    .input(z.object({ noteId: z.number() }))
    .mutation(async ({ input }) => {
      await deleteDocumentFileNote(input.noteId);
      return { success: true };
    }),
});
