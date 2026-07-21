"use client";

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, query, where, getDocs,
} from "firebase/firestore";
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
const db = getFirestore(app);

const HOMEWORK_TOPICS = [
  { name: "Строение атома", ege: "1-3", subject: "chemistry" },
  { name: "Периодический закон", ege: "4-5", subject: "chemistry" },
  { name: "Химическая связь", ege: "7", subject: "chemistry" },
  { name: "ОВР", ege: "29", subject: "chemistry" },
  { name: "Электролиз", ege: "31", subject: "chemistry" },
  { name: "Гидролиз", ege: "30", subject: "chemistry" },
  { name: "Алканы и алкены", ege: "13", subject: "chemistry" },
  { name: "Спирты и фенолы", ege: "14", subject: "chemistry" },
  { name: "Карбоновые кислоты", ege: "15", subject: "chemistry" },
  { name: "Цепочки превращений", ege: "32", subject: "chemistry" },
  { name: "Массовая доля", ege: "27", subject: "chemistry" },
  { name: "Задачи на растворы", ege: "28", subject: "chemistry" },
  { name: "Строение клетки", ege: "2", subject: "biology" },
  { name: "Генетика", ege: "7-8", subject: "biology" },
  { name: "Эволюция", ege: "19-21", subject: "biology" },
  { name: "Экосистемы", ege: "23-25", subject: "biology" },
];

function AIGeneratorContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "tutor";

  const [bankFolders, setBankFolders] = useState<any[]>([]);
  const [bankAllTasks, setBankAllTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiMode, setAiMode] = useState<'random' | 'example'>('random');
  const [aiConfig, setAiConfig] = useState({
    folderId: null as string | null,
    count: 5,
    types: [] as string[],
    tags: [] as string[],
    shuffle: true,
    includeText: true,
    includeTests: true,
    includeInteractive: true,
  });
  const [aiTopicFilter, setAiTopicFilter] = useState("");
  const [aiExample, setAiExample] = useState("");
  const [aiPreview, setAiPreview] = useState<any[]>([]);
  const [aiHistory, setAiHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!uid || role !== "tutor") { setLoading(false); return; }
    const loadBank = async () => {
      try {
        const fs = await getDocs(query(collection(db, "task_folders"), where("tutor_id", "==", uid)));
        setBankFolders(fs.docs.map(d => ({ id: d.id, ...d.data() })));
        const ts = await getDocs(query(collection(db, "tasks_bank"), where("tutor_id", "==", uid)));
        const tasks = ts.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log("📚 Загружено заданий из банка:", tasks.length);
        setBankAllTasks(tasks);
      } catch (e) { 
        console.error("Ошибка загрузки банка:", e);
        toast.error("Не удалось загрузить банк заданий");
      }
      setLoading(false);
    };
    loadBank();

    const savedHistory = localStorage.getItem(`ai_history_${uid}`);
    if (savedHistory) {
      try { setAiHistory(JSON.parse(savedHistory)); } catch {}
    }
  }, [uid, role]);

  function convertBankTaskToSection(task: any) {
    const base = {
      id: `bank-${task.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: task.title || "Задание из банка",
      max_score: task.max_score || 10,
      explanation: task.explanation || "",
    };
    switch (task.type) {
      case "text": return { ...base, type: "text", data: { task_text: task.task_text || "", check_type: task.check_type || "exact", correct_answer: task.correct_answer || "", correct_answers: task.variants?.length > 0 ? task.variants : [task.correct_answer || ""], keywords: task.keywords || [] } };
      case "photo": return { ...base, type: "photo", data: { image: task.image || "", correct_answer: task.correct_answer || "" } };
      case "single_choice": case "multi_choice": return { ...base, type: task.type, data: { questions: task.questions || [] } };
      case "matching": return { ...base, type: "matching", data: { pairs: task.pairs || [] } };
      case "ordering": return { ...base, type: "ordering", data: { steps: task.steps || [] } };
      case "drag_drop": return { ...base, type: "drag_drop", data: { categories: task.categories || [], items: task.items || [] } };
      case "table_fill": return { ...base, type: "table_fill", data: { rows: task.rows || 3, cols: task.cols || 3, headers: task.headers || [], cells: task.cells || {} } };
      default: return { ...base, type: "text", data: { task_text: task.task_text || "" } };
    }
  }

  // ✅ УЛУЧШЕННЫЙ анализ примера
  function analyzeExample(text: string) {
    const a = { 
      type: "text" as string, 
      topic: "", 
      keywords: [] as string[], 
      hasFormula: false, 
      hasNumbers: false, 
      difficulty: "medium" as string,
      detectedType: "" as string
    };
    const tl = text.toLowerCase();
    
    // Определяем тип задания по ключевым словам
    if (/выберите|какой из|вариант ответа|один из/.test(tl)) {
      a.type = "single_choice";
      a.detectedType = "тест с выбором ответа";
    } else if (/несколько правильных|выберите все|множественный/.test(tl)) {
      a.type = "multi_choice";
      a.detectedType = "мультитест";
    } else if (/соответствие|соотнесите|установите соответствие/.test(tl)) {
      a.type = "matching";
      a.detectedType = "соответствие";
    } else if (/расположите в порядке|расставьте|последовательность/.test(tl)) {
      a.type = "ordering";
      a.detectedType = "порядок";
    } else if (/таблица|заполните таблицу/.test(tl)) {
      a.type = "table_fill";
      a.detectedType = "таблица";
    } else if (/рассчитайте|вычислите|найдите массу|объём|моль/.test(tl)) {
      a.type = "text";
      a.hasNumbers = true;
      a.detectedType = "расчётная задача";
    } else if (/напишите уравнение|составьте уравнение|завершите уравнение/.test(tl)) {
      a.type = "text";
      a.detectedType = "уравнение реакции";
    } else if (/определите|укажите|назовите/.test(tl)) {
      a.type = "text";
      a.detectedType = "вопрос с развёрнутым ответом";
    } else {
      a.type = "text";
      a.detectedType = "текстовое задание";
    }
    
    // Ищем химические формулы
    if (/[A-Z][a-z]?\d|[A-Z][a-z]?₂|[A-Z][a-z]?₃/.test(text)) {
      a.hasFormula = true;
      const f = text.match(/[A-Z][a-z]?[₀-₉]?(?:\([^)]+\)[₀-₉]?)?/g) || [];
      a.keywords = [...new Set(f)].slice(0, 5);
    }
    
    // Определяем сложность
    const words = text.split(/\s+/).length;
    if (words > 50 || a.hasFormula) a.difficulty = "hard";
    else if (words > 20) a.difficulty = "medium";
    else a.difficulty = "easy";
    
    return a;
  }

  // ✅ УЛУЧШЕННАЯ генерация по примеру
  function generateFromExample() {
    console.log("🖋️ Запуск генерации по примеру...");
    console.log("📊 Всего заданий в банке:", bankAllTasks.length);
    
    if (!aiExample.trim()) { 
      toast.error("📜 Введите пример задания"); 
      return; 
    }
    
    if (bankAllTasks.length === 0) {
      toast.error("📚 Банк заданий пуст! Сначала добавьте задания в банк.");
      return;
    }
    
    const analysis = analyzeExample(aiExample);
    console.log("🔍 Анализ примера:", analysis);
    
    // Шаг 1: Ищем задания того же типа
    let similar = bankAllTasks.filter(t => t.type === analysis.type);
    console.log(`📝 Найдено заданий типа "${analysis.type}":`, similar.length);
    
    // Шаг 2: Если не нашли — ищем любые задания
    if (similar.length === 0) {
      console.log("⚠️ Заданий нужного типа нет, берём любые...");
      similar = [...bankAllTasks];
    }
    
    // Шаг 3: Фильтр по папке если выбрана
    if (aiConfig.folderId) {
      similar = similar.filter(t => t.folder_id === aiConfig.folderId);
      console.log("📁 После фильтра по папке:", similar.length);
    }
    
    // Шаг 4: Фильтр по теме если выбрана
    if (aiTopicFilter) {
      const byTopic = similar.filter(t => 
        t.topic === aiTopicFilter || 
        t.tags?.includes(aiTopicFilter) ||
        t.title?.toLowerCase().includes(aiTopicFilter.toLowerCase())
      );
      if (byTopic.length > 0) {
        similar = byTopic;
        console.log("🎯 После фильтра по теме:", similar.length);
      }
    }
    
    // Шаг 5: Перемешиваем и берём нужное количество
    similar = similar.sort(() => Math.random() - 0.5);
    const count = Math.min(aiConfig.count, similar.length);
    const selected = similar.slice(0, count);
    
    console.log(`✅ Выбрано ${count} заданий для вариаций`);
    
    // Шаг 6: Генерируем вариации
    const newSections = selected.map((task, idx) => {
      const base = convertBankTaskToSection(task);
      
      // Для текстовых заданий — меняем числа
      if (task.type === "text" && task.task_text && analysis.hasNumbers) {
        base.data.task_text = task.task_text.replace(/\d+/g, () => {
          const num = Math.floor(Math.random() * 100) + 1;
          return String(num);
        });
        base.title = `Вариация #${idx + 1}: ${task.title}`;
      }
      
      // Для тестов — перемешиваем варианты
      if ((task.type === "single_choice" || task.type === "multi_choice") && task.questions?.length > 0) {
        base.data.questions = task.questions.map((q: any) => {
          const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
          const newCorrect = q.correct.map((c: number) => shuffledOptions.indexOf(q.options[c]));
          return { ...q, options: shuffledOptions, correct: newCorrect };
        });
        base.title = `Вариация #${idx + 1}: ${task.title}`;
      }
      
      return base;
    });
    
    console.log("🎉 Сгенерировано секций:", newSections.length);
    setAiPreview(newSections);
    toast.success(`🖋️ Сочинено ${newSections.length} вариаций!`);
  }

  function previewAIHomework() {
    console.log("🎲 Запуск случайной генерации...");
    console.log("📊 Всего заданий в банке:", bankAllTasks.length);
    
    if (bankAllTasks.length === 0) {
      toast.error("📚 Банк заданий пуст!");
      return;
    }
    
    let tasks = [...bankAllTasks];
    
    if (aiConfig.folderId) {
      tasks = tasks.filter(t => t.folder_id === aiConfig.folderId);
      console.log("📁 После фильтра по папке:", tasks.length);
    }
    
    if (aiTopicFilter) {
      tasks = tasks.filter(t => 
        t.topic === aiTopicFilter || 
        t.tags?.includes(aiTopicFilter)
      );
      console.log("🎯 После фильтра по теме:", tasks.length);
    }
    
    const allowed: string[] = [];
    if (aiConfig.includeText) allowed.push('text', 'photo');
    if (aiConfig.includeTests) allowed.push('single_choice', 'multi_choice');
    if (aiConfig.includeInteractive) allowed.push('matching', 'ordering', 'table_fill', 'drag_drop');
    
    if (allowed.length > 0) {
      tasks = tasks.filter(t => allowed.includes(t.type));
      console.log("🎨 После фильтра по типам:", tasks.length);
    }
    
    if (aiConfig.tags.length > 0) {
      tasks = tasks.filter(t => t.tags && aiConfig.tags.some(tag => t.tags.includes(tag)));
      console.log("🏷️ После фильтра по тегам:", tasks.length);
    }
    
    if (tasks.length === 0) { 
      toast.error("📜 Нет заданий по выбранным фильтрам"); 
      return; 
    }
    
    if (aiConfig.shuffle) tasks = tasks.sort(() => Math.random() - 0.5);
    
    const count = Math.min(aiConfig.count, tasks.length);
    const selected = tasks.slice(0, count);
    
    console.log(`✅ Выбрано ${count} заданий`);
    
    setAiPreview(selected.map(convertBankTaskToSection));
    toast.success(`🎲 Сгенерировано ${count} заданий!`);
  }

  function applyAIPreview() {
    if (aiPreview.length === 0) return;
    const historyItem = {
      id: Date.now(),
      date: new Date().toISOString(),
      sections: aiPreview,
      config: { ...aiConfig, topic: aiTopicFilter, mode: aiMode },
      count: aiPreview.length,
    };
    const newHistory = [historyItem, ...aiHistory].slice(0, 10);
    setAiHistory(newHistory);
    localStorage.setItem(`ai_history_${uid}`, JSON.stringify(newHistory));
    toast.success(`✒️ Опубликовано ${aiPreview.length} заданий!`);
    setAiPreview([]);
    setAiExample("");
  }

  function getAllBankTags() {
    const tags = new Set<string>();
    bankAllTasks.forEach(t => { if (t.tags) t.tags.forEach((tag: string) => tags.add(tag)); });
    return Array.from(tags);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-amber-950/20 to-stone-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🤖</div>
          <p className="text-amber-200/70 font-serif italic">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (bankAllTasks.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-amber-950/20 to-stone-900 flex items-center justify-center p-4">
        <div className="fixed inset-0 pointer-events-none opacity-20">
          <div className="absolute top-10 left-10 text-8xl rotate-12">🤖</div>
          <div className="absolute bottom-20 right-10 text-7xl -rotate-12">📚</div>
        </div>
        <div className="relative max-w-md w-full text-center">
          <div className="text-center mb-6">
            <h2 className="text-4xl font-serif italic text-amber-100 mb-2">AI Generator</h2>
            <div className="w-32 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent mx-auto mt-4"></div>
          </div>
          <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 rounded-2xl p-8 border border-amber-900/30 shadow-2xl">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-amber-100 font-serif italic text-lg mb-2">Банк заданий пуст</p>
            <p className="text-amber-200/60 text-sm font-serif mb-6">Сначала добавьте задания в банк</p>
            <Link href={`/library?uid=${uid}&role=${role}`} className="inline-block px-6 py-3 bg-gradient-to-r from-amber-700 to-amber-600 text-white rounded-xl font-serif italic hover:opacity-90 transition">
              📚 Перейти в банк заданий
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-900 via-amber-950/20 to-stone-900 p-4 sm:p-6 relative">
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-10 left-10 text-8xl rotate-12">🤖</div>
        <div className="absolute bottom-20 right-10 text-7xl -rotate-12">📚</div>
        <div className="absolute top-1/3 right-1/4 text-6xl rotate-6">✨</div>
        <div className="absolute bottom-1/3 left-1/4 text-6xl -rotate-6">📖</div>
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/homeworks?uid=${uid}&role=${role}`} className="text-amber-200/70 hover:text-amber-100 transition font-serif italic flex items-center gap-1">
            <span>←</span> Назад к ДЗ
          </Link>
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-serif italic text-amber-100">AI Generator</h1>
            <p className="text-amber-200/60 text-xs mt-1">Умная генерация заданий</p>
          </div>
          <div className="w-24"></div>
        </div>

        {/* Статистика банка */}
        <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 rounded-2xl p-4 border border-amber-900/30 shadow-2xl mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-amber-100">{bankAllTasks.length}</p>
              <p className="text-xs text-amber-200/60">Всего заданий</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-100">{bankFolders.length}</p>
              <p className="text-xs text-amber-200/60">Папок</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-100">{getAllBankTags().length}</p>
              <p className="text-xs text-amber-200/60">Тегов</p>
            </div>
          </div>
        </div>

        {/* Переключатель режимов */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button onClick={() => { setAiMode('random'); setAiPreview([]); }} className={`p-4 rounded-xl border-2 transition text-left ${aiMode === 'random' ? 'bg-amber-900/40 border-amber-500/60' : 'bg-stone-950/30 border-amber-900/20 hover:border-amber-500/30'}`}>
            <div className="text-2xl mb-2">🎲</div>
            <div className="text-amber-100 font-serif font-bold">Случайная генерация</div>
            <div className="text-xs text-amber-200/50 font-serif italic mt-1">По фильтрам и настройкам</div>
          </button>
          <button onClick={() => { setAiMode('example'); setAiPreview([]); }} className={`p-4 rounded-xl border-2 transition text-left ${aiMode === 'example' ? 'bg-amber-900/40 border-amber-500/60' : 'bg-stone-950/30 border-amber-900/20 hover:border-amber-500/30'}`}>
            <div className="text-2xl mb-2">🖋️</div>
            <div className="text-amber-100 font-serif font-bold">По примеру</div>
            <div className="text-xs text-amber-200/50 font-serif italic mt-1">Анализ и вариации</div>
          </button>
        </div>

        {/* Режим 1: Случайная генерация */}
        {aiMode === 'random' && aiPreview.length === 0 && (
          <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 rounded-2xl p-6 border border-amber-900/30 shadow-2xl space-y-4">
            <div>
              <label className="text-amber-200/80 text-sm font-serif italic block mb-2">📖 Источник</label>
              <select value={aiConfig.folderId || ''} onChange={(e) => setAiConfig({ ...aiConfig, folderId: e.target.value || null })} className="w-full bg-stone-950/50 border border-amber-900/30 rounded-lg p-3 text-amber-100 text-sm font-serif focus:border-amber-500/50 focus:outline-none transition">
                <option value="">Все задания ({bankAllTasks.length})</option>
                {bankFolders.map(f => (
                  <option key={f.id} value={f.id}>📁 {f.name} ({bankAllTasks.filter(t => t.folder_id === f.id).length})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-amber-200/80 text-sm font-serif italic block mb-2">🎯 Тема (необязательно)</label>
              <select value={aiTopicFilter} onChange={(e) => setAiTopicFilter(e.target.value)} className="w-full bg-stone-950/50 border border-amber-900/30 rounded-lg p-3 text-amber-100 text-sm font-serif focus:border-amber-500/50 focus:outline-none transition">
                <option value="">Любая тема</option>
                {HOMEWORK_TOPICS.map(t => (
                  <option key={t.name} value={t.name}>{t.name} (ЕГЭ {t.ege})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-amber-200/80 text-sm font-serif italic block mb-2">✒️ Количество: <span className="text-amber-100 font-bold text-lg">{aiConfig.count}</span></label>
              <input type="range" min="1" max="20" value={aiConfig.count} onChange={(e) => setAiConfig({ ...aiConfig, count: parseInt(e.target.value) })} className="w-full accent-amber-500" />
              <div className="flex justify-between text-xs text-amber-200/40 mt-1 font-serif">
                <span>1</span><span>5</span><span>10</span><span>15</span><span>20</span>
              </div>
            </div>

            <div>
              <label className="text-amber-200/80 text-sm font-serif italic block mb-2">🎨 Типы заданий</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { key: 'includeText', label: 'Текст', icon: '📝', desc: 'Текст, фото' },
                  { key: 'includeTests', label: 'Тесты', icon: '🔘', desc: 'Выбор ответа' },
                  { key: 'includeInteractive', label: 'Интерактив', icon: '🎭', desc: 'Соответствие, порядок' },
                  { key: 'shuffle', label: 'Перемешать', icon: '🌀', desc: 'Случайный порядок' },
                ].map(opt => (
                  <label key={opt.key} className={`p-3 rounded-lg border-2 cursor-pointer transition ${(aiConfig as any)[opt.key] ? 'bg-amber-900/40 border-amber-500/60' : 'bg-stone-950/30 border-amber-900/20 hover:border-amber-500/30'}`}>
                    <input type="checkbox" checked={(aiConfig as any)[opt.key]} onChange={(e) => setAiConfig({ ...aiConfig, [opt.key]: e.target.checked })} className="sr-only" />
                    <div className="text-xl mb-1">{opt.icon}</div>
                    <div className="text-xs text-amber-100 font-serif font-bold">{opt.label}</div>
                    <div className="text-[10px] text-amber-200/50 font-serif italic">{opt.desc}</div>
                  </label>
                ))}
              </div>
            </div>

            {getAllBankTags().length > 0 && (
              <div>
                <label className="text-amber-200/80 text-sm font-serif italic block mb-2">🏷️ Теги (необязательно)</label>
                <div className="flex flex-wrap gap-2">
                  {getAllBankTags().map(tag => {
                    const isSelected = aiConfig.tags.includes(tag);
                    return (
                      <button key={tag} type="button" onClick={() => {
                        const newTags = isSelected ? aiConfig.tags.filter(t => t !== tag) : [...aiConfig.tags, tag];
                        setAiConfig({ ...aiConfig, tags: newTags });
                      }} className={`px-3 py-1.5 rounded-full text-xs font-serif italic transition ${isSelected ? 'bg-amber-500/80 text-stone-900' : 'bg-stone-950/30 text-amber-200/60 border border-amber-900/30 hover:border-amber-500/50'}`}>
                        #{tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button onClick={previewAIHomework} className="w-full bg-gradient-to-r from-amber-900/60 via-amber-800/60 to-amber-900/60 hover:from-amber-800/70 hover:via-amber-700/70 hover:to-amber-800/70 text-amber-100 py-4 rounded-xl font-serif italic text-lg transition border border-amber-600/30 shadow-lg shadow-amber-900/30">
              🎲 Сгенерировать задания
            </button>
          </div>
        )}

        {/* Режим 2: По примеру */}
        {aiMode === 'example' && aiPreview.length === 0 && (
          <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 rounded-2xl p-6 border border-amber-900/30 shadow-2xl space-y-4">
            <div>
              <label className="text-amber-200/80 text-sm font-serif italic block mb-2">📜 Вставьте пример задания</label>
              <textarea 
                value={aiExample} 
                onChange={(e) => setAiExample(e.target.value)} 
                placeholder="Например: Рассчитайте массу осадка, образовавшегося при взаимодействии 50 г раствора хлорида бария с избытком раствора серной кислоты..." 
                rows={6} 
                className="w-full bg-stone-950/50 border border-amber-900/30 rounded-lg p-4 text-amber-100 text-sm font-serif focus:border-amber-500/50 focus:outline-none transition resize-none" 
              />
              <p className="text-xs text-amber-200/40 font-serif italic mt-2">Чем подробнее пример, тем точнее вариации</p>
            </div>

            {aiExample.trim() && (
              <div className="bg-stone-950/50 border border-amber-900/30 rounded-lg p-4">
                <h4 className="text-amber-200/80 text-sm font-serif italic mb-3">🔍 Анализ примера:</h4>
                {(() => {
                  const analysis = analyzeExample(aiExample);
                  return (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-amber-200/50">Тип:</span>
                        <span className="text-amber-100 ml-2 font-serif">
                          {analysis.type === 'text' && '📝 Текстовое'}
                          {analysis.type === 'single_choice' && '🔘 Тест'}
                          {analysis.type === 'multi_choice' && '☑️ Мультитест'}
                          {analysis.type === 'matching' && '🔗 Соответствие'}
                          {analysis.type === 'ordering' && '🔬 Порядок'}
                          {analysis.type === 'table_fill' && '📊 Таблица'}
                        </span>
                      </div>
                      <div>
                        <span className="text-amber-200/50">Сложность:</span>
                        <span className="text-amber-100 ml-2 font-serif">
                          {analysis.difficulty === 'easy' && '🌸 Лёгкая'}
                          {analysis.difficulty === 'medium' && '🌙 Средняя'}
                          {analysis.difficulty === 'hard' && '⚡ Сложная'}
                        </span>
                      </div>
                      {analysis.detectedType && (
                        <div className="col-span-2">
                          <span className="text-amber-200/50">Определено как:</span>
                          <span className="text-amber-100 ml-2 font-serif">{analysis.detectedType}</span>
                        </div>
                      )}
                      {analysis.keywords.length > 0 && (
                        <div className="col-span-2">
                          <span className="text-amber-200/50">Формулы:</span>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {analysis.keywords.map((k, i) => (
                              <span key={i} className="px-2 py-0.5 bg-amber-900/40 text-amber-200 rounded-full text-[10px]">{k}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="col-span-2 bg-amber-900/20 rounded-lg p-2 mt-2">
                        <span className="text-amber-200/50">Заданий в банке подходящего типа:</span>
                        <span className="text-amber-100 ml-2 font-bold">
                          {bankAllTasks.filter(t => t.type === analysis.type).length}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div>
              <label className="text-amber-200/80 text-sm font-serif italic block mb-2">✒️ Количество вариаций: <span className="text-amber-100 font-bold text-lg">{aiConfig.count}</span></label>
              <input type="range" min="1" max="10" value={aiConfig.count} onChange={(e) => setAiConfig({ ...aiConfig, count: parseInt(e.target.value) })} className="w-full accent-amber-500" />
            </div>

            <button onClick={generateFromExample} disabled={!aiExample.trim()} className="w-full bg-gradient-to-r from-amber-900/60 via-amber-800/60 to-amber-900/60 hover:from-amber-800/70 hover:via-amber-700/70 hover:to-amber-800/70 text-amber-100 py-4 rounded-xl font-serif italic text-lg transition border border-amber-600/30 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-900/30">
              🖋️ Сочинить вариации
            </button>
          </div>
        )}

        {/* Предпросмотр */}
        {aiPreview.length > 0 && (
          <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 rounded-2xl p-6 border border-amber-900/30 shadow-2xl space-y-4">
            <div className="text-center mb-4">
              <p className="text-amber-200/60 text-xs tracking-[0.3em] uppercase mb-1 font-light">Предпросмотр</p>
              <h3 className="text-2xl font-serif italic text-amber-100">{aiPreview.length} заданий готовы</h3>
              {aiMode === 'example' && (
                <p className="text-xs text-amber-200/50 font-serif italic mt-2">На основе вашего примера</p>
              )}
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
              {aiPreview.map((sec, idx) => (
                <div key={sec.id} className="bg-stone-950/50 border border-amber-900/30 rounded-lg p-4 relative group hover:border-amber-500/50 transition">
                  <div className="absolute -left-2 -top-2 w-8 h-8 bg-amber-900/80 rounded-full flex items-center justify-center text-amber-100 font-serif text-sm border border-amber-600/50">
                    {idx + 1}
                  </div>
                  <div className="flex items-start justify-between gap-3 pl-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs text-amber-400/80 font-serif italic">
                          {sec.type === 'text' && '📝 Текст'}
                          {sec.type === 'photo' && '🖼️ Фото'}
                          {sec.type === 'single_choice' && '🔘 Тест'}
                          {sec.type === 'multi_choice' && '☑️ Мультитест'}
                          {sec.type === 'matching' && '🔗 Соответствие'}
                          {sec.type === 'ordering' && '🔬 Порядок'}
                          {sec.type === 'table_fill' && '📊 Таблица'}
                          {sec.type === 'drag_drop' && '🖱️ Drag&Drop'}
                        </span>
                        <span className="text-xs text-amber-200/50 font-serif">⭐ {sec.max_score} баллов</span>
                      </div>
                      <p className="text-amber-100 font-serif text-sm">{sec.title}</p>
                      {sec.type === 'text' && sec.data?.task_text && (
                        <p className="text-amber-200/60 text-xs font-serif italic mt-1 line-clamp-2">
                          "{sec.data.task_text.slice(0, 100)}{sec.data.task_text.length > 100 ? '...' : ''}"
                        </p>
                      )}
                    </div>
                    <button onClick={() => setAiPreview(aiPreview.filter((_, i) => i !== idx))} className="text-amber-200/30 hover:text-rose-400 transition text-lg" title="Убрать">
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-stone-950/50 border border-amber-900/30 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-serif text-amber-100">{aiPreview.length}</p>
                  <p className="text-xs text-amber-200/50 font-serif italic">заданий</p>
                </div>
                <div>
                  <p className="text-2xl font-serif text-amber-100">{aiPreview.reduce((sum, s) => sum + (s.max_score || 0), 0)}</p>
                  <p className="text-xs text-amber-200/50 font-serif italic">баллов</p>
                </div>
                <div>
                  <p className="text-2xl font-serif text-amber-100">{new Set(aiPreview.map(s => s.type)).size}</p>
                  <p className="text-xs text-amber-200/50 font-serif italic">типов</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { if (aiMode === 'random') previewAIHomework(); else generateFromExample(); }} className="flex-1 bg-stone-950/50 hover:bg-stone-900/50 text-amber-200/80 py-3 rounded-xl font-serif italic transition border border-amber-900/30">
                🔄 Перегенерировать
              </button>
              <button onClick={applyAIPreview} className="flex-1 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-stone-900 py-3 rounded-xl font-serif italic font-bold transition shadow-lg shadow-amber-900/30">
                ✒️ Использовать
              </button>
            </div>
          </div>
        )}

        {/* История генераций */}
        {aiHistory.length > 0 && aiPreview.length === 0 && (
          <div className="mt-6 bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 rounded-2xl p-6 border border-amber-900/30 shadow-2xl">
            <h3 className="text-amber-200/80 text-sm font-serif italic mb-4">📜 История генераций ({aiHistory.length})</h3>
            <div className="space-y-2">
              {aiHistory.map((item: any) => (
                <div key={item.id} className="bg-stone-950/50 border border-amber-900/30 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 font-serif text-sm">{item.count} заданий</p>
                    <p className="text-xs text-amber-200/50 font-serif">{new Date(item.date).toLocaleDateString("ru-RU")}</p>
                  </div>
                  <span className="text-xs text-amber-200/40 font-serif italic">{item.config?.mode === 'example' ? 'по примеру' : 'случайно'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center mt-6">
          <p className="text-amber-200/30 text-xs font-serif italic tracking-widest">
            — AI Generator —
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AIGeneratorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-amber-950/20 to-stone-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🤖</div>
          <p className="text-amber-200/70 font-serif italic">Загрузка...</p>
        </div>
      </div>
    }>
      <AIGeneratorContent />
    </Suspense>
  );
}