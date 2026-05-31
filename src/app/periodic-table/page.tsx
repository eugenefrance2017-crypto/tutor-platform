"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// Таблица Менделеева (упрощённая)
const ELEMENTS = [
  { n: 1, sym: "H", name: "Водород", group: 1, period: 1, color: "bg-blue-100" },
  { n: 2, sym: "He", name: "Гелий", group: 18, period: 1, color: "bg-purple-100" },
  { n: 3, sym: "Li", name: "Литий", group: 1, period: 2, color: "bg-red-100" },
  { n: 4, sym: "Be", name: "Бериллий", group: 2, period: 2, color: "bg-green-100" },
  { n: 5, sym: "B", name: "Бор", group: 13, period: 2, color: "bg-yellow-100" },
  { n: 6, sym: "C", name: "Углерод", group: 14, period: 2, color: "bg-gray-100" },
  { n: 7, sym: "N", name: "Азот", group: 15, period: 2, color: "bg-blue-50" },
  { n: 8, sym: "O", name: "Кислород", group: 16, period: 2, color: "bg-red-50" },
  { n: 9, sym: "F", name: "Фтор", group: 17, period: 2, color: "bg-amber-100" },
  { n: 10, sym: "Ne", name: "Неон", group: 18, period: 2, color: "bg-purple-100" },
  { n: 11, sym: "Na", name: "Натрий", group: 1, period: 3, color: "bg-red-100" },
  { n: 12, sym: "Mg", name: "Магний", group: 2, period: 3, color: "bg-green-100" },
  { n: 13, sym: "Al", name: "Алюминий", group: 13, period: 3, color: "bg-yellow-100" },
  { n: 14, sym: "Si", name: "Кремний", group: 14, period: 3, color: "bg-gray-100" },
  { n: 15, sym: "P", name: "Фосфор", group: 15, period: 3, color: "bg-blue-50" },
  { n: 16, sym: "S", name: "Сера", group: 16, period: 3, color: "bg-red-50" },
  { n: 17, sym: "Cl", name: "Хлор", group: 17, period: 3, color: "bg-amber-100" },
  { n: 18, sym: "Ar", name: "Аргон", group: 18, period: 3, color: "bg-purple-100" },
  { n: 19, sym: "K", name: "Калий", group: 1, period: 4, color: "bg-red-100" },
  { n: 20, sym: "Ca", name: "Кальций", group: 2, period: 4, color: "bg-green-100" },
  { n: 26, sym: "Fe", name: "Железо", group: 8, period: 4, color: "bg-amber-200" },
  { n: 29, sym: "Cu", name: "Медь", group: 11, period: 4, color: "bg-orange-200" },
  { n: 30, sym: "Zn", name: "Цинк", group: 12, period: 4, color: "bg-gray-200" },
  { n: 35, sym: "Br", name: "Бром", group: 17, period: 4, color: "bg-amber-100" },
  { n: 47, sym: "Ag", name: "Серебро", group: 11, period: 5, color: "bg-gray-200" },
  { n: 53, sym: "I", name: "Йод", group: 17, period: 5, color: "bg-amber-100" },
  { n: 56, sym: "Ba", name: "Барий", group: 2, period: 6, color: "bg-green-100" },
  { n: 79, sym: "Au", name: "Золото", group: 11, period: 6, color: "bg-yellow-200" },
  { n: 80, sym: "Hg", name: "Ртуть", group: 12, period: 6, color: "bg-gray-200" },
];

// Таблица растворимости
const SOLUBILITY: { cation: string; anions: Record<string, string> }[] = [
  { cation: "H⁺", anions: { "OH⁻": "Р", "Cl⁻": "Р", "SO₄²⁻": "Р", "CO₃²⁻": "Р", "PO₄³⁻": "Р", "S²⁻": "Р" } },
  { cation: "Na⁺", anions: { "OH⁻": "Р", "Cl⁻": "Р", "SO₄²⁻": "Р", "CO₃²⁻": "Р", "PO₄³⁻": "Р", "S²⁻": "Р" } },
  { cation: "K⁺", anions: { "OH⁻": "Р", "Cl⁻": "Р", "SO₄²⁻": "Р", "CO₃²⁻": "Р", "PO₄³⁻": "Р", "S²⁻": "Р" } },
  { cation: "Ca²⁺", anions: { "OH⁻": "М", "Cl⁻": "Р", "SO₄²⁻": "М", "CO₃²⁻": "Н", "PO₄³⁻": "Н", "S²⁻": "Р" } },
  { cation: "Ba²⁺", anions: { "OH⁻": "Р", "Cl⁻": "Р", "SO₄²⁻": "Н", "CO₃²⁻": "Н", "PO₄³⁻": "Н", "S²⁻": "Р" } },
  { cation: "Al³⁺", anions: { "OH⁻": "Н", "Cl⁻": "Р", "SO₄²⁻": "Р", "CO₃²⁻": "—", "PO₄³⁻": "Н", "S²⁻": "—" } },
  { cation: "Fe²⁺", anions: { "OH⁻": "Н", "Cl⁻": "Р", "SO₄²⁻": "Р", "CO₃²⁻": "Н", "PO₄³⁻": "Н", "S²⁻": "Н" } },
  { cation: "Fe³⁺", anions: { "OH⁻": "Н", "Cl⁻": "Р", "SO₄²⁻": "Р", "CO₃²⁻": "—", "PO₄³⁻": "Н", "S²⁻": "—" } },
  { cation: "Cu²⁺", anions: { "OH⁻": "Н", "Cl⁻": "Р", "SO₄²⁻": "Р", "CO₃²⁻": "Н", "PO₄³⁻": "Н", "S²⁻": "Н" } },
  { cation: "Zn²⁺", anions: { "OH⁻": "Н", "Cl⁻": "Р", "SO₄²⁻": "Р", "CO₃²⁻": "Н", "PO₄³⁻": "Н", "S²⁻": "Н" } },
  { cation: "Ag⁺", anions: { "OH⁻": "—", "Cl⁻": "Н", "SO₄²⁻": "М", "CO₃²⁻": "Н", "PO₄³⁻": "Н", "S²⁻": "Н" } },
  { cation: "Mg²⁺", anions: { "OH⁻": "Н", "Cl⁻": "Р", "SO₄²⁻": "Р", "CO₃²⁻": "Н", "PO₄³⁻": "Н", "S²⁻": "Р" } },
];

const ANION_NAMES: Record<string, string> = { "OH⁻": "OH⁻", "Cl⁻": "Cl⁻", "SO₄²⁻": "SO₄²⁻", "CO₃²⁻": "CO₃²⁻", "PO₄³⁻": "PO₄³⁻", "S²⁻": "S²⁻" };

const SOLUBILITY_COLORS: Record<string, string> = {
  "Р": "bg-emerald-100 text-emerald-800 font-bold",
  "М": "bg-amber-100 text-amber-800 font-medium",
  "Н": "bg-red-100 text-red-800 font-bold",
  "—": "bg-gray-50 text-gray-300",
};

function PeriodicTableContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || "";
  const role = searchParams.get("role") || "tutor";
  const [tab, setTab] = useState<"periodic" | "solubility">("periodic");
  const [selected, setSelected] = useState<any>(null);

  const groups = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
  const periods = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/dashboard?uid=${uid}&role=${role}`} className="text-indigo-600 hover:text-indigo-800 transition font-medium">← Назад</Link>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-emerald-500 bg-clip-text text-transparent">🧪 Справочные таблицы</h1>
          <div></div>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab("periodic")} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab === "periodic" ? "bg-indigo-500 text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}>📊 Таблица Менделеева</button>
          <button onClick={() => setTab("solubility")} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab === "solubility" ? "bg-indigo-500 text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}>🧪 Растворимость</button>
        </div>

        {tab === "periodic" && (
          <div className="bg-white/90 backdrop-blur rounded-3xl shadow-xl p-4 sm:p-6 border border-white overflow-x-auto">
            <h2 className="font-bold text-lg mb-4 text-gray-800">📊 Периодическая система элементов</h2>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(18, minmax(44px, 1fr))` }}>
              {periods.map((period) => (
                groups.map((group) => {
                  const el = ELEMENTS.find(e => e.group === group && e.period === period);
                  if (!el) {
                    // Пустые ячейки для лантаноидов/актиноидов
                    if ((period === 6 && group === 3) || (period === 7 && group === 3)) {
                      return <div key={`${period}-${group}`} className="h-12 flex items-center justify-center text-xs text-gray-300">*</div>;
                    }
                    return <div key={`${period}-${group}`} />;
                  }
                  return (
                    <button key={el.n} onClick={() => setSelected(el)} className={`h-12 ${el.color} rounded-lg flex flex-col items-center justify-center text-xs font-bold hover:scale-110 hover:shadow-lg hover:z-10 transition-all cursor-pointer ${selected?.n === el.n ? 'ring-2 ring-indigo-500 scale-110 shadow-lg z-10' : ''}`}>
                      <span className="text-[10px] text-gray-400">{el.n}</span>
                      <span className="text-sm">{el.sym}</span>
                    </button>
                  );
                })
              ))}
            </div>
            {selected && (
              <div className="mt-4 p-4 bg-indigo-50 rounded-2xl">
                <p className="font-bold text-lg">{selected.sym} — {selected.name}</p>
                <p className="text-sm text-gray-600">№{selected.n} • Группа {selected.group} • Период {selected.period}</p>
              </div>
            )}
          </div>
        )}

        {tab === "solubility" && (
          <div className="bg-white/90 backdrop-blur rounded-3xl shadow-xl p-4 sm:p-6 border border-white overflow-x-auto">
            <h2 className="font-bold text-lg mb-4 text-gray-800">🧪 Таблица растворимости</h2>
            <div className="text-xs mb-4 flex gap-4">
              <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-emerald-100 inline-block" /> Р — растворимо</span>
              <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-amber-100 inline-block" /> М — малорастворимо</span>
              <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-red-100 inline-block" /> Н — нерастворимо</span>
              <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-gray-50 inline-block" /> — — разлагается</span>
            </div>
            <table className="w-full border-collapse text-xs sm:text-sm">
              <thead>
                <tr>
                  <th className="border p-2 bg-gray-50 sticky left-0 z-10">Катион ↓ / Анион →</th>
                  {Object.keys(ANION_NAMES).map((a) => <th key={a} className="border p-2 bg-gray-50">{ANION_NAMES[a]}</th>)}
                </tr>
              </thead>
              <tbody>
                {SOLUBILITY.map((row) => (
                  <tr key={row.cation}>
                    <td className="border p-2 font-bold bg-gray-50 sticky left-0">{row.cation}</td>
                    {Object.keys(row.anions).map((a) => (
                      <td key={a} className={`border p-2 text-center ${SOLUBILITY_COLORS[row.anions[a]] || ''}`}>{row.anions[a]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PeriodicTablePage() {
  return (<Suspense fallback={<div className="min-h-screen flex items-center justify-center">Загрузка...</div>}><PeriodicTableContent /></Suspense>);
}