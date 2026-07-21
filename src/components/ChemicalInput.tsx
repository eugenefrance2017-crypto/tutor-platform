"use client";

import { useState } from "react";
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

export default function ChemicalInput({ value, onChange, placeholder = "Введите формулу...", label, id, multiline = false, rows = 2 }: ChemicalInputProps) {
  const [showBuilder, setShowBuilder] = useState(false);

  return (
    <div className="space-y-1">
      {label && <label className="text-xs text-purple-700 font-medium">{label}</label>}
      <div className="flex gap-2 items-start">
        {multiline ? (
          <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="flex-1 border-2 border-purple-200 rounded-lg p-2.5 text-sm font-mono text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition resize-y" />
        ) : (
          <input id={id} type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="flex-1 border-2 border-purple-200 rounded-lg p-2.5 text-sm font-mono text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition" />
        )}
        <button type="button" onClick={() => setShowBuilder(true)} className="px-3 py-2.5 bg-gradient-to-r from-purple-600 to-violet-700 text-white rounded-lg text-sm font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-md shadow-purple-300 flex-shrink-0" title="Открыть конструктор молекул">🧩</button>
      </div>
      {showBuilder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowBuilder(false)}>
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <MoleculeBuilder initialValue={value} onAdd={(formula) => { onChange(formula); setShowBuilder(false); }} onCancel={() => setShowBuilder(false)} />
          </div>
        </div>
      )}
    </div>
  );
}