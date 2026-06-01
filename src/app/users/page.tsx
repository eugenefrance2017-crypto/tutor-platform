"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";

const firebaseConfig = {
  apiKey: "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4", authDomain: "tutor-platform-a5e37.firebaseapp.com",
  projectId: "tutor-platform-a5e37", storageBucket: "tutor-platform-a5e37.firebasestorage.app",
  messagingSenderId: "115123071384", appId: "1:115123071384:web:9517a29ed1fc2c46e163ed",
};
const app = initializeApp(firebaseConfig); const db = getFirestore(app);

function UsersContent() {
  const [users, setUsers] = useState<any[]>([]);
  const uid = typeof window !== "undefined" ? localStorage.getItem("uid") || "" : "";

  useEffect(() => { 
    const q = query(collection(db, "profiles"));
    const unsub = onSnapshot(q, (snap) => setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  async function changeRole(userId: string, newRole: string) {
    await updateDoc(doc(db, "profiles", userId), { role: newRole });
    toast.success(`Роль изменена на ${newRole}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/dashboard?uid=${uid}`} className="text-indigo-600 hover:text-indigo-800">← Назад</Link>
          <h1 className="text-2xl font-bold">👥 Управление пользователями</h1>
          <div></div>
        </div>
        <div className="bg-white/80 backdrop-blur rounded-3xl shadow-lg p-6 border border-white">
          <div className="space-y-2">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-sm">{user.full_name || "Без имени"}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${user.role === 'tutor' ? 'bg-indigo-100 text-indigo-700' : user.role === 'parent' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {user.role || 'student'}
                  </span>
                  <select 
                    value={user.role || 'student'} 
                    onChange={(e) => changeRole(user.id, e.target.value)}
                    className="text-xs border rounded-lg px-2 py-1"
                  >
                    <option value="student">🎓 Ученик</option>
                    <option value="tutor">🧑‍🏫 Репетитор</option>
                    <option value="parent">👨‍👩‍👧 Родитель</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  return (<Suspense fallback={<div className="min-h-screen flex items-center justify-center">Загрузка...</div>}><UsersContent /></Suspense>);
}