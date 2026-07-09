import { eq, and, asc, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  InsertUser,
  users,
  documents,
  documentGroups,
  documentRevisions,
  documentComments,
  documentAttachments,
  documentLocales,
  documentNotes,
  documentFileNotes,
  InsertDocument,
  InsertDocumentGroup,
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

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;

  const normalized = email.trim().toLowerCase();
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, normalized))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function countUsers() {
  const db = await getDb();
  if (!db) return 0;

  const result = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  return result[0]?.count ?? 0;
}

export async function listUsers() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(users).orderBy(asc(users.name), asc(users.email));
}

export async function createLocalUser(data: {
  email: string;
  name: string;
  passwordHash: string;
  role?: "user" | "admin";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const email = data.email.trim().toLowerCase();
  const openId = `local:${email}`;

  const [created] = await db
    .insert(users)
    .values({
      openId,
      email,
      name: data.name,
      passwordHash: data.passwordHash,
      loginMethod: "local",
      role: data.role ?? "user",
      lastSignedIn: new Date(),
    })
    .returning();

  return created;
}

export async function updateUser(
  id: number,
  data: Partial<Pick<InsertUser, "name" | "email" | "role">>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
  return updated;
}

export async function updateUserPassword(id: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [updated] = await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, id))
    .returning();

  return updated;
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(users).where(eq(users.id, id));
}

export async function listDocumentGroups() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(documentGroups).orderBy(asc(documentGroups.sortOrder), asc(documentGroups.name));
}

export async function getDocumentGroupById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(documentGroups).where(eq(documentGroups.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getDocumentGroupByName(name: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(documentGroups).where(eq(documentGroups.name, name)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createDocumentGroup(data: InsertDocumentGroup) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [created] = await db.insert(documentGroups).values(data).returning();
  return created;
}

export async function updateDocumentGroup(
  id: number,
  data: Partial<Pick<InsertDocumentGroup, "name" | "description" | "sortOrder">>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [updated] = await db.update(documentGroups).set(data).where(eq(documentGroups.id, id)).returning();
  return updated;
}

export async function deleteDocumentGroup(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(documents).set({ groupId: null }).where(eq(documents.groupId, id));
  await db.delete(documentGroups).where(eq(documentGroups.id, id));
}

export async function countDocumentsInGroup(groupId: number) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documents)
    .where(eq(documents.groupId, groupId));

  return result[0]?.count ?? 0;
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
  groupId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  try {
    let query = db.select().from(documents);

    if (filters?.groupId) {
      query = query.where(eq(documents.groupId, filters.groupId)) as typeof query;
    } else if (filters?.projectCategory) {
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
    .select({
      id: documentRevisions.id,
      documentId: documentRevisions.documentId,
      content: documentRevisions.content,
      title: documentRevisions.title,
      changedBy: documentRevisions.changedBy,
      changeDescription: documentRevisions.changeDescription,
      createdAt: documentRevisions.createdAt,
      changedByName: users.name,
      changedByEmail: users.email,
    })
    .from(documentRevisions)
    .leftJoin(users, eq(documentRevisions.changedBy, users.id))
    .where(eq(documentRevisions.documentId, documentId))
    .orderBy(desc(documentRevisions.createdAt));
}

export async function getRevisionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select({
      id: documentRevisions.id,
      documentId: documentRevisions.documentId,
      content: documentRevisions.content,
      title: documentRevisions.title,
      changedBy: documentRevisions.changedBy,
      changeDescription: documentRevisions.changeDescription,
      createdAt: documentRevisions.createdAt,
      changedByName: users.name,
      changedByEmail: users.email,
    })
    .from(documentRevisions)
    .leftJoin(users, eq(documentRevisions.changedBy, users.id))
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
