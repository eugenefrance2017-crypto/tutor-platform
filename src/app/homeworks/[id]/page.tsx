"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import { getApps, getApp, initializeApp } from "firebase/app";
import { 
  getFirestore, doc, getDoc, updateDoc, collection, addDoc, setDoc,
  query, where, onSnapshot, getDocs
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from "firebase/storage";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, CheckCircle, Star, BookOpen, X, Check, RotateCcw, 
  Send, Award, Clock, Eye, MessageCircle, Save, AlertTriangle, 
  Timer, Paperclip, Download, Moon, Sun, Bell, Users, ChevronLeft, 
  ChevronRight, List, Trash2
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

const TASK_TYPES: Record<string, { label: string; icon: string }> = {
  text: { label: "Свободный ответ", icon: "📝" },
  single_choice: { label: "Один вариант", icon: "⚪" },
  multi_choice: { label: "Несколько вариантов", icon: "✅" },
  order: { label: "По порядку", icon: "" },
  match: { label: "Соответствие", icon: "🔗" },
  fill_blanks: { label: "Заполнить пропуски", icon: "✍️" },
  assembly: { label: "Собрать из частей", icon: "" },
  drag_drop: { label: "Перетащить", icon: "🎯" },
  photo: { label: "Фото-задание", icon: "" },
};

const EGE_SCALES: Record<string, Record<number, number>> = {
  chemistry: { 0: 0, 1: 4, 2: 7, 3: 10, 4: 14, 5: 17, 6: 20, 7: 23, 8: 27, 9: 30, 10: 33, 11: 36, 12: 38, 13: 39, 14: 40, 15: 42, 16: 43, 17: 44, 18: 46, 19: 47, 20: 48, 21: 49, 22: 51, 23: 52, 24: 53, 25: 55, 26: 56, 27: 57, 28: 58, 29: 60, 30: 61, 31: 62, 32: 64, 33: 65, 34: 66, 35: 68, 36: 69, 37: 70, 38: 71, 39: 73, 40: 74, 41: 75, 42: 77, 43: 78, 44: 79, 45: 80, 46: 82, 47: 84, 48: 86, 49: 88, 50: 90, 51: 91, 52: 93, 53: 95, 54: 97, 55: 99, 56: 100 },
  biology: { 0: 0, 1: 3, 2: 5, 3: 7, 4: 10, 5: 12, 6: 14, 7: 17, 8: 19, 9: 21, 10: 24, 11: 26, 12: 28, 13: 31, 14: 33, 15: 36, 16: 38, 17: 40, 18: 41, 19: 43, 20: 45, 21: 46, 22: 48, 23: 50, 24: 51, 25: 53, 26: 55, 27: 56, 28: 58, 29: 60, 30: 61, 31: 63, 32: 65, 33: 66, 34: 68, 35: 70, 36: 71, 37: 72, 38: 73, 39: 74, 40: 75, 41: 76, 42: 77, 43: 78, 44: 79, 45: 80, 46: 81, 47: 83, 48: 85, 49: 86, 50: 88, 51: 90, 52: 91, 53: 93, 54: 95, 55: 96, 56: 98, 57: 100 }
};

function convertToTestScore(primaryScore: number, scale?: Record<number, number>): number | null {
  if (!scale) return null;
  if (scale[primaryScore] !== undefined) return scale[primaryScore];
  const keys = Object.keys(scale).map(Number).sort((a, b) => a - b);
  if (primaryScore <= keys[0]) return scale[keys[0]];
  if (primaryScore >= keys[keys.length - 1]) return scale[keys[keys.length - 1]];
  let lower = keys[0], upper = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (keys[i] <= primaryScore && keys[i + 1] >= primaryScore) { lower = keys[i]; upper = keys[i + 1]; break; }
  }
  const ratio = (primaryScore - lower) / (upper - lower);
  return Math.round(scale[lower] + ratio * (scale[upper] - scale[lower]));
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function normalizeText(text: string): string {
  if (!text) return '';
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function formatDisplayText(value: any): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map(item => formatDisplayText(item)).filter(Boolean).join(', ');
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  return String(value);
}

function hasMeaningfulContent(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return Boolean(value);
}

const SUBSCRIPTS = ['₁','₂','₃','₄','₅','₆',''];
const CHARGES = ['⁻','⁴⁻','³⁻','²⁻','','⁺','²⁺','³⁺','⁴','⁵⁺',''];
const OXIDATION = ['⁻⁵','⁴','⁻³','⁻²','⁻¹','⁰','⁺¹','⁺²','⁺³','⁺','⁺','','⁺⁷'];
const SIGNS = ['→','←','⇄','','↑','↓','+','=','t°','°C'];

function ChemButton({ value, onChange, placeholder = "", rows = 2, darkMode = false }: any) {
  const [showPopup, setShowPopup] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const safeValue = typeof value === 'string' ? value : '';

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
    const newValue = safeValue.substring(0, start) + symbol + safeValue.substring(end);
    onChange(newValue);
    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + symbol.length, start + symbol.length); }, 0);
  }

  const bgInput = darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-orange-200 text-gray-900';
  const bgPopup = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textLabel = darkMode ? 'text-gray-300' : 'text-gray-700';

  return (
    <div className="relative flex gap-2">
      <textarea ref={textareaRef} value={safeValue} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} className={`flex-1 px-3 py-2 border-2 rounded-xl focus:border-orange-500 focus:outline-none resize-none text-sm ${bgInput}`} />
      <div className="relative" ref={popupRef}>
        <button type="button" onClick={() => setShowPopup(!showPopup)} className="h-full px-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl hover:from-orange-600 hover:to-pink-600 transition shadow-md text-lg"></button>
        {showPopup && (
          <div className={`fixed right-4 bottom-4 w-64 rounded-xl shadow-2xl border-2 p-3 z-[100] max-h-[400px] overflow-y-auto ${bgPopup}`}>
            <div className="space-y-2">
              <div><p className={`text-xs font-bold ${textLabel} mb-1`}>🔢 Индексы:</p><div className="flex flex-wrap gap-1">{SUBSCRIPTS.map(s => (<button key={s} type="button" onClick={() => insertSymbol(s)} className={`px-2 py-1 rounded text-xs ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-orange-300' : 'bg-orange-50 hover:bg-orange-100 text-orange-800'}`}>{s}</button>))}</div></div>
              <div><p className={`text-xs font-bold ${textLabel} mb-1`}>⚡ Заряды:</p><div className="flex flex-wrap gap-1">{CHARGES.map(s => (<button key={s} type="button" onClick={() => insertSymbol(s)} className={`px-2 py-1 rounded text-xs ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-pink-300' : 'bg-pink-50 hover:bg-pink-100 text-pink-800'}`}>{s}</button>))}</div></div>
              <div><p className={`text-xs font-bold ${textLabel} mb-1`}> Степени:</p><div className="flex flex-wrap gap-1">{OXIDATION.map(s => (<button key={s} type="button" onClick={() => insertSymbol(s)} className={`px-2 py-1 rounded text-xs ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-red-300' : 'bg-red-50 hover:bg-red-100 text-red-800'}`}>{s}</button>))}</div></div>
              <div><p className={`text-xs font-bold ${textLabel} mb-1`}> Знаки:</p><div className="flex flex-wrap gap-1">{SIGNS.map(s => (<button key={s} type="button" onClick={() => insertSymbol(s)} className={`px-2 py-1 rounded text-xs ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-50 hover:bg-gray-100 text-gray-800'}`}>{s}</button>))}</div></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StudentFileUploader({ value, onChange, studentId, sectionId, darkMode = false }: any) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<any | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewImage(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: any[] = [];
    let processedCount = 0;
    const totalFiles = files.length;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith("image/")) {
        toast.error("Можно загружать только изображения");
        processedCount++;
        return;
      }
      if (file.size > 3 * 1024 * 1024) {
        toast.error(`Файл ${file.name} слишком большой (макс. 3MB)`);
        processedCount++;
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        newFiles.push({
          url: dataUrl,
          name: file.name,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString()
        });
        processedCount++;

        if (processedCount === totalFiles) {
          const currentAttachments = Array.isArray(value) ? value : (value ? [value] : []);
          onChange([...currentAttachments, ...newFiles]);
          toast.success(`✅ Загружено фото: ${newFiles.length}`);
          setUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };
      reader.onerror = () => {
        toast.error("Ошибка чтения файла");
        processedCount++;
        if (processedCount === totalFiles) setUploading(false);
      };
      reader.readAsDataURL(file);
    });

    setUploading(true);
  };

  const removeAttachment = (index: number) => {
    const currentAttachments = Array.isArray(value) ? value : (value ? [value] : []);
    onChange(currentAttachments.filter((_: any, i: number) => i !== index));
  };

  const textLabel = darkMode ? "text-gray-300" : "text-gray-700";
  const attachments = Array.isArray(value) ? value : (value ? [value] : []);

  return (
    <div className="space-y-2">
      <label className={`block text-sm font-semibold ${textLabel}`}>📎 Прикрепить фото решения (можно несколько)</label>
      <div className="flex gap-3 items-start flex-wrap">
        <input 
          ref={fileInputRef} 
          type="file" 
          accept="image/*" 
          multiple 
          onChange={handleFileChange} 
          className="hidden" 
          disabled={uploading} 
        />
        <button 
          type="button" 
          onClick={() => fileInputRef.current?.click()} 
          disabled={uploading} 
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50 text-sm"
        >
          <Paperclip className="w-4 h-4" /> 
          {uploading ? "Загрузка..." : "Прикрепить фото"}
        </button>
      </div>
      
      {attachments.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
          {attachments.map((attachment: any, index: number) => (
            <div
              key={index}
              role="button"
              tabIndex={0}
              onClick={() => setPreviewImage(attachment)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setPreviewImage(attachment);
                }
              }}
              className={`relative group rounded-lg overflow-hidden border-2 text-left cursor-pointer ${darkMode ? 'border-gray-600' : 'border-orange-200'}`}
            >
              <img src={attachment.url} alt={attachment.name} className="w-full h-32 object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wide font-semibold text-white bg-black/50 px-2 py-1 rounded-full">
                  Открыть
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAttachment(index);
                  }}
                  className="p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className={`text-xs p-2 truncate ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
                {attachment.name}
              </p>
            </div>
          ))}
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 z-[70] bg-black/85 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/90 text-gray-800 shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage.url}
              alt={previewImage.name || 'Просмотр фото'}
              className="max-h-[85vh] w-full object-contain rounded-2xl shadow-2xl"
              loading="lazy"
            />
            {previewImage.name && (
              <p className="mt-3 text-center text-sm text-white/90">{previewImage.name}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionCard({ section, answer, onChange, studentComment, onCommentChange, showComment = true, isStudent = false, attachment, onAttachmentChange, studentId, darkMode = false }: any) {
  const type = typeof section?.type === 'string' ? section.type : 'text';
  const typeInfo = TASK_TYPES[type] || TASK_TYPES.text;
  const data = section?.data || section || {};

  const bgCard = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-orange-100';
  const bgHeader = darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-100';
  const bgTask = darkMode ? 'bg-gray-700 border-orange-700' : 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-400';
  const bgInput = darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-orange-200 text-gray-900';
  const bgOption = darkMode ? 'bg-gray-700 border-gray-600 hover:border-orange-400' : 'bg-white border-orange-100 hover:border-orange-300';
  const bgOptionSelected = darkMode ? 'border-orange-500 bg-orange-900/20' : 'border-orange-500 bg-orange-50';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-300' : 'text-gray-700';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const textAccent = darkMode ? 'text-orange-300' : 'text-orange-700';
  const taskText = formatDisplayText(data?.task_text || data?.text);
  const sectionTitle = formatDisplayText(section?.title || 'Задание');
  const currentAnswer = typeof answer === 'string' ? answer : (typeof answer?.text === 'string' ? answer.text : formatDisplayText(answer));
  const variants = Array.isArray(data?.variants) ? data.variants : [];
  const orderItems = Array.isArray(data?.order_items) ? data.order_items : [];
  const pairs = Array.isArray(data?.pairs) ? data.pairs : [];
  const assemblyParts = Array.isArray(data?.assembly_parts) ? data.assembly_parts : [];
  const dragItems = Array.isArray(data?.drag_items) ? data.drag_items : [];

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={`${bgCard} rounded-2xl shadow-lg border-2 overflow-hidden`}>
      <div className={`p-6 border-b-2 ${bgHeader}`}>
        <h3 className={`text-xl font-bold ${textPrimary} mb-3`}>{sectionTitle}</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg text-xs font-semibold shadow-sm">{typeInfo.icon} {typeInfo.label}</span>
          <span className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-lg text-xs font-semibold shadow-sm">⭐ {section.max_score || 1} балла</span>
        </div>
      </div>
      <div className="p-6 space-y-6">
        {data?.image_url && (
          <div className={`rounded-xl p-4 border-2 ${darkMode ? 'bg-gray-700 border-orange-700' : 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200'}`}>
            <img src={data.image_url} alt="Задание" className="max-w-full max-h-80 rounded-lg mx-auto" loading="lazy" />
          </div>
        )}
        {taskText && (
          <div className={`rounded-xl p-5 border-l-4 ${bgTask}`}>
            <p className={`text-xs font-semibold ${textAccent} mb-2 uppercase tracking-wide`}>Условие</p>
            <p className={`text-base leading-relaxed whitespace-pre-wrap ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{taskText}</p>
          </div>
        )}
        
        {(type === "text" || type === "photo") && (
          <div className="space-y-3">
            <label className={`block text-sm font-semibold ${textSecondary}`}>Ваш ответ</label>
            <textarea value={currentAnswer} onChange={(e) => onChange(e.target.value)} rows={4} placeholder="Введите ваш ответ..." className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none resize-none transition-all text-base ${bgInput}`} />
            {isStudent && <StudentFileUploader value={attachment} onChange={onAttachmentChange} studentId={studentId} sectionId={section.id} darkMode={darkMode} />}
          </div>
        )}
        
        {(type === "single_choice" || type === "multi_choice") && variants.length > 0 && (
          <div className="space-y-3">
            <p className={`font-semibold ${textSecondary}`}>{type === "single_choice" ? "Выберите один вариант:" : "Выберите правильные ответы:"}</p>
            <div className="space-y-2">
              {variants.map((opt: string, oi: number) => { 
                const isSelected = type === "single_choice" ? answer === oi : (Array.isArray(answer) ? answer.includes(oi) : false); 
                return (
                  <motion.label key={oi} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? bgOptionSelected : bgOption}`}>
                    <input type={type === "single_choice" ? "radio" : "checkbox"} checked={isSelected} onChange={() => { if (type === "single_choice") onChange(oi); else { const current = Array.isArray(answer) ? answer : []; onChange(current.includes(oi) ? current.filter((x: number) => x !== oi) : [...current, oi]); } }} className="w-5 h-5 text-orange-600 border-orange-300 focus:ring-orange-500" />
                    <span className={`text-base font-medium ${textSecondary}`}>{String.fromCharCode(65 + oi)}. {opt}</span>
                  </motion.label>
                ); 
              })}
            </div>
          </div>
        )}
        
        {type === "order" && orderItems.length > 0 && (
          <div className="space-y-3">
            <p className={`font-semibold ${textSecondary}`}>Расположите элементы в правильном порядке:</p>
            <div className="space-y-2">
              {orderItems.map((item: string, i: number) => (
                <div key={i} className={`flex items-center gap-3 p-4 rounded-xl border-2 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-orange-50 border-orange-200'}`}>
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{i + 1}</div>
                  <input type="number" min={1} max={orderItems.length} value={(answer?.[i] || i + 1)} onChange={(e) => { const newAnswer = [...(answer || orderItems.map((_: any, idx: number) => idx + 1))]; newAnswer[i] = parseInt(e.target.value) || (i + 1); onChange(newAnswer); }} className={`w-16 px-3 py-2 border-2 rounded-lg text-center text-base font-bold focus:border-orange-500 focus:outline-none ${bgInput}`} />
                  <span className={`flex-1 text-base font-medium ${textSecondary}`}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {type === "match" && pairs.length > 0 && (
          <div className="space-y-3">
            <p className={`font-semibold ${textSecondary}`}>Установите соответствие:</p>
            <div className="space-y-2">
              {pairs.map((p: any, pi: number) => {
                const usedValues = Object.values(answer || {}).filter((_, idx) => idx !== pi);
                const availableOptions = pairs.filter((r: any) => !usedValues.includes(r.right));
                return (
                  <div key={pi} className={`flex items-center gap-3 p-4 rounded-xl border-2 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-orange-50 border-orange-200'}`}>
                    <span className={`flex-1 text-base font-medium ${textSecondary}`}>{p.left}</span>
                    <span className="text-orange-500 font-bold text-xl">→</span>
                    <select value={(answer || {})[pi] || ""} onChange={(e) => onChange({ ...answer, [pi]: e.target.value })} className={`flex-1 px-4 py-2 border-2 rounded-lg text-base focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none ${bgInput}`}>
                      <option value="">Выберите...</option>
                      {availableOptions.map((r: any, ri: number) => (<option key={ri} value={r.right}>{r.right}</option>))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {type === "fill_blanks" && (
          <div className="space-y-3">
            <p className={`font-semibold ${textSecondary}`}>Заполните пропуски (___):</p>
            {data?.blanks_text && (
              <div className={`rounded-xl p-5 border-l-4 ${bgTask}`}>
                <p className={`text-base leading-relaxed whitespace-pre-wrap ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{data.blanks_text}</p>
              </div>
            )}
            <div>
              <label className={`block text-sm font-semibold ${textSecondary} mb-2`}>Ваши ответы (через запятую):</label>
              <input type="text" value={typeof answer === 'string' ? answer : ''} onChange={(e) => onChange(e.target.value)} placeholder="ответ1, ответ2, ответ3" className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none text-base ${bgInput}`} />
            </div>
          </div>
        )}
        
        {type === "assembly" && assemblyParts.length > 0 && (
          <div className="space-y-3">
            <p className={`font-semibold ${textSecondary}`}>Соберите правильный ответ из частей:</p>
            <div className={`flex flex-wrap gap-2 p-4 rounded-xl border-2 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-orange-50 border-orange-200'}`}>
              {assemblyParts.map((part: string, i: number) => { 
                const isSelected = (answer || []).includes(i); 
                return (
                  <motion.button key={i} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { const current = answer || []; onChange(isSelected ? current.filter((x: number) => x !== i) : [...current, i]); }} className={`px-4 py-2 rounded-lg text-base font-medium transition-all ${isSelected ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow' : darkMode ? 'bg-gray-800 border-2 border-gray-600 text-gray-300 hover:border-orange-400' : 'bg-white border-2 border-orange-200 text-gray-700 hover:border-orange-400'}`}>
                    {part}
                  </motion.button>
                ); 
              })}
            </div>
          </div>
        )}
        
        {type === "drag_drop" && dragItems.length > 0 && (
          <div className="space-y-3">
            <p className={`font-semibold ${textSecondary}`}>Сопоставьте элементы с их целями:</p>
            <div className="space-y-2">
              {dragItems.map((item: any, i: number) => {
                const usedTargets = Object.values(answer || {}).filter((_, idx) => idx !== i);
                const availableTargets = dragItems.filter((d: any) => !usedTargets.includes(d.target));
                return (
                  <div key={i} className={`flex items-center gap-3 p-4 rounded-xl border-2 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-orange-50 border-orange-200'}`}>
                    <span className={`flex-1 text-base font-medium ${textSecondary}`}>{item.item}</span>
                    <span className="text-orange-500 font-bold text-xl">→</span>
                    <select value={(answer || {})[i] || ""} onChange={(e) => onChange({ ...answer, [i]: e.target.value })} className={`flex-1 px-4 py-2 border-2 rounded-lg text-base focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none ${bgInput}`}>
                      <option value="">Выберите цель...</option>
                      {availableTargets.map((d: any, di: number) => (<option key={di} value={d.target}>{d.target}</option>))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showComment && (
          <div className={`border-t-2 pt-4 ${darkMode ? 'border-gray-700' : 'border-orange-100'}`}>
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <label className={`text-sm font-semibold ${textSecondary}`}>Вопрос учителю (необязательно)</label>
            </div>
            <textarea value={studentComment || ''} onChange={(e) => onCommentChange && onCommentChange(e.target.value)} placeholder="Если что-то непонятно — напишите здесь..." rows={2} className={`w-full px-3 py-2 border-2 rounded-xl focus:border-blue-500 focus:outline-none resize-none text-sm ${darkMode ? 'bg-blue-900/10 border-gray-600 text-white' : 'bg-blue-50/30 border-blue-200 text-gray-900'}`} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ResultCard({ section, answer, score, maxScore, comment, conversionScale, studentComment, teacherReply, attachment, darkMode = false }: any) {
  const [previewImage, setPreviewImage] = useState<any | null>(null);
  const data = section.data || section;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewImage(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const isCorrect = score >= maxScore;
  const testScore = convertToTestScore(score, conversionScale);
  const maxTestScore = conversionScale ? convertToTestScore(maxScore, conversionScale) : null;
  
  const bgCard = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-orange-100';
  const bgHeader = isCorrect ? (darkMode ? 'bg-emerald-900/20 border-emerald-700' : 'bg-emerald-50 border-emerald-200') : (darkMode ? 'bg-rose-900/20 border-rose-700' : 'bg-rose-50 border-rose-200');
  const bgTask = darkMode ? 'bg-gray-700 border-orange-700' : 'bg-orange-50 border-orange-400';
  const bgAnswer = isCorrect ? (darkMode ? 'bg-emerald-900/10 border-emerald-700' : 'bg-emerald-50 border-emerald-200') : (darkMode ? 'bg-rose-900/10 border-rose-700' : 'bg-rose-50 border-rose-200');
  const bgCorrect = darkMode ? 'bg-emerald-900/10 border-emerald-700' : 'bg-emerald-50 border-emerald-200';
  const bgComment = darkMode ? 'bg-blue-900/10 border-blue-700' : 'bg-blue-50 border-blue-200';
  const bgQuestion = darkMode ? 'bg-purple-900/10 border-purple-700' : 'bg-purple-50 border-purple-200';
  const bgScore = darkMode ? 'bg-gray-700 border-gray-600' : 'bg-orange-50 border-orange-200';
  const bgTest = darkMode ? 'bg-purple-900/10 border-purple-700' : 'bg-purple-50 border-purple-200';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-300' : 'text-gray-700';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const textAccent = darkMode ? 'text-orange-300' : 'text-orange-700';
  const sectionTitle = formatDisplayText(section.title || 'Задание');
  const answerText = formatDisplayText(answer);
  const correctAnswerText = formatDisplayText(data.correct_answer);
  const teacherCommentText = formatDisplayText(comment);
  const studentQuestionText = formatDisplayText(studentComment);
  const teacherReplyText = formatDisplayText(teacherReply);

  const photos = Array.isArray(attachment) ? attachment : (attachment?.url ? [attachment] : []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${bgCard} rounded-2xl shadow-lg border-2 overflow-hidden`}>
      <div className={`p-6 border-b-2 ${bgHeader}`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-xl font-bold ${textPrimary}`}>{sectionTitle}</h3>
          <div className={`px-4 py-2 rounded-xl font-bold ${isCorrect ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'}`}>{score}/{maxScore}</div>
        </div>
      </div>
      <div className="p-6 space-y-4">
        {(data.task_text || data.text) && (
          <div className={`rounded-xl p-5 border-l-4 ${bgTask}`}>
            <p className={`text-xs font-semibold ${textAccent} mb-2 uppercase tracking-wide`}>Условие</p>
            <p className={`text-base leading-relaxed whitespace-pre-wrap ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{formatDisplayText(data.task_text || data.text)}</p>
          </div>
        )}
        <div>
          <p className={`text-sm font-semibold ${textMuted} mb-2`}>Ваш ответ:</p>
          <div className={`rounded-xl p-4 border-2 ${bgAnswer}`}>
            <p className={`text-base whitespace-pre-wrap ${textPrimary}`}>{answerText}</p>
          </div>
          {photos.length > 0 && (
            <div className="mt-3">
              <p className={`text-sm font-semibold ${textMuted} mb-2`}>📎 Прикреплённые фото ({photos.length}):</p>
              <div className="grid grid-cols-2 gap-3">
                {photos.map((photo: any, idx: number) => (
                  <div
                    key={idx}
                    role="button"
                    tabIndex={0}
                    onClick={() => setPreviewImage(photo)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setPreviewImage(photo);
                      }
                    }}
                    className="rounded-lg overflow-hidden border-2 border-orange-200 text-left cursor-pointer"
                  >
                    <img src={photo.url} alt={`Решение ${idx + 1}`} className="w-full h-40 object-cover" loading="lazy" />
                    <div className="bg-black/60 px-2 py-1 text-[11px] text-white font-semibold">
                      Нажмите для просмотра
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {(data.correct_answer) && (
          <div>
            <p className={`text-sm font-semibold ${darkMode ? 'text-emerald-300' : 'text-emerald-700'} mb-2`}>✓ Правильный ответ:</p>
            <div className={`rounded-xl p-4 border-2 ${bgCorrect}`}>
              <p className={`text-base whitespace-pre-wrap font-medium ${textPrimary}`}>{correctAnswerText}</p>
            </div>
          </div>
        )}
        {comment && (
          <div>
            <p className={`text-sm font-semibold ${darkMode ? 'text-blue-300' : 'text-blue-700'} mb-2`}>💬 Комментарий учителя:</p>
            <div className={`rounded-xl p-4 border-2 ${bgComment}`}>
              <p className={`text-base whitespace-pre-wrap ${textPrimary}`}>{teacherCommentText}</p>
            </div>
          </div>
        )}
        {studentComment && (
          <div>
            <p className={`text-sm font-semibold ${darkMode ? 'text-purple-300' : 'text-purple-700'} mb-2`}>❓ Ваш вопрос:</p>
            <div className={`rounded-xl p-4 border-2 ${bgQuestion}`}>
              <p className={`text-base whitespace-pre-wrap ${textPrimary}`}>{studentQuestionText}</p>
              {teacherReply && (
                <div className={`mt-3 pt-3 border-t-2 ${darkMode ? 'border-purple-700' : 'border-purple-200'}`}>
                  <p className={`text-xs font-bold ${darkMode ? 'text-emerald-300' : 'text-emerald-700'} mb-1`}>✅ Ответ учителя:</p>
                  <p className={`text-sm whitespace-pre-wrap ${textPrimary}`}>{teacherReplyText}</p>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="space-y-3">
          <div className={`flex items-center gap-2 rounded-xl p-4 border-2 ${bgScore}`}>
            <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
            <span className={`text-xl font-bold ${textAccent}`}>{score} / {maxScore} первичных баллов</span>
          </div>
          {testScore !== null && maxTestScore !== null && (
            <div className={`flex items-center gap-2 rounded-xl p-4 border-2 ${bgTest}`}>
              <Award className="w-6 h-6 text-purple-500 fill-purple-500" />
              <span className={`text-xl font-bold ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>{testScore} / {maxTestScore} тестовых баллов</span>
            </div>
          )}
        </div>
      </div>

      {previewImage && (
        <div className="fixed inset-0 z-[70] bg-black/85 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/90 text-gray-800 shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage.url}
              alt={previewImage.name || 'Просмотр фото'}
              className="max-h-[85vh] w-full object-contain rounded-2xl shadow-2xl"
              loading="lazy"
            />
            {previewImage.name && (
              <p className="mt-3 text-center text-sm text-white/90">{previewImage.name}</p>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function calcScore(section: any, answer: any): number {
  if (!answer) return 0;
  const type = section.type || 'text';
  const maxScore = section.max_score || 1;
  const data = section.data || section;
  
  if (type === 'text' || type === 'photo') {
    const ua = normalizeText(typeof answer === 'string' ? answer : '');
    if (!ua) return 0;
    const ca = normalizeText(data.correct_answer || '');
    if (ua === ca) return maxScore;
    if (data.alt_answers && Array.isArray(data.alt_answers)) { for (const alt of data.alt_answers) { if (ua === normalizeText(alt)) return maxScore; } }
    return 0;
  }
  if (type === 'single_choice') { if (data.correct_indices && Array.isArray(data.correct_indices)) return answer === data.correct_indices[0] ? maxScore : 0; return 0; }
  if (type === 'multi_choice') { if (!Array.isArray(answer) || !data.correct_indices) return 0; const correct = new Set(data.correct_indices); const userAnswer = new Set(answer); if (correct.size !== userAnswer.size) return 0; for (const c of correct) { if (!userAnswer.has(c)) return 0; } return maxScore; }
  if (type === 'order') { if (!Array.isArray(answer) || !data.order_items) return 0; const correct = data.order_items.map((_: any, i: number) => i + 1); let matches = 0; for (let i = 0; i < correct.length; i++) { if (answer[i] === correct[i]) matches++; } return Math.round((matches / correct.length) * maxScore); }
  if (type === 'match') { if (!data.pairs || !answer) return 0; let matches = 0; for (let i = 0; i < data.pairs.length; i++) { if (answer[i] === data.pairs[i].right) matches++; } return Math.round((matches / data.pairs.length) * maxScore); }
  if (type === 'fill_blanks') { if (typeof answer !== 'string') return 0; return normalizeText(answer) === normalizeText(data.correct_answer || '') ? maxScore : 0; }
  if (type === 'assembly') { if (!Array.isArray(answer) || !data.assembly_parts) return 0; const correct = data.assembly_parts.map((_: any, i: number) => i); if (answer.length !== correct.length) return 0; for (let i = 0; i < correct.length; i++) { if (answer[i] !== correct[i]) return 0; } return maxScore; }
  if (type === 'drag_drop') { if (!data.drag_items || !answer) return 0; let matches = 0; for (let i = 0; i < data.drag_items.length; i++) { if (answer[i] === data.drag_items[i].target) matches++; } return Math.round((matches / data.drag_items.length) * maxScore); }
  return 0;
}

function ExamTimer({ timeLimit, onTimeUp, isPaused, startTime, darkMode = false }: { timeLimit: number; onTimeUp: () => void; isPaused?: boolean; startTime?: number; darkMode?: boolean }) {
  const [timeLeft, setTimeLeft] = useState(timeLimit * 60);
  const [warningShown, setWarningShown] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const initialRemaining = startTime
      ? Math.max(0, timeLimit * 60 - Math.floor((Date.now() - startTime) / 1000))
      : timeLimit * 60;

    setTimeLeft(initialRemaining);
    if (initialRemaining <= 0) {
      onTimeUp();
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          window.clearInterval(timer);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isPaused, onTimeUp, startTime, timeLimit]);

  useEffect(() => {
    if (timeLeft <= 300 && !warningShown) { setWarningShown(true); toast.error("⏰ Осталось 5 минут!", { duration: 5000, icon: "" }); }
  }, [timeLeft, warningShown]);

  const percentage = (timeLeft / (timeLimit * 60)) * 100;
  const isCritical = timeLeft <= 60;
  const bgColor = isCritical ? 'bg-rose-500 border-rose-600' : (timeLeft <= 300 ? 'bg-amber-500 border-amber-600' : 'bg-emerald-500 border-emerald-600');

  return (
    <div className={`sticky top-0 z-50 px-6 py-3 shadow-lg border-b-2 ${bgColor} ${isCritical ? 'animate-pulse' : ''}`}>
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3"><Timer className={`w-6 h-6 text-white ${isCritical ? 'animate-spin' : ''}`} /><span className="text-white font-bold text-lg">Осталось:</span></div>
        <div className="text-white font-mono text-2xl font-bold">{formatTime(timeLeft)}</div>
        <div className="w-32 h-2 bg-white/30 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${isCritical ? 'bg-white' : 'bg-white/80'}`} style={{ width: `${percentage}%` }} /></div>
      </div>
    </div>
  );
}

function normalizeAttachmentList(value: any): any[] {
  if (Array.isArray(value)) return value.filter((item: any) => item && typeof item === 'object' && typeof item.url === 'string' && item.url.trim().length > 0);
  if (value && typeof value === 'object' && typeof value.url === 'string' && value.url.trim().length > 0) return [value];
  return [];
}

async function uploadAttachmentToStorage(
  attachment: any,
  homeworkId: string,
  studentId: string,
  sectionId: string,
  index: number
): Promise<any> {
  const url = String(attachment.url || '');
  if (!url.startsWith('data:')) return attachment;

  try {
    const fileName = `homeworks/${homeworkId}/${studentId}/${sectionId}_${index}_${Date.now()}.jpg`;
    const storageRef = ref(storage, fileName);
    await uploadString(storageRef, url, 'data_url');
    const downloadUrl = await getDownloadURL(storageRef);
    return {
      url: downloadUrl,
      name: typeof attachment.name === 'string' ? attachment.name : 'photo',
      type: typeof attachment.type === 'string' ? attachment.type : null,
      size: typeof attachment.size === 'number' ? attachment.size : null,
      uploadedAt: typeof attachment.uploadedAt === 'string' ? attachment.uploadedAt : new Date().toISOString()
    };
  } catch (e) {
    console.error('Ошибка загрузки фото в Storage, сохраняем data URL:', e);
    return attachment;
  }
}

async function uploadAllAttachmentsToStorage(
  attachments: Record<string, any[]>,
  homeworkId: string,
  studentId: string
): Promise<Record<string, any[]>> {
  const result: Record<string, any[]> = {};
  
  for (const sectionId of Object.keys(attachments)) {
    const arr = normalizeAttachmentList(attachments[sectionId]);
    if (arr.length === 0) continue;
    
    const uploaded = await Promise.all(
      arr.map((a: any, index: number) => 
        uploadAttachmentToStorage(a, homeworkId, studentId, sectionId, index)
      )
    );
    
    const valid = uploaded.filter((item: any) => item !== null);
    if (valid.length > 0) result[sectionId] = valid;
  }
  
  return result;
}

function cleanAttachmentsForFirestore(attachments: Record<string, any[]>): Record<string, any[]> {
  const clean: Record<string, any[]> = {};
  if (!attachments) return clean;

  Object.keys(attachments).forEach(key => {
    const arr = normalizeAttachmentList(attachments[key]);
    const safe = arr.filter((a: any) => {
      const url = String(a.url || '');
      if (!url) return false;
      return url.length < 5000000;
    });

    if (safe.length > 0) {
      clean[key] = safe.map((a: any) => ({
        url: a.url,
        name: typeof a.name === 'string' ? a.name : 'photo',
        type: typeof a.type === 'string' ? a.type : null,
        size: typeof a.size === 'number' ? a.size : null,
        uploadedAt: typeof a.uploadedAt === 'string' ? a.uploadedAt : null
      }));
    }
  });

  return clean;
}

async function deleteAttachmentFromStorage(photoUrl: string): Promise<void> {
  try {
    if (photoUrl.startsWith('data:')) return;
    const photoRef = ref(storage, photoUrl);
    await deleteObject(photoRef);
  } catch (e) {
    console.error('Ошибка удаления фото из Storage:', e);
  }
}

function HomeworkView() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  let id = params.id as string;
  if (!id) {
    const urlId = pathname?.split('/homeworks/')[1]?.split('?')[0] || '';
    if (urlId) id = urlId;
  }
  
  const isReviewMode = searchParams.get("mode") === "review";
  const isPreviewMode = searchParams.get("preview") === "true";

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  const uid = user?.uid || "";
  const role = profile?.role || "student";
  const isTutor = role === "tutor";

  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("darkMode");
    if (saved === "true") setDarkMode(true);
  }, []);
  
  useEffect(() => { 
    localStorage.setItem("darkMode", String(darkMode)); 
  }, [darkMode]);

  const bg = darkMode ? 'bg-gray-900' : 'bg-gray-50';
  const bgHeader = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const bgCard = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-orange-100';
  const bgInput = darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-orange-200 text-gray-900';
  const bgProgress = darkMode ? 'bg-gray-700' : 'bg-orange-100';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-600';
  const textMuted = darkMode ? 'text-gray-500' : 'text-gray-400';
  const textAccent = darkMode ? 'text-orange-300' : 'text-orange-700';

  const [hw, setHw] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [studentComments, setStudentComments] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<Record<string, any[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [sectionComments, setSectionComments] = useState<Record<string, string>>({});
  const [overallComment, setOverallComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string>("");
  const [currentSubmission, setCurrentSubmission] = useState<any>(null);

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [manualScores, setManualScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [reviewDecision, setReviewDecision] = useState<"approved" | "needs_revision">("approved");
  
  const [commentTemplates, setCommentTemplates] = useState<string[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const persistDraftToFirestore = async (draftPayload: Record<string, any>) => {
    if (!uid || !id || isReviewMode || isPreviewMode || submitted) return;
    try {
      await setDoc(doc(db, "homework_drafts", `${id}_${uid}`), {
        homework_id: id,
        student_id: uid,
        answers: draftPayload.answers || {},
        comments: draftPayload.comments || {},
        updated_at: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.error('Ошибка сохранения черновика в Firestore:', e);
    }
  };

  const [isTrialExam, setIsTrialExam] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [examStartTime, setExamStartTime] = useState<number | null>(null);

  const getConversionScale = () => {
    if (!hw?.conversion_scale) return null;
    if (typeof hw.conversion_scale === 'string' && EGE_SCALES[hw.conversion_scale]) return EGE_SCALES[hw.conversion_scale];
    if (typeof hw.conversion_scale === 'object') return hw.conversion_scale;
    return null;
  };
  const conversionScale = getConversionScale();

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
    const unsub = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (snap.exists()) setCommentTemplates(snap.data().comment_templates || []);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (loadingAuth) return;
    if (!id) { setError('Не указан ID задания'); setLoading(false); return; }
    if (!user) { setError('Необходимо войти в аккаунт'); setLoading(false); return; }
    
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "homeworks", id));
        if (!snap.exists()) { setError('ДЗ не найдено'); setLoading(false); return; }
        const data = snap.data();
        
        if (!isTutor && !isPreviewMode) {
          const hasStudents = data.assigned_students && data.assigned_students.length > 0;
          const hasCourses = data.assigned_courses && data.assigned_courses.length > 0;
          let hasAccess = false;
          if (hasStudents && data.assigned_students.includes(user.uid)) hasAccess = true;
          if (hasCourses) {
            const progressSnap = await getDocs(query(collection(db, "course_progress"), where("student_id", "==", user.uid)));
            const studentCourses = progressSnap.docs.map((d: any) => d.data().course_id);
            if (data.assigned_courses.some((courseId: string) => studentCourses.includes(courseId))) hasAccess = true;
          }
          if (!hasAccess) { setError('У вас нет доступа к этому заданию'); setLoading(false); return; }
        }
        
        if (!isTutor && !isPreviewMode && !isReviewMode) {
          data.sections = data.sections.map((section: any) => ({
            ...section, data: { ...section.data, correct_answer: undefined, correct_indices: undefined, alt_answers: undefined }
          }));
        }
        
        setHw({ id: snap.id, ...data });
        if (data.type === 'trial_exam' || data.time_limit) setIsTrialExam(true);
        
        if (isReviewMode) {
          const subQuery = query(collection(db, "submissions"), where("homework_id", "==", id));
          const unsub = onSnapshot(subQuery, async (snap) => {
            const subs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setSubmissions(subs);
            const studentIds = [...new Set(subs.map((s: any) => s.student_id))];
            const names: Record<string, any> = {};
            for (let i = 0; i < studentIds.length; i += 10) {
              try {
                const profSnap = await getDocs(query(collection(db, "profiles"), where("__name__", "in", studentIds.slice(i, i + 10))));
                profSnap.docs.forEach(doc => { names[doc.id] = { id: doc.id, ...doc.data() }; });
              } catch (e) { console.error('Ошибка загрузки профилей:', e); }
            }
            setStudents(Object.values(names));
          });
          setLoading(false);
          return () => unsub();
        } else {
          if (data.submission) {
            const unsub = onSnapshot(doc(db, "submissions", data.submission), (docSnap) => {
              if (docSnap.exists()) {
                const sd = docSnap.data();
                setCurrentSubmission({ id: docSnap.id, ...sd });
                setSubmissionId(data.submission);
                setReviewStatus(sd.status || "");
                setAnswers(sd.section_answers || {});
                setScores(sd.section_scores || {});
                setScore(sd.score || 0);
                setSectionComments(sd.section_comments || {});
                setOverallComment(sd.overall_comment || "");
                setStudentComments(sd.student_comments || {});
                
                const rawAttachments = sd.attachments || {};
                const normalized: Record<string, any[]> = {};
                Object.keys(rawAttachments).forEach(key => {
                  const val = rawAttachments[key];
                  normalized[key] = normalizeAttachmentList(val);
                });
                setAttachments(prev => Object.keys(normalized).length > 0 ? normalized : prev);
                
                setSubmitted(sd.status !== "needs_revision");
                if (sd.status === "needs_revision") toast(" Работа отправлена на доработку.", { icon: '📝', duration: 5000 });
              }
            });
            setLoading(false);
            return () => unsub();
          } else {
            try {
              const draftSnap = await getDoc(doc(db, "homework_drafts", `${id}_${uid}`));
              if (draftSnap.exists()) {
                const data = draftSnap.data();
                const rawAttachments = data.attachments || {};
                const normalized: Record<string, any[]> = {};
                Object.keys(rawAttachments).forEach(key => {
                  const val = rawAttachments[key];
                  normalized[key] = normalizeAttachmentList(val);
                });
                setAnswers(data.answers || {});
                setStudentComments(data.comments || {});
                setAttachments(Object.keys(normalized).length > 0 ? normalized : {});
              } else {
                const saved = localStorage.getItem(`hw_answers_${id}_${uid}`);
                if (saved) {
                  const parsed = JSON.parse(saved);
                  setAnswers(parsed.answers || {});
                  setStudentComments(parsed.comments || {});
                  const rawAttachments = parsed.attachments || {};
                  const normalized: Record<string, any[]> = {};
                  Object.keys(rawAttachments).forEach(key => {
                    const val = rawAttachments[key];
                    normalized[key] = normalizeAttachmentList(val);
                  });
                  if (JSON.stringify(rawAttachments).length < 900000) {
                    setAttachments(normalized);
                  } else {
                    setAttachments({});
                  }
                }
              }
            } catch (e) { console.error('Ошибка загрузки черновика:', e); }
            setLoading(false);
          }
        }
      } catch (e: any) { setError('Ошибка: ' + e.message); setLoading(false); }
    };
    load();
  }, [id, isReviewMode, loadingAuth, user, isTutor, isPreviewMode]);

  useEffect(() => {
    if (submissionId && !isReviewMode) {
      const unsub = onSnapshot(doc(db, "submissions", submissionId), (docSnap) => {
        if (docSnap.exists()) {
          const sd = docSnap.data();
          setCurrentSubmission({ id: docSnap.id, ...sd });
          setReviewStatus(sd.status || "");
          
          const rawAttachments = sd.attachments || {};
          const normalized: Record<string, any[]> = {};
          Object.keys(rawAttachments).forEach(key => {
            const val = rawAttachments[key];
            normalized[key] = normalizeAttachmentList(val);
          });
          setAttachments(normalized);
          
          setAnswers(sd.section_answers || {});
          setScores(sd.section_scores || {});
          setScore(sd.score || 0);
          setSectionComments(sd.section_comments || {});
          setOverallComment(sd.overall_comment || "");
          setStudentComments(sd.student_comments || {});
          
          if (sd.status === "needs_revision") {
            toast("📝 Работа отправлена на доработку.", { icon: '', duration: 5000 });
            setSubmitted(false);
          } else if (sd.status === "approved") {
            setSubmitted(true);
          }
        }
      });
      
      return () => unsub();
    }
  }, [submissionId, isReviewMode]);

  useEffect(() => {
    if (submitted || !uid || isReviewMode || isPreviewMode) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus('saving');
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const draftPayload = { answers, comments: studentComments, savedAt: new Date().toISOString() };
        const payloadWithAttachments = {
          ...draftPayload,
          attachments: Object.fromEntries(
            Object.entries(attachments).map(([key, value]) => [key, (Array.isArray(value) ? value : (value ? [value] : [])).filter((item: any) => item?.url).map((item: any) => ({
              url: item.url,
              name: item.name || 'photo',
              type: item.type || null,
              size: item.size || null,
              uploadedAt: item.uploadedAt || null
            }))])
          )
        };
        try {
          const payloadString = JSON.stringify(payloadWithAttachments);
          if (payloadString.length > 900000) {
            localStorage.setItem(`hw_answers_${id}_${uid}`, JSON.stringify(draftPayload));
          } else {
            localStorage.setItem(`hw_answers_${id}_${uid}`, payloadString);
          }
        } catch (storageError) {
          localStorage.setItem(`hw_answers_${id}_${uid}`, JSON.stringify(draftPayload));
        }
        void persistDraftToFirestore(payloadWithAttachments);
        setSaveStatus('saved');
      } catch (e) { setSaveStatus('unsaved'); }
    }, 1000);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [answers, studentComments, attachments, submitted, uid, isReviewMode, isPreviewMode, id]);

  useEffect(() => {
    if (Object.keys(scores).length > 0) setScore(Object.values(scores).reduce((sum: number, s: any) => sum + (s || 0), 0));
  }, [scores]);

  const updateAnswer = (sid: string, a: any) => setAnswers(prev => ({ ...prev, [sid]: a }));
  const updateStudentComment = (sid: string, c: string) => setStudentComments(prev => ({ ...prev, [sid]: c }));
  const updateAttachment = (sid: string, file: any) => {
    setAttachments(prev => {
      const current = Array.isArray(prev[sid]) ? prev[sid] : (prev[sid] && typeof prev[sid] === 'object' && 'url' in (prev[sid] as Record<string, unknown>) ? [prev[sid]] : []);
      const incoming = Array.isArray(file) ? file : (file ? [file] : []);
      const merged = [...current, ...incoming].filter((item: any, index: number, self: any[]) => {
        if (!item?.url) return false;
        return self.findIndex((candidate: any) => candidate?.url === item.url && candidate?.name === item.name) === index;
      });
      return { ...prev, [sid]: merged };
    });
  };

  const handleTimeUp = () => { if (!examFinished) { toast.error("⏰ Время вышло!"); setExamFinished(true); submitAnswer(true); } };

  const validateBeforeSubmit = () => {
    const emptyAnswers = (hw.sections || []).filter((sec: any) => {
      const answer = answers[sec.id];
      const hasAttachment = Array.isArray(attachments[sec.id]) && attachments[sec.id].some((a: any) => a?.url);
      const isAnswered = hasMeaningfulContent(answer) || hasAttachment;
      if (!isAnswered) return true;
      return false;
    });
    if (emptyAnswers.length > 0) return window.confirm(`Вы не ответили на ${emptyAnswers.length} заданий. Продолжить?`);
    return true;
  };

  const handleCurrentChange = (newIndex: number) => {
    const hasUnsaved = Object.values(answers).some(hasMeaningfulContent)
      || Object.values(studentComments).some(hasMeaningfulContent)
      || Object.values(attachments).some((value: any) => Array.isArray(value) ? value.some((item: any) => item?.url) : hasMeaningfulContent(value));
    if (hasUnsaved && Math.abs(newIndex - current) > 1 && !window.confirm('Есть несохранённые изменения. Перейти?')) return;
    setCurrent(newIndex);
  };

  async function submitAnswer(autoSubmit = false) {
    if (!uid || !hw || isSubmitting) return;
    if (!autoSubmit && !validateBeforeSubmit()) return;
    setIsSubmitting(true);
    try {
      let cleanAttachments: Record<string, any[]> = {};
      const hasFilesToUpload = Object.values(attachments).some(
        (arr: any) => Array.isArray(arr) ? arr.some((a: any) => a?.url?.startsWith('data:')) : false
      );
      
      if (hasFilesToUpload) {
        toast.loading("Загрузка фото...", { id: 'upload-photos' });
        const uploadedAttachments = await uploadAllAttachmentsToStorage(attachments, id, uid);
        cleanAttachments = cleanAttachmentsForFirestore(uploadedAttachments);
        
        if (Object.keys(cleanAttachments).length === 0 && Object.keys(attachments).length > 0) {
          cleanAttachments = cleanAttachmentsForFirestore(attachments);
        }
        toast.dismiss('upload-photos');
      } else {
        cleanAttachments = cleanAttachmentsForFirestore(attachments);
      }
      
      console.log(" ИТОГОВЫЕ PHOTO ДЛЯ ОТПРАВКИ В БАЗУ:", cleanAttachments);
      
      const secs = hw.sections || [];
      const sc: Record<string,number> = {};
      let total = 0;
      for (const sec of secs) {
        const s = calcScore(sec, answers[sec.id]);
        sc[sec.id] = Math.round(s); 
        total += s;
      }
      const final = Math.round(total);
      const historyEntry = { submitted_at: new Date().toISOString(), score: final, answers: { ...answers } };
      
      const updateData: any = {
        section_answers: answers, section_scores: sc, student_comments: studentComments, attachments: cleanAttachments,
        score: final, status: "submitted", updated_at: new Date().toISOString(), history: [...(currentSubmission?.history || []), historyEntry]
      };
      if (submissionId) {
        updateData.resubmitted_at = new Date().toISOString();
        updateData.resubmit_count = (currentSubmission?.resubmit_count || 0) + 1;
        await updateDoc(doc(db, "submissions", submissionId), updateData);
        toast.success("✅ Работа переотправлена!");
      } else {
        const subRef = await addDoc(collection(db, "submissions"), {
          homework_id: id, student_id: uid, section_answers: answers, section_scores: sc,
          student_comments: studentComments, attachments: cleanAttachments, score: final, 
          submitted_at: new Date().toISOString(), status: "submitted", resubmit_count: 0,
          exam_start_time: examStartTime, history: [historyEntry]
        });
        await updateDoc(doc(db, "homeworks", id), { submission: subRef.id });
        setSubmissionId(subRef.id);
        toast.success(`Результат: ${final}/${hw.max_score}. Отправлено!`);
      }
      setSubmitted(true); setScore(final); setScores(sc); setReviewStatus("submitted");
      try { localStorage.removeItem(`hw_answers_${id}_${uid}`); } catch (e) {}
    } catch (e: any) { toast.error("Ошибка: " + e.message); } 
    finally { setIsSubmitting(false); }
  }

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student?.name || student?.email || studentId;
  };

  const calcTotalScore = (submission: any) => {
    if (!hw?.sections) return 0;
    let total = 0;
    hw.sections.forEach((section: any, idx: number) => {
      const sectionId = section.id || `sec_${idx}`;
      total += manualScores[sectionId] ?? submission.section_scores?.[sectionId] ?? 0;
    });
    return total;
  };

  const applyCommentTemplate = (template: string, sectionId: string) => {
    setComments({ ...comments, [sectionId]: template });
    setShowTemplates(false);
  };

  // Удаление фото для репетитора
  const handleDeletePhoto = async (sectionId: string, photoIndex: number) => {
    if (!window.confirm('Удалить это фото?')) return;
    
    const actualCurrentSub = filteredSubmissions[currentIndex];
    if (!actualCurrentSub) {
      toast.error("Нет текущей работы");
      return;
    }
    
    try {
      const allAttachments = actualCurrentSub.attachments || {};
      const rawAttachment = allAttachments[sectionId];
      const attachment = Array.isArray(rawAttachment) 
        ? rawAttachment 
        : (rawAttachment?.url ? [rawAttachment] : []);
      
      if (photoIndex >= 0 && photoIndex < attachment.length) {
        const photo = attachment[photoIndex];
        
        const updatedAttachments = attachment.filter((_: any, idx: number) => idx !== photoIndex);
        const newAllAttachments = { ...allAttachments };
        
        if (updatedAttachments.length === 0) {
          delete newAllAttachments[sectionId];
        } else {
          newAllAttachments[sectionId] = updatedAttachments;
        }
        
        const updatedSubmissions = submissions.map(s => 
          s.id === actualCurrentSub.id 
            ? { ...s, attachments: newAllAttachments }
            : s
        );
        setSubmissions(updatedSubmissions);
        
        toast.loading("Удаление фото...", { id: 'delete-photo' });
        
        if (!photo.url.startsWith('data:')) {
          try {
            await deleteAttachmentFromStorage(photo.url);
          } catch (e) {
            console.warn('Не удалось удалить из Storage:', e);
          }
        }
        
        await updateDoc(doc(db, "submissions", actualCurrentSub.id), {
          attachments: newAllAttachments
        });
        
        toast.dismiss('delete-photo');
        toast.success("✅ Фото удалено");
      }
    } catch (e: any) {
      toast.dismiss('delete-photo');
      toast.error("Ошибка удаления: " + e.message);
      
      const subQuery = query(collection(db, "submissions"), where("homework_id", "==", id));
      const unsub = onSnapshot(subQuery, (snap) => {
        const subs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setSubmissions(subs);
        unsub();
      });
    }
  };

  // Удаление фото для ученика (когда работа на доработке)
  const handleDeletePhotoStudent = async (sectionId: string, photoIndex: number) => {
    if (!window.confirm('Удалить это фото?')) return;
    
    try {
      const allAttachments = currentSubmission?.attachments || {};
      const rawAttachment = allAttachments[sectionId];
      const attachment = Array.isArray(rawAttachment) 
        ? rawAttachment 
        : (rawAttachment?.url ? [rawAttachment] : []);
      
      if (photoIndex >= 0 && photoIndex < attachment.length) {
        const photo = attachment[photoIndex];
        
        const updatedAttachments = attachment.filter((_: any, idx: number) => idx !== photoIndex);
        const newAllAttachments = { ...allAttachments };
        
        if (updatedAttachments.length === 0) {
          delete newAllAttachments[sectionId];
        } else {
          newAllAttachments[sectionId] = updatedAttachments;
        }
        
        // Оптимистичное обновление
        setCurrentSubmission(prev => ({
          ...prev,
          attachments: newAllAttachments
        }));
        
        toast.loading("Удаление фото...", { id: 'delete-photo-student' });
        
        if (!photo.url.startsWith('data:')) {
          try {
            await deleteAttachmentFromStorage(photo.url);
          } catch (e) {
            console.warn('Не удалось удалить из Storage:', e);
          }
        }
        
        await updateDoc(doc(db, "submissions", submissionId!), {
          attachments: newAllAttachments
        });
        
        toast.dismiss('delete-photo-student');
        toast.success("✅ Фото удалено");
      }
    } catch (e: any) {
      toast.dismiss('delete-photo-student');
      toast.error("Ошибка удаления: " + e.message);
    }
  };

  const saveReview = () => {
    const currentSub = submissions[currentIndex];
    if (!currentSub) { toast.error("Нет отправки для проверки!"); return; }
    
    let totalScore = 0;
    const sectionScores: Record<string, number> = {};
    const sectionCommentsObj: Record<string, string> = {};
    
    hw.sections.forEach((section: any, idx: number) => {
      const sectionId = section.id || `sec_${idx}`;
      const score = manualScores[sectionId] ?? currentSub.section_scores?.[sectionId] ?? 0;
      sectionScores[sectionId] = score;
      sectionCommentsObj[sectionId] = comments[sectionId] || "";
      totalScore += score;
    });

    updateDoc(doc(db, "submissions", currentSub.id), {
      manual_scores: sectionScores, 
      section_comments: sectionCommentsObj, 
      section_scores: sectionScores,
      overall_comment: overallComment, 
      score: totalScore, 
      max_score: hw.max_score || 0,
      status: reviewDecision, 
      reviewed_at: new Date().toISOString(), 
      reviewer_id: user?.uid || null
    }).then(() => {
      toast.success(`✅ Проверка сохранена! ${totalScore}/${hw.max_score}`);
      
      if (reviewDecision === "needs_revision") {
        const subQuery = query(collection(db, "submissions"), where("homework_id", "==", id));
        const unsub = onSnapshot(subQuery, (snap) => {
          const subs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setSubmissions(subs);
        });
        setTimeout(() => unsub(), 2000);
      }
      
      if (currentIndex < submissions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setManualScores({}); 
        setComments({}); 
        setOverallComment("");
      } else {
        toast.success("Все работы проверены!");
      }
    }).catch((error: any) => { 
      toast.error("Ошибка: " + error.message); 
    });
  };

  const filteredSubmissions = (() => {
    let result = [...submissions];
    if (statusFilter !== 'all') result = result.filter((s: any) => s.status === statusFilter);
    if (sortBy === 'date') result.sort((a: any, b: any) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
    else if (sortBy === 'score') result.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
    else if (sortBy === 'name') result.sort((a: any, b: any) => getStudentName(a.student_id).localeCompare(getStudentName(b.student_id)));
    return result;
  })();

  if (loadingAuth || loading || !mounted) return <div className={`min-h-screen ${bg} flex items-center justify-center`}><div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (error || !hw) return (
    <div className={`min-h-screen ${bg} flex items-center justify-center p-4`}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${bgCard} rounded-3xl p-10 border-2 text-center shadow-2xl max-w-md`}>
        <h2 className={`text-2xl font-bold ${textPrimary} mb-3`}>{error || 'ДЗ не найдено'}</h2>
        <button onClick={() => router.push('/homeworks')} className="px-8 py-4 bg-gradient-to-r from-orange-500 via-amber-500 to-pink-500 text-white rounded-xl font-semibold shadow">← Назад</button>
      </motion.div>
    </div>
  );

  if (isReviewMode) {
    const currentSub = filteredSubmissions[currentIndex];
    return (
      <div className={`min-h-screen ${bg} transition-colors duration-300`}>
        <Toaster position="top-right" />
        <header className={`${bgHeader} border-b sticky top-0 z-30 shadow-sm`}>
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/homeworks')} className={`p-2 rounded-xl transition ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-orange-100'}`}><ArrowLeft className={`w-6 h-6 ${darkMode ? 'text-orange-400' : 'text-orange-700'}`} /></button>
              <div><h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'bg-gradient-to-r from-orange-600 via-amber-600 to-pink-600 bg-clip-text text-transparent'}`}>Проверка ДЗ</h1><p className={`text-sm ${textSecondary}`}>{hw.title}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setDarkMode(!darkMode)} className={`p-2.5 rounded-2xl border shadow-sm transition ${darkMode ? 'bg-gray-800 text-yellow-400 border-gray-700' : 'bg-white text-gray-600 border-orange-200'}`}>
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <div className={`px-4 py-2 rounded-xl ${darkMode ? 'bg-orange-900/30' : 'bg-orange-100'}`}><span className={`font-semibold ${darkMode ? 'text-orange-300' : 'text-orange-800'}`}>{filteredSubmissions.length} отправок</span></div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          <div className={`${bgCard} rounded-2xl border-2 p-4 flex flex-wrap gap-3 items-center`}>
            <List className={`w-5 h-5 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`px-3 py-2 border-2 rounded-lg text-sm focus:border-orange-500 focus:outline-none ${bgInput}`}>
              <option value="all">Все статусы</option><option value="submitted">На проверке</option><option value="approved">Принято</option><option value="needs_revision">На доработке</option>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={`px-3 py-2 border-2 rounded-lg text-sm focus:border-orange-500 focus:outline-none ${bgInput}`}>
              <option value="date">По дате</option><option value="score">По баллам</option><option value="name">По имени</option>
            </select>
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className={`${bgCard} rounded-3xl border-2 border-dashed p-12 shadow-sm text-center`}>
              <p className={`text-xl font-semibold mb-2 ${textPrimary}`}>Пока нет отправок</p>
            </div>
          ) : currentSub ? (
            <>
              <div className={`flex items-center justify-between ${bgCard} rounded-2xl border-2 p-4 shadow-lg`}>
                <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0} className={`px-6 py-3 border-2 rounded-xl font-bold disabled:opacity-30 transition flex items-center gap-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-orange-200 text-gray-900'}`}><ChevronLeft className="w-5 h-5" /> Предыдущий</button>
                <div className="text-center"><p className={`text-sm font-bold ${textAccent}`}>Ученик {currentIndex + 1} из {filteredSubmissions.length}</p><p className={`text-xs ${textSecondary}`}>{getStudentName(currentSub.student_id)}</p></div>
                <button onClick={() => setCurrentIndex(Math.min(filteredSubmissions.length - 1, currentIndex + 1))} disabled={currentIndex === filteredSubmissions.length - 1} className={`px-6 py-3 border-2 rounded-xl font-bold disabled:opacity-30 transition flex items-center gap-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-orange-200 text-gray-900'}`}>Следующий <ChevronRight className="w-5 h-5" /></button>
              </div>

              <div className={`${bgCard} rounded-3xl border-2 shadow-lg overflow-hidden`}>
                <div className={`p-6 border-b-2 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200'}`}>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-xl">{getStudentName(currentSub.student_id).charAt(0).toUpperCase()}</div>
                      <div><h3 className={`text-xl font-bold ${textPrimary}`}>{getStudentName(currentSub.student_id)}</h3><p className={`text-sm ${textSecondary}`}>Отправлено: {new Date(currentSub.submitted_at).toLocaleDateString('ru-RU')}</p></div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs ${textSecondary}`}>Результат</p>
                      <p className={`text-2xl font-bold ${textAccent}`}>{calcTotalScore(currentSub)}/{hw.max_score || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {hw.sections?.map((section: any, idx: number) => {
                    const sectionId = section.id || `sec_${idx}`;
                    const studentAnswer = currentSub.section_answers?.[sectionId];
                    const maxScore = section.max_score || 1;
                    const sectionScore = manualScores[sectionId] ?? currentSub.section_scores?.[sectionId] ?? 0;
                    const studentComment = currentSub.student_comments?.[sectionId];
                    
                    const allAttachments = currentSub.attachments || {};
                    const rawAttachment = allAttachments[sectionId];
                    const attachment = Array.isArray(rawAttachment) 
                      ? rawAttachment 
                      : (rawAttachment?.url ? [rawAttachment] : []);

                    return (
                      <div key={sectionId} className={`rounded-xl p-5 border-2 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-orange-50 border-orange-200'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2"><div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold">{idx + 1}</div><h4 className={`font-bold text-lg ${textPrimary}`}>{section.title || `Задание ${idx + 1}`}</h4></div>
                          <div className={`px-3 py-1 rounded-lg font-bold ${sectionScore >= maxScore ? (darkMode ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700') : sectionScore > 0 ? (darkMode ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700') : (darkMode ? 'bg-rose-900/30 text-rose-300' : 'bg-rose-100 text-rose-700')}`}>{sectionScore}/{maxScore}</div>
                        </div>
                        
                        {(section.data?.task_text || section.data?.text) && (
                          <div className={`rounded-lg p-3 border-l-4 mb-3 ${darkMode ? 'bg-gray-800 border-orange-400' : 'bg-white border-orange-400'}`}>
                            <p className={`text-xs font-bold ${textAccent} mb-1`}>Условие:</p>
                            <p className={`text-sm whitespace-pre-wrap ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{section.data.task_text || section.data.text}</p>
                          </div>
                        )}
                        
                        <div className="mb-3">
                          <p className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Ответ ученика:</p>
                          <div className={`rounded-lg p-3 border-2 ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-orange-200'}`}>
                            <p className={`text-sm whitespace-pre-wrap ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{studentAnswer || <span className={textMuted}>Нет ответа</span>}</p>
                          </div>
                          
                          {attachment.length > 0 ? (
                            <div className="mt-3">
                              <p className={`text-sm font-semibold ${textSecondary} mb-2`}>📎 Фото ({attachment.length}):</p>
                              <div className="grid grid-cols-2 gap-3">
                                {attachment.map((photo: any, photoIdx: number) => (
                                  <div key={photoIdx} className="relative">
                                    <div
                                      onClick={() => window.open(photo.url, '_blank')}
                                      className="overflow-hidden rounded-lg border-2 border-orange-200 cursor-pointer group"
                                    >
                                      <img 
                                        src={photo.url} 
                                        alt={`Решение ${photoIdx + 1}`} 
                                        className="w-full h-40 object-cover transition-transform group-hover:scale-105" 
                                        loading="lazy"
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                        <span className="bg-white/90 px-3 py-1 rounded-full text-xs font-semibold">
                                           Увеличить
                                        </span>
                                      </div>
                                    </div>
                                    
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        handleDeletePhoto(sectionId, photoIdx);
                                      }}
                                      className="absolute -top-2 -right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all hover:scale-110 cursor-pointer"
                                      title="Удалить фото"
                                      style={{ zIndex: 30 }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
                              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>📷 Фото не загружено</p>
                            </div>
                          )}
                        </div>

                        {studentComment && (
                          <div className="mb-3">
                            <p className={`text-sm font-bold ${darkMode ? 'text-purple-300' : 'text-purple-700'} mb-2`}>❓ Вопрос ученика:</p>
                            <div className={`rounded-lg p-3 border-2 ${darkMode ? 'bg-purple-900/10 border-purple-700' : 'bg-purple-50 border-purple-200'}`}>
                              <p className={`text-sm whitespace-pre-wrap ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{studentComment}</p>
                            </div>
                          </div>
                        )}
                        
                        {section.data?.correct_answer && (
                          <div className="mb-3">
                            <p className={`text-sm font-bold ${darkMode ? 'text-emerald-300' : 'text-emerald-700'} mb-2`}>✓ Правильный ответ:</p>
                            <div className={`rounded-lg p-3 border-2 ${darkMode ? 'bg-emerald-900/10 border-emerald-700' : 'bg-emerald-50 border-emerald-200'}`}>
                              <p className={`text-sm whitespace-pre-wrap ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{section.data.correct_answer}</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'} block mb-2`}>Баллы:</label>
                            <input type="number" min={0} max={maxScore} value={manualScores[sectionId] ?? sectionScore} onChange={(e) => setManualScores(prev => ({ ...prev, [sectionId]: parseInt(e.target.value) || 0 }))} className={`w-full px-4 py-3 border-2 rounded-xl text-center font-bold focus:border-orange-500 focus:outline-none text-lg ${darkMode ? 'bg-gray-800 border-gray-600 text-orange-300' : 'bg-white border-orange-200 text-orange-700'}`} />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>💬 Комментарий:</label>
                              {commentTemplates.length > 0 && <button onClick={() => setShowTemplates(!showTemplates)} className={`text-xs font-semibold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>Шаблоны</button>}
                            </div>
                            {showTemplates && commentTemplates.length > 0 && (
                              <div className={`mb-2 p-2 rounded-lg border max-h-32 overflow-y-auto ${darkMode ? 'bg-purple-900/10 border-purple-700' : 'bg-purple-50 border-purple-200'}`}>
                                {commentTemplates.map((template: string, i: number) => (<button key={i} onClick={() => applyCommentTemplate(template, sectionId)} className={`w-full text-left px-2 py-1 text-xs rounded ${darkMode ? 'text-gray-300 hover:bg-purple-900/20' : 'text-gray-700 hover:bg-purple-100'}`}>{template}</button>))}
                              </div>
                            )}
                            <ChemButton value={comments[sectionId] || ""} onChange={(v: string) => setComments(prev => ({ ...prev, [sectionId]: v }))} placeholder="Комментарий..." rows={3} darkMode={darkMode} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`${bgCard} rounded-3xl border-2 p-6 shadow-lg space-y-4 sticky bottom-4`}>
                <div>
                  <label className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'} block mb-2`}>💬 Общий комментарий:</label>
                  <ChemButton value={overallComment} onChange={setOverallComment} placeholder="Общий комментарий..." rows={3} darkMode={darkMode} />
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => { 
                      setReviewDecision("needs_revision"); 
                      saveReview(); 
                    }} 
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-xl transition flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-5 h-5" /> ⟳ На доработку
                  </button>
                  <button 
                    onClick={() => { 
                      setReviewDecision("approved"); 
                      saveReview(); 
                    }} 
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold hover:shadow-xl transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" /> ✓ Принять
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </main>
      </div>
    );
  }

  const sections = hw.sections || [];
  const section = sections[current];
  const isDeadlinePassed = hw.due_date && new Date(hw.due_date) < new Date();
  
  const getDeadlineInfo = () => {
    if (!hw.due_date) return null;
    const diff = new Date(hw.due_date).getTime() - new Date().getTime();
    if (diff <= 0) return { text: '🔴 Просрочено!', color: darkMode ? 'text-rose-400' : 'text-rose-600', urgent: true };
    const hours = Math.floor(diff / (1000 * 60 * 60)); const days = Math.floor(hours / 24);
    if (days > 0) return { text: `⏰ Осталось ${days} дн.`, color: darkMode ? 'text-emerald-400' : 'text-emerald-600', urgent: false };
    if (hours > 0) return { text: `⏰ Осталось ${hours} ч.`, color: darkMode ? 'text-amber-400' : 'text-amber-600', urgent: true };
    return { text: `⏰ Осталось ${Math.floor(diff / (1000 * 60))} мин.`, color: darkMode ? 'text-rose-400' : 'text-rose-600', urgent: true };
  };
  const deadlineInfo = getDeadlineInfo();

  const getButtonColor = (sec: any, i: number) => {
    if (submitted) {
      const sc = scores[sec.id] ?? 0; const max = sec.max_score || 1;
      if (sc >= max) return "bg-gradient-to-br from-emerald-500 to-teal-500 text-white border-emerald-600 shadow-lg";
      else if (sc > 0) return "bg-gradient-to-br from-amber-400 to-yellow-500 text-white border-amber-500 shadow-lg";
      else return "bg-gradient-to-br from-rose-500 to-red-500 text-white border-rose-600 shadow-lg";
    } else if (i === current) return "bg-gradient-to-r from-orange-500 via-amber-500 to-pink-500 text-white border-orange-500 shadow-lg";
    else if (answers[sec.id] !== undefined) return darkMode ? "bg-orange-900/20 text-orange-300 border-amber-700" : "bg-orange-100 text-orange-700 border-amber-300";
    return darkMode ? "bg-gray-800 text-gray-400 border-2 border-gray-600" : "bg-white text-gray-500 border-2 border-orange-200";
  };

  const totalScore = score !== null ? score : Object.values(scores).reduce((sum: number, s: any) => sum + (s || 0), 0);
  const maxScore = hw.max_score || 1;
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  if (isTrialExam && !submitted && !isPreviewMode) {
    if (!examStarted) {
      return (
        <div className={`min-h-screen ${bg} flex items-center justify-center p-4`}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`${bgCard} rounded-3xl p-10 border-2 text-center shadow-2xl max-w-2xl`}>
            <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center text-white text-5xl mx-auto mb-6 shadow-lg">⏱️</div>
            <h2 className={`text-3xl font-bold ${textPrimary} mb-3`}>Пробный экзамен</h2>
            <p className={`text-xl mb-2 font-semibold ${textSecondary}`}>{hw.title}</p>
            <div className={`rounded-2xl p-6 border-2 mb-6 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-orange-50 border-orange-200'}`}>
              <div className="flex items-center justify-center gap-4 mb-4">
                <Timer className={`w-8 h-8 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                <div className="text-left"><p className={`text-sm ${textSecondary}`}>Время на выполнение</p><p className={`text-3xl font-bold ${textAccent}`}>{hw.time_limit || 180} минут</p></div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => router.push('/homeworks')} className={`flex-1 px-6 py-4 border-2 rounded-xl font-bold transition ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-white border-orange-300 text-gray-700'}`}>← Назад</button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setExamStarted(true); setExamStartTime(Date.now()); }} className="flex-1 px-6 py-4 bg-gradient-to-r from-orange-500 via-amber-500 to-pink-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2">
                <Timer className="w-5 h-5" /> Начать экзамен
              </motion.button>
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <div className={`min-h-screen ${bg}`}>
        <ExamTimer timeLimit={hw.time_limit || 180} onTimeUp={handleTimeUp} isPaused={examFinished} startTime={examStartTime || undefined} darkMode={darkMode} />
        <Toaster position="top-right" />
        <div className="max-w-5xl mx-auto px-6 py-6">
          <header className={`${bgCard} rounded-2xl border-2 p-4 mb-6 shadow-sm`}>
            <div className="flex items-center justify-between">
              <div><h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'bg-gradient-to-r from-orange-600 via-amber-600 to-pink-600 bg-clip-text text-transparent'}`}>{hw.title}</h1><p className={`text-sm ${textSecondary}`}>Пробный экзамен • {sections.length} заданий</p></div>
              <div className="flex items-center gap-3">
                {saveStatus === 'saving' && <span className={`text-xs flex items-center gap-1 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}><Save className="w-3 h-3 animate-pulse" /> Сохранение...</span>}
                {saveStatus === 'saved' && <span className={`text-xs flex items-center gap-1 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}><Check className="w-3 h-3" /> Сохранено</span>}
              </div>
            </div>
          </header>
          <div className="space-y-6">
            {sections.map((sec: any, idx: number) => (
              <div key={sec.id} id={`section-${idx}`}>
                <QuestionCard section={sec} answer={answers[sec.id]} onChange={(a: any) => updateAnswer(sec.id, a)} studentComment={studentComments[sec.id]} onCommentChange={(c: string) => updateStudentComment(sec.id, c)} isStudent={true} attachment={attachments[sec.id]} onAttachmentChange={(f: any) => updateAttachment(sec.id, f)} studentId={uid} darkMode={darkMode} />
              </div>
            ))}
          </div>
          <div className="sticky bottom-4 mt-6">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { if (window.confirm('Завершить экзамен?')) { setExamFinished(true); submitAnswer(); } }} disabled={isSubmitting} className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2 text-lg">
              {isSubmitting ? (<><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Отправка...</>) : (<><CheckCircle className="w-6 h-6" /> Завершить экзамен</>)}
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      <Toaster position="top-right" />
      <header className={`${bgHeader} border-b sticky top-0 z-30 shadow-sm`}>
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <button onClick={() => router.push('/homeworks')} className={`font-medium text-sm flex items-center gap-2 transition ${darkMode ? 'text-orange-400 hover:text-orange-300' : 'text-orange-700 hover:text-orange-800'}`}><ArrowLeft className="w-5 h-5" /> Назад</button>
            <h1 className={`text-lg sm:text-xl font-bold truncate flex-1 text-center ${darkMode ? 'text-white' : 'bg-gradient-to-r from-orange-600 via-amber-600 to-pink-600 bg-clip-text text-transparent'}`}>{hw.title}</h1>
            <div className="flex items-center gap-2">
              <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-xl border shadow-sm transition ${darkMode ? 'bg-gray-800 text-yellow-400 border-gray-700' : 'bg-white text-gray-600 border-orange-200'}`}>
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              {deadlineInfo && !submitted && <span className={`px-3 py-1 rounded-lg text-xs font-bold ${deadlineInfo.urgent ? (darkMode ? 'bg-rose-900/30 text-rose-300 animate-pulse' : 'bg-rose-100 text-rose-700 animate-pulse') : (darkMode ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700')}`}>{deadlineInfo.text}</span>}
              {isPreviewMode && <span className={`px-3 py-1 rounded-lg text-xs font-bold ${darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'}`}> Предпросмотр</span>}
              {reviewStatus === "needs_revision" && <span className="px-3 py-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-lg text-xs font-bold animate-pulse"> На доработку</span>}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {reviewStatus === "needs_revision" && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl p-5 shadow-lg mb-6 text-white">
            <div className="flex items-center gap-3"><RotateCcw className="w-8 h-8" /><div><h3 className="font-bold text-lg">Работа отправлена на доработку</h3><p className="text-sm text-white/90">Исправьте ошибки и отправьте снова</p></div></div>
          </motion.div>
        )}
        {overallComment && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-5 shadow-lg mb-6 text-white">
            <div className="flex items-start gap-3"><Award className="w-8 h-8 flex-shrink-0" /><div><h3 className="font-bold text-lg mb-1">💬 Комментарий учителя:</h3><p className="text-sm text-white/90 whitespace-pre-wrap">{overallComment}</p></div></div>
          </motion.div>
        )}
        {saveStatus === 'saving' && !submitted && !isPreviewMode && (
          <div className="fixed bottom-4 right-4 bg-amber-500 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 z-50"><Save className="w-4 h-4 animate-pulse" /><span className="text-sm font-semibold">Сохранение...</span></div>
        )}

        <div className={`${bgCard} rounded-2xl p-6 shadow-lg border-2 mb-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center text-white"><BookOpen className="w-4 h-4" /></div><span className={`text-sm font-semibold ${textSecondary}`}>Прогресс</span></div>
            <span className={`text-sm font-bold ${textAccent}`}>{current + 1} из {sections.length}</span>
          </div>
          <div className={`relative h-3 ${bgProgress} rounded-full overflow-hidden mb-4`}>
            <motion.div className="absolute h-full bg-gradient-to-r from-orange-500 via-amber-500 to-pink-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${((current + 1) / sections.length) * 100}%` }} transition={{ duration: 0.5 }} />
          </div>
          <div className="flex items-center justify-center gap-3">
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleCurrentChange(Math.max(0, current - 1))} disabled={current === 0} className={`w-10 h-10 rounded-xl disabled:opacity-30 flex items-center justify-center border-2 shadow-sm ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-orange-300 border-gray-600' : 'bg-orange-50 hover:bg-amber-100 text-orange-700 border-orange-200'}`}></motion.button>
            <div className="flex gap-2 flex-wrap justify-center">
              {sections.map((sec: any, i: number) => (
                <motion.button key={sec.id} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleCurrentChange(i)} className={`w-10 h-10 rounded-xl text-sm font-bold transition-all flex items-center justify-center shadow-sm border-2 ${getButtonColor(sec, i)}`}>{i + 1}</motion.button>
              ))}
            </div>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleCurrentChange(Math.min(sections.length - 1, current + 1))} disabled={current >= sections.length - 1} className={`w-10 h-10 rounded-xl disabled:opacity-30 flex items-center justify-center border-2 shadow-sm ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-orange-300 border-gray-600' : 'bg-orange-50 hover:bg-amber-100 text-orange-700 border-orange-200'}`}>▶</motion.button>
          </div>
          {submitted && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className={`mt-5 pt-4 border-t-2 ${darkMode ? 'border-gray-700' : 'border-orange-100'}`}>
              <p className={`text-xs font-semibold mb-3 text-center ${textSecondary}`}>Результаты:</p>
              <div className="flex flex-wrap justify-center gap-3">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 ${darkMode ? 'bg-emerald-900/20 border-emerald-700' : 'bg-emerald-50 border-emerald-200'}`}><div className="w-5 h-5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-md"></div><span className={`text-sm font-semibold ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>✓ Верно: {sections.filter((sec: any) => (scores[sec.id] ?? 0) >= (sec.max_score || 1)).length}</span></div>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 ${darkMode ? 'bg-rose-900/20 border-rose-700' : 'bg-rose-50 border-rose-200'}`}><div className="w-5 h-5 bg-gradient-to-br from-rose-500 to-red-500 rounded-md"></div><span className={`text-sm font-semibold ${darkMode ? 'text-rose-300' : 'text-rose-700'}`}>✗ Неверно: {sections.filter((sec: any) => (scores[sec.id] ?? 0) === 0).length}</span></div>
              </div>
            </motion.div>
          )}
        </div>

        {submitted && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", duration: 0.6 }} className="bg-gradient-to-br from-orange-500 via-amber-500 to-pink-500 rounded-3xl p-8 shadow-2xl text-white mb-6">
            <div className="flex items-center justify-between">
              <div><p className="text-orange-100 text-sm mb-2">Первичные баллы</p><p className="text-5xl font-bold">{totalScore}<span className="text-3xl text-orange-200">/{maxScore}</span></p></div>
              <div className="text-right"><p className="text-4xl font-bold text-white mb-1">{percentage}%</p><p className="text-orange-100 text-sm font-medium">{percentage >= 90 ? ' Отлично!' : percentage >= 70 ? ' Хорошо' : ' Нужно подучить'}</p></div>
            </div>
          </motion.div>
        )}

        {section && (
          <AnimatePresence mode="wait">
            <motion.div key={current} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mb-6">
              {!submitted ? (
                <QuestionCard section={section} answer={answers[section.id]} onChange={(a: any) => updateAnswer(section.id, a)} studentComment={studentComments[section.id]} onCommentChange={(c: string) => updateStudentComment(section.id, c)} showComment={!isPreviewMode} isStudent={!isTutor && !isPreviewMode} attachment={attachments[section.id]} onAttachmentChange={(f: any) => updateAttachment(section.id, f)} studentId={uid} darkMode={darkMode} />
              ) : (
                <ResultCard section={section} answer={answers[section.id]} score={scores[section.id] || 0} maxScore={section.max_score || 1} comment={sectionComments[section.id]} conversionScale={conversionScale} studentComment={studentComments[section.id]} teacherReply={currentSubmission?.teacher_replies?.[section.id]} attachment={attachments[section.id]} darkMode={darkMode} />
              )}
              
              {/* Блок с фото и кнопкой удаления для ученика (только когда работа на доработке) */}
              {!isTutor && reviewStatus === "needs_revision" && (
                <div className="mt-4">
                  {(() => {
                    const allAttachments = currentSubmission?.attachments || {};
                    const sectionId = section.id || `sec_${current}`;
                    const rawAttachment = allAttachments[sectionId];
                    const attachment = Array.isArray(rawAttachment) 
                      ? rawAttachment 
                      : (rawAttachment?.url ? [rawAttachment] : []);
                    
                    if (attachment.length === 0) return null;
                    
                    return (
                      <div className={`${bgCard} rounded-xl p-4 border-2`}>
                        <p className={`text-sm font-semibold ${textSecondary} mb-2`}>📎 Ваши фото ({attachment.length}):</p>
                        <div className="grid grid-cols-2 gap-3">
                          {attachment.map((photo: any, photoIdx: number) => (
                            <div key={photoIdx} className="relative">
                              <div
                                onClick={() => window.open(photo.url, '_blank')}
                                className="overflow-hidden rounded-lg border-2 border-orange-200 cursor-pointer group"
                              >
                                <img 
                                  src={photo.url} 
                                  alt={`Решение ${photoIdx + 1}`} 
                                  className="w-full h-40 object-cover transition-transform group-hover:scale-105" 
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                  <span className="bg-white/90 px-3 py-1 rounded-full text-xs font-semibold">
                                     Увеличить
                                  </span>
                                </div>
                              </div>
                              
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleDeletePhotoStudent(sectionId, photoIdx);
                                }}
                                className="absolute -top-2 -right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all hover:scale-110 cursor-pointer"
                                title="Удалить фото"
                                style={{ zIndex: 30 }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {!isPreviewMode && (
          <div className="flex gap-3">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleCurrentChange(Math.max(0, current - 1))} disabled={current === 0} className={`px-6 py-3 rounded-xl font-semibold transition-all text-base ${current === 0 ? `opacity-50 cursor-not-allowed ${darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-500'}` : `${darkMode ? 'bg-gray-800 border-2 border-gray-600 text-gray-300 hover:border-orange-400 hover:bg-gray-700' : 'bg-white border-2 border-orange-200 text-gray-700 hover:border-orange-400 hover:bg-orange-50'} shadow`}`}>← Назад</motion.button>
            {current < sections.length - 1 ? (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleCurrentChange(current + 1)} className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 via-amber-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-xl transition shadow text-base">Далее →</motion.button>
            ) : !submitted ? (
              isDeadlinePassed ? (
                <div className={`flex-1 px-6 py-3 rounded-xl font-bold text-center border-2 ${darkMode ? 'bg-rose-900/20 text-rose-300 border-rose-700' : 'bg-rose-100 text-rose-700 border-rose-300'}`}> Дедлайн истёк</div>
              ) : (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => submitAnswer()} disabled={isSubmitting} className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 via-amber-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-xl transition shadow disabled:opacity-50 flex items-center justify-center gap-2 text-base">
                  {isSubmitting ? (<><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Отправка...</>) : (<><CheckCircle className="w-5 h-5" /> {submissionId ? "✓ Переотправить" : "✓ Отправить"}</>)}
                </motion.button>
              )
            ) : (
              <div className={`flex-1 flex items-center justify-center border-2 rounded-xl p-4 shadow ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-orange-200'}`}>
                <span className={`text-base font-bold ${textSecondary}`}>✅ Работа проверена • {totalScore}/{maxScore} баллов</span>
              </div>
            )}
          </div>
        )}
        {isPreviewMode && <div className={`border-2 rounded-xl p-4 text-center ${darkMode ? 'bg-blue-900/10 border-blue-700' : 'bg-blue-50 border-blue-200'}`}><p className={`text-sm font-bold ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}> Это режим предпросмотра. Отправка невозможна.</p></div>}
      </main>
    </div>
  );
}

export default function HomeworkPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center"><div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>}>
      <HomeworkView />
    </Suspense>
  );
}