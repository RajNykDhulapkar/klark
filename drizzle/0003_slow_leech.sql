ALTER TABLE "klark_file" DROP CONSTRAINT "klark_file_message_id_klark_message_id_fk";
--> statement-breakpoint
ALTER TABLE "klark_file" DROP COLUMN IF EXISTS "message_id";