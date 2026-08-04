"use client";

import { Tool } from "@/lib/whiteboard";
import { WhiteboardState } from "@/hooks/useWhiteboard";

const tools: { id: Tool; icon: string; label: string }[] = [
  { id: "pen", icon: "✏️", label: "Карандаш" },
  { id: "eraser", icon: "🧽", label: "Ластик" },
  { id: "line", icon: "➖", label: "Линия" },
  { id: "arrow", icon: "↗️", label: "Стрелка" },
  { id: "rect", icon: "⬜", label: "Прямоугольник" },
  { id: "ellipse", icon: "⭕", label: "Эллипс" },
  { id: "text", icon: "🔤", label: "Текст" },
];

interface Props {
  wb: WhiteboardState;
  stage: any;
}

export default function WhiteboardToolbar({ wb, stage }: Props) {
  const exportPNG = () => {
    if (!stage) return;
    const url = stage.toDataURL({ pixelRatio: 2 });
    const a = document.createElement("a");
    a.href = url;
    a.download = `board-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 bg-white rounded-xl border border-gray-200">
      {tools.map((t) => (
        <button
          key={t.id}
          title={t.label}
          onClick={() => wb.setTool(t.id)}
          className={`px-3 py-1.5 rounded-lg text-sm transition ${
            wb.tool === t.id ? "bg-indigo-500 text-white shadow" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
        >
          {t.icon}
        </button>
      ))}

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <input type="color" value={wb.color} onChange={(e) => wb.setColor(e.target.value)} className="w-8 h-8 cursor-pointer rounded" title="Цвет" />
      <input type="range" min={2} max={14} value={wb.strokeWidth} onChange={(e) => wb.setStrokeWidth(Number(e.target.value))} className="w-24" title="Толщина" />

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <button onClick={wb.undo} disabled={!wb.canUndo} className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40" title="Отменить">↩️</button>
      <button onClick={wb.redo} disabled={!wb.canRedo} className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40" title="Повторить">↪️</button>
      <button onClick={wb.clear} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" title="Очистить">🗑</button>

      <div className="flex-1" />

      <button onClick={wb.save} className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 shadow">💾 Сохранить</button>
      <button onClick={exportPNG} className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200" title="Скачать PNG">📸</button>
    </div>
  );
}