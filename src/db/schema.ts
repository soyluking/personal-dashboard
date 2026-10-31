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

export const frequencyEnum = pgEnum("routine_frequency", ["diaria", "semanal"]);

export const routineExceptionKindEnum = pgEnum("routine_exception_kind", [
  "saltar",
  "cambiar",
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

// La identidad de un elemento de rutina. Nombre, área y racha valen para toda su historia.
export const routines = pgTable("routines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  trackStreak: boolean("track_streak").notNull().default(true),
  area: areaEnum("area"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Archivar también cierra sus horarios; esto solo la saca de la lista.
  archivedAt: date("archived_at", { mode: "string" }),
});

// Cuándo toca una rutina, con versiones: editar «desde un día» cierra el
// horario vigente y abre otro, así el pasado se sigue calculando igual.
export const routineSlots = pgTable(
  "routine_slots",
  {
    id: serial("id").primaryKey(),
    routineId: integer("routine_id")
      .notNull()
      .references(() => routines.id, { onDelete: "cascade" }),
    time: time("time"),
    frequency: frequencyEnum("frequency").notNull(),
    // Cada N días o semanas.
    interval: smallint("interval").notNull().default(1),
    // Días ISO de la semanal: 1 = lunes … 7 = domingo.
    weekdays: smallint("weekdays").array().notNull().default([]),
    // Desde dónde se cuenta el «cada N».
    anchor: date("anchor", { mode: "string" }).notNull(),
    validFrom: date("valid_from", { mode: "string" }).notNull(),
    // Inclusive; null = sigue vigente.
    validTo: date("valid_to", { mode: "string" }),
  },
  (t) => [index("routine_slots_routine_idx").on(t.routineId)],
);

// Una ocurrencia distinta sin tocar el horario, identificada por su fecha original.
export const routineExceptions = pgTable(
  "routine_exceptions",
  {
    id: serial("id").primaryKey(),
    routineId: integer("routine_id")
      .notNull()
      .references(() => routines.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    kind: routineExceptionKindEnum("kind").notNull(),
    // cambiar: nueva fecha y/o nueva hora.
    newDate: date("new_date", { mode: "string" }),
    newTime: time("new_time"),
  },
  (t) => [
    uniqueIndex("routine_exceptions_routine_date_idx").on(t.routineId, t.date),
  ],
);

// Existir = hecha. La fecha es la original de la ocurrencia; de aquí salen las rachas.
export const routineLogs = pgTable(
  "routine_logs",
  {
    routineId: integer("routine_id")
      .notNull()
      .references(() => routines.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    doneAt: timestamp("done_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.routineId, t.date] })],
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
