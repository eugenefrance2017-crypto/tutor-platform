"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4", authDomain: "tutor-platform-a5e37.firebaseapp.com",
  projectId: "tutor-platform-a5e37", storageBucket: "tutor-platform-a5e37.firebasestorage.app",
  messagingSenderId: "115123071384", appId: "1:115123071384:web:9517a29ed1fc2c46e163ed",
};
const app = initializeApp(firebaseConfig); const db = getFirestore(app);

function ParentHomeworksContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  
  const [profile, setProfile] = useState<any>(null);
  const [childId, setChildId] = useState<string>("");
  const [childProfile, setChildProfile] = useState<any>(null);
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "done" | "checked">("all");
  const [selectedHw, setSelectedHw] = useState<any>(null);

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "profiles", uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        if (data.child_id) {
          setChildId(data.child_id);
          loadChildData(data.child_id);
        }
      }
      setLoading(false);
    });
  }, [uid]);

  function loadChildData(cid: string) {
    getDoc(doc(db, "profiles", cid)).then((snap) => { if (snap.exists()) setChildProfile(snap.data()); });
    onSnapshot(
      query(collection(db, "homeworks"), where("student_id", "==", cid)),
      (snap) => {
        const hwData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        hwData.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setHomeworks(hwData);
      }
    );
  }

  const filteredHw = homeworks.filter((hw: any) => {
    if (filter === "all") return true;
    if (filter === "active") return hw.status === "active";
    if (filter === "done") return hw.status === "done";
    if (filter === "checked") return hw.status === "checked";
    return true;
  });

  const activeCount = homeworks.filter((h: any) => h.status === "active").length;
  const doneCount = homeworks.filter((h: any) => h.status === "done").length;
  const checkedCount = homeworks.filter((h: any) => h.status === "checked").length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return { icon: "⏳", label: "Не сдано", color: "bg-amber-100 text-amber-700 border-amber-200" };
      case "done": return { icon: "✅", label: "Сдано", color: "bg-blue-100 text-blue-700 border-blue-200" };
      case "checked": return { icon: "✔️", label: "Проверено", color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
      default: return { icon: "❓", label: status, color: "bg-gray-100 text-gray-700 border-gray-200" };
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "ege": return "📕 ЕГЭ";
      case "oge": return "📙 ОГЭ";
      case "base": return "📗 База";
      case "olymp": return "👑 Олимп";
      default: return null;
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
        <p className="text-gray-500">Загрузка...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
            📚 Домашние задания
          </h1>
          {childProfile?.full_name && (
            <p className="text-gray-500 mt-1">Ученик: {childProfile.full_name}</p>
          )}
        </div>

        {!childId ? (
          <div className="bg-white/80 backdrop-blur rounded-3xl shadow-lg p-8 text-center border border-white">
            <p className="text-4xl mb-4">🔗</p>
            <p className="text-gray-500 text-lg">Ученик ещё не привязан</p>
            <p className="text-gray-400 text-sm mt-2">Попросите репетитора привязать ваш аккаунт к ученику</p>
          </div>
        ) : (
          <>
            {/* Статистика */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Всего", value: homeworks.length, icon: "📚", color: "from-gray-500 to-slate-500" },
                { label: "Не сдано", value: activeCount, icon: "⏳", color: "from-amber-500 to-orange-500" },
                { label: "Сдано", value: doneCount, icon: "✅", color: "from-blue-500 to-indigo-500" },
                { label: "Проверено", value: checkedCount, icon: "✔️", color: "from-emerald-500 to-green-500" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/80 backdrop-blur rounded-2xl p-4 shadow-sm border border-white text-center hover:scale-[1.02] transition">
                  <span className="text-2xl">{stat.icon}</span>
                  <p className={`text-2xl font-bold mt-2 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Фильтры */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {[
                { key: "all", label: "Все" },
                { key: "active", label: "⏳ Не сдано" },
                { key: "done", label: "✅ Сдано" },
                { key: "checked", label: "✔️ Проверено" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => { setFilter(f.key as any); setSelectedHw(null); }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                    filter === f.key
                      ? "bg-emerald-500 text-white shadow-md"
                      : "bg-white text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Список заданий */}
              <div className="lg:col-span-1 space-y-2">
                {filteredHw.length === 0 ? (
                  <div className="bg-white/80 backdrop-blur rounded-2xl p-8 text-center border border-white">
                    <p className="text-4xl mb-2">📭</p>
                    <p className="text-gray-400">Нет заданий</p>
                  </div>
                ) : (
                  filteredHw.map((hw: any) => {
                    const status = getStatusBadge(hw.status);
                    return (
                      <button
                        key={hw.id}
                        onClick={() => setSelectedHw(hw)}
                        className={`w-full text-left p-4 rounded-xl transition border-2 ${
                          selectedHw?.id === hw.id
                            ? "bg-white border-emerald-400 shadow-md"
                            : "bg-white/60 border-transparent hover:border-gray-200"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{hw.title || "Без названия"}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${status.color}`}>
                                {status.icon} {status.label}
                              </span>
                              {hw.topic && (
                                <span className="text-xs text-gray-400">{hw.topic}</span>
                              )}
                            </div>
                          </div>
                          {hw.score !== undefined && (
                            <span className="text-sm font-bold text-emerald-600 ml-2">{hw.score}б</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                          <span>{new Date(hw.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</span>
                          {hw.deadline && (
                            <>
                              <span>•</span>
                              <span className={new Date(hw.deadline) < new Date() && hw.status === "active" ? "text-red-500 font-medium" : ""}>
                                Срок: {new Date(hw.deadline).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                              </span>
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Детали задания */}
              <div className="lg:col-span-2">
                {selectedHw ? (
                  <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 border border-white space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-gray-800">{selectedHw.title || "Без названия"}</h2>
                        <p className="text-sm text-gray-500 mt-1">
                          Создано: {new Date(selectedHw.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(selectedHw.status).color}`}>
                        {getStatusBadge(selectedHw.status).icon} {getStatusBadge(selectedHw.status).label}
                      </span>
                    </div>

                    {/* Мета-информация */}
                    <div className="flex flex-wrap gap-2">
                      {selectedHw.topic && (
                        <span className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-full">📝 {selectedHw.topic}</span>
                      )}
                      {getDifficultyBadge(selectedHw.difficulty) && (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{getDifficultyBadge(selectedHw.difficulty)}</span>
                      )}
                      {selectedHw.task_type && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                          {selectedHw.task_type === "multi" ? "📋 Несколько заданий" : "📝 Одно задание"}
                        </span>
                      )}
                    </div>

                    {/* Дедлайн */}
                    {selectedHw.deadline && (
                      <div className={`rounded-xl p-4 ${
                        new Date(selectedHw.deadline) < new Date() && selectedHw.status === "active"
                          ? "bg-red-50 border border-red-200"
                          : "bg-blue-50 border border-blue-200"
                      }`}>
                        <p className="text-xs font-medium mb-1">
                          {new Date(selectedHw.deadline) < new Date() && selectedHw.status === "active" ? "🔴 Просрочено!" : "📅 Срок сдачи"}
                        </p>
                        <p className="text-sm font-medium">
                          {new Date(selectedHw.deadline).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                          {" в "}
                          {new Date(selectedHw.deadline).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        {new Date(selectedHw.deadline) < new Date() && selectedHw.status === "active" && (
                          <p className="text-xs text-red-500 mt-1">Задание не сдано вовремя</p>
                        )}
                      </div>
                    )}

                    {/* Результат */}
                    {selectedHw.score !== undefined && (
                      <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200">
                        <p className="text-xs text-emerald-600 font-medium mb-1">⭐ Результат</p>
                        <div className="flex items-end gap-2">
                          <p className="text-3xl font-black text-emerald-600">{selectedHw.score}</p>
                          <p className="text-sm text-gray-500 mb-1">
                            / {selectedHw.max_score || "?"} баллов
                          </p>
                          {selectedHw.max_score > 0 && (
                            <p className="text-sm text-gray-400 mb-1">
                              ({Math.round((selectedHw.score / selectedHw.max_score) * 100)}%)
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Комментарий репетитора */}
                    {selectedHw.feedback && (
                      <div className="bg-violet-50 rounded-xl p-4 border border-violet-200">
                        <p className="text-xs text-violet-500 font-medium mb-1">💬 Комментарий репетитора</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedHw.feedback}</p>
                      </div>
                    )}

                    {/* Описание */}
                    {selectedHw.description && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-500 font-medium mb-1">📋 Описание</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedHw.description}</p>
                      </div>
                    )}

                    {/* Секции заданий */}
                    {selectedHw.sections && selectedHw.sections.length > 0 && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-500 font-medium mb-2">📝 Задания ({selectedHw.sections.length})</p>
                        <div className="space-y-2">
                          {selectedHw.sections.map((sec: any, i: number) => (
                            <div key={i} className="p-3 bg-white rounded-lg">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">{sec.title || `Задание ${i + 1}`}</p>
                                <span className="text-xs text-gray-400">{sec.max_score || 0} б.</span>
                              </div>
                              {sec.task_text && (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{sec.task_text}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center py-16">
                      <p className="text-6xl mb-4">👈</p>
                      <p className="text-gray-400 text-lg">Выберите задание слева</p>
                      <p className="text-gray-300 text-sm mt-1">чтобы увидеть детали</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ParentHomeworksPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div><p className="text-gray-500">Загрузка...</p></div></div>}>
      <ParentHomeworksContent />
    </Suspense>
  );
}