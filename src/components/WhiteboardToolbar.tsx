"use client";

import { useState } from "react";
import {
  MousePointer2, Pencil, Eraser, Hand, Minus, ArrowUpRight, Square, Circle, Type,
  Undo2, Redo2, Trash2, Save, Camera, Paperclip, X, Eye,
  Highlighter, Triangle, Star, CircleDot, Timer,
} from "lucide-react";
import { Tool } from "@/lib/whiteboard";
import { WhiteboardState } from "@/hooks/useWhiteboard";
import { imageFileToOptimizedDataUrl, pdfFileToFirstPageDataUrl, uploadBackground } from "@/lib/background";

const tools: { id: Tool; icon: any; label: string }[] = [
  { id: "select", icon: MousePointer2, label: "Выделение" },
  { id: "pen", icon: Pencil, label: "Карандаш" },
  { id: "marker", icon: Highlighter, label: "Маркер" },
  { id: "eraser", icon: Eraser, label: "Ластик" },
  { id: "hand", icon: Hand, label: "Рука" },
  { id: "laser", icon: CircleDot, label: "Лазер" },
  { id: "line", icon: Minus, label: "Линия" },
  { id: "arrow", icon: ArrowUpRight, label: "Стрелка" },
  { id: "rect", icon: Square, label: "Прямоугольник" },
  { id: "ellipse", icon: Circle, label: "Эллипс" },
  { id: "triangle", icon: Triangle, label: "Треугольник" },
  { id: "star", icon: Star, label: "Звезда" },
  { id: "text", icon: Type, label: "Текст" },
];

const PALETTE = ["#1e3a8a", "#dc2626", "#16a34a", "#f59e0b", "#9333ea", "#0ea5e9", "#111827", "#ec4899"];

function IconBtn({ active = false, disabled = false, danger = false, onClick, title, children }: {
  active?: boolean; disabled?: boolean; danger?: boolean; onClick?: () => void; title?: string; children: React.ReactNode;
}) {
  return (
    <button title={title} disabled={disabled} onClick={onClick}
      className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-35 ${
        active ? "bg-indigo-600 text-white shadow-sm" : danger ? "text-gray-600 hover:bg-red-50 hover:text-red-600" : "text-gray-600 hover:bg-gray-100"
      }`}>
      {children}
    </button>
  );
}

const Divider = () => <div className="w-px h-6 bg-gray-200 mx-0.5" />;

interface Props { wb: WhiteboardState; stage: any; }

export default function WhiteboardToolbar({ wb, stage }: Props) {
  const [uploading, setUploading] = useState(false);
  const [showTimerInput, setShowTimerInput] = useState(false);
  const [timerInputValue, setTimerInputValue] = useState("5");

  const exportPNG = () => {
    if (!stage) return;
    const url = stage.toDataURL({ pixelRatio: 2 });
    const a = document.createElement("a");
    a.href = url; a.download = `board-${Date.now()}.png`; a.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    setUploading(true);
    try {
      const dataUrl = f.type === "application/pdf" ? await pdfFileToFirstPageDataUrl(f) : await imageFileToOptimizedDataUrl(f);
      let url: string;
      try { url = await uploadBackground(wb.lessonId, dataUrl); }
      catch (storageErr) {
        console.warn("Storage failed, fallback to Firestore", storageErr);
        if (dataUrl.length > 900_000) throw new Error("Файл слишком большой");
        url = dataUrl;
      }
      await wb.setBackground(url);
    } catch (err) { console.error(err); alert("Не удалось загрузить задание"); }
    setUploading(false);
  };

  const dis = !wb.canDraw;

  return (
    <div className="flex flex-wrap items-center gap-1 p-1.5 bg-white">
      {/* Навигация по страницам */}
      <button onClick={() => wb.goToPage(wb.currentPage - 1)} disabled={wb.currentPage === 0}
        className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30" title="Предыдущая">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="text-xs text-gray-600 px-1 tabular-nums">{wb.currentPage + 1}/{wb.pages.length}</span>
      <button onClick={() => wb.goToPage(wb.currentPage + 1)} disabled={wb.currentPage >= wb.pages.length - 1}
        className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30" title="Следующая">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <button onClick={wb.addPage} className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100" title="Новая страница">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
      {wb.pages.length > 1 && (
        <button onClick={() => wb.deletePage(wb.currentPage)} className="h-8 w-8 flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50" title="Удалить страницу">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      <Divider />

      {/* Инструменты */}
      {tools.map((t) => {
        const I = t.icon;
        return <IconBtn key={t.id} active={wb.tool === t.id} disabled={dis && t.id !== "hand" && t.id !== "select"} onClick={() => wb.setTool(t.id)} title={t.label}><I size={16} /></IconBtn>;
      })}

      <Divider />

      {/* Цвета */}
      <div className="flex items-center gap-0.5">
        {PALETTE.map((c) => (
          <button key={c} onClick={() => wb.setColor(c)} disabled={dis} title={c}
            className={`h-5 w-5 rounded-full border-2 transition-transform disabled:opacity-40 ${wb.color === c ? "border-indigo-600 scale-110" : "border-white shadow"}`}
            style={{ backgroundColor: c }} />
        ))}
        <label className="h-5 w-5 rounded-full overflow-hidden border border-gray-200 cursor-pointer relative shrink-0" title="Свой цвет">
          <input type="color" value={wb.color} disabled={dis} onChange={(e) => wb.setColor(e.target.value)} className="absolute -inset-2 cursor-pointer disabled:opacity-40" />
        </label>
      </div>

      <input type="range" min={2} max={14} value={wb.strokeWidth} disabled={dis} onChange={(e) => wb.setStrokeWidth(Number(e.target.value))} className="w-16 accent-indigo-600 disabled:opacity-40" title="Толщина" />

      <Divider />

      {/* Undo/Redo/Delete */}
      <IconBtn onClick={wb.undo} disabled={dis || !wb.canUndo} title="Отменить"><Undo2 size={16} /></IconBtn>
      <IconBtn onClick={wb.redo} disabled={dis || !wb.canRedo} title="Повторить"><Redo2 size={16} /></IconBtn>
      {wb.selectedId && wb.canDraw && (
        <IconBtn onClick={wb.deleteSelected} danger title="Удалить выделенное"><Trash2 size={16} /></IconBtn>
      )}
      <IconBtn onClick={wb.clear} disabled={dis} danger title="Очистить всё"><X size={16} /></IconBtn>

      <Divider />

      {/* Таймер */}
      {wb.timerSeconds > 0 ? (
        <div className={`h-8 px-3 flex items-center gap-2 rounded-lg font-mono text-sm font-bold ${
          wb.timerSeconds <= 10 ? "bg-red-500 text-white animate-pulse" : "bg-gray-100 text-gray-900"
        }`}>
          <Timer size={14} />
          {Math.floor(wb.timerSeconds / 60)}:{(wb.timerSeconds % 60).toString().padStart(2, "0")}
          {wb.timerRunning && (
            <button onClick={wb.stopTimer} className="opacity-70 hover:opacity-100">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}
        </div>
      ) : showTimerInput ? (
        <div className="flex items-center gap-1">
          <input type="number" value={timerInputValue} onChange={(e) => setTimerInputValue(e.target.value)}
            className="w-12 h-8 px-2 rounded-lg border border-gray-200 text-sm" min={1} max={3600} autoFocus />
          <button onClick={() => { wb.startTimer(parseInt(timerInputValue) * 60); setShowTimerInput(false); }}
            className="h-8 px-2 rounded-lg bg-green-500 text-white text-xs hover:bg-green-600 flex items-center justify-center">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            </svg>
          </button>
          <button onClick={() => setShowTimerInput(false)} className="h-8 w-8 rounded-lg text-gray-600 hover:bg-gray-100 flex items-center justify-center">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <button onClick={() => setShowTimerInput(true)} className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100" title="Таймер">
          <Timer size={16} />
        </button>
      )}

      <div className="flex-1" />

      {/* Правая часть */}
      {wb.role === "teacher" && (
        <>
          <label className={`h-8 px-3 flex items-center gap-1.5 rounded-lg text-sm cursor-pointer ${uploading ? "bg-gray-100 text-gray-400" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
            <Paperclip size={14} />{uploading ? "Загрузка…" : "Задание"}
            <input type="file" accept="image/png,image/jpeg,application/pdf" className="hidden" onChange={onFile} disabled={uploading} />
          </label>
          {wb.bgUrl && <IconBtn onClick={() => wb.clearBackground()} title="Убрать фон"><X size={16} /></IconBtn>}
          <button onClick={() => wb.setStudentCanDraw(!wb.studentCanDraw)}
            className={`h-8 px-3 flex items-center gap-1.5 rounded-lg text-sm transition-colors ${wb.studentCanDraw ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`}>
            {wb.studentCanDraw ? <Pencil size={14} /> : <Eye size={14} />}
            <span className="hidden sm:inline">{wb.studentCanDraw ? "Ученик рисует" : "Только просмотр"}</span>
          </button>
        </>
      )}
      {wb.role !== "teacher" && !wb.canDraw && <span className="text-xs text-red-500 flex items-center gap-1"><Eye size={14} /> учитель выключил рисование</span>}
      <button onClick={wb.save} className="h-8 px-3 flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 shadow-sm"><Save size={14} />Сохранить</button>
      <IconBtn onClick={exportPNG} title="Скачать PNG"><Camera size={16} /></IconBtn>
    </div>
  );
}