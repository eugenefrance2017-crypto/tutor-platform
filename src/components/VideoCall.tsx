"use client";

import { useEffect, useRef, useState } from "react";
import { useCall } from "@/hooks/useCall";
import VideoPanel from "@/components/VideoPanel";
import CallControls from "@/components/CallControls";
import { auth } from "@/lib/firebase";
import { Move, Minimize2, Maximize2 } from "lucide-react";

export default function VideoCall({ lessonId }: { lessonId: string }) {
  const call = useCall();
  const [role, setRole] = useState<"teacher" | "student">("student");
  const [collapsed, setCollapsed] = useState(false);
  const [pos, setPos] = useState({ x: 20, y: 100 });
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    setRole(storedRole === "tutor" ? "teacher" : "student");
  }, []);

  const user = auth.currentUser;
  const name = user?.displayName || user?.email?.split("@")[0] || "Участник";
  const identity = user?.uid || "guest-" + Math.random().toString(36).slice(2, 8);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, posX: pos.x, posY: pos.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setPos({
      x: dragRef.current.posX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.posY + (e.clientY - dragRef.current.startY),
    });
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  if (call.status !== "connected") {
    return (
      <div
        style={{ left: pos.x, top: pos.y }}
        className="fixed z-40 w-56 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden"
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{ touchAction: "none" }}
          className="flex items-center justify-between px-2 py-1.5 bg-gray-50 border-b border-gray-200 cursor-move select-none"
        >
          <span className="text-xs font-medium text-gray-700">🎥 Видео</span>
          <Move size={12} className="text-gray-400" />
        </div>
        <div className="p-2">
          <div className="text-[10px] text-gray-500 mb-1.5">{role === "teacher" ? "учитель" : "ученик"}</div>
          <button
            onClick={() => call.join(lessonId, identity, name, role)}
            className="w-full px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs"
          >
            {call.status === "connecting" ? "⏳" : "Подключиться"}
          </button>
          {call.error && <div className="text-red-500 text-[10px] mt-1">{call.error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ left: pos.x, top: pos.y }}
      className={`fixed z-40 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden ${collapsed ? "w-48" : "w-56"}`}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ touchAction: "none" }}
        className="flex items-center justify-between px-2 py-1.5 bg-gray-50 border-b border-gray-200 cursor-move select-none"
      >
        <span className="text-[10px] font-medium text-gray-700 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          В звонке
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setCollapsed(!collapsed)}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-0.5 rounded hover:bg-gray-200 text-gray-600"
          >
            {collapsed ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
          </button>
          <Move size={12} className="text-gray-400" />
        </div>
      </div>

      {!collapsed && (
        <div className="flex flex-col gap-1.5 p-2 max-h-[50vh] overflow-y-auto">
          <VideoPanel
            localVideo={call.localVideo ?? null}
            localName={name}
            localMicOn={call.micOn}
            remotes={call.remotes ?? []}
          />
          <CallControls call={call} />
        </div>
      )}
    </div>
  );
}