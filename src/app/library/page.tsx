"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense, useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, deleteDoc, updateDoc, query, where,
  onSnapshot, doc,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const firebaseConfig = {
  apiKey: "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4",
  authDomain: "tutor-platform-a5e37.firebaseapp.com",
  projectId: "tutor-platform-a5e37",
  storageBucket: "tutor-platform-a5e37.firebasestorage.app",
  messagingSenderId: "115123071384",
  appId: "1:115123071384:web:9517a29ed1fc2c46e163ed",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Анимации
const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const slideUp = {
  initial: { opacity: 0, y: 50 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 50 }
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05
    }
  }
};

const staggerItem = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 }
};

// ========== 🧪 ХИМИЧЕСКИЙ РЕДАКТОР ==========
function ChemistryEditor({ value, onChange, placeholder = "Введите текст...", rows = 3, className = "" }: any) {
  const [showPopup, setShowPopup] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) setShowPopup(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function insertSymbol(symbol: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + symbol + value.substring(end);
    onChange(newValue);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + symbol.length, start + symbol.length);
    }, 0);
  }

  const SUBSCRIPTS = ['₁','₂','₃','₄','','₆','₇'];
  const CHARGES = ['⁵⁻','⁴','³⁻','²⁻','⁻','⁺','²⁺','³⁺','⁴⁺','⁵⁺','⁶⁺','⁷⁺'];
  const OXIDATION = ['⁻⁵','⁻⁴','⁻³','⁻²','⁻¹','⁰','⁺¹','⁺²','⁺³','⁺⁴','⁺⁵','⁺⁶','⁺⁷'];
  const SIGNS = ['→','←','⇄','⇌','↑','↓','+','=','t°','°C'];

  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="flex-1 border-2 border-amber-200 rounded-xl p-3 text-sm bg-white/80 focus:border-amber-500 focus:outline-none resize-none transition-all"
        />
        <div className="relative" ref={popupRef}>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button" 
            onClick={() => setShowPopup(!showPopup)} 
            className="h-full px-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition shadow-md text-lg" 
            title="Химический редактор"
          >
            🧪
          </motion.button>
          <AnimatePresence>
            {showPopup && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border-2 border-amber-200 p-4 z-[100] max-h-[400px] overflow-y-auto"
              >
                <div className="space-y-3">
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                    <p className="text-xs font-bold text-amber-700 mb-2">🔢 Индексы</p>
                    <div className="flex flex-wrap gap-1">{SUBSCRIPTS.map(s => (<motion.button key={s} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} type="button" onClick={() => insertSymbol(s)} className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-sm font-bold text-amber-800 transition">{s}</motion.button>))}</div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                    <p className="text-xs font-bold text-amber-700 mb-2">⚡ Заряды</p>
                    <div className="flex flex-wrap gap-1">{CHARGES.map(s => (<motion.button key={s} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} type="button" onClick={() => insertSymbol(s)} className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg text-sm font-bold text-orange-800 transition">{s}</motion.button>))}</div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                    <p className="text-xs font-bold text-amber-700 mb-2">🎯 Степени окисления</p>
                    <div className="flex flex-wrap gap-1">{OXIDATION.map(s => (<motion.button key={s} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} type="button" onClick={() => insertSymbol(s)} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-bold text-red-800 transition">{s}</motion.button>))}</div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                    <p className="text-xs font-bold text-amber-700 mb-2">🔣 Знаки реакций</p>
                    <div className="flex flex-wrap gap-1">{SIGNS.map(s => (<motion.button key={s} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} type="button" onClick={() => insertSymbol(s)} className="px-3 py-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg text-sm font-bold text-stone-800 transition">{s}</motion.button>))}</div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ========== 📋 ШАБЛОНЫ ==========
const TASK_TEMPLATES = [
  { name: "🧪 ОВР — расставить коэффициенты", type: "text", subject: "chemistry", topic: "ОВР", topic_num: 13, text: "Расставьте коэффициенты в уравнении реакции методом электронного баланса:\n\nKMnO + HCl → KCl + MnCl₂ + Cl₂ + H₂O\n\nУкажите окислитель и восстановитель.", answer: "2KMnO₄ + 16HCl = 2KCl + 2MnCl₂ + 5Cl₂ + 8H₂O\nОкислитель: KMnO₄, восстановитель: HCl", difficulty: "hard", max_score: 3, grading: "partial", grading_criteria: [{ condition: "Все коэффициенты верны + окислитель и восстановитель", points: 3 }, { condition: "Коэффициенты верны, но нет окислителя/восстановителя", points: 2 }, { condition: "2-3 ошибки", points: 1 }, { condition: "Более 3 ошибок", points: 0 }], time: 10, tags: "ОВР, ЕГЭ, баланс" },
  { name: "🧬 Генетическая задача", type: "text", subject: "biology", topic: "Генетические задачи", topic_num: 9, text: "У человека карий цвет глаз доминирует над голубым. Гетерозиготный кареглазый мужчина женился на голубоглазой женщине.\n\n1) Какие генотипы у родителей?\n2) Какая вероятность рождения голубоглазых детей?", answer: "1) P: Aa × aa\n2) Вероятность: 50%", difficulty: "medium", max_score: 2, grading: "partial", grading_criteria: [{ condition: "Верно генотипы + вероятность", points: 2 }, { condition: "Только генотипы или только вероятность", points: 1 }, { condition: "Ошибки", points: 0 }], time: 8, tags: "генетика, ЕГЭ" },
  { name: "📝 Тип реакции", type: "single_choice", subject: "chemistry", topic: "Реакции в неорганической химии", topic_num: 8, text: "Реакция 2H₂O₂ → 2H₂O + O₂ относится к типу:", variants: ["Соединения", "Разложения", "Замещения", "Обмена"], correct_indices: [1], difficulty: "easy", max_score: 1, grading: "binary", time: 2, tags: "типы реакций" },
  { name: " Соответствие: вещество — класс", type: "match", subject: "chemistry", topic: "Классы неорганических веществ", topic_num: 6, text: "Установите соответствие между веществом и его классом:", pairs: [{ left: "H₂SO₄", right: "Кислота" }, { left: "NaOH", right: "Основание" }, { left: "NaCl", right: "Соль" }, { left: "CaO", right: "Основный оксид" }], difficulty: "easy", max_score: 1, grading: "percentage", time: 3, tags: "классы" },
  { name: "🔢 Атомный радиус", type: "order", subject: "chemistry", topic: "Периодический закон", topic_num: 2, text: "Расположите элементы в порядке возрастания атомного радиуса:", order_items: ["Cl", "P", "Si", "Al", "Na"], difficulty: "medium", max_score: 1, grading: "binary", time: 3, tags: "периодичность" },
  { name: "✍️ Пропуски о клетке", type: "fill_blanks", subject: "biology", topic: "Клетка", topic_num: 2, text: "Органоид, отвечающий за синтез белка, называется ___.\nЭнергетические станции клетки — это ___.", answer: "рибосома, митохондрии", difficulty: "easy", max_score: 2, grading: "percentage", time: 2, tags: "клетка" },
];

// ========== КОДИФИКАТОР ==========
const TOPICS = {
  chemistry: [
    { num: 1, name: "Строение атома", block: "Теория", difficulty: "easy", time: 3 },
    { num: 2, name: "Периодический закон", block: "Теория", difficulty: "easy", time: 3 },
    { num: 3, name: "Химическая связь", block: "Теория", difficulty: "medium", time: 4 },
    { num: 4, name: "Валентность. Степень окисления", block: "Теория", difficulty: "medium", time: 3 },
    { num: 5, name: "Неорганическая номенклатура", block: "Неорганика", difficulty: "easy", time: 3 },
    { num: 6, name: "Классы неорганических веществ", block: "Неорганика", difficulty: "medium", time: 4 },
    { num: 7, name: "Свойства неорганических веществ", block: "Неорганика", difficulty: "medium", time: 5 },
    { num: 8, name: "Реакции в неорганической химии", block: "Неорганика", difficulty: "medium", time: 5 },
    { num: 9, name: "Свойства металлов", block: "Неорганика", difficulty: "medium", time: 4 },
    { num: 10, name: "Оксиды, кислоты, основания, соли", block: "Неорганика", difficulty: "medium", time: 5 },
    { num: 11, name: "Амфотерные оксиды и гидроксиды", block: "Неорганика", difficulty: "hard", time: 4 },
    { num: 12, name: "Реакции ионного обмена", block: "Неорганика", difficulty: "medium", time: 4 },
    { num: 13, name: "ОВР", block: "Неорганика", difficulty: "hard", time: 6 },
    { num: 14, name: "Электролиз", block: "Неорганика", difficulty: "hard", time: 5 },
    { num: 15, name: "Гидролиз солей", block: "Неорганика", difficulty: "hard", time: 5 },
    { num: 16, name: "Органическая номенклатура", block: "Органика", difficulty: "easy", time: 3 },
    { num: 17, name: "Углеводороды", block: "Органика", difficulty: "medium", time: 5 },
    { num: 18, name: "Кислородсодержащие органические вещества", block: "Органика", difficulty: "medium", time: 5 },
    { num: 19, name: "Азотсодержащие органические вещества", block: "Органика", difficulty: "medium", time: 5 },
    { num: 20, name: "Свойства углеводородов", block: "Органика", difficulty: "medium", time: 5 },
    { num: 21, name: "Свойства кислородсодержащих соединений", block: "Органика", difficulty: "medium", time: 5 },
    { num: 22, name: "Свойства азотсодержащих соединений", block: "Органика", difficulty: "medium", time: 5 },
    { num: 23, name: "Генетическая связь в органике", block: "Органика", difficulty: "hard", time: 6 },
    { num: 24, name: "Качественные реакции", block: "Практика", difficulty: "hard", time: 5 },
    { num: 25, name: "Разделение смесей", block: "Практика", difficulty: "medium", time: 4 },
    { num: 26, name: "Расчёты по формулам", block: "Расчёты", difficulty: "medium", time: 5 },
    { num: 27, name: "ОВР (развёрнутый)", block: "Часть 2", difficulty: "hard", time: 10 },
    { num: 28, name: "РИО (развёрнутый)", block: "Часть 2", difficulty: "hard", time: 8 },
    { num: 29, name: "Расчёты по уравнениям", block: "Расчёты", difficulty: "hard", time: 12 },
    { num: 30, name: "Термохимия", block: "Расчёты", difficulty: "hard", time: 8 },
    { num: 31, name: "Скорость реакций. Равновесие", block: "Теория", difficulty: "hard", time: 6 },
    { num: 32, name: "Цепочки (неорганика)", block: "Часть 2", difficulty: "hard", time: 10 },
    { num: 33, name: "Цепочки (органика)", block: "Часть 2", difficulty: "hard", time: 10 },
    { num: 34, name: "Комбинированная задача (1)", block: "Расчёты", difficulty: "hard", time: 15 },
    { num: 35, name: "Комбинированная задача (2)", block: "Расчёты", difficulty: "hard", time: 20 },
  ],
  biology: [
    { num: 1, name: "Биология как наука", block: "Общее", difficulty: "easy", time: 3 },
    { num: 2, name: "Клетка", block: "Клетка", difficulty: "medium", time: 5 },
    { num: 3, name: "Генетическая информация", block: "Клетка", difficulty: "hard", time: 6 },
    { num: 4, name: "Обмен веществ", block: "Клетка", difficulty: "hard", time: 6 },
    { num: 5, name: "Деление клетки", block: "Клетка", difficulty: "medium", time: 5 },
    { num: 6, name: "Организм", block: "Организм", difficulty: "medium", time: 5 },
    { num: 7, name: "Размножение", block: "Организм", difficulty: "medium", time: 5 },
    { num: 8, name: "Наследственность", block: "Генетика", difficulty: "hard", time: 7 },
    { num: 9, name: "Генетические задачи", block: "Генетика", difficulty: "hard", time: 10 },
    { num: 10, name: "Виды и популяции", block: "Экология", difficulty: "medium", time: 5 },
    { num: 11, name: "Клеточный уровень", block: "Системы", difficulty: "medium", time: 5 },
    { num: 12, name: "Организменный уровень", block: "Системы", difficulty: "medium", time: 5 },
    { num: 13, name: "Видовой уровень", block: "Системы", difficulty: "medium", time: 5 },
    { num: 14, name: "Экосистемный уровень", block: "Экология", difficulty: "medium", time: 5 },
    { num: 15, name: "Биосфера", block: "Экология", difficulty: "medium", time: 5 },
    { num: 16, name: "Эволюция", block: "Эволюция", difficulty: "hard", time: 6 },
    { num: 17, name: "Макроэволюция", block: "Эволюция", difficulty: "hard", time: 6 },
    { num: 18, name: "Возникновение жизни", block: "Эволюция", difficulty: "medium", time: 5 },
    { num: 19, name: "Антропогенез", block: "Эволюция", difficulty: "medium", time: 5 },
    { num: 20, name: "Экосистемно-популяционный уровень", block: "Экология", difficulty: "medium", time: 5 },
    { num: 21, name: "Селекция и биотехнология", block: "Биотех", difficulty: "medium", time: 5 },
    { num: 22, name: "Анализ процессов", block: "Анализ", difficulty: "hard", time: 7 },
    { num: 23, name: "Анализ данных", block: "Анализ", difficulty: "hard", time: 7 },
    { num: 24, name: "Описание объектов", block: "Практика", difficulty: "hard", time: 8 },
    { num: 25, name: "Развёрнутый ответ", block: "Часть 2", difficulty: "hard", time: 15 },
    { num: 26, name: "Молекулярная биология", block: "Расчёты", difficulty: "hard", time: 10 },
    { num: 27, name: "Генетика", block: "Расчёты", difficulty: "hard", time: 12 },
    { num: 28, name: "Экология", block: "Расчёты", difficulty: "hard", time: 10 },
  ],
};

const TASK_TYPES = [
  { value: "text", label: "Свободный ответ", icon: "text" },
  { value: "single_choice", label: "Один вариант", icon: "single" },
  { value: "multi_choice", label: "Несколько", icon: "multi" },
  { value: "order", label: "По порядку", icon: "order" },
  { value: "match", label: "Сопоставить", icon: "match" },
  { value: "fill_blanks", label: "Заполнить", icon: "fill" },
  { value: "assembly", label: "Из частей", icon: "assembly" },
  { value: "drag_drop", label: "Перетащить", icon: "drag" },
  { value: "photo", label: "Фото-задание", icon: "photo" },
];

const DIFFICULTY = {
  easy: { label: "Лёгкое", text: "text-emerald-700", bg: "bg-emerald-100" },
  medium: { label: "Среднее", text: "text-amber-700", bg: "bg-amber-100" },
  hard: { label: "Сложное", text: "text-rose-700", bg: "bg-rose-100" },
};

const GRADING_INFO = {
  binary: { label: "✅ Зачёт/Незачёт", desc: "Правильно = полный балл, иначе 0", example: "Верно → 1 балл, неверно → 0", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  partial: { label: "📊 Частичные баллы", desc: "Часть баллов за неполный ответ", example: "3/3 — всё верно, 2/3 — одна ошибка", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  percentage: { label: "📈 Процент", desc: "Оценка в процентах от максимума", example: "7 из 10 = 70%", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
};

function TaskTypeIcon({ type, className = "w-6 h-6" }: { type: string; className?: string }) {
  const icons: Record<string, JSX.Element> = {
    text: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    single: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>,
    multi: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12l2 2 4-4"/></svg>,
    order: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    match: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    fill: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
    assembly: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.241.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z"/></svg>,
    drag: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>,
    photo: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  };
  return icons[type] || null;
}

function LibraryContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "tutor";

  const [folders, setFolders] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterTopic, setFilterTopic] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [previewTask, setPreviewTask] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [darkMode, setDarkMode] = useState(false);
  const [showBulkTopic, setShowBulkTopic] = useState(false);
  const [bulkTopicValue, setBulkTopicValue] = useState("");

  const [taskType, setTaskType] = useState("text");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskText, setTaskText] = useState("");
  const [taskImage, setTaskImage] = useState("");
  const [taskImageName, setTaskImageName] = useState("");
  const [taskAnswer, setTaskAnswer] = useState("");
  const [taskAltAnswers, setTaskAltAnswers] = useState<string[]>([]);
  const [taskVariants, setTaskVariants] = useState("");
  const [taskCorrectIndices, setTaskCorrectIndices] = useState<number[]>([]);
  const [taskOrder, setTaskOrder] = useState("");
  const [taskPairs, setTaskPairs] = useState<{ left: string; right: string }[]>([]);
  const [taskBlanks, setTaskBlanks] = useState("");
  const [taskAssembly, setTaskAssembly] = useState("");
  const [taskDragDrop, setTaskDragDrop] = useState<{ item: string; target: string }[]>([]);
  const [taskTopic, setTaskTopic] = useState("");
  const [taskTopicNum, setTaskTopicNum] = useState<number | "">("");
  const [taskSubject, setTaskSubject] = useState<"chemistry" | "biology">("chemistry");
  const [taskMaxScore, setTaskMaxScore] = useState(1);
  const [taskDifficulty, setTaskDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [taskTime, setTaskTime] = useState(5);
  const [taskHint, setTaskHint] = useState("");
  const [taskSolution, setTaskSolution] = useState("");
  const [taskFolderId, setTaskFolderId] = useState("");
  const [taskTags, setTaskTags] = useState("");
  const [taskGrading, setTaskGrading] = useState<"binary" | "partial" | "percentage">("binary");
  const [taskGradingCriteria, setTaskGradingCriteria] = useState<{ condition: string; points: number }[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const [folderName, setFolderName] = useState("");
  const [folderParentId, setFolderParentId] = useState("");

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    const unsubFolders = onSnapshot(query(collection(db, "task_folders"), where("tutor_id", "==", uid)), (snap) => setFolders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubTasks = onSnapshot(query(collection(db, "tasks_bank"), where("tutor_id", "==", uid)), (snap) => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    setLoading(false);
    return () => { unsubFolders(); unsubTasks(); };
  }, [uid]);

  function parseVariants(s: string): string[] { return s.split(',').map(v => v.trim()).filter(v => v.length > 0); }
  function parseOrder(s: string): string[] { return s.split('\n').map(v => v.trim()).filter(v => v.length > 0); }
  function parseAssembly(s: string): string[] { return s.split('\n').map(v => v.trim()).filter(v => v.length > 0); }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { toast.error("Максимум 1MB"); return; }
    const reader = new FileReader();
    reader.onload = (e) => { setTaskImage(e.target?.result as string); setTaskImageName(file.name); toast.success("🖼️ Загружено!"); };
    reader.readAsDataURL(file);
  }

  function removeImage() { setTaskImage(""); setTaskImageName(""); }

  function applyTemplate(template: any) {
    setTaskType(template.type);
    setTaskSubject(template.subject);
    setTaskTopic(template.topic);
    setTaskTopicNum(template.topic_num);
    setTaskText(template.text);
    setTaskDifficulty(template.difficulty);
    setTaskMaxScore(template.max_score);
    setTaskTime(template.time);
    setTaskTags(template.tags);
    setTaskGrading(template.grading);
    setTaskGradingCriteria(template.grading_criteria || []);
    if (template.answer) setTaskAnswer(template.answer);
    if (template.variants) { setTaskVariants(template.variants.join(", ")); setTaskCorrectIndices(template.correct_indices || []); }
    if (template.pairs) setTaskPairs(template.pairs);
    if (template.order_items) setTaskOrder(template.order_items.join("\n"));
    setShowTemplates(false);
    setShowTaskForm(true);
    toast.success(`✨ Шаблон "${template.name}" применён!`);
  }

  function createSimilar(task: any) {
    setEditingTask(null);
    setTaskType(task.type);
    setTaskSubject(task.subject);
    setTaskTopic(task.topic);
    setTaskTopicNum(task.topic_num);
    setTaskText("");
    setTaskAnswer("");
    setTaskAltAnswers([]);
    setTaskVariants("");
    setTaskCorrectIndices([]);
    setTaskOrder("");
    setTaskPairs([]);
    setTaskBlanks("");
    setTaskAssembly("");
    setTaskDragDrop([]);
    setTaskDifficulty(task.difficulty);
    setTaskMaxScore(task.max_score);
    setTaskTime(task.time);
    setTaskTags(task.tags?.join(", ") || "");
    setTaskGrading(task.grading);
    setTaskGradingCriteria(task.grading_criteria || []);
    setTaskTitle("");
    setTaskHint("");
    setTaskSolution("");
    setTaskImage("");
    setTaskImageName("");
    setTaskFolderId(task.folder_id || "");
    setShowTaskForm(true);
    toast.success("📝 Создать похожее — заполните новый текст!");
  }

  async function saveTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) { toast.error("Введите название"); return; }
    if (!taskText.trim()) { toast.error("Введите текст задания"); return; }

    const variants = parseVariants(taskVariants);
    const order = parseOrder(taskOrder);
    const assembly = parseAssembly(taskAssembly);
    const allCorrectAnswers = [taskAnswer.trim(), ...taskAltAnswers.filter(a => a.trim())].filter(a => a);

    if ((taskType === "single_choice" || taskType === "multi_choice") && variants.length < 2) { toast.error("Минимум 2 варианта"); return; }
    if (taskType === "single_choice" && taskCorrectIndices.length !== 1) { toast.error("Выберите один правильный ответ"); return; }
    if (taskType === "multi_choice" && taskCorrectIndices.length < 1) { toast.error("Выберите хотя бы один правильный ответ"); return; }
    if (taskType === "order" && order.length < 2) { toast.error("Минимум 2 элемента"); return; }
    if (taskType === "match" && taskPairs.length < 2) { toast.error("Минимум 2 пары"); return; }
    if (taskType === "fill_blanks" && !taskBlanks.trim()) { toast.error("Введите текст с пропусками"); return; }
    if (taskType === "assembly" && assembly.length < 2) { toast.error("Минимум 2 части"); return; }
    if (taskType === "drag_drop" && taskDragDrop.length < 2) { toast.error("Минимум 2 элемента"); return; }
    if ((taskType === "text" || taskType === "photo") && !taskAnswer.trim()) { toast.error("Введите правильный ответ"); return; }

    const taskData: any = {
      tutor_id: uid, title: taskTitle.trim(), type: taskType, task_text: taskText.trim(),
      image_url: taskImage.trim() || null, image_name: taskImageName || null,
      topic: taskTopic, topic_num: taskTopicNum || null, subject: taskSubject,
      max_score: taskMaxScore, difficulty: taskDifficulty, estimated_time: taskTime,
      hint: taskHint.trim() || null, solution: taskSolution.trim() || null,
      folder_id: taskFolderId || null,
      tags: taskTags.split(',').map(t => t.trim()).filter(t => t),
      correct_answers: allCorrectAnswers, grading: taskGrading,
      grading_criteria: taskGrading === "partial" ? taskGradingCriteria : null,
      usage_count: editingTask?.usage_count || 0, success_rate: editingTask?.success_rate || 0,
      created_at: editingTask?.created_at || new Date().toISOString(), updated_at: new Date().toISOString(),
    };

    switch (taskType) {
      case "text": case "photo": taskData.correct_answer = taskAnswer.trim(); break;
      case "single_choice": case "multi_choice":
        taskData.variants = variants; taskData.correct_indices = taskCorrectIndices;
        taskData.correct_answer = taskCorrectIndices.map(i => variants[i]).join(", ");
        break;
      case "order": taskData.order_items = order; taskData.correct_answer = order.join(" → "); break;
      case "match": taskData.pairs = taskPairs; taskData.correct_answer = taskPairs.map(p => `${p.left} = ${p.right}`).join("; "); break;
      case "fill_blanks": taskData.blanks_text = taskBlanks; taskData.correct_answer = taskAnswer.trim(); break;
      case "assembly": taskData.assembly_parts = assembly; taskData.correct_answer = assembly.join(" + "); break;
      case "drag_drop": taskData.drag_items = taskDragDrop; taskData.correct_answer = taskDragDrop.map(d => `${d.item} → ${d.target}`).join("; "); break;
    }

    try {
      if (editingTask) { await updateDoc(doc(db, "tasks_bank", editingTask.id), taskData); toast.success("✨ Обновлено!"); }
      else { await addDoc(collection(db, "tasks_bank"), taskData); toast.success("✨ Добавлено!"); }
      resetTaskForm(); setShowTaskForm(false);
    } catch (error: any) { toast.error(`Ошибка: ${error.message}`); }
  }

  function resetTaskForm() {
    setTaskType("text"); setTaskTitle(""); setTaskText(""); setTaskImage(""); setTaskImageName(""); setTaskAnswer(""); setTaskAltAnswers([]);
    setTaskVariants(""); setTaskCorrectIndices([]); setTaskOrder(""); setTaskPairs([]);
    setTaskBlanks(""); setTaskAssembly(""); setTaskDragDrop([]); setTaskTopic(""); setTaskTopicNum("");
    setTaskSubject("chemistry"); setTaskMaxScore(1); setTaskDifficulty("medium"); setTaskTime(5);
    setTaskHint(""); setTaskSolution(""); setTaskFolderId(""); setTaskTags(""); setTaskGrading("binary");
    setTaskGradingCriteria([]); setEditingTask(null); setShowPreview(false);
  }

  function editTask(task: any) {
    setEditingTask(task); setTaskType(task.type || "text"); setTaskTitle(task.title || "");
    setTaskText(task.task_text || ""); setTaskImage(task.image_url || ""); setTaskImageName(task.image_name || ""); setTaskAnswer(task.correct_answer || "");
    setTaskAltAnswers(task.correct_answers?.filter((a: string) => a !== task.correct_answer) || []);
    setTaskVariants(task.variants?.join(", ") || ""); setTaskCorrectIndices(task.correct_indices || []);
    setTaskOrder(task.order_items?.join("\n") || ""); setTaskPairs(task.pairs || []);
    setTaskBlanks(task.blanks_text || ""); setTaskAssembly(task.assembly_parts?.join("\n") || "");
    setTaskDragDrop(task.drag_items || []); setTaskTopic(task.topic || "");
    setTaskTopicNum(task.topic_num || ""); setTaskSubject(task.subject || "chemistry");
    setTaskMaxScore(task.max_score || 1); setTaskDifficulty(task.difficulty || "medium");
    setTaskTime(task.estimated_time || 5); setTaskHint(task.hint || "");
    setTaskSolution(task.solution || ""); setTaskFolderId(task.folder_id || "");
    setTaskTags(task.tags?.join(", ") || ""); setTaskGrading(task.grading || "binary");
    setTaskGradingCriteria(task.grading_criteria || []); setShowTaskForm(true);
  }

  async function duplicateTask(task: any) {
    const newTask = { ...task }; delete newTask.id;
    newTask.title = `${task.title} (копия)`;
    newTask.created_at = new Date().toISOString();
    newTask.updated_at = new Date().toISOString();
    newTask.usage_count = 0; newTask.success_rate = 0;
    try { await addDoc(collection(db, "tasks_bank"), newTask); toast.success("📋 Дублировано!"); }
    catch (error: any) { toast.error(`Ошибка: ${error.message}`); }
  }

  async function deleteTask(id: string) {
    if (!confirm("Удалить задание?")) return;
    try { await deleteDoc(doc(db, "tasks_bank", id)); toast.success("️ Удалено"); }
    catch (error: any) { toast.error(`Ошибка: ${error.message}`); }
  }

  async function bulkUpdate(action: string, value: any) {
    if (selectedTasks.length === 0) { toast.error("Выберите задания"); return; }
    try {
      const promises = selectedTasks.map(id => updateDoc(doc(db, "tasks_bank", id), { [action]: value }));
      await Promise.all(promises);
      toast.success(`✨ Обновлено ${selectedTasks.length} заданий`);
      setSelectedTasks([]);
    } catch (error: any) { toast.error(`Ошибка: ${error.message}`); }
  }

  async function bulkDelete() {
    if (selectedTasks.length === 0) return;
    if (!confirm(`Удалить ${selectedTasks.length} заданий?`)) return;
    try {
      const promises = selectedTasks.map(id => deleteDoc(doc(db, "tasks_bank", id)));
      await Promise.all(promises);
      toast.success(`🗑️ Удалено ${selectedTasks.length} заданий`);
      setSelectedTasks([]);
    } catch (error: any) { toast.error(`Ошибка: ${error.message}`); }
  }

  function exportTasks() {
    const data = selectedTasks.length > 0 ? tasks.filter(t => selectedTasks.includes(t.id)) : tasks;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `tasks_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("📥 Экспортировано!");
  }

  function importTasks() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          if (!Array.isArray(imported)) { toast.error("Неверный формат"); return; }
          let count = 0;
          for (const task of imported) {
            const t = { ...task }; delete t.id;
            t.tutor_id = uid; t.created_at = new Date().toISOString();
            await addDoc(collection(db, "tasks_bank"), t); count++;
          }
          toast.success(`📥 Импортировано ${count} заданий!`);
        } catch { toast.error("Ошибка импорта"); }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  async function saveFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!folderName.trim()) { toast.error("Введите название папки"); return; }
    try {
      await addDoc(collection(db, "task_folders"), { tutor_id: uid, name: folderName.trim(), parent_id: folderParentId || null, created_at: new Date().toISOString() });
      toast.success("📁 Папка создана!"); setFolderName(""); setFolderParentId(""); setShowFolderForm(false);
    } catch (error: any) { toast.error(`Ошибка: ${error.message}`); }
  }

  async function deleteFolder(id: string) {
    if (!confirm("Удалить папку?")) return;
    try {
      await deleteDoc(doc(db, "task_folders", id));
      const subfolders = folders.filter(f => f.parent_id === id);
      for (const sub of subfolders) await deleteDoc(doc(db, "task_folders", sub.id));
      toast.success("🗑️ Папка удалена");
    } catch (error: any) { toast.error(`Ошибка: ${error.message}`); }
  }

  function addPair() { setTaskPairs([...taskPairs, { left: "", right: "" }]); }
  function removePair(idx: number) { setTaskPairs(taskPairs.filter((_, i) => i !== idx)); }
  function updatePair(idx: number, field: "left" | "right", value: string) { const newPairs = [...taskPairs]; newPairs[idx][field] = value; setTaskPairs(newPairs); }
  function addDragItem() { setTaskDragDrop([...taskDragDrop, { item: "", target: "" }]); }
  function removeDragItem(idx: number) { setTaskDragDrop(taskDragDrop.filter((_, i) => i !== idx)); }
  function updateDragItem(idx: number, field: "item" | "target", value: string) { const newItems = [...taskDragDrop]; newItems[idx][field] = value; setTaskDragDrop(newItems); }

  function handleTopicNumChange(num: number | "") {
    setTaskTopicNum(num);
    if (num) {
      const topic = TOPICS[taskSubject].find(t => t.num === num);
      if (topic) { setTaskTopic(topic.name); setTaskDifficulty(topic.difficulty as any); setTaskTime(topic.time); }
    }
  }

  function buildFolderTree(parentId: string | null = null): any[] {
    const children = folders.filter(f => {
      if (parentId === null) return !f.parent_id || f.parent_id === '' || f.parent_id === null;
      return f.parent_id === parentId;
    });
    return children.map(folder => {
      const count = tasks.filter(t => t.folder_id === folder.id).length;
      const subfolders = buildFolderTree(folder.id);
      const isExpanded = expandedFolders[folder.id] !== false;
      return { folder, count, isExpanded, subfolders };
    });
  }

  const filteredTasks = tasks.filter(task => {
    if (selectedFolder && task.folder_id !== selectedFolder) return false;
    if (filterType !== "all" && task.type !== filterType) return false;
    if (filterTopic !== "all" && task.topic !== filterTopic) return false;
    if (filterDifficulty !== "all" && task.difficulty !== filterDifficulty) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        task.title?.toLowerCase().includes(q) ||
        task.task_text?.toLowerCase().includes(q) ||
        task.topic?.toLowerCase().includes(q) ||
        task.tags?.some((t: string) => t.toLowerCase().includes(q)) ||
        task.correct_answer?.toLowerCase().includes(q) ||
        task.correct_answers?.some((a: string) => a.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const stats = useMemo(() => {
    const total = tasks.length;
    const byType: Record<string, number> = {};
    TASK_TYPES.forEach(t => byType[t.value] = 0);
    tasks.forEach(t => { if (t.type) byType[t.type] = (byType[t.type] || 0) + 1; });
    const byDifficulty = { easy: 0, medium: 0, hard: 0 };
    tasks.forEach(t => { if (t.difficulty) byDifficulty[t.difficulty]++; });
    const topics = new Set(tasks.map(t => t.topic).filter(Boolean)).size;
    const totalUsage = tasks.reduce((sum, t) => sum + (t.usage_count || 0), 0);
    const avgSuccess = tasks.length > 0 ? Math.round(tasks.reduce((sum, t) => sum + (t.success_rate || 0), 0) / tasks.length) : 0;
    return { total, byType, byDifficulty, topics, totalUsage, avgSuccess };
  }, [tasks]);

  const topicCoverage = useMemo(() => {
    const currentTopics = TOPICS[taskSubject];
    const coveredTopics = new Set(tasks.filter(t => t.subject === taskSubject && t.topic_num).map(t => t.topic_num));
    const covered = coveredTopics.size;
    const total = currentTopics.length;
    const percent = Math.round((covered / total) * 100);
    return { covered, total, percent, coveredTopics };
  }, [tasks, taskSubject]);

  function toggleSelect(id: string) {
    if (selectedTasks.includes(id)) setSelectedTasks(selectedTasks.filter(x => x !== id));
    else setSelectedTasks([...selectedTasks, id]);
  }

  function toggleSelectAll() {
    if (selectedTasks.length === filteredTasks.length) setSelectedTasks([]);
    else setSelectedTasks(filteredTasks.map(t => t.id));
  }

  function toggleFolderExpand(folderId: string) {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100 flex items-center justify-center">
        <div className="text-center"><div className="text-6xl mb-4 animate-pulse">🍂</div><p className="text-amber-700 font-serif italic">Загрузка...</p></div>
      </div>
    );
  }

  const folderTree = buildFolderTree();

  return (
    <div className={`min-h-screen relative overflow-hidden ${darkMode ? 'bg-gradient-to-br from-stone-900 via-zinc-900 to-stone-950 text-white' : 'bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100 text-stone-800'}`}>
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.2 }} transition={{ duration: 2 }} className="absolute top-10 left-10 text-8xl"></motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.2 }} transition={{ duration: 2, delay: 0.5 }} className="absolute bottom-20 right-10 text-7xl">🍁</motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.2 }} transition={{ duration: 2, delay: 1 }} className="absolute top-1/3 right-1/4 text-6xl">🌾</motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.2 }} transition={{ duration: 2, delay: 1.5 }} className="absolute bottom-1/3 left-1/4 text-6xl">📜</motion.div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <motion.span 
              initial={{ rotate: -180, opacity: 0 }} 
              animate={{ rotate: 0, opacity: 1 }} 
              transition={{ duration: 0.8, type: "spring" }}
              className="text-4xl"
            >
              📚
            </motion.span>
            <motion.h1 
              initial={{ opacity: 0, scale: 0.8 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ duration: 0.6, delay: 0.2 }}
              className={`text-4xl sm:text-5xl font-serif font-bold bg-gradient-to-r ${darkMode ? 'from-amber-400 via-orange-400 to-amber-300' : 'from-amber-700 via-orange-600 to-stone-700'} bg-clip-text text-transparent`}
            >
              Банк заданий
            </motion.h1>
            <motion.span 
              initial={{ rotate: 180, opacity: 0 }} 
              animate={{ rotate: 0, opacity: 1 }} 
              transition={{ duration: 0.8, type: "spring" }}
              className="text-4xl"
            >
              🍂
            </motion.span>
          </div>
          <motion.p 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ duration: 0.6, delay: 0.4 }}
            className={`font-serif italic text-sm ${darkMode ? 'text-amber-300/70' : 'text-stone-600'}`}
          >
            "I picked these petals in the cold December night" 
          </motion.p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.2 }}
          className={`${darkMode ? 'bg-zinc-900/80 border-zinc-700' : 'bg-white/80 border-amber-200'} backdrop-blur rounded-3xl p-5 border-2 mb-6 shadow-lg`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <motion.span 
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-2xl"
              >
                
              </motion.span>
              <div>
                <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-stone-800'}`}>Покрытие кодификатора {taskSubject === "chemistry" ? "🧪" : "🧬"}</h3>
                <p className={`text-xs ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>{topicCoverage.covered} из {topicCoverage.total} тем</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTaskSubject(taskSubject === "chemistry" ? "biology" : "chemistry")} 
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${darkMode ? 'bg-zinc-800 text-amber-400 hover:bg-zinc-700' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
              >
                {taskSubject === "chemistry" ? "🧪 Химия" : "🧬 Биология"}
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05, rotate: 180 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDarkMode(!darkMode)} 
                className={`p-2 rounded-lg transition ${darkMode ? 'bg-zinc-800 text-yellow-400 hover:bg-zinc-700' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`} 
                title="Сменить тему"
              >
                {darkMode ? '☀️' : '🌙'}
              </motion.button>
            </div>
          </div>
          <div className={`w-full h-4 rounded-full overflow-hidden ${darkMode ? 'bg-zinc-800' : 'bg-stone-200'}`}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${topicCoverage.percent}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-[10px] font-bold text-white"
            >
              {topicCoverage.percent}%
            </motion.div>
          </div>
          <motion.div 
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="flex flex-wrap gap-1 mt-3"
          >
            {TOPICS[taskSubject].map(t => {
              const isCovered = topicCoverage.coveredTopics.has(t.num);
              return (
                <motion.span 
                  key={t.num} 
                  variants={staggerItem}
                  whileHover={{ scale: 1.2, y: -2 }}
                  className={`text-[10px] px-2 py-1 rounded-full font-bold transition cursor-pointer ${isCovered ? 'bg-emerald-500 text-white' : darkMode ? 'bg-zinc-800 text-stone-500' : 'bg-stone-200 text-stone-500'}`} 
                  title={t.name}
                >
                  {t.num}
                </motion.span>
              );
            })}
          </motion.div>
        </motion.div>

        <motion.div 
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-6"
        >
          {[
            { label: 'Всего', value: stats.total, icon: '📚', color: 'amber' },
            { label: '🟢 Лёгкие', value: stats.byDifficulty.easy, icon: '🟢', color: 'emerald' },
            { label: '🟡 Средние', value: stats.byDifficulty.medium, icon: '🟡', color: 'amber' },
            { label: ' Сложные', value: stats.byDifficulty.hard, icon: '', color: 'rose' },
            { label: '📊 Использований', value: stats.totalUsage, icon: '📊', color: 'amber' },
            { label: '🎯 Сред. успех', value: `${stats.avgSuccess}%`, icon: '🎯', color: 'amber' },
          ].map((stat, idx) => (
            <motion.div 
              key={idx}
              variants={staggerItem}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className={`${darkMode ? 'bg-zinc-900/80 border-zinc-700' : 'bg-white/80 border-amber-200'} backdrop-blur rounded-2xl p-4 border-2 text-center shadow-sm cursor-pointer`}
            >
              <p className={`text-xs ${darkMode ? 'text-stone-400' : 'text-stone-500'} uppercase tracking-wide font-bold`}>{stat.label}</p>
              <motion.p 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + idx * 0.1, type: "spring" }}
                className={`text-2xl font-black mt-1 ${darkMode ? 'text-amber-400' : `text-${stat.color}-700`}`}
              >
                {stat.value}
              </motion.p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.4 }}
          className={`${darkMode ? 'bg-zinc-900/80 border-zinc-700' : 'bg-white/80 border-amber-200'} backdrop-blur rounded-3xl p-5 border-2 mb-6 shadow-lg`}
        >
          <div className="flex flex-wrap gap-3 items-center justify-between mb-3">
            <div className="flex gap-2 flex-wrap">
              <motion.button 
                whileHover={{ scale: 1.05, boxShadow: "0 10px 20px rgba(251, 146, 60, 0.3)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { resetTaskForm(); setShowTaskForm(true); }} 
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl text-sm font-bold hover:from-amber-700 hover:to-orange-700 transition shadow-md"
              >
                + Новое задание
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowTemplates(true)} 
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm font-bold hover:from-purple-700 hover:to-pink-700 transition shadow-md"
              >
                📋 Шаблоны
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFolderForm(true)} 
                className={`px-4 py-2 ${darkMode ? 'bg-zinc-800 text-amber-400 border-zinc-700' : 'bg-white border-amber-200 text-stone-700'} border-2 rounded-xl text-sm font-bold hover:bg-amber-50 transition`}
              >
                + Папка
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={exportTasks} 
                className={`px-4 py-2 ${darkMode ? 'bg-zinc-800 text-amber-400 border-zinc-700' : 'bg-white border-amber-200 text-stone-700'} border-2 rounded-xl text-sm font-bold hover:bg-amber-50 transition`}
              >
                📥 Экспорт
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={importTasks} 
                className={`px-4 py-2 ${darkMode ? 'bg-zinc-800 text-amber-400 border-zinc-700' : 'bg-white border-amber-200 text-stone-700'} border-2 rounded-xl text-sm font-bold hover:bg-amber-50 transition`}
              >
                📤 Импорт
              </motion.button>
            </div>
            <div className="flex gap-2">
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setViewMode("list")} 
                className={`p-2 rounded-lg transition ${viewMode === "list" ? "bg-amber-100 text-amber-700" : darkMode ? "text-stone-400 hover:bg-zinc-800" : "text-stone-400 hover:bg-stone-100"}`}
              >
                ☰
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setViewMode("grid")} 
                className={`p-2 rounded-lg transition ${viewMode === "grid" ? "bg-amber-100 text-amber-700" : darkMode ? "text-stone-400 hover:bg-zinc-800" : "text-stone-400 hover:bg-stone-100"}`}
              >
                ▦
              </motion.button>
            </div>
          </div>

          <AnimatePresence>
            {selectedTasks.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`mb-3 p-3 ${darkMode ? 'bg-amber-900/30 border-amber-700' : 'bg-amber-50 border-amber-200'} border rounded-xl flex items-center gap-3 flex-wrap`}
              >
                <span className={`text-sm font-bold ${darkMode ? 'text-amber-400' : 'text-amber-800'}`}>Выбрано: {selectedTasks.length}</span>
                <select onChange={(e) => { if (e.target.value) { bulkUpdate(e.target.value.split(':')[0], e.target.value.split(':')[1]); e.target.value = ""; } }} className={`px-3 py-1.5 ${darkMode ? 'bg-zinc-800 border-amber-700 text-white' : 'bg-white border-amber-300'} rounded-lg text-sm`}>
                  <option value="">Массовые операции...</option>
                  <option value="difficulty:easy">→ Лёгкие</option>
                  <option value="difficulty:medium">→ Средние</option>
                  <option value="difficulty:hard">→ Сложные</option>
                  <option value="subject:chemistry">→ Химия</option>
                  <option value="subject:biology">→ Биология</option>
                </select>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowBulkTopic(true)} 
                  className={`px-3 py-1.5 ${darkMode ? 'bg-amber-700 text-white' : 'bg-amber-500 text-white'} rounded-lg text-sm font-bold hover:bg-amber-600 transition`}
                >
                  ️ Сменить тему
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={bulkDelete} 
                  className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 transition"
                >
                  🗑️ Удалить
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedTasks([])} 
                  className={`px-3 py-1.5 ${darkMode ? 'bg-zinc-700 text-white' : 'bg-stone-200 text-stone-700'} rounded-lg text-sm font-bold hover:bg-stone-300 transition`}
                >
                  ✕ Снять
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2 flex-wrap">
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="🔍 Умный поиск (по тексту, ответам, тегам)..." className={`px-3 py-2 ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white/80 border-amber-200'} rounded-xl text-sm focus:border-amber-500 focus:outline-none w-64 transition`} />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={`px-3 py-2 ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white/80 border-amber-200'} rounded-xl text-sm focus:border-amber-500 focus:outline-none`}>
              <option value="all">Все типы</option>
              {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={filterTopic} onChange={(e) => setFilterTopic(e.target.value)} className={`px-3 py-2 ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white/80 border-amber-200'} rounded-xl text-sm focus:border-amber-500 focus:outline-none`}>
              <option value="all">Все темы</option>
              {Array.from(new Set(tasks.map(t => t.topic).filter(Boolean))).map(topic => (<option key={topic as string} value={topic}>{topic}</option>))}
            </select>
            <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)} className={`px-3 py-2 ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white/80 border-amber-200'} rounded-xl text-sm focus:border-amber-500 focus:outline-none`}>
              <option value="all">Все сложности</option>
              <option value="easy"> Лёгкие</option>
              <option value="medium">🟡 Средние</option>
              <option value="hard"> Сложные</option>
            </select>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="lg:col-span-1"
          >
            <div className={`${darkMode ? 'bg-zinc-900/80 border-zinc-700' : 'bg-white/80 border-amber-200'} backdrop-blur rounded-3xl p-4 border-2 shadow-lg sticky top-4`}>
              <h3 className={`font-serif font-bold mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-stone-800'}`}><span></span> Папки ({folders.length})</h3>
              <motion.button 
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedFolder(null)} 
                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition mb-2 ${!selectedFolder ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white" : darkMode ? "hover:bg-zinc-800 text-stone-300" : "hover:bg-amber-50 text-stone-700"}`}
              >
                📋 Все задания ({tasks.length})
              </motion.button>
              {folderTree.length === 0 && folders.length === 0 && <p className={`text-xs italic text-center py-4 ${darkMode ? 'text-stone-500' : 'text-stone-500'}`}>Нет папок. Создайте первую!</p>}
              {folderTree.map(({ folder, count, isExpanded, subfolders }) => (
                <motion.div 
                  key={folder.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <motion.button 
                      whileHover={{ scale: 1.02, x: 5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { if (subfolders.length > 0) toggleFolderExpand(folder.id); setSelectedFolder(folder.id); }} 
                      className={`flex-1 text-left px-3 py-2 rounded-xl text-sm transition ${selectedFolder === folder.id ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white" : darkMode ? "hover:bg-zinc-800 text-stone-300" : "hover:bg-amber-50 text-stone-700"}`}
                    >
                      {subfolders.length > 0 ? (isExpanded ? '📂' : '📁') : '📄'} {folder.name}
                    </motion.button>
                    <span className={`text-xs px-1 ${darkMode ? 'text-stone-500' : 'text-stone-500'}`}>{count}</span>
                    <motion.button 
                      whileHover={{ scale: 1.2, rotate: 90 }}
                      whileTap={{ scale: 0.8 }}
                      onClick={() => deleteFolder(folder.id)} 
                      className="text-red-400 hover:text-red-600 text-xs"
                    >
                      ️
                    </motion.button>
                  </div>
                  <AnimatePresence>
                    {isExpanded && subfolders.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`ml-4 ${darkMode ? 'border-l-2 border-amber-700' : 'border-l-2 border-amber-200'} pl-2 mt-1`}
                      >
                        {subfolders.map(sub => (
                          <motion.div 
                            key={sub.folder.id} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="mb-1"
                          >
                            <div className="flex items-center gap-1">
                              <motion.button 
                                whileHover={{ scale: 1.02, x: 3 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedFolder(sub.folder.id)} 
                                className={`flex-1 text-left px-3 py-1.5 rounded-lg text-xs transition ${selectedFolder === sub.folder.id ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white" : darkMode ? "hover:bg-zinc-800 text-stone-300" : "hover:bg-amber-50 text-stone-700"}`}
                              >
                                📄 {sub.folder.name}
                              </motion.button>
                              <span className={`text-xs px-1 ${darkMode ? 'text-stone-500' : 'text-stone-500'}`}>{sub.count}</span>
                              <motion.button 
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.8 }}
                                onClick={() => deleteFolder(sub.folder.id)} 
                                className="text-red-400 hover:text-red-600 text-xs"
                              >
                                🗑️
                              </motion.button>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="lg:col-span-3"
          >
            <div className={`${darkMode ? 'bg-zinc-900/80 border-zinc-700' : 'bg-white/80 border-amber-200'} backdrop-blur rounded-3xl p-5 border-2 shadow-lg`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-serif font-bold ${darkMode ? 'text-white' : 'text-stone-800'}`}>📝 Задания ({filteredTasks.length})</h3>
                {filteredTasks.length > 0 && (
                  <motion.label 
                    whileHover={{ scale: 1.05 }}
                    className={`flex items-center gap-2 text-sm ${darkMode ? 'text-stone-300' : 'text-stone-600'} cursor-pointer`}
                  >
                    <input type="checkbox" checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0} onChange={toggleSelectAll} className="w-4 h-4 accent-amber-500" />
                    Выбрать все
                  </motion.label>
                )}
              </div>

              <AnimatePresence mode="wait">
                {filteredTasks.length === 0 ? (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="text-center py-16"
                  >
                    <motion.p 
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-6xl mb-3"
                    >
                      📭
                    </motion.p>
                    <p className={`font-serif italic ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>{searchQuery || filterType !== "all" || filterTopic !== "all" ? "Ничего не найдено" : "Нет заданий"}</p>
                  </motion.div>
                ) : viewMode === "list" ? (
                  <motion.div 
                    key="list"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    className="space-y-2"
                  >
                    {filteredTasks.map(task => {
                      const diff = DIFFICULTY[task.difficulty as keyof typeof DIFFICULTY] || DIFFICULTY.medium;
                      const gradingInfo = GRADING_INFO[task.grading as keyof typeof GRADING_INFO] || GRADING_INFO.binary;
                      const isSelected = selectedTasks.includes(task.id);
                      const hasCriteria = task.grading === "partial" && task.grading_criteria?.length > 0;
                      const maxCriteriaPoints = hasCriteria ? task.grading_criteria.reduce((sum: number, c: any) => sum + (c.points || 0), 0) : 0;
                      return (
                        <motion.div 
                          key={task.id} 
                          variants={staggerItem}
                          whileHover={{ scale: 1.01, x: 5 }}
                          whileTap={{ scale: 0.99 }}
                          className={`p-4 rounded-xl border transition hover:shadow-md ${isSelected ? (darkMode ? 'bg-amber-900/30 border-amber-700' : 'bg-amber-50 border-amber-300') : darkMode ? 'bg-zinc-900/50 border-zinc-700 hover:border-amber-700' : 'bg-white/80 border-amber-200 hover:border-amber-300'}`}
                        >
                          <div className="flex items-start gap-3">
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(task.id)} className="mt-1 w-4 h-4 accent-amber-500" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-lg"><TaskTypeIcon type={task.type} className="w-5 h-5" /></span>
                                <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-stone-900'}`}>{task.title}</h4>
                                {task.topic_num && <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${darkMode ? 'bg-zinc-800 text-stone-300' : 'bg-stone-100 text-stone-700'}`}>№{task.topic_num}</span>}
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${diff.bg} ${diff.text}`}>{diff.label}</span>
                                {task.topic && <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-800'}`}>{task.topic}</span>}
                                {task.estimated_time && <span className={`text-xs ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>⏱️ {task.estimated_time} мин</span>}
                                <span className={`text-xs px-2 py-0.5 rounded-full ${gradingInfo.bg} ${gradingInfo.color} border ${gradingInfo.border}`}>
                                  {gradingInfo.label}
                                  {hasCriteria && <span className="ml-1 font-bold">({maxCriteriaPoints} б.)</span>}
                                </span>
                                {task.image_url && <span className="text-xs text-amber-600">🖼️</span>}
                              </div>
                              <p className={`text-xs line-clamp-2 mb-2 ${darkMode ? 'text-stone-300' : 'text-stone-600'}`}>{task.task_text}</p>
                              <div className={`flex items-center gap-2 text-xs flex-wrap ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                                <span>{task.subject === "chemistry" ? "🧪" : "🧬"}</span>
                                <span>⭐ {task.max_score} б.</span>
                                {task.hint && <span className="text-amber-600">💡 подсказка</span>}
                                {task.solution && <span className="text-emerald-600">📖 разбор</span>}
                                {task.correct_answers?.length > 1 && <span className="text-blue-600">🎯 {task.correct_answers.length} ответов</span>}
                                {task.folder_id && <span>📁 {folders.find(f => f.id === task.folder_id)?.name}</span>}
                              </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <motion.button 
                                whileHover={{ scale: 1.2, rotate: 5 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setPreviewTask(task)} 
                                className={`p-2 ${darkMode ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'} rounded-lg transition text-sm`} 
                                title="Предпросмотр"
                              >
                                👁️
                              </motion.button>
                              <motion.button 
                                whileHover={{ scale: 1.2, rotate: -5 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => editTask(task)} 
                                className={`p-2 ${darkMode ? 'bg-amber-900/30 text-amber-400 hover:bg-amber-900/50' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'} rounded-lg transition text-sm`} 
                                title="Редактировать"
                              >
                                ✏️
                              </motion.button>
                              <motion.button 
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => createSimilar(task)} 
                                className={`p-2 ${darkMode ? 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'} rounded-lg transition text-sm`} 
                                title="Создать похожее"
                              >
                                📝
                              </motion.button>
                              <motion.button 
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => duplicateTask(task)} 
                                className={`p-2 ${darkMode ? 'bg-zinc-800 text-stone-400 hover:bg-zinc-700' : 'bg-stone-50 text-stone-700 hover:bg-stone-100'} rounded-lg transition text-sm`} 
                                title="Дублировать"
                              >
                                📋
                              </motion.button>
                              <motion.button 
                                whileHover={{ scale: 1.2, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => deleteTask(task.id)} 
                                className={`p-2 ${darkMode ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-50 text-red-700 hover:bg-red-100'} rounded-lg transition text-sm`} 
                                title="Удалить"
                              >
                                🗑️
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="grid"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    {filteredTasks.map(task => {
                      const diff = DIFFICULTY[task.difficulty as keyof typeof DIFFICULTY] || DIFFICULTY.medium;
                      const isSelected = selectedTasks.includes(task.id);
                      return (
                        <motion.div 
                          key={task.id} 
                          variants={staggerItem}
                          whileHover={{ scale: 1.05, y: -5 }}
                          whileTap={{ scale: 0.95 }}
                          className={`p-4 rounded-xl border transition hover:shadow-md cursor-pointer ${isSelected ? (darkMode ? 'bg-amber-900/30 border-amber-700' : 'bg-amber-50 border-amber-300') : darkMode ? 'bg-zinc-900/50 border-zinc-700 hover:border-amber-700' : 'bg-white/80 border-amber-200 hover:border-amber-300'}`} 
                          onClick={() => setPreviewTask(task)}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <TaskTypeIcon type={task.type} className="w-6 h-6" />
                            <h4 className={`font-bold text-sm flex-1 truncate ${darkMode ? 'text-white' : 'text-stone-900'}`}>{task.title}</h4>
                          </div>
                          <p className={`text-xs line-clamp-2 mb-3 ${darkMode ? 'text-stone-300' : 'text-stone-600'}`}>{task.task_text}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${diff.bg} ${diff.text}`}>{diff.label}</span>
                            <span className={`text-xs ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>⭐ {task.max_score} б.</span>
                            <span className={`text-xs ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>⏱️ {task.estimated_time} мин</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showTemplates && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" 
            onClick={() => setShowTemplates(false)}
          >
            <motion.div 
              {...scaleIn}
              className={`${darkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-amber-200'} rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border-2`} 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-5 rounded-t-3xl sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><span className="text-3xl">📋</span><h2 className="font-serif font-bold text-xl text-white">Шаблоны заданий</h2></div>
                  <motion.button 
                    whileHover={{ scale: 1.2, rotate: 90 }}
                    whileTap={{ scale: 0.8 }}
                    onClick={() => setShowTemplates(false)} 
                    className="text-white/80 hover:text-white text-3xl"
                  >
                    ×
                  </motion.button>
                </div>
              </div>
              <div className="p-6">
                <p className={`text-sm mb-4 ${darkMode ? 'text-stone-300' : 'text-stone-600'}`}>Выберите шаблон — форма заполнится автоматически.</p>
                <motion.div 
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  {TASK_TEMPLATES.map((template, idx) => {
                    const diffInfo = DIFFICULTY[template.difficulty as keyof typeof DIFFICULTY];
                    return (
                      <motion.div 
                        key={idx} 
                        variants={staggerItem}
                        whileHover={{ scale: 1.05, y: -5 }}
                        whileTap={{ scale: 0.95 }}
                        className={`${darkMode ? 'bg-zinc-800 border-zinc-700 hover:border-amber-700' : 'bg-gradient-to-br from-white to-amber-50 border-amber-200 hover:border-amber-400'} rounded-2xl p-5 border-2 hover:shadow-lg transition cursor-pointer`}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <TaskTypeIcon type={template.type} className={`w-8 h-8 ${darkMode ? 'text-amber-400' : 'text-amber-700'}`} />
                          <div className="flex-1">
                            <h3 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-stone-900'}`}>{template.name}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`text-xs ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>{template.subject === "chemistry" ? "🧪" : ""}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${diffInfo.bg} ${diffInfo.text}`}>{diffInfo.label}</span>
                              <span className={`text-xs ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>⭐ {template.max_score} б.</span>
                            </div>
                          </div>
                        </div>
                        <p className={`text-xs line-clamp-3 mb-3 ${darkMode ? 'text-stone-300' : 'text-stone-600'}`}>{template.text}</p>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button" 
                          onClick={() => applyTemplate(template)} 
                          className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-bold hover:from-purple-600 hover:to-pink-600 transition shadow-md"
                        >
                          ✨ Использовать
                        </motion.button>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTaskForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" 
            onClick={() => setShowTaskForm(false)}
          >
            <motion.div 
              {...slideUp}
              className={`${darkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-amber-200'} rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border-2`} 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-5 rounded-t-3xl sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><TaskTypeIcon type={taskType} className="w-6 h-6 text-white" /></div>
                    <h2 className="font-serif font-bold text-xl text-white">{editingTask ? "✏️ Редактировать" : "➕ Новое задание"}</h2>
                  </div>
                  <div className="flex gap-2">
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowPreview(!showPreview)} 
                      className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-bold transition"
                    >
                      👁️ Предпросмотр
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.2, rotate: 90 }}
                      whileTap={{ scale: 0.8 }}
                      onClick={() => setShowTaskForm(false)} 
                      className="text-white/80 hover:text-white text-3xl"
                    >
                      ×
                    </motion.button>
                  </div>
                </div>
              </div>

              <form onSubmit={saveTask} className={`p-6 space-y-4 ${darkMode ? 'text-white' : 'text-stone-800'}`}>
                <AnimatePresence>
                  {showPreview && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`${darkMode ? 'bg-amber-900/20 border-amber-700' : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'} rounded-2xl p-4 border-2`}
                    >
                      <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>👁️ Предпросмотр</p>
                      <div className={`${darkMode ? 'bg-zinc-800' : 'bg-white'} rounded-xl p-4 space-y-2`}>
                        {taskImage && <img src={taskImage} alt="Картинка задания" className="max-w-full rounded-lg" />}
                        <p className={`text-sm ${darkMode ? 'text-white' : 'text-stone-800'} whitespace-pre-wrap`}>{taskText || "Текст задания..."}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-4">
                  <div>
                    <label className={`text-sm font-bold mb-2 block ${darkMode ? 'text-white' : 'text-stone-700'}`}>📋 Тип задания</label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {TASK_TYPES.map(t => {
                        const isActive = taskType === t.value;
                        return (
                          <motion.button 
                            key={t.value} 
                            whileHover={{ scale: 1.05, y: -3 }}
                            whileTap={{ scale: 0.95 }}
                            type="button" 
                            onClick={() => setTaskType(t.value)} 
                            className={`relative p-2.5 rounded-xl border-2 transition-all hover:scale-105 hover:shadow-md ${isActive ? 'bg-gradient-to-br from-amber-500 to-orange-500 border-amber-600 text-white shadow-md shadow-amber-500/40' : darkMode ? 'bg-zinc-800 border-zinc-700 text-stone-300 hover:border-amber-700' : 'bg-white border-amber-200 text-stone-700 hover:border-amber-400 hover:bg-amber-50'}`}
                          >
                            <div className="flex flex-col items-center gap-1.5">
                              <div className={isActive ? 'text-white' : ''}><TaskTypeIcon type={t.icon} className="w-6 h-6" /></div>
                              <div className="text-[10px] font-bold text-center leading-tight">{t.label}</div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>Предмет</label>
                    <select value={taskSubject} onChange={(e) => { setTaskSubject(e.target.value as any); setTaskTopicNum(""); setTaskTopic(""); }} className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white/80 border-amber-200'} rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none`}>
                      <option value="chemistry"> Химия</option>
                      <option value="biology">🧬 Биология</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>🎯 Номер задания ЕГЭ</label>
                  <div className="flex gap-1 mt-1 flex-wrap max-h-32 overflow-y-auto">
                    {TOPICS[taskSubject].map(t => (
                      <motion.button 
                        key={t.num} 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        type="button" 
                        onClick={() => handleTopicNumChange(t.num)} 
                        className={`px-2 py-1 rounded-lg text-xs font-bold transition ${taskTopicNum === t.num ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md' : darkMode ? 'bg-zinc-800 text-stone-300 hover:bg-zinc-700' : 'bg-amber-50 text-stone-700 hover:bg-amber-100'}`} 
                        title={t.name}
                      >
                        {t.num}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>Название *</label>
                  <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Например: Задача на ОВР" className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white/80 border-amber-200'} rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none`} />
                </div>

                <div>
                  <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>Тема {taskTopicNum && <span className={`text-xs ml-2 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>(задание №{taskTopicNum})</span>}</label>
                  <input value={taskTopic} onChange={(e) => setTaskTopic(e.target.value)} placeholder="Например: ОВР" className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white/80 border-amber-200'} rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none`} />
                </div>

                <div>
                  <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>Текст задания * <span className={`text-xs ml-2 ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>💡 Нажми 🧪 для формул</span></label>
                  <ChemistryEditor value={taskText} onChange={setTaskText} placeholder="Введите текст задания..." rows={4} />
                </div>

                <div>
                  <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>🖼️ Картинка к заданию</label>
                  <div className="mt-2 space-y-2">
                    <motion.label 
                      whileHover={{ scale: 1.02 }}
                      className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed ${darkMode ? 'border-amber-700 hover:bg-amber-900/20' : 'border-amber-300 hover:bg-amber-50'} rounded-xl cursor-pointer transition`}
                    >
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      <span className="text-2xl"></span>
                      <span className={`text-sm font-bold ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>Нажми чтобы загрузить</span>
                    </motion.label>
                    <AnimatePresence>
                      {taskImage && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="relative"
                        >
                          <img src={taskImage} alt="Предпросмотр" className="max-h-48 w-full rounded-xl border-2 border-amber-200 object-contain" />
                          <motion.button 
                            whileHover={{ scale: 1.2, rotate: 90 }}
                            whileTap={{ scale: 0.8 }}
                            type="button" 
                            onClick={removeImage} 
                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition shadow-lg"
                          >
                            ✕
                          </motion.button>
                          {taskImageName && <p className={`text-xs mt-1 truncate ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>📄 {taskImageName}</p>}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <p className={`text-xs ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>💡 Максимум 1MB. JPG, PNG, GIF, WebP</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>⭐ Балл</label>
                    <input type="number" value={taskMaxScore} onChange={(e) => setTaskMaxScore(parseInt(e.target.value) || 1)} min={1} className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white/80 border-amber-200'} rounded-xl p-2 text-sm mt-1 focus:border-amber-500 focus:outline-none`} />
                  </div>
                  <div>
                    <label className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>🎯 Сложность</label>
                    <select value={taskDifficulty} onChange={(e) => setTaskDifficulty(e.target.value as any)} className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white/80 border-amber-200'} rounded-xl p-2 text-sm mt-1 focus:border-amber-500 focus:outline-none`}>
                      <option value="easy">🟢 Лёгкое</option>
                      <option value="medium">🟡 Среднее</option>
                      <option value="hard"> Сложное</option>
                    </select>
                  </div>
                  <div>
                    <label className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>⏱️ Время (мин)</label>
                    <input type="number" value={taskTime} onChange={(e) => setTaskTime(parseInt(e.target.value) || 5)} min={1} className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white/80 border-amber-200'} rounded-xl p-2 text-sm mt-1 focus:border-amber-500 focus:outline-none`} />
                  </div>
                  <div>
                    <label className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>💰 Оценивание</label>
                    <select value={taskGrading} onChange={(e) => setTaskGrading(e.target.value as any)} className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white/80 border-amber-200'} rounded-xl p-2 text-sm mt-1 focus:border-amber-500 focus:outline-none`}>
                      <option value="binary">✅ Зачёт/Незачёт</option>
                      <option value="partial">📊 Частичные баллы</option>
                      <option value="percentage">📈 Процент</option>
                    </select>
                  </div>
                </div>

                <motion.div 
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`${GRADING_INFO[taskGrading].bg} border-2 ${GRADING_INFO[taskGrading].border} rounded-2xl p-4`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{taskGrading === "binary" ? "✅" : taskGrading === "partial" ? "📊" : ""}</span>
                    <div className="flex-1">
                      <p className={`font-bold ${GRADING_INFO[taskGrading].color} text-sm mb-1`}>{GRADING_INFO[taskGrading].label}</p>
                      <p className={`text-xs mb-2 ${darkMode ? 'text-stone-300' : 'text-stone-700'}`}>{GRADING_INFO[taskGrading].desc}</p>
                      <div className={`${darkMode ? 'bg-zinc-800' : 'bg-white/60'} rounded-lg p-2`}>
                        <p className={`text-xs ${darkMode ? 'text-stone-300' : 'text-stone-600'}`}><span className="font-bold">Пример:</span> {GRADING_INFO[taskGrading].example}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <AnimatePresence>
                  {taskGrading === "partial" && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`${darkMode ? 'bg-amber-900/20 border-amber-700' : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300'} rounded-2xl p-4 border-2`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className={`font-bold text-sm ${darkMode ? 'text-amber-400' : 'text-amber-800'}`}>📊 Настройка критериев</h4>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button" 
                          onClick={() => setTaskGradingCriteria([...taskGradingCriteria, { condition: "", points: 0 }])} 
                          className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-xs font-bold hover:from-amber-600 hover:to-orange-600 transition"
                        >
                          + Добавить
                        </motion.button>
                      </div>
                      {taskGradingCriteria.length === 0 ? (
                        <div className={`text-center py-6 ${darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white/60 border-amber-300'} rounded-xl border-2 border-dashed`}>
                          <p className="text-3xl mb-2">📝</p>
                          <p className={`text-xs font-medium ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>Добавьте критерии</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {taskGradingCriteria.map((criterion, idx) => (
                            <motion.div 
                              key={idx} 
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              className={`flex items-center gap-2 ${darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-amber-200'} rounded-xl p-3 border`}
                            >
                              <span className={`text-sm font-bold w-6 ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>{idx + 1}.</span>
                              <input type="text" value={criterion.condition} onChange={(e) => { const newCriteria = [...taskGradingCriteria]; newCriteria[idx].condition = e.target.value; setTaskGradingCriteria(newCriteria); }} placeholder="Условие" className={`flex-1 ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-amber-200'} rounded-lg px-3 py-1.5 text-sm focus:border-amber-500 focus:outline-none`} />
                              <span className={`text-sm font-bold ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>=</span>
                              <input type="number" value={criterion.points} onChange={(e) => { const newCriteria = [...taskGradingCriteria]; newCriteria[idx].points = parseInt(e.target.value) || 0; setTaskGradingCriteria(newCriteria); }} min={0} className={`w-16 ${darkMode ? 'bg-zinc-900 border-zinc-700 text-amber-400' : 'bg-white border-amber-200 text-amber-700'} rounded-lg px-3 py-1.5 text-sm text-center font-bold focus:border-amber-500 focus:outline-none`} />
                              <span className={`text-sm font-bold ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>б.</span>
                              <motion.button 
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.8 }}
                                type="button" 
                                onClick={() => setTaskGradingCriteria(taskGradingCriteria.filter((_, i) => i !== idx))} 
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              >
                                🗑️
                              </motion.button>
                            </motion.div>
                          ))}
                          <div className={`flex items-center justify-between ${darkMode ? 'bg-amber-900/30' : 'bg-amber-100'} rounded-xl p-3 mt-2`}>
                            <span className={`text-sm font-bold ${darkMode ? 'text-amber-400' : 'text-amber-800'}`}> Максимум:</span>
                            <span className={`text-lg font-black ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>{taskGradingCriteria.reduce((sum, c) => sum + (c.points || 0), 0)} б.</span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {(taskType === "text" || taskType === "photo") && (
                  <div className={`${darkMode ? 'bg-emerald-900/20 border-emerald-700' : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'} rounded-2xl p-4 border-2`}>
                    <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>✅ Правильный ответ *</label>
                    <ChemistryEditor value={taskAnswer} onChange={setTaskAnswer} placeholder="Основной ответ" rows={2} className="mt-1" />
                    <div className="mt-3">
                      <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>🎯 Альтернативные ответы <span className={`text-xs ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>(каждый с новой строки)</span></label>
                      <ChemistryEditor value={taskAltAnswers.join('\n')} onChange={(v: string) => setTaskAltAnswers(v.split('\n'))} placeholder={"H2O\nH₂O\nвода"} rows={3} className="mt-1" />
                      <p className={`text-xs mt-1 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>💡 Все эти ответы будут засчитаны</p>
                      {taskAltAnswers.filter(a => a.trim()).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">{taskAltAnswers.filter(a => a.trim()).map((a, i) => (<span key={i} className={`text-xs px-2 py-1 ${darkMode ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-800'} rounded-full`}>✓ {a}</span>))}</div>
                      )}
                    </div>
                  </div>
                )}

                {(taskType === "single_choice" || taskType === "multi_choice") && (
                  <div>
                    <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>Варианты ответов (через запятую) *</label>
                    <input value={taskVariants} onChange={(e) => setTaskVariants(e.target.value)} placeholder="Вариант 1, Вариант 2, Вариант 3" className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white/80 border-amber-200'} rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none`} />
                    {parseVariants(taskVariants).length > 0 && (
                      <div className="mt-3 space-y-1">
                        <p className={`text-xs font-bold ${darkMode ? 'text-stone-300' : 'text-stone-600'}`}>{taskType === "single_choice" ? "Выберите правильный ответ:" : "Выберите правильные ответы:"}</p>
                        {parseVariants(taskVariants).map((v, i) => (
                          <motion.label 
                            key={i} 
                            whileHover={{ scale: 1.02, x: 5 }}
                            className={`flex items-center gap-2 p-2 ${darkMode ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-amber-50 hover:bg-amber-100'} rounded-lg cursor-pointer transition`}
                          >
                            <input type={taskType === "single_choice" ? "radio" : "checkbox"} name="correct" checked={taskCorrectIndices.includes(i)} onChange={() => { if (taskType === "single_choice") setTaskCorrectIndices([i]); else { if (taskCorrectIndices.includes(i)) setTaskCorrectIndices(taskCorrectIndices.filter(x => x !== i)); else setTaskCorrectIndices([...taskCorrectIndices, i]); } }} className="w-4 h-4 accent-amber-600" />
                            <span className={`text-sm flex-1 ${darkMode ? 'text-white' : 'text-stone-700'}`}>{i + 1}. {v}</span>
                            {taskCorrectIndices.includes(i) && <span className="text-xs text-emerald-600 font-bold">✓ правильный</span>}
                          </motion.label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {taskType === "order" && (
                  <div>
                    <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>Элементы в правильном порядке *</label>
                    <textarea value={taskOrder} onChange={(e) => setTaskOrder(e.target.value)} rows={5} placeholder={"1. Первый\n2. Второй\n3. Третий"} className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white/80 border-amber-200'} rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none resize-none font-mono`} />
                    {parseOrder(taskOrder).length > 0 && (
                      <div className="mt-3 space-y-1">{parseOrder(taskOrder).map((item, i) => (<div key={i} className={`flex items-center gap-2 p-2 ${darkMode ? 'bg-zinc-800' : 'bg-amber-50'} rounded-lg`}><span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span><span className={`text-sm ${darkMode ? 'text-white' : 'text-stone-700'}`}>{item}</span></div>))}</div>
                    )}
                  </div>
                )}

                {taskType === "match" && (
                  <div>
                    <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>Пары соответствий *</label>
                    <div className="space-y-2 mt-2">
                      {taskPairs.map((pair, i) => (
                        <motion.div 
                          key={i} 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-2"
                        >
                          <input value={pair.left} onChange={(e) => updatePair(i, "left", e.target.value)} placeholder="Левая часть" className={`flex-1 ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white/80 border-amber-200'} rounded-lg p-2 text-sm focus:border-amber-500 focus:outline-none`} />
                          <span className={`font-bold ${darkMode ? 'text-amber-400' : 'text-amber-500'}`}>=</span>
                          <input value={pair.right} onChange={(e) => updatePair(i, "right", e.target.value)} placeholder="Правая часть" className={`flex-1 ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white/80 border-amber-200'} rounded-lg p-2 text-sm focus:border-amber-500 focus:outline-none`} />
                          <motion.button 
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.8 }}
                            type="button" 
                            onClick={() => removePair(i)} 
                            className="p-2 text-red-400 hover:text-red-600"
                          >
                            🗑️
                          </motion.button>
                        </motion.div>
                      ))}
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button" 
                      onClick={addPair} 
                      className={`mt-2 w-full py-2 border-2 border-dashed ${darkMode ? 'border-amber-700 text-amber-400 hover:bg-amber-900/20' : 'border-amber-300 text-amber-700 hover:bg-amber-50'} rounded-xl text-sm font-bold transition`}
                    >
                      + Добавить пару
                    </motion.button>
                  </div>
                )}

                {taskType === "fill_blanks" && (
                  <div>
                    <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>Текст с пропусками *</label>
                    <ChemistryEditor value={taskBlanks} onChange={setTaskBlanks} placeholder="Используйте ___ для пропусков" rows={4} />
                    <div className="mt-3">
                      <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>Правильные ответы (через запятую) *</label>
                      <ChemistryEditor value={taskAnswer} onChange={setTaskAnswer} placeholder="ответ1, ответ2" rows={2} className="mt-1" />
                    </div>
                  </div>
                )}

                {taskType === "assembly" && (
                  <div>
                    <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>Части для сборки *</label>
                    <ChemistryEditor value={taskAssembly} onChange={setTaskAssembly} placeholder={"H₂\nO₂\nH₂O"} rows={5} />
                    {parseAssembly(taskAssembly).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">{parseAssembly(taskAssembly).map((part, i) => (<div key={i} className={`px-3 py-1.5 ${darkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-800'} rounded-lg text-sm font-medium`}> {part}</div>))}</div>
                    )}
                  </div>
                )}

                {taskType === "drag_drop" && (
                  <div>
                    <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>Элементы и их цели *</label>
                    <div className="space-y-2 mt-2">
                      {taskDragDrop.map((item, i) => (
                        <motion.div 
                          key={i} 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-2"
                        >
                          <input value={item.item} onChange={(e) => updateDragItem(i, "item", e.target.value)} placeholder="Элемент" className={`flex-1 ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white/80 border-amber-200'} rounded-lg p-2 text-sm focus:border-amber-500 focus:outline-none`} />
                          <span className={`font-bold ${darkMode ? 'text-amber-400' : 'text-amber-500'}`}>→</span>
                          <input value={item.target} onChange={(e) => updateDragItem(i, "target", e.target.value)} placeholder="Цель" className={`flex-1 ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white/80 border-amber-200'} rounded-lg p-2 text-sm focus:border-amber-500 focus:outline-none`} />
                          <motion.button 
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.8 }}
                            type="button" 
                            onClick={() => removeDragItem(i)} 
                            className="p-2 text-red-400 hover:text-red-600"
                          >
                            🗑️
                          </motion.button>
                        </motion.div>
                      ))}
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button" 
                      onClick={addDragItem} 
                      className={`mt-2 w-full py-2 border-2 border-dashed ${darkMode ? 'border-amber-700 text-amber-400 hover:bg-amber-900/20' : 'border-amber-300 text-amber-700 hover:bg-amber-50'} rounded-xl text-sm font-bold transition`}
                    >
                      + Добавить элемент
                    </motion.button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>📁 Папка</label>
                    <select value={taskFolderId} onChange={(e) => setTaskFolderId(e.target.value)} className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white/80 border-amber-200'} rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none`}>
                      <option value="">Без папки</option>
                      {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>🏷️ Теги</label>
                    <input value={taskTags} onChange={(e) => setTaskTags(e.target.value)} placeholder="ОВР, ЕГЭ, сложная" className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white/80 border-amber-200'} rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none`} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>💡 Подсказка</label>
                    <ChemistryEditor value={taskHint} onChange={setTaskHint} placeholder="Подсказка..." rows={2} />
                  </div>
                  <div>
                    <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>📖 Разбор решения</label>
                    <ChemistryEditor value={taskSolution} onChange={setTaskSolution} placeholder="Подробное решение..." rows={2} />
                  </div>
                </div>

                <div className={`flex gap-3 pt-4 sticky bottom-0 ${darkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-amber-200'} border-t py-4 -mx-6 px-6`}>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit" 
                    className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 text-white py-3 rounded-xl font-bold hover:from-amber-700 hover:to-orange-700 transition shadow-lg"
                  >
                    💾 Сохранить
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button" 
                    onClick={() => setShowTaskForm(false)} 
                    className={`px-6 py-3 ${darkMode ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-stone-200 text-stone-700 hover:bg-stone-300'} rounded-xl font-bold transition`}
                  >
                    Отмена
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewTask && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" 
            onClick={() => setPreviewTask(null)}
          >
            <motion.div 
              {...scaleIn}
              className={`${darkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-amber-200'} rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2`} 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-5 rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><TaskTypeIcon type={previewTask.type} className="w-8 h-8 text-white" /><h2 className="font-serif font-bold text-xl text-white">{previewTask.title}</h2></div>
                  <motion.button 
                    whileHover={{ scale: 1.2, rotate: 90 }}
                    whileTap={{ scale: 0.8 }}
                    onClick={() => setPreviewTask(null)} 
                    className="text-white/80 hover:text-white text-3xl"
                  >
                    ×
                  </motion.button>
                </div>
              </div>
              <div className={`p-6 space-y-4 ${darkMode ? 'text-white' : 'text-stone-800'}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${DIFFICULTY[previewTask.difficulty as keyof typeof DIFFICULTY]?.bg} ${DIFFICULTY[previewTask.difficulty as keyof typeof DIFFICULTY]?.text}`}>{DIFFICULTY[previewTask.difficulty as keyof typeof DIFFICULTY]?.label}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-zinc-800 text-stone-300' : 'bg-stone-100 text-stone-700'}`}>⭐ {previewTask.max_score} б.</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-zinc-800 text-stone-300' : 'bg-stone-100 text-stone-700'}`}>⏱️ {previewTask.estimated_time} мин</span>
                  {previewTask.topic_num && <span className={`text-xs px-2 py-1 rounded-full font-mono ${darkMode ? 'bg-zinc-800 text-stone-300' : 'bg-stone-100 text-stone-700'}`}>№{previewTask.topic_num}</span>}
                  {previewTask.topic && <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-800'}`}>{previewTask.topic}</span>}
                </div>
                {previewTask.image_url && <div className={`${darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-amber-200'} rounded-xl p-2 border`}><img src={previewTask.image_url} alt="Картинка" className="max-w-full rounded-lg" /></div>}
                <div className={`${darkMode ? 'bg-amber-900/20 border-amber-700' : 'bg-amber-50 border-amber-200'} rounded-xl p-4 border`}><p className={`text-sm ${darkMode ? 'text-white' : 'text-stone-800'} whitespace-pre-wrap`}>{previewTask.task_text}</p></div>
                {previewTask.variants?.length > 0 && (
                  <div className="space-y-2">{previewTask.variants.map((v: string, i: number) => (<div key={i} className={`p-3 rounded-xl border ${previewTask.correct_indices?.includes(i) ? (darkMode ? 'bg-emerald-900/30 border-emerald-700' : 'bg-emerald-50 border-emerald-300') : darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-amber-200'}`}><span className={`font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>{String.fromCharCode(65 + i)}.</span> {v}{previewTask.correct_indices?.includes(i) && <span className="ml-2 text-emerald-600 font-bold">✓</span>}</div>))}</div>
                )}
                {previewTask.hint && (<div className={`${darkMode ? 'bg-amber-900/20 border-amber-700' : 'bg-amber-50 border-amber-200'} rounded-xl p-4 border`}><p className={`text-xs font-bold mb-1 ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>💡 Подсказка:</p><p className={`text-sm ${darkMode ? 'text-stone-300' : 'text-stone-700'}`}>{previewTask.hint}</p></div>)}
                {previewTask.solution && (<div className={`${darkMode ? 'bg-emerald-900/20 border-emerald-700' : 'bg-emerald-50 border-emerald-200'} rounded-xl p-4 border`}><p className={`text-xs font-bold mb-1 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>📖 Разбор:</p><p className={`text-sm ${darkMode ? 'text-stone-300' : 'text-stone-700'} whitespace-pre-wrap`}>{previewTask.solution}</p></div>)}
                <div className={`${darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-stone-100 border-stone-200'} rounded-xl p-4 border`}>
                  <p className={`text-xs font-bold mb-1 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>✅ Правильный ответ:</p>
                  <p className={`text-sm font-mono ${darkMode ? 'text-white' : 'text-stone-800'}`}>{previewTask.correct_answer}</p>
                  {previewTask.correct_answers?.length > 1 && (<div className="mt-2 flex flex-wrap gap-1">{previewTask.correct_answers.map((a: string, i: number) => (<span key={i} className={`text-xs px-2 py-1 ${darkMode ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-800'} rounded-full`}>✓ {a}</span>))}</div>)}
                </div>
                {previewTask.grading === "partial" && previewTask.grading_criteria?.length > 0 && (
                  <div className={`${darkMode ? 'bg-amber-900/20 border-amber-700' : 'bg-amber-50 border-amber-200'} rounded-xl p-4 border`}>
                    <p className={`text-xs font-bold mb-2 ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>📊 Критерии оценивания:</p>
                    <div className="space-y-1">{previewTask.grading_criteria.map((c: any, i: number) => (<div key={i} className="flex items-center justify-between text-sm"><span className={darkMode ? 'text-stone-300' : 'text-stone-700'}>{i + 1}. {c.condition || "Без названия"}</span><span className={`font-bold ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>{c.points} б.</span></div>))}<div className={`border-t ${darkMode ? 'border-amber-700' : 'border-amber-200'} pt-1 mt-1 flex justify-between font-bold`}><span className={darkMode ? 'text-amber-400' : 'text-amber-800'}>Максимум:</span><span className={darkMode ? 'text-amber-400' : 'text-amber-700'}>{previewTask.grading_criteria.reduce((sum: number, c: any) => sum + (c.points || 0), 0)} б.</span></div></div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFolderForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" 
            onClick={() => setShowFolderForm(false)}
          >
            <motion.div 
              {...scaleIn}
              className={`${darkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-amber-200'} rounded-3xl shadow-2xl w-full max-w-md border-2`} 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 rounded-t-3xl"><h2 className="font-serif font-bold text-xl text-white">📁 Новая папка</h2></div>
              <form onSubmit={saveFolder} className={`p-6 space-y-4 ${darkMode ? 'text-white' : 'text-stone-800'}`}>
                <div><label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>Название папки *</label><input value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="Например: ОВР" className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white/80 border-amber-200'} rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none`} /></div>
                <div><label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>📂 Родительская папка</label><select value={folderParentId} onChange={(e) => setFolderParentId(e.target.value)} className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white/80 border-amber-200'} rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none`}><option value="">— Корневая папка —</option>{folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select><p className={`text-xs mt-1 ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>💡 Оставьте пустым для корневой папки</p></div>
                <div className="flex gap-3">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit" 
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-xl font-bold hover:from-emerald-700 hover:to-teal-700 transition shadow-lg"
                  >
                    💾 Создать
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button" 
                    onClick={() => setShowFolderForm(false)} 
                    className={`px-6 py-3 ${darkMode ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-stone-200 text-stone-700 hover:bg-stone-300'} rounded-xl font-bold transition`}
                  >
                    Отмена
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBulkTopic && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" 
            onClick={() => setShowBulkTopic(false)}
          >
            <motion.div 
              {...scaleIn}
              className={`${darkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-amber-200'} rounded-3xl shadow-2xl w-full max-w-md border-2`} 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-5 rounded-t-3xl"><h2 className="font-serif font-bold text-xl text-white">🏷️ Массовая смена темы</h2></div>
              <div className={`p-6 space-y-4 ${darkMode ? 'text-white' : 'text-stone-800'}`}>
                <p className={`text-sm ${darkMode ? 'text-stone-300' : 'text-stone-600'}`}>Выбрано заданий: <b>{selectedTasks.length}</b></p>
                <div><label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>Новая тема</label><input value={bulkTopicValue} onChange={(e) => setBulkTopicValue(e.target.value)} placeholder="Например: ОВР" className={`w-full ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white/80 border-amber-200'} rounded-xl p-2.5 text-sm mt-1 focus:border-amber-500 focus:outline-none`} /></div>
                <div className="flex gap-3">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { bulkUpdate('topic', bulkTopicValue); setBulkTopicValue(""); setShowBulkTopic(false); }} 
                    className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 text-white py-3 rounded-xl font-bold hover:from-amber-700 hover:to-orange-700 transition shadow-lg"
                  >
                    💾 Применить
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowBulkTopic(false)} 
                    className={`px-6 py-3 ${darkMode ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-stone-200 text-stone-700 hover:bg-stone-300'} rounded-xl font-bold transition`}
                  >
                    Отмена
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100 flex items-center justify-center"><div className="text-center"><div className="text-6xl mb-4 animate-pulse">🍂</div><p className="text-amber-700 font-serif italic">Загрузка...</p></div></div>}>
      <LibraryContent />
    </Suspense>
  );
}