"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import toast from "react-hot-toast";

const firebaseConfig = {
  apiKey: "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4",
  authDomain: "tutor-platform-a5e37.firebaseapp.com",
  projectId: "tutor-platform-a5e37",
  storageBucket: "tutor-platform-a5e37.firebasestorage.app",
  messagingSenderId: "115123071384",
  appId: "1:115123071384:web:9517a29ed1fc2c46e163ed",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      toast.error("Заполните все поля");
      return;
    }
    if (password.length < 6) {
      toast.error("Пароль должен быть не менее 6 символов");
      return;
    }
    
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
      const uid = result.user.uid;
      
      // Создаём профиль ученика
      await setDoc(doc(db, "profiles", uid), {
        full_name: fullName.trim(),
        email: email.trim(),
        role: "student",
        xp: 0,
        level: 1,
        achievements: [],
        created_at: new Date().toISOString(),
      });
      
      // Сохраняем в localStorage
      localStorage.setItem("uid", uid);
      localStorage.setItem("role", "student");
      
      toast.success(`Добро пожаловать, ${fullName.trim()}!`);
      
      // Перенаправляем в дашборд ученика
      router.push(`/dashboard?uid=${uid}&role=student`);
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        toast.error("Этот email уже используется");
      } else if (error.code === "auth/invalid-email") {
        toast.error("Некорректный email");
      } else {
        toast.error(error.message || "Ошибка регистрации");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="text-3xl">🧪🧬</span>
            <span className="font-black text-2xl bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
              Jenyawisch
            </span>
          </Link>
        </div>
        
        <div className="bg-slate-800/80 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl">
          <h1 className="text-2xl font-bold text-white text-center mb-2">Регистрация</h1>
          <p className="text-gray-400 text-sm text-center mb-6">
            Для учеников 🎓<br />
            <span className="text-xs">Репетиторов и родителей добавляет администратор</span>
          </p>
          
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Имя и фамилия</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Иван Петров"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
            
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                autoComplete="email"
              />
            </div>
            
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                autoComplete="new-password"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold text-lg hover:from-emerald-600 hover:to-green-600 disabled:opacity-50 transition shadow-lg shadow-emerald-500/25"
            >
              {loading ? "Создание..." : "Начать обучение 🚀"}
            </button>
          </form>
          
          <p className="text-center text-gray-500 text-sm mt-6">
            Уже есть аккаунт?{" "}
            <Link href="/auth/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Войти
            </Link>
          </p>
        </div>
        
        <p className="text-center text-gray-600 text-xs mt-6">
          <Link href="/" className="hover:text-gray-400 transition">← На главную</Link>
        </p>
      </div>
    </div>
  );
}