"use client";

import { useState, useEffect, Suspense, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import { getApps, getApp, initializeApp } from "firebase/app";
import {
  getFirestore, doc, getDoc, updateDoc, collection, addDoc, setDoc,
  query, where, onSnapshot, getDocs, increment
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from "firebase/storage";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, CheckCircle, Star, BookOpen, X, Check, RotateCcw,
  Send, Award, Clock, Eye, MessageCircle, Save, AlertTriangle,
  Timer, Paperclip, Download, Moon, Sun, Bell, Users, ChevronLeft,
  ChevronRight, List, Trash2, Table2, Hourglass
} from "lucide-react";
import ReferenceTables from '@/components/ReferenceTables';

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
  order: { label: "По порядку", icon: "📋" },
  match: { label: "Соответствие", icon: "🔗" },
  fill_blanks: { label: "Заполнить пропуски", icon: "✍️" },
  assembly: { label: "Собрать из частей", icon: "🧩" },
  drag_drop: { label: "Перетащить", icon: "🎯" },
  photo: { label: "Фото-задание", icon: "📷" },
};

const AUTO_GRADABLE_TYPES = ['single_choice', 'multi_choice', 'order', 'match', 'fill_blanks', 'assembly', 'drag_drop'];

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

function pluralizeBall(n: number): string {
  const abs = Math.abs(n);
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod100 >= 11 && mod100 <= 14) return `${n} баллов`;
  if (mod10 === 1) return `${n} балл`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} балла`;
  return `${n} баллов`;
}

function formatDisplayText(value: any): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map(item => formatDisplayText(item)).filter(Boolean).join(', ');
  }
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch { return ''; }
  }
  return String(value);
}

function formatAnswerForDisplay(section: any, answer: any): string {
  const type = section?.type || 'text';
  const data = section?.data || section || {};
  if (answer === null || answer === undefined) return '';

  if (type === 'single_choice') {
    const variants = data.variants || [];
    const idx = typeof answer === 'number' ? answer : parseInt(answer, 10);
    if (Number.isInteger(idx) && variants[idx] !== undefined) {
      return `${String.fromCharCode(65 + idx)}. ${variants[idx]}`;
    }
    return formatDisplayText(answer);
  }

  if (type === 'multi_choice') {
    const variants = data.variants || [];
    if (!Array.isArray(answer)) return formatDisplayText(answer);
    return answer
      .filter((i: any) => Number.isInteger(i) && variants[i] !== undefined)
      .map((i: number) => `${String.fromCharCode(65 + i)}. ${variants[i]}`)
      .join('; ');
  }

  if (type === 'order') {
    const items = data.order_items || [];
    if (!Array.isArray(answer)) return formatDisplayText(answer);
    return answer
      .map((origIdx: number, pos: number) => `${pos + 1}. ${items[origIdx] ?? '?'}`)
      .join('\n');
  }

  if (type === 'assembly') {
    const parts = data.assembly_parts || [];
    if (!Array.isArray(answer)) return formatDisplayText(answer);
    return answer.map((idx: number) => parts[idx] ?? '?').join(' → ');
  }

  if (type === 'match') {
    const pairs = data.pairs || [];
    if (!answer || typeof answer !== 'object') return formatDisplayText(answer);
    return Object.keys(answer)
      .map((key) => {
        const i = parseInt(key, 10);
        const left = pairs[i]?.left ?? '?';
        return `${left} → ${answer[key]}`;
      })
      .join('\n');
  }

  if (type === 'drag_drop') {
    const dragItems = data.drag_items || [];
    if (!answer || typeof answer !== 'object') return formatDisplayText(answer);
    return Object.keys(answer)
      .map((key) => {
        const i = parseInt(key, 10);
        const item = dragItems[i]?.item ?? '?';
        return `${item} → ${answer[key]}`;
      })
      .join('\n');
  }

  return formatDisplayText(answer);
}

function getGradedBreakdown(section: any, answer: any): { label: string; correct: boolean; correctLabel?: string }[] | null {
  const type = section?.type || 'text';
  const data = section?.data || section || {};

  if (type === 'single_choice') {
    const variants = data.variants || [];
    const correctIdx = Array.isArray(data.correct_indices) ? data.correct_indices[0] : undefined;
    const chosenIdx = typeof answer === 'number' ? answer : parseInt(answer, 10);
    if (!Number.isInteger(chosenIdx) || variants[chosenIdx] === undefined) return null;
    const isCorrect = chosenIdx === correctIdx;
    return [{
      label: `${String.fromCharCode(65 + chosenIdx)}. ${variants[chosenIdx]}`,
      correct: isCorrect,
      correctLabel: (!isCorrect && correctIdx !== undefined && variants[correctIdx] !== undefined)
        ? `${String.fromCharCode(65 + correctIdx)}. ${variants[correctIdx]}` : undefined
    }];
  }

  if (type === 'multi_choice') {
    const variants = data.variants || [];
    const correctSet = new Set(data.correct_indices || []);
    if (!Array.isArray(answer)) return null;
    return answer
      .filter((i: any) => Number.isInteger(i) && variants[i] !== undefined)
      .map((i: number) => ({ label: `${String.fromCharCode(65 + i)}. ${variants[i]}`, correct: correctSet.has(i) }));
  }

  if (type === 'order') {
    const items = data.order_items || [];
    if (!Array.isArray(answer)) return null;
    return answer.map((origIdx: number, pos: number) => ({
      label: `${pos + 1}. ${items[origIdx] ?? '?'}`,
      correct: origIdx === pos
    }));
  }

  if (type === 'assembly') {
    const parts = data.assembly_parts || [];
    if (!Array.isArray(answer)) return null;
    return answer.map((idx: number, pos: number) => ({ label: parts[idx] ?? '?', correct: idx === pos }));
  }

  if (type === 'match') {
    const pairs = data.pairs || [];
    if (!answer || typeof answer !== 'object') return null;
    return Object.keys(answer).map((key) => {
      const i = parseInt(key, 10);
      const left = pairs[i]?.left ?? '?';
      const chosenRight = answer[key];
      const correctRight = pairs[i]?.right;
      const isCorrect = chosenRight === correctRight;
      return { label: `${left} → ${chosenRight}`, correct: isCorrect, correctLabel: !isCorrect ? `${left} → ${correctRight}` : undefined };
    });
  }

  if (type === 'drag_drop') {
    const dragItems = data.drag_items || [];
    if (!answer || typeof answer !== 'object') return null;
    return Object.keys(answer).map((key) => {
      const i = parseInt(key, 10);
      const item = dragItems[i]?.item ?? '?';
      const chosenTarget = answer[key];
      const correctTarget = dragItems[i]?.target;
      const isCorrect = chosenTarget === correctTarget;
      return { label: `${item} → ${chosenTarget}`, correct: isCorrect, correctLabel: !isCorrect ? `${item} → ${correctTarget}` : undefined };
    });
  }

  return null;
}

function hasMeaningfulContent(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return true;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return Boolean(value);
}

// ИСПРАВЛЕНО: та же группа багов, что и в ChemistryEditor банка заданий —
// пропущенные индексы и оторванные знаки зарядов/степеней окисления.
// Наборы приведены к единому виду с версией из библиотеки заданий.
const SUBSCRIPTS = ['₁','₂','₃','₄','₅','₆','₇','₈','₉','₀'];
const CHARGES = ['⁵⁻','⁴⁻','³⁻','²⁻','¹⁻','¹⁺','²⁺','³⁺','⁴⁺','⁵⁺','⁶⁺','⁷⁺'];
const OXIDATION = ['⁻⁵','⁻⁴','⁻³','⁻²','⁻¹','⁰','⁺¹','⁺²','⁺³','⁺⁴','⁺⁵','⁺⁶','⁺⁷'];
const SIGNS = ['→','←','⇄','⇌','↑','↓','+','=','t°','°C'];

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

  const bgInput = darkMode ? 'bg-[#2A2420] border-[#3D2817] text-[#F5E6D3]' : 'bg-white border-[#E8DCC8] text-[#3D2817]';
  const bgPopup = darkMode ? 'bg-[#2A2420] border-[#2A2420]' : 'bg-white border-[#E8DCC8]';
  const textLabel = darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]';

  return (
    <div className="relative flex gap-2">
      <textarea ref={textareaRef} value={safeValue} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} className={`flex-1 px-3 py-2 border-2 rounded-xl focus:border-[#C67B4B] focus:outline-none resize-none text-sm ${bgInput}`} />
      <div className="relative" ref={popupRef}>
        <button type="button" onClick={() => setShowPopup(!showPopup)} className="h-full px-3 bg-gradient-to-r from-[#C67B4B] to-[#8B3A3A] text-white rounded-xl hover:from-[#A86535] hover:to-[#7A2F2F] transition shadow-md text-lg active:scale-95">🧪</button>
        {showPopup && (
          <div className={`fixed right-4 bottom-4 w-64 rounded-xl shadow-2xl border-2 p-3 z-[100] max-h-[400px] overflow-y-auto ${bgPopup}`}>
            <div className="space-y-2">
              <div><p className={`text-xs font-bold ${textLabel} mb-1`}>Индексы:</p><div className="flex flex-wrap gap-1">{SUBSCRIPTS.map(s => (<button key={s} type="button" onClick={() => insertSymbol(s)} className={`px-2 py-1 rounded text-xs active:scale-90 transition ${darkMode ? 'bg-[#2A2420] hover:bg-[#3D2817] text-[#DCC7AA]' : 'bg-[#FAF3E8] hover:bg-[#F5E4D5] text-[#6B4520]'}`}>{s}</button>))}</div></div>
              <div><p className={`text-xs font-bold ${textLabel} mb-1`}>Заряды:</p><div className="flex flex-wrap gap-1">{CHARGES.map(s => (<button key={s} type="button" onClick={() => insertSymbol(s)} className={`px-2 py-1 rounded text-xs active:scale-90 transition ${darkMode ? 'bg-[#2A2420] hover:bg-[#3D2817] text-[#D98F8F]' : 'bg-[#F5DEDA] hover:bg-[#F5DEDA] text-[#5A2424]'}`}>{s}</button>))}</div></div>
              <div><p className={`text-xs font-bold ${textLabel} mb-1`}>Степени:</p><div className="flex flex-wrap gap-1">{OXIDATION.map(s => (<button key={s} type="button" onClick={() => insertSymbol(s)} className={`px-2 py-1 rounded text-xs active:scale-90 transition ${darkMode ? 'bg-[#2A2420] hover:bg-[#3D2817] text-[#E0A3A3]' : 'bg-[#F5DEDA] hover:bg-[#F5DEDA] text-[#4A1818]'}`}>{s}</button>))}</div></div>
              <div><p className={`text-xs font-bold ${textLabel} mb-1`}>Знаки:</p><div className="flex flex-wrap gap-1">{SIGNS.map(s => (<button key={s} type="button" onClick={() => insertSymbol(s)} className={`px-2 py-1 rounded text-xs active:scale-90 transition ${darkMode ? 'bg-[#2A2420] hover:bg-[#3D2817] text-[#B8A898]' : 'bg-[#FAF3E8] hover:bg-[#F0E8D8] text-[#6B4E3A]'}`}>{s}</button>))}</div></div>
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

  const textLabel = darkMode ? "text-[#B8A898]" : "text-[#6B4E3A]";
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
          className="px-4 py-2 bg-gradient-to-r from-[#B8860B] to-[#D4A017] text-white rounded-xl font-semibold hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50 text-sm active:scale-95"
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
              className={`relative group rounded-lg overflow-visible border-2 text-left cursor-pointer ${darkMode ? 'border-[#3D2817]' : 'border-[#E8DCC8]'}`}
            >
              <div className="rounded-lg overflow-hidden">
                <img src={attachment.url} alt={attachment.name} className="w-full h-32 object-cover" loading="lazy" />
              </div>
              <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-black/45 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAttachment(index);
                }}
                className="absolute top-2 right-2 z-20 p-1.5 bg-[#8B3A3A] hover:bg-[#7A2F2F] text-white rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
                title="Удалить фото"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <p className={`text-xs p-2 truncate rounded-b-lg ${darkMode ? 'bg-[#2A2420] text-[#B8A898]' : 'bg-[#FAF3E8] text-[#6B4E3A]'}`}>
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
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/90 text-[#6B4E3A] shadow-lg"
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

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function DragDropCards({ dragItems, answer, onChange, readOnly = false, darkMode = false }: any) {
  const items = dragItems.map((d: any) => d.item);
  const slots = dragItems.map((d: any) => d.target);

  const [keyboardSelected, setKeyboardSelected] = useState<number | null>(null);

  const shuffledItemOrder = useMemo(() => {
    return shuffleArray(items.map((_: any, i: number) => i));
  }, [dragItems]);

  const placement: Record<number, number> = {};
  if (answer) {
    Object.keys(answer).forEach((key) => {
      const itemIdx = parseInt(key, 10);
      const targetStr = answer[itemIdx];
      const slotIdx = slots.indexOf(targetStr);
      if (slotIdx !== -1) placement[slotIdx] = itemIdx;
    });
  }

  const placedItemIndices = new Set(Object.values(placement));
  const poolItemIndices = shuffledItemOrder.filter((i: number) => !placedItemIndices.has(i));

  const applyPlacement = (newPlacement: Record<number, number>) => {
    const newAnswer: Record<number, string> = {};
    Object.keys(newPlacement).forEach((slotKey) => {
      const slotIdx = parseInt(slotKey, 10);
      const itemIdx = newPlacement[slotIdx];
      newAnswer[itemIdx] = slots[slotIdx];
    });
    onChange(newAnswer);
  };

  const handlePointerDown = (itemIdx: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (readOnly) return;
    e.preventDefault();
    const chip = e.currentTarget;
    const rect = chip.getBoundingClientRect();

    const floating = chip.cloneNode(true) as HTMLElement;
    floating.style.position = 'fixed';
    floating.style.left = rect.left + 'px';
    floating.style.top = rect.top + 'px';
    floating.style.width = rect.width + 'px';
    floating.style.pointerEvents = 'none';
    floating.style.zIndex = '9999';
    floating.style.opacity = '0.95';
    floating.style.boxShadow = '0 8px 20px rgba(0,0,0,0.25)';
    document.body.appendChild(floating);
    chip.style.opacity = '0.25';

    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const move = (ev: PointerEvent) => {
      floating.style.left = (ev.clientX - offsetX) + 'px';
      floating.style.top = (ev.clientY - offsetY) + 'px';
    };
    const up = (ev: PointerEvent) => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      floating.remove();
      chip.style.opacity = '1';
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const slotEl = el ? (el as HTMLElement).closest('[data-slot]') as HTMLElement | null : null;
      const newPlacement: Record<number, number> = { ...placement };
      Object.keys(newPlacement).forEach((k) => {
        if (newPlacement[parseInt(k, 10)] === itemIdx) delete newPlacement[parseInt(k, 10)];
      });
      if (slotEl) {
        const si = parseInt(slotEl.getAttribute('data-slot') || '-1', 10);
        if (si >= 0) newPlacement[si] = itemIdx;
      }
      applyPlacement(newPlacement);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };

  const handleChipKeyDown = (itemIdx: number) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (readOnly) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setKeyboardSelected(keyboardSelected === itemIdx ? null : itemIdx);
    } else if (e.key === 'Escape') {
      setKeyboardSelected(null);
    }
  };

  const handleSlotKeyDown = (slotIdx: number, occupiedItemIdx: number | undefined) => (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (readOnly) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (keyboardSelected !== null) {
        const newPlacement: Record<number, number> = { ...placement };
        Object.keys(newPlacement).forEach((k) => {
          if (newPlacement[parseInt(k, 10)] === keyboardSelected) delete newPlacement[parseInt(k, 10)];
        });
        newPlacement[slotIdx] = keyboardSelected;
        applyPlacement(newPlacement);
        setKeyboardSelected(null);
      } else if (occupiedItemIdx !== undefined) {
        setKeyboardSelected(occupiedItemIdx);
      }
    } else if (e.key === 'Escape') {
      setKeyboardSelected(null);
    }
  };

  const bg = darkMode ? '#2A2420' : '#fff';
  const poolBg = darkMode ? '#1A1614' : '#fff';
  const borderDefault = darkMode ? '#3D2817' : '#E4DCC8';
  const textColor = darkMode ? '#F5E6D3' : '#3D2817';
  const labelColor = darkMode ? '#B8A898' : '#8A7A65';
  const accentLabelColor = darkMode ? '#D4A017' : '#A8622E';

  const chipStyle = (itemIdx: number): React.CSSProperties => ({
    background: '#D9773F',
    color: '#fff',
    border: keyboardSelected === itemIdx ? '2px solid #3D2817' : '2px solid transparent',
    borderRadius: 9,
    padding: '7px 14px',
    fontSize: 13,
    fontWeight: 700,
    cursor: readOnly ? 'default' : 'grab',
    touchAction: 'none',
    boxShadow: keyboardSelected === itemIdx ? '0 0 0 2px #E8B84D' : 'none',
    whiteSpace: 'nowrap',
  });

  return (
    <div style={{ padding: '4px 0', maxWidth: 440 }}>
      {!readOnly && (
        <div style={{ fontSize: 11, color: labelColor, marginBottom: 10 }}>
          С клавиатуры: Tab до карточки → Enter — взять, Tab до ячейки → Enter — положить.
        </div>
      )}
      <div style={{ fontSize: 11, fontWeight: 700, color: accentLabelColor, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
        Карточки
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 40, background: poolBg, border: `1.5px dashed ${borderDefault}`, borderRadius: 12, padding: 10, marginBottom: 18 }}>
        {poolItemIndices.length === 0 && (
          <span style={{ fontSize: 12, color: labelColor }}>Все карточки размещены</span>
        )}
        {poolItemIndices.map((itemIdx: number) => (
          <button
            key={itemIdx}
            type="button"
            onPointerDown={handlePointerDown(itemIdx)}
            onKeyDown={handleChipKeyDown(itemIdx)}
            aria-pressed={keyboardSelected === itemIdx}
            style={chipStyle(itemIdx)}
          >
            {items[itemIdx]}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: accentLabelColor, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
        Куда относится
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {slots.map((label: string, si: number) => {
          const itemIdx = placement[si];
          return (
            <div
              key={si}
              data-slot={si}
              tabIndex={readOnly ? -1 : 0}
              role="button"
              aria-label={itemIdx !== undefined ? `Ячейка «${label}», сейчас: ${items[itemIdx]}` : `Ячейка «${label}», пусто`}
              onKeyDown={handleSlotKeyDown(si, itemIdx)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 12, padding: '9px 14px',
                borderRadius: 10, border: `1.5px solid ${borderDefault}`, borderLeft: `4px solid #D9773F`,
                background: bg, outline: 'none', width: 'fit-content', minWidth: 160
              }}
            >
              <span style={{ fontSize: 13, color: textColor, fontWeight: 600, minWidth: 24 }}>{label}</span>
              {itemIdx !== undefined ? (
                <button
                  type="button"
                  onPointerDown={handlePointerDown(itemIdx)}
                  onKeyDown={handleChipKeyDown(itemIdx)}
                  aria-pressed={keyboardSelected === itemIdx}
                  style={chipStyle(itemIdx)}
                >
                  {items[itemIdx]}
                </button>
              ) : (
                <span style={{ fontSize: 12, color: labelColor, fontStyle: 'italic' }}>пусто</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderableList({ items, answer, onChange, readOnly = false, darkMode = false }: any) {
  const initialOrder = useMemo(() => {
    return shuffleArray(items.map((_: any, i: number) => i));
  }, [items]);

  useEffect(() => {
    if (!Array.isArray(answer) || answer.length !== items.length) {
      onChange(initialOrder);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const order: number[] = Array.isArray(answer) && answer.length === items.length ? answer : initialOrder;

  const move = (pos: number, dir: -1 | 1) => {
    if (readOnly) return;
    const target = pos + dir;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    const tmp = next[pos]; next[pos] = next[target]; next[target] = tmp;
    onChange(next);
  };

  const bg = darkMode ? '#2A2420' : '#fff';
  const border = darkMode ? '#3D2817' : '#E8DCC8';
  const textColor = darkMode ? '#F5E6D3' : '#3D2817';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {order.map((origIdx, pos) => (
        <div key={origIdx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, border: `2px solid ${border}`, background: bg }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg,#C67B4B,#B8860B)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {pos + 1}
          </div>
          <span style={{ flex: 1, fontSize: 14, color: textColor, fontWeight: 500 }}>{items[origIdx]}</span>
          {!readOnly && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <button type="button" aria-label="Переместить выше" onClick={() => move(pos, -1)} disabled={pos === 0} style={{ width: 22, height: 18, border: 'none', borderRadius: 4, background: pos === 0 ? (darkMode ? '#3D2817' : '#E8DCC8') : '#C67B4B', color: '#fff', fontSize: 10, cursor: pos === 0 ? 'default' : 'pointer' }}>▲</button>
              <button type="button" aria-label="Переместить ниже" onClick={() => move(pos, 1)} disabled={pos === order.length - 1} style={{ width: 22, height: 18, border: 'none', borderRadius: 4, background: pos === order.length - 1 ? (darkMode ? '#3D2817' : '#E8DCC8') : '#C67B4B', color: '#fff', fontSize: 10, cursor: pos === order.length - 1 ? 'default' : 'pointer' }}>▼</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AssemblyPicker({ assemblyParts, answer, onChange, readOnly = false, darkMode = false }: any) {
  const shuffledOrder = useMemo(() => {
    return shuffleArray(assemblyParts.map((_: any, i: number) => i));
  }, [assemblyParts]);

  const selected: number[] = Array.isArray(answer) ? answer : [];

  const toggle = (i: number) => {
    if (readOnly) return;
    if (selected.includes(i)) {
      onChange(selected.filter((x: number) => x !== i));
    } else {
      onChange([...selected, i]);
    }
  };

  const bg = darkMode ? '#2A2420' : '#fff';
  const poolBg = darkMode ? '#1A1614' : '#FAF3E8';
  const border = darkMode ? '#3D2817' : '#E8DCC8';
  const textColor = darkMode ? '#F5E6D3' : '#3D2817';
  const mutedColor = darkMode ? '#B8A898' : '#6B4E3A';

  return (
    <div>
      <div style={{ minHeight: 44, background: poolBg, border: `2px dashed ${border}`, borderRadius: 12, padding: 10, marginBottom: 12, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {selected.length === 0 ? (
          <span style={{ fontSize: 12, color: mutedColor }}>Твой ответ соберётся здесь по мере клика</span>
        ) : (
          selected.map((idx: number, pos: number) => (
            <span key={pos} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '4px 10px', fontSize: 13, color: textColor, fontWeight: 600 }}>
              {assemblyParts[idx]}
            </span>
          ))
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {shuffledOrder.map((i: number) => {
          const isSelected = selected.includes(i);
          return (
            <button
              key={i}
              type="button"
              disabled={readOnly}
              onClick={() => toggle(i)}
              style={{
                background: isSelected ? 'linear-gradient(135deg,#C67B4B,#B8860B)' : bg,
                color: isSelected ? '#fff' : textColor,
                border: `2px solid ${isSelected ? 'transparent' : border}`,
                borderRadius: 10, padding: '9px 16px', fontSize: 14, fontWeight: 600,
                cursor: readOnly ? 'default' : 'pointer', opacity: isSelected ? 0.55 : 1
              }}
            >
              {assemblyParts[i]}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && !readOnly && (
        <button type="button" onClick={() => onChange([])} style={{ marginTop: 10, fontSize: 12, color: mutedColor, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
          Очистить
        </button>
      )}
    </div>
  );
}

function MatchConnector({ pairs, answer, onChange, readOnly = false, darkMode = false }: any) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const leftRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const rightRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tempLineRef = useRef<SVGLineElement | null>(null);
  const draggingFrom = useRef<number | null>(null);

  const [keyboardSelected, setKeyboardSelected] = useState<number | null>(null);

  const shuffledRight = useMemo(() => {
    return shuffleArray(pairs.map((p: any) => p.right));
  }, [pairs]);

  const connections: Record<number, string> = answer || {};

  const dotCenter = (el: HTMLElement | null) => {
    if (!el || !svgRef.current) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    const sr = svgRef.current.getBoundingClientRect();
    return { x: r.left + r.width / 2 - sr.left, y: r.top + r.height / 2 - sr.top };
  };

  const svgPoint = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const sr = svgRef.current.getBoundingClientRect();
    return { x: clientX - sr.left, y: clientY - sr.top };
  };

  const redraw = () => {
    const svg = svgRef.current;
    if (!svg) return;
    Array.from(svg.querySelectorAll('.perm-line')).forEach((l) => l.remove());
    Object.keys(connections).forEach((key) => {
      const li = parseInt(key, 10);
      const rightVal = connections[li];
      const ri = shuffledRight.indexOf(rightVal);
      if (ri === -1) return;
      const p1 = dotCenter(leftRefs.current[li]);
      const p2 = dotCenter(rightRefs.current[ri]);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('class', 'perm-line');
      line.setAttribute('x1', String(p1.x));
      line.setAttribute('y1', String(p1.y));
      line.setAttribute('x2', String(p2.x));
      line.setAttribute('y2', String(p2.y));
      line.setAttribute('stroke', '#C67B4B');
      line.setAttribute('stroke-width', '3');
      line.setAttribute('stroke-linecap', 'round');
      svg.appendChild(line);
    });
  };

  useEffect(() => { redraw(); });
  useEffect(() => {
    const onResize = () => redraw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const cleanupTemp = () => {
    if (tempLineRef.current) { tempLineRef.current.remove(); tempLineRef.current = null; }
    draggingFrom.current = null;
    leftRefs.current.forEach((d) => { if (d) d.style.background = darkMode ? '#2A2420' : '#fff'; });
  };

  const connectTo = (leftIdx: number, rightVal: string) => {
    const newConnections: Record<number, string> = { ...connections };
    Object.keys(newConnections).forEach((k) => {
      const idx = parseInt(k, 10);
      if (newConnections[idx] === rightVal && idx !== leftIdx) delete newConnections[idx];
    });
    newConnections[leftIdx] = rightVal;
    onChange(newConnections);
  };

  const handlePointerDown = (i: number) => (e: React.PointerEvent) => {
    if (readOnly) return;
    e.preventDefault();
    draggingFrom.current = i;
    const dot = leftRefs.current[i];
    const svg = svgRef.current;
    if (!dot || !svg) return;
    try { dot.setPointerCapture(e.pointerId); } catch (err) {}
    dot.style.background = '#C67B4B';
    const p1 = dotCenter(dot);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(p1.x)); line.setAttribute('y1', String(p1.y));
    line.setAttribute('x2', String(p1.x)); line.setAttribute('y2', String(p1.y));
    line.setAttribute('stroke', '#C67B4B');
    line.setAttribute('stroke-width', '3');
    line.setAttribute('stroke-dasharray', '6 4');
    line.setAttribute('stroke-linecap', 'round');
    svg.appendChild(line);
    tempLineRef.current = line;
  };

  const handlePointerMove = (i: number) => (e: React.PointerEvent) => {
    if (draggingFrom.current !== i || !tempLineRef.current) return;
    const p = svgPoint(e.clientX, e.clientY);
    tempLineRef.current.setAttribute('x2', String(p.x));
    tempLineRef.current.setAttribute('y2', String(p.y));
  };

  const handlePointerUp = (i: number) => (e: React.PointerEvent) => {
    if (draggingFrom.current !== i) return;
    const clientX = e.clientX, clientY = e.clientY;
    const elAtPoint = document.elementFromPoint(clientX, clientY);
    let hitIndex: number | null = null;
    rightRefs.current.forEach((rd, ri) => { if (rd === elAtPoint) hitIndex = ri; });
    if (hitIndex === null) {
      let best: number | null = null, bestDist = 34;
      rightRefs.current.forEach((rd, ri) => {
        const c = dotCenter(rd);
        const p = svgPoint(clientX, clientY);
        const dist = Math.hypot(c.x - p.x, c.y - p.y);
        if (dist < bestDist) { bestDist = dist; best = ri; }
      });
      hitIndex = best;
    }
    if (hitIndex !== null) connectTo(i, shuffledRight[hitIndex]);
    cleanupTemp();
  };

  const handleLeftKeyDown = (i: number) => (e: React.KeyboardEvent) => {
    if (readOnly) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setKeyboardSelected(keyboardSelected === i ? null : i);
    } else if (e.key === 'Escape') {
      setKeyboardSelected(null);
    }
  };

  const handleRightKeyDown = (ri: number) => (e: React.KeyboardEvent) => {
    if (readOnly) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (keyboardSelected === null) return;
      connectTo(keyboardSelected, shuffledRight[ri]);
      setKeyboardSelected(null);
    } else if (e.key === 'Escape') {
      setKeyboardSelected(null);
    }
  };

  const bg = darkMode ? '#2A2420' : '#fff';
  const textColor = darkMode ? '#F5E6D3' : '#3D2817';
  const labelColor = darkMode ? '#B8A898' : '#6B4E3A';

  return (
    <div style={{ position: 'relative', padding: '20px 4px', userSelect: 'none', maxWidth: 420 }}>
      {!readOnly && (
        <div style={{ fontSize: 11, color: labelColor, marginBottom: 12 }}>
          С клавиатуры: Tab до точки слева → Enter — выбрать, Tab до точки справа → Enter — соединить.
        </div>
      )}
      <svg ref={svgRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {pairs.map((p: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 14, color: textColor, fontWeight: 500 }}>{p.left}</span>
              <button
                type="button"
                ref={(el) => { leftRefs.current[i] = el; }}
                onPointerDown={handlePointerDown(i)}
                onPointerMove={handlePointerMove(i)}
                onPointerUp={handlePointerUp(i)}
                onPointerCancel={cleanupTemp}
                onKeyDown={handleLeftKeyDown(i)}
                aria-label={`Точка: ${p.left}`}
                aria-pressed={keyboardSelected === i}
                style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: keyboardSelected === i ? '2px solid #3D2817' : '2px solid #C67B4B',
                  background: keyboardSelected === i ? '#C67B4B' : bg,
                  cursor: readOnly ? 'default' : 'grab', padding: 0, flexShrink: 0,
                  touchAction: 'none', boxShadow: keyboardSelected === i ? '0 0 0 2px #B8860B' : 'none'
                }}
              />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {shuffledRight.map((rightVal: string, ri: number) => (
            <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                ref={(el) => { rightRefs.current[ri] = el; }}
                onKeyDown={handleRightKeyDown(ri)}
                aria-label={`Точка: ${rightVal}`}
                style={{
                  width: 20, height: 20, borderRadius: '50%', border: '2px solid #B8860B',
                  background: bg, padding: 0, flexShrink: 0, cursor: readOnly ? 'default' : 'pointer'
                }}
              />
              <span style={{ fontSize: 14, color: textColor, fontWeight: 500 }}>{rightVal}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuestionCard({ section, answer, onChange, studentComment, onCommentChange, showComment = true, isStudent = false, attachment, onAttachmentChange, studentId, darkMode = false, readOnly = false }: any) {
  const type = typeof section?.type === 'string' ? section.type : 'text';
  const typeInfo = TASK_TYPES[type] || TASK_TYPES.text;
  const data = section?.data || section || {};

  const bgCard = darkMode ? 'bg-[#2A2420] border-[#2A2420]' : 'bg-white border-[#F5E4D5]';
  const bgHeader = darkMode ? 'bg-[#2A2420] border-[#3D2817]' : 'bg-gradient-to-r from-[#FAF3E8] to-[#F6ECCF] border-[#F5E4D5]';
  const bgTask = darkMode ? 'bg-[#2A2420] border-[#8B5A2E]' : 'bg-gradient-to-br from-[#FAF3E8] to-[#F6ECCF] border-[#D18F5C]';
  const bgInput = darkMode ? 'bg-[#2A2420] border-[#3D2817] text-[#F5E6D3]' : 'bg-white border-[#E8DCC8] text-[#3D2817]';
  const bgOption = darkMode ? 'bg-[#2A2420] border-[#3D2817] hover:border-[#D18F5C]' : 'bg-white border-[#F5E4D5] hover:border-[#DCC7AA]';
  const bgOptionSelected = darkMode ? 'border-[#C67B4B] bg-[#3D2817]/20' : 'border-[#C67B4B] bg-[#FAF3E8]';
  const textPrimary = darkMode ? 'text-[#F5E6D3]' : 'text-[#3D2817]';
  const textSecondary = darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]';
  const textMuted = darkMode ? 'text-[#8A7A6A]' : 'text-[#6B4E3A]';
  const textAccent = darkMode ? 'text-[#DCC7AA]' : 'text-[#8B5A2E]';
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
          <span className="px-3 py-1.5 bg-gradient-to-r from-[#C67B4B] to-[#8B3A3A] text-white rounded-lg text-xs font-semibold shadow-sm">{typeInfo.icon} {typeInfo.label}</span>
          <span className="px-3 py-1.5 bg-gradient-to-r from-[#B8860B] to-[#B8860B] text-white rounded-lg text-xs font-semibold shadow-sm">⭐ {pluralizeBall(section.max_score || 1)}</span>
          {readOnly && <span className="px-3 py-1.5 bg-gradient-to-r from-[#B8860B] to-[#D4A017] text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1"><Hourglass className="w-3 h-3" /> Ожидает проверки</span>}
        </div>
      </div>
      <div className="p-6 space-y-6">
        {data?.image_url && (
          <div className={`rounded-xl p-4 border-2 ${darkMode ? 'bg-[#2A2420] border-[#8B5A2E]' : 'bg-gradient-to-br from-[#FAF3E8] to-[#F6ECCF] border-[#E8DCC8]'}`}>
            <img src={data.image_url} alt="Задание" className="max-w-full max-h-80 rounded-lg mx-auto" loading="lazy" />
          </div>
        )}
        {taskText && (
          <div className={`rounded-xl p-5 border-l-4 ${bgTask}`}>
            <p className={`text-xs font-semibold ${textAccent} mb-2 uppercase tracking-wide`}>Условие</p>
            <p className={`text-base leading-relaxed whitespace-pre-wrap ${darkMode ? 'text-[#E8DCC8]' : 'text-[#6B4E3A]'}`}>{taskText}</p>
          </div>
        )}

        {(type === "text" || type === "photo") && (
          <div className="space-y-3">
            <label className={`block text-sm font-semibold ${textSecondary}`}>{readOnly ? 'Ваш ответ' : 'Ваш ответ'}</label>
            <textarea value={currentAnswer} onChange={(e) => !readOnly && onChange(e.target.value)} readOnly={readOnly} rows={4} placeholder={readOnly ? '' : "Введите ваш ответ..."} className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-[#C67B4B]/20 focus:border-[#C67B4B] focus:outline-none resize-none transition-all text-base ${bgInput} ${readOnly ? 'opacity-90 cursor-default' : ''}`} />
            {isStudent && !readOnly && <StudentFileUploader value={attachment} onChange={onAttachmentChange} studentId={studentId} sectionId={section.id} darkMode={darkMode} />}
          </div>
        )}

        {(type === "single_choice" || type === "multi_choice") && variants.length > 0 && (
          <div className="space-y-3">
            <p className={`font-semibold ${textSecondary}`}>{type === "single_choice" ? "Выберите один вариант:" : "Выберите правильные ответы:"}</p>
            <div className="space-y-2">
              {variants.map((opt: string, oi: number) => {
                const isSelected = type === "single_choice" ? answer === oi : (Array.isArray(answer) ? answer.includes(oi) : false);
                return (
                  <motion.label key={oi} whileHover={readOnly ? {} : { scale: 1.01 }} whileTap={readOnly ? {} : { scale: 0.99 }} className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${readOnly ? '' : 'cursor-pointer'} ${isSelected ? bgOptionSelected : bgOption}`}>
                    <input type={type === "single_choice" ? "radio" : "checkbox"} checked={isSelected} disabled={readOnly} onChange={() => { if (readOnly) return; if (type === "single_choice") onChange(oi); else { const current = Array.isArray(answer) ? answer : []; onChange(current.includes(oi) ? current.filter((x: number) => x !== oi) : [...current, oi]); } }} className="w-5 h-5 text-[#A86535] border-[#DCC7AA] focus:ring-[#C67B4B]" />
                    <span className={`text-base font-medium ${textSecondary}`}>{String.fromCharCode(65 + oi)}. {opt}</span>
                  </motion.label>
                );
              })}
            </div>
          </div>
        )}

        {type === "order" && orderItems.length > 0 && (
          <div className="space-y-3">
            <p className={`font-semibold ${textSecondary}`}>Расставь элементы в правильном порядке (стрелками):</p>
            <OrderableList items={orderItems} answer={answer} onChange={onChange} readOnly={readOnly} darkMode={darkMode} />
          </div>
        )}

        {type === "match" && pairs.length > 0 && (
          <div className="space-y-3">
            <p className={`font-semibold ${textSecondary}`}>Соедините пары линией — нажми на точку слева и потяни к нужной точке справа:</p>
            <MatchConnector pairs={pairs} answer={answer} onChange={onChange} readOnly={readOnly} darkMode={darkMode} />
          </div>
        )}

        {type === "fill_blanks" && (
          <div className="space-y-3">
            <p className={`font-semibold ${textSecondary}`}>Заполните пропуски (___):</p>
            {data?.blanks_text && (
              <div className={`rounded-xl p-5 border-l-4 ${bgTask}`}>
                <p className={`text-base leading-relaxed whitespace-pre-wrap ${darkMode ? 'text-[#E8DCC8]' : 'text-[#6B4E3A]'}`}>{data.blanks_text}</p>
              </div>
            )}
            <div>
              <label className={`block text-sm font-semibold ${textSecondary} mb-2`}>Ваши ответы (через запятую):</label>
              <input type="text" value={typeof answer === 'string' ? answer : ''} readOnly={readOnly} onChange={(e) => { if (readOnly) return; onChange(e.target.value); }} placeholder={readOnly ? '' : "ответ1, ответ2, ответ3"} className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-[#C67B4B]/20 focus:border-[#C67B4B] focus:outline-none text-base ${bgInput}`} />
            </div>
          </div>
        )}

        {type === "assembly" && assemblyParts.length > 0 && (
          <div className="space-y-3">
            <p className={`font-semibold ${textSecondary}`}>Соберите правильный ответ из частей — жми по кусочкам в нужном порядке:</p>
            <AssemblyPicker assemblyParts={assemblyParts} answer={answer} onChange={onChange} readOnly={readOnly} darkMode={darkMode} />
          </div>
        )}

        {type === "drag_drop" && dragItems.length > 0 && (
          <div className="space-y-3">
            <p className={`font-semibold ${textSecondary}`}>Перетащи карточку в нужную ячейку:</p>
            <DragDropCards dragItems={dragItems} answer={answer} onChange={onChange} readOnly={readOnly} darkMode={darkMode} />
          </div>
        )}

        {showComment && !readOnly && (
          <div className={`border-t-2 pt-4 ${darkMode ? 'border-[#2A2420]' : 'border-[#F5E4D5]'}`}>
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className={`w-4 h-4 ${darkMode ? 'text-[#D2A954]' : 'text-[#96690A]'}`} />
              <label className={`text-sm font-semibold ${textSecondary}`}>Вопрос учителю (необязательно)</label>
            </div>
            <textarea value={studentComment || ''} onChange={(e) => onCommentChange && onCommentChange(e.target.value)} placeholder="Если что-то непонятно — напишите здесь..." rows={2} className={`w-full px-3 py-2 border-2 rounded-xl focus:border-[#B8860B] focus:outline-none resize-none text-sm ${darkMode ? 'bg-[#4A3405]/10 border-[#3D2817] text-[#F5E6D3]' : 'bg-[#F6ECCF]/30 border-[#EAD9A8] text-[#3D2817]'}`} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ResultCard({ section, answer, score, maxScore, comment, conversionScale, studentComment, teacherReply, attachment, darkMode = false, pendingReview = false }: any) {
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

  const bgCard = darkMode ? 'bg-[#2A2420] border-[#2A2420]' : 'bg-white border-[#F5E4D5]';
  const bgHeader = pendingReview
    ? (darkMode ? 'bg-[#4A3405]/20 border-[#7A5608]' : 'bg-[#F6ECCF] border-[#EAD9A8]')
    : isCorrect ? (darkMode ? 'bg-[#2A2E26]/20 border-[#4A4F42]' : 'bg-[#DCEBD2] border-[#A9C596]') : (darkMode ? 'bg-[#3D1515]/20 border-[#6B2626]' : 'bg-[#F5DEDA] border-[#ECC2C2]');
  const bgTask = darkMode ? 'bg-[#2A2420] border-[#8B5A2E]' : 'bg-[#FAF3E8] border-[#D18F5C]';
  const bgAnswer = pendingReview
    ? (darkMode ? 'bg-[#4A3405]/10 border-[#7A5608]' : 'bg-[#F6ECCF] border-[#EAD9A8]')
    : isCorrect ? (darkMode ? 'bg-[#2A2E26]/10 border-[#4A4F42]' : 'bg-[#DCEBD2] border-[#A9C596]') : (darkMode ? 'bg-[#3D1515]/10 border-[#6B2626]' : 'bg-[#F5DEDA] border-[#ECC2C2]');
  const bgCorrect = darkMode ? 'bg-[#2A2E26]/10 border-[#4A4F42]' : 'bg-[#DCEBD2] border-[#A9C596]';
  const bgComment = darkMode ? 'bg-[#4A3405]/10 border-[#7A5608]' : 'bg-[#F6ECCF] border-[#EAD9A8]';
  const bgQuestion = darkMode ? 'bg-[#2E1A1E]/10 border-[#5A333A]' : 'bg-[#F0E3E5] border-[#DFC3C8]';
  const bgScore = darkMode ? 'bg-[#2A2420] border-[#3D2817]' : 'bg-[#FAF3E8] border-[#E8DCC8]';
  const bgTest = darkMode ? 'bg-[#2E1A1E]/10 border-[#5A333A]' : 'bg-[#F0E3E5] border-[#DFC3C8]';
  const textPrimary = darkMode ? 'text-[#F5E6D3]' : 'text-[#3D2817]';
  const textSecondary = darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]';
  const textMuted = darkMode ? 'text-[#8A7A6A]' : 'text-[#6B4E3A]';
  const textAccent = darkMode ? 'text-[#DCC7AA]' : 'text-[#8B5A2E]';
  const sectionTitle = formatDisplayText(section.title || 'Задание');
  const answerText = formatAnswerForDisplay(section, answer);
  const gradedBreakdown = !pendingReview ? getGradedBreakdown(section, answer) : null;
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
          {pendingReview ? (
            <div className="px-4 py-2 rounded-xl font-bold bg-gradient-to-r from-[#B8860B] to-[#D4A017] text-white flex items-center gap-1"><Hourglass className="w-4 h-4" /> На проверке</div>
          ) : (
            <div className={`px-4 py-2 rounded-xl font-bold ${isCorrect ? 'bg-gradient-to-r from-[#6B705C] to-[#5F7A66] text-white' : 'bg-gradient-to-r from-[#8B3A3A] to-[#8B3A3A] text-white'}`}>{score}/{maxScore}</div>
          )}
        </div>
      </div>
      <div className="p-6 space-y-4">
        {(data.task_text || data.text) && (
          <div className={`rounded-xl p-5 border-l-4 ${bgTask}`}>
            <p className={`text-xs font-semibold ${textAccent} mb-2 uppercase tracking-wide`}>Условие</p>
            <p className={`text-base leading-relaxed whitespace-pre-wrap ${darkMode ? 'text-[#E8DCC8]' : 'text-[#6B4E3A]'}`}>{formatDisplayText(data.task_text || data.text)}</p>
          </div>
        )}
        <div>
          <p className={`text-sm font-semibold ${textMuted} mb-2`}>Ваш ответ:</p>
          {gradedBreakdown ? (
            <div className="space-y-2">
              {gradedBreakdown.map((row, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg p-3 border-2 flex items-center justify-between gap-3 ${
                    row.correct
                      ? (darkMode ? 'bg-[#2A2E26]/20 border-[#4A4F42]' : 'bg-[#DCEBD2] border-[#A9C596]')
                      : (darkMode ? 'bg-[#3D1515]/20 border-[#6B2626]' : 'bg-[#F5DEDA] border-[#ECC2C2]')
                  }`}
                >
                  <span className={`text-sm font-medium ${textPrimary}`}>{row.label}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {row.correct ? (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${darkMode ? 'bg-[#4A4F42] text-[#DCEBD2]' : 'bg-[#6B705C] text-white'}`}>✓ верно</span>
                    ) : (
                      <>
                        {row.correctLabel && (
                          <span className={`text-xs italic ${textMuted}`}>верно: {row.correctLabel}</span>
                        )}
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${darkMode ? 'bg-[#6B2626] text-[#F5DEDA]' : 'bg-[#8B3A3A] text-white'}`}>✗</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`rounded-xl p-4 border-2 ${bgAnswer}`}>
              <p className={`text-base whitespace-pre-wrap ${textPrimary}`}>{answerText || <span className="italic opacity-60">Текстового ответа нет</span>}</p>
            </div>
          )}
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
                    className="rounded-lg overflow-hidden border-2 border-[#E8DCC8] text-left cursor-pointer"
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
        {!pendingReview && (data.correct_answer) && (
          <div>
            <p className={`text-sm font-semibold ${darkMode ? 'text-[#B7C4A0]' : 'text-[#4A4F42]'} mb-2`}>✓ Правильный ответ:</p>
            <div className={`rounded-xl p-4 border-2 ${bgCorrect}`}>
              <p className={`text-base whitespace-pre-wrap font-medium ${textPrimary}`}>{correctAnswerText}</p>
            </div>
          </div>
        )}
        {!pendingReview && comment && (
          <div>
            <p className={`text-sm font-semibold ${darkMode ? 'text-[#DEC17E]' : 'text-[#7A5608]'} mb-2`}>💬 Комментарий учителя:</p>
            <div className={`rounded-xl p-4 border-2 ${bgComment}`}>
              <p className={`text-base whitespace-pre-wrap ${textPrimary}`}>{teacherCommentText}</p>
            </div>
          </div>
        )}
        {studentComment && (
          <div>
            <p className={`text-sm font-semibold ${darkMode ? 'text-[#CBA0A8]' : 'text-[#5A333A]'} mb-2`}>❓ Ваш вопрос:</p>
            <div className={`rounded-xl p-4 border-2 ${bgQuestion}`}>
              <p className={`text-base whitespace-pre-wrap ${textPrimary}`}>{studentQuestionText}</p>
              {teacherReply && (
                <div className={`mt-3 pt-3 border-t-2 ${darkMode ? 'border-[#5A333A]' : 'border-[#DFC3C8]'}`}>
                  <p className={`text-xs font-bold ${darkMode ? 'text-[#B7C4A0]' : 'text-[#4A4F42]'} mb-1`}>✅ Ответ учителя:</p>
                  <p className={`text-sm whitespace-pre-wrap ${textPrimary}`}>{teacherReplyText}</p>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="space-y-3">
          {pendingReview ? (
            <div className={`flex items-center gap-2 rounded-xl p-4 border-2 ${darkMode ? 'bg-[#4A3405]/10 border-[#7A5608]' : 'bg-[#F6ECCF] border-[#EAD9A8]'}`}>
              <Hourglass className="w-6 h-6 text-[#B8860B]" />
              <span className={`text-base font-bold ${darkMode ? 'text-[#DEC17E]' : 'text-[#7A5608]'}`}>Баллы выставит преподаватель после проверки</span>
            </div>
          ) : (
            <>
              <div className={`flex items-center gap-2 rounded-xl p-4 border-2 ${bgScore}`}>
                <Star className="w-6 h-6 text-[#B8860B] fill-[#B8860B]" />
                <span className={`text-xl font-bold ${textAccent}`}>{score} / {maxScore} первичных баллов</span>
              </div>
              {testScore !== null && maxTestScore !== null && (
                <div className={`flex items-center gap-2 rounded-xl p-4 border-2 ${bgTest}`}>
                  <Award className="w-6 h-6 text-[#7A4A52] fill-[#7A4A52]" />
                  <span className={`text-xl font-bold ${darkMode ? 'text-[#CBA0A8]' : 'text-[#5A333A]'}`}>{testScore} / {maxTestScore} тестовых баллов</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {previewImage && (
        <div className="fixed inset-0 z-[70] bg-black/85 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/90 text-[#6B4E3A] shadow-lg"
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

function calcScore(section: any, answer: any, hasAttachment: boolean = false): number {
  if (!answer && !hasAttachment) return 0;
  const type = section.type || 'text';
  const maxScore = section.max_score || 1;
  const data = section.data || section;

  if (type === 'text' || type === 'photo') {
    const ua = normalizeText(typeof answer === 'string' ? answer : '');

    if (type === 'photo' && hasAttachment && !data.correct_answer) {
      return 0;
    }

    if (!ua) return 0;
    const ca = normalizeText(data.correct_answer || '');
    if (ca && ua === ca) return maxScore;
    // ИСПРАВЛЕНО: поле называется alt_answers (совпадает с банком заданий
    // и с редактором ДЗ), а не alt_answers/alt_answer вперемешку — теперь
    // альтернативные ответы реально засчитываются.
    if (data.alt_answers && Array.isArray(data.alt_answers)) { for (const alt of data.alt_answers) { if (ua === normalizeText(alt)) return maxScore; } }
    return 0;
  }
  if (type === 'single_choice') { if (data.correct_indices && Array.isArray(data.correct_indices)) return answer === data.correct_indices[0] ? maxScore : 0; return 0; }
  if (type === 'multi_choice') { if (!Array.isArray(answer) || !data.correct_indices) return 0; const correct = new Set(data.correct_indices); const userAnswer = new Set(answer); if (correct.size !== userAnswer.size) return 0; for (const c of correct) { if (!userAnswer.has(c)) return 0; } return maxScore; }
  if (type === 'order') {
    if (!Array.isArray(answer) || !data.order_items) return 0;
    const n = data.order_items.length;
    if (answer.length !== n) return 0;
    let matches = 0;
    for (let i = 0; i < n; i++) { if (answer[i] === i) matches++; }
    return Math.round((matches / n) * maxScore);
  }
  if (type === 'match') { if (!data.pairs || !answer) return 0; let matches = 0; for (let i = 0; i < data.pairs.length; i++) { if (answer[i] === data.pairs[i].right) matches++; } return Math.round((matches / data.pairs.length) * maxScore); }
  if (type === 'fill_blanks') {
    if (typeof answer !== 'string') return 0;
    const correctParts = (data.correct_answer || '')
      .split(',').map((s: string) => normalizeText(s)).filter((s: string) => s.length > 0);
    if (correctParts.length === 0) return 0;
    const studentParts = answer.split(',').map((s: string) => normalizeText(s));
    let matches = 0;
    for (let i = 0; i < correctParts.length; i++) {
      if (studentParts[i] === correctParts[i]) matches++;
    }
    return Math.round((matches / correctParts.length) * maxScore);
  }
  if (type === 'assembly') { if (!Array.isArray(answer) || !data.assembly_parts) return 0; const correct = data.assembly_parts.map((_: any, i: number) => i); if (answer.length !== correct.length) return 0; for (let i = 0; i < correct.length; i++) { if (answer[i] !== correct[i]) return 0; } return maxScore; }
  if (type === 'drag_drop') { if (!data.drag_items || !answer) return 0; let matches = 0; for (let i = 0; i < data.drag_items.length; i++) { if (answer[i] === data.drag_items[i].target) matches++; } return Math.round((matches / data.drag_items.length) * maxScore); }
  return 0;
}

// НОВОЕ: строит копию секций ДЗ без полей с правильными ответами — для
// передачи в QuestionCard, когда ученик решает задание. ВАЖНО: это не
// замена полноценной защите. Firestore SDK получает документ ДЗ целиком
// по сети ДО того, как эта функция отработает — значит человек,
// открывший вкладку Network в браузере, всё равно увидит правильные
// ответы в сыром JSON. Полноценная защита требует Cloud Function/
// серверного эндпоинта, отдающего ученику уже урезанный документ, либо
// вынесения "ключей" ответов в отдельную коллекцию с более строгими
// Firestore Rules. Здесь функция лишь не даёт значениям попасть в
// состояние React и в DOM — минимальная защита от случайного
// подглядывания через React DevTools, а не от целенаправленного разбора
// сетевого трафика.
function redactSectionsForStudent(sections: any[]): any[] {
  return (sections || []).map((section: any) => {
    const data = { ...(section.data || {}) };
    delete data.correct_answer;
    delete data.correct_indices;
    delete data.alt_answers;
    if (Array.isArray(data.pairs)) {
      data.pairs = data.pairs.map((p: any) => ({ left: p.left }));
    }
    if (Array.isArray(data.drag_items)) {
      data.drag_items = data.drag_items.map((d: any) => ({ item: d.item }));
    }
    return { ...section, data };
  });
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
    if (timeLeft <= 300 && !warningShown) { setWarningShown(true); toast.error("⏰ Осталось 5 минут!", { duration: 5000, icon: "⏰" }); }
  }, [timeLeft, warningShown]);

  const percentage = (timeLeft / (timeLimit * 60)) * 100;
  const isCritical = timeLeft <= 60;
  const bgColor = isCritical ? 'bg-[#8B3A3A] border-[#7A2F2F]' : (timeLeft <= 300 ? 'bg-[#B8860B] border-[#96690A]' : 'bg-[#6B705C] border-[#596050]');

  return (
    <div className={`sticky top-0 z-50 px-4 sm:px-6 py-3 shadow-lg border-b-2 ${bgColor} ${isCritical ? 'animate-pulse' : ''}`}>
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-3 sm:gap-4 justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <Timer className={`w-5 h-5 sm:w-6 sm:h-6 text-white ${isCritical ? 'animate-spin' : ''}`} />
          <span className="text-white font-bold text-sm sm:text-lg">Осталось:</span>
        </div>
        <div className="text-white font-mono text-xl sm:text-2xl font-bold tracking-wider">{formatTime(timeLeft)}</div>
        <div className="w-full sm:w-32 h-2.5 bg-white/30 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${isCritical ? 'bg-white' : 'bg-white/80'}`} style={{ width: `${percentage}%` }} />
        </div>
      </div>
    </div>
  );
}

function sanitizeAnswers(sections: any[], answers: Record<string, any>): Record<string, any> {
  if (!answers || typeof answers !== 'object') return answers;
  const result = { ...answers };
  (sections || []).forEach((sec: any) => {
    if (sec?.type !== 'order') return;
    const n = (sec.data?.order_items || []).length;
    const val = result[sec.id];
    if (val === undefined) return;
    const isValidPermutation =
      Array.isArray(val) &&
      val.length === n &&
      val.every((v: any) => Number.isInteger(v) && v >= 0 && v < n) &&
      new Set(val).size === n;
    if (!isValidPermutation) delete result[sec.id];
  });
  return result;
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
  const [showTables, setShowTables] = useState(false);

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

  const bg = darkMode ? 'bg-[#1A1614]' : 'bg-[#FAF3E8]';
  const bgHeader = darkMode ? 'bg-[#2A2420] border-[#2A2420]' : 'bg-white border-[#E8DCC8]';
  const bgCard = darkMode ? 'bg-[#2A2420] border-[#2A2420]' : 'bg-white border-[#F5E4D5]';
  const bgInput = darkMode ? 'bg-[#2A2420] border-[#3D2817] text-[#F5E6D3]' : 'bg-white border-[#E8DCC8] text-[#3D2817]';
  const bgProgress = darkMode ? 'bg-[#2A2420]' : 'bg-[#F5E4D5]';
  const textPrimary = darkMode ? 'text-[#F5E6D3]' : 'text-[#3D2817]';
  const textSecondary = darkMode ? 'text-[#8A7A6A]' : 'text-[#3D2817]';
  const textMuted = darkMode ? 'text-[#6B4E3A]' : 'text-[#8A7A6A]';
  const textAccent = darkMode ? 'text-[#DCC7AA]' : 'text-[#8B5A2E]';

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
        attachments: draftPayload.attachments || {},
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

  const updateStudentProgress = async (studentId: string, finalScore: number, maxScoreVal: number, homeworkId: string) => {
    try {
      const progressRef = doc(db, "student_progress", `${studentId}_${homeworkId}`);
      await setDoc(progressRef, {
        student_id: studentId,
        homework_id: homeworkId,
        homework_title: hw?.title || '',
        subject: hw?.subject || hw?.conversion_scale || null,
        score: finalScore,
        max_score: maxScoreVal,
        percentage: maxScoreVal > 0 ? Math.round((finalScore / maxScoreVal) * 100) : 0,
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { merge: true });

      const profileRef = doc(db, "profiles", studentId);
      await updateDoc(profileRef, {
        total_completed_homeworks: increment(1),
        last_activity: new Date().toISOString()
      }).catch(() => {});
    } catch (e) {
      console.error("Ошибка обновления статистики ученика:", e);
    }
  };

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
      if ((isReviewMode || isPreviewMode) && !isTutor) {
        setError('Доступ запрещён');
        setLoading(false);
        return;
      }
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

        // ИСПРАВЛЕНО: раньше здесь стирались correct_answer/correct_indices/
        // alt_answers прямо в data.sections, и та же (уже урезанная) структура
        // потом шла в setHw() и использовалась внутри submitAnswer() для
        // подсчёта calcScore(). Из-за этого calcScore получал пустые поля с
        // ответами и ВСЕГДА возвращал 0 баллов для text/photo/single_choice/
        // multi_choice/fill_blanks у любого обычного ученика — это ломало
        // сам смысл авто-проверки, а не просто "давало утечку ответов".
        // Теперь в hw.sections всегда попадает полная, неурезанная структура
        // (нужна submitAnswer/calcScore), а урезанная версия строится через
        // redactSectionsForStudent() отдельно и уходит только в пропсы
        // QuestionCard при рендере — так подсчёт очков продолжает работать,
        // а в React-состоянии, которое отрисовывается на экран, ответов нет.
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
                setAnswers(sanitizeAnswers(data.sections || [], sd.section_answers || {}));
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

                setSubmitted(sd.status === "approved" || sd.status === "needs_revision");
                if (sd.status === "needs_revision") toast("📝 Работа отправлена на доработку.", { icon: '📝', duration: 5000 });
              }
            });
            setLoading(false);
            return () => unsub();
          } else {
            try {
              const draftSnap = await getDoc(doc(db, "homework_drafts", `${id}_${uid}`));
              if (draftSnap.exists()) {
                const ddata = draftSnap.data();
                const rawAttachments = ddata.attachments || {};
                const normalized: Record<string, any[]> = {};
                Object.keys(rawAttachments).forEach(key => {
                  const val = rawAttachments[key];
                  normalized[key] = normalizeAttachmentList(val);
                });
                setAnswers(sanitizeAnswers(data.sections || [], ddata.answers || {}));
                setStudentComments(ddata.comments || {});
                setAttachments(Object.keys(normalized).length > 0 ? normalized : {});
                if ((data.type === 'trial_exam' || data.time_limit) && typeof ddata.exam_start_time === 'number') {
                  setExamStarted(true);
                  setExamStartTime(ddata.exam_start_time);
                }
              } else {
                const saved = localStorage.getItem(`hw_answers_${id}_${uid}`);
                if (saved) {
                  const parsed = JSON.parse(saved);
                  setAnswers(sanitizeAnswers(data.sections || [], parsed.answers || {}));
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

          setAnswers(sanitizeAnswers(hw?.sections || [], sd.section_answers || {}));
          setScores(sd.section_scores || {});
          setScore(sd.score || 0);
          setSectionComments(sd.section_comments || {});
          setOverallComment(sd.overall_comment || "");
          setStudentComments(sd.student_comments || {});

          if (sd.status === "needs_revision") {
            toast("📝 Работа отправлена на доработку.", { icon: '📝', duration: 5000 });
            setSubmitted(false);
          } else if (sd.status === "approved") {
            setSubmitted(true);
          } else {
            setSubmitted(false);
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
        const draftPayload = {
          answers,
          comments: studentComments,
          savedAt: new Date().toISOString(),
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
          const payloadString = JSON.stringify(draftPayload);
          if (payloadString.length > 900000) {
            localStorage.setItem(`hw_answers_${id}_${uid}`, JSON.stringify({ answers, comments: studentComments }));
          } else {
            localStorage.setItem(`hw_answers_${id}_${uid}`, payloadString);
          }
        } catch (storageError) {
          localStorage.setItem(`hw_answers_${id}_${uid}`, JSON.stringify({ answers, comments: studentComments }));
        }
        void persistDraftToFirestore(draftPayload);
        setSaveStatus('saved');
      } catch (e) { setSaveStatus('unsaved'); }
    }, 1500);
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

      const secs = hw.sections || [];
      const sc: Record<string,number> = {};
      let total = 0;
      for (const sec of secs) {
        const hasAttachment = Array.isArray(attachments[sec.id]) && attachments[sec.id].length > 0;
        const s = calcScore(sec, answers[sec.id], hasAttachment);
        sc[sec.id] = Math.round(s);
        total += s;
      }
      const final = Math.round(total);
      const historyEntry = { submitted_at: new Date().toISOString(), score: final, answers: { ...answers } };

      const isFullyAutoGradable = secs.length > 0 && secs.every((sec: any) => AUTO_GRADABLE_TYPES.includes(sec.type));

      const updateData: any = {
        section_answers: answers, section_scores: sc, student_comments: studentComments, attachments: cleanAttachments,
        score: final, status: "submitted", updated_at: new Date().toISOString(), history: [...(currentSubmission?.history || []), historyEntry]
      };
      if (submissionId) {
        updateData.resubmitted_at = new Date().toISOString();
        updateData.resubmit_count = (currentSubmission?.resubmit_count || 0) + 1;
        await updateDoc(doc(db, "submissions", submissionId), updateData);
        toast.success("✅ Работа переотправлена!");
        setReviewStatus("submitted");
      } else {
        const initialStatus = isFullyAutoGradable ? "approved" : "submitted";
        const createData: any = {
          homework_id: id, student_id: uid, section_answers: answers, section_scores: sc,
          student_comments: studentComments, attachments: cleanAttachments, score: final,
          submitted_at: new Date().toISOString(), status: initialStatus, resubmit_count: 0,
          exam_start_time: examStartTime, history: [historyEntry]
        };
        if (isFullyAutoGradable) {
          createData.reviewed_at = new Date().toISOString();
          createData.reviewer_id = null;
          createData.auto_graded = true;
        }
        const subRef = await addDoc(collection(db, "submissions"), createData);
        await updateDoc(doc(db, "homeworks", id), { submission: subRef.id });
        setSubmissionId(subRef.id);
        if (isFullyAutoGradable) {
          toast.success(`✅ Автопроверено! Результат: ${final}/${hw.max_score}`);
          setReviewStatus("approved");
        } else {
          toast.success(`✅ Отправлено на проверку! Автобалл: ${final}/${hw.max_score}`);
          setReviewStatus("submitted");
        }
      }
      setSubmitted(isFullyAutoGradable && !submissionId); setScore(final); setScores(sc);
      try { localStorage.removeItem(`hw_answers_${id}_${uid}`); } catch (e) {}
    } catch (e: any) { toast.error("Ошибка: " + e.message); }
    finally { setIsSubmitting(false); }
  }

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student?.full_name || student?.name || student?.email || studentId;
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

   const saveReview = (decision: "approved" | "needs_revision") => {
    const currentSub = filteredSubmissions[currentIndex];
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

    const saveResultSnapshot = async () => {
      if (decision !== "approved") return;
      
      const maxScoreVal = hw.max_score || totalScore || 1;
      const percentage = Math.round((totalScore / maxScoreVal) * 100);
      
      try {
        const resultId = `${currentSub.student_id}_${currentSub.homework_id}`;
        await setDoc(doc(db, "student_results", resultId), {
          student_id: currentSub.student_id,
          homework_id: currentSub.homework_id,
          homework_title: hw.title || "Без названия",
          homework_type: hw.type || "regular",
          subject: hw.conversion_scale || hw.subject || null,
          score: totalScore,
          max_score: maxScoreVal,
          percentage: percentage > 100 ? 100 : percentage,
          reviewed_at: new Date().toISOString(),
          tutor_id: uid,
          created_at: new Date().toISOString(),
        }, { merge: true });
      } catch (e) {
        console.error("Ошибка сохранения снимка:", e);
      }
    };

    const previousSubSnapshot = currentSub;

    setSubmissions(prev => prev.map(s =>
      s.id === currentSub.id
        ? { ...s, status: decision, score: totalScore, section_scores: sectionScores, section_comments: sectionCommentsObj, overall_comment: overallComment }
        : s
    ));

    updateDoc(doc(db, "submissions", currentSub.id), {
      manual_scores: sectionScores,
      section_comments: sectionCommentsObj,
      section_scores: sectionScores,
      overall_comment: overallComment,
      score: totalScore,
      max_score: hw.max_score || 0,
      status: decision,
      reviewed_at: new Date().toISOString(),
      reviewer_id: user?.uid || null
    }).then(() => {
      toast.success(`✅ Сохранено! ${totalScore}/${hw.max_score || 0} • ${decision === 'approved' ? 'Принято' : 'На доработку'}`);

      void saveResultSnapshot();

      if (decision === "approved") {
        void updateStudentProgress(currentSub.student_id, totalScore, hw.max_score || 0, id);
      }

      setTimeout(() => {
        if (currentIndex < filteredSubmissions.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setManualScores({});
          setComments({});
          setOverallComment("");
        } else {
          toast.success("🎉 Все работы проверены!");
        }
      }, 700);
    }).catch((error: any) => {
      toast.error("Ошибка сохранения: " + error.message + " — изменения отменены, попробуйте снова");
      setSubmissions(prev => prev.map(s => s.id === currentSub.id ? previousSubSnapshot : s));
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

  if (loadingAuth || loading || !mounted) return <div className={`min-h-screen ${bg} flex items-center justify-center`}><div className="w-16 h-16 border-4 border-[#C67B4B] border-t-transparent rounded-full animate-spin"></div></div>;
  if (error || !hw) return (
    <div className={`min-h-screen ${bg} flex items-center justify-center p-4`}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${bgCard} rounded-3xl p-10 border-2 text-center shadow-2xl max-w-md`}>
        <h2 className={`text-2xl font-bold ${textPrimary} mb-3`}>{error || 'ДЗ не найдено'}</h2>
        <button onClick={() => router.push('/homeworks')} className="px-8 py-4 bg-gradient-to-r from-[#C67B4B] via-[#B8860B] to-[#8B3A3A] text-white rounded-xl font-semibold shadow active:scale-95 transition">← Назад</button>
      </motion.div>
    </div>
  );

  // НОВОЕ: показываем ученику только урезанную версию секций (без полей
  // с ответами), а для подсчёта баллов (submitAnswer/calcScore) продолжаем
  // использовать полные hw.sections. Учитель/предпросмотр/проверка видят
  // секции как есть — там наличие правильных ответов ожидаемо и нужно.
  const sectionsForRender = (isTutor || isPreviewMode || isReviewMode)
    ? (hw.sections || [])
    : redactSectionsForStudent(hw.sections || []);

  if (isReviewMode) {
    const currentSub = filteredSubmissions[currentIndex];
    return (
      <div className={`min-h-screen ${bg} transition-colors duration-300`}>
        <Toaster position="top-right" />
        <header className={`${bgHeader} border-b sticky top-0 z-30 shadow-sm`}>
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/homeworks')} className={`p-2 rounded-xl transition active:scale-90 ${darkMode ? 'hover:bg-[#2A2420]' : 'hover:bg-[#F5E4D5]'}`}><ArrowLeft className={`w-6 h-6 ${darkMode ? 'text-[#D18F5C]' : 'text-[#8B5A2E]'}`} /></button>
              <div><h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'bg-gradient-to-r from-[#C67B4B] via-[#B8860B] to-[#8B3A3A] bg-clip-text text-transparent'}`}>Проверка ДЗ</h1><p className={`text-sm ${textSecondary}`}>{hw.title}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setDarkMode(!darkMode)} className={`p-2.5 rounded-2xl border shadow-sm transition active:scale-90 ${darkMode ? 'bg-[#2A2420] text-[#D4A017] border-[#2A2420]' : 'bg-white text-[#3D2817] border-[#E8DCC8]'}`}>
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <div className={`px-4 py-2 rounded-xl ${darkMode ? 'bg-[#3D2817]/30' : 'bg-[#F5E4D5]'}`}><span className={`font-semibold ${darkMode ? 'text-[#DCC7AA]' : 'text-[#6B4520]'}`}>{filteredSubmissions.length} отправок</span></div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          <div className={`${bgCard} rounded-2xl border-2 p-4 flex flex-wrap gap-3 items-center`}>
            <List className={`w-5 h-5 ${darkMode ? 'text-[#D18F5C]' : 'text-[#A86535]'}`} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`px-3 py-2 border-2 rounded-lg text-sm focus:border-[#C67B4B] focus:outline-none ${bgInput}`}>
              <option value="all">Все статусы</option><option value="submitted">На проверке</option><option value="approved">Принято</option><option value="needs_revision">На доработке</option>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={`px-3 py-2 border-2 rounded-lg text-sm focus:border-[#C67B4B] focus:outline-none ${bgInput}`}>
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
                <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0} className={`px-6 py-3 border-2 rounded-xl font-bold disabled:opacity-30 transition flex items-center gap-2 active:scale-95 ${darkMode ? 'bg-[#2A2420] border-[#3D2817] text-[#F5E6D3]' : 'bg-white border-[#E8DCC8] text-[#3D2817]'}`}><ChevronLeft className="w-5 h-5" /> Предыдущий</button>
                <div className="text-center"><p className={`text-sm font-bold ${textAccent}`}>Ученик {currentIndex + 1} из {filteredSubmissions.length}</p><p className={`text-xs ${textSecondary}`}>{getStudentName(currentSub.student_id)}</p></div>
                <button onClick={() => setCurrentIndex(Math.min(filteredSubmissions.length - 1, currentIndex + 1))} disabled={currentIndex === filteredSubmissions.length - 1} className={`px-6 py-3 border-2 rounded-xl font-bold disabled:opacity-30 transition flex items-center gap-2 active:scale-95 ${darkMode ? 'bg-[#2A2420] border-[#3D2817] text-[#F5E6D3]' : 'bg-white border-[#E8DCC8] text-[#3D2817]'}`}>Следующий <ChevronRight className="w-5 h-5" /></button>
              </div>

              <div className={`${bgCard} rounded-3xl border-2 shadow-lg overflow-hidden`}>
                <div className={`p-6 border-b-2 ${darkMode ? 'bg-[#2A2420] border-[#3D2817]' : 'bg-gradient-to-r from-[#FAF3E8] to-[#F6ECCF] border-[#E8DCC8]'}`}>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#B8860B] to-[#D4A017] rounded-full flex items-center justify-center text-white font-bold text-xl">{getStudentName(currentSub.student_id).charAt(0).toUpperCase()}</div>
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
                      <div key={sectionId} className={`rounded-xl p-5 border-2 ${darkMode ? 'bg-[#2A2420] border-[#3D2817]' : 'bg-[#FAF3E8] border-[#E8DCC8]'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2"><div className="w-8 h-8 bg-gradient-to-br from-[#C67B4B] to-[#8B3A3A] rounded-lg flex items-center justify-center text-white font-bold">{idx + 1}</div><h4 className={`font-bold text-lg ${textPrimary}`}>{section.title || `Задание ${idx + 1}`}</h4></div>
                          <div className={`px-3 py-1 rounded-lg font-bold ${sectionScore >= maxScore ? (darkMode ? 'bg-[#2A2E26]/30 text-[#B7C4A0]' : 'bg-[#DCEBD2] text-[#4A4F42]') : sectionScore > 0 ? (darkMode ? 'bg-[#4A3405]/30 text-[#E0B45C]' : 'bg-[#F6ECCF] text-[#7A5608]') : (darkMode ? 'bg-[#3D1515]/30 text-[#E0A3A3]' : 'bg-[#F5DEDA] text-[#6B2626]')}`}>{sectionScore}/{maxScore}</div>
                        </div>

                        {(section.data?.task_text || section.data?.text) && (
                          <div className={`rounded-lg p-3 border-l-4 mb-3 ${darkMode ? 'bg-[#2A2420] border-[#D18F5C]' : 'bg-white border-[#D18F5C]'}`}>
                            <p className={`text-xs font-bold ${textAccent} mb-1`}>Условие:</p>
                            <p className={`text-sm whitespace-pre-wrap ${darkMode ? 'text-[#E8DCC8]' : 'text-[#6B4E3A]'}`}>{section.data.task_text || section.data.text}</p>
                          </div>
                        )}

                        <div className="mb-3">
                          <p className={`text-sm font-bold ${darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]'} mb-2`}>Ответ ученика:</p>
                          <div className={`rounded-lg p-3 border-2 ${darkMode ? 'bg-[#2A2420] border-[#3D2817]' : 'bg-white border-[#E8DCC8]'}`}>
                            <p className={`text-sm whitespace-pre-wrap ${darkMode ? 'text-[#E8DCC8]' : 'text-[#6B4E3A]'}`}>{formatAnswerForDisplay(section, studentAnswer) || <span className={textMuted}>Нет ответа</span>}</p>
                          </div>

                          {attachment.length > 0 ? (
                            <div className="mt-3">
                              <p className={`text-sm font-semibold ${textSecondary} mb-2`}>📎 Фото ({attachment.length}):</p>
                              <div className="grid grid-cols-2 gap-3">
                                {attachment.map((photo: any, photoIdx: number) => (
                                  <div key={photoIdx} className="relative">
                                    <div
                                      onClick={() => window.open(photo.url, '_blank')}
                                      className="overflow-hidden rounded-lg border-2 border-[#E8DCC8] cursor-pointer group"
                                    >
                                      <img
                                        src={photo.url}
                                        alt={`Решение ${photoIdx + 1}`}
                                        className="w-full h-40 object-cover transition-transform group-hover:scale-105"
                                        loading="lazy"
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                        <span className="bg-white/90 px-3 py-1 rounded-full text-xs font-semibold">
                                          🔍 Увеличить
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
                                      className="absolute top-2 right-2 z-20 p-1.5 bg-[#8B3A3A] hover:bg-[#7A2F2F] text-white rounded-full shadow-lg transition-all hover:scale-110 active:scale-90 flex items-center justify-center"
                                      title="Удалить фото"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3 p-3 bg-[#F0E8D8] dark:bg-[#2A2420] rounded-lg text-center">
                              <p className={`text-sm ${darkMode ? 'text-[#8A7A6A]' : 'text-[#6B4E3A]'}`}>📷 Фото не загружено</p>
                            </div>
                          )}
                        </div>

                        {studentComment && (
                          <div className="mb-3">
                            <p className={`text-sm font-bold ${darkMode ? 'text-[#CBA0A8]' : 'text-[#5A333A]'} mb-2`}>❓ Вопрос ученика:</p>
                            <div className={`rounded-lg p-3 border-2 ${darkMode ? 'bg-[#2E1A1E]/10 border-[#5A333A]' : 'bg-[#F0E3E5] border-[#DFC3C8]'}`}>
                              <p className={`text-sm whitespace-pre-wrap ${darkMode ? 'text-[#E8DCC8]' : 'text-[#6B4E3A]'}`}>{studentComment}</p>
                            </div>
                          </div>
                        )}

                        {section.data?.correct_answer && (
                          <div className="mb-3">
                            <p className={`text-sm font-bold ${darkMode ? 'text-[#B7C4A0]' : 'text-[#4A4F42]'} mb-2`}>✓ Правильный ответ:</p>
                            <div className={`rounded-lg p-3 border-2 ${darkMode ? 'bg-[#2A2E26]/10 border-[#4A4F42]' : 'bg-[#DCEBD2] border-[#A9C596]'}`}>
                              <p className={`text-sm whitespace-pre-wrap ${darkMode ? 'text-[#E8DCC8]' : 'text-[#6B4E3A]'}`}>{section.data.correct_answer}</p>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className={`text-sm font-bold ${darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]'} block mb-2`}>
                              <span className="flex items-center gap-2 flex-wrap">
                                Баллы:
                                {attachment.length > 0 && (
                                  <span className="px-2 py-0.5 bg-[#F6ECCF] text-[#7A5608] text-[10px] font-bold rounded-full flex items-center gap-1 animate-pulse">
                                    📷 Фото прикреплено
                                  </span>
                                )}
                              </span>
                            </label>
                            <input type="number" min={0} max={maxScore} value={manualScores[sectionId] ?? sectionScore} onChange={(e) => setManualScores(prev => ({ ...prev, [sectionId]: parseInt(e.target.value) || 0 }))} className={`w-full px-4 py-3 border-2 rounded-xl text-center font-bold focus:border-[#C67B4B] focus:outline-none text-lg ${darkMode ? 'bg-[#2A2420] border-[#3D2817] text-[#DCC7AA]' : 'bg-white border-[#E8DCC8] text-[#8B5A2E]'}`} />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className={`text-sm font-bold ${darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]'}`}>💬 Комментарий:</label>
                              {commentTemplates.length > 0 && <button onClick={() => setShowTemplates(!showTemplates)} className={`text-xs font-semibold ${darkMode ? 'text-[#B37E89]' : 'text-[#693D45]'}`}>Шаблоны</button>}
                            </div>
                            {showTemplates && commentTemplates.length > 0 && (
                              <div className={`mb-2 p-2 rounded-lg border max-h-32 overflow-y-auto ${darkMode ? 'bg-[#2E1A1E]/10 border-[#5A333A]' : 'bg-[#F0E3E5] border-[#DFC3C8]'}`}>
                                {commentTemplates.map((template: string, i: number) => (<button key={i} onClick={() => applyCommentTemplate(template, sectionId)} className={`w-full text-left px-2 py-1 text-xs rounded ${darkMode ? 'text-[#B8A898] hover:bg-[#2E1A1E]/20' : 'text-[#6B4E3A] hover:bg-[#F0E3E5]'}`}>{template}</button>))}
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
                  <label className={`text-sm font-bold ${darkMode ? 'text-[#B8A898]' : 'text-[#6B4E3A]'} block mb-2`}>💬 Общий комментарий:</label>
                  <ChemButton value={overallComment} onChange={setOverallComment} placeholder="Общий комментарий..." rows={3} darkMode={darkMode} />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => saveReview("needs_revision")}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-[#8B3A3A] to-[#8B3A3A] text-white rounded-xl font-bold hover:shadow-xl transition flex items-center justify-center gap-2 active:scale-95"
                  >
                    <RotateCcw className="w-5 h-5" /> На доработку
                  </button>
                  <button
                    onClick={() => saveReview("approved")}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-[#6B705C] to-[#5F7A66] text-white rounded-xl font-bold hover:shadow-xl transition flex items-center justify-center gap-2 active:scale-95"
                  >
                    <CheckCircle className="w-5 h-5" /> Принять
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </main>
      </div>
    );
  }

  const sections = sectionsForRender;
  const section = sections[current];
  const isDeadlinePassed = hw.due_date && new Date(hw.due_date) < new Date();

  const isReviewed = reviewStatus === 'approved' || currentSubmission?.status === 'approved';
  const pendingReview = (submitted || reviewStatus === 'submitted' || currentSubmission?.status === 'submitted') && !isReviewed && reviewStatus !== 'needs_revision';

  const getDeadlineInfo = () => {
    if (!hw.due_date) return null;
    const diff = new Date(hw.due_date).getTime() - new Date().getTime();
    if (diff <= 0) return { text: '🔴 Просрочено!', color: darkMode ? 'text-[#D68080]' : 'text-[#7A2F2F]', urgent: true };
    const hours = Math.floor(diff / (1000 * 60 * 60)); const days = Math.floor(hours / 24);
    if (days > 0) return { text: `⏰ Осталось ${days} дн.`, color: darkMode ? 'text-[#9BB07C]' : 'text-[#596050]', urgent: false };
    if (hours > 0) return { text: `⏰ Осталось ${hours} ч.`, color: darkMode ? 'text-[#D4A017]' : 'text-[#96690A]', urgent: true };
    return { text: `⏰ Осталось ${Math.floor(diff / (1000 * 60))} мин.`, color: darkMode ? 'text-[#D68080]' : 'text-[#7A2F2F]', urgent: true };
  };
  const deadlineInfo = getDeadlineInfo();

  const getButtonColor = (sec: any, i: number) => {
    if (isReviewed) {
      const sc = scores[sec.id] ?? 0; const max = sec.max_score || 1;
      if (sc >= max) return "bg-gradient-to-br from-[#6B705C] to-[#5F7A66] text-white border-[#596050] shadow-lg";
      else if (sc > 0) return "bg-gradient-to-br from-[#D4A017] to-[#B8860B] text-white border-[#B8860B] shadow-lg";
      else return "bg-gradient-to-br from-[#8B3A3A] to-[#8B3A3A] text-white border-[#7A2F2F] shadow-lg";
    } else if (pendingReview) {
      const answered = hasMeaningfulContent(answers[sec.id]) || (Array.isArray(attachments[sec.id]) && attachments[sec.id].length > 0);
      if (i === current) return "bg-gradient-to-r from-[#C67B4B] via-[#B8860B] to-[#8B3A3A] text-white border-[#C67B4B] shadow-lg";
      return answered
        ? "bg-gradient-to-br from-[#B8860B] to-[#D4A017] text-white border-[#96690A] shadow-lg"
        : (darkMode ? "bg-[#2A2420] text-[#8A7A6A] border-2 border-[#3D2817]" : "bg-white text-[#6B4E3A] border-2 border-[#E8DCC8]");
    } else if (i === current) return "bg-gradient-to-r from-[#C67B4B] via-[#B8860B] to-[#8B3A3A] text-white border-[#C67B4B] shadow-lg";
    else if (answers[sec.id] !== undefined) return darkMode ? "bg-[#3D2817]/20 text-[#DCC7AA] border-[#7A5608]" : "bg-[#F5E4D5] text-[#8B5A2E] border-[#E0B45C]";
    return darkMode ? "bg-[#2A2420] text-[#8A7A6A] border-2 border-[#3D2817]" : "bg-white text-[#6B4E3A] border-2 border-[#E8DCC8]";
  };

  const totalScore = score !== null ? score : Object.values(scores).reduce((sum: number, s: any) => sum + (s || 0), 0);
  const maxScore = hw.max_score || 1;
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  if (isTrialExam && !submitted && !isPreviewMode && !pendingReview) {
    if (!examStarted) {
      return (
        <div className={`min-h-screen ${bg} flex items-center justify-center p-4`}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`${bgCard} rounded-3xl p-10 border-2 text-center shadow-2xl max-w-2xl`}>
            <div className="w-24 h-24 bg-gradient-to-br from-[#C67B4B] to-[#8B3A3A] rounded-full flex items-center justify-center text-white text-5xl mx-auto mb-6 shadow-lg">⏱️</div>
            <h2 className={`text-3xl font-bold ${textPrimary} mb-3`}>Пробный экзамен</h2>
            <p className={`text-xl mb-2 font-semibold ${textSecondary}`}>{hw.title}</p>
            <div className={`rounded-2xl p-6 border-2 mb-6 ${darkMode ? 'bg-[#2A2420] border-[#3D2817]' : 'bg-[#FAF3E8] border-[#E8DCC8]'}`}>
              <div className="flex items-center justify-center gap-4 mb-4">
                <Timer className={`w-8 h-8 ${darkMode ? 'text-[#D18F5C]' : 'text-[#A86535]'}`} />
                <div className="text-left"><p className={`text-sm ${textSecondary}`}>Время на выполнение</p><p className={`text-3xl font-bold ${textAccent}`}>{hw.time_limit || 180} минут</p></div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => router.push('/homeworks')} className={`flex-1 px-6 py-4 border-2 rounded-xl font-bold transition active:scale-95 ${darkMode ? 'bg-[#2A2420] border-[#3D2817] text-[#B8A898]' : 'bg-white border-[#DCC7AA] text-[#6B4E3A]'}`}>← Назад</button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => {
                const startTime = Date.now();
                setExamStarted(true);
                setExamStartTime(startTime);
                setDoc(doc(db, "homework_drafts", `${id}_${uid}`), {
                  homework_id: id, student_id: uid, exam_start_time: startTime, updated_at: new Date().toISOString()
                }, { merge: true }).catch((e) => console.error('Не удалось сохранить старт экзамена:', e));
              }} className="flex-1 px-6 py-4 bg-gradient-to-r from-[#C67B4B] via-[#B8860B] to-[#8B3A3A] text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2">
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
              <div><h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'bg-gradient-to-r from-[#C67B4B] via-[#B8860B] to-[#8B3A3A] bg-clip-text text-transparent'}`}>{hw.title}</h1><p className={`text-sm ${textSecondary}`}>Пробный экзамен • {sections.length} заданий</p></div>
              <div className="flex items-center gap-3">
                {saveStatus === 'saving' && <span className={`text-xs flex items-center gap-1 ${darkMode ? 'text-[#D4A017]' : 'text-[#96690A]'}`}><Save className="w-3 h-3 animate-pulse" /> Сохранение...</span>}
                {saveStatus === 'saved' && <span className={`text-xs flex items-center gap-1 ${darkMode ? 'text-[#9BB07C]' : 'text-[#596050]'}`}><Check className="w-3 h-3" /> Сохранено</span>}
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
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { if (window.confirm('Завершить экзамен?')) { setExamFinished(true); submitAnswer(); } }} disabled={isSubmitting} className="w-full px-6 py-4 bg-gradient-to-r from-[#6B705C] to-[#5F7A66] text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2 text-lg">
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
            <button onClick={() => router.push('/homeworks')} className={`font-medium text-sm flex items-center gap-2 transition active:scale-95 ${darkMode ? 'text-[#D18F5C] hover:text-[#DCC7AA]' : 'text-[#8B5A2E] hover:text-[#6B4520]'}`}><ArrowLeft className="w-5 h-5" /> Назад</button>
            <h1 className={`text-lg sm:text-xl font-bold truncate flex-1 text-center ${darkMode ? 'text-white' : 'bg-gradient-to-r from-[#C67B4B] via-[#B8860B] to-[#8B3A3A] bg-clip-text text-transparent'}`}>{hw.title}</h1>
            <div className="flex items-center gap-2">
              <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-xl border shadow-sm transition active:scale-90 ${darkMode ? 'bg-[#2A2420] text-[#D4A017] border-[#2A2420]' : 'bg-white text-[#3D2817] border-[#E8DCC8]'}`}>
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              {deadlineInfo && !submitted && !pendingReview && <span className={`px-3 py-1 rounded-lg text-xs font-bold ${deadlineInfo.urgent ? (darkMode ? 'bg-[#3D1515]/30 text-[#E0A3A3] animate-pulse' : 'bg-[#F5DEDA] text-[#6B2626] animate-pulse') : (darkMode ? 'bg-[#2A2E26]/30 text-[#B7C4A0]' : 'bg-[#DCEBD2] text-[#4A4F42]')}`}>{deadlineInfo.text}</span>}
              {isPreviewMode && <span className={`px-3 py-1 rounded-lg text-xs font-bold ${darkMode ? 'bg-[#4A3405]/30 text-[#DEC17E]' : 'bg-[#F6ECCF] text-[#7A5608]'}`}>👁️ Предпросмотр</span>}
              {pendingReview && <span className="px-3 py-1 bg-gradient-to-r from-[#B8860B] to-[#D4A017] text-white rounded-lg text-xs font-bold flex items-center gap-1"><Hourglass className="w-3 h-3" /> На проверке</span>}
              {reviewStatus === "needs_revision" && <span className="px-3 py-1 bg-gradient-to-r from-[#8B3A3A] to-[#8B3A3A] text-white rounded-lg text-xs font-bold animate-pulse">📝 На доработку</span>}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {reviewStatus === "needs_revision" && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-[#8B3A3A] to-[#8B3A3A] rounded-2xl p-5 shadow-lg mb-6 text-white">
            <div className="flex items-center gap-3"><RotateCcw className="w-8 h-8" /><div><h3 className="font-bold text-lg">Работа отправлена на доработку</h3><p className="text-sm text-white/90">Исправьте ошибки и отправьте снова</p></div></div>
          </motion.div>
        )}
        {pendingReview && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-[#B8860B] to-[#D4A017] rounded-2xl p-5 shadow-lg mb-6 text-white">
            <div className="flex items-center gap-3"><Hourglass className="w-8 h-8" /><div><h3 className="font-bold text-lg">Работа отправлена и ожидает проверки</h3><p className="text-sm text-white/90">Баллы и комментарии появятся после проверки преподавателем</p></div></div>
          </motion.div>
        )}
        {isReviewed && overallComment && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-[#B8860B] to-[#D4A017] rounded-2xl p-5 shadow-lg mb-6 text-white">
            <div className="flex items-start gap-3"><Award className="w-8 h-8 flex-shrink-0" /><div><h3 className="font-bold text-lg mb-1">💬 Комментарий учителя:</h3><p className="text-sm text-white/90 whitespace-pre-wrap">{overallComment}</p></div></div>
          </motion.div>
        )}
        {saveStatus === 'saving' && !submitted && !isPreviewMode && !pendingReview && (
          <div className="fixed bottom-4 right-4 bg-[#B8860B] text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 z-50 transition-all"><Save className="w-4 h-4 animate-pulse" /><span className="text-sm font-semibold">Сохранение...</span></div>
        )}
        {saveStatus === 'saved' && !submitted && !isPreviewMode && !pendingReview && (
          <div className="fixed bottom-4 right-4 bg-[#6B705C] text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 z-50 transition-all"><Check className="w-4 h-4" /><span className="text-sm font-semibold">Сохранено</span></div>
        )}

        <div className={`${bgCard} rounded-2xl p-6 shadow-lg border-2 mb-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><div className="w-8 h-8 bg-gradient-to-br from-[#C67B4B] to-[#B8860B] rounded-lg flex items-center justify-center text-white"><BookOpen className="w-4 h-4" /></div><span className={`text-sm font-semibold ${textSecondary}`}>Прогресс</span></div>
            <span className={`text-sm font-bold ${textAccent}`}>{current + 1} из {sections.length}</span>
          </div>
          <div className={`relative h-3 ${bgProgress} rounded-full overflow-hidden mb-4`}>
            <motion.div className="absolute h-full bg-gradient-to-r from-[#C67B4B] via-[#B8860B] to-[#8B3A3A] rounded-full" initial={{ width: 0 }} animate={{ width: `${((current + 1) / sections.length) * 100}%` }} transition={{ duration: 0.5 }} />
          </div>
          <div className="flex items-center justify-center gap-3">
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleCurrentChange(Math.max(0, current - 1))} disabled={current === 0} className={`w-10 h-10 rounded-xl disabled:opacity-30 flex items-center justify-center border-2 shadow-sm ${darkMode ? 'bg-[#2A2420] hover:bg-[#3D2817] text-[#DCC7AA] border-[#3D2817]' : 'bg-[#FAF3E8] hover:bg-[#F6ECCF] text-[#8B5A2E] border-[#E8DCC8]'}`}>◀</motion.button>
            <div className="flex gap-2 flex-wrap justify-center">
              {sections.map((sec: any, i: number) => (
                <motion.button key={sec.id} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleCurrentChange(i)} className={`w-10 h-10 rounded-xl text-sm font-bold transition-all flex items-center justify-center shadow-sm border-2 ${getButtonColor(sec, i)}`}>{i + 1}</motion.button>
              ))}
            </div>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleCurrentChange(Math.min(sections.length - 1, current + 1))} disabled={current >= sections.length - 1} className={`w-10 h-10 rounded-xl disabled:opacity-30 flex items-center justify-center border-2 shadow-sm ${darkMode ? 'bg-[#2A2420] hover:bg-[#3D2817] text-[#DCC7AA] border-[#3D2817]' : 'bg-[#FAF3E8] hover:bg-[#F6ECCF] text-[#8B5A2E] border-[#E8DCC8]'}`}>▶</motion.button>
          </div>
          {isReviewed && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className={`mt-5 pt-4 border-t-2 ${darkMode ? 'border-[#2A2420]' : 'border-[#F5E4D5]'}`}>
              <p className={`text-xs font-semibold mb-3 text-center ${textSecondary}`}>Результаты:</p>
              <div className="flex flex-wrap justify-center gap-3">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 ${darkMode ? 'bg-[#2A2E26]/20 border-[#4A4F42]' : 'bg-[#DCEBD2] border-[#A9C596]'}`}><div className="w-5 h-5 bg-gradient-to-br from-[#6B705C] to-[#5F7A66] rounded-md"></div><span className={`text-sm font-semibold ${darkMode ? 'text-[#B7C4A0]' : 'text-[#4A4F42]'}`}>✓ Верно: {sections.filter((sec: any) => (scores[sec.id] ?? 0) >= (sec.max_score || 1)).length}</span></div>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 ${darkMode ? 'bg-[#3D1515]/20 border-[#6B2626]' : 'bg-[#F5DEDA] border-[#ECC2C2]'}`}><div className="w-5 h-5 bg-gradient-to-br from-[#8B3A3A] to-[#8B3A3A] rounded-md"></div><span className={`text-sm font-semibold ${darkMode ? 'text-[#E0A3A3]' : 'text-[#6B2626]'}`}>✗ Неверно: {sections.filter((sec: any) => (scores[sec.id] ?? 0) === 0).length}</span></div>
              </div>
            </motion.div>
          )}
        </div>

        {isReviewed && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", duration: 0.6 }} className={`bg-gradient-to-r ${percentage >= 90 ? 'from-[#C67B4B] to-[#B8860B]' : percentage >= 70 ? 'from-[#B8860B] to-[#A8622E]' : 'from-[#8A7A65] to-[#6B5A45]'} rounded-2xl px-6 py-4 shadow-lg text-white mb-6`}>
            <div className="flex items-center justify-between">
              <div><p className="text-[#F5E4D5] text-xs mb-1">Первичные баллы</p><p className="text-2xl font-bold">{totalScore}<span className="text-lg text-[#E8DCC8]">/{maxScore}</span></p></div>
              <div className="text-right"><p className="text-2xl font-bold text-white leading-tight">{percentage}%</p><p className="text-[#F5E4D5] text-xs font-medium">{percentage >= 90 ? '🔥 Отлично!' : percentage >= 70 ? '👍 Хорошо' : '📖 Нужно подучить'}</p></div>
            </div>
          </motion.div>
        )}

        {section && (
          <AnimatePresence mode="wait">
            <motion.div key={current} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mb-6">
              {!submitted && !pendingReview ? (
                <QuestionCard section={section} answer={answers[section.id]} onChange={(a: any) => updateAnswer(section.id, a)} studentComment={studentComments[section.id]} onCommentChange={(c: string) => updateStudentComment(section.id, c)} showComment={!isPreviewMode} isStudent={!isTutor && !isPreviewMode} attachment={attachments[section.id]} onAttachmentChange={(f: any) => updateAttachment(section.id, f)} studentId={uid} darkMode={darkMode} />
              ) : pendingReview ? (
                <QuestionCard section={section} answer={answers[section.id]} onChange={() => {}} studentComment={studentComments[section.id]} onCommentChange={() => {}} showComment={false} isStudent={false} attachment={attachments[section.id]} onAttachmentChange={() => {}} studentId={uid} darkMode={darkMode} readOnly={true} />
              ) : (
                <ResultCard section={(hw.sections || [])[current] || section} answer={answers[section.id]} score={scores[section.id] || 0} maxScore={section.max_score || 1} comment={sectionComments[section.id]} conversionScale={conversionScale} studentComment={studentComments[section.id]} teacherReply={currentSubmission?.teacher_replies?.[section.id]} attachment={attachments[section.id]} darkMode={darkMode} pendingReview={false} />
              )}

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
                                className="overflow-hidden rounded-lg border-2 border-[#E8DCC8] cursor-pointer group"
                              >
                                <img
                                  src={photo.url}
                                  alt={`Решение ${photoIdx + 1}`}
                                  className="w-full h-40 object-cover transition-transform group-hover:scale-105"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                  <span className="bg-white/90 px-3 py-1 rounded-full text-xs font-semibold">
                                    🔍 Увеличить
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
                                className="absolute top-2 right-2 z-20 p-1.5 bg-[#8B3A3A] hover:bg-[#7A2F2F] text-white rounded-full shadow-lg transition-all hover:scale-110 active:scale-90 flex items-center justify-center"
                                title="Удалить фото"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleCurrentChange(Math.max(0, current - 1))} disabled={current === 0} className={`px-6 py-3 rounded-xl font-semibold transition-all text-base ${current === 0 ? `opacity-50 cursor-not-allowed ${darkMode ? 'bg-[#2A2420] text-[#6B4E3A]' : 'bg-[#E8DCC8] text-[#6B4E3A]'}` : `${darkMode ? 'bg-[#2A2420] border-2 border-[#3D2817] text-[#B8A898] hover:border-[#D18F5C] hover:bg-[#2A2420]' : 'bg-white border-2 border-[#E8DCC8] text-[#6B4E3A] hover:border-[#D18F5C] hover:bg-[#FAF3E8]'} shadow`}`}>← Назад</motion.button>
            {current < sections.length - 1 ? (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleCurrentChange(current + 1)} className="flex-1 px-6 py-3 bg-gradient-to-r from-[#C67B4B] via-[#B8860B] to-[#8B3A3A] text-white rounded-xl font-semibold hover:shadow-xl transition shadow text-base">Далее →</motion.button>
            ) : !submitted && !pendingReview ? (
              isDeadlinePassed ? (
                <div className={`flex-1 px-6 py-3 rounded-xl font-bold text-center border-2 ${darkMode ? 'bg-[#3D1515]/20 text-[#E0A3A3] border-[#6B2626]' : 'bg-[#F5DEDA] text-[#6B2626] border-[#E0A3A3]'}`}>⏰ Дедлайн истёк</div>
              ) : (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => submitAnswer()} disabled={isSubmitting} className="flex-1 px-6 py-3 bg-gradient-to-r from-[#C67B4B] via-[#B8860B] to-[#8B3A3A] text-white rounded-xl font-semibold hover:shadow-xl transition shadow disabled:opacity-50 flex items-center justify-center gap-2 text-base">
                  {isSubmitting ? (<><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Отправка...</>) : (<><CheckCircle className="w-5 h-5" /> {submissionId ? "✓ Переотправить" : "✓ Отправить"}</>)}
                </motion.button>
              )
            ) : pendingReview ? (
              <div className={`flex-1 flex items-center justify-center border-2 rounded-xl p-4 shadow gap-2 ${darkMode ? 'bg-[#4A3405]/10 border-[#7A5608]' : 'bg-[#F6ECCF] border-[#EAD9A8]'}`}>
                <Hourglass className={`w-5 h-5 ${darkMode ? 'text-[#DEC17E]' : 'text-[#96690A]'}`} />
                <span className={`text-base font-bold ${darkMode ? 'text-[#DEC17E]' : 'text-[#7A5608]'}`}>⏳ Работа на проверке у преподавателя</span>
              </div>
            ) : (
              <div className={`flex-1 flex items-center justify-center border-2 rounded-xl p-4 shadow ${darkMode ? 'bg-[#2A2420] border-[#3D2817]' : 'bg-white border-[#E8DCC8]'}`}>
                <span className={`text-base font-bold ${textSecondary}`}>✅ Работа проверена • {totalScore}/{maxScore} баллов</span>
              </div>
            )}
          </div>
        )}
        {isPreviewMode && <div className={`border-2 rounded-xl p-4 text-center ${darkMode ? 'bg-[#4A3405]/10 border-[#7A5608]' : 'bg-[#F6ECCF] border-[#EAD9A8]'}`}><p className={`text-sm font-bold ${darkMode ? 'text-[#DEC17E]' : 'text-[#7A5608]'}`}>👁️ Это режим предпросмотра. Отправка невозможна.</p></div>}
      </main>

      <button
        onClick={() => setShowTables(true)}
        className="fixed bottom-24 right-6 z-40 w-14 h-14 bg-gradient-to-br from-[#C67B4B] to-[#8B3A3A] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-300"
        title="Справочные таблицы"
      >
        <Table2 className="w-6 h-6" />
      </button>

      {showTables && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" onClick={() => setShowTables(false)}>
          <div onClick={(e) => e.stopPropagation()} className="h-full flex items-center justify-center p-4">
            <div className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl bg-white dark:bg-[#1A1614]">
              <button
                onClick={() => setShowTables(false)}
                className="absolute top-4 right-4 z-50 w-10 h-10 bg-white/90 dark:bg-[#2A2420]/90 rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition"
              >
                <X className="w-5 h-5" />
              </button>
              <ReferenceTables />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomeworkPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF3E8] dark:bg-[#1A1614] flex items-center justify-center"><div className="w-16 h-16 border-4 border-[#C67B4B] border-t-transparent rounded-full animate-spin"></div></div>}>
      <HomeworkView />
    </Suspense>
  );
}