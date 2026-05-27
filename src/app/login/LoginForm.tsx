"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

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

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const userSnap = await getDoc(doc(db, "profiles", result.user.uid));
      const role = userSnap.exists() ? userSnap.data().role : "student";
      localStorage.setItem("uid", result.user.uid);
      localStorage.setItem("role", role);
      router.push(`/dashboard?uid=${result.user.uid}&role=${role}`);
    } catch (err: any) {
      setError("Неверный email или пароль");
    }
    setLoading(false);
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "profiles", result.user.uid), {
        full_name: email.split("@")[0],
        role: "student",
        email: email,
        created_at: new Date().toISOString(),
      });
      localStorage.setItem("uid", result.user.uid);
      localStorage.setItem("role", "student");
      router.push(`/dashboard?uid=${result.user.uid}&role=student`);
    } catch (err: any) {
      setError(err.message || "Ошибка регистрации");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🧪🧬</div>
          <h1 className="text-2xl font-bold text-gray-900">Репетитор химии и биологии</h1>
          <p className="text-gray-500 mt-2">Войдите или создайте аккаунт</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4 text-center">
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleLogin(e); }}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" required placeholder="uchenik@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
            <input type="password" required placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition" />
          </div>
          <div className="space-y-3 pt-2">
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:opacity-50">
              {loading ? "Загрузка..." : "Войти"}
            </button>
            <button type="button" onClick={(e) => { e.preventDefault(); handleSignup(e); }} disabled={loading}
              className="w-full py-3 bg-white text-indigo-600 border-2 border-indigo-200 rounded-xl font-medium hover:bg-indigo-50 transition disabled:opacity-50">
              {loading ? "Загрузка..." : "Зарегистрироваться"}
            </button>
          </div>
        </form>
        <p className="text-xs text-gray-400 text-center mt-6">
          После регистрации роль «Ученик». Репетитор назначается вручную.
        </p>
      </div>
    </div>
  );
}