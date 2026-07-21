"use client";

import { useState, useEffect } from "react";

const ATOMS = [
  { symbol: "Li", name: "Литий", valence: 1 },
  { symbol: "Na", name: "Натрий", valence: 1 },
  { symbol: "K", name: "Калий", valence: 1 },
  { symbol: "Rb", name: "Рубидий", valence: 1 },
  { symbol: "Cs", name: "Цезий", valence: 1 },
  { symbol: "Be", name: "Бериллий", valence: 2 },
  { symbol: "Mg", name: "Магний", valence: 2 },
  { symbol: "Ca", name: "Кальций", valence: 2 },
  { symbol: "Sr", name: "Стронций", valence: 2 },
  { symbol: "Ba", name: "Барий", valence: 2 },
  { symbol: "Sc", name: "Скандий", valence: 3 },
  { symbol: "Ti", name: "Титан", valence: 4 },
  { symbol: "V", name: "Ванадий", valence: 5 },
  { symbol: "Cr", name: "Хром", valence: 3 },
  { symbol: "Mn", name: "Марганец", valence: 2 },
  { symbol: "Fe", name: "Железо", valence: 2 },
  { symbol: "Co", name: "Кобальт", valence: 2 },
  { symbol: "Ni", name: "Никель", valence: 2 },
  { symbol: "Cu", name: "Медь", valence: 2 },
  { symbol: "Zn", name: "Цинк", valence: 2 },
  { symbol: "Ag", name: "Серебро", valence: 1 },
  { symbol: "Cd", name: "Кадмий", valence: 2 },
  { symbol: "Hg", name: "Ртуть", valence: 2 },
  { symbol: "Al", name: "Алюминий", valence: 3 },
  { symbol: "Ga", name: "Галлий", valence: 3 },
  { symbol: "In", name: "Индий", valence: 3 },
  { symbol: "Sn", name: "Олово", valence: 4 },
  { symbol: "Pb", name: "Свинец", valence: 2 },
  { symbol: "Bi", name: "Висмут", valence: 3 },
  { symbol: "H", name: "Водород", valence: 1 },
  { symbol: "B", name: "Бор", valence: 3 },
  { symbol: "C", name: "Углерод", valence: 4 },
  { symbol: "Si", name: "Кремний", valence: 4 },
  { symbol: "N", name: "Азот", valence: 3 },
  { symbol: "P", name: "Фосфор", valence: 5 },
  { symbol: "As", name: "Мышьяк", valence: 5 },
  { symbol: "O", name: "Кислород", valence: 2 },
  { symbol: "S", name: "Сера", valence: 6 },
  { symbol: "Se", name: "Селен", valence: 6 },
  { symbol: "Te", name: "Теллур", valence: 6 },
  { symbol: "F", name: "Фтор", valence: 1 },
  { symbol: "Cl", name: "Хлор", valence: 1 },
  { symbol: "Br", name: "Бром", valence: 1 },
  { symbol: "I", name: "Йод", valence: 1 },
  { symbol: "At", name: "Астат", valence: 1 },
];

const SUBSCRIPTS = ["₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"];
const COEFFICIENTS = ["2", "3", "4", "5", "6", "7", "8", "9"];
const CHARGES = ["⁺", "⁻", "²⁺", "³⁺", "⁴⁺", "²⁻", "³⁻", "⁰"];
const BONDS = ["-", "=", "≡"];
const BRACKETS = ["(", ")"];

interface MoleculeBuilderProps {
  onAdd: (formula: string) => void;
  onCancel: () => void;
  initialValue?: string;
}

export default function MoleculeBuilder({ onAdd, onCancel, initialValue }: MoleculeBuilderProps) {
  const [blocks, setBlocks] = useState<string[]>(() => {
    if (!initialValue) return [];
    const parsed: string[] = [];
    const chars = initialValue.split("");
    let i = 0;
    while (i < chars.length) {
      if (chars[i] === " " || chars[i] === "(" || chars[i] === ")") {
        parsed.push(chars[i]); i++;
      } else if (/[A-Z]/.test(chars[i])) {
        let symbol = chars[i]; i++;
        while (i < chars.length && /[a-z]/.test(chars[i])) { symbol += chars[i]; i++; }
        parsed.push(symbol);
      } else if (/[₀-₉⁺⁻⁰²³⁴⁵⁶⁷⁸⁹]/.test(chars[i])) {
        let num = chars[i]; i++;
        while (i < chars.length && /[₀-₉⁺⁻⁰²³⁴⁵⁶⁷⁸⁹]/.test(chars[i])) { num += chars[i]; i++; }
        parsed.push(num);
      } else { i++; }
    }
    return parsed;
  });

  const [history, setHistory] = useState<string[][]>([]);
  const [redoStack, setRedoStack] = useState<string[][]>([]);
  const [selectedAtom, setSelectedAtom] = useState<string | null>(null);

  useEffect(() => {
    if (blocks.length > 0) {
      setHistory(prev => [...prev.slice(-10), [...blocks]]);
      setRedoStack([]);
    }
  }, [blocks]);

  function addBlock(block: string) { setBlocks([...blocks, block]); }
  function removeLast() { if (blocks.length > 0) setBlocks(blocks.slice(0, -1)); }
  function undo() {
    if (history.length > 1) {
      const newHistory = history.slice(0, -1);
      setRedoStack([blocks, ...redoStack]);
      setBlocks(newHistory[newHistory.length - 1]);
      setHistory(newHistory);
    }
  }
  function redo() {
    if (redoStack.length > 0) {
      const newRedoStack = redoStack.slice(1);
      setHistory([...history, blocks]);
      setBlocks(redoStack[0]);
      setRedoStack(newRedoStack);
    }
  }
  function clearAll() {
    if (blocks.length > 0) { setHistory([...history, blocks]); setBlocks([]); }
  }
  function getFormula(): string { return blocks.join(""); }
  function validateFormula(): { valid: boolean; message: string } {
    const formula = getFormula();
    if (!formula) return { valid: false, message: "Формула пустая" };
    let bracketCount = 0;
    for (const char of formula) {
      if (char === "(") bracketCount++;
      if (char === ")") bracketCount--;
      if (bracketCount < 0) return { valid: false, message: "Неправильный порядок скобок" };
    }
    if (bracketCount !== 0) return { valid: false, message: "Не все скобки закрыты" };
    return { valid: true, message: "Формула корректна" };
  }

  const validation = validateFormula();

  return (
    <div className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl border-2 border-purple-200 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-purple-800">🧪 Конструктор молекул</h3>
        <div className={`text-xs px-3 py-1 rounded-full ${validation.valid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          {validation.valid ? '✓ Корректно' : `✗ ${validation.message}`}
        </div>
      </div>
      <div className="bg-white rounded-xl p-4 mb-4 min-h-[60px] border-2 border-dashed border-purple-300 flex flex-wrap items-center gap-0.5 shadow-inner">
        {blocks.length === 0 ? (
          <span className="text-gray-400 text-sm italic">Нажмите на атомы, чтобы собрать молекулу</span>
        ) : (
          blocks.map((block, i) => (
            <span key={i} className={`text-xl font-mono font-bold ${/[A-Z]/.test(block) ? 'text-purple-700' : /[₀-₉]/.test(block) ? 'text-amber-600' : /[⁺⁻]/.test(block) ? 'text-red-600' : 'text-gray-600'}`}>{block}</span>
          ))
        )}
      </div>
      {selectedAtom && (
        <div className="bg-purple-100 rounded-lg p-3 mb-4 border border-purple-200">
          <p className="text-sm text-purple-800">
            <strong>{selectedAtom}</strong> — {ATOMS.find(a => a.symbol === selectedAtom)?.name} (валентность: {ATOMS.find(a => a.symbol === selectedAtom)?.valence})
          </p>
        </div>
      )}
      <div className="mb-4">
        <p className="text-xs text-purple-700 font-semibold mb-2">🔬 Атомы:</p>
        <div className="flex flex-wrap gap-1.5">
          {ATOMS.map((atom) => (
            <button key={atom.symbol} onClick={() => { addBlock(atom.symbol); setSelectedAtom(atom.symbol); }} className={`px-3 py-2 rounded-lg text-sm font-mono font-bold transition border-2 ${selectedAtom === atom.symbol ? 'bg-purple-600 text-white border-purple-600 shadow-lg scale-105' : 'bg-white text-purple-700 border-purple-200 hover:border-purple-400 hover:bg-purple-50'}`} title={`${atom.name} (${atom.valence})`}>
              {atom.symbol}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <p className="text-xs text-purple-700 font-semibold mb-2">🔢 Индексы:</p>
        <div className="flex flex-wrap gap-1.5">
          {SUBSCRIPTS.map((sub) => (
            <button key={sub} onClick={() => addBlock(sub)} className="px-3 py-1.5 bg-white rounded-lg text-sm font-mono font-bold hover:bg-amber-100 hover:border-amber-400 transition border-2 border-amber-200 text-amber-700">{sub}</button>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <p className="text-xs text-purple-700 font-semibold mb-2">🔢 Коэффициенты:</p>
        <div className="flex flex-wrap gap-1.5">
          {COEFFICIENTS.map((coef) => (
            <button key={coef} onClick={() => addBlock(coef)} className="px-3 py-1.5 bg-white rounded-lg text-sm font-mono font-bold hover:bg-blue-100 hover:border-blue-400 transition border-2 border-blue-200 text-blue-700">{coef}</button>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <p className="text-xs text-purple-700 font-semibold mb-2">⚡ Заряды ионов:</p>
        <div className="flex flex-wrap gap-1.5">
          {CHARGES.map((charge) => (
            <button key={charge} onClick={() => addBlock(charge)} className="px-3 py-1.5 bg-white rounded-lg text-sm font-mono font-bold hover:bg-red-100 hover:border-red-400 transition border-2 border-red-200 text-red-700">{charge}</button>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <p className="text-xs text-purple-700 font-semibold mb-2">🔲 Скобки:</p>
        <div className="flex flex-wrap gap-1.5">
          {BRACKETS.map((bracket) => (
            <button key={bracket} onClick={() => addBlock(bracket)} className="px-4 py-2 bg-white rounded-lg text-lg font-mono font-bold hover:bg-gray-100 hover:border-gray-400 transition border-2 border-gray-200 text-gray-700">{bracket}</button>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <p className="text-xs text-purple-700 font-semibold mb-2">🔗 Связи (для органики):</p>
        <div className="flex flex-wrap gap-1.5">
          {BONDS.map((bond) => (
            <button key={bond} onClick={() => addBlock(bond)} className="px-4 py-2 bg-white rounded-lg text-lg font-mono font-bold hover:bg-green-100 hover:border-green-400 transition border-2 border-green-200 text-green-700">{bond}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <button onClick={undo} disabled={history.length <= 1} className="py-2.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed">↩️ Отменить</button>
        <button onClick={redo} disabled={redoStack.length === 0} className="py-2.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed">↪️ Вернуть</button>
        <button onClick={removeLast} disabled={blocks.length === 0} className="py-2.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 transition disabled:opacity-50 disabled:cursor-not-allowed">⌫ Удалить</button>
        <button onClick={clearAll} disabled={blocks.length === 0} className="py-2.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition disabled:opacity-50 disabled:cursor-not-allowed">🧹 Очистить</button>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onAdd(getFormula())} disabled={!validation.valid} className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-violet-700 text-white rounded-xl text-sm font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-md shadow-purple-300 disabled:opacity-50 disabled:cursor-not-allowed">✅ Добавить формулу</button>
        <button onClick={onCancel} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-300 transition">Отмена</button>
      </div>
      <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
        <p className="text-xs text-purple-700">💡 <strong>Подсказка:</strong> Используйте скобки для групп атомов. Например: Ca(OH)₂, Fe₂(SO₄)₃</p>
      </div>
    </div>
  );
}