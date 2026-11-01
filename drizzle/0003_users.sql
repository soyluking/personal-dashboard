CREATE TYPE "public"."experience" AS ENUM('ejecutiva', 'juego');--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"experience" "experience" DEFAULT 'juego' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "routines" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "weekly_notes" ADD COLUMN "user_id" integer;--> statement-breakpoint
-- Los datos de antes del multiusuario son del dueño. Su correo no entra al repo: queda un
-- correo provisional que nunca puede entrar, y `npm run db:claim-owner` pone el de verdad.
INSERT INTO "users" ("email", "experience")
SELECT 'dueno@pendiente.invalid', 'ejecutiva'
WHERE EXISTS (SELECT 1 FROM "tasks") OR EXISTS (SELECT 1 FROM "routines") OR EXISTS (SELECT 1 FROM "weekly_notes");--> statement-breakpoint
UPDATE "tasks" SET "user_id" = (SELECT "id" FROM "users" WHERE "email" = 'dueno@pendiente.invalid');--> statement-breakpoint
UPDATE "routines" SET "user_id" = (SELECT "id" FROM "users" WHERE "email" = 'dueno@pendiente.invalid');--> statement-breakpoint
UPDATE "weekly_notes" SET "user_id" = (SELECT "id" FROM "users" WHERE "email" = 'dueno@pendiente.invalid');--> statement-breakpoint
ALTER TABLE "routines" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "weekly_notes" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
DROP INDEX "tasks_date_idx";--> statement-breakpoint
ALTER TABLE "weekly_notes" DROP CONSTRAINT "weekly_notes_week_start_area_pk";--> statement-breakpoint
ALTER TABLE "weekly_notes" ADD CONSTRAINT "weekly_notes_user_id_week_start_area_pk" PRIMARY KEY("user_id","week_start","area");--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_notes" ADD CONSTRAINT "weekly_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_user_date_idx" ON "tasks" USING btree ("user_id","date");
