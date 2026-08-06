"use client";

import { useEffect, useRef, useState } from "react";
import {
  addDoc, collection, limitToLast, onSnapshot, orderBy, query, serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { MessageSquare, Send, X } from "lucide-react";

interface Msg {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  role: string;
  createdAt?: any;
}

export default function LessonChat({ lessonId }: { lessonId: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("Участник");
  const [role, setRole] = useState("student");
  const identity = auth.currentUser?.uid || "guest-" + Math.random().toString(36).slice(2, 6);

  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    const storedRole = localStorage.getItem("role");
    const user = auth.currentUser;
    setName(storedName || user?.displayName || user?.email?.split("@")[0] || "Участник");
    setRole(storedRole === "tutor" ? "tutor" : "student");
    setOpen(window.innerWidth >= 1024);
    setPos({ x: Math.max(10, window.innerWidth - 340), y: 100 });
  }, []);

  useEffect(() => {
    if (!lessonId) return;
    const q = query(
      collection(db, "lessons", lessonId, "chat"),
      orderBy("createdAt", "asc"),
      limitToLast(200)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: Msg[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      setMessages(list);
    });
    return unsub;
  }, [lessonId]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    try {
      await addDoc(collection(db, "lessons", lessonId, "chat"), {
        text: t,
        authorId: identity,
        authorName: name,
        role,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!pos) return;
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
  const onPointerUp = () => { dragRef.current = null; };

  if (pos === null) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed z-40 bottom-4 right-4 h-12 w-12 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center hover:bg-indigo-700"
        title="Открыть чат урока"
      >
        <MessageSquare size={20} />
      </button>
    );
  }

  return (
    <div
      style={{ left: pos.x, top: pos.y }}
      className="fixed z-40 w-80 max-w-[calc(100vw-20px)] bg-white rounded-2xl border border-gray-200 shadow-lg flex flex-col overflow-hidden"
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ touchAction: "none" }}
        className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 cursor-move select-none"
      >
        <span className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
          <MessageSquare size={14} /> Чат урока
        </span>
        <button
          onClick={() => setOpen(false)}
          onPointerDown={(e) => e.stopPropagation()}
          className="p-1 rounded hover:bg-gray-200 text-gray-600"
          title="Свернуть"
        >
          <X size={14} />
        </button>
      </div>

      <div ref={listRef} className="h-64 overflow-y-auto p-3 flex flex-col gap-2 bg-gray-50/50">
        {messages.length === 0 && (
          <div className="text-xs text-gray-400 text-center mt-8">Сообщений пока нет</div>
        )}
        {messages.map((m) => {
          const mine = m.authorId === identity;
          return (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                mine ? "self-end bg-indigo-600 text-white" : "self-start bg-white border border-gray-200 text-gray-800"
              }`}
            >
              {!mine && (
                <div className="text-[10px] mb-0.5 font-medium text-gray-500">
                  {m.authorName}
                  {m.role === "tutor" && <span className="ml-1 text-emerald-600">· учитель</span>}
                </div>
              )}
              {m.text}
            </div>
          );
        })}
      </div>

      <div className="p-2 border-t border-gray-200 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder="Сообщение…"
          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
        />
        <button
          onClick={send}
          className="h-9 w-9 flex items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
          title="Отправить"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}