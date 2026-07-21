"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"tutor" | "student" | "parent">("student");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Введите email и пароль");
      return;
    }
    
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      const uid = result.user.uid;
      
      // Получаем реальную роль из профиля
      const profileSnap = await getDoc(doc(db, "profiles", uid));
      
      if (!profileSnap.exists()) {
        toast.error("Профиль не найден. Обратитесь к администратору.");
        return;
      }
      
      const actualRole = profileSnap.data().role;
      
      // Проверяем соответствие
      if (actualRole !== role) {
        toast.error(`У вас роль "${getRoleName(actualRole)}", а не "${getRoleName(role)}"`);
        return;
      }
      
      // Сохраняем в localStorage
      localStorage.setItem("uid", uid);
      localStorage.setItem("role", actualRole);
      
      toast.success(`Добро пожаловать, ${profileSnap.data().full_name || "пользователь"}!`);
      
      // Перенаправляем в зависимости от роли
      if (actualRole === "parent") {
        router.push(`/parent-dashboard?uid=${uid}&role=parent`);
      } else {
        router.push(`/dashboard?uid=${uid}&role=${actualRole}`);
      }
    } catch (error: any) {
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        toast.error("Неверный email или пароль");
      } else if (error.code === "auth/invalid-email") {
        toast.error("Некорректный email");
      } else {
        toast.error(error.message || "Ошибка входа");
      }
    } finally {
      setLoading(false);
    }
  }

  function getRoleName(r: string): string {
    switch (r) {
      case "tutor": return "Репетитор";
      case "student": return "Ученик";
      case "parent": return "Родитель";
      default: return r;
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
          <h1 className="text-2xl font-bold text-white text-center mb-2">Вход в кабинет</h1>
          <p className="text-gray-400 text-sm text-center mb-6">Выберите вашу роль</p>
          
          {/* Выбор роли */}
          <div className="flex gap-2 mb-6">
            {[
              { value: "student", label: "🎓 Ученик" },
              { value: "tutor", label: "👨‍🏫 Репетитор" },
              { value: "parent", label: "👨‍👩‍👧 Родитель" },
            ].map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value as any)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition ${
                  role === r.value
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
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
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                autoComplete="current-password"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-lg hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 transition shadow-lg shadow-indigo-500/25"
            >
              {loading ? "Вход..." : "Войти 🚀"}
            </button>
          </form>
          
          <p className="text-center text-gray-500 text-sm mt-6">
            Ученик?{" "}
            <Link href="/auth/register" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Зарегистрироваться
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