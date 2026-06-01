"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function CoursesContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student";
  const isTutor = role === "tutor";

  const courses = [
    { id: "chem-ege", title: "Химия ЕГЭ", desc: "Полный курс подготовки к ЕГЭ по химии", lessons: 68, icon: "🧪", color: "from-indigo-500 to-blue-500", bg: "bg-indigo-50" },
    { id: "chem-oge", title: "Химия ОГЭ", desc: "Подготовка к ОГЭ по химии", lessons: 34, icon: "⚗️", color: "from-indigo-400 to-cyan-500", bg: "bg-cyan-50" },
    { id: "bio-ege", title: "Биология ЕГЭ", desc: "Полный курс подготовки к ЕГЭ по биологии", lessons: 72, icon: "🧬", color: "from-emerald-500 to-green-500", bg: "bg-emerald-50" },
    { id: "bio-oge", title: "Биология ОГЭ", desc: "Подготовка к ОГЭ по биологии", lessons: 36, icon: "🌿", color: "from-emerald-400 to-teal-500", bg: "bg-teal-50" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/dashboard?uid=${uid}&role=${role}`} className="text-indigo-600 hover:text-indigo-800 transition font-medium">← Назад</Link>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-500 bg-clip-text text-transparent">📚 Курсы</h1>
          <div></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {courses.map((course) => (
            <Link key={course.id} href={`/course/${course.id}?uid=${uid}&role=${role}`} className={`${course.bg} backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group`}>
              <div className="flex items-start justify-between mb-4">
                <span className="text-5xl group-hover:scale-110 transition-transform duration-300">{course.icon}</span>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full bg-gradient-to-r ${course.color} text-white`}>{course.lessons} уроков</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800">{course.title}</h2>
              <p className="text-gray-500 mt-2 text-sm">{course.desc}</p>
              <div className={`mt-4 h-1 rounded-full bg-gradient-to-r ${course.color} w-0 group-hover:w-full transition-all duration-500`} />
            </Link>
          ))}
        </div>

        {isTutor && (
          <div className="mt-8 bg-white/80 backdrop-blur rounded-2xl p-6 border border-white shadow-lg">
            <h3 className="font-bold text-gray-800 mb-4">📝 Создать новый курс</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input placeholder="Название курса" className="border rounded-xl p-3 text-sm" />
              <input placeholder="Предмет" className="border rounded-xl p-3 text-sm" />
              <input placeholder="Количество уроков" type="number" className="border rounded-xl p-3 text-sm" />
              <button className="bg-indigo-500 text-white rounded-xl p-3 text-sm font-medium hover:bg-indigo-600 transition">Создать</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CoursesPage() {
  return (<Suspense fallback={<div className="min-h-screen flex items-center justify-center">Загрузка...</div>}><CoursesContent /></Suspense>);
}