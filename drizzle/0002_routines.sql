CREATE TYPE "public"."routine_frequency" AS ENUM('diaria', 'semanal');--> statement-breakpoint
CREATE TYPE "public"."routine_exception_kind" AS ENUM('saltar', 'cambiar');--> statement-breakpoint
CREATE TABLE "routine_exceptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"routine_id" integer NOT NULL,
	"date" date NOT NULL,
	"kind" "routine_exception_kind" NOT NULL,
	"new_date" date,
	"new_time" time
);
--> statement-breakpoint
CREATE TABLE "routine_logs" (
	"routine_id" integer NOT NULL,
	"date" date NOT NULL,
	"done_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "routine_logs_routine_id_date_pk" PRIMARY KEY("routine_id","date")
);
--> statement-breakpoint
CREATE TABLE "routine_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"routine_id" integer NOT NULL,
	"time" time,
	"frequency" "routine_frequency" NOT NULL,
	"interval" smallint DEFAULT 1 NOT NULL,
	"weekdays" smallint[] DEFAULT '{}' NOT NULL,
	"anchor" date NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date
);
--> statement-breakpoint
CREATE TABLE "routines" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"track_streak" boolean DEFAULT true NOT NULL,
	"area" "area",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" date
);
--> statement-breakpoint
ALTER TABLE "routine_exceptions" ADD CONSTRAINT "routine_exceptions_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_logs" ADD CONSTRAINT "routine_logs_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_slots" ADD CONSTRAINT "routine_slots_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "routine_exceptions_routine_date_idx" ON "routine_exceptions" USING btree ("routine_id","date");--> statement-breakpoint
CREATE INDEX "routine_slots_routine_idx" ON "routine_slots" USING btree ("routine_id");