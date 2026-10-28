"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Distancia que confirma el gesto, ancho del panel de acciones y franja del borde donde iOS usa «atrás».
const TRIGGER = 72;
const ACTIONS_W = 176;
const EDGE = 24;

type Props = {
  enabled: boolean;
  onComplete: () => void;
  onPostpone: () => void;
  onDiscard: () => void;
  children: ReactNode;
};

// Derecha completa; izquierda abre «Postergar» y «Descartar». Solo con el dedo: con mouse no tiene sentido arrastrar.
export function SwipeRow({ enabled, onComplete, onPostpone, onDiscard, children }: Props) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [open, setOpen] = useState(false);
  const start = useRef<{ x: number; y: number; base: number; axis: "x" | "y" | null } | null>(null);
  const moved = useRef(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = () => {
    setOpen(false);
    setDx(0);
  };

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!enabled || e.pointerType === "mouse") return;
    start.current = { x: e.clientX, y: e.clientY, base: open ? -ACTIONS_W : 0, axis: null };
    moved.current = false;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const ddx = e.clientX - s.x;
    const ddy = e.clientY - s.y;
    if (!s.axis) {
      if (Math.hypot(ddx, ddy) < 8) return;
      s.axis = Math.abs(ddx) > Math.abs(ddy) ? "x" : "y";
      if (s.axis === "x") {
        if (s.base === 0 && ddx > 0 && s.x < EDGE) {
          start.current = null;
          return;
        }
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
      }
    }
    if (s.axis !== "x") return;
    moved.current = true;
    setDx(Math.max(-ACTIONS_W - 24, Math.min(120, s.base + ddx)));
  };

  const onPointerUp = () => {
    const s = start.current;
    start.current = null;
    if (s?.axis !== "x") return;
    setDragging(false);
    if (dx >= TRIGGER && s.base === 0) {
      setDx(0);
      navigator.vibrate?.(12);
      onComplete();
    } else if (dx <= -TRIGGER) {
      setOpen(true);
      setDx(-ACTIONS_W);
    } else {
      close();
    }
  };

  const onPointerCancel = () => {
    start.current = null;
    setDragging(false);
    setDx(open ? -ACTIONS_W : 0);
  };

  const action = "flex flex-1 items-center justify-center text-sm font-medium transition-colors active:brightness-125";

  return (
    <div
      ref={ref}
      className="relative overflow-x-clip rounded-lg"
      style={{ touchAction: enabled ? "pan-y" : undefined }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClickCapture={(e) => {
        // Un arrastre no debe contar como toque (editaría el texto), y tocar la fila abierta solo la cierra.
        if (moved.current || open) {
          e.stopPropagation();
          e.preventDefault();
          moved.current = false;
          if (open) close();
        }
      }}
    >
      {dx > 0 && (
        <div
          aria-hidden
          className={`absolute inset-y-0 left-0 flex items-center rounded-lg pl-4 text-lg transition-colors ${
            dx >= TRIGGER ? "bg-green-500/40 text-green-100" : "bg-green-500/15 text-green-300"
          }`}
          style={{ width: dx }}
        >
          ✓
        </div>
      )}
      {dx < 0 && (
        <div className="absolute inset-y-0 right-0 overflow-hidden rounded-lg" style={{ width: -dx }}>
          <div className="absolute inset-y-0 right-0 flex" style={{ width: ACTIONS_W }}>
            <button
              type="button"
              tabIndex={open ? 0 : -1}
              onClick={() => {
                close();
                onPostpone();
              }}
              className={`${action} bg-amber-500/25 text-amber-200`}
            >
              Postergar
            </button>
            <button
              type="button"
              tabIndex={open ? 0 : -1}
              onClick={() => {
                close();
                onDiscard();
              }}
              className={`${action} bg-red-500/25 text-red-200`}
            >
              Descartar
            </button>
          </div>
        </div>
      )}
      {/* Sin transform en reposo: crearía un contexto de apilamiento y taparía los menús «⋯» de la fila de arriba. */}
      <div
        style={dx !== 0 ? { transform: `translateX(${dx}px)` } : undefined}
        className={dragging ? "" : "transition-transform duration-200"}
      >
        {children}
      </div>
    </div>
  );
}
