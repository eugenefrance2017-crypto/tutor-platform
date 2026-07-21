"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
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

function SettingsContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "tutor";

  const [egeDate, setEgeDate] = useState("2027-05-26");
  const [ogeDate, setOgeDate] = useState("2027-06-01");
  const [priceLesson, setPriceLesson] = useState(2000);
  const [priceTrial, setPriceTrial] = useState(0);
  const [duration, setDuration] = useState(60);
  const [breakTime, setBreakTime] = useState(10);
  const [workDays, setWorkDays] = useState<string[]>(["1", "2", "3", "4", "5"]);
  const [remindBefore, setRemindBefore] = useState(30);
  const [notifyNewHw, setNotifyNewHw] = useState(true);
  const [notifyParent, setNotifyParent] = useState(true);
  const [dailyEnabled, setDailyEnabled] = useState(false);
  const [telegram, setTelegram] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [welcomeMsg, setWelcomeMsg] = useState("");
  const [reportTemplate, setReportTemplate] = useState("");
  const [theme, setTheme] = useState<"light" | "dark" | "folklore">("folklore");
  const [language, setLanguage] = useState("ru");
  const [timezone, setTimezone] = useState("Europe/Moscow");

  const [gradingTemplates, setGradingTemplates] = useState<any[]>([]);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingTemplateIndex, setEditingTemplateIndex] = useState<number | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateLevels, setTemplateLevels] = useState<{ score: number; description: string; maxErrors: number }[]>([
    { score: 2, description: "Всё верно", maxErrors: 0 },
    { score: 1, description: "1 ошибка", maxErrors: 1 },
    { score: 0, description: "2+ ошибок", maxErrors: 99 },
  ]);

  const [trialDuration, setTrialDuration] = useState(210);
  const [trialQuestions, setTrialQuestions] = useState(35);
  const [autoSave, setAutoSave] = useState(true);

  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiCreativity, setAiCreativity] = useState(0.7);

  const [pricingContacts, setPricingContacts] = useState({
    telegram: "@thetorturedchemist",
    telegramLink: "https://t.me/thetorturedchemist",
    email: "eugenefrance2017@gmail.com",
    whatsapp: "+79991234567",
  });
  const [pricingStats, setPricingStats] = useState({
    students: "50+",
    avgScore: "85",
    recommend: "95%",
  });
  const [pricingTariffs, setPricingTariffs] = useState<any[]>([]);
  const [pricingFaq, setPricingFaq] = useState<any[]>([]);
  const [pricingTestimonials, setPricingTestimonials] = useState<any[]>([]);
  const [pricingSteps, setPricingSteps] = useState<any[]>([
    { step: 1, title: "Запишитесь на пробное", desc: "Бесплатное занятие — познакомимся и определим уровень", icon: "💝" },
    { step: 2, title: "Составим план", desc: "Подберём программу под ваши цели и сроки", icon: "📝" },
    { step: 3, title: "Выберите тариф", desc: "Оплатите подходящий пакет занятий", icon: "💳" },
    { step: 4, title: "Начнём занятия", desc: "Регулярные уроки с домашними заданиями и поддержкой", icon: "🎓" },
  ]);
  const [pricingGuarantees, setPricingGuarantees] = useState<any[]>([
    { icon: "💕", title: "Возврат средств", desc: "Если не понравится первое занятие — вернём 100%" },
    { icon: "🔄", title: "Перенос занятий", desc: "Бесплатный перенос при предупреждении за 12 часов" },
    { icon: "💬", title: "Поддержка 24/7", desc: "Всегда на связи в чате для ответов на вопросы" },
    { icon: "📊", title: "Прозрачный прогресс", desc: "Еженедельные отчёты и доступ к статистике" },
  ]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    Promise.all([
      getDoc(doc(db, "settings", "global")),
      getDoc(doc(db, "settings", "pricing")),
    ]).then(([globalSnap, pricingSnap]) => {
      if (globalSnap.exists()) {
        const d = globalSnap.data();
        setEgeDate(d.ege_date || "2027-05-26");
        setOgeDate(d.oge_date || "2027-06-01");
        setPriceLesson(d.price_per_lesson || 2000);
        setPriceTrial(d.price_trial || 0);
        setDuration(d.duration || 60);
        setBreakTime(d.break_time || 10);
        setWorkDays(d.work_days || ["1", "2", "3", "4", "5"]);
        setRemindBefore(d.remind_before || 30);
        setNotifyNewHw(d.notify_new_hw !== false);
        setNotifyParent(d.notify_parent !== false);
        setDailyEnabled(d.daily_enabled || false);
        setTelegram(d.telegram || "");
        setTelegramId(d.telegram_id || "");
        setWhatsapp(d.whatsapp || "");
        setWelcomeMsg(d.welcome_msg || "");
        setReportTemplate(d.report_template || "");
        setTheme(d.theme || "folklore");
        setLanguage(d.language || "ru");
        setTimezone(d.timezone || "Europe/Moscow");
        setGradingTemplates(d.grading_templates || []);
        setTrialDuration(d.trial_duration || 210);
        setTrialQuestions(d.trial_questions || 35);
        setAutoSave(d.auto_save !== false);
        setAiEnabled(d.ai_enabled !== false);
        setAiCreativity(d.ai_creativity || 0.7);
      }

      if (pricingSnap.exists()) {
        const pd = pricingSnap.data();
        if (pd.contacts) setPricingContacts({ ...pricingContacts, ...pd.contacts });
        if (pd.stats) setPricingStats({ ...pricingStats, ...pd.stats });
        if (pd.tariffs) setPricingTariffs(pd.tariffs);
        if (pd.faq) setPricingFaq(pd.faq);
        if (pd.testimonials) setPricingTestimonials(pd.testimonials);
        if (pd.steps) setPricingSteps(pd.steps);
        if (pd.guarantees) setPricingGuarantees(pd.guarantees);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [uid]);

  async function save() {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "global"), {
        ege_date: egeDate, oge_date: ogeDate,
        price_per_lesson: priceLesson, price_trial: priceTrial,
        duration, break_time: breakTime, work_days: workDays,
        remind_before: remindBefore, notify_new_hw: notifyNewHw,
        notify_parent: notifyParent, daily_enabled: dailyEnabled,
        telegram, telegram_id: telegramId, whatsapp,
        welcome_msg: welcomeMsg, report_template: reportTemplate,
        theme, language, timezone,
        grading_templates: gradingTemplates,
        trial_duration: trialDuration, trial_questions: trialQuestions,
        auto_save: autoSave, ai_enabled: aiEnabled, ai_creativity: aiCreativity,
        updated_at: new Date().toISOString(),
      }, { merge: true });

      await setDoc(doc(db, "settings", "pricing"), {
        contacts: pricingContacts,
        stats: pricingStats,
        tariffs: pricingTariffs,
        faq: pricingFaq,
        testimonials: pricingTestimonials,
        steps: pricingSteps,
        guarantees: pricingGuarantees,
        updated_at: new Date().toISOString(),
      }, { merge: true });

      await updateDoc(doc(db, "profiles", uid), {
        price_per_lesson: priceLesson,
        daily_enabled: dailyEnabled,
        theme,
      });

      setHasChanges(false);
      toast.success("🌿 Настройки сохранены!");
    } catch (error: any) {
      toast.error(`Ошибка: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  function exportSettings() {
    const settings = {
      ege_date: egeDate, oge_date: ogeDate,
      price_per_lesson: priceLesson, price_trial: priceTrial,
      duration, break_time: breakTime, work_days: workDays,
      remind_before: remindBefore, notify_new_hw: notifyNewHw,
      notify_parent: notifyParent, daily_enabled: dailyEnabled,
      telegram, whatsapp, welcome_msg: welcomeMsg,
      report_template: reportTemplate, theme, language, timezone,
      grading_templates: gradingTemplates,
      pricing: {
        contacts: pricingContacts, stats: pricingStats,
        tariffs: pricingTariffs, faq: pricingFaq,
        testimonials: pricingTestimonials,
        steps: pricingSteps, guarantees: pricingGuarantees,
      },
    };
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `settings_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("⬇️ Настройки экспортированы!");
  }

  function importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const settings = JSON.parse(e.target?.result as string);
          if (settings.ege_date) setEgeDate(settings.ege_date);
          if (settings.price_per_lesson) setPriceLesson(settings.price_per_lesson);
          if (settings.duration) setDuration(settings.duration);
          if (settings.work_days) setWorkDays(settings.work_days);
          if (settings.theme) setTheme(settings.theme);
          if (settings.pricing) {
            if (settings.pricing.contacts) setPricingContacts(settings.pricing.contacts);
            if (settings.pricing.stats) setPricingStats(settings.pricing.stats);
            if (settings.pricing.tariffs) setPricingTariffs(settings.pricing.tariffs);
            if (settings.pricing.faq) setPricingFaq(settings.pricing.faq);
            if (settings.pricing.testimonials) setPricingTestimonials(settings.pricing.testimonials);
            if (settings.pricing.steps) setPricingSteps(settings.pricing.steps);
            if (settings.pricing.guarantees) setPricingGuarantees(settings.pricing.guarantees);
          }
          setHasChanges(true);
          toast.success("📤 Настройки импортированы!");
        } catch { toast.error("Ошибка импорта файла"); }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function resetToDefaults() {
    if (!confirm("Сбросить все настройки к значениям по умолчанию?")) return;
    setEgeDate("2027-05-26"); setOgeDate("2027-06-01");
    setPriceLesson(2000); setPriceTrial(0);
    setDuration(60); setBreakTime(10);
    setWorkDays(["1", "2", "3", "4", "5"]);
    setRemindBefore(30); setNotifyNewHw(true);
    setNotifyParent(true); setDailyEnabled(false);
    setTheme("folklore"); setLanguage("ru");
    setTimezone("Europe/Moscow");
    setHasChanges(true);
    toast.success("🔄 Настройки сброшены");
  }

  function openTemplateEditor(index: number | null) {
    if (index !== null) {
      const t = gradingTemplates[index];
      setTemplateName(t.name);
      setTemplateLevels(t.levels);
      setEditingTemplateIndex(index);
    } else {
      setTemplateName("");
      setTemplateLevels([
        { score: 2, description: "Всё верно", maxErrors: 0 },
        { score: 1, description: "1 ошибка", maxErrors: 1 },
        { score: 0, description: "2+ ошибок", maxErrors: 99 },
      ]);
      setEditingTemplateIndex(null);
    }
    setShowTemplateEditor(true);
  }

  function saveTemplate() {
    if (!templateName.trim()) { toast.error("Введите название шаблона"); return; }
    const newTemplate = { name: templateName.trim(), levels: templateLevels };
    let newTemplates;
    if (editingTemplateIndex !== null) {
      newTemplates = [...gradingTemplates];
      newTemplates[editingTemplateIndex] = newTemplate;
    } else {
      newTemplates = [...gradingTemplates, newTemplate];
    }
    setGradingTemplates(newTemplates);
    setHasChanges(true);
    setShowTemplateEditor(false);
    toast.success("🌿 Шаблон сохранён!");
  }

  function deleteTemplate(index: number) {
    setGradingTemplates(gradingTemplates.filter((_, i) => i !== index));
    setHasChanges(true);
    toast.success("Шаблон удалён");
  }

  function addLevel() {
    setTemplateLevels([...templateLevels, { score: 0, description: "", maxErrors: 0 }]);
  }

  function removeLevel(index: number) {
    setTemplateLevels(templateLevels.filter((_, i) => i !== index));
  }

  const days = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-100 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🌲</div>
          <p className="text-stone-600 font-serif italic">Загрузка настроек...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-100 to-emerald-50 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-10 left-10 text-8xl">🌲</div>
        <div className="absolute bottom-20 right-10 text-7xl"></div>
        <div className="absolute top-1/3 right-1/4 text-6xl">🍁</div>
        <div className="absolute bottom-1/3 left-1/4 text-6xl">🌾</div>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 relative z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-4xl">🌲</span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-800">Настройки</h1>
            <span className="text-4xl">🍂</span>
          </div>
          <p className="text-stone-600 font-serif italic text-sm">
            "I'm doing good, I'm on some new shit" 🌾
          </p>
        </div>

        <div className="space-y-6">
          {/* Экзамены */}
          <div className="bg-white/60 backdrop-blur rounded-3xl shadow-lg p-6 border border-amber-200/50">
            <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2 text-lg">
              <span>🎓</span> Экзамены
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-stone-700">Дата ЕГЭ</label>
                <input type="date" value={egeDate} onChange={(e) => { setEgeDate(e.target.value); setHasChanges(true); }} className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition" />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700">Дата ОГЭ</label>
                <input type="date" value={ogeDate} onChange={(e) => { setOgeDate(e.target.value); setHasChanges(true); }} className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition" />
              </div>
            </div>
          </div>

          {/* Финансы */}
          <div className="bg-white/60 backdrop-blur rounded-3xl shadow-lg p-6 border border-amber-200/50">
            <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2 text-lg">
              <span>💰</span> Финансы
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-stone-700">Цена занятия (₽)</label>
                <input type="number" value={priceLesson} onChange={(e) => { setPriceLesson(parseInt(e.target.value) || 0); setHasChanges(true); }} className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition" />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700">Цена пробника (₽)</label>
                <input type="number" value={priceTrial} onChange={(e) => { setPriceTrial(parseInt(e.target.value) || 0); setHasChanges(true); }} className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition" />
              </div>
            </div>
          </div>

          {/* Расписание */}
          <div className="bg-white/60 backdrop-blur rounded-3xl shadow-lg p-6 border border-amber-200/50">
            <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2 text-lg">
              <span>📅</span> Расписание
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-stone-700">Длительность (мин)</label>
                <input type="number" value={duration} onChange={(e) => { setDuration(parseInt(e.target.value) || 60); setHasChanges(true); }} className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition" />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700">Перерыв (мин)</label>
                <input type="number" value={breakTime} onChange={(e) => { setBreakTime(parseInt(e.target.value) || 10); setHasChanges(true); }} className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition" />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700">Напоминание (мин)</label>
                <input type="number" value={remindBefore} onChange={(e) => { setRemindBefore(parseInt(e.target.value) || 30); setHasChanges(true); }} className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700 mb-2 block">Рабочие дни</label>
              <div className="flex flex-wrap gap-2">
                {days.map((d, i) => (
                  <button key={i} onClick={() => { const day = String(i + 1); setWorkDays(workDays.includes(day) ? workDays.filter(x => x !== day) : [...workDays, day]); setHasChanges(true); }} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${workDays.includes(String(i + 1)) ? 'bg-amber-700 text-white shadow-md' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>{d}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Пробники ЕГЭ */}
          <div className="bg-white/60 backdrop-blur rounded-3xl shadow-lg p-6 border border-amber-200/50">
            <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2 text-lg">
              <span>📝</span> Пробники ЕГЭ
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-stone-700">Длительность пробника (мин)</label>
                <input type="number" value={trialDuration} onChange={(e) => { setTrialDuration(parseInt(e.target.value) || 210); setHasChanges(true); }} className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition" />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700">Количество вопросов</label>
                <input type="number" value={trialQuestions} onChange={(e) => { setTrialQuestions(parseInt(e.target.value) || 35); setHasChanges(true); }} className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition" />
              </div>
            </div>
            <label className="flex items-center gap-3 mt-4 cursor-pointer">
              <input type="checkbox" checked={autoSave} onChange={(e) => { setAutoSave(e.target.checked); setHasChanges(true); }} className="w-5 h-5 text-amber-600 rounded" />
              <span className="text-sm text-stone-700">Автосохранение ответов</span>
            </label>
          </div>

          {/* Шаблоны критериев оценивания */}
          <div className="bg-white/60 backdrop-blur rounded-3xl shadow-lg p-6 border border-amber-200/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif font-bold text-stone-800 flex items-center gap-2 text-lg">
                <span>📋</span> Шаблоны критериев
              </h3>
              <button onClick={() => openTemplateEditor(null)} className="px-3 py-1.5 bg-amber-700 text-white rounded-lg text-xs font-medium hover:bg-amber-800 transition shadow-md">
                + Шаблон
              </button>
            </div>
            <p className="text-xs text-stone-500 mb-3">Создайте шаблоны оценивания для быстрого выбора при создании заданий</p>

            {gradingTemplates.length === 0 ? (
              <div className="text-center py-4 text-stone-400 text-sm font-serif italic">
                Нет шаблонов. Создайте первый шаблон.
              </div>
            ) : (
              <div className="space-y-2">
                {gradingTemplates.map((t, i) => (
                  <div key={i} className="p-3 bg-stone-50 rounded-xl flex items-center justify-between border border-stone-200">
                    <div>
                      <p className="font-medium text-sm text-stone-800">{t.name}</p>
                      <p className="text-xs text-stone-500">{t.levels?.length || 0} уровней</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openTemplateEditor(i)} className="text-amber-700 hover:text-amber-900 text-xs">✏️</button>
                      <button onClick={() => deleteTemplate(i)} className="text-red-400 hover:text-red-600 text-xs">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Редактор шаблона */}
          {showTemplateEditor && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md border-2 border-amber-200">
                <h3 className="font-serif font-bold text-lg mb-4 text-stone-800">
                  {editingTemplateIndex !== null ? "✏️ Редактировать шаблон" : "➕ Новый шаблон"}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-stone-600 font-medium">Название шаблона</label>
                    <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Например: ЕГЭ 2 балла (4 цифры)" className="w-full border-2 border-amber-200 rounded-lg p-2 text-sm mt-1 focus:border-amber-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-600 font-medium">Уровни оценивания</label>
                    <div className="space-y-2 mt-2">
                      {templateLevels.map((level, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-stone-50 rounded-lg border border-stone-200">
                          <div className="w-12">
                            <input type="number" value={level.score} onChange={(e) => { const nl = [...templateLevels]; nl[i].score = parseInt(e.target.value) || 0; setTemplateLevels(nl); }} min={0} className="w-full border border-stone-300 rounded p-1 text-xs text-center" />
                            <p className="text-[9px] text-stone-400 text-center">балл</p>
                          </div>
                          <input value={level.description} onChange={(e) => { const nl = [...templateLevels]; nl[i].description = e.target.value; setTemplateLevels(nl); }} placeholder="Описание" className="flex-1 border border-stone-300 rounded p-1 text-xs" />
                          <div className="w-16">
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-stone-400">≤</span>
                              <input type="number" value={level.maxErrors} onChange={(e) => { const nl = [...templateLevels]; nl[i].maxErrors = parseInt(e.target.value) || 0; setTemplateLevels(nl); }} min={0} className="w-full border border-stone-300 rounded p-1 text-xs text-center" />
                            </div>
                            <p className="text-[9px] text-stone-400 text-center">ошибок</p>
                          </div>
                          <button onClick={() => removeLevel(i)} className="text-red-400 text-sm">×</button>
                        </div>
                      ))}
                    </div>
                    <button onClick={addLevel} className="mt-2 w-full py-1.5 border-2 border-dashed border-stone-300 rounded-lg text-xs text-stone-500 hover:border-amber-400 hover:text-amber-700 transition">
                      + Добавить уровень
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveTemplate} className="flex-1 bg-amber-700 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-amber-800 transition shadow-md">💾 Сохранить</button>
                    <button onClick={() => setShowTemplateEditor(false)} className="px-4 py-2.5 bg-stone-200 text-stone-700 rounded-lg text-sm hover:bg-stone-300 transition">Отмена</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ежедневные задания */}
          <div className="bg-white/60 backdrop-blur rounded-3xl shadow-lg p-6 border border-amber-200/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-stone-800 flex items-center gap-2 text-lg">
                  <span>🏆</span> Ежедневные задания
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  {dailyEnabled ? "Ученики получают случайное задание каждый день" : "Включите, когда заполните банк заданий"}
                </p>
              </div>
              <button type="button" onClick={() => { setDailyEnabled(!dailyEnabled); setHasChanges(true); }} className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${dailyEnabled ? 'bg-emerald-600' : 'bg-stone-300'}`}>
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${dailyEnabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>

          {/* AI-генератор */}
          <div className="bg-white/60 backdrop-blur rounded-3xl shadow-lg p-6 border border-amber-200/50">
            <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2 text-lg">
              <span>🤖</span> AI-генератор
            </h3>
            <label className="flex items-center gap-3 mb-4 cursor-pointer">
              <input type="checkbox" checked={aiEnabled} onChange={(e) => { setAiEnabled(e.target.checked); setHasChanges(true); }} className="w-5 h-5 text-amber-600 rounded" />
              <span className="text-sm text-stone-700">Включить AI-генерацию заданий</span>
            </label>
            <div>
              <label className="text-sm font-medium text-stone-700">Креативность AI: {Math.round(aiCreativity * 100)}%</label>
              <input type="range" min="0" max="1" step="0.1" value={aiCreativity} onChange={(e) => { setAiCreativity(parseFloat(e.target.value)); setHasChanges(true); }} className="w-full mt-2 accent-amber-700" />
              <div className="flex justify-between text-xs text-stone-500 mt-1">
                <span>Точный</span><span>Креативный</span>
              </div>
            </div>
          </div>

          {/* Уведомления */}
          <div className="bg-white/60 backdrop-blur rounded-3xl shadow-lg p-6 border border-amber-200/50">
            <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2 text-lg">
              <span>🔔</span> Уведомления
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={notifyNewHw} onChange={(e) => { setNotifyNewHw(e.target.checked); setHasChanges(true); }} className="w-5 h-5 text-amber-600 rounded" />
                <span className="text-sm text-stone-700">Уведомлять о новых ДЗ</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={notifyParent} onChange={(e) => { setNotifyParent(e.target.checked); setHasChanges(true); }} className="w-5 h-5 text-amber-600 rounded" />
                <span className="text-sm text-stone-700">Уведомлять родителей</span>
              </label>
            </div>
          </div>

          {/* Контакты */}
          <div className="bg-white/60 backdrop-blur rounded-3xl shadow-lg p-6 border border-amber-200/50">
            <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2 text-lg">
              <span>📧</span> Контакты
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-stone-700">Telegram</label>
                <input value={telegram} onChange={(e) => { setTelegram(e.target.value); setHasChanges(true); }} placeholder="@username" className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition" />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700">Telegram ID</label>
                <input value={telegramId} onChange={(e) => { setTelegramId(e.target.value); setHasChanges(true); }} placeholder="123456789" className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-stone-700">WhatsApp</label>
                <input value={whatsapp} onChange={(e) => { setWhatsapp(e.target.value); setHasChanges(true); }} placeholder="+79991234567" className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition" />
              </div>
            </div>
          </div>

          {/* Шаблоны сообщений */}
          <div className="bg-white/60 backdrop-blur rounded-3xl shadow-lg p-6 border border-amber-200/50">
            <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2 text-lg">
              <span>💬</span> Шаблоны сообщений
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-stone-700">Приветственное сообщение</label>
                <textarea value={welcomeMsg} onChange={(e) => { setWelcomeMsg(e.target.value); setHasChanges(true); }} rows={2} placeholder="Добро пожаловать! Рад вас видеть..." className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition resize-none" />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700">Шаблон отчёта родителю</label>
                <textarea value={reportTemplate} onChange={(e) => { setReportTemplate(e.target.value); setHasChanges(true); }} rows={3} placeholder="Уважаемый родитель! За этот месяц..." className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition resize-none" />
              </div>
            </div>
          </div>

          {/* Внешний вид */}
          <div className="bg-white/60 backdrop-blur rounded-3xl shadow-lg p-6 border border-amber-200/50">
            <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2 text-lg">
              <span>🎨</span> Внешний вид
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-stone-700">Тема оформления</label>
                <select value={theme} onChange={(e) => { setTheme(e.target.value as any); setHasChanges(true); }} className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition">
                  <option value="light">☀️ Светлая</option>
                  <option value="dark">🌙 Тёмная</option>
                  <option value="folklore">🌲 Folklore</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700">Язык</label>
                <select value={language} onChange={(e) => { setLanguage(e.target.value); setHasChanges(true); }} className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition">
                  <option value="ru">🇷🇺 Русский</option>
                  <option value="en">🇬🇧 English</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700">Часовой пояс</label>
                <select value={timezone} onChange={(e) => { setTimezone(e.target.value); setHasChanges(true); }} className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition">
                  <option value="Europe/Moscow">Москва (UTC+3)</option>
                  <option value="Europe/Kiev">Киев (UTC+2)</option>
                  <option value="Asia/Almaty">Алматы (UTC+6)</option>
                  <option value="Asia/Vladivostok">Владивосток (UTC+10)</option>
                </select>
              </div>
            </div>
          </div>

          {/*  ЦЕНЫ И ТАРИФЫ */}
          <div className="bg-white/60 backdrop-blur rounded-3xl shadow-lg p-6 border border-amber-200/50">
            <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2 text-lg">
              <span></span> Цены и тарифы
            </h3>
            <p className="text-xs text-stone-500 mb-4">Редактируйте тарифы, контакты, FAQ и отзывы — они отображаются на странице цен</p>

            <div className="mb-6">
              <h4 className="font-bold text-sm text-stone-700 mb-2 uppercase tracking-wide">📞 Контакты для тарифов</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-stone-600">Telegram username</label>
                  <input value={pricingContacts.telegram} onChange={(e) => setPricingContacts({ ...pricingContacts, telegram: e.target.value })} placeholder="@username" className="w-full border-2 border-amber-200 rounded-xl p-2.5 text-sm mt-1 bg-white/80 focus:border-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-stone-600">Telegram ссылка</label>
                  <input value={pricingContacts.telegramLink} onChange={(e) => setPricingContacts({ ...pricingContacts, telegramLink: e.target.value })} placeholder="https://t.me/..." className="w-full border-2 border-amber-200 rounded-xl p-2.5 text-sm mt-1 bg-white/80 focus:border-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-stone-600">Email</label>
                  <input value={pricingContacts.email} onChange={(e) => setPricingContacts({ ...pricingContacts, email: e.target.value })} placeholder="email@example.com" className="w-full border-2 border-amber-200 rounded-xl p-2.5 text-sm mt-1 bg-white/80 focus:border-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-stone-600">WhatsApp</label>
                  <input value={pricingContacts.whatsapp} onChange={(e) => setPricingContacts({ ...pricingContacts, whatsapp: e.target.value })} placeholder="+79991234567" className="w-full border-2 border-amber-200 rounded-xl p-2.5 text-sm mt-1 bg-white/80 focus:border-amber-500 focus:outline-none" />
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-bold text-sm text-stone-700 mb-2 uppercase tracking-wide">🌟 Цифры (соц. доказательство)</h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-stone-500">Учеников</label>
                  <input value={pricingStats.students} onChange={(e) => setPricingStats({ ...pricingStats, students: e.target.value })} placeholder="50+" className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white" />
                </div>
                <div>
                  <label className="text-[10px] text-stone-500">Средний балл ЕГЭ</label>
                  <input value={pricingStats.avgScore} onChange={(e) => setPricingStats({ ...pricingStats, avgScore: e.target.value })} placeholder="85" className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white" />
                </div>
                <div>
                  <label className="text-[10px] text-stone-500">Рекомендуют</label>
                  <input value={pricingStats.recommend} onChange={(e) => setPricingStats({ ...pricingStats, recommend: e.target.value })} placeholder="95%" className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white" />
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-sm text-stone-700 uppercase tracking-wide">💳 Тарифы ({pricingTariffs.length})</h4>
                <button onClick={() => setPricingTariffs([...pricingTariffs, { id: `tariff_${Date.now()}`, name: "Новый тариф", lessons: 1, price: 0, pricePerLesson: 0, color: "from-pink-400 to-rose-500", badge: "", popular: false, features: ["Новая возможность"] }])} className="px-3 py-1 bg-amber-700 text-white rounded-lg text-xs font-medium hover:bg-amber-800 transition">
                  + Добавить
                </button>
              </div>
              <div className="space-y-3">
                {pricingTariffs.map((tariff, idx) => (
                  <div key={idx} className="p-4 bg-stone-50 rounded-xl border border-amber-200/50">
                    <div className="flex items-center justify-between mb-3">
                      <input value={tariff.name} onChange={(e) => { const newTariffs = [...pricingTariffs]; newTariffs[idx].name = e.target.value; setPricingTariffs(newTariffs); }} className="font-bold text-stone-800 bg-transparent border-b border-transparent hover:border-amber-300 focus:border-amber-500 focus:outline-none" />
                      <button onClick={() => setPricingTariffs(pricingTariffs.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 text-sm">🗑️</button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                      <div>
                        <label className="text-[10px] text-stone-500">Цена</label>
                        <input type="number" value={tariff.price} onChange={(e) => { const newTariffs = [...pricingTariffs]; newTariffs[idx].price = parseInt(e.target.value) || 0; setPricingTariffs(newTariffs); }} className="w-full border border-amber-200 rounded p-1 text-xs bg-white" />
                      </div>
                      <div>
                        <label className="text-[10px] text-stone-500">Занятий</label>
                        <input type="number" value={tariff.lessons} onChange={(e) => { const newTariffs = [...pricingTariffs]; newTariffs[idx].lessons = parseInt(e.target.value) || 0; setPricingTariffs(newTariffs); }} className="w-full border border-amber-200 rounded p-1 text-xs bg-white" />
                      </div>
                      <div>
                        <label className="text-[10px] text-stone-500">Бейдж</label>
                        <input value={tariff.badge || ""} onChange={(e) => { const newTariffs = [...pricingTariffs]; newTariffs[idx].badge = e.target.value; setPricingTariffs(newTariffs); }} placeholder=" Популярный" className="w-full border border-amber-200 rounded p-1 text-xs bg-white" />
                      </div>
                      <div>
                        <label className="text-[10px] text-stone-500">Популярный?</label>
                        <label className="flex items-center gap-1 mt-1">
                          <input type="checkbox" checked={tariff.popular || false} onChange={(e) => { const newTariffs = [...pricingTariffs]; newTariffs[idx].popular = e.target.checked; setPricingTariffs(newTariffs); }} className="w-4 h-4 accent-amber-600" />
                          <span className="text-xs text-stone-600">Да</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-stone-500">Возможности (каждая с новой строки)</label>
                      <textarea value={(tariff.features || []).join("\n")} onChange={(e) => { const newTariffs = [...pricingTariffs]; newTariffs[idx].features = e.target.value.split("\n").filter(f => f.trim()); setPricingTariffs(newTariffs); }} rows={3} className="w-full border border-amber-200 rounded p-1 text-xs bg-white resize-none" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-sm text-stone-700 uppercase tracking-wide">✨ Как это работает ({pricingSteps.length})</h4>
                <button onClick={() => setPricingSteps([...pricingSteps, { step: pricingSteps.length + 1, title: "Новый шаг", desc: "Описание", icon: "✨" }])} className="px-3 py-1 bg-amber-700 text-white rounded-lg text-xs font-medium hover:bg-amber-800 transition">
                  + Добавить
                </button>
              </div>
              <div className="space-y-2">
                {pricingSteps.map((step, idx) => (
                  <div key={idx} className="p-3 bg-stone-50 rounded-xl border border-amber-200/50 flex gap-2">
                    <input value={step.icon} onChange={(e) => { const newSteps = [...pricingSteps]; newSteps[idx].icon = e.target.value; setPricingSteps(newSteps); }} className="w-12 border border-amber-200 rounded p-1.5 text-xs bg-white text-center" placeholder="💝" />
                    <div className="flex-1 space-y-1">
                      <input value={step.title} onChange={(e) => { const newSteps = [...pricingSteps]; newSteps[idx].title = e.target.value; setPricingSteps(newSteps); }} placeholder="Название шага" className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white font-medium" />
                      <input value={step.desc} onChange={(e) => { const newSteps = [...pricingSteps]; newSteps[idx].desc = e.target.value; setPricingSteps(newSteps); }} placeholder="Описание" className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white" />
                    </div>
                    <button onClick={() => setPricingSteps(pricingSteps.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 text-sm self-start">🗑️</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-sm text-stone-700 uppercase tracking-wide">💝 Гарантии ({pricingGuarantees.length})</h4>
                <button onClick={() => setPricingGuarantees([...pricingGuarantees, { icon: "💕", title: "Новая гарантия", desc: "Описание" }])} className="px-3 py-1 bg-amber-700 text-white rounded-lg text-xs font-medium hover:bg-amber-800 transition">
                  + Добавить
                </button>
              </div>
              <div className="space-y-2">
                {pricingGuarantees.map((g, idx) => (
                  <div key={idx} className="p-3 bg-stone-50 rounded-xl border border-amber-200/50 flex gap-2">
                    <input value={g.icon} onChange={(e) => { const newG = [...pricingGuarantees]; newG[idx].icon = e.target.value; setPricingGuarantees(newG); }} className="w-12 border border-amber-200 rounded p-1.5 text-xs bg-white text-center" placeholder="💕" />
                    <div className="flex-1 space-y-1">
                      <input value={g.title} onChange={(e) => { const newG = [...pricingGuarantees]; newG[idx].title = e.target.value; setPricingGuarantees(newG); }} placeholder="Название гарантии" className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white font-medium" />
                      <input value={g.desc} onChange={(e) => { const newG = [...pricingGuarantees]; newG[idx].desc = e.target.value; setPricingGuarantees(newG); }} placeholder="Описание" className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white" />
                    </div>
                    <button onClick={() => setPricingGuarantees(pricingGuarantees.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 text-sm self-start">🗑️</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-sm text-stone-700 uppercase tracking-wide">💭 FAQ ({pricingFaq.length})</h4>
                <button onClick={() => setPricingFaq([...pricingFaq, { q: "Новый вопрос", a: "Ответ" }])} className="px-3 py-1 bg-amber-700 text-white rounded-lg text-xs font-medium hover:bg-amber-800 transition">
                  + Добавить
                </button>
              </div>
              <div className="space-y-2">
                {pricingFaq.map((item, idx) => (
                  <div key={idx} className="p-3 bg-stone-50 rounded-xl border border-amber-200/50 flex gap-2">
                    <div className="flex-1 space-y-2">
                      <input value={item.q} onChange={(e) => { const newFaq = [...pricingFaq]; newFaq[idx].q = e.target.value; setPricingFaq(newFaq); }} placeholder="Вопрос" className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white font-medium" />
                      <textarea value={item.a} onChange={(e) => { const newFaq = [...pricingFaq]; newFaq[idx].a = e.target.value; setPricingFaq(newFaq); }} placeholder="Ответ" rows={2} className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white resize-none" />
                    </div>
                    <button onClick={() => setPricingFaq(pricingFaq.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 text-sm self-start">🗑️</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-sm text-stone-700 uppercase tracking-wide">💌 Отзывы ({pricingTestimonials.length})</h4>
                <button onClick={() => setPricingTestimonials([...pricingTestimonials, { name: "Имя", role: "Роль", text: "Отзыв", score: null, avatar: "💐" }])} className="px-3 py-1 bg-amber-700 text-white rounded-lg text-xs font-medium hover:bg-amber-800 transition">
                  + Добавить
                </button>
              </div>
              <div className="space-y-2">
                {pricingTestimonials.map((t, idx) => (
                  <div key={idx} className="p-3 bg-stone-50 rounded-xl border border-amber-200/50">
                    <div className="flex gap-2 mb-2">
                      <input value={t.name} onChange={(e) => { const newT = [...pricingTestimonials]; newT[idx].name = e.target.value; setPricingTestimonials(newT); }} placeholder="Имя" className="flex-1 border border-amber-200 rounded p-1.5 text-xs bg-white" />
                      <input value={t.role} onChange={(e) => { const newT = [...pricingTestimonials]; newT[idx].role = e.target.value; setPricingTestimonials(newT); }} placeholder="Роль" className="flex-1 border border-amber-200 rounded p-1.5 text-xs bg-white" />
                      <input value={t.avatar} onChange={(e) => { const newT = [...pricingTestimonials]; newT[idx].avatar = e.target.value; setPricingTestimonials(newT); }} placeholder="🌸" className="w-16 border border-amber-200 rounded p-1.5 text-xs bg-white text-center" />
                      <input type="number" value={t.score || ""} onChange={(e) => { const newT = [...pricingTestimonials]; newT[idx].score = e.target.value ? parseInt(e.target.value) : null; setPricingTestimonials(newT); }} placeholder="Балл" className="w-20 border border-amber-200 rounded p-1.5 text-xs bg-white" />
                      <button onClick={() => setPricingTestimonials(pricingTestimonials.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 text-sm">🗑️</button>
                    </div>
                    <textarea value={t.text} onChange={(e) => { const newT = [...pricingTestimonials]; newT[idx].text = e.target.value; setPricingTestimonials(newT); }} placeholder="Текст отзыва" rows={2} className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white resize-none" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Экспорт/Импорт */}
          <div className="bg-white/60 backdrop-blur rounded-3xl shadow-lg p-6 border border-amber-200/50">
            <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2 text-lg">
              <span>💾</span> Резервное копирование
            </h3>
            <div className="flex flex-wrap gap-3">
              <button onClick={exportSettings} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition shadow-md">⬇️ Экспорт настроек</button>
              <button onClick={importSettings} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition shadow-md">📤 Импорт настроек</button>
              <button onClick={resetToDefaults} className="px-4 py-2 bg-stone-500 text-white rounded-xl text-sm font-medium hover:bg-stone-600 transition shadow-md">🔄 Сбросить</button>
            </div>
          </div>

          {/* Кнопка сохранения */}
          <div className="sticky bottom-4">
            <button onClick={save} disabled={saving || !hasChanges} className={`w-full py-4 rounded-2xl font-serif font-bold text-lg transition shadow-xl ${hasChanges ? 'bg-gradient-to-r from-amber-700 to-emerald-700 text-white hover:from-amber-800 hover:to-emerald-800' : 'bg-stone-300 text-stone-500 cursor-not-allowed'}`}>
              {saving ? "🌿 Сохранение..." : hasChanges ? "💾 Сохранить изменения" : "✓ Всё сохранено"}
            </button>
          </div>

          <div className="text-center py-6">
            <p className="text-stone-500 text-xs font-serif italic">
              "What are the odds that we'd meet in a forest?" 
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.4; } }
        .animate-pulse { animation: pulse 4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-100 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🌲</div>
          <p className="text-stone-600 font-serif italic">Загрузка...</p>
        </div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}