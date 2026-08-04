"use client";

import { useState } from "react";
import { useWhiteboard } from "@/hooks/useWhiteboard";
import WhiteboardCanvas from "@/components/DynamicWhiteboard"; // ← изменено
import WhiteboardToolbar from "@/components/WhiteboardToolbar";

export default function LessonRoom({ lessonId }: { lessonId: string }) {
  const wb = useWhiteboard(lessonId);
  const [stage, setStage] = useState<any>(null);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <h1 className="text-lg font-semibold text-gray-800">Занятие · {lessonId}</h1>
        <span className="text-xs text-gray-400">Шаг 1: доска · видео и синхронизация — следующие шаги</span>
      </header>

      <div className="flex flex-1 gap-4 p-4 min-h-0">
        <aside className="w-72 shrink-0 flex flex-col gap-4">
          <div className="flex-1 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm text-center p-4">
            🎥 Видео<br />(LiveKit — шаг 3)
          </div>
          <div className="h-48 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm text-center p-4">
            💬 Чат<br />(подключим существующий — шаг 4)
          </div>
        </aside>

        <main className="flex-1 flex flex-col gap-2 min-h-0">
          <WhiteboardToolbar wb={wb} stage={stage} />
          <WhiteboardCanvas wb={wb} onStageReady={setStage} />
        </main>
      </div>
    </div>
  );
}