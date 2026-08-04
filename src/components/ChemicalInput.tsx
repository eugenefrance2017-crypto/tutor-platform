"use client";

import { useState, useRef } from "react";
import MoleculeBuilder from "./MoleculeBuilder";

interface ChemicalInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  id?: string;
  multiline?: boolean;
  rows?: number;
}

export default function ChemicalInput({ 
  value, 
  onChange, 
  placeholder = "Введите формулу...", 
  label, 
  id, 
  multiline = false, 
  rows = 2 
}: ChemicalInputProps) {
  const [showBuilder, setShowBuilder] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // ✅ Функция для умной вставки символа в позицию курсора
  const insertSymbol = (symbol: string) => {
    const el = inputRef.current;
    if (!el) return;

    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const newValue = value.substring(0, start) + symbol + value.substring(end);

    onChange(newValue);

    // Мгновенно возвращаем фокус и ставим курсор после вставленного символа
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + symbol.length, start + symbol.length);
    }, 0);
  };

  // Набор самых частых символов для химических уравнений
  const quickSymbols = [
    { label: "+", symbol: " + ", title: "Плюс" },
    { label: "→", symbol: " → ", title: "Стрелка реакции" },
    { label: "=", symbol: " = ", title: "Равно" },
    { label: "↑", symbol: "↑", title: "Выделение газа" },
    { label: "↓", symbol: "↓", title: "Осадок" },
    { label: "t°", symbol: "t°", title: "Нагревание" },
  ];

  return (
    <div className="space-y-1">
      {label && <label className="text-xs text-purple-700 font-medium mb-1 block">{label}</label>}
      
      {/* ✅ Панель быстрых химических символов */}
      <div className="flex flex-wrap gap-1.5 mb-1">
        {quickSymbols.map((item) => (
          <button
            key={item.symbol}
            type="button" // Важно: чтобы кнопка случайно не сабмитила форму
            onClick={() => insertSymbol(item.symbol)}
            className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 active:bg-purple-300 text-purple-800 rounded-md text-xs font-bold transition active:scale-95 border border-purple-200 select-none"
            title={item.title}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 items-start">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="flex-1 border-2 border-purple-200 rounded-lg p-2.5 text-sm font-mono text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition resize-y bg-white/80"
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            id={id}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 border-2 border-purple-200 rounded-lg p-2.5 text-sm font-mono text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition bg-white/80"
          />
        )}
        <button 
          type="button" 
          onClick={() => setShowBuilder(true)} 
          className="px-3 py-2.5 bg-gradient-to-r from-purple-600 to-violet-700 text-white rounded-lg text-sm font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-md shadow-purple-300 flex-shrink-0" 
          title="Открыть конструктор молекул"
        >
          🧩
        </button>
      </div>

      {showBuilder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowBuilder(false)}>
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <MoleculeBuilder 
              initialValue={value} 
              onAdd={(formula) => { 
                onChange(formula); 
                setShowBuilder(false); 
              }} 
              onCancel={() => setShowBuilder(false)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}