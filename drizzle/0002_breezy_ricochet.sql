CREATE TABLE IF NOT EXISTS "klark_file" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"user_id" text NOT NULL,
	"message_id" text,
	"file_name" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"s3_key" text NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "klark_file" ADD CONSTRAINT "klark_file_chat_id_klark_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."klark_chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "klark_file" ADD CONSTRAINT "klark_file_user_id_klark_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."klark_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "klark_file" ADD CONSTRAINT "klark_file_message_id_klark_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."klark_message"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
