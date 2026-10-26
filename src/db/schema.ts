import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Las 8 formas de riqueza de Robin Sharma.
export const areaEnum = pgEnum("area", [
  "crecimiento",
  "bienestar",
  "familia",
  "trabajo",
  "dinero",
  "comunidad",
  "aventura",
  "servicio",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "pendiente",
  "hecha",
  "descartada",
]);

export const routineKindEnum = pgEnum("routine_kind", ["habito", "compromiso"]);

export const exceptionKindEnum = pgEnum("exception_kind", [
  "otra_hora",
  "saltar",
  "mover",
]);

export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    text: text("text").notNull(),
    area: areaEnum("area"),
    // Sin fecha = bandeja.
    date: date("date", { mode: "string" }),
    time: time("time"),
    status: taskStatusEnum("status").notNull().default("pendiente"),
    postponements: integer("postponements").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("tasks_date_idx").on(t.date)],
);

export const routineItems = pgTable("routine_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  kind: routineKindEnum("kind").notNull(),
  area: areaEnum("area"),
  time: time("time"),
  // Días ISO: 1 = lunes … 7 = domingo.
  weekdays: smallint("weekdays").array().notNull(),
  // Semana por medio se cuenta desde esta fecha; null = cada semana.
  biweeklyFrom: date("biweekly_from", { mode: "string" }),
  // La edición vale desde esta fecha en adelante.
  activeFrom: date("active_from", { mode: "string" }).notNull(),
  archived: boolean("archived").notNull().default(false),
});

export const routineExceptions = pgTable(
  "routine_exceptions",
  {
    id: serial("id").primaryKey(),
    itemId: integer("item_id")
      .notNull()
      .references(() => routineItems.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    kind: exceptionKindEnum("kind").notNull(),
    // otra_hora: nueva hora; mover: nueva fecha.
    newTime: time("new_time"),
    newDate: date("new_date", { mode: "string" }),
  },
  (t) => [uniqueIndex("routine_exceptions_item_date_idx").on(t.itemId, t.date)],
);

// Cumplimiento de un elemento de rutina en un día; de aquí salen las rachas.
export const routineLogs = pgTable(
  "routine_logs",
  {
    itemId: integer("item_id")
      .notNull()
      .references(() => routineItems.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    done: boolean("done").notNull().default(true),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.date] })],
);

export const weeklyNotes = pgTable(
  "weekly_notes",
  {
    // Lunes de la semana.
    weekStart: date("week_start", { mode: "string" }).notNull(),
    area: areaEnum("area").notNull(),
    score: smallint("score").notNull(),
  },
  (t) => [primaryKey({ columns: [t.weekStart, t.area] })],
);
