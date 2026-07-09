CREATE TYPE "public"."document_locale" AS ENUM('en', 'vi', 'ko');--> statement-breakpoint
CREATE TABLE "documentLocales" (
	"id" serial PRIMARY KEY NOT NULL,
	"documentId" integer NOT NULL,
	"locale" "document_locale" NOT NULL,
	"title" varchar(255) DEFAULT '' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "documentLocales_documentId_locale_unique" UNIQUE("documentId","locale")
);
--> statement-breakpoint
ALTER TABLE "documentComments" ADD COLUMN "selectionEnd" integer;--> statement-breakpoint
ALTER TABLE "documentLocales" ADD CONSTRAINT "documentLocales_documentId_documents_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;