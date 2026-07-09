import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  InsertUser,
  users,
  documents,
  documentRevisions,
  documentComments,
  documentAttachments,
  documentLocales,
  documentNotes,
  documentFileNotes,
  InsertDocument,
  InsertDocumentRevision,
  InsertDocumentComment,
  InsertDocumentAttachment,
  InsertDocumentLocale,
  InsertDocumentNote,
  InsertDocumentFileNote,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: pg.Pool | null = null;

export async function getDb() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!_db && databaseUrl) {
    try {
      _pool = new pg.Pool({
        connectionString: databaseUrl,
        connectionTimeoutMillis: 5000,
        max: 5,
      });
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _pool = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({
        target: users.openId,
        set: updateSet,
      });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createDocument(data: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [created] = await db.insert(documents).values(data).returning({ id: documents.id });
  return created;
}

export async function getDocumentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listDocuments(filters?: {
  projectCategory?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  try {
    let query = db.select().from(documents);

    if (filters?.projectCategory) {
      query = query.where(eq(documents.projectCategory, filters.projectCategory)) as typeof query;
    }

    if (filters?.limit) {
      query = query.limit(filters.limit).offset(filters.offset || 0) as typeof query;
    }

    return await query;
  } catch (error) {
    console.warn("[Database] Failed to list documents:", error);
    return [];
  }
}

export async function updateDocument(id: number, data: Partial<InsertDocument>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(documents).set(data).where(eq(documents.id, id));
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.delete(documents).where(eq(documents.id, id));
}

export async function createRevision(data: InsertDocumentRevision) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [created] = await db
    .insert(documentRevisions)
    .values(data)
    .returning({ id: documentRevisions.id });
  return created;
}

export async function getDocumentRevisions(documentId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(documentRevisions)
    .where(eq(documentRevisions.documentId, documentId));
}

export async function getRevisionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(documentRevisions)
    .where(eq(documentRevisions.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createComment(data: InsertDocumentComment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [created] = await db
    .insert(documentComments)
    .values(data)
    .returning({ id: documentComments.id });
  return created;
}

export async function getDocumentComments(documentId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(documentComments)
    .where(eq(documentComments.documentId, documentId));
}

export async function updateComment(id: number, data: Partial<InsertDocumentComment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(documentComments).set(data).where(eq(documentComments.id, id));
}

export async function deleteComment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.delete(documentComments).where(eq(documentComments.id, id));
}

export async function createAttachment(data: InsertDocumentAttachment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [created] = await db
    .insert(documentAttachments)
    .values(data)
    .returning({ id: documentAttachments.id });
  return created;
}

export async function getDocumentAttachments(documentId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(documentAttachments)
    .where(eq(documentAttachments.documentId, documentId));
}

export async function deleteAttachment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.delete(documentAttachments).where(eq(documentAttachments.id, id));
}

export async function getDocumentLocales(documentId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(documentLocales)
    .where(eq(documentLocales.documentId, documentId));
}

export async function upsertDocumentLocale(data: InsertDocumentLocale) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [row] = await db
    .insert(documentLocales)
    .values(data)
    .onConflictDoUpdate({
      target: [documentLocales.documentId, documentLocales.locale],
      set: {
        title: data.title,
        content: data.content,
      },
    })
    .returning();

  return row;
}

export async function upsertDocumentLocales(
  documentId: number,
  locales: Array<{ locale: "en" | "vi" | "ko"; title: string; content: string }>
) {
  const results = [];
  for (const locale of locales) {
    results.push(
      await upsertDocumentLocale({
        documentId,
        locale: locale.locale,
        title: locale.title,
        content: locale.content,
      })
    );
  }
  return results;
}

export async function getDocumentNotes(documentId: number, locale?: "en" | "vi" | "ko") {
  const db = await getDb();
  if (!db) return [];

  if (locale) {
    return db
      .select()
      .from(documentNotes)
      .where(and(eq(documentNotes.documentId, documentId), eq(documentNotes.locale, locale)));
  }

  return db.select().from(documentNotes).where(eq(documentNotes.documentId, documentId));
}

export async function createDocumentNote(data: InsertDocumentNote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getDocumentNotes(data.documentId, data.locale);
  const noteNumber = data.noteNumber ?? existing.length + 1;

  const [created] = await db
    .insert(documentNotes)
    .values({ ...data, noteNumber })
    .returning();

  return created;
}

export async function updateDocumentNote(
  id: number,
  data: Partial<Pick<InsertDocumentNote, "content">>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [updated] = await db
    .update(documentNotes)
    .set(data)
    .where(eq(documentNotes.id, id))
    .returning();

  return updated;
}

export async function deleteDocumentNote(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.delete(documentNotes).where(eq(documentNotes.id, id));
}

export async function getDocumentFileNotes(
  documentId: number,
  locale?: "en" | "vi" | "ko"
) {
  const db = await getDb();
  if (!db) return [];

  if (locale) {
    return db
      .select()
      .from(documentFileNotes)
      .where(
        and(eq(documentFileNotes.documentId, documentId), eq(documentFileNotes.locale, locale))
      );
  }

  return db
    .select()
    .from(documentFileNotes)
    .where(eq(documentFileNotes.documentId, documentId));
}

export async function createDocumentFileNote(data: InsertDocumentFileNote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(documentFileNotes)
    .where(
      and(
        eq(documentFileNotes.documentId, data.documentId),
        eq(documentFileNotes.embeddedId, data.embeddedId)
      )
    );

  const noteNumber = data.noteNumber ?? existing.length + 1;

  const [created] = await db
    .insert(documentFileNotes)
    .values({ ...data, noteNumber })
    .returning();

  return created;
}

export async function updateDocumentFileNote(
  id: number,
  data: Partial<Pick<InsertDocumentFileNote, "content">>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [updated] = await db
    .update(documentFileNotes)
    .set(data)
    .where(eq(documentFileNotes.id, id))
    .returning();

  return updated;
}

export async function deleteDocumentFileNote(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.delete(documentFileNotes).where(eq(documentFileNotes.id, id));
}
