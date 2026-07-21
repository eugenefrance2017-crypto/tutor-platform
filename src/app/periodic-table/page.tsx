"use client";

export const dynamic = 'force-dynamic';

import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// ============ ТАБЛИЦА МЕНДЕЛЕЕВА ============
const PERIODIC_DATA = [
  { period: 1, groups: [
    { A: "H", B: null }, { A: null, B: null }, { A: null, B: null }, { A: null, B: null },
    { A: null, B: null }, { A: null, B: null }, { A: null, B: null }, { A: "He", B: null }
  ]},
  { period: 2, groups: [
    { A: "Li", B: null }, { A: "Be", B: null }, { A: "B", B: null }, { A: "C", B: null },
    { A: "N", B: null }, { A: "O", B: null }, { A: "F", B: null }, { A: "Ne", B: null }
  ]},
  { period: 3, groups: [
    { A: "Na", B: null }, { A: "Mg", B: null }, { A: "Al", B: null }, { A: "Si", B: null },
    { A: "P", B: null }, { A: "S", B: null }, { A: "Cl", B: null }, { A: "Ar", B: null }
  ]},
  { period: 4, groups: [
    { A: "K", B: "Cu" }, { A: "Ca", B: "Zn" }, { A: "Ga", B: "Sc" }, { A: "Ge", B: "Ti" },
    { A: "As", B: "V" }, { A: "Se", B: "Cr" }, { A: "Br", B: "Mn" }, { A: "Kr", B: ["Fe","Co","Ni"] }
  ]},
  { period: 5, groups: [
    { A: "Rb", B: "Ag" }, { A: "Sr", B: "Cd" }, { A: "In", B: "Y" }, { A: "Sn", B: "Zr" },
    { A: "Sb", B: "Nb" }, { A: "Te", B: "Mo" }, { A: "I", B: "Tc" }, { A: "Xe", B: ["Ru","Rh","Pd"] }
  ]},
  { period: 6, groups: [
    { A: "Cs", B: "Au" }, { A: "Ba", B: "Hg" }, { A: "Tl", B: "La*" }, { A: "Pb", B: "Hf" },
    { A: "Bi", B: "Ta" }, { A: "Po", B: "W" }, { A: "At", B: "Re" }, { A: "Rn", B: ["Os","Ir","Pt"] }
  ]},
  { period: 7, groups: [
    { A: "Fr", B: "Rg" }, { A: "Ra", B: "Cn" }, { A: "Nh", B: "Ac*" }, { A: "Fl", B: "Rf" },
    { A: "Mc", B: "Db" }, { A: "Lv", B: "Sg" }, { A: "Ts", B: "Bh" }, { A: "Og", B: ["Hs","Mt","Ds"] }
  ]},
];

const LANTHANOIDS = ["La", "Ce", "Pr", "Nd", "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb", "Lu"];
const ACTINOIDS = ["Ac", "Th", "Pa", "U", "Np", "Pu", "Am", "Cm", "Bk", "Cf", "Es", "Fm", "Md", "No", "Lr"];
const GROUP_LABELS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

const ELEMENT_DATA = {
  "H":{symbol:"H",name:"Водород",mass:1.008,number:1,block:"s"},"He":{symbol:"He",name:"Гелий",mass:4.0026,number:2,block:"s"},"Li":{symbol:"Li",name:"Литий",mass:6.94,number:3,block:"s"},"Be":{symbol:"Be",name:"Бериллий",mass:9.0122,number:4,block:"s"},"B":{symbol:"B",name:"Бор",mass:10.81,number:5,block:"p"},"C":{symbol:"C",name:"Углерод",mass:12.011,number:6,block:"p"},"N":{symbol:"N",name:"Азот",mass:14.007,number:7,block:"p"},"O":{symbol:"O",name:"Кислород",mass:15.999,number:8,block:"p"},"F":{symbol:"F",name:"Фтор",mass:18.998,number:9,block:"p"},"Ne":{symbol:"Ne",name:"Неон",mass:20.180,number:10,block:"p"},"Na":{symbol:"Na",name:"Натрий",mass:22.990,number:11,block:"s"},"Mg":{symbol:"Mg",name:"Магний",mass:24.305,number:12,block:"s"},"Al":{symbol:"Al",name:"Алюминий",mass:26.982,number:13,block:"p"},"Si":{symbol:"Si",name:"Кремний",mass:28.085,number:14,block:"p"},"P":{symbol:"P",name:"Фосфор",mass:30.974,number:15,block:"p"},"S":{symbol:"S",name:"Сера",mass:32.06,number:16,block:"p"},"Cl":{symbol:"Cl",name:"Хлор",mass:35.45,number:17,block:"p"},"Ar":{symbol:"Ar",name:"Аргон",mass:39.948,number:18,block:"p"},"K":{symbol:"K",name:"Калий",mass:39.098,number:19,block:"s"},"Ca":{symbol:"Ca",name:"Кальций",mass:40.078,number:20,block:"s"},"Sc":{symbol:"Sc",name:"Скандий",mass:44.956,number:21,block:"d"},"Ti":{symbol:"Ti",name:"Титан",mass:47.867,number:22,block:"d"},"V":{symbol:"V",name:"Ванадий",mass:50.942,number:23,block:"d"},"Cr":{symbol:"Cr",name:"Хром",mass:51.996,number:24,block:"d"},"Mn":{symbol:"Mn",name:"Марганец",mass:54.938,number:25,block:"d"},"Fe":{symbol:"Fe",name:"Железо",mass:55.845,number:26,block:"d"},"Co":{symbol:"Co",name:"Кобальт",mass:58.933,number:27,block:"d"},"Ni":{symbol:"Ni",name:"Никель",mass:58.693,number:28,block:"d"},"Cu":{symbol:"Cu",name:"Медь",mass:63.546,number:29,block:"d"},"Zn":{symbol:"Zn",name:"Цинк",mass:65.38,number:30,block:"d"},"Ga":{symbol:"Ga",name:"Галлий",mass:69.723,number:31,block:"p"},"Ge":{symbol:"Ge",name:"Германий",mass:72.630,number:32,block:"p"},"As":{symbol:"As",name:"Мышьяк",mass:74.922,number:33,block:"p"},"Se":{symbol:"Se",name:"Селен",mass:78.971,number:34,block:"p"},"Br":{symbol:"Br",name:"Бром",mass:79.904,number:35,block:"p"},"Kr":{symbol:"Kr",name:"Криптон",mass:83.798,number:36,block:"p"},"Rb":{symbol:"Rb",name:"Рубидий",mass:85.468,number:37,block:"s"},"Sr":{symbol:"Sr",name:"Стронций",mass:87.62,number:38,block:"s"},"Y":{symbol:"Y",name:"Иттрий",mass:88.906,number:39,block:"d"},"Zr":{symbol:"Zr",name:"Цирконий",mass:91.224,number:40,block:"d"},"Nb":{symbol:"Nb",name:"Ниобий",mass:92.906,number:41,block:"d"},"Mo":{symbol:"Mo",name:"Молибден",mass:95.95,number:42,block:"d"},"Tc":{symbol:"Tc",name:"Технеций",mass:98,number:43,block:"d"},"Ru":{symbol:"Ru",name:"Рутений",mass:101.07,number:44,block:"d"},"Rh":{symbol:"Rh",name:"Родий",mass:102.91,number:45,block:"d"},"Pd":{symbol:"Pd",name:"Палладий",mass:106.42,number:46,block:"d"},"Ag":{symbol:"Ag",name:"Серебро",mass:107.87,number:47,block:"d"},"Cd":{symbol:"Cd",name:"Кадмий",mass:112.41,number:48,block:"d"},"In":{symbol:"In",name:"Индий",mass:114.82,number:49,block:"p"},"Sn":{symbol:"Sn",name:"Олово",mass:118.71,number:50,block:"p"},"Sb":{symbol:"Sb",name:"Сурьма",mass:121.76,number:51,block:"p"},"Te":{symbol:"Te",name:"Теллур",mass:127.60,number:52,block:"p"},"I":{symbol:"I",name:"Йод",mass:126.90,number:53,block:"p"},"Xe":{symbol:"Xe",name:"Ксенон",mass:131.29,number:54,block:"p"},"Cs":{symbol:"Cs",name:"Цезий",mass:132.91,number:55,block:"s"},"Ba":{symbol:"Ba",name:"Барий",mass:137.33,number:56,block:"s"},"La":{symbol:"La",name:"Лантан",mass:138.91,number:57,block:"f"},"Ce":{symbol:"Ce",name:"Церий",mass:140.12,number:58,block:"f"},"Pr":{symbol:"Pr",name:"Празеодим",mass:140.91,number:59,block:"f"},"Nd":{symbol:"Nd",name:"Неодим",mass:144.24,number:60,block:"f"},"Pm":{symbol:"Pm",name:"Прометий",mass:145,number:61,block:"f"},"Sm":{symbol:"Sm",name:"Самарий",mass:150.36,number:62,block:"f"},"Eu":{symbol:"Eu",name:"Европий",mass:151.96,number:63,block:"f"},"Gd":{symbol:"Gd",name:"Гадолиний",mass:157.25,number:64,block:"f"},"Tb":{symbol:"Tb",name:"Тербий",mass:158.93,number:65,block:"f"},"Dy":{symbol:"Dy",name:"Диспрозий",mass:162.50,number:66,block:"f"},"Ho":{symbol:"Ho",name:"Гольмий",mass:164.93,number:67,block:"f"},"Er":{symbol:"Er",name:"Эрбий",mass:167.26,number:68,block:"f"},"Tm":{symbol:"Tm",name:"Тулий",mass:168.93,number:69,block:"f"},"Yb":{symbol:"Yb",name:"Иттербий",mass:173.05,number:70,block:"f"},"Lu":{symbol:"Lu",name:"Лютеций",mass:174.97,number:71,block:"f"},"Hf":{symbol:"Hf",name:"Гафний",mass:178.49,number:72,block:"d"},"Ta":{symbol:"Ta",name:"Тантал",mass:180.95,number:73,block:"d"},"W":{symbol:"W",name:"Вольфрам",mass:183.84,number:74,block:"d"},"Re":{symbol:"Re",name:"Рений",mass:186.21,number:75,block:"d"},"Os":{symbol:"Os",name:"Осмий",mass:190.23,number:76,block:"d"},"Ir":{symbol:"Ir",name:"Иридий",mass:192.22,number:77,block:"d"},"Pt":{symbol:"Pt",name:"Платина",mass:195.08,number:78,block:"d"},"Au":{symbol:"Au",name:"Золото",mass:196.97,number:79,block:"d"},"Hg":{symbol:"Hg",name:"Ртуть",mass:200.59,number:80,block:"d"},"Tl":{symbol:"Tl",name:"Таллий",mass:204.38,number:81,block:"p"},"Pb":{symbol:"Pb",name:"Свинец",mass:207.2,number:82,block:"p"},"Bi":{symbol:"Bi",name:"Висмут",mass:208.98,number:83,block:"p"},"Po":{symbol:"Po",name:"Полоний",mass:209,number:84,block:"p"},"At":{symbol:"At",name:"Астат",mass:210,number:85,block:"p"},"Rn":{symbol:"Rn",name:"Радон",mass:222,number:86,block:"p"},"Fr":{symbol:"Fr",name:"Франций",mass:223,number:87,block:"s"},"Ra":{symbol:"Ra",name:"Радий",mass:226,number:88,block:"s"},"Ac":{symbol:"Ac",name:"Актиний",mass:227,number:89,block:"f"},"Th":{symbol:"Th",name:"Торий",mass:232.04,number:90,block:"f"},"Pa":{symbol:"Pa",name:"Протактиний",mass:231.04,number:91,block:"f"},"U":{symbol:"U",name:"Уран",mass:238.03,number:92,block:"f"},"Np":{symbol:"Np",name:"Нептуний",mass:237,number:93,block:"f"},"Pu":{symbol:"Pu",name:"Плутоний",mass:244,number:94,block:"f"},"Am":{symbol:"Am",name:"Америций",mass:243,number:95,block:"f"},"Cm":{symbol:"Cm",name:"Кюрий",mass:247,number:96,block:"f"},"Bk":{symbol:"Bk",name:"Берклий",mass:247,number:97,block:"f"},"Cf":{symbol:"Cf",name:"Калифорний",mass:251,number:98,block:"f"},"Es":{symbol:"Es",name:"Эйнштейний",mass:252,number:99,block:"f"},"Fm":{symbol:"Fm",name:"Фермий",mass:257,number:100,block:"f"},"Md":{symbol:"Md",name:"Менделевий",mass:258,number:101,block:"f"},"No":{symbol:"No",name:"Нобелий",mass:259,number:102,block:"f"},"Lr":{symbol:"Lr",name:"Лоуренсий",mass:266,number:103,block:"f"},"Rf":{symbol:"Rf",name:"Резерфордий",mass:267,number:104,block:"d"},"Db":{symbol:"Db",name:"Дубний",mass:268,number:105,block:"d"},"Sg":{symbol:"Sg",name:"Сиборгий",mass:269,number:106,block:"d"},"Bh":{symbol:"Bh",name:"Борий",mass:270,number:107,block:"d"},"Hs":{symbol:"Hs",name:"Хассий",mass:269,number:108,block:"d"},"Mt":{symbol:"Mt",name:"Мейтнерий",mass:278,number:109,block:"d"},"Ds":{symbol:"Ds",name:"Дармштадтий",mass:281,number:110,block:"d"},"Rg":{symbol:"Rg",name:"Рентгений",mass:282,number:111,block:"d"},"Cn":{symbol:"Cn",name:"Коперниций",mass:285,number:112,block:"d"},"Nh":{symbol:"Nh",name:"Нихоний",mass:286,number:113,block:"p"},"Fl":{symbol:"Fl",name:"Флеровий",mass:289,number:114,block:"p"},"Mc":{symbol:"Mc",name:"Московий",mass:290,number:115,block:"p"},"Lv":{symbol:"Lv",name:"Ливерморий",mass:293,number:116,block:"p"},"Ts":{symbol:"Ts",name:"Теннессин",mass:294,number:117,block:"p"},"Og":{symbol:"Og",name:"Оганесон",mass:294,number:118,block:"p"},
};

// ============ ТАБЛИЦА РАСТВОРИМОСТИ ============
const CATIONS = ["H⁺","Li⁺","NH₄⁺","K⁺","Na⁺","Ba²⁺","Ca²⁺","Mg²⁺","Al³⁺","Cr³⁺","Fe²⁺","Fe³⁺","Mn²⁺","Zn²⁺","Cu²⁺","Ag⁺","Hg²⁺","Pb²⁺"];

const SOLUBILITY_DATA = [
  { anion:"OH⁻",data:{"H⁺":{solubility:"Р"},"Li⁺":{solubility:"Р"},"NH₄⁺":{solubility:"Р"},"K⁺":{solubility:"Р"},"Na⁺":{solubility:"Р"},"Ba²⁺":{solubility:"Р"},"Ca²⁺":{solubility:"М"},"Mg²⁺":{solubility:"Н",precipitateColor:"белый",ionicEquation:"Mg²⁺ + 2OH⁻ → Mg(OH)₂↓"},"Al³⁺":{solubility:"Н",precipitateColor:"белый студенистый",ionicEquation:"Al³⁺ + 3OH⁻ → Al(OH)₃↓"},"Cr³⁺":{solubility:"Н",precipitateColor:"серо-зелёный",ionicEquation:"Cr³⁺ + 3OH⁻ → Cr(OH)₃↓"},"Fe²⁺":{solubility:"Н",precipitateColor:"зеленоватый",ionicEquation:"Fe²⁺ + 2OH⁻ → Fe(OH)₂↓"},"Fe³⁺":{solubility:"Н",precipitateColor:"бурый",ionicEquation:"Fe³⁺ + 3OH⁻ → Fe(OH)₃↓"},"Mn²⁺":{solubility:"Н",precipitateColor:"светло-розовый",ionicEquation:"Mn²⁺ + 2OH⁻ → Mn(OH)₂↓"},"Zn²⁺":{solubility:"Н",precipitateColor:"белый",ionicEquation:"Zn²⁺ + 2OH⁻ → Zn(OH)₂↓"},"Cu²⁺":{solubility:"Н",precipitateColor:"голубой",ionicEquation:"Cu²⁺ + 2OH⁻ → Cu(OH)₂↓"},"Ag⁺":{solubility:"—",hydrolysis:"2AgOH → Ag₂O↓ + H₂O (бурый)"},"Hg²⁺":{solubility:"—",hydrolysis:"Hg(OH)₂ → HgO↓ + H₂O"},"Pb²⁺":{solubility:"Н",precipitateColor:"белый",ionicEquation:"Pb²⁺ + 2OH⁻ → Pb(OH)₂↓"}}},
  { anion:"Cl⁻",data:{"H⁺":{solubility:"Р"},"Li⁺":{solubility:"Р"},"NH₄⁺":{solubility:"Р"},"K⁺":{solubility:"Р"},"Na⁺":{solubility:"Р"},"Ba²⁺":{solubility:"Р"},"Ca²⁺":{solubility:"Р"},"Mg²⁺":{solubility:"Р"},"Al³⁺":{solubility:"Р"},"Cr³⁺":{solubility:"Р"},"Fe²⁺":{solubility:"Р"},"Fe³⁺":{solubility:"Р"},"Mn²⁺":{solubility:"Р"},"Zn²⁺":{solubility:"Р"},"Cu²⁺":{solubility:"Р"},"Ag⁺":{solubility:"Н",precipitateColor:"белый творожистый",ionicEquation:"Ag⁺ + Cl⁻ → AgCl↓"},"Hg²⁺":{solubility:"Р"},"Pb²⁺":{solubility:"М",precipitateColor:"белый",ionicEquation:"Pb²⁺ + 2Cl⁻ → PbCl₂↓"}}},
  { anion:"SO₄²⁻",data:{"H⁺":{solubility:"Р"},"Li⁺":{solubility:"Р"},"NH₄⁺":{solubility:"Р"},"K⁺":{solubility:"Р"},"Na⁺":{solubility:"Р"},"Ba²⁺":{solubility:"Н",precipitateColor:"белый",ionicEquation:"Ba²⁺ + SO₄²⁻ → BaSO₄↓"},"Ca²⁺":{solubility:"М",precipitateColor:"белый"},"Mg²⁺":{solubility:"Р"},"Al³⁺":{solubility:"Р"},"Cr³⁺":{solubility:"Р"},"Fe²⁺":{solubility:"Р"},"Fe³⁺":{solubility:"Р"},"Mn²⁺":{solubility:"Р"},"Zn²⁺":{solubility:"Р"},"Cu²⁺":{solubility:"Р"},"Ag⁺":{solubility:"М"},"Hg²⁺":{solubility:"Р"},"Pb²⁺":{solubility:"Н",precipitateColor:"белый",ionicEquation:"Pb²⁺ + SO₄²⁻ → PbSO₄↓"}}},
  { anion:"CO₃²⁻",data:{"H⁺":{solubility:"Р"},"Li⁺":{solubility:"Р"},"NH₄⁺":{solubility:"Р"},"K⁺":{solubility:"Р"},"Na⁺":{solubility:"Р"},"Ba²⁺":{solubility:"Н",precipitateColor:"белый",ionicEquation:"Ba²⁺ + CO₃²⁻ → BaCO₃↓"},"Ca²⁺":{solubility:"Н",precipitateColor:"белый",ionicEquation:"Ca²⁺ + CO₃²⁻ → CaCO₃↓"},"Mg²⁺":{solubility:"Н",precipitateColor:"белый"},"Al³⁺":{solubility:"—",hydrolysis:"Al₂(CO₃)₃ + 3H₂O → 2Al(OH)₃↓ + 3CO₂↑"},"Cr³⁺":{solubility:"—",hydrolysis:"Cr₂(CO₃)₃ + 3H₂O → 2Cr(OH)₃↓ + 3CO₂↑"},"Fe²⁺":{solubility:"Н",precipitateColor:"белый"},"Fe³⁺":{solubility:"—",hydrolysis:"Fe₂(CO₃)₃ + 3H₂O → 2Fe(OH)₃↓ + 3CO₂↑"},"Mn²⁺":{solubility:"Н",precipitateColor:"розовый"},"Zn²⁺":{solubility:"Н",precipitateColor:"белый"},"Cu²⁺":{solubility:"Н",precipitateColor:"зелёный",ionicEquation:"Cu²⁺ + CO₃²⁻ → CuCO₃↓"},"Ag⁺":{solubility:"Н",precipitateColor:"жёлтый",ionicEquation:"2Ag⁺ + CO₃²⁻ → Ag₂CO₃↓"},"Hg²⁺":{solubility:"Н",precipitateColor:"жёлтый"},"Pb²⁺":{solubility:"Н",precipitateColor:"белый"}}},
  { anion:"PO₄³⁻",data:{"H⁺":{solubility:"Р"},"Li⁺":{solubility:"Н",precipitateColor:"белый",ionicEquation:"3Li⁺ + PO₄³⁻ → Li₃PO₄↓"},"NH₄⁺":{solubility:"?",hydrolysis:"гидролизуется обратимо"},"K⁺":{solubility:"Р"},"Na⁺":{solubility:"Р"},"Ba²⁺":{solubility:"Н",precipitateColor:"белый",ionicEquation:"3Ba²⁺ + 2PO₄³⁻ → Ba₃(PO₄)₂↓"},"Ca²⁺":{solubility:"Н",precipitateColor:"белый",ionicEquation:"3Ca²⁺ + 2PO₄³⁻ → Ca₃(PO₄)₂↓"},"Mg²⁺":{solubility:"Н",precipitateColor:"белый"},"Al³⁺":{solubility:"Н",precipitateColor:"белый",ionicEquation:"Al³⁺ + PO₄³⁻ → AlPO₄↓"},"Cr³⁺":{solubility:"Н",precipitateColor:"зелёный"},"Fe²⁺":{solubility:"Н",precipitateColor:"белый"},"Fe³⁺":{solubility:"Н",precipitateColor:"жёлтый",ionicEquation:"Fe³⁺ + PO₄³⁻ → FePO₄↓"},"Mn²⁺":{solubility:"Н",precipitateColor:"розовый"},"Zn²⁺":{solubility:"Н",precipitateColor:"белый"},"Cu²⁺":{solubility:"Н",precipitateColor:"голубой",ionicEquation:"3Cu²⁺ + 2PO₄³⁻ → Cu₃(PO₄)₂↓"},"Ag⁺":{solubility:"Н",precipitateColor:"жёлтый",ionicEquation:"3Ag⁺ + PO₄³⁻ → Ag₃PO₄↓"},"Hg²⁺":{solubility:"Н",precipitateColor:"белый"},"Pb²⁺":{solubility:"Н",precipitateColor:"белый"}}},
];

// ============ НОВЫЕ ЦВЕТА (Тейлор Свифт) ============
function getBlockColor(block: string): string {
  switch (block) {
    case "s": return "bg-[#F5E6D3] hover:bg-[#E8C9C9] text-[#4A3A3A]";
    case "p": return "bg-[#E8D5C8] hover:bg-[#D4B8A8] text-[#4A3A3A]";
    case "d": return "bg-[#D4C4B8] hover:bg-[#C9A87C] text-[#4A3A3A]";
    case "f": return "bg-[#C9B8A8] hover:bg-[#B8A898] text-[#4A3A3A]";
    default: return "bg-[#F0EAE3] text-[#4A3A3A]";
  }
}

function getCellColor(cell: any): string {
  if (cell.precipitateColor) {
    const colorMap = {
      "белый": "bg-white border-2 border-[#D4A5A5]",
      "белый творожистый": "bg-white border-2 border-[#D4A5A5]",
      "белый студенистый": "bg-white border-2 border-[#D4A5A5]",
      "жёлтый": "bg-yellow-200",
      "светло-жёлтый": "bg-yellow-100",
      "золотисто-жёлтый": "bg-yellow-300",
      "красный": "bg-red-300",
      "красно-коричневый": "bg-red-400",
      "бурый": "bg-orange-300",
      "чёрный": "bg-gray-800 text-white",
      "зелёный": "bg-green-300",
      "зеленоватый": "bg-green-200",
      "серо-зелёный": "bg-green-400",
      "голубой": "bg-blue-300",
      "розовый": "bg-pink-300",
      "светло-розовый": "bg-pink-200",
      "жёлто-коричневый": "bg-yellow-600",
      "студенистый": "bg-white border-2 border-[#D4A5A5]",
    };
    return colorMap[cell.precipitateColor] || "bg-white border-2 border-[#D4A5A5] text-[#4A3A3A]";
  }
  
  switch (cell.solubility) {
    case "Р": return "bg-[#E8D5C8] text-[#4A3A3A]";
    case "М": return "bg-[#D4C4B8] text-[#4A3A3A]";
    case "Н": return "bg-[#C9A87C] text-white";
    case "—": return "bg-[#F0EAE3] text-[#8B7B6B]";
    case "?": return "bg-[#F5F0EA] text-[#8B7B6B]";
    default: return "bg-[#F5EDE3] text-[#4A3A3A]";
  }
}

function getSolubilityLabel(solubility: string): string {
  switch (solubility) {
    case "Р": return "Растворимо";
    case "М": return "Малорастворимо";
    case "Н": return "Нерастворимо";
    case "—": return "Разлагается";
    case "?": return "Нет данных";
    default: return solubility;
  }
}

function PeriodicTableContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student";
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [tab, setTab] = useState<"periodic" | "solubility">("periodic");
  const [selectedCell, setSelectedCell] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5E6D3] to-[#E8D5C8]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A87C] mx-auto mb-4"></div>
          <p className="text-[#8B7B6B]">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5E6D3] to-[#E8D5C8]">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/dashboard?uid=${uid}&role=${role}`} className="text-[#8B6B6B] hover:text-[#6B4B4B] transition font-medium">← Назад</Link>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#C9A87C] to-[#D4A5A5] bg-clip-text text-transparent">⚛️ Таблицы</h1>
          <div></div>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab("periodic")} className={`px-5 py-2.5 rounded-xl text-sm font-medium transition ${tab === "periodic" ? "bg-[#C9A87C] text-white" : "bg-white/80 text-[#4A3A3A] hover:bg-[#E8D5C8]"}`}>📊 Таблица Менделеева</button>
          <button onClick={() => setTab("solubility")} className={`px-5 py-2.5 rounded-xl text-sm font-medium transition ${tab === "solubility" ? "bg-[#C9A87C] text-white" : "bg-white/80 text-[#4A3A3A] hover:bg-[#E8D5C8]"}`}>💧 Растворимость</button>
        </div>

        {tab === "periodic" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg p-4 border border-[#D4A5A5] overflow-x-auto">
                <div className="min-w-[750px]">
                  <div className="flex flex-wrap gap-3 mb-4 text-xs">
                    {[
                      {label:"s", color:"bg-[#F5E6D3]"},
                      {label:"p", color:"bg-[#E8D5C8]"},
                      {label:"d", color:"bg-[#D4C4B8]"},
                      {label:"f", color:"bg-[#C9B8A8]"}
                    ].map(item=>(
                      <div key={item.label} className="flex items-center gap-1.5">
                        <div className={`w-3 h-3 rounded border border-[#C9A87C]/30 ${item.color}`}/>
                        <span className="text-[#4A3A3A]">{item.label}-элементы</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-sm font-bold text-[#4A3A3A] mb-3">ПЕРИОДИЧЕСКАЯ СИСТЕМА ЭЛЕМЕНТОВ Д.И. МЕНДЕЛЕЕВА</p>
                  <div className="flex"><div className="w-10 flex-shrink-0"/>{GROUP_LABELS.map((label,i)=>(<div key={i} className="flex-1 text-center text-sm font-bold text-[#4A3A3A]">{label}</div>))}</div>
                  <div className="flex mb-1"><div className="w-10 flex-shrink-0"/>{GROUP_LABELS.map((_,i)=>(<div key={i} className="flex-1 flex text-[10px] text-[#8B7B6B]"><span className="flex-1 text-center">A</span><span className="flex-1 text-center">B</span></div>))}</div>
                  {PERIODIC_DATA.map((periodData) => (
                    <div key={periodData.period} className="flex border-t border-[#D4A5A5]">
                      <div className="w-10 flex items-center justify-center flex-shrink-0 bg-[#F5EDE3]"><span className="text-sm font-bold text-[#4A3A3A]">{periodData.period}</span></div>
                      {periodData.groups.map((group, gi) => (
                        <div key={gi} className="flex-1 flex border-l border-[#D4A5A5] min-h-[60px]">
                          <div className="flex-1 flex flex-col items-center justify-center p-1">
                            {Array.isArray(group.A) ? group.A.map(el=>{const d=ELEMENT_DATA[el];if(!d)return null;return(<button key={el} onClick={()=>setSelectedElement(d)} className={`w-full text-center rounded py-0.5 text-[11px] leading-tight transition hover:scale-105 ${getBlockColor(d.block)} ${selectedElement?.symbol===el?"ring-2 ring-[#C9A87C]":""}`}><span className="opacity-60 text-[9px] text-[#4A3A3A]">{d.number}</span> <span className="font-bold text-[#4A3A3A]">{el}</span> <span className="opacity-50 text-[9px] ml-0.5 text-[#4A3A3A]">{d.mass}</span></button>);}) : group.A ? (()=>{const el=(group.A as string).replace("*","");const d=ELEMENT_DATA[el];if(!d)return null;return(<button onClick={()=>setSelectedElement(d)} className={`w-full text-center rounded py-1 text-[11px] leading-tight transition hover:scale-105 ${getBlockColor(d.block)} ${selectedElement?.symbol===el?"ring-2 ring-[#C9A87C]":""}`}><span className="opacity-60 text-[9px] text-[#4A3A3A]">{d.number}</span> <span className="font-bold text-[#4A3A3A]">{group.A}</span> <span className="opacity-50 text-[9px] ml-0.5 text-[#4A3A3A]">{d.mass}</span></button>);})() : <div className="flex-1"/>}
                          </div>
                          <div className="flex-1 flex flex-col items-center justify-center p-1">
                            {Array.isArray(group.B) ? group.B.map(el=>{const d=ELEMENT_DATA[el];if(!d)return null;return(<button key={el} onClick={()=>setSelectedElement(d)} className={`w-full text-center rounded py-0.5 text-[11px] leading-tight transition hover:scale-105 ${getBlockColor(d.block)} ${selectedElement?.symbol===el?"ring-2 ring-[#C9A87C]":""}`}><span className="opacity-60 text-[9px] text-[#4A3A3A]">{d.number}</span> <span className="font-bold text-[#4A3A3A]">{el}</span> <span className="opacity-50 text-[9px] ml-0.5 text-[#4A3A3A]">{d.mass}</span></button>);}) : group.B ? (()=>{const d=ELEMENT_DATA[group.B as string];if(!d)return <div className="flex-1"/>;return(<button onClick={()=>setSelectedElement(d)} className={`w-full text-center rounded py-1 text-[11px] leading-tight transition hover:scale-105 ${getBlockColor(d.block)} ${selectedElement?.symbol===group.B?"ring-2 ring-[#C9A87C]":""}`}><span className="opacity-60 text-[9px] text-[#4A3A3A]">{d.number}</span> <span className="font-bold text-[#4A3A3A]">{group.B}</span> <span className="opacity-50 text-[9px] ml-0.5 text-[#4A3A3A]">{d.mass}</span></button>);})() : <div className="flex-1"/>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  <div className="mt-4 flex"><div className="w-10 flex-shrink-0"/><div className="flex-1 space-y-2"><div><p className="text-xs text-[#8B7B6B] mb-1">Лантаноиды (La*):</p><div className="flex gap-1 flex-wrap">{LANTHANOIDS.map(s=>{const d=ELEMENT_DATA[s];if(!d)return null;return(<button key={s} onClick={()=>setSelectedElement(d)} className={`px-2 py-1 rounded text-xs transition hover:scale-110 ${getBlockColor(d.block)}`}><span className="opacity-60 text-[#4A3A3A]">{d.number}</span> <span className="font-bold text-[#4A3A3A]">{s}</span> <span className="opacity-50 ml-1 text-[#4A3A3A]">{d.mass}</span></button>);})}</div></div><div><p className="text-xs text-[#8B7B6B] mb-1">Актиноиды (Ac*):</p><div className="flex gap-1 flex-wrap">{ACTINOIDS.map(s=>{const d=ELEMENT_DATA[s];if(!d)return null;return(<button key={s} onClick={()=>setSelectedElement(d)} className={`px-2 py-1 rounded text-xs transition hover:scale-110 ${getBlockColor(d.block)}`}><span className="opacity-60 text-[#4A3A3A]">{d.number}</span> <span className="font-bold text-[#4A3A3A]">{s}</span> <span className="opacity-50 ml-1 text-[#4A3A3A]">{d.mass}</span></button>);})}</div></div></div></div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-1">
              <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 border border-[#D4A5A5] sticky top-4">
                {selectedElement ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center ${getBlockColor(selectedElement.block)} shadow-lg`}>
                        <span className="text-3xl font-black text-[#4A3A3A]">{selectedElement.symbol}</span>
                        <span className="text-xs font-medium text-[#4A3A3A]">{selectedElement.number}</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-[#4A3A3A]">{selectedElement.name}</h2>
                        <p className="text-sm text-[#8B7B6B]">Атомная масса: {selectedElement.mass}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-[#F5EDE3] rounded-xl p-2.5">
                        <p className="text-xs text-[#8B7B6B]">Блок</p>
                        <p className="font-bold text-[#4A3A3A]">{selectedElement.block}</p>
                      </div>
                      <div className="bg-[#F5EDE3] rounded-xl p-2.5">
                        <p className="text-xs text-[#8B7B6B]">Номер</p>
                        <p className="font-bold text-[#4A3A3A]">{selectedElement.number}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-6xl mb-4">⚛️</p>
                    <p className="text-[#8B7B6B]">Выберите элемент</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "solubility" && (
          <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg p-4 border border-[#D4A5A5] overflow-x-auto">
            <div className="min-w-[900px]">
              <p className="text-sm font-medium text-[#4A3A3A] mb-4">💧 Таблица растворимости кислот, оснований и солей в воде</p>
              <div className="flex flex-wrap gap-3 mb-4 text-xs">
                <span><span className="inline-block w-4 h-4 border border-[#C9A87C]/30 bg-[#E8D5C8] mr-1"/> Р — растворимо</span>
                <span><span className="inline-block w-4 h-4 border border-[#C9A87C]/30 bg-[#D4C4B8] mr-1"/> М — малорастворимо</span>
                <span><span className="inline-block w-4 h-4 border border-[#C9A87C]/30 bg-[#C9A87C] mr-1"/> Н — нерастворимо</span>
                <span><span className="inline-block w-4 h-4 border border-[#C9A87C]/30 bg-[#F0EAE3] mr-1"/> — — разлагается</span>
                <span><span className="inline-block w-4 h-4 border border-[#C9A87C]/30 bg-[#F5F0EA] mr-1"/> ? — нет данных</span>
                <span className="text-xs text-[#8B7B6B] ml-2">Нажмите на клетку</span>
              </div>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="border border-[#D4A5A5] p-2 bg-[#F5EDE3] text-left text-[#4A3A3A]">Анионы ↓ / Катионы →</th>
                    {CATIONS.map(c=>(
                      <th key={c} className="border border-[#D4A5A5] p-2 bg-[#F5EDE3] text-center font-mono whitespace-nowrap text-[#4A3A3A]">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SOLUBILITY_DATA.map(row => (
                    <tr key={row.anion}>
                      <td className="border border-[#D4A5A5] p-2 font-mono font-medium bg-[#F5EDE3] whitespace-nowrap text-[#4A3A3A]">{row.anion}</td>
                      {CATIONS.map(cat => {
                        const cell = row.data[cat];
                        if (!cell) return <td key={cat} className="border border-[#D4A5A5] p-2 text-center text-[#8B7B6B]">—</td>;
                        const isClickable = cell.ionicEquation || cell.hydrolysis || cell.solubility === "Н" || cell.solubility === "—";
                        return (
                          <td 
                            key={cat} 
                            onClick={() => isClickable && setSelectedCell({anion: row.anion, cation: cat, ...cell})} 
                            className={`border border-[#D4A5A5] p-2 text-center font-bold transition ${getCellColor(cell)} ${isClickable ? "cursor-pointer hover:ring-2 hover:ring-[#C9A87C] hover:z-10 relative" : ""}`}
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

        {selectedCell && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedCell(null)}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-[#D4A5A5]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-[#4A3A3A]">{selectedCell.cation} + {selectedCell.anion}</h3>
                <button onClick={() => setSelectedCell(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 text-xl transition">×</button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#8B7B6B]">Растворимость:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    selectedCell.solubility === "Р" ? "bg-[#E8D5C8] text-[#4A3A3A]" :
                    selectedCell.solubility === "М" ? "bg-[#D4C4B8] text-[#4A3A3A]" :
                    selectedCell.solubility === "Н" ? "bg-[#C9A87C] text-white" :
                    "bg-[#F0EAE3] text-[#8B7B6B]"
                  }`}>
                    {getSolubilityLabel(selectedCell.solubility)}
                  </span>
                </div>
                {selectedCell.precipitateColor && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[#8B7B6B]">Цвет осадка:</span>
                    <span className="font-medium text-[#4A3A3A]">{selectedCell.precipitateColor}</span>
                  </div>
                )}
                {selectedCell.ionicEquation && (
                  <div className="bg-[#F5EDE3] rounded-xl p-4">
                    <p className="text-xs text-[#8B6B6B] mb-1 font-medium">Сокращённое ионное уравнение:</p>
                    <p className="text-sm font-mono text-[#4A3A3A]">{selectedCell.ionicEquation}</p>
                  </div>
                )}
                {selectedCell.hydrolysis && (
                  <div className="bg-[#F5E6D3] rounded-xl p-4">
                    <p className="text-xs text-[#8B6B6B] mb-1 font-medium">Гидролиз / Примечание:</p>
                    <p className="text-sm font-mono text-[#4A3A3A]">{selectedCell.hydrolysis}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PeriodicTablePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5E6D3] to-[#E8D5C8]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A87C] mx-auto mb-4"></div>
          <p className="text-[#8B7B6B]">Загрузка...</p>
        </div>
      </div>
    }>
      <PeriodicTableContent />
    </Suspense>
  );
}