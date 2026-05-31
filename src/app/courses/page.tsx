"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function CoursesContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || "";
  const role = searchParams.get("role") || "tutor";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/dashboard?uid=${uid}&role=${role}`} className="text-indigo-600 hover:text-indigo-800 transition font-medium">← Назад</Link>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-violet-500 to-purple-500 bg-clip-text text-transparent">📚 Курсы</h1>
          <div></div>
        </div>
        <div className="text-center py-16 bg-white/80 rounded-3xl">
          <p className="text-6xl mb-4">🚧</p>
          <p className="text-gray-500 text-lg">Раздел в разработке</p>
        </div>
      </div>
    </div>
  );
}

export default function CoursesPage() {
  return (<Suspense fallback={<div className="min-h-screen flex items-center justify-center">Загрузка...</div>}><CoursesContent /></Suspense>);
}