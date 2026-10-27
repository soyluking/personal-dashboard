CREATE TYPE "public"."area" AS ENUM('crecimiento', 'bienestar', 'familia', 'trabajo', 'dinero', 'comunidad', 'aventura', 'servicio');--> statement-breakpoint
CREATE TYPE "public"."exception_kind" AS ENUM('otra_hora', 'saltar', 'mover');--> statement-breakpoint
CREATE TYPE "public"."routine_kind" AS ENUM('habito', 'compromiso');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('pendiente', 'hecha', 'descartada');--> statement-breakpoint
CREATE TABLE "routine_exceptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"date" date NOT NULL,
	"kind" "exception_kind" NOT NULL,
	"new_time" time,
	"new_date" date
);
--> statement-breakpoint
CREATE TABLE "routine_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" "routine_kind" NOT NULL,
	"area" "area",
	"time" time,
	"weekdays" smallint[] NOT NULL,
	"biweekly_from" date,
	"active_from" date NOT NULL,
	"archived" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routine_logs" (
	"item_id" integer NOT NULL,
	"date" date NOT NULL,
	"done" boolean DEFAULT true NOT NULL,
	CONSTRAINT "routine_logs_item_id_date_pk" PRIMARY KEY("item_id","date")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"area" "area",
	"date" date,
	"time" time,
	"status" "task_status" DEFAULT 'pendiente' NOT NULL,
	"postponements" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_notes" (
	"week_start" date NOT NULL,
	"area" "area" NOT NULL,
	"score" smallint NOT NULL,
	CONSTRAINT "weekly_notes_week_start_area_pk" PRIMARY KEY("week_start","area")
);
--> statement-breakpoint
ALTER TABLE "routine_exceptions" ADD CONSTRAINT "routine_exceptions_item_id_routine_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."routine_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_logs" ADD CONSTRAINT "routine_logs_item_id_routine_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."routine_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "routine_exceptions_item_date_idx" ON "routine_exceptions" USING btree ("item_id","date");--> statement-breakpoint
CREATE INDEX "tasks_date_idx" ON "tasks" USING btree ("date");