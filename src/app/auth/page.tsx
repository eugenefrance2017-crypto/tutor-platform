"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Sparkles, User, Eye, EyeOff, Sun, Moon, ArrowLeft, GraduationCap, Users, GraduationCap as TeacherIcon } from "lucide-react";
import Image from "next/image";
import toast, { Toaster } from "react-hot-toast";

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

function getAuthErrorMessage(error: any): string {
  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Неверный email или пароль";
    case "auth/email-already-in-use":
      return "Этот email уже зарегистрирован";
    case "auth/weak-password":
      return "Пароль должен содержать не менее 6 символов";
    case "auth/invalid-email":
      return "Введите корректный email";
    case "auth/too-many-requests":
      return "Слишком много попыток. Попробуйте позже";
    default:
      return "Произошла ошибка. Попробуйте позже";
  }
}

const ROLES = [
  { id: "student", label: "Ученик", icon: GraduationCap, color: "from-indigo-500 to-blue-600", desc: "Обучение и прогресс" },
  { id: "parent", label: "Родитель", icon: Users, color: "from-purple-500 to-pink-600", desc: "Контроль ребёнка" },
  { id: "tutor", label: "Репетитор", icon: TeacherIcon, color: "from-emerald-500 to-teal-600", desc: "Нужен код доступа" },
];

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [selectedRole, setSelectedRole] = useState("student");
  const [tutorCode, setTutorCode] = useState("");
  
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light") setDarkMode(false);
  }, []);

  const toggleTheme = () => {
    const newTheme = darkMode ? "light" : "dark";
    setDarkMode(!darkMode);
    localStorage.setItem("theme", newTheme);
    window.dispatchEvent(new CustomEvent('themechange', { detail: newTheme }));
  };

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        if (!email.trim() || !password.trim()) {
          toast.error("Введите email и пароль");
          setLoading(false);
          return;
        }

        const result = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
        const uid = result.user.uid;
        
        const userDoc = await getDoc(doc(db, "profiles", uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const role = userData.role || "student";
          
          localStorage.setItem("uid", uid);
          localStorage.setItem("role", role);
          localStorage.setItem("userName", userData.full_name || "Пользователь");
          localStorage.setItem("userAvatar", userData.avatar || "");
          
          toast.success("С возвращением!");
          router.push(`/dashboard?uid=${uid}&role=${role}`);
        } else {
          toast.error("Профиль не найден. Обратитесь к администратору.");
        }
      } else {
        if (!fullName.trim()) {
          toast.error("Введите ваше имя");
          setLoading(false);
          return;
        }
        if (!email.trim() || !password.trim()) {
          toast.error("Заполните все поля");
          setLoading(false);
          return;
        }
        
        // Проверка кода для репетитора
        if (selectedRole === "tutor") {
          if (tutorCode !== "JENYA2026") {
            toast.error("Неверный код репетитора");
            setLoading(false);
            return;
          }
        }
        
        const result = await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
        const uid = result.user.uid;
        
        await setDoc(doc(db, "profiles", uid), {
          full_name: fullName.trim(),
          role: selectedRole,
          email: email.trim(),
          xp: 0,
          level: 1,
          streak: 0,
          created_at: new Date().toISOString(),
        });
        
        localStorage.setItem("uid", uid);
        localStorage.setItem("role", selectedRole);
        localStorage.setItem("userName", fullName.trim());
        localStorage.setItem("userAvatar", "");
        
        toast.success("Аккаунт создан! Добро пожаловать.");
        router.push(`/dashboard?uid=${uid}&role=${selectedRole}`);
      }
    } catch (err: any) {
      toast.error(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const bgGradient = darkMode 
    ? "bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950" 
    : "bg-gradient-to-br from-indigo-50 via-purple-50 to-emerald-50";
    
  const cardBg = darkMode 
    ? "bg-slate-900/80 border-white/10" 
    : "bg-white/80 border-indigo-100";
    
  const inputBg = darkMode 
    ? "bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500" 
    : "bg-white border-indigo-200 text-gray-900 placeholder-gray-400 focus:border-indigo-500";
    
  const textPrimary = darkMode ? "text-white" : "text-gray-900";
  const textSecondary = darkMode ? "text-slate-400" : "text-gray-500";

  return (
    <div className={`min-h-screen flex items-center justify-center ${bgGradient} p-4 relative overflow-hidden transition-colors duration-500`}>
      <Toaster position="top-center" toastOptions={{
        style: {
          background: darkMode ? '#1e293b' : '#ffffff',
          color: darkMode ? '#ffffff' : '#0f172a',
          border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0',
        }
      }} />
      
      {/* Кнопка смены темы */}
      <button
        onClick={toggleTheme}
        className={`fixed top-6 right-6 p-3 rounded-full transition-all duration-300 ${
          darkMode ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-lg'
        }`}
      >
        {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* ✅ Кнопка "На главную" */}
      <Link 
        href="/"
        className={`fixed top-6 left-6 flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 font-medium text-sm ${
          darkMode 
            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white' 
            : 'bg-white text-slate-700 hover:bg-slate-50 shadow-lg'
        }`}
      >
        <ArrowLeft className="w-4 h-4" />
        На главную
      </Link>

      <div className="fixed inset-0 pointer-events-none opacity-[0.03]">
        <div className="absolute top-10 left-10 text-9xl">🧪</div>
        <div className="absolute bottom-20 right-10 text-8xl">🧬</div>
        <div className="absolute top-1/3 right-1/4 text-7xl">📚</div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className={`max-w-md w-full ${cardBg} backdrop-blur-xl rounded-3xl shadow-2xl border p-8 relative z-10`}
      >
        {/* ✅ Логотип + Название */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center gap-3 mb-4 group">
            <div className="relative w-12 h-12">
              <Image
                src="/logo/logo.png"
                alt="Jenyawisch"
                width={48}
                height={48}
                className="w-12 h-12 object-contain group-hover:scale-110 transition-transform duration-300"
                priority
              />
            </div>
            <span className="font-black text-2xl bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
              Jenyawisch
            </span>
          </Link>
          <h1 className={`text-xl font-bold ${textPrimary}`}>
            {isLogin ? "С возвращением!" : "Создать аккаунт"}
          </h1>
          <p className={`text-sm mt-1 ${textSecondary}`}>
            {isLogin ? "Введите данные для входа в систему" : "Начните своё обучение с нами"}
          </p>
        </div>

        {/* Переключатель Вход / Регистрация */}
        <div className={`flex p-1 rounded-xl mb-6 ${darkMode ? "bg-slate-800" : "bg-indigo-50"}`}>
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${
              isLogin 
                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md" 
                : `${darkMode ? "text-slate-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${
              !isLogin 
                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md" 
                : `${darkMode ? "text-slate-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`
            }`}
          >
            Регистрация
          </button>
        </div>

        {/* ✅ Выбор роли (только при регистрации) */}
        <AnimatePresence mode="wait">
          {!isLogin && (
            <motion.div
              key="roles"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <label className={`block text-xs font-bold uppercase tracking-wide mb-2 ${textSecondary}`}>
                Выберите роль
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map((role) => {
                  const Icon = role.icon;
                  const isSelected = selectedRole === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRole(role.id)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all duration-200 ${
                        isSelected
                          ? `bg-gradient-to-br ${role.color} text-white border-transparent shadow-lg scale-105`
                          : darkMode
                            ? "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600"
                            : "bg-white border-indigo-100 text-gray-600 hover:border-indigo-300"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-bold">{role.label}</span>
                    </button>
                  );
                })}
              </div>
              
              {/* Предупреждение для репетитора */}
              {selectedRole === "tutor" && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-3 p-3 rounded-xl text-xs ${
                    darkMode ? "bg-amber-500/10 border border-amber-500/30 text-amber-300" : "bg-amber-50 border border-amber-200 text-amber-700"
                  }`}
                >
                  ⚠️ Для регистрации репетитора необходим специальный код. Обратитесь к администратору.
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <form className="space-y-4" onSubmit={handleAuth}>
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                key="fullname"
                initial={{ opacity: 0, height: 0, x: -20 }}
                animate={{ opacity: 1, height: "auto", x: 0 }}
                exit={{ opacity: 0, height: 0, x: 20 }}
                className="overflow-hidden"
              >
                <label className={`block text-xs font-bold uppercase tracking-wide mb-1.5 ${textSecondary}`}>Имя и Фамилия</label>
                <div className="relative">
                  <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${darkMode ? "text-slate-500" : "text-indigo-400"}`} />
                  <input 
                    type="text" 
                    placeholder="Иван Иванов"
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none transition ${inputBg}`} 
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ✅ Поле кода репетитора */}
          <AnimatePresence mode="wait">
            {!isLogin && selectedRole === "tutor" && (
              <motion.div
                key="tutorcode"
                initial={{ opacity: 0, height: 0, x: -20 }}
                animate={{ opacity: 1, height: "auto", x: 0 }}
                exit={{ opacity: 0, height: 0, x: 20 }}
                className="overflow-hidden"
              >
                <label className={`block text-xs font-bold uppercase tracking-wide mb-1.5 ${textSecondary}`}>Код репетитора</label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${darkMode ? "text-slate-500" : "text-indigo-400"}`} />
                  <input 
                    type="text" 
                    placeholder="Введите код"
                    value={tutorCode} 
                    onChange={(e) => setTutorCode(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none transition ${inputBg}`} 
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className={`block text-xs font-bold uppercase tracking-wide mb-1.5 ${textSecondary}`}>Email</label>
            <div className="relative">
              <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${darkMode ? "text-slate-500" : "text-indigo-400"}`} />
              <input 
                type="email" 
                placeholder="uchenik@example.com"
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none transition ${inputBg}`} 
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-bold uppercase tracking-wide mb-1.5 ${textSecondary}`}>Пароль</label>
            <div className="relative">
              <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${darkMode ? "text-slate-500" : "text-indigo-400"}`} />
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••"
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-10 pr-12 py-3 border-2 rounded-xl focus:outline-none transition ${inputBg}`} 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition ${darkMode ? "text-slate-500 hover:text-white" : "text-gray-400 hover:text-gray-700"}`}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <motion.button 
            type="submit" 
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className="w-full py-3.5 mt-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 text-white rounded-xl font-bold text-base hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Загрузка...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                {isLogin ? "Войти в аккаунт" : "Создать аккаунт"}
              </>
            )}
          </motion.button>
        </form>

        <div className="text-center mt-6 space-y-2">
          <p className={`text-sm ${textSecondary}`}>
            {isLogin ? "Нет аккаунта? " : "Уже есть аккаунт? "}
            <button 
              type="button" 
              onClick={() => setIsLogin(!isLogin)}
              className="text-indigo-500 font-bold hover:text-indigo-400 transition"
            >
              {isLogin ? "Зарегистрироваться" : "Войти"}
            </button>
          </p>
          
          <p className={`text-[11px] ${darkMode ? "text-slate-600" : "text-gray-400"}`}>
            При регистрации автоматически назначается выбранная роль. <br/>
            Роль «Репетитор» требует специального кода.
          </p>
        </div>
      </motion.div>
    </div>
  );
}