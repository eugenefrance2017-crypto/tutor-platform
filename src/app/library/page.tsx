"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, deleteDoc, query, where, onSnapshot, getDocs, doc,
} from "firebase/firestore";
import toast from "react-hot-toast";
import dynamic from 'next/dynamic';

const PDFCropper = dynamic(() => import('../homeworks/PDFCropper'), { ssr: false });

const firebaseConfig = {
  apiKey: "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4", authDomain: "tutor-platform-a5e37.firebaseapp.com",
  projectId: "tutor-platform-a5e37", storageBucket: "tutor-platform-a5e37.firebasestorage.app",
  messagingSenderId: "115123071384", appId: "1:115123071384:web:9517a29ed1fc2c46e163ed",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const TASK_TYPES: Record<string, string> = {
  text: "📝 Текст", single_choice: "🔘 Тест (один)", multi_choice: "☑️ Тест (много)",
  matching: "🔗 Соответствие", ordering: "🔬 Порядок",
  table_fill: "📊 Таблица", drag_drop: "🖱️ Drag & Drop", assembly: "🧩 Сборка",
  pdf_image: "📷 Фото/PDF",
};

function LibraryContent() {
  const searchParams = useSearchParams();
  const [uid, setUid] = useState("");
  
  useEffect(() => {
    setUid(searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "");
  }, [searchParams]);

  const [folders, setFolders] = useState<any[]>([]);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [addMode, setAddMode] = useState<"manual" | "pdf" | null>(null);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemSections, setNewItemSections] = useState<any[]>([]);
  const [showSectionEditor, setShowSectionEditor] = useState(false);
  const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(null);
  const [sectionForm, setSectionForm] = useState<any>({
    type: "text", title: "", max_score: 10, task_text: "", explanation: "",
    data: { check_type: "exact", word_score: 10 },
  });

  useEffect(() => { if (!uid) return; const q = query(collection(db, "folders"), where("tutor_id", "==", uid)); const unsub = onSnapshot(q, (snap) => setFolders(snap.docs.map((d) => ({ id: d.id, ...d.data() })))); return () => unsub(); }, [uid]);
  useEffect(() => { if (!selectedFolder) { setItems([]); return; } const q = query(collection(db, "library_items"), where("folder_id", "==", selectedFolder)); const unsub = onSnapshot(q, (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })))); return () => unsub(); }, [selectedFolder]);

  async function createFolder() { if (!newFolderName.trim()) return; await addDoc(collection(db, "folders"), { tutor_id: uid, name: newFolderName.trim(), created_at: new Date().toISOString() }); setNewFolderName(""); setShowNewFolder(false); toast.success("Папка создана!"); }
  async function deleteFolder(id: string) { if (!window.confirm("Удалить папку и все задания в ней?")) return; const itemsSnap = await getDocs(query(collection(db, "library_items"), where("folder_id", "==", id))); itemsSnap.forEach(async (d) => await deleteDoc(doc(db, "library_items", d.id))); await deleteDoc(doc(db, "folders", id)); if (selectedFolder === id) setSelectedFolder(null); toast.success("Папка удалена!"); }
  async function deleteItem(id: string) { if (!window.confirm("Удалить задание?")) return; await deleteDoc(doc(db, "library_items", id)); toast.success("Задание удалено!"); }
  
  async function duplicateItem(item: any) {
    await addDoc(collection(db, "library_items"), { tutor_id: uid, folder_id: item.folder_id, title: (item.title || "Копия") + " (копия)", sections: item.sections || [], created_at: new Date().toISOString() });
    toast.success("Задание скопировано!");
  }

  function addSection() { setNewItemSections([...newItemSections, { id: "s" + Date.now(), type: sectionForm.type, title: sectionForm.title, max_score: sectionForm.max_score, task_text: sectionForm.task_text, explanation: sectionForm.explanation, data: { ...sectionForm.data } }]); setSectionForm({ type: "text", title: "", max_score: 10, task_text: "", explanation: "", data: { check_type: "exact", word_score: 10 } }); setShowSectionEditor(false); toast.success("Задание добавлено!"); }
  function removeSection(index: number) { setNewItemSections(newItemSections.filter((_, i) => i !== index)); }
  function editSection(index: number) { const sec = newItemSections[index]; setSectionForm({ type: sec.type, title: sec.title, max_score: sec.max_score, task_text: sec.task_text || "", explanation: sec.explanation || "", data: sec.data || { check_type: "exact", word_score: sec.max_score } }); setEditingSectionIndex(index); setShowSectionEditor(true); }
  function saveEditedSection() { if (editingSectionIndex !== null) { const newSections = [...newItemSections]; newSections[editingSectionIndex] = { ...newSections[editingSectionIndex], type: sectionForm.type, title: sectionForm.title, max_score: sectionForm.max_score, task_text: sectionForm.task_text, explanation: sectionForm.explanation, data: { ...sectionForm.data } }; setNewItemSections(newSections); setEditingSectionIndex(null); setShowSectionEditor(false); setSectionForm({ type: "text", title: "", max_score: 10, task_text: "", explanation: "", data: { check_type: "exact", word_score: 10 } }); toast.success("Задание обновлено!"); } }

  function handlePDFSave(images: { dataUrl: string; answer: string; maxScore: number }[]) {
    const sections = images.map((img, idx) => ({ id: "pdf-" + Date.now() + "-" + idx, type: "pdf_image", title: `Задание ${idx + 1} (из PDF)`, max_score: img.maxScore || 10, data: { image: img.dataUrl, check_type: "exact", correct_answer: img.answer, word_score: img.maxScore || 10 }, explanation: "" }));
    setNewItemSections([...newItemSections, ...sections]); setAddMode("manual"); toast.success(`Добавлено ${images.length} заданий из PDF!`);
  }

  async function saveItemToFolder() { if (!selectedFolder) return toast.error("Выберите папку!"); if (!newItemTitle.trim()) return toast.error("Введите название!"); if (newItemSections.length === 0) return toast.error("Добавьте хотя бы одну секцию!"); await addDoc(collection(db, "library_items"), { tutor_id: uid, folder_id: selectedFolder, title: newItemTitle.trim(), sections: newItemSections, created_at: new Date().toISOString() }); setNewItemTitle(""); setNewItemSections([]); setShowAddItem(false); setAddMode(null); toast.success("Задание добавлено в библиотеку!"); }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50">
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/homeworks?uid=${uid}`} className="text-indigo-600 hover:text-indigo-800 transition font-medium">← К заданиям</Link>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-violet-500 to-purple-500 bg-clip-text text-transparent">📚 Библиотека заданий</h1>
          <button onClick={() => setShowNewFolder(true)} className="bg-violet-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-violet-600 shadow-lg shadow-violet-200 transition">+ Папка</button>
        </div>

        {showNewFolder && (
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-4 mb-6 border border-white">
            <div className="flex gap-2"><input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Название папки..." className="flex-1 border rounded-xl p-2.5 text-sm" onKeyDown={(e) => e.key === "Enter" && createFolder()} autoFocus /><button onClick={createFolder} className="px-4 py-2.5 bg-violet-500 text-white rounded-xl text-sm font-medium hover:bg-violet-600">Создать</button><button onClick={() => setShowNewFolder(false)} className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-300">Отмена</button></div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-4 border border-white">
              <h2 className="font-semibold text-gray-700 mb-3">📁 Папки</h2>
              {folders.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Нет папок</p>}
              <div className="space-y-1">
                {folders.map((folder) => (
                  <div key={folder.id} onClick={() => setSelectedFolder(folder.id)} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition ${selectedFolder === folder.id ? "bg-violet-100 border border-violet-300" : "hover:bg-gray-50 border border-transparent"}`}>
                    <span className="text-sm font-medium truncate flex-1">{selectedFolder === folder.id ? "📂" : "📁"} {folder.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }} className="text-red-400 hover:text-red-600 text-sm ml-2">🗑️</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-4 border border-white min-h-[300px]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-700">📄 {selectedFolder ? "Задания в папке" : "Выберите папку"}</h2>
                {selectedFolder && !showAddItem && (
                  <div className="flex gap-2">
                    <button onClick={() => { setShowAddItem(true); setAddMode("pdf"); setNewItemTitle(""); setNewItemSections([]); }} className="px-3 py-1.5 bg-violet-500 text-white rounded-lg text-xs font-medium hover:bg-violet-600 transition">📷 Из PDF</button>
                    <button onClick={() => { setShowAddItem(true); setAddMode("manual"); setNewItemTitle(""); setNewItemSections([]); }} className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-medium hover:bg-indigo-600 transition">+ Задание</button>
                  </div>
                )}
              </div>

              {!selectedFolder ? (<div className="flex items-center justify-center h-full text-gray-400"><p>👈 Выберите папку слева</p></div>) : (
                <>
                  {items.length === 0 && !showAddItem && (<div className="text-center py-8 text-gray-400"><p className="text-lg mb-2">📭 Пусто</p><p className="text-sm">Нажмите «+ Задание» или «📷 Из PDF»</p></div>)}
                  {showAddItem && addMode === "pdf" && (<div className="mb-4"><PDFCropper onSave={handlePDFSave} onCancel={() => { setShowAddItem(false); setAddMode(null); }} />{newItemSections.length > 0 && (<div className="mt-4 space-y-2"><input value={newItemTitle} onChange={(e) => setNewItemTitle(e.target.value)} placeholder="Название для сохранения..." className="w-full border rounded-lg p-2 text-sm" /><button onClick={saveItemToFolder} className="w-full bg-emerald-500 text-white py-2 rounded-lg text-sm hover:bg-emerald-600">💾 Сохранить в библиотеку</button></div>)}</div>)}
                  {showAddItem && addMode === "manual" && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-xl border">
                      <input value={newItemTitle} onChange={(e) => setNewItemTitle(e.target.value)} placeholder="Название задания..." className="w-full border rounded-lg p-2 text-sm mb-3" autoFocus />
                      {newItemSections.length > 0 && (<div className="space-y-2 mb-3">{newItemSections.map((sec: any, idx: number) => (<div key={sec.id} className="flex items-center justify-between p-2 bg-white rounded-lg text-xs"><span>{sec.title || `Задание ${idx + 1}`} ({TASK_TYPES[sec.type] || sec.type})</span><div className="flex gap-1">{sec.type !== 'pdf_image' && <button onClick={() => editSection(idx)} className="text-indigo-500 hover:text-indigo-700">✏️</button>}<button onClick={() => removeSection(idx)} className="text-red-400 hover:text-red-600">×</button></div></div>))}</div>)}
                      {!showSectionEditor ? (
                        <div className="flex gap-2"><button onClick={() => { setEditingSectionIndex(null); setSectionForm({ type: "text", title: "", max_score: 10, task_text: "", explanation: "", data: { check_type: "exact", word_score: 10 } }); setShowSectionEditor(true); }} className="flex-1 py-2 bg-indigo-500 text-white rounded-lg text-xs font-medium hover:bg-indigo-600">+ Добавить секцию</button><button onClick={saveItemToFolder} disabled={!newItemTitle.trim() || newItemSections.length === 0} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 disabled:opacity-50">💾 Сохранить</button><button onClick={() => { setShowAddItem(false); setAddMode(null); }} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-xs hover:bg-gray-300">Отмена</button></div>
                      ) : (
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm">{editingSectionIndex !== null ? "✏️ Редактировать" : "📝 Новая секция"}</h4>
                          <div><label className="text-xs text-gray-500">Тип задания</label><select value={sectionForm.type} onChange={(e) => setSectionForm({ ...sectionForm, type: e.target.value })} className="w-full border rounded-lg p-1.5 text-xs mt-1">{Object.entries(TASK_TYPES).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}</select></div>
                          <input value={sectionForm.title} onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })} placeholder="Название секции" className="w-full border rounded-lg p-1.5 text-xs" />
                          <div><label className="text-xs text-gray-500">Текст задания</label><textarea value={sectionForm.task_text} onChange={(e) => setSectionForm({ ...sectionForm, task_text: e.target.value })} placeholder="Текст задания..." className="w-full border rounded-lg p-1.5 text-xs mt-1" rows={2} /></div>
                          <div><label className="text-xs text-gray-500">Макс. балл</label><input type="number" value={sectionForm.max_score} onChange={(e) => setSectionForm({ ...sectionForm, max_score: parseInt(e.target.value) || 10 })} className="w-full border rounded-lg p-1.5 text-xs mt-1" /></div>
                          <div><label className="text-xs text-gray-500">Пояснение</label><textarea value={sectionForm.explanation} onChange={(e) => setSectionForm({ ...sectionForm, explanation: e.target.value })} placeholder="Пояснение к ответу..." className="w-full border rounded-lg p-1.5 text-xs mt-1" rows={2} /></div>
                          {sectionForm.type === "text" && (
                            <div className="space-y-2">
                              <div><label className="text-xs text-gray-500">Тип проверки</label><select value={sectionForm.data?.check_type || "exact"} onChange={(e) => setSectionForm({ ...sectionForm, data: { ...sectionForm.data, check_type: e.target.value } })} className="w-full border rounded-lg p-1.5 text-xs mt-1"><option value="exact">Точное совпадение</option><option value="keywords">Ключевые слова</option><option value="range">Диапазон чисел</option><option value="variants">Несколько вариантов</option></select></div>
                              {sectionForm.data?.check_type === "exact" && <input value={sectionForm.data?.correct_answer || ""} onChange={(e) => setSectionForm({ ...sectionForm, data: { ...sectionForm.data, correct_answer: e.target.value } })} placeholder="Правильный ответ" className="w-full border rounded-lg p-1.5 text-xs" />}
                              {sectionForm.data?.check_type === "keywords" && <input value={sectionForm.data?.keywords?.join(", ") || ""} onChange={(e) => setSectionForm({ ...sectionForm, data: { ...sectionForm.data, keywords: e.target.value.split(",").map((k: string) => k.trim()).filter((k: string) => k) } })} placeholder="Ключевые слова через запятую" className="w-full border rounded-lg p-1.5 text-xs" />}
                            </div>
                          )}
                          <div className="flex gap-2"><button onClick={editingSectionIndex !== null ? saveEditedSection : addSection} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600">{editingSectionIndex !== null ? "💾 Сохранить" : "✅ Добавить"}</button><button onClick={() => { setShowSectionEditor(false); setEditingSectionIndex(null); }} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-xs hover:bg-gray-300">Отмена</button></div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-center justify-between"><div><p className="text-sm font-medium">{item.title || "Без названия"}</p><p className="text-xs text-gray-400">{item.sections?.length || 0} заданий</p></div><div className="flex gap-1"><button onClick={() => duplicateItem(item)} className="text-gray-400 hover:text-indigo-500 text-sm" title="Копировать">📋</button><button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-600 text-sm">🗑️</button></div></div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LibraryPage() {
  return (<Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto mb-4"></div><p className="text-gray-500">Загрузка...</p></div></div>}><LibraryContent /></Suspense>);
}