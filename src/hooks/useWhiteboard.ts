"use client";

import { useEffect, useRef, useState } from "react";
import { Pt, Shape, Tool, hitTest, uid } from "@/lib/whiteboard";

export function useWhiteboard(lessonId: string) {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [draft, setDraft] = useState<Shape | null>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#1e3a8a");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [past, setPast] = useState<Shape[][]>([]);
  const [future, setFuture] = useState<Shape[][]>([]);
  const startRef = useRef<Pt | null>(null);

  // Загрузка доски: сначала API, потом localStorage
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/lessons/${lessonId}/board`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.shapes) && data.shapes.length > 0) {
            setShapes(data.shapes);
            return;
          }
        }
      } catch {}
      try {
        const local = localStorage.getItem(`board:${lessonId}`);
        if (local) setShapes(JSON.parse(local));
      } catch {}
    })();
  }, [lessonId]);

  const commit = (next: Shape[]) => {
    setPast((p) => [...p, shapes]);
    setFuture([]);
    setShapes(next);
  };

  const undo = () => {
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [...f, shapes]);
    setShapes(prev);
  };

  const redo = () => {
    if (future.length === 0) return;
    const next = future[future.length - 1];
    setFuture((f) => f.slice(0, -1));
    setPast((p) => [...p, shapes]);
    setShapes(next);
  };

  const eraseAt = (pt: Pt) => {
    const next = shapes.filter((s) => !hitTest(s, pt.x, pt.y, 10));
    if (next.length !== shapes.length) commit(next);
  };

  const start = (pt: Pt) => {
    startRef.current = pt;
    if (tool === "eraser") return eraseAt(pt);
    if (tool === "text") return; // текст обрабатывает Canvas
    const base = { id: uid(), stroke: color, strokeWidth };
    let d: Shape;
    switch (tool) {
      case "pen": d = { ...base, type: "pen", points: [pt.x, pt.y] }; break;
      case "line": d = { ...base, type: "line", start: pt, end: pt }; break;
      case "arrow": d = { ...base, type: "arrow", start: pt, end: pt }; break;
      case "rect": d = { ...base, type: "rect", x: pt.x, y: pt.y, width: 0, height: 0 }; break;
      case "ellipse": d = { ...base, type: "ellipse", x: pt.x, y: pt.y, radiusX: 0, radiusY: 0 }; break;
      default: return;
    }
    setDraft(d);
  };

  const move = (pt: Pt) => {
    if (tool === "eraser") return eraseAt(pt);
    if (!draft) return;
    setDraft((d) => {
      if (!d) return d;
      switch (d.type) {
        case "pen": return { ...d, points: [...d.points, pt.x, pt.y] };
        case "line":
        case "arrow": return { ...d, end: pt };
        case "rect": return { ...d, width: pt.x - d.x, height: pt.y - d.y };
        case "ellipse": {
          const s = startRef.current!;
          return {
            ...d,
            x: (s.x + pt.x) / 2,
            y: (s.y + pt.y) / 2,
            radiusX: Math.abs(pt.x - s.x) / 2,
            radiusY: Math.abs(pt.y - s.y) / 2,
          };
        }
        default: return d;
      }
    });
  };

  const end = () => {
    if (draft) {
      commit([...shapes, draft]);
      setDraft(null);
    }
  };

  const addText = (pt: Pt, text: string) => {
    if (!text.trim()) return;
    commit([...shapes, { id: uid(), type: "text", x: pt.x, y: pt.y, text: text.trim(), stroke: color, fontSize: 16 + strokeWidth * 2 }]);
  };

  const clear = () => {
    if (shapes.length > 0) commit([]);
  };

  const save = async () => {
    try {
      localStorage.setItem(`board:${lessonId}`, JSON.stringify(shapes));
    } catch {}
    try {
      await fetch(`/api/lessons/${lessonId}/board`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shapes),
      });
    } catch {}
  };

  return {
    shapes, draft, tool, setTool, color, setColor, strokeWidth, setStrokeWidth,
    start, move, end, addText, undo, redo, clear, save,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}

export type WhiteboardState = ReturnType<typeof useWhiteboard>;