"use client";

import { useEffect, useRef, useState, memo } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { MessageSquare, Send, Move, Minimize2, Maximize2 } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: string;
  senderName: string;
  createdAt: any;
}

function LessonChatInner({ lessonId }: { lessonId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [pos, setPos] = useState({ x: 20, y: 400 });
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const user = auth.currentUser;
  const senderName = user?.displayName || user?.email?.split("@")[0] || "Участник";

  useEffect(() => {
    const q = query(
      collection(db, "lessons", lessonId, "chat"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)));
    });
    return unsub;
  }, [lessonId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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

  const sendMessage = async () => {
    if (!input.trim()) return;
    await addDoc(collection(db, "lessons", lessonId, "chat"), {
      text: input.trim(),
      sender: user?.uid || "guest",
      senderName,
      createdAt: serverTimestamp(),
    });
    setInput("");
  };

  return (
    <div
      style={{ left: pos.x, top: pos.y }}
      className={`fixed z-40 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden flex flex-col ${
        collapsed ? "w-40" : "w-56"
      }`}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ touchAction: "none" }}
        className="flex items-center justify-between px-2 py-1.5 bg-gray-50 border-b border-gray-200 cursor-move select-none shrink-0"
      >
        <span className="text-[10px] font-medium text-gray-700 flex items-center gap-1">
          <MessageSquare size={12} />
          Чат
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
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[40vh] min-h-[150px]">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 text-[10px] py-4">Нет сообщений</div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="text-[10px]">
                  <span className="font-semibold text-gray-700">{m.senderName}: </span>
                  <span className="text-gray-600">{m.text}</span>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-gray-200 p-1.5 flex gap-1 shrink-0">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Сообщение..."
              className="flex-1 text-[10px] border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-400"
            />
            <button
              onClick={sendMessage}
              className="p-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Send size={12} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default memo(LessonChatInner);