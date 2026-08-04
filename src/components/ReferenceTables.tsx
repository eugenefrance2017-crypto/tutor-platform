"use client";

import { useState, useEffect } from "react";
import { X, Table2 } from "lucide-react";

// ============ 1. ТАБЛИЦА МЕНДЕЛЕЕВА (КОРОТКАЯ ФОРМА: 8 ГРУПП) ============
const PERIODIC_DATA = [
  { period: 1, groups: [
    { group: "I", A: "H", B: null },
    { group: "II", A: null, B: null },
    { group: "III", A: null, B: null },
    { group: "IV", A: null, B: null },
    { group: "V", A: null, B: null },
    { group: "VI", A: null, B: null },
    { group: "VII", A: null, B: null },
    { group: "VIII", A: "He", B: null }
  ]},
  { period: 2, groups: [
    { group: "I", A: "Li", B: null },
    { group: "II", A: "Be", B: null },
    { group: "III", A: "B", B: null },
    { group: "IV", A: "C", B: null },
    { group: "V", A: "N", B: null },
    { group: "VI", A: "O", B: null },
    { group: "VII", A: "F", B: null },
    { group: "VIII", A: "Ne", B: null }
  ]},
  { period: 3, groups: [
    { group: "I", A: "Na", B: null },
    { group: "II", A: "Mg", B: null },
    { group: "III", A: "Al", B: null },
    { group: "IV", A: "Si", B: null },
    { group: "V", A: "P", B: null },
    { group: "VI", A: "S", B: null },
    { group: "VII", A: "Cl", B: null },
    { group: "VIII", A: "Ar", B: null }
  ]},
  { period: 4, groups: [
    { group: "I", A: "K", B: "Cu" },
    { group: "II", A: "Ca", B: "Zn" },
    { group: "III", A: "Ga", B: "Sc" },
    { group: "IV", A: "Ge", B: "Ti" },
    { group: "V", A: "As", B: "V" },
    { group: "VI", A: "Se", B: "Cr" },
    { group: "VII", A: "Br", B: "Mn" },
    { group: "VIII", A: "Kr", B: "Fe,Co,Ni" }
  ]},
  { period: 5, groups: [
    { group: "I", A: "Rb", B: "Ag" },
    { group: "II", A: "Sr", B: "Cd" },
    { group: "III", A: "In", B: "Y" },
    { group: "IV", A: "Sn", B: "Zr" },
    { group: "V", A: "Sb", B: "Nb" },
    { group: "VI", A: "Te", B: "Mo" },
    { group: "VII", A: "I", B: "Tc" },
    { group: "VIII", A: "Xe", B: "Ru,Rh,Pd" }
  ]},
  { period: 6, groups: [
    { group: "I", A: "Cs", B: "Au" },
    { group: "II", A: "Ba", B: "Hg" },
    { group: "III", A: "Tl", B: "La*" },
    { group: "IV", A: "Pb", B: "Hf" },
    { group: "V", A: "Bi", B: "Ta" },
    { group: "VI", A: "Po", B: "W" },
    { group: "VII", A: "At", B: "Re" },
    { group: "VIII", A: "Rn", B: "Os,Ir,Pt" }
  ]},
  { period: 7, groups: [
    { group: "I", A: "Fr", B: "Rg" },
    { group: "II", A: "Ra", B: "Cn" },
    { group: "III", A: "Nh", B: "Ac**" },
    { group: "IV", A: "Fl", B: "Rf" },
    { group: "V", A: "Mc", B: "Db" },
    { group: "VI", A: "Lv", B: "Sg" },
    { group: "VII", A: "Ts", B: "Bh" },
    { group: "VIII", A: "Og", B: "Hs,Mt,Ds" }
  ]},
];

const LANTHANOIDS = [
  { symbol: "Ce", number: 58, name: "Церий", mass: 140.12 },
  { symbol: "Pr", number: 59, name: "Празеодим", mass: 140.91 },
  { symbol: "Nd", number: 60, name: "Неодим", mass: 144.24 },
  { symbol: "Pm", number: 61, name: "Прометий", mass: 145 },
  { symbol: "Sm", number: 62, name: "Самарий", mass: 150.36 },
  { symbol: "Eu", number: 63, name: "Европий", mass: 151.96 },
  { symbol: "Gd", number: 64, name: "Гадолиний", mass: 157.25 },
  { symbol: "Tb", number: 65, name: "Тербий", mass: 158.93 },
  { symbol: "Dy", number: 66, name: "Диспрозий", mass: 162.50 },
  { symbol: "Ho", number: 67, name: "Гольмий", mass: 164.93 },
  { symbol: "Er", number: 68, name: "Эрбий", mass: 167.26 },
  { symbol: "Tm", number: 69, name: "Тулий", mass: 168.93 },
  { symbol: "Yb", number: 70, name: "Иттербий", mass: 173.05 },
  { symbol: "Lu", number: 71, name: "Лютеций", mass: 174.97 },
];

const ACTINOIDS = [
  { symbol: "Th", number: 90, name: "Торий", mass: 232.04 },
  { symbol: "Pa", number: 91, name: "Протактиний", mass: 231.04 },
  { symbol: "U", number: 92, name: "Уран", mass: 238.03 },
  { symbol: "Np", number: 93, name: "Нептуний", mass: 237 },
  { symbol: "Pu", number: 94, name: "Плутоний", mass: 244 },
  { symbol: "Am", number: 95, name: "Америций", mass: 243 },
  { symbol: "Cm", number: 96, name: "Кюрий", mass: 247 },
  { symbol: "Bk", number: 97, name: "Берклий", mass: 247 },
  { symbol: "Cf", number: 98, name: "Калифорний", mass: 251 },
  { symbol: "Es", number: 99, name: "Эйнштейний", mass: 252 },
  { symbol: "Fm", number: 100, name: "Фермий", mass: 257 },
  { symbol: "Md", number: 101, name: "Менделевий", mass: 258 },
  { symbol: "No", number: 102, name: "Нобелий", mass: 259 },
  { symbol: "Lr", number: 103, name: "Лоуренсий", mass: 266 },
];

const ELEMENT_DATA: Record<string, { symbol: string; name: string; mass: number | string; number: number; block: string }> = {
  "H": { symbol: "H", name: "Водород", mass: 1.008, number: 1, block: "s" },
  "He": { symbol: "He", name: "Гелий", mass: 4.0026, number: 2, block: "s" },
  "Li": { symbol: "Li", name: "Литий", mass: 6.94, number: 3, block: "s" },
  "Be": { symbol: "Be", name: "Бериллий", mass: 9.0122, number: 4, block: "s" },
  "B": { symbol: "B", name: "Бор", mass: 10.81, number: 5, block: "p" },
  "C": { symbol: "C", name: "Углерод", mass: 12.011, number: 6, block: "p" },
  "N": { symbol: "N", name: "Азот", mass: 14.007, number: 7, block: "p" },
  "O": { symbol: "O", name: "Кислород", mass: 15.999, number: 8, block: "p" },
  "F": { symbol: "F", name: "Фтор", mass: 18.998, number: 9, block: "p" },
  "Ne": { symbol: "Ne", name: "Неон", mass: 20.180, number: 10, block: "p" },
  "Na": { symbol: "Na", name: "Натрий", mass: 22.990, number: 11, block: "s" },
  "Mg": { symbol: "Mg", name: "Магний", mass: 24.305, number: 12, block: "s" },
  "Al": { symbol: "Al", name: "Алюминий", mass: 26.982, number: 13, block: "p" },
  "Si": { symbol: "Si", name: "Кремний", mass: 28.085, number: 14, block: "p" },
  "P": { symbol: "P", name: "Фосфор", mass: 30.974, number: 15, block: "p" },
  "S": { symbol: "S", name: "Сера", mass: 32.06, number: 16, block: "p" },
  "Cl": { symbol: "Cl", name: "Хлор", mass: 35.45, number: 17, block: "p" },
  "Ar": { symbol: "Ar", name: "Аргон", mass: 39.948, number: 18, block: "p" },
  "K": { symbol: "K", name: "Калий", mass: 39.098, number: 19, block: "s" },
  "Ca": { symbol: "Ca", name: "Кальций", mass: 40.078, number: 20, block: "s" },
  "Sc": { symbol: "Sc", name: "Скандий", mass: 44.956, number: 21, block: "d" },
  "Ti": { symbol: "Ti", name: "Титан", mass: 47.867, number: 22, block: "d" },
  "V": { symbol: "V", name: "Ванадий", mass: 50.942, number: 23, block: "d" },
  "Cr": { symbol: "Cr", name: "Хром", mass: 51.996, number: 24, block: "d" },
  "Mn": { symbol: "Mn", name: "Марганец", mass: 54.938, number: 25, block: "d" },
  "Fe": { symbol: "Fe", name: "Железо", mass: 55.845, number: 26, block: "d" },
  "Co": { symbol: "Co", name: "Кобальт", mass: 58.933, number: 27, block: "d" },
  "Ni": { symbol: "Ni", name: "Никель", mass: 58.693, number: 28, block: "d" },
  "Cu": { symbol: "Cu", name: "Медь", mass: 63.546, number: 29, block: "d" },
  "Zn": { symbol: "Zn", name: "Цинк", mass: 65.38, number: 30, block: "d" },
  "Ga": { symbol: "Ga", name: "Галлий", mass: 69.723, number: 31, block: "p" },
  "Ge": { symbol: "Ge", name: "Германий", mass: 72.630, number: 32, block: "p" },
  "As": { symbol: "As", name: "Мышьяк", mass: 74.922, number: 33, block: "p" },
  "Se": { symbol: "Se", name: "Селен", mass: 78.971, number: 34, block: "p" },
  "Br": { symbol: "Br", name: "Бром", mass: 79.904, number: 35, block: "p" },
  "Kr": { symbol: "Kr", name: "Криптон", mass: 83.798, number: 36, block: "p" },
  "Rb": { symbol: "Rb", name: "Рубидий", mass: 85.468, number: 37, block: "s" },
  "Sr": { symbol: "Sr", name: "Стронций", mass: 87.62, number: 38, block: "s" },
  "Y": { symbol: "Y", name: "Иттрий", mass: 88.906, number: 39, block: "d" },
  "Zr": { symbol: "Zr", name: "Цирконий", mass: 91.224, number: 40, block: "d" },
  "Nb": { symbol: "Nb", name: "Ниобий", mass: 92.906, number: 41, block: "d" },
  "Mo": { symbol: "Mo", name: "Молибден", mass: 95.95, number: 42, block: "d" },
  "Tc": { symbol: "Tc", name: "Технеций", mass: 98, number: 43, block: "d" },
  "Ru": { symbol: "Ru", name: "Рутений", mass: 101.07, number: 44, block: "d" },
  "Rh": { symbol: "Rh", name: "Родий", mass: 102.91, number: 45, block: "d" },
  "Pd": { symbol: "Pd", name: "Палладий", mass: 106.42, number: 46, block: "d" },
  "Ag": { symbol: "Ag", name: "Серебро", mass: 107.87, number: 47, block: "d" },
  "Cd": { symbol: "Cd", name: "Кадмий", mass: 112.41, number: 48, block: "d" },
  "In": { symbol: "In", name: "Индий", mass: 114.82, number: 49, block: "p" },
  "Sn": { symbol: "Sn", name: "Олово", mass: 118.71, number: 50, block: "p" },
  "Sb": { symbol: "Sb", name: "Сурьма", mass: 121.76, number: 51, block: "p" },
  "Te": { symbol: "Te", name: "Теллур", mass: 127.60, number: 52, block: "p" },
  "I": { symbol: "I", name: "Йод", mass: 126.90, number: 53, block: "p" },
  "Xe": { symbol: "Xe", name: "Ксенон", mass: 131.29, number: 54, block: "p" },
  "Cs": { symbol: "Cs", name: "Цезий", mass: 132.91, number: 55, block: "s" },
  "Ba": { symbol: "Ba", name: "Барий", mass: 137.33, number: 56, block: "s" },
  "La": { symbol: "La", name: "Лантан", mass: 138.91, number: 57, block: "f" },
  "Hf": { symbol: "Hf", name: "Гафний", mass: 178.49, number: 72, block: "d" },
  "Ta": { symbol: "Ta", name: "Тантал", mass: 180.95, number: 73, block: "d" },
  "W": { symbol: "W", name: "Вольфрам", mass: 183.84, number: 74, block: "d" },
  "Re": { symbol: "Re", name: "Рений", mass: 186.21, number: 75, block: "d" },
  "Os": { symbol: "Os", name: "Осмий", mass: 190.23, number: 76, block: "d" },
  "Ir": { symbol: "Ir", name: "Иридий", mass: 192.22, number: 77, block: "d" },
  "Pt": { symbol: "Pt", name: "Платина", mass: 195.08, number: 78, block: "d" },
  "Au": { symbol: "Au", name: "Золото", mass: 196.97, number: 79, block: "d" },
  "Hg": { symbol: "Hg", name: "Ртуть", mass: 200.59, number: 80, block: "d" },
  "Tl": { symbol: "Tl", name: "Таллий", mass: 204.38, number: 81, block: "p" },
  "Pb": { symbol: "Pb", name: "Свинец", mass: 207.2, number: 82, block: "p" },
  "Bi": { symbol: "Bi", name: "Висмут", mass: 208.98, number: 83, block: "p" },
  "Po": { symbol: "Po", name: "Полоний", mass: 209, number: 84, block: "p" },
  "At": { symbol: "At", name: "Астат", mass: 210, number: 85, block: "p" },
  "Rn": { symbol: "Rn", name: "Радон", mass: 222, number: 86, block: "p" },
  "Fr": { symbol: "Fr", name: "Франций", mass: 223, number: 87, block: "s" },
  "Ra": { symbol: "Ra", name: "Радий", mass: 226, number: 88, block: "s" },
  "Ac": { symbol: "Ac", name: "Актиний", mass: 227, number: 89, block: "f" },
  "Rf": { symbol: "Rf", name: "Резерфордий", mass: 267, number: 104, block: "d" },
  "Db": { symbol: "Db", name: "Дубний", mass: 268, number: 105, block: "d" },
  "Sg": { symbol: "Sg", name: "Сиборгий", mass: 269, number: 106, block: "d" },
  "Bh": { symbol: "Bh", name: "Борий", mass: 270, number: 107, block: "d" },
  "Hs": { symbol: "Hs", name: "Хассий", mass: 269, number: 108, block: "d" },
  "Mt": { symbol: "Mt", name: "Мейтнерий", mass: 278, number: 109, block: "d" },
  "Ds": { symbol: "Ds", name: "Дармштадтий", mass: 281, number: 110, block: "d" },
  "Rg": { symbol: "Rg", name: "Рентгений", mass: 282, number: 111, block: "d" },
  "Cn": { symbol: "Cn", name: "Коперниций", mass: 285, number: 112, block: "d" },
  "Nh": { symbol: "Nh", name: "Нихоний", mass: 286, number: 113, block: "p" },
  "Fl": { symbol: "Fl", name: "Флеровий", mass: 289, number: 114, block: "p" },
  "Mc": { symbol: "Mc", name: "Московий", mass: 290, number: 115, block: "p" },
  "Lv": { symbol: "Lv", name: "Ливерморий", mass: 293, number: 116, block: "p" },
  "Ts": { symbol: "Ts", name: "Теннессин", mass: 294, number: 117, block: "p" },
  "Og": { symbol: "Og", name: "Оганесон", mass: 294, number: 118, block: "p" },
};

// ============ 2. ПОЛНАЯ ТАБЛИЦА РАСТВОРИМОСТИ (ВСЕ 24 АНИОНА) ============
const CATIONS = ["H⁺", "Li⁺", "K⁺", "Na⁺", "NH₄⁺", "Ba²⁺", "Ca²⁺", "Mg²⁺", "Sr²⁺", "Al³⁺", "Cr³⁺", "Fe²⁺", "Fe³⁺", "Mn²", "Zn²⁺", "Ag", "Hg²⁺", "Pb²⁺", "Sn²⁺", "Cu²⁺"];

const SOLUBILITY_DATA = [
  { anion: "OH", data: {
    "H": { solubility: "Р" }, "Li⁺": { solubility: "Р" }, "K⁺": { solubility: "Р" }, "Na⁺": { solubility: "Р" },
    "NH₄": { solubility: "Р" }, "Ba²⁺": { solubility: "Р" },
    "Ca²⁺": { solubility: "М", precipitateColor: "белый", ionicEquation: "Ca²⁺ + 2OH⁻ → Ca(OH)₂↓" },
    "Mg²": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Mg²⁺ + 2OH⁻ → Mg(OH)₂↓" },
    "Sr²⁺": { solubility: "М", precipitateColor: "белый", ionicEquation: "Sr²⁺ + 2OH⁻ → Sr(OH)₂↓" },
    "Al³⁺": { solubility: "Н", precipitateColor: "белый студенистый", ionicEquation: "Al³ + 3OH⁻ → Al(OH)₃↓" },
    "Cr³": { solubility: "Н", precipitateColor: "серо-зелёный", ionicEquation: "Cr³⁺ + 3OH⁻ → Cr(OH)₃↓" },
    "Fe²⁺": { solubility: "Н", precipitateColor: "зеленоватый", ionicEquation: "Fe²⁺ + 2OH⁻ → Fe(OH)₂↓" },
    "Fe³": { solubility: "Н", precipitateColor: "бурый", ionicEquation: "Fe³⁺ + 3OH⁻ → Fe(OH)₃↓" },
    "Mn²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Mn²⁺ + 2OH⁻ → Mn(OH)₂↓" },
    "Zn²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Zn²⁺ + 2OH⁻ → Zn(OH)₂↓" },
    "Ag⁺": { solubility: "Н", precipitateColor: "бурый", ionicEquation: "2Ag⁺ + 2OH⁻ → Ag₂O↓ + H₂O" },
    "Hg²⁺": { solubility: "Н", precipitateColor: "жёлтый", ionicEquation: "Hg²⁺ + 2OH → HgO↓ + H₂O" },
    "Pb²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Pb² + 2OH⁻ → Pb(OH)₂↓" },
    "Sn²": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Sn²⁺ + 2OH⁻ → Sn(OH)₂↓" },
    "Cu²": { solubility: "Н", precipitateColor: "голубой", ionicEquation: "Cu²⁺ + 2OH⁻ → Cu(OH)₂↓" }
  }},
  { anion: "F⁻", data: {
    "H": { solubility: "Р" },
    "Li": { solubility: "М", precipitateColor: "белый", ionicEquation: "Li⁺ + F⁻ → LiF↓" },
    "K⁺": { solubility: "Р" }, "Na⁺": { solubility: "Р" }, "NH₄⁺": { solubility: "Р" },
    "Ba²⁺": { solubility: "М", precipitateColor: "белый", ionicEquation: "Ba²⁺ + 2F⁻ → BaF₂↓" },
    "Ca²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Ca²⁺ + 2F⁻ → CaF₂↓" },
    "Mg²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Mg² + 2F⁻ → MgF₂↓" },
    "Sr²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Sr² + 2F → SrF₂↓" },
    "Al³⁺": { solubility: "М" },
    "Cr³⁺": { solubility: "Н", precipitateColor: "зелёный", ionicEquation: "Cr³ + 3F⁻ → CrF₃↓" },
    "Fe²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Fe²⁺ + 2F → FeF₂↓" },
    "Fe³⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Fe³⁺ + 3F → FeF₃↓" },
    "Mn²⁺": { solubility: "Р" }, "Zn²": { solubility: "Р" },
    "Ag": { solubility: "Р" },
    "Hg²⁺": { solubility: "—" },
    "Pb²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Pb²⁺ + 2F → PbF₂↓" },
    "Sn²⁺": { solubility: "Р" }, "Cu²⁺": { solubility: "Р" }
  }},
  { anion: "Cl⁻", data: {
    "H⁺": { solubility: "Р" }, "Li⁺": { solubility: "Р" }, "K⁺": { solubility: "Р" }, "Na⁺": { solubility: "Р" },
    "NH₄": { solubility: "Р" }, "Ba²⁺": { solubility: "Р" }, "Ca²⁺": { solubility: "Р" },
    "Mg²⁺": { solubility: "Р" }, "Sr²⁺": { solubility: "Р" }, "Al³⁺": { solubility: "Р" },
    "Cr³": { solubility: "Р" }, "Fe²⁺": { solubility: "Р" }, "Fe³⁺": { solubility: "Р" },
    "Mn²⁺": { solubility: "Р" }, "Zn²⁺": { solubility: "Р" },
    "Ag⁺": { solubility: "Н", precipitateColor: "белый творожистый", ionicEquation: "Ag⁺ + Cl⁻ → AgCl↓" },
    "Hg²": { solubility: "М", precipitateColor: "белый", ionicEquation: "2Hg⁺ + 2Cl → Hg₂Cl₂↓" },
    "Pb²": { solubility: "М", precipitateColor: "белый", ionicEquation: "Pb²⁺ + 2Cl⁻ → PbCl₂↓" },
    "Sn²⁺": { solubility: "Р" }, "Cu²⁺": { solubility: "Р" }
  }},
  { anion: "Br⁻", data: {
    "H⁺": { solubility: "Р" }, "Li⁺": { solubility: "Р" }, "K": { solubility: "Р" }, "Na⁺": { solubility: "Р" },
    "NH": { solubility: "Р" }, "Ba²⁺": { solubility: "Р" }, "Ca²": { solubility: "Р" },
    "Mg²⁺": { solubility: "Р" }, "Sr²⁺": { solubility: "Р" }, "Al³": { solubility: "Р" },
    "Cr³⁺": { solubility: "Р" }, "Fe²⁺": { solubility: "Р" }, "Fe³⁺": { solubility: "Р" },
    "Mn²⁺": { solubility: "Р" }, "Zn²⁺": { solubility: "Р" },
    "Ag⁺": { solubility: "Н", precipitateColor: "светло-жёлтый", ionicEquation: "Ag⁺ + Br⁻ → AgBr↓" },
    "Hg²": { solubility: "М", precipitateColor: "белый", ionicEquation: "2Hg + 2Br⁻ → Hg₂Br₂↓" },
    "Pb²⁺": { solubility: "М", precipitateColor: "белый", ionicEquation: "Pb²⁺ + 2Br⁻ → PbBr₂↓" },
    "Sn²": { solubility: "Р" }, "Cu²⁺": { solubility: "Р" }
  }},
  { anion: "I⁻", data: {
    "H": { solubility: "Р" }, "Li⁺": { solubility: "Р" }, "K⁺": { solubility: "Р" }, "Na": { solubility: "Р" },
    "NH₄": { solubility: "Р" }, "Ba²⁺": { solubility: "Р" }, "Ca²⁺": { solubility: "Р" },
    "Mg²⁺": { solubility: "Р" }, "Sr²⁺": { solubility: "Р" }, "Al³⁺": { solubility: "Р" },
    "Cr³": { solubility: "Р" }, "Fe²⁺": { solubility: "Р" }, "Fe³⁺": { solubility: "Р" },
    "Mn²": { solubility: "Р" }, "Zn²⁺": { solubility: "Р" },
    "Ag⁺": { solubility: "Н", precipitateColor: "жёлтый", ionicEquation: "Ag⁺ + I⁻ → AgI↓" },
    "Hg²⁺": { solubility: "Н", precipitateColor: "красный", ionicEquation: "Hg²⁺ + 2I⁻ → HgI₂↓" },
    "Pb²⁺": { solubility: "Н", precipitateColor: "жёлтый", ionicEquation: "Pb²⁺ + 2I⁻ → PbI₂↓" },
    "Sn²⁺": { solubility: "М", precipitateColor: "коричневый", ionicEquation: "Sn²⁺ + 2I⁻ → SnI₂↓" },
    "Cu²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "2Cu²⁺ + 4I → 2CuI↓ + I₂" }
  }},
  { anion: "S²⁻", data: {
    "H": { solubility: "Р" }, "Li⁺": { solubility: "Р" }, "K⁺": { solubility: "Р" }, "Na⁺": { solubility: "Р" },
    "NH₄": { solubility: "Р" },
    "Ba²⁺": { solubility: "—", hydrolysis: "Ba²⁺ + S²⁻ + 2H₂O → Ba(OH)₂ + H₂S↑" },
    "Ca²⁺": { solubility: "—", hydrolysis: "Ca² + S²⁻ + 2H₂O → Ca(OH)₂ + H₂S↑" },
    "Mg²⁺": { solubility: "—", hydrolysis: "Mg²⁺ + S²⁻ + 2H₂O → Mg(OH)₂↓ + H₂S↑" },
    "Sr²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Sr²⁺ + S²⁻ → SrS↓" },
    "Al³⁺": { solubility: "—", hydrolysis: "2Al³⁺ + 3S² + 6H₂O → 2Al(OH)₃↓ + 3H₂S↑" },
    "Cr³⁺": { solubility: "—", hydrolysis: "2Cr³⁺ + 3S²⁻ + 6H₂O → 2Cr(OH)₃↓ + 3H₂S↑" },
    "Fe²⁺": { solubility: "Н", precipitateColor: "чёрный", ionicEquation: "Fe²⁺ + S²⁻ → FeS↓" },
    "Fe³⁺": { solubility: "—", hydrolysis: "2Fe³ + 3S²⁻ → 2FeS↓ + S↓" },
    "Mn²": { solubility: "Н", precipitateColor: "розовый", ionicEquation: "Mn²⁺ + S²⁻ → MnS↓" },
    "Zn²": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Zn²⁺ + S²⁻ → ZnS↓" },
    "Ag⁺": { solubility: "Н", precipitateColor: "чёрный", ionicEquation: "2Ag⁺ + S²⁻ → Ag₂S↓" },
    "Hg²": { solubility: "Н", precipitateColor: "чёрный", ionicEquation: "Hg²⁺ + S²⁻ → HgS↓" },
    "Pb²": { solubility: "Н", precipitateColor: "чёрный", ionicEquation: "Pb²⁺ + S²⁻ → PbS↓" },
    "Sn²⁺": { solubility: "Н", precipitateColor: "коричневый", ionicEquation: "Sn²⁺ + S²⁻ → SnS↓" },
    "Cu²⁺": { solubility: "Н", precipitateColor: "чёрный", ionicEquation: "Cu²⁺ + S²⁻ → CuS↓" }
  }},
  { anion: "HS⁻", data: {
    "H": { solubility: "Р" }, "Li⁺": { solubility: "Р" }, "K⁺": { solubility: "Р" }, "Na⁺": { solubility: "Р" },
    "NH": { solubility: "Р" }, "Ba²⁺": { solubility: "Р" }, "Ca²⁺": { solubility: "Р" },
    "Mg²⁺": { solubility: "Р" }, "Sr²⁺": { solubility: "Р" },
    "Al³⁺": { solubility: "?" }, "Cr³": { solubility: "?" }, "Fe²": { solubility: "?" },
    "Fe³⁺": { solubility: "?" }, "Mn²⁺": { solubility: "?" }, "Zn²⁺": { solubility: "?" },
    "Ag": { solubility: "?" }, "Hg²⁺": { solubility: "?" }, "Pb²": { solubility: "?" },
    "Sn²⁺": { solubility: "?" }, "Cu²⁺": { solubility: "?" }
  }},
  { anion: "SO₃²⁻", data: {
    "H⁺": { solubility: "Р" }, "Li⁺": { solubility: "Р" }, "K⁺": { solubility: "Р" }, "Na": { solubility: "Р" },
    "NH₄⁺": { solubility: "Р" },
    "Ba²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Ba²⁺ + SO₃²⁻ → BaSO₃↓" },
    "Ca²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Ca²⁺ + SO₃² → CaSO₃↓" },
    "Mg²⁺": { solubility: "М" },
    "Sr²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Sr² + SO₃²⁻ → SrSO↓" },
    "Al³⁺": { solubility: "—", hydrolysis: "2Al³⁺ + 3SO²⁻ + 3H₂O → 2Al(OH)₃↓ + 3SO₂↑" },
    "Cr³⁺": { solubility: "—", hydrolysis: "2Cr³⁺ + 3SO₃² + 3H₂O → 2Cr(OH)₃↓ + 3SO₂↑" },
    "Fe²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Fe² + SO₃²⁻ → FeSO↓" },
    "Fe³": { solubility: "—", hydrolysis: "2Fe³⁺ + SO₃²⁻ + H₂O → 2Fe²⁺ + SO₄²⁻ + 2H⁺" },
    "Mn²⁺": { solubility: "Н", precipitateColor: "розовый", ionicEquation: "Mn²⁺ + SO²⁻ → MnSO₃↓" },
    "Zn²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Zn² + SO₃²⁻ → ZnSO↓" },
    "Ag⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "2Ag⁺ + SO₃²⁻ → Ag₂SO₃↓" },
    "Hg²": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Hg²⁺ + SO₃²⁻ → HgSO₃↓" },
    "Pb²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Pb²⁺ + SO₃²⁻ → PbSO₃↓" },
    "Sn²": { solubility: "?" },
    "Cu²⁺": { solubility: "Н", precipitateColor: "зелёный", ionicEquation: "2Cu²⁺ + 2SO₃²⁻ + H₂O → Cu₂SO₃↓ + SO² + 2H⁺" }
  }},
  { anion: "HSO₃⁻", data: {
    "H⁺": { solubility: "Р" }, "Li⁺": { solubility: "Р" }, "K⁺": { solubility: "Р" }, "Na⁺": { solubility: "Р" },
    "NH₄⁺": { solubility: "Р" }, "Ba²⁺": { solubility: "Р" }, "Ca²": { solubility: "Р" },
    "Mg²⁺": { solubility: "Р" }, "Sr²⁺": { solubility: "Р" },
    "Al³⁺": { solubility: "?" }, "Cr³⁺": { solubility: "?" }, "Fe²⁺": { solubility: "?" },
    "Fe³": { solubility: "?" }, "Mn²⁺": { solubility: "?" }, "Zn²⁺": { solubility: "?" },
    "Ag⁺": { solubility: "?" }, "Hg²⁺": { solubility: "?" }, "Pb²": { solubility: "?" },
    "Sn²": { solubility: "?" }, "Cu²⁺": { solubility: "?" }
  }},
  { anion: "SO₄²⁻", data: {
    "H": { solubility: "Р" }, "Li⁺": { solubility: "Р" }, "K⁺": { solubility: "Р" }, "Na⁺": { solubility: "Р" },
    "NH": { solubility: "Р" },
    "Ba²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Ba²⁺ + SO₄²⁻ → BaSO₄↓" },
    "Ca²⁺": { solubility: "М", precipitateColor: "белый", ionicEquation: "Ca² + SO₄²⁻ → CaSO↓" },
    "Mg²⁺": { solubility: "Р" },
    "Sr²⁺": { solubility: "М", precipitateColor: "белый", ionicEquation: "Sr²⁺ + SO²⁻ → SrSO₄↓" },
    "Al³⁺": { solubility: "Р" }, "Cr³⁺": { solubility: "Р" }, "Fe²": { solubility: "Р" },
    "Fe³⁺": { solubility: "Р" }, "Mn²⁺": { solubility: "Р" }, "Zn²": { solubility: "Р" },
    "Ag⁺": { solubility: "М", precipitateColor: "белый", ionicEquation: "2Ag⁺ + SO²⁻ → Ag₂SO₄↓" },
    "Hg²⁺": { solubility: "Р" },
    "Pb²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Pb²⁺ + SO₄² → PbSO₄↓" },
    "Sn²⁺": { solubility: "Р" }, "Cu²⁺": { solubility: "Р" }
  }},
  { anion: "HSO₄", data: {
    "H⁺": { solubility: "Р" }, "Li": { solubility: "Р" }, "K⁺": { solubility: "Р" }, "Na⁺": { solubility: "Р" },
    "NH₄⁺": { solubility: "Р" }, "Ba²": { solubility: "Р" }, "Ca²⁺": { solubility: "Р" },
    "Mg²⁺": { solubility: "Р" }, "Sr²": { solubility: "Р" }, "Al³⁺": { solubility: "Р" },
    "Cr³⁺": { solubility: "Р" }, "Fe²": { solubility: "Р" }, "Fe³⁺": { solubility: "Р" },
    "Mn²⁺": { solubility: "Р" }, "Zn²": { solubility: "Р" }, "Ag⁺": { solubility: "Р" },
    "Hg²⁺": { solubility: "Р" }, "Pb²⁺": { solubility: "Р" }, "Sn²⁺": { solubility: "Р" },
    "Cu²⁺": { solubility: "Р" }
  }},
  { anion: "NO₃", data: {
    "H⁺": { solubility: "Р" }, "Li": { solubility: "Р" }, "K": { solubility: "Р" }, "Na⁺": { solubility: "Р" },
    "NH₄⁺": { solubility: "Р" }, "Ba²⁺": { solubility: "Р" }, "Ca²⁺": { solubility: "Р" },
    "Mg²⁺": { solubility: "Р" }, "Sr²⁺": { solubility: "Р" }, "Al³⁺": { solubility: "Р" },
    "Cr³⁺": { solubility: "Р" }, "Fe²": { solubility: "Р" }, "Fe³⁺": { solubility: "Р" },
    "Mn²⁺": { solubility: "Р" }, "Zn²⁺": { solubility: "Р" }, "Ag⁺": { solubility: "Р" },
    "Hg²⁺": { solubility: "Р" }, "Pb²": { solubility: "Р" }, "Sn²⁺": { solubility: "Р" },
    "Cu²⁺": { solubility: "Р" }
  }},
  { anion: "NO₂⁻", data: {
    "H⁺": { solubility: "Р" }, "Li⁺": { solubility: "Р" }, "K⁺": { solubility: "Р" }, "Na⁺": { solubility: "Р" },
    "NH₄⁺": { solubility: "Р" }, "Ba²⁺": { solubility: "Р" }, "Ca²": { solubility: "Р" },
    "Mg²⁺": { solubility: "Р" }, "Sr²⁺": { solubility: "Р" }, "Al³": { solubility: "Р" },
    "Cr³⁺": { solubility: "Р" }, "Fe²⁺": { solubility: "Р" }, "Fe³": { solubility: "Р" },
    "Mn²⁺": { solubility: "Р" }, "Zn²⁺": { solubility: "Р" },
    "Ag⁺": { solubility: "М", precipitateColor: "белый", ionicEquation: "Ag⁺ + NO₂⁻ → AgNO₂↓" },
    "Hg²⁺": { solubility: "Р" }, "Pb²⁺": { solubility: "Р" },
    "Sn²⁺": { solubility: "?" }, "Cu²⁺": { solubility: "Р" }
  }},
  { anion: "PO₄³⁻", data: {
    "H⁺": { solubility: "Р" },
    "Li⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "3Li⁺ + PO³⁻ → Li₃PO₄↓" },
    "K⁺": { solubility: "Р" }, "Na⁺": { solubility: "Р" }, "NH₄⁺": { solubility: "Р" },
    "Ba²": { solubility: "Н", precipitateColor: "белый", ionicEquation: "3Ba²⁺ + 2PO³⁻ → Ba(PO₄)₂↓" },
    "Ca²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "3Ca²⁺ + 2PO₄³ → Ca₃(PO₄)₂↓" },
    "Mg²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "3Mg²⁺ + 2PO₄³ → Mg₃(PO₄)₂↓" },
    "Sr²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "3Sr²⁺ + 2PO₄³ → Sr₃(PO)₂↓" },
    "Al³": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Al³⁺ + PO₄³⁻ → AlPO₄↓" },
    "Cr³⁺": { solubility: "Н", precipitateColor: "зелёный", ionicEquation: "Cr³⁺ + PO₄³⁻ → CrPO₄↓" },
    "Fe²": { solubility: "Н", precipitateColor: "зелёный", ionicEquation: "3Fe²⁺ + 2PO³⁻ → Fe₃(PO)₂↓" },
    "Fe³⁺": { solubility: "Н", precipitateColor: "жёлто-зелёный", ionicEquation: "Fe³⁺ + PO₄³⁻ → FePO₄↓" },
    "Mn²⁺": { solubility: "Н", precipitateColor: "розовый", ionicEquation: "3Mn²⁺ + 2PO₄³⁻ → Mn₃(PO₄)₂↓" },
    "Zn²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "3Zn²⁺ + 2PO₄³ → Zn₃(PO₄)₂↓" },
    "Ag⁺": { solubility: "Н", precipitateColor: "жёлтый", ionicEquation: "3Ag⁺ + PO₄³⁻ → AgPO↓" },
    "Hg²": { solubility: "Н", precipitateColor: "жёлтый", ionicEquation: "3Hg²⁺ + 2PO³ → Hg₃(PO)₂↓" },
    "Pb²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "3Pb²⁺ + 2PO₄³⁻ → Pb₃(PO₄)₂↓" },
    "Sn²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "3Sn²⁺ + 2PO₄³⁻ → Sn₃(PO₄)₂↓" },
    "Cu²⁺": { solubility: "Н", precipitateColor: "голубой", ionicEquation: "3Cu² + 2PO³⁻ → Cu₃(PO₄)₂↓" }
  }},
  { anion: "HPO₄²⁻", data: {
    "H⁺": { solubility: "Р" },
    "Li⁺": { solubility: "?" },
    "K": { solubility: "Р" }, "Na⁺": { solubility: "Р" }, "NH₄⁺": { solubility: "Р" },
    "Ba²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "3Ba²⁺ + 2HPO₄²⁻ → Ba₃(PO₄)₂↓ + 2H⁺" },
    "Ca²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "3Ca²⁺ + 2HPO₄²⁻ → Ca₃(PO₄)₂↓ + 2H" },
    "Mg²⁺": { solubility: "М" },
    "Sr²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "3Sr²⁺ + 2HPO₄²⁻ → Sr₃(PO₄)₂↓ + 2H⁺" },
    "Al³⁺": { solubility: "?" }, "Cr³⁺": { solubility: "?" },
    "Fe²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "3Fe²⁺ + 2HPO₄² → Fe(PO₄)₂↓ + 2H⁺" },
    "Fe³⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Fe³⁺ + HPO₄² → FePO₄↓ + H⁺" },
    "Mn²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "3Mn²⁺ + 2HPO₄² → Mn₃(PO₄)₂↓ + 2H⁺" },
    "Zn²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "3Zn²⁺ + 2HPO₄²⁻ → Zn₃(PO₄)₂↓ + 2H" },
    "Ag⁺": { solubility: "Н", precipitateColor: "жёлтый", ionicEquation: "3Ag⁺ + HPO₄²⁻ → Ag₃PO₄↓ + H⁺" },
    "Hg²⁺": { solubility: "Н", precipitateColor: "жёлтый", ionicEquation: "3Hg² + 2HPO₄²⁻ → Hg₃(PO₄)₂↓ + 2H⁺" },
    "Pb²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "3Pb²⁺ + 2HPO₄²⁻ → Pb₃(PO₄)₂↓ + 2H⁺" },
    "Sn²": { solubility: "М" },
    "Cu²⁺": { solubility: "Н", precipitateColor: "голубой", ionicEquation: "3Cu²⁺ + 2HPO₄²⁻ → Cu₃(PO)₂↓ + 2H" }
  }},
  { anion: "H₂PO₄⁻", data: {
    "H⁺": { solubility: "Р" }, "Li⁺": { solubility: "Р" }, "K": { solubility: "Р" }, "Na⁺": { solubility: "Р" },
    "NH₄⁺": { solubility: "Р" }, "Ba²⁺": { solubility: "Р" }, "Ca²⁺": { solubility: "Р" },
    "Mg²⁺": { solubility: "Р" }, "Sr²⁺": { solubility: "Р" }, "Al³⁺": { solubility: "Р" },
    "Cr³⁺": { solubility: "Р" }, "Fe²": { solubility: "Р" }, "Fe³⁺": { solubility: "Р" },
    "Mn²⁺": { solubility: "Р" }, "Zn²⁺": { solubility: "Р" }, "Ag⁺": { solubility: "Р" },
    "Hg²": { solubility: "Р" }, "Pb²⁺": { solubility: "Р" }, "Sn²⁺": { solubility: "Р" },
    "Cu²⁺": { solubility: "Р" }
  }},
  { anion: "CO₃²⁻", data: {
    "H⁺": { solubility: "Р" }, "Li⁺": { solubility: "Р" }, "K⁺": { solubility: "Р" }, "Na⁺": { solubility: "Р" },
    "NH": { solubility: "Р" },
    "Ba²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Ba² + CO₃²⁻ → BaCO₃↓" },
    "Ca²": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Ca²⁺ + CO₃²⁻ → CaCO₃↓" },
    "Mg²": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Mg²⁺ + CO²⁻ → MgCO₃↓" },
    "Sr²": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Sr²⁺ + CO₃² → SrCO₃↓" },
    "Al³⁺": { solubility: "—", hydrolysis: "2Al³ + 3CO₃²⁻ + 3H₂O → 2Al(OH)↓ + 3CO₂↑" },
    "Cr³": { solubility: "—", hydrolysis: "2Cr³⁺ + 3CO₃²⁻ + 3H₂O → 2Cr(OH)₃↓ + 3CO₂↑" },
    "Fe²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Fe²⁺ + CO₃²⁻ → FeCO₃↓" },
    "Fe³⁺": { solubility: "—", hydrolysis: "2Fe³⁺ + 3CO₃²⁻ + 3H₂O → 2Fe(OH)₃↓ + 3CO₂↑" },
    "Mn²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Mn²⁺ + CO₃²⁻ → MnCO₃↓" },
    "Zn²": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Zn²⁺ + CO₃² → ZnCO₃↓" },
    "Ag⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "2Ag⁺ + CO²⁻ → Ag₂CO₃↓" },
    "Hg²⁺": { solubility: "Н", precipitateColor: "жёлтый", ionicEquation: "Hg²⁺ + CO₃²⁻ → HgCO↓" },
    "Pb²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Pb²⁺ + CO₃²⁻ → PbCO₃↓" },
    "Sn²": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Sn²⁺ + CO₃²⁻ → SnCO₃↓" },
    "Cu²⁺": { solubility: "Н", precipitateColor: "зелёный", ionicEquation: "2Cu² + CO₃²⁻ → Cu₂(OH)₂CO₃↓ + CO₂↑" }
  }},
  { anion: "HCO₃⁻", data: {
    "H⁺": { solubility: "Р" }, "Li⁺": { solubility: "Р" }, "K": { solubility: "Р" }, "Na⁺": { solubility: "Р" },
    "NH₄⁺": { solubility: "Р" }, "Ba²⁺": { solubility: "Р" }, "Ca²⁺": { solubility: "Р" },
    "Mg²⁺": { solubility: "Р" }, "Sr²⁺": { solubility: "Р" },
    "Al³": { solubility: "?" }, "Cr³⁺": { solubility: "?" },
    "Fe²⁺": { solubility: "Р" },
    "Fe³⁺": { solubility: "?" },
    "Mn²⁺": { solubility: "Р" }, "Zn²⁺": { solubility: "Р" },
    "Ag⁺": { solubility: "?" }, "Hg²⁺": { solubility: "?" },
    "Pb²⁺": { solubility: "Р" }, "Sn²⁺": { solubility: "Р" }, "Cu²⁺": { solubility: "Р" }
  }},
  { anion: "CH₃COO⁻", data: {
    "H⁺": { solubility: "Р" }, "Li⁺": { solubility: "Р" }, "K⁺": { solubility: "Р" }, "Na⁺": { solubility: "Р" },
    "NH₄⁺": { solubility: "Р" }, "Ba²": { solubility: "Р" }, "Ca²⁺": { solubility: "Р" },
    "Mg²⁺": { solubility: "Р" }, "Sr²": { solubility: "Р" },
    "Al³⁺": { solubility: "—", hydrolysis: "Al³⁺ + 3CH₃COO⁻ + 3H₂O → Al(OH)₃↓ + 3CH₃COOH" },
    "Cr³⁺": { solubility: "Р" }, "Fe²⁺": { solubility: "Р" },
    "Fe³": { solubility: "—", hydrolysis: "Fe³⁺ + 3CHCOO⁻ + 3H₂O → Fe(OH)₃↓ + 3CHCOOH" },
    "Mn²": { solubility: "Р" }, "Zn²": { solubility: "Р" },
    "Ag⁺": { solubility: "М", precipitateColor: "белый", ionicEquation: "Ag⁺ + CHCOO⁻ → CH₃COOAg↓" },
    "Hg²⁺": { solubility: "Р" }, "Pb²⁺": { solubility: "Р" },
    "Sn²⁺": { solubility: "—" }, "Cu²": { solubility: "Р" }
  }},
  { anion: "SiO₃²⁻", data: {
    "H⁺": { solubility: "Н", precipitateColor: "белый студенистый", ionicEquation: "2H⁺ + SiO₃² → H₂SiO₃↓" },
    "Li⁺": { solubility: "Р" }, "K": { solubility: "Р" }, "Na⁺": { solubility: "Р" }, "NH₄": { solubility: "Р" },
    "Ba²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Ba²⁺ + SiO₃²⁻ → BaSiO₃↓" },
    "Ca²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Ca²⁺ + SiO₃²⁻ → CaSiO₃↓" },
    "Mg²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Mg² + SiO²⁻ → MgSiO↓" },
    "Sr²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Sr²⁺ + SiO₃²⁻ → SrSiO₃↓" },
    "Al³⁺": { solubility: "?" }, "Cr³": { solubility: "?" },
    "Fe²": { solubility: "Н", precipitateColor: "зелёный", ionicEquation: "Fe²⁺ + SiO₃²⁻ → FeSiO₃↓" },
    "Fe³⁺": { solubility: "?" },
    "Mn²": { solubility: "Н", precipitateColor: "розовый", ionicEquation: "Mn²⁺ + SiO₃² → MnSiO₃↓" },
    "Zn²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Zn²⁺ + SiO₃²⁻ → ZnSiO↓" },
    "Ag⁺": { solubility: "Н", precipitateColor: "жёлтый", ionicEquation: "2Ag⁺ + SiO₃²⁻ → Ag₂SiO₃↓" },
    "Hg²⁺": { solubility: "Н", precipitateColor: "жёлтый", ionicEquation: "Hg²⁺ + SiO₃²⁻ → HgSiO₃↓" },
    "Pb²⁺": { solubility: "Н", precipitateColor: "белый", ionicEquation: "Pb²⁺ + SiO₃²⁻ → PbSiO↓" },
    "Sn²": { solubility: "?" },
    "Cu²⁺": { solubility: "Н", precipitateColor: "голубой", ionicEquation: "Cu²⁺ + SiO₃²⁻ → CuSiO₃↓" }
  }},
  { anion: "MnO₄⁻", data: {
    "H⁺": { solubility: "Р" }, "Li⁺": { solubility: "Р" }, "K⁺": { solubility: "Р" }, "Na⁺": { solubility: "Р" },
    "NH₄⁺": { solubility: "Р" }, "Ba²": { solubility: "Р" }, "Ca²⁺": { solubility: "Р" },
    "Mg²⁺": { solubility: "Р" }, "Sr²⁺": { solubility: "Р" }, "Al³⁺": { solubility: "Р" },
    "Cr³⁺": { solubility: "?" }, "Fe²⁺": { solubility: "?" }, "Fe³⁺": { solubility: "?" },
    "Mn²⁺": { solubility: "Р" }, "Zn²⁺": { solubility: "Р" },
    "Ag⁺": { solubility: "Н", precipitateColor: "тёмно-фиолетовый", ionicEquation: "Ag⁺ + MnO₄ → AgMnO₄↓" },
    "Hg²⁺": { solubility: "Р" }, "Pb²⁺": { solubility: "Р" },
    "Sn²⁺": { solubility: "?" }, "Cu²⁺": { solubility: "Р" }
  }},
  { anion: "CrO₄²⁻", data: {
    "H⁺": { solubility: "Р" }, "Li⁺": { solubility: "Р" }, "K⁺": { solubility: "Р" }, "Na⁺": { solubility: "Р" },
    "NH₄⁺": { solubility: "Р" },
    "Ba²⁺": { solubility: "М", precipitateColor: "жёлтый", ionicEquation: "Ba²⁺ + CrO₄²⁻ → BaCrO↓" },
    "Ca²⁺": { solubility: "М", precipitateColor: "жёлтый", ionicEquation: "Ca²⁺ + CrO₄²⁻ → CaCrO₄↓" },
    "Mg²⁺": { solubility: "Р" },
    "Sr²": { solubility: "М", precipitateColor: "жёлтый", ionicEquation: "Sr²⁺ + CrO₄² → SrCrO₄↓" },
    "Al³⁺": { solubility: "?" }, "Cr³⁺": { solubility: "?" }, "Fe²⁺": { solubility: "?" },
    "Fe³": { solubility: "?" }, "Mn²⁺": { solubility: "?" }, "Zn²⁺": { solubility: "?" },
    "Ag": { solubility: "Н", precipitateColor: "кирпично-красный", ionicEquation: "2Ag + CrO₄² → Ag₂CrO₄↓" },
    "Hg²": { solubility: "Н", precipitateColor: "красный", ionicEquation: "Hg²⁺ + CrO₄²⁻ → HgCrO↓" },
    "Pb²⁺": { solubility: "Н", precipitateColor: "жёлтый", ionicEquation: "Pb²⁺ + CrO₄² → PbCrO₄↓" },
    "Sn²⁺": { solubility: "?" }, "Cu²⁺": { solubility: "Р" }
  }},
  { anion: "Cr₂O₇²", data: {
    "H⁺": { solubility: "Р" }, "Li": { solubility: "Р" }, "K⁺": { solubility: "Р" }, "Na⁺": { solubility: "Р" },
    "NH₄⁺": { solubility: "Р" }, "Ba²": { solubility: "Р" }, "Ca²⁺": { solubility: "Р" },
    "Mg²⁺": { solubility: "Р" }, "Sr²⁺": { solubility: "Р" },
    "Al³": { solubility: "?" }, "Cr³⁺": { solubility: "?" }, "Fe²⁺": { solubility: "?" },
    "Fe³⁺": { solubility: "?" }, "Mn²⁺": { solubility: "?" }, "Zn²⁺": { solubility: "?" },
    "Ag⁺": { solubility: "Н", precipitateColor: "красно-коричневый", ionicEquation: "2Ag⁺ + Cr₂O²⁻ → Ag₂Cr₂O₇↓" },
    "Hg²⁺": { solubility: "Р" },
    "Pb²⁺": { solubility: "Н", precipitateColor: "жёлтый", ionicEquation: "Pb²⁺ + Cr₂O₇²⁻ → PbCr₂O↓" },
    "Sn²": { solubility: "?" }, "Cu²⁺": { solubility: "Р" }
  }},
  { anion: "ClO₄⁻", data: {
    "H": { solubility: "Р" }, "Li⁺": { solubility: "Р" }, "K⁺": { solubility: "Р" }, "Na⁺": { solubility: "Р" },
    "NH₄": { solubility: "Р" }, "Ba²⁺": { solubility: "Р" }, "Ca²": { solubility: "Р" },
    "Mg²": { solubility: "Р" }, "Sr²": { solubility: "Р" }, "Al³⁺": { solubility: "Р" },
    "Cr³": { solubility: "Р" }, "Fe²": { solubility: "Р" }, "Fe³⁺": { solubility: "Р" },
    "Mn²": { solubility: "Р" }, "Zn²⁺": { solubility: "Р" }, "Ag⁺": { solubility: "Р" },
    "Hg²": { solubility: "Р" }, "Pb²⁺": { solubility: "Р" }, "Sn²⁺": { solubility: "Р" },
    "Cu²": { solubility: "Р" }
  }},
];

// ============ 3. РЯД НАПРЯЖЁННОСТИ МЕТАЛЛОВ (КАК НА КАРТИНКЕ) ============
const ACTIVITY_SERIES = [
  { symbol: "Li", name: "Литий", potential: "-3.045", color: "bg-red-400" },
  { symbol: "Rb", name: "Рубидий", potential: "-2.925", color: "bg-red-400" },
  { symbol: "K", name: "Калий", potential: "-2.924", color: "bg-red-400" },
  { symbol: "Ba", name: "Барий", potential: "-2.905", color: "bg-red-400" },
  { symbol: "Sr", name: "Стронций", potential: "-2.899", color: "bg-red-400" },
  { symbol: "Ca", name: "Кальций", potential: "-2.866", color: "bg-red-400" },
  { symbol: "Na", name: "Натрий", potential: "-2.714", color: "bg-orange-400" },
  { symbol: "Mg", name: "Магний", potential: "-2.363", color: "bg-orange-400" },
  { symbol: "Al", name: "Алюминий", potential: "-1.663", color: "bg-yellow-400" },
  { symbol: "Mn", name: "Марганец", potential: "-1.185", color: "bg-yellow-400" },
  { symbol: "Zn", name: "Цинк", potential: "-0.763", color: "bg-yellow-400" },
  { symbol: "Cr", name: "Хром", potential: "-0.744", color: "bg-yellow-400" },
  { symbol: "Fe", name: "Железо", potential: "-0.440", color: "bg-lime-400" },
  { symbol: "Co", name: "Кобальт", potential: "-0.277", color: "bg-lime-400" },
  { symbol: "Ni", name: "Никель", potential: "-0.250", color: "bg-lime-400" },
  { symbol: "Sn", name: "Олово", potential: "-0.136", color: "bg-green-400" },
  { symbol: "Pb", name: "Свинец", potential: "-0.126", color: "bg-green-400" },
  { symbol: "H₂", name: "Водород", potential: "0.000", color: "bg-blue-400", isReference: true },
  { symbol: "Sb", name: "Сурьма", potential: "+0.150", color: "bg-cyan-400" },
  { symbol: "Bi", name: "Висмут", potential: "+0.215", color: "bg-cyan-400" },
  { symbol: "Cu", name: "Медь", potential: "+0.337", color: "bg-cyan-400" },
  { symbol: "Hg", name: "Ртуть", potential: "+0.799", color: "bg-indigo-400" },
  { symbol: "Ag", name: "Серебро", potential: "+0.799", color: "bg-indigo-400" },
  { symbol: "Pt", name: "Платина", potential: "+1.188", color: "bg-purple-400" },
  { symbol: "Au", name: "Золото", potential: "+1.500", color: "bg-purple-400" },
];

function getBlockColor(block: string): string {
  switch (block) {
    case "s": return "bg-amber-200 hover:bg-amber-300 text-amber-900";
    case "p": return "bg-emerald-200 hover:bg-emerald-300 text-emerald-900";
    case "d": return "bg-violet-200 hover:bg-violet-300 text-violet-900";
    case "f": return "bg-rose-200 hover:bg-rose-300 text-rose-900";
    default: return "bg-gray-200 hover:bg-gray-300 text-gray-900";
  }
}

function getCellColor(cell: any): string {
  if (cell.precipitateColor) {
    const colorMap: Record<string, string> = {
      "белый": "bg-white border-2 border-gray-300",
      "белый творожистый": "bg-white border-2 border-gray-400",
      "белый студенистый": "bg-white border-2 border-gray-300",
      "жёлтый": "bg-yellow-200 border-2 border-yellow-400",
      "светло-жёлтый": "bg-yellow-100 border-2 border-yellow-300",
      "кирпично-красный": "bg-red-400 border-2 border-red-500 text-white",
      "красный": "bg-red-300 border-2 border-red-400",
      "красно-коричневый": "bg-red-500 border-2 border-red-600 text-white",
      "бурый": "bg-orange-400 border-2 border-orange-500 text-white",
      "чёрный": "bg-gray-800 border-2 border-gray-900 text-white",
      "зелёный": "bg-green-400 border-2 border-green-500",
      "зеленоватый": "bg-green-200 border-2 border-green-400",
      "серо-зелёный": "bg-green-300 border-2 border-green-500",
      "голубой": "bg-blue-300 border-2 border-blue-400",
      "розовый": "bg-pink-300 border-2 border-pink-400",
      "коричневый": "bg-amber-700 border-2 border-amber-800 text-white",
      "тёмно-фиолетовый": "bg-purple-600 border-2 border-purple-700 text-white",
    };
    return colorMap[cell.precipitateColor] || "bg-white border-2 border-gray-300";
  }
  switch (cell.solubility) {
    case "Р": return "bg-emerald-50 hover:bg-emerald-100 text-emerald-900";
    case "М": return "bg-amber-50 hover:bg-amber-100 text-amber-900";
    case "Н": return "bg-rose-50 hover:bg-rose-100 text-rose-900";
    case "—": return "bg-gray-200 hover:bg-gray-300 text-gray-700";
    case "?": return "bg-violet-50 hover:bg-violet-100 text-violet-700";
    default: return "bg-gray-50 hover:bg-gray-100 text-gray-900";
  }
}

function getSolubilityLabel(solubility: string): string {
  switch (solubility) {
    case "Р": return "Растворимо (> 1 г на 100 г H₂O)";
    case "М": return "Малорастворимо (0.1 - 1 г на 100 г H₂O)";
    case "Н": return "Нерастворимо (< 0.01 г на 100 г H₂O)";
    case "—": return "Разлагается в воде";
    case "?": return "Нет достоверных данных";
    default: return solubility;
  }
}

export default function ReferenceTables() {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"periodic" | "solubility" | "activity">("periodic");
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [selectedCell, setSelectedCell] = useState<any>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setSelectedCell(null);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform duration-300"
        title="Справочные таблицы"
      >
        <Table2 className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setIsOpen(false); setSelectedCell(null); }} style={{ zIndex: 9999 }}>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-3xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">📚 Справочные таблицы</h2>
              <button onClick={() => { setIsOpen(false); setSelectedCell(null); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex gap-2 p-4 bg-white/60 border-b border-amber-200 overflow-x-auto">
              <button onClick={() => setTab("periodic")} className={`px-5 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap ${tab === "periodic" ? "bg-amber-600 text-white" : "bg-white/80 text-amber-900 hover:bg-amber-50"}`}>📊 Менделеева</button>
              <button onClick={() => setTab("solubility")} className={`px-5 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap ${tab === "solubility" ? "bg-amber-600 text-white" : "bg-white/80 text-amber-900 hover:bg-amber-50"}`}>💧 Растворимость</button>
              <button onClick={() => setTab("activity")} className={`px-5 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap ${tab === "activity" ? "bg-amber-600 text-white" : "bg-white/80 text-amber-900 hover:bg-amber-50"}`}>⚡ Ряд активности</button>
            </div>

            <div className="overflow-auto max-h-[calc(95vh-140px)] p-4">
              {tab === "periodic" && (
                <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg p-4 border border-amber-200">
                  <p className="text-center text-lg font-bold text-amber-900 mb-4">ПЕРИОДИЧЕСКАЯ СИСТЕМА ХИМИЧЕСКИХ ЭЛЕМЕНТОВ Д.И. МЕНДЕЛЕЕВА</p>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border-2 border-amber-400 text-xs">
                      <thead>
                        <tr>
                          <th className="border border-amber-300 p-1 bg-amber-100 text-amber-900 w-12"></th>
                          <th className="border border-amber-300 p-1 bg-amber-100 text-amber-900" colSpan={8}>Г р у п п ы</th>
                        </tr>
                        <tr>
                          <th className="border border-amber-300 p-1 bg-amber-50 text-amber-900"></th>
                          {["I", "II", "III", "IV", "V", "VI", "VII", "VIII"].map(group => (
                            <th key={group} className="border border-amber-300 p-1 bg-amber-50 text-amber-900 text-center font-bold">{group}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {PERIODIC_DATA.map((periodData) => (
                          <tr key={periodData.period}>
                            <td className="border border-amber-300 p-1 bg-amber-50 text-amber-900 font-bold text-center">{periodData.period}</td>
                            {periodData.groups.map((group, idx) => (
                              <td key={idx} className="border border-amber-300 p-1">
                                <div className="flex flex-col gap-0.5">
                                  {group.A && (
                                    <button 
                                      onClick={() => {
                                        const el = ELEMENT_DATA[group.A!.split(",")[0].trim()];
                                        if (el) setSelectedElement(el);
                                      }}
                                      className={`p-1 rounded text-[10px] font-bold transition hover:scale-105 ${getBlockColor(ELEMENT_DATA[group.A!.split(",")[0].trim()]?.block || "s")}`}
                                    >
                                      {group.A}
                                    </button>
                                  )}
                                  {group.B && (
                                    <button 
                                      onClick={() => {
                                        const firstEl = group.B!.split(",")[0].trim();
                                        const el = ELEMENT_DATA[firstEl];
                                        if (el) setSelectedElement(el);
                                      }}
                                      className={`p-1 rounded text-[10px] font-bold transition hover:scale-105 ${getBlockColor(ELEMENT_DATA[group.B!.split(",")[0].trim()]?.block || "d")}`}
                                    >
                                      {group.B}
                                    </button>
                                  )}
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs font-bold text-amber-900 mb-2">* Лантаноиды</p>
                    <div className="grid grid-cols-7 md:grid-cols-14 gap-1">
                      {LANTHANOIDS.map(el => (
                        <button key={el.symbol} onClick={() => setSelectedElement(el)} className="p-1.5 rounded bg-rose-200 hover:bg-rose-300 text-rose-900 text-[10px] font-bold transition">
                          {el.symbol}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs font-bold text-amber-900 mb-2">** Актиноиды</p>
                    <div className="grid grid-cols-7 md:grid-cols-14 gap-1">
                      {ACTINOIDS.map(el => (
                        <button key={el.symbol} onClick={() => setSelectedElement(el)} className="p-1.5 rounded bg-rose-200 hover:bg-rose-300 text-rose-900 text-[10px] font-bold transition">
                          {el.symbol}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === "solubility" && (
                <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg p-4 border border-amber-200">
                  <p className="text-sm font-bold text-amber-900 mb-3 text-center">РАСТВОРИМОСТЬ КИСЛОТ, СОЛЕЙ И ОСНОВАНИЙ В ВОДЕ</p>
                  <div className="flex flex-wrap gap-3 mb-4 text-xs justify-center">
                    <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 border border-gray-300 bg-emerald-50" /> Р — растворимо</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 border border-gray-300 bg-amber-50" /> М — малорастворимо</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 border border-gray-300 bg-rose-50" /> Н — нерастворимо</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 border border-gray-300 bg-gray-200" /> — — разлагается</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 border border-gray-300 bg-violet-50" /> ? — нет данных</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[10px] md:text-xs">
                      <thead>
                        <tr>
                          <th className="border border-amber-200 p-1.5 bg-amber-50 text-amber-900 sticky left-0 z-10 min-w-[60px]">Анионы ↓<br/>Катионы →</th>
                          {CATIONS.map(c => (
                            <th key={c} className="border border-amber-200 p-1.5 bg-amber-50 text-center font-mono whitespace-nowrap text-amber-900 min-w-[40px]">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {SOLUBILITY_DATA.map(row => (
                          <tr key={row.anion}>
                            <td className="border border-amber-200 p-1.5 font-mono font-bold bg-amber-50 whitespace-nowrap text-amber-900 sticky left-0 z-10">{row.anion}</td>
                            {CATIONS.map(cat => {
                              const cell = row.data[cat];
                              if (!cell) return <td key={cat} className="border border-amber-200 p-1.5 text-center text-amber-700 bg-gray-50">—</td>;
                              const isClickable = cell.ionicEquation || cell.hydrolysis || cell.solubility === "Н" || cell.solubility === "—";
                              return (
                                <td
                                  key={cat}
                                  onClick={() => isClickable && setSelectedCell({ anion: row.anion, cation: cat, ...cell })}
                                  className={`border border-amber-200 p-1.5 text-center font-bold transition ${getCellColor(cell)} ${isClickable ? "cursor-pointer hover:ring-2 hover:ring-amber-400 hover:z-10 relative" : ""}`}
                                >
                                  {cell.solubility}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === "activity" && (
                <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg p-4 border border-amber-200">
                  <p className="text-sm font-bold text-amber-900 mb-4 text-center">РЯД АКТИВНОСТИ МЕТАЛЛОВ / ЭЛЕКТРОХИМИЧЕСКИЙ РЯД НАПРЯЖЁННОСТИ</p>
                  <div className="grid grid-cols-1 gap-2">
                    {ACTIVITY_SERIES.map((metal, index) => (
                      <div key={metal.symbol} className={`flex items-center gap-3 p-3 rounded-lg ${metal.color} bg-opacity-20 border border-amber-200 ${metal.isReference ? 'ring-2 ring-blue-400' : ''}`}>
                        <div className="w-10 h-10 flex items-center justify-center bg-white rounded-lg font-bold text-amber-900 shadow">
                          {metal.symbol}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-amber-900">{metal.name}{metal.isReference && ' (ориентир)'}</p>
                          <p className="text-xs text-amber-700">E° = {metal.potential} В</p>
                        </div>
                        <div className="text-xs font-medium text-amber-900 bg-white px-2 py-1 rounded">
                          #{index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-900 font-medium text-center">← активность металлов уменьшается →</p>
                  </div>
                </div>
              )}
            </div>

            {selectedElement && (
              <div className="bg-white/90 p-4 border-t border-amber-200">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center ${getBlockColor(selectedElement.block)}`}>
                    <span className="text-2xl font-black text-amber-900">{selectedElement.symbol}</span>
                    <span className="text-xs font-medium text-amber-900">{selectedElement.number}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-amber-900">{selectedElement.name}</h3>
                    <p className="text-sm text-amber-700">Атомная масса: {selectedElement.mass}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {selectedCell && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedCell(null)}>
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-amber-200" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-amber-900">{selectedCell.cation} + {selectedCell.anion}</h3>
                  <button onClick={() => setSelectedCell(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">×</button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-amber-700">Растворимость:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      selectedCell.solubility === "Р" ? "bg-emerald-100 text-emerald-900" :
                      selectedCell.solubility === "М" ? "bg-amber-100 text-amber-900" :
                      selectedCell.solubility === "Н" ? "bg-rose-100 text-rose-900" :
                      selectedCell.solubility === "—" ? "bg-gray-200 text-gray-900" :
                      "bg-violet-100 text-violet-900"
                    }`}>
                      {getSolubilityLabel(selectedCell.solubility)}
                    </span>
                  </div>
                  {selectedCell.precipitateColor && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-amber-700">Цвет осадка:</span>
                      <span className="font-medium text-amber-900">{selectedCell.precipitateColor}</span>
                    </div>
                  )}
                  {selectedCell.ionicEquation && (
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                      <p className="text-xs text-amber-700 mb-1 font-medium">Ионное уравнение:</p>
                      <p className="text-sm font-mono text-amber-900">{selectedCell.ionicEquation}</p>
                    </div>
                  )}
                  {selectedCell.hydrolysis && (
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                      <p className="text-xs text-amber-700 mb-1 font-medium">Гидролиз / Разложение:</p>
                      <p className="text-sm font-mono text-amber-900">{selectedCell.hydrolysis}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}