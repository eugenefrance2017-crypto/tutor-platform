"use client";
import { useState, useEffect, Suspense, useRef, useMemo } from "react";
import Link from "next/link";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore, doc, getDoc, updateDoc, deleteDoc, collection, addDoc,
  query, where, onSnapshot, getDocs, setDoc, writeBatch
} from "firebase/firestore";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, Folder, Star, Clock, FileText, Edit, Copy, Trash2,
  CheckCircle, Target, Zap, BookOpen, Layers, X, Award, Check,
  Database, Users, Upload, Eye, RotateCcw, GraduationCap, Settings,
  Save, Calculator, Timer, Download, Moon, Sun, Bell, Calendar, Tag, AlertTriangle,
  TrendingUp, AlertCircle, BarChart3, UserCheck, Flame
} from "lucide-react";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "tutor-platform-a5e37.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "tutor-platform-a5e37",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "tutor-platform-a5e37.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "115123071384",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:115123071384:web:9517a29ed1fc2c46e163ed",
};
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

type TaskType = 'text' | 'single_choice' | 'multi_choice' | 'order' | 'match' | 'fill_blanks' | 'assembly' | 'drag_drop' | 'photo';

interface TaskSection {
  id: string;
  title: string;
  type: TaskType;
  max_score: number;
  data: {
    task_text?: string;
    correct_answer?: string;
    alt_answers?: string[];
    variants?: string[];
    correct_indices?: number[];
    order_items?: string[];
    pairs?: { left: string; right: string }[];
    blanks_text?: string;
    assembly_parts?: string[];
    drag_items?: { item: string; target: string }[];
    hint?: string;
    solution?: string;
    image_url?: string;
  };
  grading_criteria?: { condition: string; points: number }[];
}

interface Homework {
  id: string;
  tutor_id: string;
  title: string;
  description?: string;
  max_score: number;
  sections: TaskSection[];
  folder_id?: string;
  conversion_scale?: string | Record<number, number>;
  type: string;
  time_limit?: number;
  assigned_students: string[];
  assigned_courses: string[];
  assigned_groups?: string[];
  due_date?: string;
  created_at: string;
  updated_at: string;
  status: string;
  difficulty?: string;
  scheduled_at?: string;
  tags?: string[];
}

const DIFFICULTY_INFO: any = {
  easy: { label: "🟢 Лёгкое", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
  medium: { label: "🟡 Среднее", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  hard: { label: "🔴 Сложное", color: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300" },
};

const TASK_TYPES = [
  { value: "text", label: "Свободный ответ", icon: "📝", color: "from-blue-500 to-cyan-500" },
  { value: "single_choice", label: "Один вариант", icon: "🔘", color: "from-purple-500 to-pink-500" },
  { value: "multi_choice", label: "Несколько", icon: "✅", color: "from-emerald-500 to-teal-500" },
  { value: "order", label: "По порядку", icon: "🔢", color: "from-orange-500 to-amber-500" },
  { value: "match", label: "Соответствие", icon: "🔗", color: "from-rose-500 to-pink-500" },
  { value: "fill_blanks", label: "Заполнить", icon: "✍️", color: "from-indigo-500 to-purple-500" },
  { value: "assembly", label: "Из частей", icon: "🧩", color: "from-cyan-500 to-blue-500" },
  { value: "drag_drop", label: "Перетащить", icon: "🎯", color: "from-amber-500 to-orange-500" },
  { value: "photo", label: "Фото-задание", icon: "📷", color: "from-pink-500 to-rose-500" },
];

const HOMEWORK_TYPES = [
  { value: 'text', label: 'Текстовый', icon: FileText },
  { value: 'single_choice', label: 'Тест', icon: Target },
  { value: 'multi_choice', label: 'Мульти', icon: CheckCircle },
  { value: 'matching', label: 'Соответствие', icon: Layers },
  { value: 'trial_exam', label: 'Пробник', icon: Timer },
];

const EGE_SCALES: Record<string, Record<number, number>> = {
  chemistry: {
    0: 0, 1: 4, 2: 7, 3: 10, 4: 14, 5: 17, 6: 20, 7: 23, 8: 27, 9: 30,
    10: 33, 11: 36, 12: 38, 13: 39, 14: 40, 15: 42, 16: 43, 17: 44, 18: 46,
    19: 47, 20: 48, 21: 49, 22: 51, 23: 52, 24: 53, 25: 55, 26: 56, 27: 57,
    28: 58, 29: 60, 30: 61, 31: 62, 32: 64, 33: 65, 34: 66, 35: 68,
    36: 69, 37: 70, 38: 71, 39: 73, 40: 74, 41: 75, 42: 77, 43: 78,
    44: 79, 45: 80, 46: 82, 47: 84, 48: 86, 49: 88, 50: 90, 51: 91,
    52: 93, 53: 95, 54: 97, 55: 99, 56: 100
  },
  biology: {
    0: 0, 1: 3, 2: 5, 3: 7, 4: 10, 5: 12, 6: 14, 7: 17, 8: 19, 9: 21,
    10: 24, 11: 26, 12: 28, 13: 31, 14: 33, 15: 36, 16: 38, 17: 40, 18: 41,
    19: 43, 20: 45, 21: 46, 22: 48, 23: 50, 24: 51, 25: 53, 26: 55, 27: 56,
    28: 58, 29: 60, 30: 61, 31: 63, 32: 65, 33: 66, 34: 68, 35: 70,
    36: 71, 37: 72, 38: 73, 39: 74, 40: 75, 41: 76, 42: 77, 43: 78,
    44: 79, 45: 80, 46: 81, 47: 83, 48: 85, 49: 86, 50: 88, 51: 90,
    52: 91, 53: 93, 54: 95, 55: 96, 56: 98, 57: 100
  }
};

const EGE_SCALE_LABELS: Record<string, string> = {
  chemistry: "🧪 Химия ЕГЭ (0-56 → 0-100)",
  biology: "🧬 Биология ЕГЭ (0-57 → 0-100)"
};

// ИСПРАВЛЕНО: тот же класс багов, что и в ChemistryEditor банка заданий и
// в ChemButton страницы прохождения ДЗ — недостающий индекс ₃, оторванные
// (пустые строки вместо самого символа) знаки зарядов и степеней
// окисления. Все три копии теперь используют один и тот же полный набор
// символов, чтобы редактор в любом месте приложения работал одинаково.
const SUBSCRIPTS = ['₁','₂','₃','₄','₅','₆','₇','₈','₉','₀'];
const CHARGES = ['⁵⁻','⁴⁻','³⁻','²⁻','¹⁻','¹⁺','²⁺','³⁺','⁴⁺','⁵⁺','⁶⁺','⁷⁺'];
const OXIDATION = ['⁻⁵','⁻⁴','⁻³','⁻²','⁻¹','⁰','⁺¹','⁺²','⁺³','⁺⁴','⁺⁵','⁺⁶','⁺⁷'];
const SIGNS = ['→','←','⇄','⇌','↑','↓','+','=','t°','°C'];

function ChemistryEditor({ value, onChange, placeholder = "", rows = 3, label = "", darkMode = false }: any) {
  const [showPopup, setShowPopup] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setShowPopup(false);
      }
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

  const bgInput = darkMode ? 'bg-[#1A1614] border-[#3D2817] text-[#F5E6D3]' : 'bg-[#FAF3E8] border-[#E8DCC8] text-[#3D2817]';
  const bgPopup = darkMode ? 'bg-[#2A2420] border-[#3D2817]' : 'bg-white border-[#E8DCC8]';
  const textLabel = darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]';

  return (
    <div className="relative">
      {label && <label className={`block text-sm font-semibold ${textLabel} mb-2`}>{label}</label>}
      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={`flex-1 border-2 rounded-xl p-3 text-base focus:border-[#C67B4B] focus:outline-none resize-none ${bgInput}`}
        />
        <div className="relative" ref={popupRef}>
          <button
            type="button"
            onClick={() => setShowPopup(!showPopup)}
            className="h-full px-4 bg-gradient-to-r from-[#C67B4B] to-[#8B3A3A] text-white rounded-xl hover:from-[#A86535] hover:to-[#7A2F2F] transition shadow-md text-xl"
          >
            🧪
          </button>
          {showPopup && (
            <div className={`fixed right-4 bottom-4 w-80 rounded-2xl shadow-2xl border-2 p-4 z-[100] max-h-[400px] overflow-y-auto ${bgPopup}`}>
              <div className="space-y-3">
                <div>
                  <p className={`text-sm font-bold ${textLabel} mb-2`}>🔢 Индексы</p>
                  <div className="flex flex-wrap gap-1">
                    {SUBSCRIPTS.map(s => (
                      <button key={s} type="button" onClick={() => insertSymbol(s)} className={`px-3 py-2 border-2 rounded-lg text-sm font-bold ${darkMode ? 'bg-[#1A1614] border-[#3D2817] text-[#C67B4B] hover:bg-[#3D2817]' : 'bg-[#FAF3E8] border-[#E8DCC8] text-[#C67B4B] hover:bg-[#F5EBD8]'}`}>{s}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className={`text-sm font-bold ${textLabel} mb-2`}>⚡ Заряды</p>
                  <div className="flex flex-wrap gap-1">
                    {CHARGES.map(s => (
                      <button key={s} type="button" onClick={() => insertSymbol(s)} className={`px-3 py-2 border-2 rounded-lg text-sm font-bold ${darkMode ? 'bg-[#1A1614] border-[#3D2817] text-[#8B3A3A] hover:bg-[#3D2817]' : 'bg-[#FAF3E8] border-[#E8DCC8] text-[#8B3A3A] hover:bg-[#F5EBD8]'}`}>{s}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className={`text-sm font-bold ${textLabel} mb-2`}>⚗️ Степени окисления</p>
                  <div className="flex flex-wrap gap-1">
                    {OXIDATION.map(s => (
                      <button key={s} type="button" onClick={() => insertSymbol(s)} className={`px-3 py-2 border-2 rounded-lg text-sm font-bold ${darkMode ? 'bg-[#1A1614] border-[#3D2817] text-[#B8860B] hover:bg-[#3D2817]' : 'bg-[#FAF3E8] border-[#E8DCC8] text-[#B8860B] hover:bg-[#F5EBD8]'}`}>{s}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className={`text-sm font-bold ${textLabel} mb-2`}>🔣 Знаки</p>
                  <div className="flex flex-wrap gap-1">
                    {SIGNS.map(s => (
                      <button key={s} type="button" onClick={() => insertSymbol(s)} className={`px-3 py-2 border-2 rounded-lg text-sm font-bold ${darkMode ? 'bg-[#1A1614] border-[#3D2817] text-[#F5E6D3] hover:bg-[#3D2817]' : 'bg-[#FAF3E8] border-[#E8DCC8] text-[#3D2817] hover:bg-[#F5EBD8]'}`}>{s}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ImageUploader({ value, onChange, tutorId, darkMode = false }: any) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Выберите изображение'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Файл слишком большой (макс. 5MB)'); return; }
    setUploading(true);
    try {
      const fileName = `${tutorId}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `homework_images/${fileName}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      onChange(downloadURL);
      toast.success('✅ Фото загружено');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: any) {
      toast.error('Ошибка загрузки: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const textLabel = darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]';

  return (
    <div className="space-y-2">
      <label className={`block text-sm font-semibold ${textLabel}`}>📷 Картинка задания</label>
      <div className="flex gap-3 items-start">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={uploading} />
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="px-4 py-3 bg-gradient-to-r from-[#6B705C] to-[#6B4E3A] text-white rounded-xl font-semibold hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50">
          <Upload className="w-5 h-5" /> {uploading ? 'Загрузка...' : 'Загрузить фото'}
        </button>
        {value && (
          <div className="relative">
            <img src={value} alt="Preview" className="max-h-32 rounded-xl border-2 border-[#C67B4B]" loading="lazy" />
            <button type="button" onClick={() => onChange('')} className="absolute -top-2 -right-2 w-6 h-6 bg-[#8B3A3A] text-white rounded-full flex items-center justify-center hover:bg-[#7A2F2F] transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ConversionScaleEditor({ value, onChange, maxPrimaryScore, darkMode = false }: any) {
  const [scaleType, setScaleType] = useState<'none' | 'preset' | 'custom'>(() => {
    if (!value) return 'none';
    if (typeof value === 'string') return 'preset';
    return 'custom';
  });
  const [selectedPreset, setSelectedPreset] = useState<string>(() => typeof value === 'string' ? value : 'chemistry');
  const [customScale, setCustomScale] = useState<Array<{primary: number, test: number}>>(() => {
    if (value && typeof value === 'object') {
      return Object.entries(value).map(([p, t]) => ({ primary: Number(p), test: Number(t) })).sort((a, b) => a.primary - b.primary);
    }
    return [{ primary: 0, test: 0 }];
  });

  const applyPreset = (presetKey: string) => {
    setSelectedPreset(presetKey);
    setScaleType('preset');
    onChange(presetKey);
    toast.success(`✅ Шкала "${EGE_SCALE_LABELS[presetKey]}" применена`);
  };

  const removeScale = () => { setScaleType('none'); onChange(null); toast.success('Шкала конвертации удалена'); };

  const addCustomRow = () => {
    const lastPrimary = customScale.length > 0 ? customScale[customScale.length - 1].primary : 0;
    setCustomScale([...customScale, { primary: lastPrimary + 1, test: 0 }]);
  };

  const updateCustomRow = (idx: number, field: 'primary' | 'test', val: number) => {
    const newScale = [...customScale];
    newScale[idx] = { ...newScale[idx], [field]: val };
    setCustomScale(newScale);
  };

  const removeCustomRow = (idx: number) => { setCustomScale(customScale.filter((_, i) => i !== idx)); };

  const saveCustomScale = () => {
    const sorted = [...customScale].sort((a, b) => a.primary - b.primary);
    const scaleObj: Record<number, number> = {};
    sorted.forEach(row => { scaleObj[row.primary] = row.test; });
    setScaleType('custom');
    onChange(scaleObj);
    toast.success('✅ Своя шкала сохранена');
  };

  const bgCard = darkMode ? 'bg-[#2A2420] border-[#3D2817]' : 'bg-[#FAF3E8] border-[#E8DCC8]';
  const bgBtn = darkMode ? 'bg-[#1A1614] border-[#3D2817] text-[#F5E6D3]' : 'bg-white border-[#E8DCC8] text-[#3D2817]';
  const bgBtnActive = 'bg-gradient-to-br from-[#C67B4B] to-[#8B3A3A] text-white border-transparent';
  const textLabel = darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]';

  return (
    <div className={`rounded-2xl p-5 border-2 ${bgCard}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calculator className={`w-6 h-6 ${darkMode ? 'text-[#C67B4B]' : 'text-[#8B3A3A]'}`} />
          <div>
            <h4 className={`font-bold text-lg ${darkMode ? 'text-[#F5E6D3]' : 'text-[#3D2817]'}`}>Шкала конвертации баллов</h4>
            <p className={`text-xs ${textLabel}`}>Первичные → Тестовые баллы ЕГЭ</p>
          </div>
        </div>
        {scaleType !== 'none' && (
          <button type="button" onClick={removeScale} className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${darkMode ? 'bg-[#8B3A3A]/20 text-[#8B3A3A] hover:bg-[#8B3A3A]/30' : 'bg-rose-100 text-rose-600 hover:bg-rose-200'}`}>
            <Trash2 className="w-3.5 h-3.5" /> Убрать
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <button type="button" onClick={() => { setScaleType('none'); onChange(null); }} className={`p-3 rounded-xl border-2 transition-all text-center ${scaleType === 'none' ? bgBtnActive : `${bgBtn} hover:border-[#C67B4B]`}`}>
          <div className="text-2xl mb-1">❌</div>
          <div className={`text-xs font-bold ${darkMode ? 'text-[#F5E6D3]' : 'text-[#3D2817]'}`}>Без конвертации</div>
        </button>
        <button type="button" onClick={() => { setScaleType('preset'); applyPreset(selectedPreset); }} className={`p-3 rounded-xl border-2 transition-all text-center ${scaleType === 'preset' ? bgBtnActive : `${bgBtn} hover:border-[#C67B4B]`}`}>
          <div className="text-2xl mb-1">📊</div>
          <div className={`text-xs font-bold ${darkMode ? 'text-[#F5E6D3]' : 'text-[#3D2817]'}`}>Стандарт ЕГЭ</div>
        </button>
        <button type="button" onClick={() => setScaleType('custom')} className={`p-3 rounded-xl border-2 transition-all text-center ${scaleType === 'custom' ? bgBtnActive : `${bgBtn} hover:border-[#C67B4B]`}`}>
          <div className="text-2xl mb-1">✏️</div>
          <div className={`text-xs font-bold ${darkMode ? 'text-[#F5E6D3]' : 'text-[#3D2817]'}`}>Своя шкала</div>
        </button>
      </div>

      {scaleType === 'preset' && (
        <div className="space-y-2">
          <p className={`text-sm font-semibold ${textLabel}`}>Выберите предмет:</p>
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(EGE_SCALE_LABELS).map(([key, label]) => (
              <button key={key} type="button" onClick={() => applyPreset(key)} className={`p-3 rounded-xl border-2 text-left transition-all ${selectedPreset === key ? 'bg-gradient-to-r from-[#C67B4B] to-[#8B3A3A] text-white border-transparent shadow-md' : `${bgBtn} hover:border-[#C67B4B]`}`}>
                <div className="font-bold text-sm">{label}</div>
                <div className="text-xs opacity-80 mt-1">Максимум: {Math.max(...Object.keys(EGE_SCALES[key]).map(Number))} первичных → 100 тестовых</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {scaleType === 'custom' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className={`text-sm font-semibold ${textLabel}`}>Задайте соответствие:</p>
            <button type="button" onClick={addCustomRow} className="px-3 py-1.5 bg-gradient-to-r from-[#C67B4B] to-[#8B3A3A] text-white rounded-lg text-xs font-semibold flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Строка
            </button>
          </div>
          <div className={`${darkMode ? 'bg-[#1A1614] border-[#3D2817]' : 'bg-white border-[#E8DCC8]'} rounded-xl p-3 border-2 max-h-60 overflow-y-auto space-y-2`}>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold text-gray-600 mb-2 px-2">
              <div>Первичные</div>
              <div>Тестовые</div>
            </div>
            {customScale.map((row, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <input type="number" min={0} value={row.primary} onChange={(e) => updateCustomRow(idx, 'primary', parseInt(e.target.value) || 0)} className={`px-3 py-2 border-2 rounded-lg text-sm font-bold text-center focus:border-[#C67B4B] focus:outline-none ${darkMode ? 'bg-[#2A2420] border-[#3D2817] text-[#F5E6D3]' : 'bg-[#FAF3E8] border-[#E8DCC8] text-[#3D2817]'}`} />
                <input type="number" min={0} max={100} value={row.test} onChange={(e) => updateCustomRow(idx, 'test', parseInt(e.target.value) || 0)} className={`px-3 py-2 border-2 rounded-lg text-sm font-bold text-center focus:border-[#8B3A3A] focus:outline-none ${darkMode ? 'bg-[#2A2420] border-[#3D2817] text-[#F5E6D3]' : 'bg-[#FAF3E8] border-[#E8DCC8] text-[#3D2817]'}`} />
                <button type="button" onClick={() => removeCustomRow(idx)} className={`p-1.5 rounded-lg ${darkMode ? 'bg-[#8B3A3A]/20 text-[#8B3A3A] hover:bg-[#8B3A3A]/30' : 'bg-rose-100 text-rose-600 hover:bg-rose-200'}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          {maxPrimaryScore > 0 && (
            <div className={`text-xs ${darkMode ? 'text-[#B8860B] bg-[#B8860B]/10 border-[#B8860B]/30' : 'text-[#6B4E3A] bg-[#B8860B]/10 border-[#B8860B]/30'} border-2 rounded-lg p-2`}>
              💡 Максимум первичных баллов в этом ДЗ: <b>{maxPrimaryScore}</b>. Убедитесь, что шкала покрывает все значения.
            </div>
          )}
          <button type="button" onClick={saveCustomScale} className="w-full px-4 py-2.5 bg-gradient-to-r from-[#C67B4B] to-[#8B3A3A] text-white rounded-xl font-semibold hover:shadow-lg transition flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> Сохранить свою шкалу
          </button>
        </div>
      )}
    </div>
  );
}

function GradingTemplatesModal({ onClose, tutorId, darkMode = false }: any) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setTemplates(data.grading_templates || []);
      } else {
        setTemplates([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const saveTemplate = async () => {
    if (!editingTemplate?.name.trim()) { toast.error('Введите название'); return; }
    try {
      const currentSnap = await getDoc(doc(db, "settings", "global"));
      const currentData = currentSnap.exists() ? currentSnap.data() : {};
      const templates = currentData.grading_templates || [];
      let newTemplates;
      if (editingTemplate.id) {
        newTemplates = templates.map((t: any) => t.id === editingTemplate.id ? editingTemplate : t);
      } else {
        newTemplates = [...templates, { ...editingTemplate, id: `tpl_${Date.now()}` }];
      }
      await setDoc(doc(db, "settings", "global"), { ...currentData, grading_templates: newTemplates, updated_at: new Date().toISOString() }, { merge: true });
      toast.success('Шаблон сохранён');
      setShowForm(false);
      setEditingTemplate(null);
    } catch (error: any) {
      toast.error('Ошибка: ' + error.message);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const currentSnap = await getDoc(doc(db, "settings", "global"));
      const currentData = currentSnap.exists() ? currentSnap.data() : {};
      const templates = (currentData.grading_templates || []).filter((t: any) => t.id !== id);
      await setDoc(doc(db, "settings", "global"), { ...currentData, grading_templates: templates, updated_at: new Date().toISOString() }, { merge: true });
      toast.success('Шаблон удалён');
    } catch (error: any) {
      toast.error('Ошибка: ' + error.message);
    }
  };

  const addCriterion = () => {
    setEditingTemplate({ ...editingTemplate, criteria: [...(editingTemplate.criteria || []), { condition: "", points: 0 }] });
  };

  const updateCriterion = (idx: number, field: string, value: any) => {
    const criteria = [...editingTemplate.criteria];
    criteria[idx] = { ...criteria[idx], [field]: value };
    setEditingTemplate({ ...editingTemplate, criteria });
  };

  const removeCriterion = (idx: number) => {
    const criteria = editingTemplate.criteria.filter((_: any, i: number) => i !== idx);
    setEditingTemplate({ ...editingTemplate, criteria });
  };

  const bgModal = darkMode ? 'bg-[#2A2420]' : 'bg-white';
  const bgCard = darkMode ? 'bg-[#1A1614] border-[#3D2817]' : 'bg-[#FAF3E8] border-[#E8DCC8]';
  const bgInput = darkMode ? 'bg-[#1A1614] border-[#3D2817] text-[#F5E6D3]' : 'bg-white border-[#E8DCC8] text-[#3D2817]';
  const textPrimary = darkMode ? 'text-[#F5E6D3]' : 'text-[#3D2817]';
  const textSecondary = darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className={`${bgModal} rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col`} onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-[#C67B4B] via-[#B8860B] to-[#8B3A3A] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Award className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Шаблоны оценивания</h2>
              <p className="text-white/80 text-sm">Создавайте и управляйте шаблонами</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-7 h-7" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-[#C67B4B] border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : templates.length === 0 ? (
            <div className={`text-center py-12 ${darkMode ? 'bg-[#1A1614] border-[#3D2817]' : 'bg-[#FAF3E8] border-[#E8DCC8]'} rounded-2xl border-2 border-dashed`}>
              <div className="text-6xl mb-4">📋</div>
              <p className={`font-semibold text-lg mb-4 ${textSecondary}`}>Нет шаблонов</p>
              <button onClick={() => { setEditingTemplate({ name: '', criteria: [] }); setShowForm(true); }} className="px-6 py-3 bg-gradient-to-r from-[#C67B4B] to-[#8B3A3A] text-white rounded-xl font-semibold hover:shadow-lg transition">+ Создать здесь</button>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <motion.div key={template.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${bgCard} rounded-xl p-4 border-2`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className={`font-bold text-lg ${textPrimary}`}>{template.name}</h3>
                      <p className={`text-sm ${textSecondary}`}>{(template.criteria?.length || 0)} критериев • Максимум: {template.criteria?.reduce((sum: number, c: any) => sum + (c.points || 0), 0) || 0} баллов</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingTemplate(template); setShowForm(true); }} className="px-3 py-2 bg-[#6B705C] text-white rounded-lg text-sm font-semibold hover:bg-[#5A5F4D] transition flex items-center gap-1">
                        <Edit className="w-4 h-4" /> Изменить
                      </button>
                      <button onClick={() => deleteTemplate(template.id)} className="px-3 py-2 bg-[#8B3A3A] text-white rounded-lg text-sm font-semibold hover:bg-[#7A2F2F] transition flex items-center gap-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {(template.criteria || []).map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className={`font-bold w-6 ${darkMode ? 'text-[#C67B4B]' : 'text-[#C67B4B]'}`}>{i + 1}.</span>
                        <span className={`flex-1 ${textSecondary}`}>{c.condition || 'Без условия'}</span>
                        <span className={`font-bold ${darkMode ? 'text-[#B8860B]' : 'text-[#B8860B]'}`}>{c.points ?? 0} балл.</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
              <button onClick={() => { setEditingTemplate({ name: '', criteria: [] }); setShowForm(true); }} className="w-full px-4 py-3 bg-gradient-to-r from-[#C67B4B] to-[#8B3A3A] text-white rounded-xl font-semibold hover:shadow-lg transition flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" /> Добавить шаблон
              </button>
            </div>
          )}
        </div>

        {showForm && editingTemplate && (
          <div className={`border-t-2 ${darkMode ? 'border-[#3D2817] bg-[#1A1614]' : 'border-[#E8DCC8] bg-[#FAF3E8]'} p-6`}>
            <h3 className={`text-lg font-bold ${textPrimary} mb-4`}>{editingTemplate.id ? 'Редактировать шаблон' : 'Новый шаблон'}</h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-semibold ${textSecondary} mb-2`}>Название шаблона</label>
                <input value={editingTemplate.name} onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })} className={`w-full px-4 py-3 border-2 rounded-xl focus:border-[#C67B4B] focus:outline-none text-base ${bgInput}`} placeholder="Например: Стандартный ЕГЭ" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-sm font-semibold ${textSecondary}`}>Критерии оценивания</label>
                  <button onClick={addCriterion} className="px-3 py-1.5 bg-gradient-to-r from-[#C67B4B] to-[#8B3A3A] text-white rounded-lg text-sm font-semibold">+ Критерий</button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(editingTemplate.criteria || []).map((c: any, i: number) => (
                    <div key={i} className={`flex items-center gap-2 ${darkMode ? 'bg-[#2A2420] border-[#3D2817]' : 'bg-white border-[#E8DCC8]'} rounded-xl p-3 border-2`}>
                      <span className={`font-bold w-6 ${darkMode ? 'text-[#C67B4B]' : 'text-[#C67B4B]'}`}>{i + 1}.</span>
                      <input type="text" value={c.condition} onChange={(e) => updateCriterion(i, "condition", e.target.value)} placeholder="Условие" className={`flex-1 px-3 py-2 border-2 rounded-lg text-sm focus:border-[#C67B4B] focus:outline-none ${darkMode ? 'bg-[#1A1614] border-[#3D2817] text-[#F5E6D3]' : 'bg-[#FAF3E8] border-[#E8DCC8] text-[#3D2817]'}`} />
                      <input type="number" min={0} value={c.points} onChange={(e) => updateCriterion(i, "points", parseInt(e.target.value) || 0)} className={`w-20 px-3 py-2 border-2 rounded-lg text-sm text-center font-bold focus:border-[#C67B4B] focus:outline-none ${darkMode ? 'bg-[#1A1614] border-[#3D2817] text-[#F5E6D3]' : 'bg-[#FAF3E8] border-[#E8DCC8] text-[#3D2817]'}`} />
                      <span className={`text-sm ${textSecondary}`}>балл.</span>
                      <button onClick={() => removeCriterion(i)} className={`p-2 rounded-lg ${darkMode ? 'bg-[#8B3A3A]/20 text-[#8B3A3A] hover:bg-[#8B3A3A]/30' : 'bg-rose-100 text-rose-600 hover:bg-rose-200'}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {(editingTemplate.criteria || []).length > 0 && (
                  <div className={`flex items-center justify-between ${darkMode ? 'bg-[#2A2420]' : 'bg-[#FAF3E8]'} rounded-xl p-3 mt-3 border-2 ${darkMode ? 'border-[#3D2817]' : 'border-[#E8DCC8]'}`}>
                    <span className={`text-sm font-bold ${darkMode ? 'text-[#C67B4B]' : 'text-[#C67B4B]'}`}>Максимум баллов:</span>
                    <span className={`text-lg font-black ${darkMode ? 'text-[#B8860B]' : 'text-[#B8860B]'}`}>{editingTemplate.criteria.reduce((s: number, c: any) => s + (c.points || 0), 0)}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={saveTemplate} className="flex-1 px-6 py-3 bg-gradient-to-r from-[#C67B4B] to-[#8B3A3A] text-white rounded-xl font-semibold hover:shadow-lg transition flex items-center justify-center gap-2">
                  <Save className="w-5 h-5" /> Сохранить шаблон
                </button>
                <button onClick={() => { setShowForm(false); setEditingTemplate(null); }} className={`px-6 py-3 ${darkMode ? 'bg-[#3D2817] text-[#F5E6D3]' : 'bg-white border-2 border-[#E8DCC8] text-[#6B4E3A]'} rounded-xl font-semibold hover:bg-[#FAF3E8] transition`}>Отмена</button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function TaskEditor({ section, onChange, onRemove, idx, tutorId, darkMode = false }: any) {
  const [showGrading, setShowGrading] = useState(!!section.grading_criteria?.length);
  const [altAnswers, setAltAnswers] = useState<string[]>(section.data?.alt_answers || []);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

  useEffect(() => {
    if (tutorId) {
      const unsub = onSnapshot(doc(db, "settings", "global"), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setTemplates(data.grading_templates || []);
        } else {
          setTemplates([]);
        }
      });
      return () => unsub();
    }
  }, [tutorId]);

  const updateSection = (field: string, value: any) => onChange({ ...section, [field]: value });
  const updateData = (field: string, value: any) => onChange({ ...section, data: { ...section.data, [field]: value } });

  const changeType = (newType: TaskType) => {
    const cleanData: any = { task_text: section.data?.task_text || '', image_url: section.data?.image_url || '', hint: section.data?.hint || '', solution: section.data?.solution || '' };
    if (newType === 'text' || newType === 'photo') { cleanData.correct_answer = section.data?.correct_answer || ''; cleanData.alt_answers = section.data?.alt_answers || []; }
    if (newType === 'single_choice' || newType === 'multi_choice') { cleanData.variants = section.data?.variants || ['', '']; cleanData.correct_indices = section.data?.correct_indices || []; }
    if (newType === 'order') { cleanData.order_items = section.data?.order_items || ['', '']; }
    if (newType === 'match') { cleanData.pairs = section.data?.pairs || [{left:'',right:''}]; }
    if (newType === 'fill_blanks') { cleanData.blanks_text = section.data?.blanks_text || ''; cleanData.correct_answer = section.data?.correct_answer || ''; }
    if (newType === 'assembly') { cleanData.assembly_parts = section.data?.assembly_parts || ['', '']; }
    if (newType === 'drag_drop') { cleanData.drag_items = section.data?.drag_items || [{item:'',target:''}]; }
    onChange({ ...section, type: newType, data: cleanData });
  };

  const addVariant = () => updateData("variants", [...(section.data?.variants || []), ""]);
  const updateVariant = (i: number, v: string) => { const a = [...(section.data?.variants || [])]; a[i] = v; updateData("variants", a); };
  const removeVariant = (i: number) => updateData("variants", (section.data?.variants || []).filter((_: any, idx: number) => idx !== i));
  const toggleCorrect = (i: number) => { const cur = section.data?.correct_indices || []; if (section.type === "single_choice") updateData("correct_indices", [i]); else updateData("correct_indices", cur.includes(i) ? cur.filter((x: number) => x !== i) : [...cur, i]); };
  const addAlt = () => { setAltAnswers([...altAnswers, ""]); updateData("alt_answers", [...altAnswers, ""]); };
  const updateAlt = (i: number, v: string) => { const a = [...altAnswers]; a[i] = v; setAltAnswers(a); updateData("alt_answers", a); };
  const removeAlt = (i: number) => { const a = altAnswers.filter((_, idx) => idx !== i); setAltAnswers(a); updateData("alt_answers", a); };
  const addPair = () => updateData("pairs", [...(section.data?.pairs || []), { left: "", right: "" }]);
  const updatePair = (i: number, f: string, v: string) => { const a = [...(section.data?.pairs || [])]; a[i] = { ...a[i], [f]: v }; updateData("pairs", a); };
  const removePair = (i: number) => updateData("pairs", (section.data?.pairs || []).filter((_: any, idx: number) => idx !== i));
  const addOrderItem = () => updateData("order_items", [...(section.data?.order_items || []), ""]);
  const updateOrderItem = (i: number, v: string) => { const a = [...(section.data?.order_items || [])]; a[i] = v; updateData("order_items", a); };
  const removeOrderItem = (i: number) => updateData("order_items", (section.data?.order_items || []).filter((_: any, idx: number) => idx !== i));
  const moveOrderItem = (i: number, dir: -1 | 1) => {
    const a = [...(section.data?.order_items || [])];
    const j = i + dir; if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]]; updateData("order_items", a);
  };
  const addPart = () => updateData("assembly_parts", [...(section.data?.assembly_parts || []), ""]);
  const updatePart = (i: number, v: string) => { const a = [...(section.data?.assembly_parts || [])]; a[i] = v; updateData("assembly_parts", a); };
  const removePart = (i: number) => updateData("assembly_parts", (section.data?.assembly_parts || []).filter((_: any, idx: number) => idx !== i));
  const addDragItem = () => updateData("drag_items", [...(section.data?.drag_items || []), { item: "", target: "" }]);
  const updateDragItem = (i: number, f: string, v: string) => { const a = [...(section.data?.drag_items || [])]; a[i] = { ...a[i], [f]: v }; updateData("drag_items", a); };
  const removeDragItem = (i: number) => updateData("drag_items", (section.data?.drag_items || []).filter((_: any, idx: number) => idx !== i));
  const addCriterion = () => onChange({ ...section, grading_criteria: [...(section.grading_criteria || []), { condition: "", points: 0 }] });
  const updateCriterion = (i: number, f: string, v: any) => { const a = [...(section.grading_criteria || [])]; a[i] = { ...a[i], [f]: v }; onChange({ ...section, grading_criteria: a }); };
  const removeCriterion = (i: number) => onChange({ ...section, grading_criteria: (section.grading_criteria || []).filter((_: any, idx: number) => idx !== i) });

  const applyTemplate = (template: any) => {
    const criteria = template.criteria && template.criteria.length > 0 ? template.criteria : [];
    onChange({ ...section, grading_criteria: criteria });
    setShowTemplates(false); setShowGrading(true);
    toast.success(`Шаблон "${template.name}" применён`);
  };

  const typeInfo = TASK_TYPES.find(t => t.value === section.type) || TASK_TYPES[0];
  const bgCard = darkMode ? 'bg-[#2A2420] border-[#3D2817]' : 'bg-[#FAF3E8] border-[#E8DCC8]';
  const bgInput = darkMode ? 'bg-[#1A1614] border-[#3D2817] text-[#F5E6D3]' : 'bg-white border-[#E8DCC8] text-[#3D2817]';
  const bgInputLight = darkMode ? 'bg-[#2A2420] border-[#3D2817] text-[#F5E6D3]' : 'bg-[#FAF3E8] border-[#E8DCC8] text-[#3D2817]';
  const textPrimary = darkMode ? 'text-[#F5E6D3]' : 'text-[#3D2817]';
  const textSecondary = darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]';
  const textMuted = darkMode ? 'text-[#6B4E3A]' : 'text-[#B8A898]';
  const textAccent = darkMode ? 'text-[#C67B4B]' : 'text-[#C67B4B]';

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={`${bgCard} rounded-2xl p-6 mb-6 border-2 shadow-sm`}>
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 bg-gradient-to-br ${typeInfo.color} rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0`}>{idx + 1}</div>
          <input value={section.title} onChange={(e) => updateSection("title", e.target.value)} className={`flex-1 px-4 py-3 border-2 rounded-xl font-semibold text-base focus:border-[#C67B4B] focus:outline-none min-w-0 ${bgInput}`} placeholder="Название задания" />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <input type="number" min={1} max={10} value={section.max_score || 1} onChange={(e) => updateSection("max_score", parseInt(e.target.value) || 1)} className={`w-16 px-3 py-3 border-2 rounded-xl text-base font-bold text-center focus:border-[#C67B4B] focus:outline-none ${bgInput}`} />
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onRemove} className="p-3 bg-gradient-to-br from-[#8B3A3A] to-[#7A2F2F] text-white rounded-xl hover:shadow-lg transition">
            <Trash2 className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      <div className="mb-4">
        <label className={`block text-sm font-semibold ${textSecondary} mb-3`}>Тип задания</label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {TASK_TYPES.map(t => (
            <motion.button key={t.value} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} type="button" onClick={() => changeType(t.value as TaskType)} className={`p-3 rounded-xl border-2 transition-all ${section.type === t.value ? `bg-gradient-to-br ${t.color} text-white border-transparent shadow-md` : `${darkMode ? 'bg-[#1A1614] border-[#3D2817] text-[#B8A898] hover:border-[#C67B4B]' : 'bg-white border-[#E8DCC8] text-[#6B4E3A] hover:border-[#C67B4B]'}`}`}>
              <div className="text-2xl mb-1">{t.icon}</div>
              <div className="text-xs font-bold">{t.label}</div>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="mb-4"><ChemistryEditor value={section.data?.task_text || ''} onChange={(v: string) => updateData("task_text", v)} placeholder="Условие задания..." rows={4} label="Условие 🧪" darkMode={darkMode} /></div>
      <div className="mb-4"><ImageUploader value={section.data?.image_url || ''} onChange={(v: string) => updateData("image_url", v)} tutorId={tutorId} darkMode={darkMode} /></div>

      {(section.type === "text" || section.type === "photo") && (
        <div className="mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className={`text-sm font-semibold ${textSecondary}`}>✅ Правильные ответы</label>
            <button type="button" onClick={addAlt} className="px-3 py-2 bg-gradient-to-r from-[#6B705C] to-[#6B4E3A] text-white rounded-lg text-sm font-semibold">+ Ответ</button>
          </div>
          <ChemistryEditor value={section.data?.correct_answer || ''} onChange={(v: string) => updateData("correct_answer", v)} placeholder="Основной ответ..." rows={3} darkMode={darkMode} />
          {altAnswers.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <ChemistryEditor value={a} onChange={(v: string) => updateAlt(i, v)} placeholder={`Альтернативный ${i + 1}`} rows={2} darkMode={darkMode} />
              <button type="button" onClick={() => removeAlt(i)} className={`p-2 rounded-lg ${darkMode ? 'bg-[#8B3A3A]/20 text-[#8B3A3A] hover:bg-[#8B3A3A]/30' : 'bg-rose-100 text-rose-600 hover:bg-rose-200'}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {(section.type === "single_choice" || section.type === "multi_choice") && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <label className={`text-sm font-semibold ${textSecondary}`}>Варианты {section.type === "single_choice" ? "(один правильный)" : "(несколько)"}</label>
            <button type="button" onClick={addVariant} className="px-3 py-2 bg-gradient-to-r from-[#6B705C] to-[#6B4E3A] text-white rounded-lg text-sm font-semibold">+ Вариант</button>
          </div>
          <div className="space-y-2">
            {(section.data?.variants || []).map((v: string, i: number) => {
              const sel = (section.data?.correct_indices || []).includes(i);
              return (
                <div key={i} className="flex items-center gap-3">
                  <button type="button" onClick={() => toggleCorrect(i)} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${sel ? 'bg-gradient-to-br from-[#6B705C] to-[#6B4E3A] border-[#6B705C] text-white' : darkMode ? 'border-[#3D2817]' : 'border-[#E8DCC8]'}`}>
                    {sel && <Check className="w-4 h-4" />}
                  </button>
                  <input type="text" value={v} onChange={(e) => updateVariant(i, e.target.value)} placeholder={`Вариант ${i + 1}`} className={`flex-1 px-4 py-2 border-2 rounded-lg text-base focus:border-[#C67B4B] focus:outline-none ${bgInput}`} />
                  <button type="button" onClick={() => removeVariant(i)} className={`p-2 rounded-lg ${darkMode ? 'bg-[#8B3A3A]/20 text-[#8B3A3A] hover:bg-[#8B3A3A]/30' : 'bg-rose-100 text-rose-600 hover:bg-rose-200'}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {section.type === "order" && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <label className={`text-sm font-semibold ${textSecondary}`}>Элементы в правильном порядке</label>
            <button type="button" onClick={addOrderItem} className="px-3 py-2 bg-gradient-to-r from-[#B8860B] to-[#C67B4B] text-white rounded-lg text-sm font-semibold">+ Элемент</button>
          </div>
          <div className="space-y-2">
            {(section.data?.order_items || []).map((item: string, i: number) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border-2 ${darkMode ? 'bg-[#1A1614] border-[#3D2817]' : 'bg-[#FAF3E8] border-[#E8DCC8]'}`}>
                <div className="w-8 h-8 bg-gradient-to-br from-[#B8860B] to-[#C67B4B] rounded-lg text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{i + 1}</div>
                <input type="text" value={item} onChange={(e) => updateOrderItem(i, e.target.value)} placeholder={`Элемент ${i + 1}`} className={`flex-1 px-4 py-2 border-2 rounded-lg text-base focus:border-[#C67B4B] focus:outline-none ${bgInput}`} />
                <button type="button" onClick={() => moveOrderItem(i, -1)} disabled={i === 0} className={`p-2 rounded-lg disabled:opacity-30 ${darkMode ? 'bg-[#6B705C]/20 text-[#6B705C] hover:bg-[#6B705C]/30' : 'bg-[#6B705C]/20 text-[#6B705C] hover:bg-[#6B705C]/30'}`}>↑</button>
                <button type="button" onClick={() => moveOrderItem(i, 1)} disabled={i === (section.data?.order_items?.length || 0) - 1} className={`p-2 rounded-lg disabled:opacity-30 ${darkMode ? 'bg-[#6B705C]/20 text-[#6B705C] hover:bg-[#6B705C]/30' : 'bg-[#6B705C]/20 text-[#6B705C] hover:bg-[#6B705C]/30'}`}>↓</button>
                <button type="button" onClick={() => removeOrderItem(i)} className={`p-2 rounded-lg ${darkMode ? 'bg-[#8B3A3A]/20 text-[#8B3A3A] hover:bg-[#8B3A3A]/30' : 'bg-rose-100 text-rose-600 hover:bg-rose-200'}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {section.type === "match" && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <label className={`text-sm font-semibold ${textSecondary}`}>Пары соответствий</label>
            <button type="button" onClick={addPair} className="px-3 py-2 bg-gradient-to-r from-[#8B3A3A] to-[#C67B4B] text-white rounded-lg text-sm font-semibold">+ Пара</button>
          </div>
          <div className="space-y-2">
            {(section.data?.pairs || []).map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <input type="text" value={p.left} onChange={(e) => updatePair(i, "left", e.target.value)} placeholder="Левая" className={`flex-1 px-4 py-2 border-2 rounded-lg text-base focus:border-[#C67B4B] focus:outline-none ${bgInput}`} />
                <span className="text-[#C67B4B] font-bold text-lg">→</span>
                <input type="text" value={p.right} onChange={(e) => updatePair(i, "right", e.target.value)} placeholder="Правая" className={`flex-1 px-4 py-2 border-2 rounded-lg text-base focus:border-[#C67B4B] focus:outline-none ${bgInput}`} />
                <button type="button" onClick={() => removePair(i)} className={`p-2 rounded-lg ${darkMode ? 'bg-[#8B3A3A]/20 text-[#8B3A3A] hover:bg-[#8B3A3A]/30' : 'bg-rose-100 text-rose-600 hover:bg-rose-200'}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {section.type === "fill_blanks" && (
        <div className="mb-4 space-y-3">
          <ChemistryEditor value={section.data?.blanks_text || ''} onChange={(v: string) => updateData("blanks_text", v)} placeholder="Текст с ___ пропусками..." rows={4} label="Текст с пропусками" darkMode={darkMode} />
          <ChemistryEditor value={section.data?.correct_answer || ''} onChange={(v: string) => updateData("correct_answer", v)} placeholder="ответ1, ответ2, ответ3" rows={3} label="Ответы (через запятую)" darkMode={darkMode} />
        </div>
      )}

      {section.type === "assembly" && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <label className={`text-sm font-semibold ${textSecondary}`}>Части для сборки</label>
            <button type="button" onClick={addPart} className="px-3 py-2 bg-gradient-to-r from-[#6B705C] to-[#6B4E3A] text-white rounded-lg text-sm font-semibold">+ Часть</button>
          </div>
          <div className="space-y-2">
            {(section.data?.assembly_parts || []).map((p: string, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <input type="text" value={p} onChange={(e) => updatePart(i, e.target.value)} placeholder={`Часть ${i + 1}`} className={`flex-1 px-4 py-2 border-2 rounded-lg text-base focus:border-[#C67B4B] focus:outline-none ${bgInput}`} />
                <button type="button" onClick={() => removePart(i)} className={`p-2 rounded-lg ${darkMode ? 'bg-[#8B3A3A]/20 text-[#8B3A3A] hover:bg-[#8B3A3A]/30' : 'bg-rose-100 text-rose-600 hover:bg-rose-200'}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {section.type === "drag_drop" && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <label className={`text-sm font-semibold ${textSecondary}`}>Элементы и цели</label>
            <button type="button" onClick={addDragItem} className="px-3 py-2 bg-gradient-to-r from-[#B8860B] to-[#C67B4B] text-white rounded-lg text-sm font-semibold">+ Элемент</button>
          </div>
          <div className="space-y-2">
            {(section.data?.drag_items || []).map((d: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <input type="text" value={d.item} onChange={(e) => updateDragItem(i, "item", e.target.value)} placeholder="Элемент" className={`flex-1 px-4 py-2 border-2 rounded-lg text-base focus:border-[#C67B4B] focus:outline-none ${bgInput}`} />
                <span className="text-[#C67B4B] font-bold text-lg">→</span>
                <input type="text" value={d.target} onChange={(e) => updateDragItem(i, "target", e.target.value)} placeholder="Цель" className={`flex-1 px-4 py-2 border-2 rounded-lg text-base focus:border-[#C67B4B] focus:outline-none ${bgInput}`} />
                <button type="button" onClick={() => removeDragItem(i)} className={`p-2 rounded-lg ${darkMode ? 'bg-[#8B3A3A]/20 text-[#8B3A3A] hover:bg-[#8B3A3A]/30' : 'bg-rose-100 text-rose-600 hover:bg-rose-200'}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <ChemistryEditor value={section.data?.hint || ''} onChange={(v: string) => updateData("hint", v)} placeholder="Подсказка..." rows={3} label="💡 Подсказка" darkMode={darkMode} />
        <ChemistryEditor value={section.data?.solution || ''} onChange={(v: string) => updateData("solution", v)} placeholder="Разбор..." rows={3} label="📖 Разбор" darkMode={darkMode} />
      </div>

      <div className={`border-t-2 ${darkMode ? 'border-[#3D2817]' : 'border-[#E8DCC8]'} pt-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award className={`w-5 h-5 ${darkMode ? 'text-[#C67B4B]' : 'text-[#C67B4B]'}`} />
            <span className={`text-base font-bold ${textPrimary}`}>Гибкое оценивание</span>
          </div>
          <div className="flex gap-2">
            {templates.length > 0 && <button type="button" onClick={() => setShowTemplates(!showTemplates)} className="px-3 py-2 bg-gradient-to-r from-[#6B705C] to-[#6B4E3A] text-white rounded-lg text-sm font-semibold hover:shadow-md transition flex items-center gap-1">
              <Database className="w-4 h-4" /> Шаблоны
            </button>}
            <button type="button" onClick={() => setShowGrading(!showGrading)} className={`px-4 py-2 rounded-xl text-sm font-semibold ${showGrading ? 'bg-gradient-to-r from-[#C67B4B] to-[#8B3A3A] text-white' : darkMode ? 'bg-[#1A1614] border-2 border-[#3D2817] text-[#B8A898]' : 'bg-white border-2 border-[#E8DCC8] text-[#6B4E3A]'}`}>
              {showGrading ? 'Скрыть' : 'Показать'}
            </button>
          </div>
        </div>

        {showTemplates && (
          <div className={`mb-4 p-4 rounded-xl border-2 ${darkMode ? 'bg-[#1A1614] border-[#3D2817]' : 'bg-[#FAF3E8] border-[#E8DCC8]'}`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className={`font-bold ${darkMode ? 'text-[#C67B4B]' : 'text-[#8B3A3A]'}`}>Выберите шаблон:</h4>
              <button onClick={() => setShowTemplatesModal(true)} className={`text-sm font-semibold flex items-center gap-1 ${darkMode ? 'text-[#B8A898] hover:text-[#C67B4B]' : 'text-[#6B4E3A] hover:text-[#C67B4B]'}`}>
                <Settings className="w-4 h-4" /> Управление
              </button>
            </div>
            {templates.length === 0 ? <p className={`text-sm ${textMuted}`}>Нет шаблонов</p> : (
              <div className="grid grid-cols-2 gap-2">
                {templates.map((template) => (
                  <motion.button key={template.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => applyTemplate(template)} className={`p-3 rounded-lg border-2 text-left transition ${darkMode ? 'bg-[#2A2420] border-[#3D2817] hover:border-[#C67B4B]' : 'bg-white border-[#E8DCC8] hover:border-[#C67B4B]'}`}>
                    <p className={`font-bold text-sm ${textPrimary}`}>{template.name}</p>
                    <p className={`text-xs ${textMuted}`}>{(template.criteria?.length || 0)} критериев • {template.criteria?.reduce((s: number, c: any) => s + (c.points || 0), 0) || 0} балл.</p>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )}

        {showGrading && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={`text-sm ${textMuted}`}>Критерии ({(section.grading_criteria || []).length})</span>
              <button type="button" onClick={addCriterion} className="px-3 py-2 bg-gradient-to-r from-[#C67B4B] to-[#8B3A3A] text-white rounded-lg text-sm font-semibold">+ Критерий</button>
            </div>
            {(section.grading_criteria || []).length === 0 ? (
              <p className={`text-sm italic p-4 rounded-xl border-2 border-dashed ${darkMode ? 'bg-[#1A1614] border-[#3D2817] text-[#6B4E3A]' : 'bg-white border-[#E8DCC8] text-[#B8A898]'}`}>
                Добавьте критерии для частичных баллов
              </p>
            ) : (
              <div className="space-y-2">
                {(section.grading_criteria || []).map((c: any, i: number) => (
                  <div key={i} className={`flex items-center gap-3 rounded-xl p-3 border-2 ${darkMode ? 'bg-[#1A1614] border-[#3D2817]' : 'bg-white border-[#E8DCC8]'}`}>
                    <span className={`text-sm font-bold w-6 ${textAccent}`}>{i + 1}.</span>
                    <input type="text" value={c.condition} onChange={(e) => updateCriterion(i, "condition", e.target.value)} placeholder="Условие" className={`flex-1 px-3 py-2 border-2 rounded-lg text-sm focus:border-[#C67B4B] focus:outline-none ${bgInputLight}`} />
                    <input type="number" min={0} value={c.points} onChange={(e) => updateCriterion(i, "points", parseInt(e.target.value) || 0)} className={`w-20 px-3 py-2 border-2 rounded-lg text-sm text-center font-bold focus:border-[#C67B4B] focus:outline-none ${bgInputLight}`} />
                    <span className={`text-sm ${textMuted}`}>балл.</span>
                    <button type="button" onClick={() => removeCriterion(i)} className={`p-2 rounded-lg ${darkMode ? 'bg-[#8B3A3A]/20 text-[#8B3A3A] hover:bg-[#8B3A3A]/30' : 'bg-rose-100 text-rose-600 hover:bg-rose-200'}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className={`flex items-center justify-between rounded-xl p-3 ${darkMode ? 'bg-[#2A2420]' : 'bg-[#FAF3E8]'} border-2 ${darkMode ? 'border-[#3D2817]' : 'border-[#E8DCC8]'}`}>
                  <span className={`text-sm font-bold ${darkMode ? 'text-[#C67B4B]' : 'text-[#C67B4B]'}`}>Максимум баллов:</span>
                  <span className={`text-lg font-black ${darkMode ? 'text-[#B8860B]' : 'text-[#B8860B]'}`}>{(section.grading_criteria || []).reduce((s: number, c: any) => s + (c.points || 0), 0)} / {section.max_score || 1}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showTemplatesModal && <GradingTemplatesModal onClose={() => setShowTemplatesModal(false)} tutorId={tutorId} darkMode={darkMode} />}
    </motion.div>
  );
}

function HomeworkEditor({ hw, onClose, onSave, tutorId, darkMode = false }: any) {
  const [title, setTitle] = useState(hw?.title || '');
  const [desc, setDesc] = useState(hw?.description || '');
  const [sections, setSections] = useState<any[]>(hw?.sections || []);
  const [saving, setSaving] = useState(false);
  const [showBank, setShowBank] = useState(false);
  const [bankTasks, setBankTasks] = useState<any[]>([]);
  const [bankFolders, setBankFolders] = useState<any[]>([]);
  const [selectedBankTasks, setSelectedBankTasks] = useState<string[]>([]);
  const [selectedBankFolder, setSelectedBankFolder] = useState<string>('all');
  const [loadingBank, setLoadingBank] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);
  const [folderId, setFolderId] = useState(hw?.folder_id || '');
  const [conversionScale, setConversionScale] = useState<any>(hw?.conversion_scale || null);
  const [isTrialExam, setIsTrialExam] = useState(hw?.type === 'trial_exam' || false);
  const [timeLimit, setTimeLimit] = useState<number>(hw?.time_limit || 180);
  const [scheduledAt, setScheduledAt] = useState(hw?.scheduled_at || '');
  const [tags, setTags] = useState<string[]>(hw?.tags || []);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    const unsubFolders = onSnapshot(query(collection(db, "homework_folders"), where("tutor_id", "==", tutorId)), (snap) => {
      setFolders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubFolders();
  }, [tutorId]);

  useEffect(() => {
    if (showBank) {
      setLoadingBank(true);
      getDocs(query(collection(db, "task_folders"), where("tutor_id", "==", tutorId)))
        .then(snap => setBankFolders(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
        .catch(() => {});
      getDocs(query(collection(db, "tasks_bank"), where("tutor_id", "==", tutorId)))
        .then(snap => {
          setBankTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoadingBank(false);
        })
        .catch(() => setLoadingBank(false));
    }
  }, [showBank, tutorId]);

  const totalPrimaryScore = sections.reduce((sum, s) => sum + (s.max_score || 0), 0);

  const addTag = () => { if (newTag.trim() && !tags.includes(newTag.trim())) { setTags([...tags, newTag.trim()]); setNewTag(''); } };
  const removeTag = (t: string) => setTags(tags.filter(x => x !== t));

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Введите название'); return; }
    if (sections.length === 0) { toast.error('Добавьте задание'); return; }
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      if (!s.title?.trim()) { toast.error(`Задание ${i + 1}: введите название`); return; }
      if ((s.type === 'single_choice' || s.type === 'multi_choice') && (!s.data?.variants?.length || !s.data?.correct_indices?.length)) { toast.error(`Задание ${i + 1}: добавьте варианты и правильный ответ`); return; }
      if (s.type === 'match' && !s.data?.pairs?.length) { toast.error(`Задание ${i + 1}: добавьте пары`); return; }
    }
    setSaving(true);
    try {
      const totalScore = sections.reduce((sum, s) => sum + (s.max_score || 0), 0);
      const data: any = {
        tutor_id: tutorId, title: title.trim(), description: desc.trim(), max_score: totalScore, sections,
        folder_id: folderId || null, conversion_scale: conversionScale || null,
        type: isTrialExam ? 'trial_exam' : (hw?.type || 'text'), time_limit: isTrialExam ? timeLimit : null,
        assigned_students: hw?.assigned_students || [], assigned_courses: hw?.assigned_courses || [],
        assigned_groups: hw?.assigned_groups || [],
        due_date: hw?.due_date || null, scheduled_at: scheduledAt || null, tags: tags, updated_at: new Date().toISOString()
      };
      if (hw?.id) { await updateDoc(doc(db, "homeworks", hw.id), data); toast.success('✅ ДЗ обновлено'); }
      else { data.created_at = new Date().toISOString(); data.status = scheduledAt ? 'scheduled' : 'published'; await addDoc(collection(db, "homeworks"), data); toast.success('✅ ДЗ создано'); }
      onSave(); onClose();
    } catch (e: any) { toast.error('Ошибка: ' + e.message); } finally { setSaving(false); }
  };

  const addSection = () => setSections([...sections, { id: `sec_${Date.now()}`, title: `Задание ${sections.length + 1}`, type: 'text', max_score: 1, data: {}, grading_criteria: [] }]);
  const updateSection = (idx: number, updated: any) => { const n = [...sections]; n[idx] = updated; setSections(n); };
  const removeSection = (idx: number) => setSections(sections.filter((_, i) => i !== idx));

  const addFromBank = () => {
    const selected = bankTasks.filter(t => selectedBankTasks.includes(t.id));
    if (selected.length === 0) { toast.error('Выберите задания'); return; }
    const newSections = selected.map(task => ({
      id: `sec_${Date.now()}_${task.id}`, title: task.title || 'Задание из банка', type: task.type || 'text', max_score: task.max_score || 1,
      data: { task_text: task.task_text || '', correct_answer: task.correct_answer || '', alt_answers: task.alt_answers || [], variants: task.variants || [], correct_indices: task.correct_indices || [], order_items: task.order_items || [], pairs: task.pairs || [], blanks_text: task.blanks_text || '', assembly_parts: task.assembly_parts || [], drag_items: task.drag_items || [], hint: task.hint || '', solution: task.solution || '', image_url: task.image_url || '' },
      grading_criteria: task.grading_criteria || []
    }));
    setSections([...sections, ...newSections]); setShowBank(false); setSelectedBankTasks([]);
    toast.success(`✅ Добавлено ${newSections.length} заданий`);
  };

  const filteredBankTasks = selectedBankFolder === 'all' ? bankTasks : bankTasks.filter(t => t.folder_id === selectedBankFolder);

  const bgModal = darkMode ? 'bg-[#2A2420]' : 'bg-white';
  const bgInput = darkMode ? 'bg-[#1A1614] border-[#3D2817] text-[#F5E6D3]' : 'bg-[#FAF3E8] border-[#E8DCC8] text-[#3D2817]';
  const bgFooter = darkMode ? 'bg-[#1A1614] border-[#3D2817]' : 'bg-[#FAF3E8] border-[#E8DCC8]';
  const textPrimary = darkMode ? 'text-[#F5E6D3]' : 'text-[#3D2817]';
  const textSecondary = darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", duration: 0.5 }} className={`${bgModal} rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col`} onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-[#C67B4B] via-[#B8860B] to-[#8B3A3A] px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{hw ? 'Редактировать ДЗ' : 'Создать ДЗ'}</h2>
              <p className="text-white/80 text-sm">Заполните информацию</p>
            </div>
          </div>
          <motion.button whileHover={{ rotate: 90 }} onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-7 h-7" />
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="col-span-2">
              <label className={`block text-sm font-semibold ${textSecondary} mb-2`}>Название *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={`w-full px-4 py-3 border-2 rounded-xl focus:border-[#C67B4B] focus:outline-none text-base ${bgInput}`} placeholder="Например: Контрольная по алканам" />
            </div>
            <div className="col-span-2">
              <label className={`block text-sm font-semibold ${textSecondary} mb-2`}>Описание</label>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className={`w-full px-4 py-3 border-2 rounded-xl focus:border-[#C67B4B] focus:outline-none resize-none text-base ${bgInput}`} placeholder="О чём это задание..." />
            </div>
            <div>
              <label className={`block text-sm font-semibold ${textSecondary} mb-2`}>📁 Папка</label>
              <select value={folderId} onChange={(e) => setFolderId(e.target.value)} className={`w-full px-4 py-3 border-2 rounded-xl focus:border-[#C67B4B] focus:outline-none text-base ${bgInput}`}>
                <option value="">Без папки</option>
                {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-sm font-semibold ${textSecondary} mb-2`}>📝 Тип ДЗ</label>
              <select value={isTrialExam ? 'trial_exam' : 'regular'} onChange={(e) => setIsTrialExam(e.target.value === 'trial_exam')} className={`w-full px-4 py-3 border-2 rounded-xl focus:border-[#C67B4B] focus:outline-none text-base ${bgInput}`}>
                <option value="regular">📚 Обычное ДЗ</option>
                <option value="trial_exam">⏱️ Пробный экзамен</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-semibold ${textSecondary} mb-2 flex items-center gap-2`}><Calendar className="w-4 h-4" /> Автопубликация</label>
              <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={`w-full px-4 py-3 border-2 rounded-xl focus:border-[#C67B4B] focus:outline-none text-base ${bgInput}`} />
            </div>
            <div>
              <label className={`block text-sm font-semibold ${textSecondary} mb-2 flex items-center gap-2`}><Tag className="w-4 h-4" /> Теги</label>
              <div className="flex gap-2 mb-2 flex-wrap">
                {tags.map(t => (
                  <span key={t} className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${darkMode ? 'bg-[#C67B4B]/20 text-[#C67B4B]' : 'bg-[#C67B4B]/20 text-[#8B3A3A]'}`}>
                    {t}
                    <button onClick={() => removeTag(t)} className="hover:text-[#8B3A3A]">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Новый тег" className={`flex-1 px-3 py-2 border-2 rounded-lg text-sm focus:border-[#C67B4B] focus:outline-none ${bgInput}`} />
                <button type="button" onClick={addTag} className="px-3 py-2 bg-gradient-to-r from-[#C67B4B] to-[#8B3A3A] text-white rounded-lg text-sm font-semibold">+</button>
              </div>
            </div>
          </div>

          {isTrialExam && (
            <div className={`mb-6 rounded-2xl p-5 border-2 ${darkMode ? 'bg-[#1A1614] border-[#3D2817]' : 'bg-[#FAF3E8] border-[#E8DCC8]'}`}>
              <div className="flex items-center gap-2 mb-3">
                <Timer className={`w-6 h-6 ${darkMode ? 'text-[#8B3A3A]' : 'text-[#8B3A3A]'}`} />
                <h4 className={`font-bold text-lg ${textPrimary}`}>Настройки пробника</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-semibold ${textSecondary} mb-2`}>⏱️ Время (минуты)</label>
                  <input type="number" min={5} max={300} value={timeLimit} onChange={(e) => setTimeLimit(parseInt(e.target.value) || 180)} className={`w-full px-4 py-3 border-2 rounded-xl focus:border-[#8B3A3A] focus:outline-none text-base font-bold ${darkMode ? 'bg-[#2A2420] border-[#3D2817] text-[#8B3A3A]' : 'bg-white border-[#E8DCC8] text-[#8B3A3A]'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-semibold ${textSecondary} mb-2`}>📊 Макс. первичных баллов</label>
                  <div className={`px-4 py-3 border-2 rounded-xl text-base font-bold ${darkMode ? 'bg-[#2A2420] border-[#3D2817] text-[#B8860B]' : 'bg-white border-[#E8DCC8] text-[#B8860B]'}`}>{totalPrimaryScore}</div>
                </div>
              </div>
            </div>
          )}

          <div className="mb-6"><ConversionScaleEditor value={conversionScale} onChange={setConversionScale} maxPrimaryScore={totalPrimaryScore} darkMode={darkMode} /></div>

          <div className={`border-t-2 ${darkMode ? 'border-[#3D2817]' : 'border-[#E8DCC8]'} pt-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold flex items-center gap-2 ${textPrimary}`}>
                <Layers className={`w-5 h-5 ${darkMode ? 'text-[#C67B4B]' : 'text-[#C67B4B]'}`} />
                Задания ({sections.length})
              </h3>
              <div className="flex gap-2">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowBank(true)} className="px-4 py-2 bg-gradient-to-r from-[#6B705C] to-[#6B4E3A] text-white rounded-lg text-sm font-semibold shadow flex items-center gap-2">
                  <Database className="w-4 h-4" /> Из банка
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={addSection} className="px-4 py-2 bg-gradient-to-r from-[#C67B4B] via-[#B8860B] to-[#8B3A3A] text-white rounded-lg text-sm font-semibold shadow flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Добавить
                </motion.button>
              </div>
            </div>

            {sections.map((section, idx) => (
              <TaskEditor key={section.id} section={section} idx={idx} onChange={(updated: any) => updateSection(idx, updated)} onRemove={() => removeSection(idx)} tutorId={tutorId} darkMode={darkMode} />
            ))}

            {sections.length === 0 && (
              <div className={`text-center py-16 rounded-2xl border-2 border-dashed ${darkMode ? 'bg-[#1A1614] border-[#3D2817]' : 'bg-[#FAF3E8] border-[#E8DCC8]'}`}>
                <div className="w-20 h-20 bg-gradient-to-br from-[#C67B4B] to-[#8B3A3A] rounded-full flex items-center justify-center text-white text-4xl mx-auto mb-4 shadow-lg">📝</div>
                <p className={`mb-6 font-semibold text-lg ${darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]'}`}>Нет заданий</p>
                <div className="flex gap-3 justify-center">
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowBank(true)} className="px-6 py-3 bg-gradient-to-r from-[#6B705C] to-[#6B4E3A] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition flex items-center gap-2">
                    <Database className="w-4 h-4" /> Из банка
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={addSection} className="px-6 py-3 bg-gradient-to-r from-[#C67B4B] via-[#B8860B] to-[#8B3A3A] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Вручную
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`${bgFooter} px-8 py-5 border-t-2 flex gap-4`}>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave} disabled={saving} className="flex-1 px-8 py-4 bg-gradient-to-r from-[#C67B4B] via-[#B8860B] to-[#8B3A3A] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2 text-base">
            {saving ? (<><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Сохранение...</>) : (<><CheckCircle className="w-5 h-5" /> Сохранить</>)}
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClose} className={`px-8 py-4 ${darkMode ? 'bg-[#3D2817] text-[#F5E6D3]' : 'bg-white border-2 border-[#E8DCC8] text-[#6B4E3A]'} rounded-xl font-semibold hover:bg-[#FAF3E8] transition text-base`}>
            Отмена
          </motion.button>
        </div>
      </motion.div>

      {showBank && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setShowBank(false)}>
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className={`${bgModal} rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col`} onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-[#6B705C] to-[#6B4E3A] px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <Database className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Добавить из банка</h2>
                  <p className="text-white/80 text-sm">Выберите задания</p>
                </div>
              </div>
              <button onClick={() => setShowBank(false)} className="text-white/80 hover:text-white text-2xl">✕</button>
            </div>

            <div className="flex-1 overflow-hidden flex">
              <div className={`w-64 border-r-2 p-4 overflow-y-auto ${darkMode ? 'bg-[#1A1614] border-[#3D2817]' : 'bg-[#FAF3E8] border-[#E8DCC8]'}`}>
                <h3 className={`font-bold mb-3 flex items-center gap-2 text-base ${darkMode ? 'text-[#C67B4B]' : 'text-[#8B3A3A]'}`}>
                  <Folder className="w-5 h-5" /> Папки
                </h3>
                <button onClick={() => setSelectedBankFolder('all')} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold mb-2 transition ${selectedBankFolder === 'all' ? 'bg-gradient-to-r from-[#C67B4B] to-[#8B3A3A] text-white shadow' : darkMode ? 'bg-[#2A2420] text-[#B8A898] hover:bg-[#3D2817]' : 'bg-white text-[#6B4E3A] hover:bg-[#F5EBD8]'}`}>
                  📋 Все задания
                </button>
                {bankFolders.map(folder => (
                  <button key={folder.id} onClick={() => setSelectedBankFolder(folder.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold mb-2 transition ${selectedBankFolder === folder.id ? 'bg-gradient-to-r from-[#C67B4B] to-[#8B3A3A] text-white shadow' : darkMode ? 'bg-[#2A2420] text-[#B8A898] hover:bg-[#3D2817]' : 'bg-white text-[#6B4E3A] hover:bg-[#F5EBD8]'}`}>
                    📁 {folder.name}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loadingBank ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-[#C67B4B] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </div>
                ) : filteredBankTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📭</div>
                    <p className={`font-semibold ${darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]'}`}>Нет заданий</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className={`flex items-center justify-between mb-4 rounded-xl p-3 ${darkMode ? 'bg-[#1A1614]' : 'bg-[#FAF3E8]'}`}>
                      <p className={`text-sm ${darkMode ? 'text-[#C67B4B]' : 'text-[#8B3A3A]'}`}>
                        Выбрано: <span className="font-bold">{selectedBankTasks.length}</span> / {filteredBankTasks.length}
                      </p>
                      <button onClick={() => setSelectedBankTasks(selectedBankTasks.length === filteredBankTasks.length ? [] : filteredBankTasks.map(t => t.id))} className={`text-sm font-semibold ${darkMode ? 'text-[#B8A898] hover:text-[#C67B4B]' : 'text-[#6B4E3A] hover:text-[#C67B4B]'}`}>
                        {selectedBankTasks.length === filteredBankTasks.length ? 'Снять все' : 'Выбрать все'}
                      </button>
                    </div>
                    {filteredBankTasks.map(task => {
                      const isSelected = selectedBankTasks.includes(task.id);
                      return (
                        <motion.div key={task.id} whileHover={{ scale: 1.01 }} className={`p-4 rounded-xl border-2 cursor-pointer transition ${isSelected ? (darkMode ? 'bg-[#2A2420] border-[#C67B4B] shadow' : 'bg-[#FAF3E8] border-[#C67B4B] shadow') : (darkMode ? 'bg-[#1A1614] border-[#3D2817] hover:border-[#C67B4B]' : 'bg-white border-[#E8DCC8] hover:border-[#C67B4B]')}`} onClick={() => setSelectedBankTasks(prev => prev.includes(task.id) ? prev.filter(id => id !== task.id) : [...prev, task.id])}>
                          <div className="flex items-start gap-3">
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-1 ${isSelected ? 'bg-[#C67B4B] border-[#C67B4B]' : darkMode ? 'border-[#3D2817]' : 'border-[#E8DCC8]'}`}>
                              {isSelected && <Check className="w-4 h-4 text-white" />}
                            </div>
                            <div className="flex-1">
                              <h4 className={`font-bold text-base mb-1 ${textPrimary}`}>{task.title}</h4>
                              <p className={`text-sm line-clamp-2 mb-2 ${darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]'}`}>{task.task_text}</p>
                              <div className="flex flex-wrap gap-2">
                                <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${darkMode ? 'bg-[#6B705C]/20 text-[#6B705C]' : 'bg-[#6B705C]/20 text-[#6B4E3A]'}`}>{task.type}</span>
                                {task.topic_num && <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${darkMode ? 'bg-[#B8860B]/20 text-[#B8860B]' : 'bg-[#B8860B]/20 text-[#B8860B]'}`}>№{task.topic_num}</span>}
                                <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${darkMode ? 'bg-[#8B3A3A]/20 text-[#8B3A3A]' : 'bg-[#8B3A3A]/20 text-[#8B3A3A]'}`}>⭐ {task.max_score} б.</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className={`${bgFooter} px-6 py-4 border-t-2 flex gap-3`}>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={addFromBank} disabled={selectedBankTasks.length === 0} className="flex-1 px-6 py-3 bg-gradient-to-r from-[#6B705C] to-[#6B4E3A] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2 text-base">
                <Plus className="w-5 h-5" /> Добавить {selectedBankTasks.length > 0 ? `(${selectedBankTasks.length})` : ''}
              </motion.button>
              <button onClick={() => setShowBank(false)} className={`px-6 py-3 rounded-xl font-semibold transition text-base ${darkMode ? 'bg-[#3D2817] border-2 border-[#3D2817] text-[#F5E6D3] hover:bg-[#4A3828]' : 'bg-white border-2 border-[#E8DCC8] text-[#6B4E3A] hover:bg-[#FAF3E8]'}`}>
                Отмена
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}

const sendTelegramNotification = async (studentId: string, message: string) => {
  try {
    const studentSnap = await getDoc(doc(db, "profiles", studentId));
    if (studentSnap.exists()) {
      const chatId = studentSnap.data().telegram_chat_id;
      if (chatId) {
        await fetch('/api/telegram/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, targetChatId: chatId }),
        });
      }
    }
  } catch (error) {
    console.error("Ошибка отправки уведомления:", error);
  }
};

function AssignModal({ hw, onClose, tutorId, darkMode = false }: any) {
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>(hw?.assigned_students || []);
  const [selectedCourses, setSelectedCourses] = useState<string[]>(hw?.assigned_courses || []);
  const [selectedGroups, setSelectedGroups] = useState<string[]>(hw?.assigned_groups || []);
  const [dueDate, setDueDate] = useState(hw?.due_date || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const studentsSnap = await getDocs(query(collection(db, "profiles"), where("role", "==", "student")));
        setStudents(studentsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        const coursesSnap = await getDocs(query(collection(db, "courses"), where("tutor_id", "==", tutorId)));
        setCourses(coursesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        const groupsSnap = await getDocs(query(collection(db, "groups"), where("tutor_id", "==", tutorId)));
        setGroups(groupsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      } catch (error: any) { toast.error("Ошибка: " + error.message); setLoading(false); }
    };
    loadData();
  }, [tutorId]);

  const toggleStudent = (studentId: string) => {
    setSelectedStudents(prev => prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]);
  };
  const toggleCourse = (courseId: string) => {
    setSelectedCourses(prev => prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]);
  };
  const toggleGroup = (groupId: string) => {
    setSelectedGroups(prev => prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]);
  };

  const saveAssignment = async () => {
    setSaving(true);
    try {
      const studentsFromGroups: string[] = [];
      for (const groupId of selectedGroups) {
        const group = groups.find(g => g.id === groupId);
        if (group?.student_ids) {
          studentsFromGroups.push(...group.student_ids);
        }
      }
      const allStudents = [...new Set([...selectedStudents, ...studentsFromGroups])];
      await updateDoc(doc(db, "homeworks", hw.id), {
        assigned_students: allStudents,
        assigned_courses: selectedCourses,
        assigned_groups: selectedGroups,
        due_date: dueDate || null,
        updated_at: new Date().toISOString()
      });
      const dueDateStr = dueDate ? `\n📅 Дедлайн: ${new Date(dueDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}` : '';
      const notificationMessage = `📚 Новое домашнее задание!\n"${hw.title}"\n${hw.description || ''}${dueDateStr}\nЗайди в личный кабинет, чтобы начать 👉`;
      for (const studentId of allStudents) {
        await sendTelegramNotification(studentId, notificationMessage);
      }
      toast.success(`✅ ДЗ назначено! (${allStudents.length} учеников, ${selectedGroups.length} групп)\nУведомления отправлены в Telegram`);
      onClose();
    } catch (error: any) { toast.error("Ошибка: " + error.message); }
    finally { setSaving(false); }
  };

  const bgModal = darkMode ? 'bg-[#2A2420]' : 'bg-white';
  const bgInput = darkMode ? 'bg-[#1A1614] border-[#3D2817] text-[#F5E6D3]' : 'bg-[#FAF3E8] border-[#E8DCC8] text-[#3D2817]';
  const bgFooter = darkMode ? 'bg-[#1A1614] border-[#3D2817]' : 'bg-[#FAF3E8] border-[#E8DCC8]';
  const textPrimary = darkMode ? 'text-[#F5E6D3]' : 'text-[#3D2817]';
  const textSecondary = darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]';

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className={`${bgModal} rounded-2xl p-8 text-center`}>
          <div className="w-12 h-12 border-4 border-[#C67B4B] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className={`mt-4 ${darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]'}`}>Загрузка...</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className={`${bgModal} rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col`} onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-[#C67B4B] to-[#8B3A3A] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Назначить ДЗ</h2>
              <p className="text-white/80 text-sm">{hw.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-bold text-lg ${textPrimary} flex items-center gap-2`}>
                <Users className="w-5 h-5 text-[#C67B4B]" />
                👥 Группы
              </h3>
              <button onClick={() => setSelectedGroups(selectedGroups.length === groups.length ? [] : groups.map(g => g.id))} className={`text-sm font-semibold ${darkMode ? 'text-[#C67B4B] hover:text-[#B8860B]' : 'text-[#C67B4B] hover:text-[#8B3A3A]'}`}>
                {selectedGroups.length === groups.length ? 'Снять все' : 'Выбрать все'}
              </button>
            </div>
            <div className={`max-h-48 overflow-y-auto space-y-2 rounded-xl p-3 border-2 ${bgInput}`}>
              {groups.length === 0 ? (
                <p className={`text-center py-4 ${textSecondary}`}>Нет групп. Создайте группы в разделе "Группы".</p>
              ) : (
                groups.map(group => {
                  const studentCount = group.student_ids?.length || 0;
                  return (
                    <label key={group.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${darkMode ? 'hover:bg-[#2A2420]' : 'hover:bg-white'}`}>
                      <input type="checkbox" checked={selectedGroups.includes(group.id)} onChange={() => toggleGroup(group.id)} className="w-5 h-5 accent-[#C67B4B]" />
                      <div className="flex-1">
                        <p className={`font-semibold ${textPrimary}`}>{group.name}</p>
                        <p className={`text-xs ${textSecondary}`}>
                          {group.subject === 'chemistry' ? '🧪 Химия' : '🧬 Биология'} • {studentCount} ученик(ов)
                        </p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
            {selectedGroups.length > 0 && (
              <p className={`text-sm mt-2 font-semibold ${darkMode ? 'text-[#C67B4B]' : 'text-[#C67B4B]'}`}>
                Выбрано: {selectedGroups.length} групп(ы)
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-bold text-lg ${textPrimary} flex items-center gap-2`}>👤 Ученики (дополнительно)</h3>
              <button onClick={() => setSelectedStudents(selectedStudents.length === students.length ? [] : students.map(s => s.id))} className={`text-sm font-semibold ${darkMode ? 'text-[#C67B4B] hover:text-[#B8860B]' : 'text-[#C67B4B] hover:text-[#8B3A3A]'}`}>
                {selectedStudents.length === students.length ? 'Снять всех' : 'Выбрать всех'}
              </button>
            </div>
            <div className={`max-h-48 overflow-y-auto space-y-2 rounded-xl p-3 border-2 ${bgInput}`}>
              {students.length === 0 ? (
                <p className={`text-center py-4 ${textSecondary}`}>Нет учеников</p>
              ) : (
                students.map(student => (
                  <label key={student.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${darkMode ? 'hover:bg-[#2A2420]' : 'hover:bg-white'}`}>
                    <input type="checkbox" checked={selectedStudents.includes(student.id)} onChange={() => toggleStudent(student.id)} className="w-5 h-5 accent-[#C67B4B]" />
                    <div className="flex-1">
                      <p className={`font-semibold ${textPrimary}`}>{student.full_name || student.name || student.email || student.id}</p>
                      <p className={`text-xs ${textSecondary}`}>{student.email}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
            {selectedStudents.length > 0 && (
              <p className={`text-sm mt-2 font-semibold ${darkMode ? 'text-[#C67B4B]' : 'text-[#C67B4B]'}`}>
                Выбрано: {selectedStudents.length} ученик(ов)
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-bold text-lg ${textPrimary} flex items-center gap-2`}>📚 Курсы</h3>
              <button onClick={() => setSelectedCourses(selectedCourses.length === courses.length ? [] : courses.map(c => c.id))} className={`text-sm font-semibold ${darkMode ? 'text-[#C67B4B] hover:text-[#B8860B]' : 'text-[#C67B4B] hover:text-[#8B3A3A]'}`}>
                {selectedCourses.length === courses.length ? 'Снять все' : 'Выбрать все'}
              </button>
            </div>
            <div className={`max-h-48 overflow-y-auto space-y-2 rounded-xl p-3 border-2 ${bgInput}`}>
              {courses.length === 0 ? (
                <p className={`text-center py-4 ${textSecondary}`}>Нет курсов</p>
              ) : (
                courses.map(course => (
                  <label key={course.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${darkMode ? 'hover:bg-[#2A2420]' : 'hover:bg-white'}`}>
                    <input type="checkbox" checked={selectedCourses.includes(course.id)} onChange={() => toggleCourse(course.id)} className="w-5 h-5 accent-[#C67B4B]" />
                    <div className="flex-1">
                      <p className={`font-semibold ${textPrimary}`}>{course.title || course.name || course.id}</p>
                      {course.description && (<p className={`text-xs ${textSecondary}`}>{course.description}</p>)}
                    </div>
                  </label>
                ))
              )}
            </div>
            {selectedCourses.length > 0 && (
              <p className={`text-sm mt-2 font-semibold ${darkMode ? 'text-[#C67B4B]' : 'text-[#C67B4B]'}`}>
                Выбрано: {selectedCourses.length} курс(ов)
              </p>
            )}
          </div>

          <div>
            <label className={`block text-sm font-bold ${darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]'} mb-2`}>📅 Дедлайн (необязательно)</label>
            <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={`w-full px-4 py-3 border-2 rounded-xl focus:border-[#C67B4B] focus:outline-none text-base ${darkMode ? 'bg-[#1A1614] border-[#3D2817] text-[#F5E6D3]' : 'bg-white border-[#E8DCC8] text-[#3D2817]'}`} />
          </div>

          {selectedStudents.length === 0 && selectedCourses.length === 0 && selectedGroups.length === 0 && (
            <div className={`rounded-xl p-4 ${darkMode ? 'bg-[#B8860B]/10 border-[#B8860B]/30' : 'bg-[#B8860B]/10 border-[#B8860B]/30'} border-2`}>
              <p className={`text-sm ${darkMode ? 'text-[#B8860B]' : 'text-[#B8860B]'}`}>
                ⚠️ Если не выбрать учеников, курсы или группы, <b>ДЗ не будет доступно никому</b>.
              </p>
            </div>
          )}
        </div>

        <div className={`${bgFooter} px-6 py-4 border-t-2 flex gap-3`}>
          <button onClick={saveAssignment} disabled={saving} className="flex-1 px-6 py-3 bg-gradient-to-r from-[#C67B4B] to-[#8B3A3A] text-white rounded-xl font-bold hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? (<><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Сохранение...</>) : (<><CheckCircle className="w-5 h-5" /> Сохранить</>)}
          </button>
          <button onClick={onClose} className={`px-6 py-3 rounded-xl font-bold transition ${darkMode ? 'bg-[#3D2817] border-2 border-[#3D2817] text-[#F5E6D3] hover:bg-[#4A3828]' : 'bg-white border-2 border-[#E8DCC8] text-[#6B4E3A] hover:bg-[#FAF3E8]'}`}>
            Отмена
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function HomeworkCard({ hw, isTutor, uid, role, folders, onDelete, onDuplicate, onEdit, onAssign, darkMode = false }: any) {
  const typeInfo = HOMEWORK_TYPES.find(t => t.value === hw.type) || HOMEWORK_TYPES[0];
  const diffInfo = DIFFICULTY_INFO[hw.difficulty as keyof typeof DIFFICULTY_INFO] || DIFFICULTY_INFO.medium;
  const [mounted, setMounted] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);
  const [submissionScore, setSubmissionScore] = useState<number | null>(null);
  const [studentSubmissions, setStudentSubmissions] = useState<any[]>([]);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [showMenu, setShowMenu] = useState(false);
  const [menuDirection, setMenuDirection] = useState<'down' | 'up'>('down');
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || !uid || isTutor) return;
    const q = query(collection(db, "submissions"), where("homework_id", "==", hw.id), where("student_id", "==", uid));
    const unsub = onSnapshot(q, (snap) => {
      const userSub = snap.docs[0];
      if (userSub) {
        const subData = userSub.data();
        setSubmissionStatus(subData.status);
        setSubmissionScore(subData.score);
      } else {
        setSubmissionStatus(null);
        setSubmissionScore(null);
      }
    });
    return () => unsub();
  }, [mounted, uid, isTutor, hw.id]);

  useEffect(() => {
    if (!isTutor || !hw.assigned_students?.length) return;
    const q = query(collection(db, "submissions"), where("homework_id", "==", hw.id));
    const unsub = onSnapshot(q, async (snap) => {
      const subs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setStudentSubmissions(subs);
      const studentIds = [...new Set(subs.map(s => s.student_id))];
      const names: Record<string, string> = {};
      for (let i = 0; i < studentIds.length; i += 10) {
        const chunk = studentIds.slice(i, i + 10);
        try {
          const profSnap = await getDocs(query(collection(db, "profiles"), where("__name__", "in", chunk)));
          profSnap.docs.forEach(doc => {
            const data = doc.data();
            names[doc.id] = data.full_name || data.name || data.email || doc.id;
          });
        } catch (e) { console.error('Ошибка загрузки профилей:', e); }
      }
      setStudentNames(names);
    });
    return () => unsub();
  }, [isTutor, hw.id, hw.assigned_students]);

  const handleStart = () => { if (!hw.id) { toast.error('Ошибка ID'); return; } window.location.href = `/homeworks/${hw.id}`; };
  const handleReview = () => { if (!hw.id) return; window.location.href = `/homeworks/${hw.id}?mode=review`; };
  const handlePreview = () => { if (!hw.id) return; window.location.href = `/homeworks/${hw.id}?preview=true`; };

  const exportToCSV = () => {
    if (!studentSubmissions.length) { toast.error('Нет данных для экспорта'); return; }
    const headers = ['Ученик', 'Статус', 'Баллы', 'Дата отправки'];
    const rows = studentSubmissions.map(sub => [
      studentNames[sub.student_id] || sub.student_id, sub.status,
      `${sub.score || 0}/${hw.max_score}`, new Date(sub.submitted_at).toLocaleString('ru-RU')
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `${hw.title}.csv`; link.click();
    URL.revokeObjectURL(url);
    toast.success('✅ Экспортировано в CSV');
  };

  const getButtonConfig = () => {
    if (isTutor) return null;
    if (!mounted || !submissionStatus) {
      return { text: "Начать", icon: Zap, gradient: "from-[#C67B4B] via-[#B8860B] to-[#8B3A3A]" };
    }
    switch (submissionStatus) {
      case "submitted": return { text: "На проверке", icon: Clock, gradient: "from-[#6B705C] to-[#6B4E3A]" };
      case "needs_revision": return { text: "Исправить", icon: RotateCcw, gradient: "from-[#8B3A3A] to-[#7A2F2F]" };
      case "approved": return { text: `Результат: ${submissionScore ?? 0}/${hw.max_score}`, icon: CheckCircle, gradient: "from-[#6B705C] to-[#5A5F4D]" };
      default: return { text: "Начать", icon: Zap, gradient: "from-[#C67B4B] via-[#B8860B] to-[#8B3A3A]" };
    }
  };

  const buttonConfig = getButtonConfig();

  const getHomeworkStatus = () => {
    if (isTutor || !mounted) return null;
    if (!submissionStatus) return { label: '🔥 Нужно сделать', color: darkMode ? 'border-2 border-[#C67B4B]' : 'border-2 border-[#C67B4B]', urgent: true };
    if (submissionStatus === 'needs_revision') return { label: '⟳ На доработке', color: darkMode ? 'border-2 border-[#8B3A3A]' : 'border-2 border-[#8B3A3A]', urgent: true };
    if (submissionStatus === 'submitted') return { label: '⏳ На проверке', color: darkMode ? 'border-2 border-[#B8860B]' : 'border-2 border-[#B8860B]', urgent: false };
    if (submissionStatus === 'approved') return { label: '✅ Выполнено', color: darkMode ? 'border-2 border-[#6B705C] opacity-80' : 'border-2 border-[#6B705C] opacity-80', urgent: false };
    return null;
  };

  const hwStatus = getHomeworkStatus();

  const getStudentStats = () => {
    if (!isTutor || !hw.assigned_students?.length) return null;
    const assigned = hw.assigned_students;
    return {
      assigned: assigned.length,
      submitted: studentSubmissions.filter(s => s.status === 'submitted').length,
      approved: studentSubmissions.filter(s => s.status === 'approved').length,
      needsRevision: studentSubmissions.filter(s => s.status === 'needs_revision').length,
      notStarted: assigned.length - studentSubmissions.length
    };
  };

  const studentStats = getStudentStats();
  const isTrialExam = hw.type === 'trial_exam';

  const getDeadlineInfo = () => {
    if (!hw.due_date) return null;
    const due = new Date(hw.due_date); const now = new Date(); const diff = due.getTime() - now.getTime();
    if (diff <= 0) return { text: '🔴 Просрочено', color: darkMode ? 'bg-[#8B3A3A]/20 text-[#8B3A3A]' : 'bg-[#8B3A3A]/20 text-[#8B3A3A]', urgent: true };
    const hours = Math.floor(diff / (1000 * 60 * 60)); const days = Math.floor(hours / 24);
    if (days > 0) return { text: `⏰ ${days} дн.`, color: darkMode ? 'bg-[#6B705C]/20 text-[#6B705C]' : 'bg-[#6B705C]/20 text-[#6B705C]', urgent: false };
    if (hours > 0) return { text: `⏰ ${hours} ч.`, color: darkMode ? 'bg-[#B8860B]/20 text-[#B8860B]' : 'bg-[#B8860B]/20 text-[#B8860B]', urgent: true };
    const minutes = Math.floor(diff / (1000 * 60));
    return { text: `⏰ ${minutes} мин.`, color: darkMode ? 'bg-[#8B3A3A]/20 text-[#8B3A3A]' : 'bg-[#8B3A3A]/20 text-[#8B3A3A]', urgent: true };
  };

  const deadlineInfo = getDeadlineInfo();

  const bgCard = darkMode ? 'bg-[#2A2420]' : 'bg-white';
  const textPrimary = darkMode ? 'text-[#F5E6D3]' : 'text-[#3D2817]';
  const textSecondary = darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]';
  const textMuted = darkMode ? 'text-[#6B4E3A]' : 'text-[#B8A898]';

  const stripColor = !submissionStatus
    ? 'bg-[#C67B4B]'
    : submissionStatus === 'needs_revision'
      ? 'bg-[#8B3A3A]'
      : submissionStatus === 'submitted'
        ? 'bg-[#B8860B]'
        : 'bg-[#6B705C]';

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2, boxShadow: "0 12px 28px rgba(0,0,0,0.07)" }} style={{ position: 'relative', zIndex: showMenu ? 30 : 'auto' }} className={`${bgCard} rounded-2xl overflow-visible transition-all duration-300 ${hwStatus?.color || (darkMode ? 'border border-[#3D2817]' : 'border border-[#E8DCC8]')}`}>
      <div className="flex items-stretch flex-wrap">
        {!isTutor && (
          <div className={`w-2 flex-shrink-0 rounded-l-2xl ${stripColor}`}></div>
        )}

        <div className={`flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-[#1A1614]' : 'bg-[#FAF3E8]'} ${!isTutor ? 'rounded-none' : 'rounded-l-2xl'}`} style={{ width: 64 }}>
          <span className="text-2xl">{isTrialExam ? '⏱️' : '📚'}</span>
        </div>

        <div className="flex-1 min-w-[220px] py-3 px-4">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <h4 className={`font-bold text-[15px] ${textPrimary}`}>{hw.title}</h4>
            {!isTutor && hwStatus?.label && (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full text-white ${
                hwStatus.urgent ? 'bg-gradient-to-r from-[#C67B4B] to-[#8B3A3A]'
                : submissionStatus === 'approved' ? 'bg-gradient-to-r from-[#6B705C] to-[#6B4E3A]'
                : 'bg-gradient-to-r from-[#B8860B] to-[#C67B4B]'
              }`}>{hwStatus.label}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 items-center text-xs">
            {isTrialExam && (
              <span className="px-2 py-0.5 bg-gradient-to-r from-[#8B3A3A] to-[#C67B4B] text-white rounded-md font-semibold flex items-center gap-1">
                <Timer className="w-3 h-3" /> Пробник • {hw.time_limit} мин
              </span>
            )}
            {!isTrialExam && (
              <span className={`px-2 py-0.5 rounded-md font-semibold ${darkMode ? 'bg-[#C67B4B]/20 text-[#C67B4B]' : 'bg-[#C67B4B]/20 text-[#8B3A3A]'}`}>{typeInfo.label}</span>
            )}
            {hw.difficulty && (
              <span className={`px-2 py-0.5 rounded-md font-semibold ${
                hw.difficulty === 'easy' ? (darkMode ? 'bg-[#6B705C]/20 text-[#6B705C]' : 'bg-[#6B705C]/20 text-[#6B4E3A]')
                : hw.difficulty === 'medium' ? (darkMode ? 'bg-[#B8860B]/20 text-[#B8860B]' : 'bg-[#B8860B]/20 text-[#B8860B]')
                : (darkMode ? 'bg-[#8B3A3A]/20 text-[#8B3A3A]' : 'bg-[#8B3A3A]/20 text-[#8B3A3A]')
              }`}>{diffInfo.label}</span>
            )}
            <span className={`px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 ${darkMode ? 'bg-[#3D2817] text-[#B8A898]' : 'bg-[#E8DCC8] text-[#6B4E3A]'}`}>
              <Star className="w-3 h-3 text-[#B8860B] fill-[#B8860B]" /> {hw.max_score}
            </span>
            <span className={`px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 ${darkMode ? 'bg-[#3D2817] text-[#B8A898]' : 'bg-[#E8DCC8] text-[#6B4E3A]'}`}>
              <BookOpen className="w-3 h-3 text-[#C67B4B]" /> {hw.sections?.length || 0}
            </span>
            {hw.assigned_students?.length > 0 && (
              <span className={`px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 ${darkMode ? 'bg-[#6B705C]/20 text-[#6B705C]' : 'bg-[#6B705C]/20 text-[#6B4E3A]'}`}>👤 {hw.assigned_students.length}</span>
            )}
            {hw.assigned_groups?.length > 0 && (
              <span className={`px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 ${darkMode ? 'bg-[#B8860B]/20 text-[#B8860B]' : 'bg-[#B8860B]/20 text-[#B8860B]'}`}>👥 {hw.assigned_groups.length}</span>
            )}
            {hw.conversion_scale && (
              <span className={`px-2 py-0.5 rounded-md font-semibold ${darkMode ? 'bg-[#8B3A3A]/20 text-[#8B3A3A]' : 'bg-[#8B3A3A]/20 text-[#8B3A3A]'}`} title="Есть шкала конвертации баллов">🎯</span>
            )}
            {deadlineInfo && (
              <span className={`px-2 py-0.5 rounded-md font-semibold ${deadlineInfo.color} ${deadlineInfo.urgent ? 'animate-pulse' : ''}`}>{deadlineInfo.text}</span>
            )}
            {!isTutor && submissionStatus === 'approved' && (
              <span className={`px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 ${darkMode ? 'bg-[#6B705C]/20 text-[#6B705C]' : 'bg-[#6B705C]/20 text-[#6B4E3A]'}`}>⭐ {submissionScore}/{hw.max_score}</span>
            )}
            {hw.scheduled_at && (
              <span className={`px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 ${darkMode ? 'bg-[#B8860B]/20 text-[#B8860B]' : 'bg-[#B8860B]/20 text-[#B8860B]'}`}><Calendar className="w-3 h-3" /> {new Date(hw.scheduled_at).toLocaleDateString('ru-RU')}</span>
            )}
          </div>
        </div>

        {isTutor && studentStats && (
          <div className={`hidden lg:flex items-center gap-3 px-4 border-l flex-shrink-0 ${darkMode ? 'border-[#3D2817]' : 'border-[#E8DCC8]'}`}>
            <div className="flex items-center gap-1.5 text-xs" title="Принято">
              <span className="w-2 h-2 rounded-full bg-[#6B705C] flex-shrink-0"></span>
              <span className={darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]'}><b>{studentStats.approved}</b></span>
            </div>
            <div className="flex items-center gap-1.5 text-xs" title="На проверке">
              <span className="w-2 h-2 rounded-full bg-[#B8860B] flex-shrink-0"></span>
              <span className={darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]'}><b>{studentStats.submitted}</b></span>
            </div>
            <div className="flex items-center gap-1.5 text-xs" title="На доработке">
              <span className="w-2 h-2 rounded-full bg-[#8B3A3A] flex-shrink-0"></span>
              <span className={darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]'}><b>{studentStats.needsRevision}</b></span>
            </div>
            <div className="flex items-center gap-1.5 text-xs" title="Не начали">
              <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0"></span>
              <span className={darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]'}><b>{studentStats.notStarted}</b></span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0">
          {isTutor ? (
            <>
              <button onClick={() => onEdit(hw)} className="px-3 py-2 bg-gradient-to-r from-[#6B705C] to-[#6B4E3A] text-white rounded-lg text-xs font-semibold hover:shadow-md transition flex items-center gap-1.5 whitespace-nowrap">
                <Edit className="w-3.5 h-3.5" /> Редактировать
              </button>
              <button onClick={() => onAssign(hw)} title="Назначить" className="p-2 bg-[#C67B4B] text-white rounded-lg hover:bg-[#A86535] transition">
                <Users className="w-4 h-4" />
              </button>
              <button onClick={handleReview} title="Проверить" className="p-2 bg-[#6B705C] text-white rounded-lg hover:bg-[#5A5F4D] transition">
                <Eye className="w-4 h-4" />
              </button>
              <div className="relative">
                <button
                  ref={menuButtonRef}
                  onClick={() => {
                    if (!showMenu && menuButtonRef.current) {
                      const rect = menuButtonRef.current.getBoundingClientRect();
                      const spaceBelow = window.innerHeight - rect.bottom;
                      setMenuDirection(spaceBelow < 200 ? 'up' : 'down');
                    }
                    setShowMenu(v => !v);
                  }}
                  title="Ещё"
                  className={`p-2 rounded-lg transition ${darkMode ? 'bg-[#1A1614] text-[#B8A898] hover:bg-[#3D2817]' : 'bg-[#FAF3E8] text-[#6B4E3A] hover:bg-[#F0E8D8]'}`}
                >
                  <span className="text-base leading-none font-bold">⋯</span>
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
                    <div className={`absolute right-0 z-20 w-44 rounded-xl shadow-xl border overflow-hidden ${menuDirection === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'} ${darkMode ? 'bg-[#2A2420] border-[#3D2817]' : 'bg-white border-[#E8DCC8]'}`}>
                      <button onClick={() => { setShowMenu(false); handlePreview(); }} className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 ${darkMode ? 'text-[#B8A898] hover:bg-[#1A1614]' : 'text-[#6B4E3A] hover:bg-[#FAF3E8]'}`}>
                        <Eye className="w-3.5 h-3.5" /> Предпросмотр
                      </button>
                      <button onClick={() => { setShowMenu(false); exportToCSV(); }} className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 ${darkMode ? 'text-[#B8A898] hover:bg-[#1A1614]' : 'text-[#6B4E3A] hover:bg-[#FAF3E8]'}`}>
                        <Download className="w-3.5 h-3.5" /> CSV
                      </button>
                      <button onClick={() => { setShowMenu(false); onDuplicate(hw); }} className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 ${darkMode ? 'text-[#B8A898] hover:bg-[#1A1614]' : 'text-[#6B4E3A] hover:bg-[#FAF3E8]'}`}>
                        <Copy className="w-3.5 h-3.5" /> Копия
                      </button>
                      <button onClick={() => { setShowMenu(false); onDelete(hw); }} className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 border-t ${darkMode ? 'text-[#8B3A3A] border-[#3D2817] hover:bg-[#1A1614]' : 'text-[#8B3A3A] border-[#E8DCC8] hover:bg-[#8B3A3A]/10'}`}>
                        <Trash2 className="w-3.5 h-3.5" /> Удалить
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : buttonConfig && (
            <button onClick={handleStart} className={`px-4 py-2.5 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 bg-gradient-to-r ${buttonConfig.gradient} text-white hover:shadow-md whitespace-nowrap`}>
              {submissionStatus === 'approved' ? (<><CheckCircle className="w-4 h-4" /> {submissionScore}/{hw.max_score}</>)
              : submissionStatus === 'needs_revision' ? (<><RotateCcw className="w-4 h-4" /> Исправить</>)
              : submissionStatus === 'submitted' ? (<><Clock className="w-4 h-4" /> На проверке</>)
              : (<><Zap className="w-4 h-4" /> Начать</>)}
            </button>
          )}
        </div>
      </div>

      {isTutor && studentStats && (
        <div className={`lg:hidden flex items-center gap-3 px-4 pb-3 text-xs flex-wrap ${darkMode ? 'border-t border-[#3D2817]' : 'border-t border-[#E8DCC8]'} pt-2.5`}>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#6B705C]"></span><span className={darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]'}>Принято: <b>{studentStats.approved}</b></span></span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#B8860B]"></span><span className={darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]'}>Проверка: <b>{studentStats.submitted}</b></span></span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#8B3A3A]"></span><span className={darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]'}>Доработка: <b>{studentStats.needsRevision}</b></span></span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-400"></span><span className={darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]'}>Не начали: <b>{studentStats.notStarted}</b></span></span>
        </div>
      )}
    </motion.div>
  );
}

function useStats(homeworks: Homework[], submissions: any[], isTutor: boolean, uid: string) {
  return useMemo(() => {
    if (isTutor) {
      const pendingReview = submissions.filter(s => s.status === 'submitted').length;
      const activeHomeworks = homeworks.filter(h => h.status === 'published' || h.status === 'scheduled').length;
      const totalApproved = submissions.filter(s => s.status === 'approved').length;
      const totalSubmissions = submissions.length;
      const onTimePercent = totalSubmissions > 0 ? Math.round((totalApproved / totalSubmissions) * 100) : 0;
      const now = new Date();
      const overdue = homeworks.filter(h => {
        if (!h.due_date) return false;
        const due = new Date(h.due_date);
        if (due >= now) return false;
        const assigned = h.assigned_students || [];
        const submittedForHw = submissions.filter(s => s.homework_id === h.id);
        const approvedCount = submittedForHw.filter(s => s.status === 'approved').length;
        return approvedCount < assigned.length;
      }).length;
      return { pendingReview, activeHomeworks, onTimePercent, overdue };
    } else {
      const now = new Date();
      const mySubmissions = submissions.filter(s => s.student_id === uid);
      const urgent = homeworks.filter(h => {
        if (!h.due_date) return false;
        const due = new Date(h.due_date);
        const diff = due.getTime() - now.getTime();
        const mySub = mySubmissions.find(s => s.homework_id === h.id);
        return diff < 2 * 24 * 60 * 60 * 1000 && (!mySub || mySub.status === 'draft' || mySub.status === 'needs_revision');
      }).length;
      const inProgress = mySubmissions.filter(s => s.status === 'draft' || s.status === 'in_progress').length;
      const pending = mySubmissions.filter(s => s.status === 'submitted').length;
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const doneMonth = mySubmissions.filter(s => s.status === 'approved' && s.submitted_at && new Date(s.submitted_at) >= monthAgo).length;
      return { urgent, inProgress, pending, doneMonth };
    }
  }, [homeworks, submissions, isTutor, uid]);
}

function StatCard({ icon: Icon, value, label, color, darkMode }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-5 border-2 transition-all ${
        darkMode
          ? 'bg-[#2A2420] border-[#3D2817] hover:border-[#C67B4B]'
          : 'bg-white border-[#E8DCC8] hover:border-[#C67B4B] hover:shadow-lg'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className={`text-3xl font-black mb-1 ${darkMode ? 'text-[#F5E6D3]' : 'text-[#3D2817]'}`}>
        {value}
      </div>
      <div className={`text-sm font-medium ${darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]'}`}>
        {label}
      </div>
    </motion.div>
  );
}

function TabButton({ active, onClick, label, count, darkMode }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
        active
          ? 'bg-gradient-to-r from-[#C67B4B] to-[#8B3A3A] text-white shadow-md'
          : darkMode
            ? 'bg-[#2A2420] text-[#B8A898] hover:bg-[#3D2817] border-2 border-[#3D2817]'
            : 'bg-white text-[#6B4E3A] hover:bg-[#FAF3E8] border-2 border-[#E8DCC8]'
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
          active ? 'bg-white/20' : darkMode ? 'bg-[#3D2817]' : 'bg-[#E8DCC8]'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

function SubmissionJournal({ homeworks, submissions, students, darkMode }: any) {
  const recentHomeworks = homeworks
    .filter(h => h.status === 'published' || h.status === 'scheduled')
    .sort((a: any, b: any) => b.created_at.localeCompare(a.created_at))
    .slice(0, 6);

  if (recentHomeworks.length === 0 || students.length === 0) {
    return (
      <div className={`rounded-2xl p-12 text-center border-2 border-dashed ${
        darkMode ? 'bg-[#2A2420] border-[#3D2817]' : 'bg-white border-[#E8DCC8]'
      }`}>
        <BarChart3 className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-[#6B4E3A]' : 'text-[#B8A898]'}`} />
        <p className={`font-semibold ${darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]'}`}>
          Нет данных для журнала
        </p>
      </div>
    );
  }

  const getCellData = (studentId: string, hwId: string) => {
    const sub = submissions.find((s: any) => s.student_id === studentId && s.homework_id === hwId);
    if (!sub) return { status: 'empty', label: '—', color: darkMode ? 'bg-[#3D2817] text-[#6B4E3A]' : 'bg-[#E8DCC8] text-[#B8A898]' };
    if (sub.status === 'approved') return { status: 'approved', label: `${sub.score || 0}`, color: 'bg-[#6B705C] text-white' };
    if (sub.status === 'submitted') return { status: 'submitted', label: '⏳', color: darkMode ? 'bg-[#B8860B]/20 text-[#B8860B]' : 'bg-[#B8860B]/20 text-[#B8860B]' };
    if (sub.status === 'needs_revision') return { status: 'revision', label: '⟳', color: darkMode ? 'bg-[#8B3A3A]/20 text-[#8B3A3A]' : 'bg-[#8B3A3A]/20 text-[#8B3A3A]' };
    return { status: 'draft', label: '…', color: darkMode ? 'bg-[#3D2817] text-[#6B4E3A]' : 'bg-[#E8DCC8] text-[#B8A898]' };
  };

  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${
      darkMode ? 'bg-[#2A2420] border-[#3D2817]' : 'bg-white border-[#E8DCC8]'
    }`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={darkMode ? 'bg-[#3D2817]' : 'bg-[#FAF3E8]'}>
              <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${
                darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]'
              }`}>
                Ученик
              </th>
              {recentHomeworks.map((hw: any) => (
                <th key={hw.id} className={`px-3 py-3 text-center text-xs font-bold uppercase tracking-wider ${
                  darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]'
                }`}>
                  <div className="truncate max-w-[100px]" title={hw.title}>
                    {hw.title}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((student: any, idx: number) => (
              <tr key={student.id} className={`border-t ${
                darkMode
                  ? `border-[#3D2817] ${idx % 2 === 0 ? 'bg-[#2A2420]' : 'bg-[#252018]'}`
                  : `border-[#E8DCC8] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAF3E8]/50'}`
              }`}>
                <td className={`px-4 py-3 font-semibold text-sm ${
                  darkMode ? 'text-[#F5E6D3]' : 'text-[#3D2817]'
                }`}>
                  {student.full_name || student.name || student.email || 'Ученик'}
                </td>
                {recentHomeworks.map((hw: any) => {
                  const cell = getCellData(student.id, hw.id);
                  return (
                    <td key={hw.id} className="px-3 py-3 text-center">
                      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${cell.color}`}>
                        {cell.label}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReviewCard({ submission, studentName, hw, darkMode, onReview }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`rounded-2xl p-4 border-2 transition-all ${
        darkMode
          ? 'bg-[#2A2420] border-[#3D2817] hover:border-[#C67B4B]'
          : 'bg-white border-[#E8DCC8] hover:border-[#C67B4B]'
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C67B4B] to-[#8B3A3A] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {(studentName || '??').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-bold text-base truncate ${darkMode ? 'text-[#F5E6D3]' : 'text-[#3D2817]'}`}>
            {studentName || 'Ученик'}
          </h4>
          <p className={`text-xs truncate ${darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]'}`}>
            {hw.title}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-xs ${darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]'}`}>
          сдано {submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) : 'недавно'}
        </span>
        <button
          onClick={onReview}
          className="px-4 py-2 bg-gradient-to-r from-[#C67B4B] to-[#8B3A3A] text-white rounded-xl text-sm font-semibold hover:shadow-md transition flex items-center gap-1"
        >
          <Eye className="w-4 h-4" /> Проверить
        </button>
      </div>
    </motion.div>
  );
}

function HomeworksContent() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [diffFilter, setDiffFilter] = useState('all');
  const [folderFilter, setFolderFilter] = useState<string>('all');
  const [editingHw, setEditingHw] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingHw, setDeletingHw] = useState<any>(null);
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [assigningHw, setAssigningHw] = useState<any>(null);
  const [editingFolder, setEditingFolder] = useState<any>(null);
  const [deletingFolder, setDeletingFolder] = useState<any>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [coursesLoaded, setCoursesLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [studentCourses, setStudentCourses] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved === "true") setDarkMode(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("darkMode", String(darkMode));
  }, [darkMode]);

  const uid = user?.uid || "";
  const role = profile?.role || "student";
  const isTutor = role === "tutor";

  const bg = darkMode ? 'bg-[#1A1614]' : 'bg-[#FAF3E8]';
  const bgHeader = darkMode ? 'bg-[#2A2420] border-[#3D2817]' : 'bg-white/80 backdrop-blur border-[#E8DCC8]';
  const bgCard = darkMode ? 'bg-[#2A2420] border-[#3D2817]' : 'bg-white border-[#E8DCC8]';
  const bgInput = darkMode ? 'bg-[#1A1614] border-[#3D2817] text-[#F5E6D3]' : 'bg-white border-[#E8DCC8] text-[#3D2817]';
  const bgEmpty = darkMode ? 'bg-[#2A2420] border-[#3D2817]' : 'bg-[#FAF3E8] border-[#E8DCC8]';
  const textPrimary = darkMode ? 'text-[#F5E6D3]' : 'text-[#3D2817]';
  const textSecondary = darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]';
  const textMuted = darkMode ? 'text-[#6B4E3A]' : 'text-[#B8A898]';

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u: any) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, "profiles", u.uid));
        if (snap.exists()) setProfile({ id: snap.id, ...snap.data() });
      }
      setLoadingAuth(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user || !profile || isTutor) { setCoursesLoaded(true); return; }
    const loadStudentCourses = async () => {
      try {
        const progressSnap = await getDocs(query(collection(db, "course_progress"), where("student_id", "==", user.uid)));
        setStudentCourses(progressSnap.docs.map(d => d.data().course_id).filter(Boolean));
      } catch (e) { console.error("Ошибка загрузки курсов:", e); }
      finally { setCoursesLoaded(true); }
    };
    loadStudentCourses();
  }, [user, profile, isTutor]);

  useEffect(() => {
    if (!user || !profile || !coursesLoaded) return;

    if (isTutor) {
      const q = query(collection(db, "homeworks"), where("tutor_id", "==", user.uid));
      const unsubHomeworks = onSnapshot(q, (snap) => {
        setHomeworks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
        setLoadError(false);
      }, (error) => {
        console.error('Ошибка загрузки ДЗ:', error);
        setLoadError(true);
        setLoading(false);
      });

      const unsubFolders = onSnapshot(query(collection(db, "homework_folders"), where("tutor_id", "==", user.uid)), (snap) => {
        setFolders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      return () => { unsubHomeworks(); unsubFolders(); };
    }

    const byStudent: Record<string, any> = {};
    const byCourse: Record<string, any> = {};
    let studentLoaded = false;
    let courseLoaded = studentCourses.length === 0;

    const commitHomeworks = () => {
      if (!studentLoaded || !courseLoaded) return;
      setHomeworks(Object.values({ ...byCourse, ...byStudent }));
      setLoading(false);
      setLoadError(false);
    };

    const qStudent = query(collection(db, "homeworks"), where("assigned_students", "array-contains", user.uid));
    const unsubStudent = onSnapshot(qStudent, (snap) => {
      Object.keys(byStudent).forEach(k => delete byStudent[k]);
      snap.docs.forEach(d => { byStudent[d.id] = { id: d.id, ...d.data() }; });
      studentLoaded = true;
      commitHomeworks();
    }, (error) => {
      console.error('Ошибка загрузки ДЗ (по ученику):', error);
      setLoadError(true);
      setLoading(false);
    });

    const courseUnsubs: (() => void)[] = [];
    if (studentCourses.length > 0) {
      const chunks: string[][] = [];
      for (let i = 0; i < studentCourses.length; i += 10) chunks.push(studentCourses.slice(i, i + 10));
      let chunksLoaded = 0;
      chunks.forEach((chunk) => {
        const qCourse = query(collection(db, "homeworks"), where("assigned_courses", "array-contains-any", chunk));
        const unsub = onSnapshot(qCourse, (snap) => {
          snap.docs.forEach(d => { byCourse[d.id] = { id: d.id, ...d.data() }; });
          chunksLoaded++;
          if (chunksLoaded >= chunks.length) courseLoaded = true;
          commitHomeworks();
        }, (error) => {
          console.error('Ошибка загрузки ДЗ (по курсам):', error);
        });
        courseUnsubs.push(unsub);
      });
    }

    return () => {
      unsubStudent();
      courseUnsubs.forEach(u => u());
    };
  }, [user, isTutor, profile, studentCourses, coursesLoaded]);

  useEffect(() => {
    if (!user || !profile) return;
    let q;
    if (isTutor) {
      const hwIds = homeworks.map(h => h.id);
      if (hwIds.length === 0) { setSubmissions([]); return; }
      const chunks = [];
      for (let i = 0; i < hwIds.length; i += 10) {
        chunks.push(hwIds.slice(i, i + 10));
      }
      const unsubs = chunks.map(chunk => {
        return onSnapshot(query(collection(db, "submissions"), where("homework_id", "in", chunk)), (snap) => {
          const newSubs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setSubmissions(prev => {
            const prevIds = new Set(prev.map(s => s.id));
            const filtered = prev.filter(s => !chunk.includes(s.homework_id));
            return [...filtered, ...newSubs];
          });
        });
      });
      return () => unsubs.forEach(u => u());
    } else {
      q = query(collection(db, "submissions"), where("student_id", "==", user.uid));
      const unsub = onSnapshot(q, (snap) => {
        setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsub();
    }
  }, [user, profile, isTutor, homeworks]);

  useEffect(() => {
    if (!isTutor || !user) return;
    const unsub = onSnapshot(
      query(collection(db, "profiles"), where("role", "==", "student")),
      (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [isTutor, user]);

  const stats = useStats(homeworks, submissions, isTutor, uid);

  const createFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await addDoc(collection(db, "homework_folders"), {
        tutor_id: user.uid, name: newFolderName.trim(), created_at: new Date().toISOString()
      });
      toast.success('📁 Папка создана');
      setNewFolderName('');
      setShowFolderForm(false);
    } catch (error: any) { toast.error('Ошибка: ' + error.message); }
  };

  const updateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFolderName.trim() || !editingFolder) return;
    try {
      await updateDoc(doc(db, "homework_folders", editingFolder.id), {
        name: editFolderName.trim(), updated_at: new Date().toISOString()
      });
      toast.success('📁 Папка переименована');
      setEditingFolder(null);
      setEditFolderName('');
    } catch (error: any) { toast.error('Ошибка: ' + error.message); }
  };

  const deleteFolder = async () => {
    if (!deletingFolder) return;
    try {
      await deleteDoc(doc(db, "homework_folders", deletingFolder.id));
      const hwQuery = query(collection(db, "homeworks"), where("folder_id", "==", deletingFolder.id));
      const hwSnap = await getDocs(hwQuery);
      if (hwSnap.docs.length > 0) {
        const batch = writeBatch(db);
        hwSnap.docs.forEach(doc => batch.update(doc.ref, { folder_id: null }));
        await batch.commit();
      }
      toast.success('🗑️ Папка удалена');
      setDeletingFolder(null);
      if (folderFilter === deletingFolder.id) setFolderFilter('all');
    } catch (error: any) { toast.error('Ошибка: ' + error.message); }
  };

  const filtered = useMemo(() => {
    let result = [...homeworks];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(h => h.title.toLowerCase().includes(q) || h.description?.toLowerCase().includes(q));
    }
    if (folderFilter !== 'all') result = result.filter(h => h.folder_id === folderFilter);
    if (typeFilter !== 'all') result = result.filter(h => h.type === typeFilter);
    if (diffFilter !== 'all') result = result.filter(h => h.difficulty === diffFilter);

    if (isTutor) {
      if (activeTab === 'pending') {
        const pendingHwIds = new Set(submissions.filter(s => s.status === 'submitted').map(s => s.homework_id));
        result = result.filter(h => pendingHwIds.has(h.id));
      } else if (activeTab === 'overdue') {
        const now = new Date();
        result = result.filter(h => h.due_date && new Date(h.due_date) < now);
      } else if (activeTab === 'drafts') {
        result = result.filter(h => h.status === 'draft' || h.status === 'scheduled');
      }
      result.sort((a, b) => b.created_at.localeCompare(a.created_at));
    } else {
      if (activeTab === 'urgent') {
        const now = new Date();
        result = result.filter(h => {
          if (!h.due_date) return false;
          const diff = new Date(h.due_date).getTime() - now.getTime();
          const mySub = submissions.find(s => s.homework_id === h.id && s.student_id === uid);
          return diff < 2 * 24 * 60 * 60 * 1000 && (!mySub || mySub.status !== 'approved');
        });
      } else if (activeTab === 'progress') {
        result = result.filter(h => {
          const mySub = submissions.find(s => s.homework_id === h.id && s.student_id === uid);
          return mySub && (mySub.status === 'draft' || mySub.status === 'in_progress' || mySub.status === 'needs_revision');
        });
      } else if (activeTab === 'pending') {
        result = result.filter(h => {
          const mySub = submissions.find(s => s.homework_id === h.id && s.student_id === uid);
          return mySub && mySub.status === 'submitted';
        });
      } else if (activeTab === 'done') {
        result = result.filter(h => {
          const mySub = submissions.find(s => s.homework_id === h.id && s.student_id === uid);
          return mySub && mySub.status === 'approved';
        });
      }
      result.sort((a, b) => {
        const aActive = !a.submissionStatus || a.submissionStatus === 'needs_revision';
        const bActive = !b.submissionStatus || b.submissionStatus === 'needs_revision';
        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;
        return b.created_at.localeCompare(a.created_at);
      });
    }
    return result;
  }, [homeworks, search, folderFilter, typeFilter, diffFilter, activeTab, submissions, isTutor, uid]);

  const tabCounts = useMemo(() => {
    if (isTutor) {
      const pendingHwIds = new Set(submissions.filter(s => s.status === 'submitted').map(s => s.homework_id));
      const now = new Date();
      return {
        all: homeworks.length,
        pending: pendingHwIds.size,
        overdue: homeworks.filter(h => h.due_date && new Date(h.due_date) < now).length,
        drafts: homeworks.filter(h => h.status === 'draft' || h.status === 'scheduled').length,
      };
    } else {
      const now = new Date();
      return {
        all: homeworks.length,
        urgent: homeworks.filter(h => {
          if (!h.due_date) return false;
          const diff = new Date(h.due_date).getTime() - now.getTime();
          const mySub = submissions.find(s => s.homework_id === h.id && s.student_id === uid);
          return diff < 2 * 24 * 60 * 60 * 1000 && (!mySub || mySub.status !== 'approved');
        }).length,
        progress: homeworks.filter(h => {
          const mySub = submissions.find(s => s.homework_id === h.id && s.student_id === uid);
          return mySub && (mySub.status === 'draft' || mySub.status === 'in_progress' || mySub.status === 'needs_revision');
        }).length,
        pending: homeworks.filter(h => {
          const mySub = submissions.find(s => s.homework_id === h.id && s.student_id === uid);
          return mySub && mySub.status === 'submitted';
        }).length,
        done: homeworks.filter(h => {
          const mySub = submissions.find(s => s.homework_id === h.id && s.student_id === uid);
          return mySub && mySub.status === 'approved';
        }).length,
      };
    }
  }, [homeworks, submissions, isTutor, uid]);

  async function deleteHomework(hw: any) {
    try { await deleteDoc(doc(db, "homeworks", hw.id)); toast.success('🗑️ Удалено'); setDeletingHw(null); }
    catch (e: any) { toast.error('Ошибка: ' + e.message); }
  }

  async function duplicateHomework(hw: any) {
    try {
      const { id, created_at, updated_at, ...rest } = hw;
      await addDoc(collection(db, "homeworks"), {
        ...rest, title: `${hw.title} (копия)`,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      });
      toast.success('✅ Скопировано');
    } catch (e: any) { toast.error('Ошибка: ' + e.message); }
  }

  if (loadingAuth || loading) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <div className="w-16 h-16 border-4 border-[#C67B4B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center p-4`}>
        <div className={`${bgCard} rounded-xl p-6 border-2 text-center shadow-xl max-w-md`}>
          <div className="text-5xl mb-3">🔒</div>
          <h2 className={`text-xl font-bold mb-2 ${textPrimary}`}>Войдите в аккаунт</h2>
          <Link href="/login" className="inline-block mt-3 px-5 py-2 bg-gradient-to-r from-[#C67B4B] to-[#8B3A3A] text-white rounded-lg font-semibold">Войти</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300 relative overflow-hidden`}>
      <Toaster position="top-right" />

      <div className="fixed inset-0 pointer-events-none opacity-10">
        <div className="absolute top-10 left-10 text-8xl">📝</div>
        <div className="absolute bottom-20 right-10 text-7xl">🎓</div>
        <div className="absolute top-1/3 right-1/4 text-6xl">✏️</div>
        <div className="absolute bottom-1/3 left-1/4 text-6xl">📖</div>
      </div>

      <div className="max-w-7xl mx-auto p-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-4xl">📝</span>
            <h1 className={`text-4xl sm:text-5xl font-black uppercase tracking-tight ${
              darkMode ? 'text-[#F5E6D3]' : 'text-[#3D2817]'
            }`}>
              ДОМАШНИЕ ЗАДАНИЯ
            </h1>
            <span className="text-4xl">🎓</span>
          </div>
          <p className={`font-serif italic text-sm ${darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]'}`}>
            "I can see you, but I can't reach you"
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex-1"></div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2.5 rounded-2xl border-2 shadow-sm transition ${darkMode ? 'bg-[#2A2420] text-[#B8860B] border-[#3D2817]' : 'bg-white text-[#6B4E3A] border-[#E8DCC8]'}`}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {isTutor && (
              <>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowFolderForm(true)} className={`px-5 py-3 rounded-xl font-semibold transition flex items-center gap-2 text-base ${darkMode ? 'bg-[#2A2420] border-2 border-[#3D2817] text-[#F5E6D3] hover:bg-[#3D2817]' : 'bg-white border-2 border-[#E8DCC8] text-[#6B4E3A] hover:border-[#C67B4B] hover:shadow-md'}`}>
                  <Folder className="w-5 h-5" /> Папка
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowCreate(true)} className="px-5 py-3 bg-gradient-to-r from-[#C67B4B] via-[#B8860B] to-[#8B3A3A] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition flex items-center gap-2 text-base">
                  <Plus className="w-5 h-5" /> Новое ДЗ
                </motion.button>
              </>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {isTutor ? (
            <>
              <StatCard icon={Eye} value={stats.pendingReview} label="Ждут проверки" color="bg-[#6B705C]" darkMode={darkMode} />
              <StatCard icon={BookOpen} value={stats.activeHomeworks} label="Активных ДЗ" color="bg-[#C67B4B]" darkMode={darkMode} />
              <StatCard icon={TrendingUp} value={`${stats.onTimePercent}%`} label="Сдано в срок" color="bg-[#6B705C]" darkMode={darkMode} />
              <StatCard icon={AlertCircle} value={stats.overdue} label="Просрочено" color="bg-[#8B3A3A]" darkMode={darkMode} />
            </>
          ) : (
            <>
              <StatCard icon={Flame} value={stats.urgent} label="Горит дедлайн" color="bg-[#8B3A3A]" darkMode={darkMode} />
              <StatCard icon={Edit} value={stats.inProgress} label="В процессе" color="bg-[#B8860B]" darkMode={darkMode} />
              <StatCard icon={Clock} value={stats.pending} label="На проверке" color="bg-[#6B705C]" darkMode={darkMode} />
              <StatCard icon={CheckCircle} value={stats.doneMonth} label="Сделано за месяц" color="bg-[#6B705C]" darkMode={darkMode} />
            </>
          )}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${bgHeader} rounded-3xl p-4 shadow-sm border-2 mb-6`}>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[250px] relative">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Поиск заданий..." className={`w-full px-5 py-3 pl-12 border-2 rounded-xl focus:border-[#C67B4B] focus:outline-none text-base shadow-sm ${bgInput}`} />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#B8A898]" />
            </div>
            <select value={folderFilter} onChange={(e) => setFolderFilter(e.target.value)} className={`px-5 py-3 border-2 rounded-xl text-base focus:border-[#C67B4B] focus:outline-none cursor-pointer shadow-sm ${bgInput}`}>
              <option value="all">📁 Все папки</option>
              {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={`px-5 py-3 border-2 rounded-xl text-base focus:border-[#C67B4B] focus:outline-none cursor-pointer shadow-sm ${bgInput}`}>
              <option value="all">📋 Все типы</option>
              {HOMEWORK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={diffFilter} onChange={(e) => setDiffFilter(e.target.value)} className={`px-5 py-3 border-2 rounded-xl text-base focus:border-[#C67B4B] focus:outline-none cursor-pointer shadow-sm ${bgInput}`}>
              <option value="all">🎯 Любая сложность</option>
              <option value="easy">🟢 Лёгкие</option>
              <option value="medium">🟡 Средние</option>
              <option value="hard">🔴 Сложные</option>
            </select>
          </div>
        </motion.div>

        <div className="flex flex-wrap gap-2 mb-6">
          {isTutor ? (
            <>
              <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')} label="Все" count={tabCounts.all} darkMode={darkMode} />
              <TabButton active={activeTab === 'pending'} onClick={() => setActiveTab('pending')} label="Ждут проверки" count={tabCounts.pending} darkMode={darkMode} />
              <TabButton active={activeTab === 'overdue'} onClick={() => setActiveTab('overdue')} label="Просрочено" count={tabCounts.overdue} darkMode={darkMode} />
              <TabButton active={activeTab === 'drafts'} onClick={() => setActiveTab('drafts')} label="Черновики" count={tabCounts.drafts} darkMode={darkMode} />
            </>
          ) : (
            <>
              <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')} label="Все" count={tabCounts.all} darkMode={darkMode} />
              <TabButton active={activeTab === 'urgent'} onClick={() => setActiveTab('urgent')} label="Горит дедлайн" count={tabCounts.urgent} darkMode={darkMode} />
              <TabButton active={activeTab === 'progress'} onClick={() => setActiveTab('progress')} label="В процессе" count={tabCounts.progress} darkMode={darkMode} />
              <TabButton active={activeTab === 'pending'} onClick={() => setActiveTab('pending')} label="На проверке" count={tabCounts.pending} darkMode={darkMode} />
              <TabButton active={activeTab === 'done'} onClick={() => setActiveTab('done')} label="Сделано" count={tabCounts.done} darkMode={darkMode} />
            </>
          )}
        </div>

        {loadError && (
          <div className={`mb-6 rounded-2xl p-6 text-center ${darkMode ? 'bg-[#8B3A3A]/10 border-[#8B3A3A]/30' : 'bg-[#8B3A3A]/10 border-[#8B3A3A]/30'} border-2`}>
            <AlertTriangle className="w-12 h-12 text-[#8B3A3A] mx-auto mb-3" />
            <p className={`font-semibold mb-3 ${darkMode ? 'text-[#8B3A3A]' : 'text-[#8B3A3A]'}`}>Ошибка загрузки данных</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2 bg-[#8B3A3A] text-white rounded-xl font-semibold hover:bg-[#7A2F2F] transition flex items-center gap-2 mx-auto">
              <RotateCcw className="w-4 h-4" /> Повторить попытку
            </button>
          </div>
        )}

        {isTutor && activeTab === 'pending' && (
          <div className="mb-8">
            <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${textPrimary}`}>
              <UserCheck className="w-5 h-5 text-[#C67B4B]" />
              Ждут проверки
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {submissions
                .filter(s => s.status === 'submitted')
                .map(sub => {
                  const hw = homeworks.find(h => h.id === sub.homework_id);
                  const student = students.find(s => s.id === sub.student_id);
                  if (!hw) return null;
                  return (
                    <ReviewCard
                      key={sub.id}
                      submission={sub}
                      studentName={student?.full_name || student?.name || 'Ученик'}
                      hw={hw}
                      darkMode={darkMode}
                      onReview={() => window.location.href = `/homeworks/${hw.id}?mode=review`}
                    />
                  );
                })}
            </div>
            {submissions.filter(s => s.status === 'submitted').length === 0 && (
              <div className={`rounded-2xl p-12 text-center border-2 border-dashed ${
                darkMode ? 'bg-[#2A2420] border-[#3D2817]' : 'bg-white border-[#E8DCC8]'
              }`}>
                <CheckCircle className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-[#6B705C]' : 'text-[#B8A898]'}`} />
                <p className={`font-semibold ${darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]'}`}>
                  Всё проверено! 🎉
                </p>
              </div>
            )}
          </div>
        )}

        {isTutor && (
          <div className="mb-8">
            <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${textPrimary}`}>
              <BarChart3 className="w-5 h-5 text-[#C67B4B]" />
              Журнал сдачи
            </h3>
            <SubmissionJournal
              homeworks={homeworks}
              submissions={submissions}
              students={students}
              darkMode={darkMode}
            />
          </div>
        )}

        {folders.length > 0 && (
          <div className="mb-6">
            <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${textSecondary}`}>
              <Folder className="w-4 h-4 text-[#C67B4B]" /> Папки
            </h3>
            <div className="flex flex-wrap gap-3">
              <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} onClick={() => setFolderFilter('all')} className={`flex flex-col items-center gap-2 px-5 py-4 rounded-2xl border-2 transition-all shadow-md ${folderFilter === 'all' ? 'bg-gradient-to-br from-[#C67B4B] to-[#B8860B] text-white border-transparent shadow-lg' : `${bgCard} hover:border-[#C67B4B] hover:shadow-lg`}`}>
                <span className="text-2xl">📁</span>
                <span className="text-xs font-bold">Все</span>
              </motion.button>
              {folders.map((folder: any, idx: number) => {
                const colors = ['from-[#6B705C] to-[#6B4E3A]', 'from-[#C67B4B] to-[#8B3A3A]', 'from-[#B8860B] to-[#C67B4B]', 'from-[#8B3A3A] to-[#6B4E3A]', 'from-[#6B4E3A] to-[#3D2817]', 'from-[#6B705C] to-[#8B3A3A]'];
                const color = colors[idx % colors.length];
                const isActive = folderFilter === folder.id;
                return (
                  <div key={folder.id} className={`group relative flex flex-col items-center rounded-2xl border-2 transition-all shadow-md ${isActive ? `bg-gradient-to-br ${color} text-white border-transparent shadow-lg` : `${bgCard} hover:border-[#C67B4B] hover:shadow-lg`}`}>
                    <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button onClick={(e) => { e.stopPropagation(); setEditingFolder(folder); setEditFolderName(folder.name); }} className={`w-7 h-7 rounded-full shadow-md flex items-center justify-center text-xs transition border ${darkMode ? 'bg-[#2A2420] border-[#3D2817] hover:bg-[#3D2817]' : 'bg-white border-[#E8DCC8] hover:bg-[#FAF3E8]'}`} title="Редактировать">✏️</button>
                      <button onClick={(e) => { e.stopPropagation(); setDeletingFolder(folder); }} className={`w-7 h-7 rounded-full shadow-md flex items-center justify-center text-xs transition border ${darkMode ? 'bg-[#2A2420] border-[#3D2817] hover:bg-[#8B3A3A]/20' : 'bg-white border-[#E8DCC8] hover:bg-[#8B3A3A]/10'}`} title="Удалить">🗑️</button>
                    </div>
                    <button onClick={() => setFolderFilter(folder.id)} className="flex flex-col items-center gap-2 px-5 py-4">
                      <span className="text-2xl">📁</span>
                      <span className="text-xs font-bold max-w-[80px] truncate">{folder.name}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className={`text-center py-24 rounded-3xl border-2 border-dashed ${bgEmpty}`}>
            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl mx-auto mb-6 shadow-inner ${darkMode ? 'bg-[#2A2420]' : 'bg-[#FAF3E8]'}`}>📝</div>
            <p className={`text-xl mb-3 font-bold ${darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]'}`}>
              {search || typeFilter !== 'all' || diffFilter !== 'all' ? 'Ничего не найдено' : isTutor ? 'У вас ещё нет ДЗ' : 'Нет доступных заданий'}
            </p>
            {isTutor && (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowCreate(true)} className="px-8 py-3 bg-gradient-to-r from-[#C67B4B] via-[#B8860B] to-[#8B3A3A] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition text-lg">
                ➕ Создать первое ДЗ
              </motion.button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((hw: any) => (
              <HomeworkCard key={hw.id} hw={hw} isTutor={isTutor} uid={uid} role={role} folders={folders} onDelete={setDeletingHw} onDuplicate={duplicateHomework} onEdit={setEditingHw} onAssign={setAssigningHw} darkMode={darkMode} />
            ))}
          </div>
        )}
      </div>

      {showFolderForm && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowFolderForm(false)}>
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className={`${bgCard} rounded-xl p-5 max-w-md border-2 shadow-2xl`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-lg font-bold mb-3 flex items-center gap-2 ${textPrimary}`}>
              <Folder className={`w-5 h-5 text-[#C67B4B]`} /> Новая папка
            </h3>
            <form onSubmit={createFolder}>
              <input autoFocus value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Название папки" className={`w-full px-3 py-2 border-2 rounded-lg focus:border-[#C67B4B] focus:outline-none mb-3 text-sm ${bgInput}`} />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 px-3 py-2 bg-gradient-to-r from-[#C67B4B] to-[#8B3A3A] text-white rounded-lg font-semibold text-sm">Создать</button>
                <button type="button" onClick={() => setShowFolderForm(false)} className={`px-4 py-2 rounded-lg font-semibold text-sm ${darkMode ? 'bg-[#3D2817] text-[#F5E6D3]' : 'bg-[#E8DCC8] text-[#6B4E3A]'}`}>Отмена</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {editingFolder && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingFolder(null)}>
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className={`${bgCard} rounded-xl p-5 max-w-md border-2 shadow-2xl`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-lg font-bold mb-3 flex items-center gap-2 ${textPrimary}`}>
              <Folder className={`w-5 h-5 text-[#C67B4B]`} /> Редактировать папку
            </h3>
            <form onSubmit={updateFolder}>
              <input autoFocus value={editFolderName} onChange={(e) => setEditFolderName(e.target.value)} placeholder="Новое название папки" className={`w-full px-3 py-2 border-2 rounded-lg focus:border-[#C67B4B] focus:outline-none mb-3 text-sm ${bgInput}`} />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 px-3 py-2 bg-gradient-to-r from-[#C67B4B] to-[#8B3A3A] text-white rounded-lg font-semibold text-sm">Сохранить</button>
                <button type="button" onClick={() => setEditingFolder(null)} className={`px-4 py-2 rounded-lg font-semibold text-sm ${darkMode ? 'bg-[#3D2817] text-[#F5E6D3]' : 'bg-[#E8DCC8] text-[#6B4E3A]'}`}>Отмена</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      <AnimatePresence>
        {deletingFolder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeletingFolder(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className={`${bgCard} rounded-xl p-5 max-w-md border-2 shadow-2xl ${darkMode ? 'border-[#8B3A3A]' : 'border-[#8B3A3A]'}`} onClick={e => e.stopPropagation()}>
              <h3 className={`text-lg font-bold mb-2 ${textPrimary}`}>Удалить папку?</h3>
              <p className={`text-sm mb-4 ${textSecondary}`}>Папка <b>"{deletingFolder.name}"</b> будет удалена. ДЗ не пострадают.</p>
              <div className="flex gap-2">
                <button onClick={deleteFolder} className="flex-1 px-3 py-2 bg-gradient-to-r from-[#8B3A3A] to-[#7A2F2F] text-white rounded-lg font-semibold text-sm">🗑️ Удалить</button>
                <button onClick={() => setDeletingFolder(null)} className={`px-4 py-2 rounded-lg font-semibold text-sm ${darkMode ? 'bg-[#3D2817] text-[#F5E6D3]' : 'bg-[#E8DCC8] text-[#6B4E3A]'}`}>Отмена</button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {deletingHw && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeletingHw(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className={`${bgCard} rounded-xl p-5 max-w-md border-2 shadow-2xl ${darkMode ? 'border-[#8B3A3A]' : 'border-[#8B3A3A]'}`} onClick={e => e.stopPropagation()}>
              <h3 className={`text-lg font-bold mb-3 ${textPrimary}`}>Удалить ДЗ?</h3>
              <div className="flex gap-2">
                <button onClick={() => deleteHomework(deletingHw)} className="flex-1 px-3 py-2 bg-gradient-to-r from-[#8B3A3A] to-[#7A2F2F] text-white rounded-lg font-semibold text-sm">🗑️ Удалить</button>
                <button onClick={() => setDeletingHw(null)} className={`px-4 py-2 rounded-lg font-semibold text-sm ${darkMode ? 'bg-[#3D2817] text-[#F5E6D3]' : 'bg-[#E8DCC8] text-[#6B4E3A]'}`}>Отмена</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {(showCreate || editingHw) && (
        <HomeworkEditor hw={editingHw} onClose={() => { setShowCreate(false); setEditingHw(null); }} onSave={() => {}} tutorId={user.uid} darkMode={darkMode} />
      )}

      {assigningHw && (
        <AssignModal hw={assigningHw} onClose={() => setAssigningHw(null)} tutorId={user.uid} darkMode={darkMode} />
      )}
    </div>
  );
}

export default function HomeworksPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAF3E8] dark:bg-[#1A1614] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#C67B4B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <HomeworksContent />
    </Suspense>
  );
}