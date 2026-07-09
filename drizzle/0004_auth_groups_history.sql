ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" varchar(255);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documentGroups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "documentGroups_name_unique" UNIQUE("name")
);--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "groupId" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_groupId_documentGroups_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."documentGroups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
INSERT INTO "documentGroups" ("name", "description", "sortOrder")
VALUES
  ('Backend', 'Backend services and APIs', 1),
  ('Frontend', 'Frontend applications', 2),
  ('DevOps', 'Infrastructure and deployment', 3),
  ('Design', 'UI/UX and design docs', 4),
  ('Product', 'Product requirements', 5)
ON CONFLICT ("name") DO NOTHING;
