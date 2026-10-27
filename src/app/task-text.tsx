"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { parseEdit } from "@/lib/parse-capture";
import { editTask } from "./actions";

type Props = { id: number; text: string; time: string | null; done?: boolean };

// Texto de una tarea que se edita con un clic. Acepta el mismo formato de la captura:
// «llamar al banco 16:00» cambia texto y hora; «mañana» la mueve de día.
export function TaskText({ id, text, time, done }: Props) {
  const [editing, setEditing] = useState(false);
  const [shown, setShown] = useOptimistic(text);
  const [, startTransition] = useTransition();
  const cancelled = useRef(false);

  const initial = time ? `${text} ${time.slice(0, 5)}` : text;

  const save = (value: string) => {
    setEditing(false);
    if (cancelled.current || !value.trim() || value.trim() === initial) return;
    startTransition(async () => {
      // Mientras guarda, el texto sin la fecha ni la hora escritas (la fecha base no importa aquí).
      setShown(parseEdit(value, null, "2000-01-01").text);
      await editTask(id, value);
    });
  };

  if (editing) {
    return (
      <input
        autoFocus
        defaultValue={initial}
        aria-label="Editar tarea"
        onFocus={(e) => {
          cancelled.current = false;
          e.currentTarget.select();
        }}
        onBlur={(e) => save(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            cancelled.current = true;
            e.currentTarget.blur();
          }
        }}
        className="min-w-0 flex-1 rounded-md border border-line-strong bg-surface px-2 py-0.5 text-base outline-none"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="Editar"
      className={`min-w-0 flex-1 text-left ${done ? "text-muted line-through" : ""}`}
    >
      {shown}
    </button>
  );
}
