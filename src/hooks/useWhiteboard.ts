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
  const [bgUrls, setBgUrls] = useState<string[]>([]);
  const [currentBgPage, setCurrentBgPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cursors, setCursors] = useState<Record<string, { x: number; y: number; name: string; color: string }>>({});
  const [laserPoints, setLaserPoints] = useState<Record<string, number[]>>({});
  const [pages, setPages] = useState<Shape[][]>([[]]);
  const [currentPage, setCurrentPage] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStartAt, setTimerStartAt] = useState<number | null>(null);
  const [timerDuration, setTimerDuration] = useState(0);

  const startRef = useRef<Pt | null>(null);
  const dragOffsetRef = useRef<Pt | null>(null);
  const cursorThrottleRef = useRef<number>(0);
  const laserThrottleRef = useRef<number>(0);
  const laserTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 🔥 КЛЮЧЕВОЕ: Флаг локального обновления и таймер
  const isLocalUpdating = useRef(false);
  const localVersion = useRef(0); // Версия локальных данных
  const lastWriteTime = useRef(0); // Время последней записи

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

  // 🔥 УМНЫЙ onSnapshot: учитель блокирует, ученик всегда принимает
  useEffect(() => {
    if (!lessonId) return;
    const ref = doc(db, "lessons", lessonId, "board", "state");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        
        // УЧИТЕЛЬ: Игнорируем обновление, если мы только что сами записали (гонка данных)
        if (role === "teacher" && isLocalUpdating.current) {
          console.log("️ Учитель: игнорирую snapshot (локальное обновление)");
          return;
        }
        
        // УЧИТЕЛЬ: Игнорируем, если запись была меньше 1 секунды назад
        if (role === "teacher" && Date.now() - lastWriteTime.current < 1000) {
          console.log("⏸️ Учитель: игнорирую snapshot (слишком свежая запись)");
          return;
        }

        // Парсим pagesJson
        if (typeof data.pagesJson === "string") {
          try {
            const parsed = JSON.parse(data.pagesJson);
            if (Array.isArray(parsed)) {
              setPages(parsed);
            }
          } catch (e) {
            console.error("parse error", e);
          }
        }
        
        if (typeof data.currentPage === "number") setCurrentPage(data.currentPage);
        if (typeof data.studentCanDraw === "boolean") setStudentCanDraw(data.studentCanDraw);
        
        if (Array.isArray(data.bgUrls)) {
          setBgUrls(data.bgUrls);
        } else if (typeof data.bgUrl === "string") {
          setBgUrls([data.bgUrl]);
        } else {
          setBgUrls([]);
        }
        
        if (typeof data.currentBgPage === "number") setCurrentBgPage(data.currentBgPage);
        else setCurrentBgPage(0);
      }
    });
    return () => unsub();
  }, [lessonId, role]);

  useEffect(() => { setShapes(pages[currentPage] || []); }, [pages, currentPage]);

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

  useEffect(() => {
    if (!lessonId) return;
    const ref = collection(db, "lessons", lessonId, "lasers");
    const unsub = onSnapshot(ref, (snap) => {
      const lasersMap: Record<string, number[]> = {};
      snap.forEach((d) => {
        const data = d.data();
        if (Array.isArray(data.points)) lasersMap[d.id] = data.points;
      });
      setLaserPoints(lasersMap);
    });
    return () => unsub();
  }, [lessonId]);

  useEffect(() => {
    return () => {
      try {
        deleteDoc(doc(db, "lessons", lessonId, "cursors", userId));
        deleteDoc(doc(db, "lessons", lessonId, "lasers", userId));
      } catch (e) { /* ignore */ }
    };
  }, [lessonId]);

  useEffect(() => {
    if (!timerRunning || timerStartAt === null) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - timerStartAt) / 1000);
      const remaining = Math.max(0, timerDuration - elapsed);
      setTimerSeconds(remaining);
      if (remaining === 0) { setTimerRunning(false); setTimerStartAt(null); }
    }, 250);
    return () => clearInterval(interval);
  }, [timerRunning, timerStartAt, timerDuration]);

  // 🔥 ЗАПИСЬ С ЗАЩИТОЙ ОТ ГОНКИ
  const patchBoard = async (patch: Record<string, unknown>) => {
    isLocalUpdating.current = true;
    lastWriteTime.current = Date.now();
    localVersion.current++;
    
    try {
      await setDoc(doc(db, "lessons", lessonId, "board", "state"), patch, { merge: true });
    } catch (e: any) {
      console.error("Firestore write failed:", e);
    } finally {
      // Снимаем флаг через 1.5 секунды (даём базе время распространить данные)
      setTimeout(() => {
        isLocalUpdating.current = false;
      }, 1500);
    }
  };

  const writePages = (nextPages: Shape[][], nextCurrentPage?: number) => {
    const patch: Record<string, unknown> = { 
      pagesJson: JSON.stringify(nextPages), 
      updatedAt: serverTimestamp() 
    };
    if (nextCurrentPage !== undefined) patch.currentPage = nextCurrentPage;
    patchBoard(patch);
  };

  const setStudentCanDrawRemote = async (v: boolean) => {
    setStudentCanDraw(v);
    await patchBoard({ studentCanDraw: v });
  };

  const setBackgrounds = async (urls: string[]) => {
    setBgUrls(urls);
    setCurrentBgPage(0);
    await patchBoard({ bgUrls: urls, currentBgPage: 0 });
  };

  const nextBgPage = async () => {
    if (currentBgPage < bgUrls.length - 1) {
      const next = currentBgPage + 1;
      setCurrentBgPage(next);
      await patchBoard({ currentBgPage: next });
    }
  };

  const prevBgPage = async () => {
    if (currentBgPage > 0) {
      const prev = currentBgPage - 1;
      setCurrentBgPage(prev);
      await patchBoard({ currentBgPage: prev });
    }
  };

  const clearBackground = async () => {
    setBgUrls([]);
    setCurrentBgPage(0);
    await patchBoard({ bgUrls: [], currentBgPage: 0 });
  };

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
      case "pen": case "marker": {
        let cx = 0, cy = 0;
        for (let i = 0; i < s.points.length; i += 2) { cx += s.points[i]; cy += s.points[i + 1]; }
        return { x: cx / (s.points.length / 2), y: cy / (s.points.length / 2) };
      }
      case "line": case "arrow": return { x: (s.start.x + s.end.x) / 2, y: (s.start.y + s.end.y) / 2 };
      case "rect": return { x: s.x + s.width / 2, y: s.y + s.height / 2 };
      case "ellipse": case "triangle": case "star": case "text": return { x: s.x, y: s.y };
    }
  };

  const moveShape = (s: Shape, dx: number, dy: number): Shape => {
    switch (s.type) {
      case "pen": case "marker": {
        const newPoints = [...s.points];
        for (let i = 0; i < newPoints.length; i += 2) { newPoints[i] += dx; newPoints[i + 1] += dy; }
        return { ...s, points: newPoints };
      }
      case "line": case "arrow": return { ...s, start: { x: s.start.x + dx, y: s.start.y + dy }, end: { x: s.end.x + dx, y: s.end.y + dy } };
      case "rect": case "ellipse": case "triangle": case "star": case "text": return { ...s, x: s.x + dx, y: s.y + dy };
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
      } else { setSelectedId(null); }
      return;
    }
    if (tool === "laser") {
      setLaserPoints((prev) => ({ ...prev, [userId]: [pt.x, pt.y] }));
      try {
        setDoc(doc(db, "lessons", lessonId, "lasers", userId), { points: [pt.x, pt.y], userId, updatedAt: serverTimestamp() }, { merge: true });
      } catch (e) { /* ignore */ }
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
        return moveShape(s, targetX - getShapeCenter(s).x, targetY - getShapeCenter(s).y);
      });
      setShapes(next);
      return;
    }
    if (tool === "laser") {
      const now = Date.now();
      if (now - laserThrottleRef.current < 30) return;
      laserThrottleRef.current = now;
      setLaserPoints((prev) => {
        const currentPoints = prev[userId] || [];
        return { ...prev, [userId]: [...currentPoints, pt.x, pt.y].slice(-100) };
      });
      try {
        const currentPoints = laserPoints[userId] || [];
        setDoc(doc(db, "lessons", lessonId, "lasers", userId), { points: [...currentPoints, pt.x, pt.y].slice(-100), userId, updatedAt: serverTimestamp() }, { merge: true });
      } catch (e) { /* ignore */ }
      if (laserTimeoutRef.current) clearTimeout(laserTimeoutRef.current);
      laserTimeoutRef.current = setTimeout(() => {
        setLaserPoints((prev) => { const next = { ...prev }; delete next[userId]; return next; });
        try { deleteDoc(doc(db, "lessons", lessonId, "lasers", userId)); } catch (e) { /* ignore */ }
      }, 600);
      return;
    }
    if (tool === "eraser") return eraseAt(pt);
    if (!draft) return;
    setDraft((d) => {
      if (!d) return d;
      switch (d.type) {
        case "pen": case "marker": return { ...d, points: [...d.points, pt.x, pt.y] };
        case "line": case "arrow": return { ...d, end: pt };
        case "rect": return { ...d, width: pt.x - d.x, height: pt.y - d.y };
        case "ellipse": {
          const s = startRef.current!;
          return { ...d, x: (s.x + pt.x) / 2, y: (s.y + pt.y) / 2, radiusX: Math.abs(pt.x - s.x) / 2, radiusY: Math.abs(pt.y - s.y) / 2 };
        }
        case "triangle": case "star": {
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
      setLaserPoints((prev) => { const next = { ...prev }; delete next[userId]; return next; });
      try { deleteDoc(doc(db, "lessons", lessonId, "lasers", userId)); } catch (e) { /* ignore */ }
      return;
    }
    if (draft) { commit([...shapes, draft]); setDraft(null); }
  };

  const addText = (pt: Pt, text: string) => {
    if (!canDraw || !text.trim()) return;
    commit([...shapes, { id: uid(), type: "text", x: pt.x, y: pt.y, text: text.trim(), stroke: color, fontSize: 16 + strokeWidth * 2 }]);
  };

  const clear = () => { if (!canDraw || shapes.length === 0) return; commit([]); };
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
      setDoc(doc(db, "lessons", lessonId, "cursors", userId), { x: pt.x, y: pt.y, name: userName, color: userColor, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) { /* ignore */ }
  }, [lessonId, userId, userName, userColor]);

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

  const startTimer = (seconds: number) => { setTimerDuration(seconds); setTimerStartAt(Date.now()); setTimerSeconds(seconds); setTimerRunning(true); };
  const stopTimer = () => { setTimerRunning(false); setTimerStartAt(null); };
  const resetTimer = () => { setTimerRunning(false); setTimerStartAt(null); setTimerSeconds(0); };

  const save = async () => { await patchBoard({ pagesJson: JSON.stringify(pages), currentPage }); };

  return {
    lessonId, shapes, draft, tool, setTool, color, setColor, strokeWidth, setStrokeWidth,
    start, move, end, addText, undo, redo, clear, save, deleteSelected,
    role, canDraw, studentCanDraw, setStudentCanDraw: setStudentCanDrawRemote,
    bgUrls, currentBgPage, setBackgrounds, nextBgPage, prevBgPage, clearBackground,
    selectedId, cursors, patchCursor, laserPoints,
    pages, currentPage, addPage, goToPage, deletePage,
    timerSeconds, timerRunning, timerDuration, startTimer, stopTimer, resetTimer,
    canUndo: past.length > 0, canRedo: future.length > 0,
  };
}

export type WhiteboardState = ReturnType<typeof useWhiteboard>;