CREATE TABLE "documentNotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"documentId" integer NOT NULL,
	"locale" "document_locale" NOT NULL,
	"authorId" integer NOT NULL,
	"position" integer NOT NULL,
	"content" text NOT NULL,
	"noteNumber" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documentNotes" ADD CONSTRAINT "documentNotes_documentId_documents_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentNotes" ADD CONSTRAINT "documentNotes_authorId_users_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;