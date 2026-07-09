CREATE TABLE "documentFileNotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"documentId" integer NOT NULL,
	"locale" "document_locale" NOT NULL,
	"authorId" integer NOT NULL,
	"embeddedId" varchar(64) NOT NULL,
	"fileUrl" varchar(512) NOT NULL,
	"fileName" varchar(255) NOT NULL,
	"fileType" varchar(8) NOT NULL,
	"pageNumber" integer DEFAULT 1 NOT NULL,
	"xPercent" real NOT NULL,
	"yPercent" real NOT NULL,
	"content" text NOT NULL,
	"noteNumber" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documentFileNotes" ADD CONSTRAINT "documentFileNotes_documentId_documents_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentFileNotes" ADD CONSTRAINT "documentFileNotes_authorId_users_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;