import {
  integer,
  pgEnum,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("role", ["user", "admin"]);
export const documentLocaleEnum = pgEnum("document_locale", ["en", "vi", "ko"]);

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignedIn: timestamp("lastSignedIn", { mode: "date" }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  content: text("content").notNull(),
  projectCategory: varchar("projectCategory", { length: 255 }).notNull(),
  createdBy: integer("createdBy")
    .notNull()
    .references(() => users.id),
  updatedBy: integer("updatedBy")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

export const documentRevisions = pgTable("documentRevisions", {
  id: serial("id").primaryKey(),
  documentId: integer("documentId")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  changedBy: integer("changedBy")
    .notNull()
    .references(() => users.id),
  changeDescription: varchar("changeDescription", { length: 500 }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export type DocumentRevision = typeof documentRevisions.$inferSelect;
export type InsertDocumentRevision = typeof documentRevisions.$inferInsert;

export const documentComments = pgTable("documentComments", {
  id: serial("id").primaryKey(),
  documentId: integer("documentId")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  authorId: integer("authorId")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  position: integer("position"),
  selectionEnd: integer("selectionEnd"),
  resolved: integer("resolved").default(0),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type DocumentComment = typeof documentComments.$inferSelect;
export type InsertDocumentComment = typeof documentComments.$inferInsert;

export const documentAttachments = pgTable("documentAttachments", {
  id: serial("id").primaryKey(),
  documentId: integer("documentId")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  uploadedBy: integer("uploadedBy")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export type DocumentAttachment = typeof documentAttachments.$inferSelect;
export type InsertDocumentAttachment = typeof documentAttachments.$inferInsert;

export const documentLocales = pgTable(
  "documentLocales",
  {
    id: serial("id").primaryKey(),
    documentId: integer("documentId")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    locale: documentLocaleEnum("locale").notNull(),
    title: varchar("title", { length: 255 }).notNull().default(""),
    content: text("content").notNull().default(""),
    updatedAt: timestamp("updatedAt", { mode: "date" })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    documentLocaleUnique: unique().on(table.documentId, table.locale),
  })
);

export type DocumentLocale = typeof documentLocales.$inferSelect;
export type InsertDocumentLocale = typeof documentLocales.$inferInsert;

export const documentNotes = pgTable("documentNotes", {
  id: serial("id").primaryKey(),
  documentId: integer("documentId")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  locale: documentLocaleEnum("locale").notNull(),
  authorId: integer("authorId")
    .notNull()
    .references(() => users.id),
  position: integer("position").notNull(),
  content: text("content").notNull(),
  noteNumber: integer("noteNumber").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type DocumentNote = typeof documentNotes.$inferSelect;
export type InsertDocumentNote = typeof documentNotes.$inferInsert;

export const documentFileNotes = pgTable("documentFileNotes", {
  id: serial("id").primaryKey(),
  documentId: integer("documentId")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  locale: documentLocaleEnum("locale").notNull(),
  authorId: integer("authorId")
    .notNull()
    .references(() => users.id),
  embeddedId: varchar("embeddedId", { length: 64 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 512 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: varchar("fileType", { length: 8 }).notNull(),
  pageNumber: integer("pageNumber").notNull().default(1),
  xPercent: real("xPercent").notNull(),
  yPercent: real("yPercent").notNull(),
  content: text("content").notNull(),
  noteNumber: integer("noteNumber").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type DocumentFileNote = typeof documentFileNotes.$inferSelect;
export type InsertDocumentFileNote = typeof documentFileNotes.$inferInsert;
