"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc, setDoc, writeBatch } from "firebase/firestore";
import toast from "react-hot-toast";
import AuthGuard from "@/components/AuthGuard";

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

  const [platformName, setPlatformName] = useState("Jenyawisch");
  const [platformLogo, setPlatformLogo] = useState("");
  const [footerText, setFooterText] = useState("© 2026 Jenyawisch. Все права защищены.");
  const [heroTitle, setHeroTitle] = useState("Революция в подготовке к ЕГЭ");
  const [heroSubtitle, setHeroSubtitle] = useState("Интерактивные задания, тренажёры ОВР, ИИ-генератор вариантов, кабинет родителя и полная аналитика — всё в одной платформе.");
  const [aboutName, setAboutName] = useState("Женя");
  const [aboutDesc, setAboutDesc] = useState("Бакалавр и магистр с профильным химическим образованием. Опыт работы в школе. Авторские материалы и собственная платформа для занятий.");

  const [egeDate, setEgeDate] = useState("2027-05-26");
  const [ogeDate, setOgeDate] = useState("2027-06-01");
  const [priceIndividualLesson, setPriceIndividualLesson] = useState(2000);
  const [priceGroupLesson, setPriceGroupLesson] = useState(1500);
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
  const [pricingStats, setPricingStats] = useState({ students: "50+", avgScore: "85", recommend: "95%" });
  const [pricingTariffs, setPricingTariffs] = useState<any[]>([]);
  const [pricingFaq, setPricingFaq] = useState<any[]>([]);
  const [pricingTestimonials, setPricingTestimonials] = useState<any[]>([]);
  const [pricingSteps, setPricingSteps] = useState<any[]>([
    { step: 1, title: "Запишитесь на пробное", desc: "Бесплатное занятие — познакомимся и определим уровень", icon: "💝" },
    { step: 2, title: "Составим план", desc: "Подберём программу под ваши цели и сроки", icon: "📝" },
    { step: 3, title: "Выберите тариф", desc: "Оплатите подходящий пакет занятий", icon: "💳" },
    { step: 4, title: "Начнём занятия", desc: "Регулярные уроки с домашними заданиями и поддержкой", icon: "" },
  ]);
  const [pricingGuarantees, setPricingGuarantees] = useState<any[]>([
    { icon: "", title: "Возврат средств", desc: "Если не понравится первое занятие — вернём 100%" },
    { icon: "", title: "Перенос занятий", desc: "Бесплатный перенос при предупреждении за 12 часов" },
    { icon: "💬", title: "Поддержка 24/7", desc: "Всегда на связи в чате для ответов на вопросы" },
    { icon: "📊", title: "Прозрачный прогресс", desc: "Еженедельные отчёты и доступ к статистике" },
  ]);

  const [allowRetakes, setAllowRetakes] = useState(true);
  const [maxRetakes, setMaxRetakes] = useState(2);
  const [maxRetakeScore, setMaxRetakeScore] = useState(80);
  const [latePenaltyEnabled, setLatePenaltyEnabled] = useState(false);
  const [latePenaltyPercent, setLatePenaltyPercent] = useState(10);
  const [gracePeriodHours, setGracePeriodHours] = useState(24);
  const [autoGradeTests, setAutoGradeTests] = useState(true);

  const [xpPerHomework, setXpPerHomework] = useState(10);
  const [xpPerfectScore, setXpPerfectScore] = useState(20);
  const [xpEarlySubmission, setXpEarlySubmission] = useState(5);
  const [xpDayStreak, setXpDayStreak] = useState(5);
  const [streakFreezeEnabled, setStreakFreezeEnabled] = useState(true);
  const [streakFreezeCost, setStreakFreezeCost] = useState(100);
  const [streakFreezeFreePerMonth, setStreakFreezeFreePerMonth] = useState(1);
  const [allowLeaderboardHide, setAllowLeaderboardHide] = useState(true);
  const [levelThresholds, setLevelThresholds] = useState<number[]>([100, 300, 600, 1000, 1500]);

  const [remindBeforeDeadline, setRemindBeforeDeadline] = useState(24);
  const [notifyParentMissed2, setNotifyParentMissed2] = useState(true);
  const [notifyParentLowScore, setNotifyParentLowScore] = useState(true);
  const [lowScoreThreshold, setLowScoreThreshold] = useState(60);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [quietHoursStart, setQuietHoursStart] = useState("21:00");
  const [quietHoursEnd, setQuietHoursEnd] = useState("08:00");
  const [autoReplyAfterSubmission, setAutoReplyAfterSubmission] = useState(true);
  const [autoReplyText, setAutoReplyText] = useState("Спасибо! Я проверю твою работу в течение 24 часов. Так держать! 🌻");

  const [autoReportEnabled, setAutoReportEnabled] = useState(false);
  const [autoReportFrequency, setAutoReportFrequency] = useState<"weekly" | "biweekly" | "monthly">("weekly");
  const [autoReportDay, setAutoReportDay] = useState("1");
  const [autoReportIncludeAttendance, setAutoReportIncludeAttendance] = useState(true);
  const [autoReportIncludeHwScores, setAutoReportIncludeHwScores] = useState(true);
  const [autoReportIncludeBalance, setAutoReportIncludeBalance] = useState(true);
  const [autoReportIncludeComment, setAutoReportIncludeComment] = useState(true);
  const [monthlyComment, setMonthlyComment] = useState("");

  const [lessonExpirationDays, setLessonExpirationDays] = useState(60);
  const [cancellationPolicyHours, setCancellationPolicyHours] = useState(12);
  const [autoRenewalOffer, setAutoRenewalOffer] = useState(true);
  const [autoRenewalThreshold, setAutoRenewalThreshold] = useState(2);
  const [currency, setCurrency] = useState("₽");
  const [thousandsSeparator, setThousandsSeparator] = useState(" ");

  const [roundingDecimals, setRoundingDecimals] = useState(2);
  const [allowCalculator, setAllowCalculator] = useState(true);
  const [allowPeriodicTable, setAllowPeriodicTable] = useState(true);

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
        setPlatformName(d.platform_name || "Jenyawisch");
        setPlatformLogo(d.platform_logo || "");
        setFooterText(d.footer_text || "© 2026 Jenyawisch. Все права защищены.");
        setHeroTitle(d.hero_title || "Революция в подготовке к ЕГЭ");
        setHeroSubtitle(d.hero_subtitle || "Интерактивные задания, тренажёры ОВР, ИИ-генератор вариантов...");
        setAboutName(d.about_name || "Женя");
        setAboutDesc(d.about_desc || "Бакалавр и магистр с профильным химическим образованием...");
        
        setEgeDate(d.ege_date || "2027-05-26");
        setOgeDate(d.oge_date || "2027-06-01");
        setPriceIndividualLesson(d.price_individual_lesson || d.price_per_lesson || 2000);
        setPriceGroupLesson(d.price_group_lesson || 1500);
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
        
        setAllowRetakes(d.allow_retakes !== false);
        setMaxRetakes(d.max_retakes || 2);
        setMaxRetakeScore(d.max_retake_score || 80);
        setLatePenaltyEnabled(d.late_penalty_enabled || false);
        setLatePenaltyPercent(d.late_penalty_percent || 10);
        setGracePeriodHours(d.grace_period_hours || 24);
        setAutoGradeTests(d.auto_grade_tests !== false);
        
        setXpPerHomework(d.xp_per_homework || 10);
        setXpPerfectScore(d.xp_perfect_score || 20);
        setXpEarlySubmission(d.xp_early_submission || 5);
        setXpDayStreak(d.xp_day_streak || 5);
        setStreakFreezeEnabled(d.streak_freeze_enabled !== false);
        setStreakFreezeCost(d.streak_freeze_cost || 100);
        setStreakFreezeFreePerMonth(d.streak_freeze_free_per_month || 1);
        setAllowLeaderboardHide(d.allow_leaderboard_hide !== false);
        setLevelThresholds(d.level_thresholds || [100, 300, 600, 1000, 1500]);
        
        setRemindBeforeDeadline(d.remind_before_deadline || 24);
        setNotifyParentMissed2(d.notify_parent_missed_2 !== false);
        setNotifyParentLowScore(d.notify_parent_low_score !== false);
        setLowScoreThreshold(d.low_score_threshold || 60);
        setQuietHoursEnabled(d.quiet_hours_enabled !== false);
        setQuietHoursStart(d.quiet_hours_start || "21:00");
        setQuietHoursEnd(d.quiet_hours_end || "08:00");
        setAutoReplyAfterSubmission(d.auto_reply_after_submission !== false);
        setAutoReplyText(d.auto_reply_text || "Спасибо! Я проверю твою работу в течение 24 часов. Так держать! ");
        
        setAutoReportEnabled(d.auto_report_enabled || false);
        setAutoReportFrequency(d.auto_report_frequency || "weekly");
        setAutoReportDay(d.auto_report_day || "1");
        setAutoReportIncludeAttendance(d.auto_report_include_attendance !== false);
        setAutoReportIncludeHwScores(d.auto_report_include_hw_scores !== false);
        setAutoReportIncludeBalance(d.auto_report_include_balance !== false);
        setAutoReportIncludeComment(d.auto_report_include_comment !== false);
        setMonthlyComment(d.monthly_comment || "");
        
        setLessonExpirationDays(d.lesson_expiration_days || 60);
        setCancellationPolicyHours(d.cancellation_policy_hours || 12);
        setAutoRenewalOffer(d.auto_renewal_offer !== false);
        setAutoRenewalThreshold(d.auto_renewal_threshold || 2);
        setCurrency(d.currency || "₽");
        setThousandsSeparator(d.thousands_separator || " ");
        
        setRoundingDecimals(d.rounding_decimals || 2);
        setAllowCalculator(d.allow_calculator !== false);
        setAllowPeriodicTable(d.allow_periodic_table !== false);
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
      const batch = writeBatch(db);

      const globalRef = doc(db, "settings", "global");
      batch.set(globalRef, {
        platform_name: platformName, platform_logo: platformLogo, footer_text: footerText,
        hero_title: heroTitle, hero_subtitle: heroSubtitle,
        about_name: aboutName, about_desc: aboutDesc,
        ege_date: egeDate, oge_date: ogeDate,
        price_individual_lesson: priceIndividualLesson,
        price_group_lesson: priceGroupLesson,
        price_trial: priceTrial,
        duration, break_time: breakTime, work_days: workDays,
        remind_before: remindBefore, notify_new_hw: notifyNewHw,
        notify_parent: notifyParent, daily_enabled: dailyEnabled,
        telegram, telegram_id: telegramId, whatsapp,
        welcome_msg: welcomeMsg, report_template: reportTemplate,
        theme, language, timezone,
        grading_templates: gradingTemplates,
        trial_duration: trialDuration, trial_questions: trialQuestions,
        auto_save: autoSave, ai_enabled: aiEnabled, ai_creativity: aiCreativity,
        allow_retakes: allowRetakes, max_retakes: maxRetakes, max_retake_score: maxRetakeScore,
        late_penalty_enabled: latePenaltyEnabled, late_penalty_percent: latePenaltyPercent,
        grace_period_hours: gracePeriodHours, auto_grade_tests: autoGradeTests,
        xp_per_homework: xpPerHomework, xp_perfect_score: xpPerfectScore,
        xp_early_submission: xpEarlySubmission, xp_day_streak: xpDayStreak,
        streak_freeze_enabled: streakFreezeEnabled, streak_freeze_cost: streakFreezeCost,
        streak_freeze_free_per_month: streakFreezeFreePerMonth,
        allow_leaderboard_hide: allowLeaderboardHide, level_thresholds: levelThresholds,
        remind_before_deadline: remindBeforeDeadline,
        notify_parent_missed_2: notifyParentMissed2,
        notify_parent_low_score: notifyParentLowScore,
        low_score_threshold: lowScoreThreshold,
        quiet_hours_enabled: quietHoursEnabled,
        quiet_hours_start: quietHoursStart, quiet_hours_end: quietHoursEnd,
        auto_reply_after_submission: autoReplyAfterSubmission,
        auto_reply_text: autoReplyText,
        auto_report_enabled: autoReportEnabled,
        auto_report_frequency: autoReportFrequency,
        auto_report_day: autoReportDay,
        auto_report_include_attendance: autoReportIncludeAttendance,
        auto_report_include_hw_scores: autoReportIncludeHwScores,
        auto_report_include_balance: autoReportIncludeBalance,
        auto_report_include_comment: autoReportIncludeComment,
        monthly_comment: monthlyComment,
        lesson_expiration_days: lessonExpirationDays,
        cancellation_policy_hours: cancellationPolicyHours,
        auto_renewal_offer: autoRenewalOffer,
        auto_renewal_threshold: autoRenewalThreshold,
        currency, thousands_separator: thousandsSeparator,
        rounding_decimals: roundingDecimals,
        allow_calculator: allowCalculator,
        allow_periodic_table: allowPeriodicTable,
        updated_at: new Date().toISOString(),
      }, { merge: true });

      const pricingRef = doc(db, "settings", "pricing");
      batch.set(pricingRef, {
        contacts: pricingContacts, stats: pricingStats,
        tariffs: pricingTariffs, faq: pricingFaq,
        testimonials: pricingTestimonials, steps: pricingSteps,
        guarantees: pricingGuarantees, updated_at: new Date().toISOString(),
      }, { merge: true });

      const profileRef = doc(db, "profiles", uid);
      batch.update(profileRef, {
        price_per_lesson: priceIndividualLesson,
        daily_enabled: dailyEnabled,
        theme,
      });

      await batch.commit();
      setHasChanges(false);
      toast.success("🌿 Все настройки надёжно сохранены!");
    } catch (error: any) {
      console.error("Ошибка сохранения:", error);
      toast.error(`Ошибка: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  function exportSettings() {
    const settings = {
      platform_name: platformName, platform_logo: platformLogo, footer_text: footerText,
      hero_title: heroTitle, hero_subtitle: heroSubtitle,
      about_name: aboutName, about_desc: aboutDesc,
      ege_date: egeDate, oge_date: ogeDate,
      price_individual_lesson: priceIndividualLesson,
      price_group_lesson: priceGroupLesson,
      price_trial: priceTrial,
      duration, break_time: breakTime, work_days: workDays,
      remind_before: remindBefore, notify_new_hw: notifyNewHw,
      notify_parent: notifyParent, daily_enabled: dailyEnabled,
      telegram, whatsapp, welcome_msg: welcomeMsg,
      report_template: reportTemplate, theme, language, timezone,
      grading_templates: gradingTemplates,
      allow_retakes: allowRetakes, max_retakes: maxRetakes, max_retake_score: maxRetakeScore,
      late_penalty_enabled: latePenaltyEnabled, late_penalty_percent: latePenaltyPercent,
      grace_period_hours: gracePeriodHours, auto_grade_tests: autoGradeTests,
      xp_per_homework: xpPerHomework, xp_perfect_score: xpPerfectScore,
      xp_early_submission: xpEarlySubmission, xp_day_streak: xpDayStreak,
      streak_freeze_enabled: streakFreezeEnabled, streak_freeze_cost: streakFreezeCost,
      streak_freeze_free_per_month: streakFreezeFreePerMonth,
      allow_leaderboard_hide: allowLeaderboardHide, level_thresholds: levelThresholds,
      remind_before_deadline: remindBeforeDeadline,
      notify_parent_missed_2: notifyParentMissed2,
      notify_parent_low_score: notifyParentLowScore,
      low_score_threshold: lowScoreThreshold,
      quiet_hours_enabled: quietHoursEnabled,
      quiet_hours_start: quietHoursStart, quiet_hours_end: quietHoursEnd,
      auto_reply_after_submission: autoReplyAfterSubmission,
      auto_reply_text: autoReplyText,
      auto_report_enabled: autoReportEnabled,
      auto_report_frequency: autoReportFrequency,
      auto_report_day: autoReportDay,
      auto_report_include_attendance: autoReportIncludeAttendance,
      auto_report_include_hw_scores: autoReportIncludeHwScores,
      auto_report_include_balance: autoReportIncludeBalance,
      auto_report_include_comment: autoReportIncludeComment,
      monthly_comment: monthlyComment,
      lesson_expiration_days: lessonExpirationDays,
      cancellation_policy_hours: cancellationPolicyHours,
      auto_renewal_offer: autoRenewalOffer,
      auto_renewal_threshold: autoRenewalThreshold,
      currency, thousands_separator: thousandsSeparator,
      rounding_decimals: roundingDecimals,
      allow_calculator: allowCalculator,
      allow_periodic_table: allowPeriodicTable,
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
          if (settings.hero_title) setHeroTitle(settings.hero_title);
          if (settings.hero_subtitle) setHeroSubtitle(settings.hero_subtitle);
          if (settings.about_name) setAboutName(settings.about_name);
          if (settings.about_desc) setAboutDesc(settings.about_desc);
          if (settings.ege_date) setEgeDate(settings.ege_date);
          if (settings.price_individual_lesson) setPriceIndividualLesson(settings.price_individual_lesson);
          if (settings.price_group_lesson) setPriceGroupLesson(settings.price_group_lesson);
          if (settings.duration) setDuration(settings.duration);
          if (settings.work_days) setWorkDays(settings.work_days);
          if (settings.theme) setTheme(settings.theme);
          if (settings.grading_templates) setGradingTemplates(settings.grading_templates);
          if (settings.ai_creativity !== undefined) setAiCreativity(settings.ai_creativity);
          if (settings.allow_retakes !== undefined) setAllowRetakes(settings.allow_retakes);
          if (settings.xp_per_homework) setXpPerHomework(settings.xp_per_homework);
          if (settings.lesson_expiration_days) setLessonExpirationDays(settings.lesson_expiration_days);
          if (settings.platform_name) setPlatformName(settings.platform_name);
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
          toast.success("📤 Настройки импортированы! Не забудьте нажать 'Сохранить изменения'.");
        } catch { toast.error("Ошибка: неверный формат файла"); }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function resetToDefaults() {
    if (!confirm("Сбросить все настройки к значениям по умолчанию?")) return;
    setPlatformName("Jenyawisch"); setPlatformLogo("");
    setFooterText("© 2026 Jenyawisch. Все права защищены.");
    setHeroTitle("Революция в подготовке к ЕГЭ");
    setHeroSubtitle("Интерактивные задания, тренажёры ОВР, ИИ-генератор вариантов...");
    setAboutName("Женя");
    setAboutDesc("Бакалавр и магистр с профильным химическим образованием...");
    
    setEgeDate("2027-05-26"); setOgeDate("2027-06-01");
    setPriceIndividualLesson(2000); setPriceGroupLesson(1500); setPriceTrial(0);
    setDuration(60); setBreakTime(10);
    setWorkDays(["1", "2", "3", "4", "5"]);
    setRemindBefore(30); setNotifyNewHw(true);
    setNotifyParent(true); setDailyEnabled(false);
    setTheme("folklore"); setLanguage("ru");
    setTimezone("Europe/Moscow");
    setAllowRetakes(true); setMaxRetakes(2); setMaxRetakeScore(80);
    setLatePenaltyEnabled(false); setLatePenaltyPercent(10);
    setAutoGradeTests(true);
    setXpPerHomework(10); setXpPerfectScore(20);
    setXpEarlySubmission(5); setXpDayStreak(5);
    setStreakFreezeEnabled(true); setStreakFreezeCost(100);
    setAllowLeaderboardHide(true);
    setLevelThresholds([100, 300, 600, 1000, 1500]);
    setRemindBeforeDeadline(24);
    setNotifyParentMissed2(true); setNotifyParentLowScore(true);
    setLowScoreThreshold(60);
    setQuietHoursEnabled(true); setQuietHoursStart("21:00"); setQuietHoursEnd("08:00");
    setAutoReplyAfterSubmission(true);
    setAutoReplyText("Спасибо! Я проверю твою работу в течение 24 часов. Так держать! 🌻");
    setAutoReportEnabled(false); setAutoReportFrequency("weekly");
    setLessonExpirationDays(60); setCancellationPolicyHours(12);
    setAutoRenewalOffer(true); setAutoRenewalThreshold(2);
    setCurrency("₽"); setThousandsSeparator(" ");
    setRoundingDecimals(2); setAllowCalculator(true); setAllowPeriodicTable(true);
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
        <div className="absolute top-1/3 right-1/4 text-6xl">🦌</div>
        <div className="absolute bottom-1/3 left-1/4 text-6xl">🌾</div>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 relative z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-4xl">🌲</span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-800">Настройки платформы</h1>
            <span className="text-4xl">🍂</span>
          </div>
          <p className="text-stone-600 font-serif italic text-sm">
            "I'm doing good, I'm on some new shit" 🌾
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-white/60 backdrop-blur rounded-3xl shadow-lg p-6 border border-amber-200/50">
            <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2 text-lg">
              <span>🎨</span> Брендинг платформы
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-stone-700">Название платформы</label>
                <input value={platformName} onChange={(e) => { setPlatformName(e.target.value); setHasChanges(true); }} className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition" />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700">Логотип (URL)</label>
                <input value={platformLogo} onChange={(e) => { setPlatformLogo(e.target.value); setHasChanges(true); }} placeholder="https://..." className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition" />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700">Текст в подвале сайта</label>
                <input value={footerText} onChange={(e) => { setFooterText(e.target.value); setHasChanges(true); }} className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition" />
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur rounded-3xl shadow-lg p-6 border border-amber-200/50">
            <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2 text-lg">
              <span>🎯</span> Главный экран лендинга (Hero)
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-stone-700">Главный заголовок</label>
                <input value={heroTitle} onChange={(e) => { setHeroTitle(e.target.value); setHasChanges(true); }} className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition" />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700">Подзаголовок</label>
                <textarea value={heroSubtitle} onChange={(e) => { setHeroSubtitle(e.target.value); setHasChanges(true); }} rows={3} className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition resize-none" />
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur rounded-3xl shadow-lg p-6 border border-amber-200/50">
            <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2 text-lg">
              <span>👩‍🏫</span> Блок "Обо мне" на лендинге
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-stone-700">Имя</label>
                <input value={aboutName} onChange={(e) => { setAboutName(e.target.value); setHasChanges(true); }} className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition" />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700">Описание / Биография</label>
                <textarea value={aboutDesc} onChange={(e) => { setAboutDesc(e.target.value); setHasChanges(true); }} rows={4} className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition resize-none" />
              </div>
            </div>
          </div>

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

          <div className="bg-white/60 backdrop-blur rounded-3xl shadow-lg p-6 border border-amber-200/50">
            <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2 text-lg">
              <span>💰</span> Финансы и цены
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-stone-700"> Цена индив. занятия (₽)</label>
                <input type="number" value={priceIndividualLesson} onChange={(e) => { setPriceIndividualLesson(parseInt(e.target.value) || 0); setHasChanges(true); }} min={0} className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition" />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700"> Цена групп. занятия (₽)</label>
                <input type="number" value={priceGroupLesson} onChange={(e) => { setPriceGroupLesson(parseInt(e.target.value) || 0); setHasChanges(true); }} min={0} className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition" />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700">🎁 Цена пробного (₽)</label>
                <input type="number" value={priceTrial} onChange={(e) => { setPriceTrial(parseInt(e.target.value) || 0); setHasChanges(true); }} min={0} className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs text-stone-600">Срок действия занятий (дней)</label>
                <input type="number" value={lessonExpirationDays} onChange={(e) => { setLessonExpirationDays(parseInt(e.target.value) || 60); setHasChanges(true); }} min={7} max={365} className="w-full border-2 border-amber-200 rounded-lg p-2 mt-1 text-sm bg-white/80" />
              </div>
              <div>
                <label className="text-xs text-stone-600">Политика отмены (часов)</label>
                <input type="number" value={cancellationPolicyHours} onChange={(e) => { setCancellationPolicyHours(parseInt(e.target.value) || 12); setHasChanges(true); }} min={1} max={72} className="w-full border-2 border-amber-200 rounded-lg p-2 mt-1 text-sm bg-white/80" />
              </div>
              <div>
                <label className="text-xs text-stone-600">Валюта</label>
                <input value={currency} onChange={(e) => { setCurrency(e.target.value); setHasChanges(true); }} className="w-full border-2 border-amber-200 rounded-lg p-2 mt-1 text-sm bg-white/80" />
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={autoRenewalOffer} onChange={(e) => { setAutoRenewalOffer(e.target.checked); setHasChanges(true); }} className="w-5 h-5 text-amber-600 rounded" />
              <span className="text-sm text-stone-700">Предлагать авто-продление при остатке ≤ {autoRenewalThreshold} занятий</span>
            </label>
          </div>

          <div className="bg-white/60 backdrop-blur rounded-3xl shadow-lg p-6 border border-amber-200/50">
            <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2 text-lg">
              <span>📅</span> Расписание
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-stone-700">Длительность (мин)</label>
                <input type="number" value={duration} onChange={(e) => { setDuration(parseInt(e.target.value) || 60); setHasChanges(true); }} min={15} max={180} className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition" />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700">Перерыв (мин)</label>
                <input type="number" value={breakTime} onChange={(e) => { setBreakTime(parseInt(e.target.value) || 10); setHasChanges(true); }} min={0} max={60} className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition" />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700">Напоминание (мин)</label>
                <input type="number" value={remindBefore} onChange={(e) => { setRemindBefore(parseInt(e.target.value) || 30); setHasChanges(true); }} min={0} max={1440} className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition" />
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

          <div className="bg-white/60 backdrop-blur rounded-3xl shadow-lg p-6 border border-amber-200/50">
            <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2 text-lg">
              <span>📋</span> Академические правила
            </h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={allowRetakes} onChange={(e) => { setAllowRetakes(e.target.checked); setHasChanges(true); }} className="w-5 h-5 text-amber-600 rounded" />
                <span className="text-sm text-stone-700">Разрешить пересдачу домашних заданий</span>
              </label>
              {allowRetakes && (
                <div className="grid grid-cols-2 gap-4 ml-8">
                  <div>
                    <label className="text-xs text-stone-600">Макс. попыток</label>
                    <input type="number" value={maxRetakes} onChange={(e) => { setMaxRetakes(parseInt(e.target.value) || 2); setHasChanges(true); }} min={1} max={5} className="w-full border-2 border-amber-200 rounded-lg p-2 mt-1 text-sm bg-white/80" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-600">Макс. балл при пересдаче (%)</label>
                    <input type="number" value={maxRetakeScore} onChange={(e) => { setMaxRetakeScore(parseInt(e.target.value) || 80); setHasChanges(true); }} min={0} max={100} className="w-full border-2 border-amber-200 rounded-lg p-2 mt-1 text-sm bg-white/80" />
                  </div>
                </div>
              )}
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={latePenaltyEnabled} onChange={(e) => { setLatePenaltyEnabled(e.target.checked); setHasChanges(true); }} className="w-5 h-5 text-amber-600 rounded" />
                <span className="text-sm text-stone-700">Снимать баллы за просрочку</span>
              </label>
              {latePenaltyEnabled && (
                <div className="grid grid-cols-2 gap-4 ml-8">
                  <div>
                    <label className="text-xs text-stone-600">Штраф (% за день)</label>
                    <input type="number" value={latePenaltyPercent} onChange={(e) => { setLatePenaltyPercent(parseInt(e.target.value) || 10); setHasChanges(true); }} min={0} max={100} className="w-full border-2 border-amber-200 rounded-lg p-2 mt-1 text-sm bg-white/80" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-600">Льготный период (часы)</label>
                    <input type="number" value={gracePeriodHours} onChange={(e) => { setGracePeriodHours(parseInt(e.target.value) || 24); setHasChanges(true); }} min={0} className="w-full border-2 border-amber-200 rounded-lg p-2 mt-1 text-sm bg-white/80" />
                  </div>
                </div>
              )}
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={autoGradeTests} onChange={(e) => { setAutoGradeTests(e.target.checked); setHasChanges(true); }} className="w-5 h-5 text-amber-600 rounded" />
                <span className="text-sm text-stone-700">Автопроверка тестовых заданий (один/несколько вариантов)</span>
              </label>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur rounded-3xl shadow-lg p-6 border border-amber-200/50">
            <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2 text-lg">
              <span>🎮</span> Геймификация и XP
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="text-xs text-stone-600">XP за ДЗ</label>
                <input type="number" value={xpPerHomework} onChange={(e) => { setXpPerHomework(parseInt(e.target.value) || 10); setHasChanges(true); }} min={0} className="w-full border-2 border-amber-200 rounded-lg p-2 mt-1 text-sm bg-white/80" />
              </div>
              <div>
                <label className="text-xs text-stone-600">XP за 100%</label>
                <input type="number" value={xpPerfectScore} onChange={(e) => { setXpPerfectScore(parseInt(e.target.value) || 20); setHasChanges(true); }} min={0} className="w-full border-2 border-amber-200 rounded-lg p-2 mt-1 text-sm bg-white/80" />
              </div>
              <div>
                <label className="text-xs text-stone-600">XP за сдачу вовремя</label>
                <input type="number" value={xpEarlySubmission} onChange={(e) => { setXpEarlySubmission(parseInt(e.target.value) || 5); setHasChanges(true); }} min={0} className="w-full border-2 border-amber-200 rounded-lg p-2 mt-1 text-sm bg-white/80" />
              </div>
              <div>
                <label className="text-xs text-stone-600">XP за день стрика</label>
                <input type="number" value={xpDayStreak} onChange={(e) => { setXpDayStreak(parseInt(e.target.value) || 5); setHasChanges(true); }} min={0} className="w-full border-2 border-amber-200 rounded-lg p-2 mt-1 text-sm bg-white/80" />
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer mb-3">
              <input type="checkbox" checked={streakFreezeEnabled} onChange={(e) => { setStreakFreezeEnabled(e.target.checked); setHasChanges(true); }} className="w-5 h-5 text-amber-600 rounded" />
              <span className="text-sm text-stone-700">Разрешить заморозку стрика</span>
            </label>
            {streakFreezeEnabled && (
              <div className="grid grid-cols-2 gap-4 ml-8 mb-3">
                <div>
                  <label className="text-xs text-stone-600">Стоимость (XP)</label>
                  <input type="number" value={streakFreezeCost} onChange={(e) => { setStreakFreezeCost(parseInt(e.target.value) || 100); setHasChanges(true); }} min={0} className="w-full border-2 border-amber-200 rounded-lg p-2 mt-1 text-sm bg-white/80" />
                </div>
                <div>
                  <label className="text-xs text-stone-600">Бесплатно в месяц</label>
                  <input type="number" value={streakFreezeFreePerMonth} onChange={(e) => { setStreakFreezeFreePerMonth(parseInt(e.target.value) || 1); setHasChanges(true); }} min={0} className="w-full border-2 border-amber-200 rounded-lg p-2 mt-1 text-sm bg-white/80" />
                </div>
              </div>
            )}
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={allowLeaderboardHide} onChange={(e) => { setAllowLeaderboardHide(e.target.checked); setHasChanges(true); }} className="w-5 h-5 text-amber-600 rounded" />
              <span className="text-sm text-stone-700">Разрешить ученикам скрывать себя из рейтинга</span>
            </label>
          </div>

          <div className="bg-white/60 backdrop-blur rounded-3xl shadow-lg p-6 border border-amber-200/50">
            <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2 text-lg">
              <span>🔔</span> Умные уведомления
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-stone-600">Напоминание о ДЗ за (часов)</label>
                <input type="number" value={remindBeforeDeadline} onChange={(e) => { setRemindBeforeDeadline(parseInt(e.target.value) || 24); setHasChanges(true); }} min={1} className="w-full border-2 border-amber-200 rounded-lg p-2 mt-1 text-sm bg-white/80" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={notifyParentMissed2} onChange={(e) => { setNotifyParentMissed2(e.target.checked); setHasChanges(true); }} className="w-5 h-5 text-amber-600 rounded" />
                <span className="text-sm text-stone-700">Уведомлять родителей при 2 пропущенных занятиях подряд</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={notifyParentLowScore} onChange={(e) => { setNotifyParentLowScore(e.target.checked); setHasChanges(true); }} className="w-5 h-5 text-amber-600 rounded" />
                <span className="text-sm text-stone-700">Уведомлять родителей при оценке ниже {lowScoreThreshold}%</span>
              </label>
              {notifyParentLowScore && (
                <div className="ml-8">
                  <label className="text-xs text-stone-600">Порог низкой оценки (%)</label>
                  <input type="number" value={lowScoreThreshold} onChange={(e) => { setLowScoreThreshold(parseInt(e.target.value) || 60); setHasChanges(true); }} min={0} max={100} className="w-full border-2 border-amber-200 rounded-lg p-2 mt-1 text-sm bg-white/80" />
                </div>
              )}
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={quietHoursEnabled} onChange={(e) => { setQuietHoursEnabled(e.target.checked); setHasChanges(true); }} className="w-5 h-5 text-amber-600 rounded" />
                <span className="text-sm text-stone-700">Тихие часы (не беспокоить)</span>
              </label>
              {quietHoursEnabled && (
                <div className="grid grid-cols-2 gap-4 ml-8">
                  <div>
                    <label className="text-xs text-stone-600">С</label>
                    <input type="time" value={quietHoursStart} onChange={(e) => { setQuietHoursStart(e.target.value); setHasChanges(true); }} className="w-full border-2 border-amber-200 rounded-lg p-2 mt-1 text-sm bg-white/80" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-600">До</label>
                    <input type="time" value={quietHoursEnd} onChange={(e) => { setQuietHoursEnd(e.target.value); setHasChanges(true); }} className="w-full border-2 border-amber-200 rounded-lg p-2 mt-1 text-sm bg-white/80" />
                  </div>
                </div>
              )}
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={autoReplyAfterSubmission} onChange={(e) => { setAutoReplyAfterSubmission(e.target.checked); setHasChanges(true); }} className="w-5 h-5 text-amber-600 rounded" />
                <span className="text-sm text-stone-700">Автоответ после сдачи ДЗ</span>
              </label>
              {autoReplyAfterSubmission && (
                <textarea value={autoReplyText} onChange={(e) => { setAutoReplyText(e.target.value); setHasChanges(true); }} rows={2} className="w-full border-2 border-amber-200 rounded-lg p-2 mt-1 text-sm bg-white/80 ml-8" />
              )}
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur rounded-3xl shadow-lg p-6 border border-amber-200/50">
            <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2 text-lg">
              <span>📊</span> Автоотчёты родителям
            </h3>
            <label className="flex items-center gap-3 cursor-pointer mb-4">
              <input type="checkbox" checked={autoReportEnabled} onChange={(e) => { setAutoReportEnabled(e.target.checked); setHasChanges(true); }} className="w-5 h-5 text-amber-600 rounded" />
              <span className="text-sm text-stone-700">Включить автоматические отчёты</span>
            </label>
            {autoReportEnabled && (
              <div className="space-y-4 ml-8">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-stone-600">Частота</label>
                    <select value={autoReportFrequency} onChange={(e) => { setAutoReportFrequency(e.target.value as any); setHasChanges(true); }} className="w-full border-2 border-amber-200 rounded-lg p-2 mt-1 text-sm bg-white/80">
                      <option value="weekly">Еженедельно</option>
                      <option value="biweekly">Раз в 2 недели</option>
                      <option value="monthly">Ежемесячно</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-stone-600">День отправки</label>
                    <select value={autoReportDay} onChange={(e) => { setAutoReportDay(e.target.value); setHasChanges(true); }} className="w-full border-2 border-amber-200 rounded-lg p-2 mt-1 text-sm bg-white/80">
                      <option value="1">Понедельник</option>
                      <option value="3">Среда</option>
                      <option value="5">Пятница</option>
                      <option value="7">Воскресенье</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={autoReportIncludeAttendance} onChange={(e) => { setAutoReportIncludeAttendance(e.target.checked); setHasChanges(true); }} className="w-4 h-4 text-amber-600 rounded" />
                    <span className="text-sm text-stone-700">Посещаемость</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={autoReportIncludeHwScores} onChange={(e) => { setAutoReportIncludeHwScores(e.target.checked); setHasChanges(true); }} className="w-4 h-4 text-amber-600 rounded" />
                    <span className="text-sm text-stone-700">Оценки за ДЗ</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={autoReportIncludeBalance} onChange={(e) => { setAutoReportIncludeBalance(e.target.checked); setHasChanges(true); }} className="w-4 h-4 text-amber-600 rounded" />
                    <span className="text-sm text-stone-700">Остаток занятий</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={autoReportIncludeComment} onChange={(e) => { setAutoReportIncludeComment(e.target.checked); setHasChanges(true); }} className="w-4 h-4 text-amber-600 rounded" />
                    <span className="text-sm text-stone-700">Комментарий репетитора</span>
                  </label>
                </div>
                {autoReportIncludeComment && (
                  <div>
                    <label className="text-xs text-stone-600">Шаблон комментария (можно менять каждый месяц)</label>
                    <textarea value={monthlyComment} onChange={(e) => { setMonthlyComment(e.target.value); setHasChanges(true); }} rows={3} placeholder="В этом месяце ученик показал отличный прогресс..." className="w-full border-2 border-amber-200 rounded-lg p-2 mt-1 text-sm bg-white/80" />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white/60 backdrop-blur rounded-3xl shadow-lg p-6 border border-amber-200/50">
            <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2 text-lg">
              <span>🧪</span> Специфика Химии/Биологии
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs text-stone-600">Знаков после запятой</label>
                <input type="number" value={roundingDecimals} onChange={(e) => { setRoundingDecimals(parseInt(e.target.value) || 2); setHasChanges(true); }} min={0} max={5} className="w-full border-2 border-amber-200 rounded-lg p-2 mt-1 text-sm bg-white/80" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={allowCalculator} onChange={(e) => { setAllowCalculator(e.target.checked); setHasChanges(true); }} className="w-5 h-5 text-amber-600 rounded" />
                <span className="text-sm text-stone-700">Разрешить калькулятор на пробниках</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={allowPeriodicTable} onChange={(e) => { setAllowPeriodicTable(e.target.checked); setHasChanges(true); }} className="w-5 h-5 text-amber-600 rounded" />
                <span className="text-sm text-stone-700">Разрешить таблицу Менделеева на пробниках</span>
              </label>
            </div>
          </div>

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

          <div className="bg-white/60 backdrop-blur rounded-3xl shadow-lg p-6 border border-amber-200/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif font-bold text-stone-800 flex items-center gap-2 text-lg">
                <span></span> Шаблоны критериев
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
                      <button onClick={() => openTemplateEditor(i)} className="text-amber-700 hover:text-amber-900 text-xs">️</button>
                      <button onClick={() => deleteTemplate(i)} className="text-red-400 hover:text-red-600 text-xs">️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {showTemplateEditor && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md border-2 border-amber-200">
                <h3 className="font-serif font-bold text-lg mb-4 text-stone-800">
                  {editingTemplateIndex !== null ? "️ Редактировать шаблон" : " Новый шаблон"}
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

          <div className="bg-white/60 backdrop-blur rounded-3xl shadow-lg p-6 border border-amber-200/50">
            <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2 text-lg">
              <span></span> Базовые уведомления
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

          <div className="bg-white/60 backdrop-blur rounded-3xl shadow-lg p-6 border border-amber-200/50">
            <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2 text-lg">
              <span></span> Внешний вид
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-stone-700">Тема оформления</label>
                <select value={theme} onChange={(e) => { setTheme(e.target.value as any); setHasChanges(true); }} className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition">
                  <option value="light">☀️ Светлая</option>
                  <option value="dark">🌙 Тёмная</option>
                  <option value="folklore"> Folklore</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700">Язык</label>
                <select value={language} onChange={(e) => { setLanguage(e.target.value); setHasChanges(true); }} className="w-full border-2 border-amber-200 rounded-xl p-2.5 mt-1 text-sm bg-white/80 focus:border-amber-500 focus:outline-none transition">
                  <option value="ru">🇷🇺 Русский</option>
                  <option value="en">🇧 English</option>
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

          <div className="bg-white/60 backdrop-blur rounded-3xl shadow-lg p-6 border border-amber-200/50">
            <h3 className="font-serif font-bold text-stone-800 mb-2 flex items-center gap-2 text-lg">
              <span>💳</span> Цены и тарифы (для страницы выбора тарифов)
            </h3>
            <p className="text-xs text-stone-500 mb-4 bg-amber-50 p-2 rounded-lg border border-amber-200">
              💡 <b>Важно:</b> Эти тарифы отображаются на странице цен, где ученики могут переключаться между "Индивидуальными" и "Групповыми" занятиями. Убедитесь, что добавили тарифы для обоих типов.
            </p>

            <div className="mb-6">
              <h4 className="font-bold text-sm text-stone-700 mb-2 uppercase tracking-wide">📞 Контакты для тарифов</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-stone-600">Telegram username</label>
                  <input value={pricingContacts.telegram} onChange={(e) => { setPricingContacts({ ...pricingContacts, telegram: e.target.value }); setHasChanges(true); }} placeholder="@username" className="w-full border-2 border-amber-200 rounded-xl p-2.5 text-sm mt-1 bg-white/80 focus:border-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-stone-600">Telegram ссылка</label>
                  <input value={pricingContacts.telegramLink} onChange={(e) => { setPricingContacts({ ...pricingContacts, telegramLink: e.target.value }); setHasChanges(true); }} placeholder="https://t.me/..." className="w-full border-2 border-amber-200 rounded-xl p-2.5 text-sm mt-1 bg-white/80 focus:border-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-stone-600">Email</label>
                  <input value={pricingContacts.email} onChange={(e) => { setPricingContacts({ ...pricingContacts, email: e.target.value }); setHasChanges(true); }} placeholder="email@example.com" className="w-full border-2 border-amber-200 rounded-xl p-2.5 text-sm mt-1 bg-white/80 focus:border-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-stone-600">WhatsApp</label>
                  <input value={pricingContacts.whatsapp} onChange={(e) => { setPricingContacts({ ...pricingContacts, whatsapp: e.target.value }); setHasChanges(true); }} placeholder="+79991234567" className="w-full border-2 border-amber-200 rounded-xl p-2.5 text-sm mt-1 bg-white/80 focus:border-amber-500 focus:outline-none" />
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-bold text-sm text-stone-700 mb-2 uppercase tracking-wide">🌟 Цифры (соц. доказательство)</h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-stone-500">Учеников</label>
                  <input value={pricingStats.students} onChange={(e) => { setPricingStats({ ...pricingStats, students: e.target.value }); setHasChanges(true); }} placeholder="50+" className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white" />
                </div>
                <div>
                  <label className="text-[10px] text-stone-500">Средний балл ЕГЭ</label>
                  <input value={pricingStats.avgScore} onChange={(e) => { setPricingStats({ ...pricingStats, avgScore: e.target.value }); setHasChanges(true); }} placeholder="85" className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white" />
                </div>
                <div>
                  <label className="text-[10px] text-stone-500">Рекомендуют</label>
                  <input value={pricingStats.recommend} onChange={(e) => { setPricingStats({ ...pricingStats, recommend: e.target.value }); setHasChanges(true); }} placeholder="95%" className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white" />
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-sm text-stone-700 uppercase tracking-wide"> Тарифы ({pricingTariffs.length})</h4>
                <button onClick={() => { setPricingTariffs([...pricingTariffs, { id: `tariff_${Date.now()}`, name: "Новый тариф", lessons: 1, price: 0, pricePerLesson: 0, color: "from-pink-400 to-rose-500", badge: "", popular: false, features: ["Новая возможность"] }]); setHasChanges(true); }} className="px-3 py-1 bg-amber-700 text-white rounded-lg text-xs font-medium hover:bg-amber-800 transition">
                  + Добавить
                </button>
              </div>
              <div className="space-y-3">
                {pricingTariffs.map((tariff, idx) => (
                  <div key={idx} className="p-4 bg-stone-50 rounded-xl border border-amber-200/50">
                    <div className="flex items-center justify-between mb-3">
                      <input value={tariff.name} onChange={(e) => { const newTariffs = [...pricingTariffs]; newTariffs[idx].name = e.target.value; setPricingTariffs(newTariffs); setHasChanges(true); }} className="font-bold text-stone-800 bg-transparent border-b border-transparent hover:border-amber-300 focus:border-amber-500 focus:outline-none" />
                      <button onClick={() => { setPricingTariffs(pricingTariffs.filter((_, i) => i !== idx)); setHasChanges(true); }} className="text-red-400 hover:text-red-600 text-sm">️</button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                      <div>
                        <label className="text-[10px] text-stone-500">Цена</label>
                        <input type="number" value={tariff.price} onChange={(e) => { const newTariffs = [...pricingTariffs]; newTariffs[idx].price = parseInt(e.target.value) || 0; setPricingTariffs(newTariffs); setHasChanges(true); }} className="w-full border border-amber-200 rounded p-1 text-xs bg-white" />
                      </div>
                      <div>
                        <label className="text-[10px] text-stone-500">Занятий</label>
                        <input type="number" value={tariff.lessons} onChange={(e) => { const newTariffs = [...pricingTariffs]; newTariffs[idx].lessons = parseInt(e.target.value) || 0; setPricingTariffs(newTariffs); setHasChanges(true); }} className="w-full border border-amber-200 rounded p-1 text-xs bg-white" />
                      </div>
                      <div>
                        <label className="text-[10px] text-stone-500">Бейдж</label>
                        <input value={tariff.badge || ""} onChange={(e) => { const newTariffs = [...pricingTariffs]; newTariffs[idx].badge = e.target.value; setPricingTariffs(newTariffs); setHasChanges(true); }} placeholder=" Популярный" className="w-full border border-amber-200 rounded p-1 text-xs bg-white" />
                      </div>
                      <div>
                        <label className="text-[10px] text-stone-500">Популярный?</label>
                        <label className="flex items-center gap-1 mt-1">
                          <input type="checkbox" checked={tariff.popular || false} onChange={(e) => { const newTariffs = [...pricingTariffs]; newTariffs[idx].popular = e.target.checked; setPricingTariffs(newTariffs); setHasChanges(true); }} className="w-4 h-4 accent-amber-600" />
                          <span className="text-xs text-stone-600">Да</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-stone-500">Возможности (каждая с новой строки)</label>
                      <textarea value={(tariff.features || []).join("\n")} onChange={(e) => { const newTariffs = [...pricingTariffs]; newTariffs[idx].features = e.target.value.split("\n").filter((f: string) => f.trim()); setPricingTariffs(newTariffs); setHasChanges(true); }} rows={3} className="w-full border border-amber-200 rounded p-1 text-xs bg-white resize-none" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-sm text-stone-700 uppercase tracking-wide">✨ Как это работает ({pricingSteps.length})</h4>
                <button onClick={() => { setPricingSteps([...pricingSteps, { step: pricingSteps.length + 1, title: "Новый шаг", desc: "Описание", icon: "✨" }]); setHasChanges(true); }} className="px-3 py-1 bg-amber-700 text-white rounded-lg text-xs font-medium hover:bg-amber-800 transition">
                  + Добавить
                </button>
              </div>
              <div className="space-y-2">
                {pricingSteps.map((step, idx) => (
                  <div key={idx} className="p-3 bg-stone-50 rounded-xl border border-amber-200/50 flex gap-2">
                    <input value={step.icon} onChange={(e) => { const newSteps = [...pricingSteps]; newSteps[idx].icon = e.target.value; setPricingSteps(newSteps); setHasChanges(true); }} className="w-12 border border-amber-200 rounded p-1.5 text-xs bg-white text-center" placeholder="💝" />
                    <div className="flex-1 space-y-1">
                      <input value={step.title} onChange={(e) => { const newSteps = [...pricingSteps]; newSteps[idx].title = e.target.value; setPricingSteps(newSteps); setHasChanges(true); }} placeholder="Название шага" className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white font-medium" />
                      <input value={step.desc} onChange={(e) => { const newSteps = [...pricingSteps]; newSteps[idx].desc = e.target.value; setPricingSteps(newSteps); setHasChanges(true); }} placeholder="Описание" className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white" />
                    </div>
                    <button onClick={() => { setPricingSteps(pricingSteps.filter((_, i) => i !== idx)); setHasChanges(true); }} className="text-red-400 hover:text-red-600 text-sm self-start">️</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-sm text-stone-700 uppercase tracking-wide">💝 Гарантии ({pricingGuarantees.length})</h4>
                <button onClick={() => { setPricingGuarantees([...pricingGuarantees, { icon: "💕", title: "Новая гарантия", desc: "Описание" }]); setHasChanges(true); }} className="px-3 py-1 bg-amber-700 text-white rounded-lg text-xs font-medium hover:bg-amber-800 transition">
                  + Добавить
                </button>
              </div>
              <div className="space-y-2">
                {pricingGuarantees.map((g, idx) => (
                  <div key={idx} className="p-3 bg-stone-50 rounded-xl border border-amber-200/50 flex gap-2">
                    <input value={g.icon} onChange={(e) => { const newG = [...pricingGuarantees]; newG[idx].icon = e.target.value; setPricingGuarantees(newG); setHasChanges(true); }} className="w-12 border border-amber-200 rounded p-1.5 text-xs bg-white text-center" placeholder="💕" />
                    <div className="flex-1 space-y-1">
                      <input value={g.title} onChange={(e) => { const newG = [...pricingGuarantees]; newG[idx].title = e.target.value; setPricingGuarantees(newG); setHasChanges(true); }} placeholder="Название гарантии" className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white font-medium" />
                      <input value={g.desc} onChange={(e) => { const newG = [...pricingGuarantees]; newG[idx].desc = e.target.value; setPricingGuarantees(newG); setHasChanges(true); }} placeholder="Описание" className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white" />
                    </div>
                    <button onClick={() => { setPricingGuarantees(pricingGuarantees.filter((_, i) => i !== idx)); setHasChanges(true); }} className="text-red-400 hover:text-red-600 text-sm self-start">🗑️</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-sm text-stone-700 uppercase tracking-wide"> FAQ ({pricingFaq.length})</h4>
                <button onClick={() => { setPricingFaq([...pricingFaq, { q: "Новый вопрос", a: "Ответ" }]); setHasChanges(true); }} className="px-3 py-1 bg-amber-700 text-white rounded-lg text-xs font-medium hover:bg-amber-800 transition">
                  + Добавить
                </button>
              </div>
              <div className="space-y-2">
                {pricingFaq.map((item, idx) => (
                  <div key={idx} className="p-3 bg-stone-50 rounded-xl border border-amber-200/50 flex gap-2">
                    <div className="flex-1 space-y-2">
                      <input value={item.q} onChange={(e) => { const newFaq = [...pricingFaq]; newFaq[idx].q = e.target.value; setPricingFaq(newFaq); setHasChanges(true); }} placeholder="Вопрос" className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white font-medium" />
                      <textarea value={item.a} onChange={(e) => { const newFaq = [...pricingFaq]; newFaq[idx].a = e.target.value; setPricingFaq(newFaq); setHasChanges(true); }} placeholder="Ответ" rows={2} className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white resize-none" />
                    </div>
                    <button onClick={() => { setPricingFaq(pricingFaq.filter((_, i) => i !== idx)); setHasChanges(true); }} className="text-red-400 hover:text-red-600 text-sm self-start">️</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-sm text-stone-700 uppercase tracking-wide">💌 Отзывы ({pricingTestimonials.length})</h4>
                <button onClick={() => { setPricingTestimonials([...pricingTestimonials, { name: "Имя", role: "Роль", text: "Отзыв", score: null, avatar: "💐" }]); setHasChanges(true); }} className="px-3 py-1 bg-amber-700 text-white rounded-lg text-xs font-medium hover:bg-amber-800 transition">
                  + Добавить
                </button>
              </div>
              <div className="space-y-2">
                {pricingTestimonials.map((t, idx) => (
                  <div key={idx} className="p-3 bg-stone-50 rounded-xl border border-amber-200/50">
                    <div className="flex gap-2 mb-2">
                      <input value={t.name} onChange={(e) => { const newT = [...pricingTestimonials]; newT[idx].name = e.target.value; setPricingTestimonials(newT); setHasChanges(true); }} placeholder="Имя" className="flex-1 border border-amber-200 rounded p-1.5 text-xs bg-white" />
                      <input value={t.role} onChange={(e) => { const newT = [...pricingTestimonials]; newT[idx].role = e.target.value; setPricingTestimonials(newT); setHasChanges(true); }} placeholder="Роль" className="flex-1 border border-amber-200 rounded p-1.5 text-xs bg-white" />
                      <input value={t.avatar} onChange={(e) => { const newT = [...pricingTestimonials]; newT[idx].avatar = e.target.value; setPricingTestimonials(newT); setHasChanges(true); }} placeholder="🌸" className="w-16 border border-amber-200 rounded p-1.5 text-xs bg-white text-center" />
                      <input type="number" value={t.score || ""} onChange={(e) => { const newT = [...pricingTestimonials]; newT[idx].score = e.target.value ? parseInt(e.target.value) : null; setPricingTestimonials(newT); setHasChanges(true); }} placeholder="Балл" className="w-20 border border-amber-200 rounded p-1.5 text-xs bg-white" />
                      <button onClick={() => { setPricingTestimonials(pricingTestimonials.filter((_, i) => i !== idx)); setHasChanges(true); }} className="text-red-400 hover:text-red-600 text-sm">🗑️</button>
                    </div>
                    <textarea value={t.text} onChange={(e) => { const newT = [...pricingTestimonials]; newT[idx].text = e.target.value; setPricingTestimonials(newT); setHasChanges(true); }} placeholder="Текст отзыва" rows={2} className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white resize-none" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur rounded-3xl shadow-lg p-6 border border-amber-200/50">
            <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2 text-lg">
              <span>💾</span> Резервное копирование
            </h3>
            <div className="flex flex-wrap gap-3">
              <button onClick={exportSettings} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition shadow-md">️ Экспорт настроек</button>
              <button onClick={importSettings} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition shadow-md">📤 Импорт настроек</button>
              <button onClick={resetToDefaults} className="px-4 py-2 bg-stone-500 text-white rounded-xl text-sm font-medium hover:bg-stone-600 transition shadow-md">🔄 Сбросить</button>
            </div>
          </div>

          <div className="sticky bottom-4">
            <button onClick={save} disabled={saving || !hasChanges} className={`w-full py-4 rounded-2xl font-serif font-bold text-lg transition shadow-xl ${hasChanges ? 'bg-gradient-to-r from-amber-700 to-emerald-700 text-white hover:from-amber-800 hover:to-emerald-800' : 'bg-stone-300 text-stone-500 cursor-not-allowed'}`}>
              {saving ? "🌿 Сохранение..." : hasChanges ? "🍂 Сохранить изменения" : "✓ Всё сохранено"}
            </button>
          </div>

          <div className="text-center py-6">
            <p className="text-stone-500 text-xs font-serif italic">
              "What are the odds that we'd meet in a forest?" 🌲
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
    <AuthGuard requiredRole="tutor">
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
    </AuthGuard>
  );
}