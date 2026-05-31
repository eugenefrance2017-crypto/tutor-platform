"use client";

import { useState } from "react";

// ОФИЦИАЛЬНАЯ ТАБЛИЦА РАСТВОРИМОСТИ ЕГЭ
const ANIONS = ["OH⁻", "F⁻", "Cl⁻", "Br⁻", "I⁻", "S²⁻", "SO₃²⁻", "SO₄²⁻", "NO₃⁻", "CO₃²⁻", "SiO₃²⁻", "PO₄³⁻", "CH₃COO⁻"];

const SOLUBILITY_ROWS = [
  { ion: "H⁺",        vals: "Р Р Р Р Р Р Р Р Р Р Н Р Р" },
  { ion: "Li⁺",       vals: "Р М Р Р Р Р Р Р Р Р Р Р Р" },
  { ion: "Na⁺",       vals: "Р Р Р Р Р Р Р Р Р Р Р Р Р" },
  { ion: "K⁺",        vals: "Р Р Р Р Р Р Р Р Р Р Р Р Р" },
  { ion: "Rb⁺",       vals: "Р Р Р Р Р Р Р Р Р Р Р Р Р" },
  { ion: "Cs⁺",       vals: "Р Р Р Р Р Р Р Р Р Р Р Р Р" },
  { ion: "NH₄⁺",      vals: "Р Р Р Р Р Р Р Р Р Р Р Р Р" },
  { ion: "Be²⁺",      vals: "Н Р Р Р Р — Р Р Р — Р Н Р" },
  { ion: "Mg²⁺",      vals: "Н М Р Р Р — Р Р Р Н Н Н Р" },
  { ion: "Ca²⁺",      vals: "М Н Р Р Р М М М Р Н Н Н Р" },
  { ion: "Sr²⁺",      vals: "М Р Р Р Р Р М М Р Н Н Н Р" },
  { ion: "Ba²⁺",      vals: "Р М Р Р Р Р Н Н Р Н Н Н Р" },
  { ion: "Al³⁺",      vals: "Н Р Р Р Р — — Р Р — Н Н М" },
  { ion: "Cr³⁺",      vals: "Н Р Р Р Р — — Р Р — Н Н Р" },
  { ion: "Fe²⁺",      vals: "Н Р Р Р Р Н Н Р Р Н Н Н Р" },
  { ion: "Fe³⁺",      vals: "Н Р Р Р Р — — Р Р — Н Н Р" },
  { ion: "Mn²⁺",      vals: "Н Р Р Р Р Н Н Р Р Н Н Н Р" },
  { ion: "Zn²⁺",      vals: "Н Р Р Р Р Н Н Р Р Н Н Н Р" },
  { ion: "Cu²⁺",      vals: "Н Р Р Р — Н Н Р Р Н Н Н Р" },
  { ion: "Ag⁺",       vals: "— Р Н Н Н Н Н М Р Н Н Н М" },
  { ion: "Hg²⁺",      vals: "— Р М Н Н Н Н М Р — Н Н Р" },
  { ion: "Pb²⁺",      vals: "Н М М М Н Н Н Н Р Н Н Н Р" },
  { ion: "Sn²⁺",      vals: "Н Р Р Р Р Н — Р Р — Н Н Р" },
];

// Цвета осадков
const PRECIPITATE_COLORS: Record<string, { bg: string; name: string; hex: string; equation?: string }> = {
  "Ag⁺_Cl⁻": { bg: "bg-white border-2 border-gray-400", name: "Белый творожистый", hex: "#ffffff", equation: "Ag⁺ + Cl⁻ → AgCl↓" },
  "Ag⁺_Br⁻": { bg: "bg-amber-100", name: "Светло-жёлтый", hex: "#fef3c7", equation: "Ag⁺ + Br⁻ → AgBr↓" },
  "Ag⁺_I⁻": { bg: "bg-yellow-300", name: "Жёлтый", hex: "#fde047", equation: "Ag⁺ + I⁻ → AgI↓" },
  "Ag⁺_S²⁻": { bg: "bg-gray-900", name: "Чёрный", hex: "#111827", equation: "2Ag⁺ + S²⁻ → Ag₂S↓" },
  "Ag⁺_SO₄²⁻": { bg: "bg-gray-100", name: "Белый (малораств.)", hex: "#f3f4f6", equation: "2Ag⁺ + SO₄²⁻ ⇌ Ag₂SO₄↓" },
  "Ag⁺_CO₃²⁻": { bg: "bg-amber-50", name: "Желтоватый", hex: "#fffbeb", equation: "2Ag⁺ + CO₃²⁻ → Ag₂CO₃↓" },
  "Ag⁺_PO₄³⁻": { bg: "bg-yellow-200", name: "Жёлтый", hex: "#fef08a", equation: "3Ag⁺ + PO₄³⁻ → Ag₃PO₄↓" },
  "Ba²⁺_SO₄²⁻": { bg: "bg-white border-2 border-gray-400", name: "Белый", hex: "#ffffff", equation: "Ba²⁺ + SO₄²⁻ → BaSO₄↓" },
  "Ba²⁺_CO₃²⁻": { bg: "bg-white border-2 border-gray-400", name: "Белый", hex: "#ffffff", equation: "Ba²⁺ + CO₃²⁻ → BaCO₃↓" },
  "Ba²⁺_PO₄³⁻": { bg: "bg-white border-2 border-gray-400", name: "Белый", hex: "#ffffff", equation: "3Ba²⁺ + 2PO₄³⁻ → Ba₃(PO₄)₂↓" },
  "Ca²⁺_OH⁻": { bg: "bg-gray-100", name: "Белый (малораств.)", hex: "#f3f4f6", equation: "Ca²⁺ + 2OH⁻ ⇌ Ca(OH)₂↓" },
  "Ca²⁺_CO₃²⁻": { bg: "bg-white border-2 border-gray-400", name: "Белый (мел, мрамор)", hex: "#ffffff", equation: "Ca²⁺ + CO₃²⁻ → CaCO₃↓" },
  "Ca²⁺_PO₄³⁻": { bg: "bg-white border-2 border-gray-400", name: "Белый", hex: "#ffffff", equation: "3Ca²⁺ + 2PO₄³⁻ → Ca₃(PO₄)₂↓" },
  "Ca²⁺_SO₄²⁻": { bg: "bg-gray-100", name: "Белый (малораств.)", hex: "#f3f4f6", equation: "Ca²⁺ + SO₄²⁻ ⇌ CaSO₄↓" },
  "Mg²⁺_OH⁻": { bg: "bg-white border-2 border-gray-400", name: "Белый", hex: "#ffffff", equation: "Mg²⁺ + 2OH⁻ → Mg(OH)₂↓" },
  "Mg²⁺_CO₃²⁻": { bg: "bg-white border-2 border-gray-400", name: "Белый", hex: "#ffffff", equation: "Mg²⁺ + CO₃²⁻ → MgCO₃↓" },
  "Al³⁺_OH⁻": { bg: "bg-white border-2 border-gray-400", name: "Белый студенистый", hex: "#ffffff", equation: "Al³⁺ + 3OH⁻ → Al(OH)₃↓" },
  "Fe²⁺_OH⁻": { bg: "bg-gray-400", name: "Серо-зелёный", hex: "#9ca3af", equation: "Fe²⁺ + 2OH⁻ → Fe(OH)₂↓" },
  "Fe²⁺_S²⁻": { bg: "bg-gray-900", name: "Чёрный", hex: "#111827", equation: "Fe²⁺ + S²⁻ → FeS↓" },
  "Fe³⁺_OH⁻": { bg: "bg-orange-700", name: "Красно-бурый (ржавчина)", hex: "#c2410c", equation: "Fe³⁺ + 3OH⁻ → Fe(OH)₃↓" },
  "Cu²⁺_OH⁻": { bg: "bg-blue-400", name: "Голубой (синий)", hex: "#60a5fa", equation: "Cu²⁺ + 2OH⁻ → Cu(OH)₂↓" },
  "Cu²⁺_S²⁻": { bg: "bg-gray-900", name: "Чёрный", hex: "#111827", equation: "Cu²⁺ + S²⁻ → CuS↓" },
  "Cu²⁺_CO₃²⁻": { bg: "bg-emerald-400", name: "Зелёный (малахит)", hex: "#34d399", equation: "2Cu²⁺ + 2CO₃²⁻ + H₂O → (CuOH)₂CO₃↓ + CO₂↑" },
  "Zn²⁺_OH⁻": { bg: "bg-white border-2 border-gray-400", name: "Белый", hex: "#ffffff", equation: "Zn²⁺ + 2OH⁻ → Zn(OH)₂↓" },
  "Zn²⁺_S²⁻": { bg: "bg-white border-2 border-gray-400", name: "Белый", hex: "#ffffff", equation: "Zn²⁺ + S²⁻ → ZnS↓" },
  "Pb²⁺_S²⁻": { bg: "bg-gray-900", name: "Чёрный", hex: "#111827", equation: "Pb²⁺ + S²⁻ → PbS↓" },
  "Pb²⁺_I⁻": { bg: "bg-yellow-400", name: "Золотисто-жёлтый", hex: "#facc15", equation: "Pb²⁺ + 2I⁻ → PbI₂↓" },
  "Pb²⁺_SO₄²⁻": { bg: "bg-white border-2 border-gray-400", name: "Белый", hex: "#ffffff", equation: "Pb²⁺ + SO₄²⁻ → PbSO₄↓" },
  "Pb²⁺_Cl⁻": { bg: "bg-white border-2 border-gray-400", name: "Белый (малораств.)", hex: "#ffffff", equation: "Pb²⁺ + 2Cl⁻ ⇌ PbCl₂↓" },
  "Hg²⁺_S²⁻": { bg: "bg-gray-900", name: "Чёрный (киноварь)", hex: "#111827", equation: "Hg²⁺ + S²⁻ → HgS↓" },
  "Hg²⁺_I⁻": { bg: "bg-red-500", name: "Красный", hex: "#ef4444", equation: "Hg²⁺ + 2I⁻ → HgI₂↓" },
  "Mn²⁺_OH⁻": { bg: "bg-pink-200", name: "Розовый", hex: "#fbcfe8", equation: "Mn²⁺ + 2OH⁻ → Mn(OH)₂↓" },
  "Mn²⁺_S²⁻": { bg: "bg-pink-300", name: "Телесный", hex: "#f9a8d4", equation: "Mn²⁺ + S²⁻ → MnS↓" },
  "Cr³⁺_OH⁻": { bg: "bg-emerald-400", name: "Серо-зелёный", hex: "#34d399", equation: "Cr³⁺ + 3OH⁻ → Cr(OH)₃↓" },
  "H⁺_SiO₃²⁻": { bg: "bg-white border-2 border-gray-400", name: "Белый студенистый (гель)", hex: "#f3f4f6", equation: "2H⁺ + SiO₃²⁻ → H₂SiO₃↓" },
};

// Гидролиз для несуществующих соединений (—)
const HYDROLYSIS_INFO: Record<string, { color: string; name: string; hex: string; equation: string }> = {
  "Al³⁺_S²⁻": { color: "Белый + газ", name: "Al(OH)₃↓ + H₂S↑", hex: "#ffffff", equation: "2Al³⁺ + 3S²⁻ + 6H₂O → 2Al(OH)₃↓ + 3H₂S↑" },
  "Al³⁺_CO₃²⁻": { color: "Белый + газ", name: "Al(OH)₃↓ + CO₂↑", hex: "#ffffff", equation: "2Al³⁺ + 3CO₃²⁻ + 3H₂O → 2Al(OH)₃↓ + 3CO₂↑" },
  "Al³⁺_SO₃²⁻": { color: "Белый + газ", name: "Al(OH)₃↓ + SO₂↑", hex: "#ffffff", equation: "2Al³⁺ + 3SO₃²⁻ + 3H₂O → 2Al(OH)₃↓ + 3SO₂↑" },
  "Cr³⁺_S²⁻": { color: "Зелёный + газ", name: "Cr(OH)₃↓ + H₂S↑", hex: "#34d399", equation: "2Cr³⁺ + 3S²⁻ + 6H₂O → 2Cr(OH)₃↓ + 3H₂S↑" },
  "Cr³⁺_CO₃²⁻": { color: "Зелёный + газ", name: "Cr(OH)₃↓ + CO₂↑", hex: "#34d399", equation: "2Cr³⁺ + 3CO₃²⁻ + 3H₂O → 2Cr(OH)₃↓ + 3CO₂↑" },
  "Cr³⁺_SO₃²⁻": { color: "Зелёный + газ", name: "Cr(OH)₃↓ + SO₂↑", hex: "#34d399", equation: "2Cr³⁺ + 3SO₃²⁻ + 3H₂O → 2Cr(OH)₃↓ + 3SO₂↑" },
  "Fe³⁺_S²⁻": { color: "Бурый + газ", name: "Fe(OH)₃↓ + H₂S↑", hex: "#c2410c", equation: "2Fe³⁺ + 3S²⁻ + 6H₂O → 2Fe(OH)₃↓ + 3H₂S↑" },
  "Fe³⁺_CO₃²⁻": { color: "Бурый + газ", name: "Fe(OH)₃↓ + CO₂↑", hex: "#c2410c", equation: "2Fe³⁺ + 3CO₃²⁻ + 3H₂O → 2Fe(OH)₃↓ + 3CO₂↑" },
  "Fe³⁺_SO₃²⁻": { color: "Бурый + газ", name: "Fe(OH)₃↓ + SO₂↑", hex: "#c2410c", equation: "2Fe³⁺ + 3SO₃²⁻ + 3H₂O → 2Fe(OH)₃↓ + 3SO₂↑" },
  "Cu²⁺_I⁻": { color: "Белый + I₂", name: "CuI↓ + I₂", hex: "#ffffff", equation: "2Cu²⁺ + 4I⁻ → 2CuI↓ + I₂" },
  "Hg²⁺_OH⁻": { color: "Жёлтый", name: "HgO↓ (разлагается)", hex: "#eab308", equation: "Hg²⁺ + 2OH⁻ → HgO↓ + H₂O" },
  "Ag⁺_OH⁻": { color: "Бурый", name: "Ag₂O↓ (разлагается)", hex: "#92400e", equation: "2Ag⁺ + 2OH⁻ → Ag₂O↓ + H₂O" },
};

function getPrecipitateKey(cation: string, anion: string): string {
  return `${cation}_${anion}`;
}

function getHydrolysisInfo(cation: string, anion: string) {
  return HYDROLYSIS_INFO[getPrecipitateKey(cation, anion)] || null;
}

// Таблица Менделеева
const PERIODIC_SHORT = [
  { period: 1, group: "IA", elements: [{ n: 1, sym: "H", name: "Водород", mass: "1" }] },
  { period: 1, group: "VIIIA", elements: [{ n: 2, sym: "He", name: "Гелий", mass: "4" }] },
  { period: 2, group: "IA", elements: [{ n: 3, sym: "Li", name: "Литий", mass: "7" }] },
  { period: 2, group: "IIA", elements: [{ n: 4, sym: "Be", name: "Бериллий", mass: "9" }] },
  { period: 2, group: "IIIA", elements: [{ n: 5, sym: "B", name: "Бор", mass: "11" }] },
  { period: 2, group: "IVA", elements: [{ n: 6, sym: "C", name: "Углерод", mass: "12" }] },
  { period: 2, group: "VA", elements: [{ n: 7, sym: "N", name: "Азот", mass: "14" }] },
  { period: 2, group: "VIA", elements: [{ n: 8, sym: "O", name: "Кислород", mass: "16" }] },
  { period: 2, group: "VIIA", elements: [{ n: 9, sym: "F", name: "Фтор", mass: "19" }] },
  { period: 2, group: "VIIIA", elements: [{ n: 10, sym: "Ne", name: "Неон", mass: "20" }] },
  { period: 3, group: "IA", elements: [{ n: 11, sym: "Na", name: "Натрий", mass: "23" }] },
  { period: 3, group: "IIA", elements: [{ n: 12, sym: "Mg", name: "Магний", mass: "24" }] },
  { period: 3, group: "IIIA", elements: [{ n: 13, sym: "Al", name: "Алюминий", mass: "27" }] },
  { period: 3, group: "IVA", elements: [{ n: 14, sym: "Si", name: "Кремний", mass: "28" }] },
  { period: 3, group: "VA", elements: [{ n: 15, sym: "P", name: "Фосфор", mass: "31" }] },
  { period: 3, group: "VIA", elements: [{ n: 16, sym: "S", name: "Сера", mass: "32" }] },
  { period: 3, group: "VIIA", elements: [{ n: 17, sym: "Cl", name: "Хлор", mass: "35,5" }] },
  { period: 3, group: "VIIIA", elements: [{ n: 18, sym: "Ar", name: "Аргон", mass: "40" }] },
  { period: 4, group: "IA", elements: [{ n: 19, sym: "K", name: "Калий", mass: "39" }] },
  { period: 4, group: "IIA", elements: [{ n: 20, sym: "Ca", name: "Кальций", mass: "40" }] },
  { period: 4, group: "VIB", elements: [{ n: 24, sym: "Cr", name: "Хром", mass: "52" }] },
  { period: 4, group: "VIIB", elements: [{ n: 25, sym: "Mn", name: "Марганец", mass: "55" }] },
  { period: 4, group: "VIIIB", elements: [{ n: 26, sym: "Fe", name: "Железо", mass: "56" }] },
  { period: 4, group: "IB", elements: [{ n: 29, sym: "Cu", name: "Медь", mass: "64" }] },
  { period: 4, group: "IIB", elements: [{ n: 30, sym: "Zn", name: "Цинк", mass: "65" }] },
  { period: 4, group: "VIIA", elements: [{ n: 35, sym: "Br", name: "Бром", mass: "80" }] },
  { period: 5, group: "IA", elements: [{ n: 37, sym: "Rb", name: "Рубидий", mass: "85" }] },
  { period: 5, group: "IIA", elements: [{ n: 38, sym: "Sr", name: "Стронций", mass: "88" }] },
  { period: 5, group: "IB", elements: [{ n: 47, sym: "Ag", name: "Серебро", mass: "108" }] },
  { period: 5, group: "VIIA", elements: [{ n: 53, sym: "I", name: "Йод", mass: "127" }] },
  { period: 6, group: "IA", elements: [{ n: 55, sym: "Cs", name: "Цезий", mass: "133" }] },
  { period: 6, group: "IIA", elements: [{ n: 56, sym: "Ba", name: "Барий", mass: "137" }] },
  { period: 6, group: "VIIIB", elements: [{ n: 78, sym: "Pt", name: "Платина", mass: "195" }] },
  { period: 6, group: "IB", elements: [{ n: 79, sym: "Au", name: "Золото", mass: "197" }] },
  { period: 6, group: "IIB", elements: [{ n: 80, sym: "Hg", name: "Ртуть", mass: "201" }] },
  { period: 6, group: "IVA", elements: [{ n: 82, sym: "Pb", name: "Свинец", mass: "207" }] },
];

const GROUP_COLORS: Record<string, string> = {
  "IA": "bg-red-100 border-red-300", "IIA": "bg-orange-100 border-orange-300",
  "IIIA": "bg-yellow-100 border-yellow-300", "IVA": "bg-lime-100 border-lime-300",
  "VA": "bg-green-100 border-green-300", "VIA": "bg-emerald-100 border-emerald-300",
  "VIIA": "bg-cyan-100 border-cyan-300", "VIIIA": "bg-blue-100 border-blue-300",
  "IB": "bg-amber-200 border-amber-400", "IIB": "bg-gray-200 border-gray-400",
  "VIB": "bg-violet-100 border-violet-300", "VIIB": "bg-purple-100 border-purple-300",
  "VIIIB": "bg-pink-100 border-pink-300",
};

const ACTIVITY_SERIES = "Li → Rb → K → Ba → Sr → Ca → Na → Mg → Be → Al → Mn → Zn → Cr → Fe → Cd → Co → Ni → Sn → Pb → H₂ → Sb → Bi → Cu → Hg → Ag → Pt → Au";

export default function ChemRef() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"solubility" | "activity" | "periodic">("solubility");
  const [selectedPrecipitate, setSelectedPrecipitate] = useState<any>(null);

  function handleCellClick(cation: string, anion: string) {
    const key = getPrecipitateKey(cation, anion);
    let info = PRECIPITATE_COLORS[key];
    
    if (!info) {
      info = getHydrolysisInfo(cation, anion);
    }
    
    if (info) setSelectedPrecipitate({ ...info, cation, anion });
  }

  function getCellStyle(cation: string, anion: string, value: string): string {
    if (value === "Р") return "bg-emerald-100 text-emerald-800 font-bold";
    if (value === "—") return "bg-gray-100 text-gray-400 font-bold cursor-pointer hover:ring-2 hover:ring-indigo-400 hover:scale-110 transition";
    
    const key = getPrecipitateKey(cation, anion);
    const info = PRECIPITATE_COLORS[key] || getHydrolysisInfo(cation, anion);
    
    if (info) {
      return `${info.bg} text-gray-800 font-bold cursor-pointer hover:ring-2 hover:ring-indigo-400 hover:scale-110 transition`;
    }
    
    return "bg-amber-100 text-amber-800 font-bold cursor-pointer hover:ring-2 hover:ring-amber-400 hover:scale-110 transition";
  }

  return (
    <>
      <button onClick={() => setOpen(!open)} className="fixed bottom-4 right-4 z-50 w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full shadow-2xl hover:scale-110 transition-all flex items-center justify-center text-2xl" title="Справочник ЕГЭ">🧪</button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setOpen(false); setSelectedPrecipitate(null); }}>
          <div className="bg-white rounded-3xl shadow-2xl p-4 sm:p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-xl">🧪 Справочник ЕГЭ</h2><button onClick={() => { setOpen(false); setSelectedPrecipitate(null); }} className="text-gray-400 hover:text-gray-600 text-2xl">×</button></div>

            <div className="flex gap-2 mb-4 flex-wrap">
              {[{ key: "solubility", label: "🧪 Растворимость" }, { key: "activity", label: "⚡ Ряд активности" }, { key: "periodic", label: "📊 Менделеев" }].map((t) => (
                <button key={t.key} onClick={() => { setTab(t.key as any); setSelectedPrecipitate(null); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${tab === t.key ? "bg-indigo-500 text-white" : "bg-gray-100 hover:bg-gray-200"}`}>{t.label}</button>
              ))}
            </div>

            {selectedPrecipitate && (
              <div className="mb-4 p-4 rounded-2xl border-2" style={{ backgroundColor: selectedPrecipitate.hex + '30', borderColor: selectedPrecipitate.hex }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full border-2 border-gray-300 shadow-inner" style={{ backgroundColor: selectedPrecipitate.hex }} />
                  <div><p className="font-bold text-sm">{selectedPrecipitate.cation} + {selectedPrecipitate.anion}</p><p className="text-xs">{selectedPrecipitate.name}</p></div>
                </div>
                {selectedPrecipitate.equation && <div className="bg-white/80 rounded-xl p-3 font-mono text-sm text-center font-bold">{selectedPrecipitate.equation}</div>}
              </div>
            )}

            {tab === "solubility" && (
              <div className="overflow-x-auto">
                <div className="text-xs mb-2 flex flex-wrap gap-3 bg-gray-50 rounded-xl p-2">
                  <span>🟢 Р — растворимо</span><span>🟡 М — мало</span><span>🔴 Н — осадок</span><span>⬜ — — гидролиз (нажми)</span>
                </div>
                <table className="w-full text-xs border-2 border-gray-300 rounded-xl">
                  <thead><tr><th className="border p-1.5 bg-indigo-100 font-bold sticky left-0">Ион</th>{ANIONS.map((a) => <th key={a} className="border p-1.5 bg-indigo-100 font-bold whitespace-nowrap">{a}</th>)}</tr></thead>
                  <tbody>
                    {SOLUBILITY_ROWS.map((row) => {
                      const vals = row.vals.split(" ");
                      return (
                        <tr key={row.ion}>
                          <td className="border p-1.5 font-bold bg-gray-50 sticky left-0 whitespace-nowrap">{row.ion}</td>
                          {vals.map((v, i) => (
                            <td key={i} onClick={() => handleCellClick(row.ion, ANIONS[i])} className={`border p-1.5 text-center text-[11px] ${getCellStyle(row.ion, ANIONS[i], v)}`}>
                              {v}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {tab === "activity" && (
              <div className="space-y-4">
                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200"><h3 className="font-bold text-amber-800 mb-2">⚡ Ряд активности металлов</h3><div className="bg-white rounded-xl p-4 font-mono text-xs sm:text-sm leading-loose text-center">{ACTIVITY_SERIES.split(" → ").map((el, i) => (<span key={i} className={`inline-block px-1.5 py-0.5 m-0.5 rounded ${el === "H₂" ? "bg-red-100 text-red-700 font-bold border border-red-300" : "bg-gray-100"}`}>{el}</span>))}</div></div>
                <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-200"><h3 className="font-bold text-indigo-800 mb-2">📝 Правила</h3><ul className="text-sm text-indigo-700 space-y-1 list-disc pl-4"><li>Металлы <b>левее H₂</b> вытесняют водород из кислот</li><li>Металлы <b>правее H₂</b> не реагируют с кислотами (кроме HNO₃)</li><li>Каждый предыдущий металл <b>вытесняет</b> последующий из солей</li></ul></div>
              </div>
            )}

            {tab === "periodic" && (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {PERIODIC_SHORT.map((item, idx) => (
                  <div key={idx} className={`rounded-xl p-2 text-center border-2 ${GROUP_COLORS[item.group] || 'bg-gray-50 border-gray-200'} hover:shadow-lg transition cursor-pointer`}>
                    <span className="text-[9px] text-gray-400">{item.group}</span>
                    {item.elements.map((el) => (
                      <div key={el.n}>
                        <p className="text-xl font-black text-gray-800">{el.sym}</p>
                        <p className="text-[9px] text-gray-500">{el.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{el.mass}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}