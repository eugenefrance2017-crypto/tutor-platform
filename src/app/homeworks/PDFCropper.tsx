"use client";

import { useState, useRef, useCallback } from "react";
import { Document, Page, pdfjs } from 'react-pdf';
import html2canvas from 'html2canvas';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PDFCropper({ onSave, onCancel }: { onSave: (images: { dataUrl: string; answer: string; maxScore: number }[]) => void; onCancel: () => void }) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selections, setSelections] = useState<{ page: number; x: number; y: number; w: number; h: number; answer: string; maxScore: number }[]>([]);
  const [scale, setScale] = useState(2);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState({ x: 0, y: 0, w: 0, h: 0 });

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) { setNumPages(numPages); }

  const getRelativePos = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return { x: (e.clientX - rect.left + container.scrollLeft), y: (e.clientY - rect.top + container.scrollTop) };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => { e.preventDefault(); const pos = getRelativePos(e); setIsDrawing(true); setStartPos(pos); setCurrentRect({ x: pos.x, y: pos.y, w: 0, h: 0 }); };
  const handleMouseMove = (e: React.MouseEvent) => { if (!isDrawing) return; e.preventDefault(); const pos = getRelativePos(e); setCurrentRect({ x: Math.min(startPos.x, pos.x), y: Math.min(startPos.y, pos.y), w: Math.abs(pos.x - startPos.x), h: Math.abs(pos.y - startPos.y) }); };
  const handleMouseUp = () => { if (!isDrawing) return; setIsDrawing(false); if (currentRect.w > 30 && currentRect.h > 30) { setSelections([...selections, { page: currentPage, x: currentRect.x, y: currentRect.y, w: currentRect.w, h: currentRect.h, answer: "", maxScore: 10 }]); setCurrentRect({ x: 0, y: 0, w: 0, h: 0 }); } };

  async function saveAll() {
    const images: { dataUrl: string; answer: string; maxScore: number }[] = [];
    const s = 3;
    for (const sel of selections) {
      setCurrentPage(sel.page);
      await new Promise(resolve => setTimeout(resolve, 800));
      const pageElement = document.querySelector(`.pdf-page-snap-${sel.page}`) as HTMLElement;
      if (pageElement) {
        try {
          const canvas = await html2canvas(pageElement, { scale: s, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' });
          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = Math.round(sel.w * s);
          cropCanvas.height = Math.round(sel.h * s);
          const ctx = cropCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, Math.round(sel.x * s), Math.round(sel.y * s), Math.round(sel.w * s), Math.round(sel.h * s), 0, 0, Math.round(sel.w * s), Math.round(sel.h * s));
            images.push({ dataUrl: cropCanvas.toDataURL('image/png'), answer: sel.answer, maxScore: sel.maxScore });
          }
        } catch (e) { console.error('Ошибка сохранения фрагмента:', e); }
      }
    }
    if (images.length > 0) onSave(images);
  }

  const pageSelections = selections.filter(s => s.page === currentPage);

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
      <div className="flex items-center justify-between"><h4 className="font-medium text-sm">📷 Загрузить PDF и выделить фрагменты</h4><button onClick={onCancel} className="text-gray-400 hover:text-gray-600">×</button></div>
      {!pdfFile ? (
        <div className="text-center py-8">
          <label className="cursor-pointer bg-violet-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-violet-600 inline-block">📄 Выбрать PDF файл<input type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} className="hidden" /></label>
          <p className="text-xs text-gray-400 mt-2">Загрузите PDF и выделите нужные фрагменты мышкой</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-2 items-center">
              <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1} className="px-3 py-1 bg-white rounded-lg text-xs border">◀</button>
              <span className="text-xs">Стр. {currentPage} / {numPages}</span>
              <button onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))} disabled={currentPage >= numPages} className="px-3 py-1 bg-white rounded-lg text-xs border">▶</button>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-gray-400">Масштаб:</span>
              <select value={scale} onChange={(e) => setScale(Number(e.target.value))} className="border rounded-lg px-2 py-1 text-xs">
                <option value={1}>100%</option><option value={1.5}>150%</option><option value={2}>200%</option><option value={2.5}>250%</option><option value={3}>300%</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-500">🖱️ Зажмите левую кнопку мыши и выделите фрагмент</p>
          <div ref={containerRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={() => setIsDrawing(false)} className="relative border-2 border-dashed border-gray-300 rounded-lg overflow-auto bg-white select-none" style={{ maxHeight: '550px', cursor: 'crosshair' }}>
            <div className={`pdf-page-snap-${currentPage}`}>
              <Document file={pdfFile} onLoadSuccess={onDocumentLoadSuccess}><Page pageNumber={currentPage} scale={scale} renderTextLayer={false} renderAnnotationLayer={false} /></Document>
            </div>
            {pageSelections.map((sel, i) => { const gi = selections.indexOf(sel); return (<div key={i} className="absolute border-2 border-emerald-500 bg-emerald-500/10 pointer-events-none" style={{ left: sel.x, top: sel.y, width: sel.w, height: sel.h }}><span className="absolute -top-5 left-0 bg-emerald-500 text-white text-xs px-1.5 py-0.5 rounded">№{gi + 1}</span></div>); })}
            {isDrawing && currentRect.w > 0 && <div className="absolute border-2 border-indigo-500 bg-indigo-500/20 pointer-events-none" style={{ left: currentRect.x, top: currentRect.y, width: currentRect.w, height: currentRect.h }} />}
          </div>
          {selections.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium">📋 Выделено {selections.length} фрагментов:</p>
              {selections.map((sel, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-white rounded-lg text-xs">
                  <span className="text-gray-400 w-6">№{i + 1}</span><span className="text-gray-400">Стр.{sel.page}</span>
                  <input value={sel.answer} onChange={(e) => { const ns = [...selections]; ns[i].answer = e.target.value; setSelections(ns); }} placeholder="Правильный ответ" className="flex-1 border rounded px-2 py-1 text-xs" />
                  <input type="number" value={sel.maxScore} onChange={(e) => { const ns = [...selections]; ns[i].maxScore = parseInt(e.target.value) || 1; setSelections(ns); }} className="w-12 border rounded px-1 py-1 text-xs" min={1} />
                  <button onClick={() => setSelections(selections.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">×</button>
                </div>
              ))}
              <button onClick={saveAll} className="w-full bg-emerald-500 text-white py-2.5 rounded-lg text-sm hover:bg-emerald-600 font-medium">✅ Сохранить {selections.length} заданий</button>
            </div>
          )}
          <button onClick={() => { setPdfFile(null); setSelections([]); }} className="text-xs text-gray-400 hover:text-gray-600">← Выбрать другой файл</button>
        </>
      )}
    </div>
  );
}