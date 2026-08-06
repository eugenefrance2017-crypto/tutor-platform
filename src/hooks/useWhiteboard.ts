"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { doc, onSnapshot, setDoc, serverTimestamp, deleteDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Pt, Shape, Tool, hitTest, uid } from "@/lib/whiteboard";

export function useWhiteboard(lessonId: string, role: "teacher" | "student" = "student") {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [draft, setDraft] = useState<Shape | null>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#1e3a8a");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [past, setPast] = useState<Shape[][]>([]);
  const [future, setFuture] = useState<Shape[][]>([]);
  const [studentCanDraw, setStudentCanDraw] = useState(true);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cursors, setCursors] = useState<Record<string, { x: number; y: number; name: string; color: string }>>({});
  const [laserPoints, setLaserPoints] = useState<number[]>([]);
  const [pages, setPages] = useState<Shape[][]>([[]]);
  const [currentPage, setCurrentPage] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStartAt, setTimerStartAt] = useState<number | null>(null);
  const [timerDuration, setTimerDuration] = useState(0);

  const startRef = useRef<Pt | null>(null);
  const isWritingRef = useRef(false);
  const dragOffsetRef = useRef<Pt | null>(null);
  const cursorThrottleRef = useRef<number>(0);
  const laserTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const userId = typeof window !== "undefined" ? localStorage.getItem("uid") || "guest" : "guest";
  const userName = typeof window !== "undefined" ? localStorage.getItem("userName") || "Гость" : "Гость";
  const userColor = (() => {
    if (typeof window === "undefined") return "#ff0000";
    let c = localStorage.getItem("userColor");
    if (!c) {
      c = "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
      localStorage.setItem("userColor", c);
    }
    return c;
  })();

  const canDraw = role === "teacher" ? true : studentCanDraw;

  // Загрузка доски
  useEffect(() => {
    if (!lessonId) return;
    const ref = doc(db, "lessons", lessonId, "board", "state");
    const unsub = onSnapshot(ref, (snap) => {
      if (isWritingRef.current) return;
      if (snap.exists()) {
        const data = snap.data();
        const loadedPages = Array.isArray(data.pages) ? data.pages : (Array.isArray(data.shapes) ? [data.shapes] : [[]]);
        setPages(loadedPages);
        setCurrentPage(typeof data.currentPage === "number" ? data.currentPage : 0);
        if (typeof data.studentCanDraw === "boolean") setStudentCanDraw(data.studentCanDraw);
        if (typeof data.bgUrl === "string") setBgUrl(data.bgUrl);
        if (data.bgUrl === null) setBgUrl(null);
      } else {
        setPages([[]]);
        setCurrentPage(0);
      }
    });
    return () => unsub();
  }, [lessonId]);

  // Текущие shapes = текущая страница
  useEffect(() => {
    setShapes(pages[currentPage] || []);
  }, [pages, currentPage]);

  // Загрузка курсоров
  useEffect(() => {
    if (!lessonId) return;
    const ref = collection(db, "lessons", lessonId, "cursors");
    const unsub = onSnapshot(ref, (snap) => {
      const cursorsMap: Record<string, { x: number; y: number; name: string; color: string }> = {};
      snap.forEach((d) => {
        const data = d.data();
        cursorsMap[d.id] = { x: data.x || 0, y: data.y || 0, name: data.name || "Гость", color: data.color || "#000" };
      });
      setCursors(cursorsMap);
    });
    return () => unsub();
  }, [lessonId]);

  // Удаление курсора при выходе
  useEffect(() => {
    return () => {
      try {
        deleteDoc(doc(db, "lessons", lessonId, "cursors", userId));
      } catch (e) { /* ignore */ }
    };
  }, [lessonId]);

  // Таймер
  useEffect(() => {
    if (!timerRunning || timerStartAt === null) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - timerStartAt) / 1000);
      const remaining = Math.max(0, timerDuration - elapsed);
      setTimerSeconds(remaining);
      if (remaining === 0) {
        setTimerRunning(false);
        setTimerStartAt(null);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [timerRunning, timerStartAt, timerDuration]);

  const patchBoard = async (patch: Record<string, unknown>) => {
    isWritingRef.current = true;
    try {
      await setDoc(doc(db, "lessons", lessonId, "board", "state"), patch, { merge: true });
    } catch (e) {
      console.error("board write failed", e);
    } finally {
      setTimeout(() => { isWritingRef.current = false; }, 50);
    }
  };

  const writePages = (nextPages: Shape[][], nextCurrentPage?: number) => {
    const patch: Record<string, unknown> = { pages: nextPages, updatedAt: serverTimestamp() };
    if (nextCurrentPage !== undefined) patch.currentPage = nextCurrentPage;
    patchBoard(patch);
  };

  const setStudentCanDrawRemote = async (v: boolean) => {
    setStudentCanDraw(v);
    await patchBoard({ studentCanDraw: v });
  };

  const setBackground = async (url: string) => patchBoard({ bgUrl: url });
  const clearBackground = async () => patchBoard({ bgUrl: null });

  const commit = (next: Shape[]) => {
    const newPages = [...pages];
    newPages[currentPage] = next;
    setPast((p) => [...p, shapes]);
    setFuture([]);
    setPages(newPages);
    writePages(newPages);
  };

  const undo = () => {
    if (!canDraw || past.length === 0) return;
    const prev = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [...f, shapes]);
    const newPages = [...pages];
    newPages[currentPage] = prev;
    setPages(newPages);
    writePages(newPages);
  };

  const redo = () => {
    if (!canDraw || future.length === 0) return;
    const next = future[future.length - 1];
    setFuture((f) => f.slice(0, -1));
    setPast((p) => [...p, shapes]);
    const newPages = [...pages];
    newPages[currentPage] = next;
    setPages(newPages);
    writePages(newPages);
  };

  const eraseAt = (pt: Pt) => {
    const next = shapes.filter((s) => !hitTest(s, pt.x, pt.y, 10));
    if (next.length !== shapes.length) commit(next);
  };

  const getShapeCenter = (s: Shape): Pt => {
    switch (s.type) {
      case "pen":
      case "marker": {
        let cx = 0, cy = 0;
        for (let i = 0; i < s.points.length; i += 2) { cx += s.points[i]; cy += s.points[i + 1]; }
        return { x: cx / (s.points.length / 2), y: cy / (s.points.length / 2) };
      }
      case "line":
      case "arrow": return { x: (s.start.x + s.end.x) / 2, y: (s.start.y + s.end.y) / 2 };
      case "rect": return { x: s.x + s.width / 2, y: s.y + s.height / 2 };
      case "ellipse": return { x: s.x, y: s.y };
      case "triangle":
      case "star": return { x: s.x, y: s.y };
      case "text": return { x: s.x, y: s.y };
    }
  };

  const moveShape = (s: Shape, dx: number, dy: number): Shape => {
    switch (s.type) {
      case "pen":
      case "marker": {
        const newPoints = [...s.points];
        for (let i = 0; i < newPoints.length; i += 2) { newPoints[i] += dx; newPoints[i + 1] += dy; }
        return { ...s, points: newPoints };
      }
      case "line":
      case "arrow": return { ...s, start: { x: s.start.x + dx, y: s.start.y + dy }, end: { x: s.end.x + dx, y: s.end.y + dy } };
      case "rect": return { ...s, x: s.x + dx, y: s.y + dy };
      case "ellipse": return { ...s, x: s.x + dx, y: s.y + dy };
      case "triangle":
      case "star": return { ...s, x: s.x + dx, y: s.y + dy };
      case "text": return { ...s, x: s.x + dx, y: s.y + dy };
    }
  };

  const start = (pt: Pt) => {
    if (!canDraw) return;
    if (tool === "hand") return;

    if (tool === "select") {
      const clicked = shapes.find((s) => hitTest(s, pt.x, pt.y, 8));
      if (clicked) {
        setSelectedId(clicked.id);
        dragOffsetRef.current = { x: pt.x - getShapeCenter(clicked).x, y: pt.y - getShapeCenter(clicked).y };
      } else {
        setSelectedId(null);
      }
      return;
    }

    if (tool === "laser") {
      setLaserPoints([pt.x, pt.y]);
      return;
    }

    startRef.current = pt;
    if (tool === "eraser") return eraseAt(pt);
    if (tool === "text") return;
    const base = { id: uid(), stroke: color, strokeWidth };
    let d: Shape;
    switch (tool) {
      case "pen": d = { ...base, type: "pen", points: [pt.x, pt.y] }; break;
      case "marker": d = { ...base, type: "marker", points: [pt.x, pt.y] }; break;
      case "line": d = { ...base, type: "line", start: pt, end: pt }; break;
      case "arrow": d = { ...base, type: "arrow", start: pt, end: pt }; break;
      case "rect": d = { ...base, type: "rect", x: pt.x, y: pt.y, width: 0, height: 0 }; break;
      case "ellipse": d = { ...base, type: "ellipse", x: pt.x, y: pt.y, radiusX: 0, radiusY: 0 }; break;
      case "triangle": d = { ...base, type: "triangle", x: pt.x, y: pt.y, radius: 0 }; break;
      case "star": d = { ...base, type: "star", x: pt.x, y: pt.y, radius: 0 }; break;
      default: return;
    }
    setDraft(d);
  };

  const move = (pt: Pt) => {
    if (!canDraw) return;
    if (tool === "hand") return;

    if (tool === "select" && selectedId && dragOffsetRef.current) {
      const targetX = pt.x - dragOffsetRef.current.x;
      const targetY = pt.y - dragOffsetRef.current.y;
      const next = shapes.map((s) => {
        if (s.id !== selectedId) return s;
        const dx = targetX - getShapeCenter(s).x;
        const dy = targetY - getShapeCenter(s).y;
        return moveShape(s, dx, dy);
      });
      setShapes(next);
      return;
    }

    if (tool === "laser") {
      setLaserPoints((prev) => [...prev, pt.x, pt.y]);
      if (laserTimeoutRef.current) clearTimeout(laserTimeoutRef.current);
      laserTimeoutRef.current = setTimeout(() => setLaserPoints([]), 600);
      return;
    }

    if (tool === "eraser") return eraseAt(pt);
    if (!draft) return;
    setDraft((d) => {
      if (!d) return d;
      switch (d.type) {
        case "pen":
        case "marker": return { ...d, points: [...d.points, pt.x, pt.y] };
        case "line":
        case "arrow": return { ...d, end: pt };
        case "rect": return { ...d, width: pt.x - d.x, height: pt.y - d.y };
        case "ellipse": {
          const s = startRef.current!;
          return { ...d, x: (s.x + pt.x) / 2, y: (s.y + pt.y) / 2, radiusX: Math.abs(pt.x - s.x) / 2, radiusY: Math.abs(pt.y - s.y) / 2 };
        }
        case "triangle":
        case "star": {
          const s = startRef.current!;
          return { ...d, radius: Math.hypot(pt.x - s.x, pt.y - s.y) };
        }
        default: return d;
      }
    });
  };

  const end = () => {
    if (!canDraw) return;
    if (tool === "select") { dragOffsetRef.current = null; return; }
    if (tool === "laser") {
      if (laserTimeoutRef.current) clearTimeout(laserTimeoutRef.current);
      setLaserPoints([]);
      return;
    }
    if (draft) {
      commit([...shapes, draft]);
      setDraft(null);
    }
  };

  const addText = (pt: Pt, text: string) => {
    if (!canDraw || !text.trim()) return;
    commit([...shapes, { id: uid(), type: "text", x: pt.x, y: pt.y, text: text.trim(), stroke: color, fontSize: 16 + strokeWidth * 2 }]);
  };

  const clear = () => {
    if (!canDraw || shapes.length === 0) return;
    commit([]);
  };

  const deleteSelected = () => {
    if (!canDraw || !selectedId) return;
    const next = shapes.filter((s) => s.id !== selectedId);
    setSelectedId(null);
    commit(next);
  };

  const patchCursor = useCallback((pt: Pt) => {
    const now = Date.now();
    if (now - cursorThrottleRef.current < 60) return;
    cursorThrottleRef.current = now;
    try {
      setDoc(doc(db, "lessons", lessonId, "cursors", userId),
        { x: pt.x, y: pt.y, name: userName, color: userColor, updatedAt: serverTimestamp() },
        { merge: true });
    } catch (e) { /* ignore */ }
  }, [lessonId, userId, userName, userColor]);

  // Страницы
  const addPage = () => {
    const newPages = [...pages, []];
    setCurrentPage(newPages.length - 1);
    setPages(newPages);
    writePages(newPages, newPages.length - 1);
  };

  const goToPage = (index: number) => {
    if (index < 0 || index >= pages.length) return;
    setCurrentPage(index);
    patchBoard({ currentPage: index });
  };

  const deletePage = (index: number) => {
    if (pages.length <= 1) return;
    const newPages = pages.filter((_, i) => i !== index);
    const newCurrent = currentPage >= newPages.length ? newPages.length - 1 : currentPage;
    setCurrentPage(newCurrent);
    setPages(newPages);
    writePages(newPages, newCurrent);
  };

  const renamePage = (index: number, name: string) => {
    const newPages = pages.map((p, i) => i === index ? { ...({} as any), _name: name, shapes: p } as any : p);
    // Упрощённо — храним имена в отдельном массиве
    patchBoard({ pageNames: pages.map((_, i) => i === index ? name : `Стр. ${i + 1}`) });
  };

  // Таймер
  const startTimer = (seconds: number) => {
    setTimerDuration(seconds);
    setTimerStartAt(Date.now());
    setTimerSeconds(seconds);
    setTimerRunning(true);
  };

  const stopTimer = () => {
    setTimerRunning(false);
    setTimerStartAt(null);
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setTimerStartAt(null);
    setTimerSeconds(0);
  };

  const save = async () => {
    await patchBoard({ pages, currentPage });
  };

  return {
    lessonId,
    shapes, draft, tool, setTool, color, setColor, strokeWidth, setStrokeWidth,
    start, move, end, addText, undo, redo, clear, save, deleteSelected,
    role, canDraw, studentCanDraw, setStudentCanDraw: setStudentCanDrawRemote,
    bgUrl, setBackground, clearBackground,
    selectedId, cursors, patchCursor,
    laserPoints,
    pages, currentPage, addPage, goToPage, deletePage,
    timerSeconds, timerRunning, timerDuration, startTimer, stopTimer, resetTimer,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}

export type WhiteboardState = ReturnType<typeof useWhiteboard>;