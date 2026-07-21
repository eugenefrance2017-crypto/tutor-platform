"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";

const firebaseConfig = {
  apiKey: "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4", authDomain: "tutor-platform-a5e37.firebaseapp.com",
  projectId: "tutor-platform-a5e37", storageBucket: "tutor-platform-a5e37.firebasestorage.app",
  messagingSenderId: "115123071384", appId: "1:115123071384:web:9517a29ed1fc2c46e163ed",
};
const app = initializeApp(firebaseConfig); const db = getFirestore(app);

function ApplicationsContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "tutor";
  
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "new" | "contacted" | "done">("all");

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "applications"), orderBy("created_at", "desc")),
      (snap) => {
        setApplications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  async function updateStatus(id: string, status: string) {
    await updateDoc(doc(db, "applications", id), { status });
    toast.success(status === "contacted" ? "Отмечено как «Связались»" : status === "done" ? "Отмечено как «Готово»" : "Статус обновлён");
  }

  async function deleteApplication(id: string) {
    if (!window.confirm("Удалить заявку?")) return;
    const { deleteDoc } = await import("firebase/firestore");
    await deleteDoc(doc(db, "applications", id));
    toast.success("Заявка удалена");
  }

  const filtered = applications.filter((app: any) => {
    if (filter === "all") return true;
    return app.status === filter;
  });

  const newCount = applications.filter((a: any) => a.status === "new").length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/dashboard?uid=${uid}&role=${role}`} className="text-indigo-600 hover:text-indigo-800 transition font-medium">← Назад</Link>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
            📩 Заявки {newCount > 0 && <span className="text-sm bg-red-500 text-white px-2 py-0.5 rounded-full ml-2">{newCount} новых</span>}
          </h1>
          <div></div>
        </div>

        {/* Фильтры */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { key: "all", label: "Все" },
            { key: "new", label: `🆕 Новые (${applications.filter(a => a.status === "new").length})` },
            { key: "contacted", label: "📞 Связались" },
            { key: "done", label: "✅ Готово" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as any)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                filter === f.key ? "bg-indigo-500 text-white" : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white/80 backdrop-blur rounded-3xl shadow-lg p-12 text-center border border-white">
            <p className="text-4xl mb-4">📭</p>
            <p className="text-gray-400 text-lg">Нет заявок</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((app: any) => (
              <div key={app.id} className={`bg-white/90 backdrop-blur rounded-2xl shadow-lg p-5 border transition ${
                app.status === "new" ? "border-indigo-300 bg-indigo-50/50" :
                app.status === "contacted" ? "border-amber-300" :
                "border-green-200 opacity-70"
              }`}>
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold text-sm">
                        {app.name[0]}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">{app.name}</h3>
                        <p className="text-sm text-gray-500">{app.contact}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                        {app.subject === "chemistry" ? "🧪 Химия" : app.subject === "biology" ? "🧬 Биология" : "🧪🧬 Химия и биология"}
                      </span>
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                        {app.goal === "ege" ? "🎯 ЕГЭ" : app.goal === "oge" ? "📙 ОГЭ" : app.goal === "improve" ? "📈 Подтянуть" : "💬 Другое"}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        app.status === "new" ? "bg-red-100 text-red-700" :
                        app.status === "contacted" ? "bg-amber-100 text-amber-700" :
                        "bg-emerald-100 text-emerald-700"
                      }`}>
                        {app.status === "new" ? "🆕 Новая" : app.status === "contacted" ? "📞 Связались" : "✅ Готово"}
                      </span>
                    </div>
                    
                    {app.comment && (
                      <p className="text-sm text-gray-600 mt-3 bg-gray-50 rounded-xl p-3">💬 {app.comment}</p>
                    )}
                    
                    <p className="text-xs text-gray-400 mt-3">
                      {app.created_at?.seconds 
                        ? new Date(app.created_at.seconds * 1000).toLocaleDateString("ru-RU", { 
                            day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" 
                          }) 
                        : ""}
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {app.status === "new" && (
                      <button onClick={() => updateStatus(app.id, "contacted")} className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-medium hover:bg-amber-600 transition">
                        📞 Связались
                      </button>
                    )}
                    {app.status === "contacted" && (
                      <button onClick={() => updateStatus(app.id, "done")} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-medium hover:bg-emerald-600 transition">
                        ✅ Готово
                      </button>
                    )}
                    <button onClick={() => deleteApplication(app.id)} className="px-4 py-2 bg-red-100 text-red-600 rounded-xl text-xs font-medium hover:bg-red-200 transition">
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Загрузка...</div>}>
      <ApplicationsContent />
    </Suspense>
  );
}