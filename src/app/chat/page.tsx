"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, query, where, onSnapshot, 
  doc, getDoc, updateDoc, serverTimestamp, deleteDoc, getDocs
} from "firebase/firestore";
import toast from "react-hot-toast";
import { Send, Smile, Search, MoreVertical, Check, CheckCheck, MessageSquare, X, Trash2, Info, Eraser } from "lucide-react";

const firebaseConfig = {
  apiKey: "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4",
  authDomain: "tutor-platform-a5e37.firebaseapp.com",
  projectId: "tutor-platform-a5e37",
  storageBucket: "tutor-platform-a5e37.firebasestorage.app",
  messagingSenderId: "115123071384",
  appId: "1:115123071384:web:9517a29ed1fc2c46e163ed",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const EMOJI_LIST = ["😊", "😂", "❤️", "👍", "", "🔥", "💯", "✨", "🌟", "😎", "👋", "🙏", "😍", "🤔", "📚", "🧪", "🧬", "✅", "👀", "💪"];

function ChatContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student";
  
  const [profile, setProfile] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [newChatSearchQuery, setNewChatSearchQuery] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showMobileChat, setShowMobileChat] = useState(false);
  
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"question" | "bug">("question");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowChatMenu(false);
      }
    };
    if (showChatMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showChatMenu]);

  useEffect(() => {
    if (!uid) return;
    const updateLastSeen = async () => {
      try { await updateDoc(doc(db, "profiles", uid), { last_seen: serverTimestamp() }); } catch (e) {}
    };
    updateLastSeen();
    const interval = setInterval(updateLastSeen, 60000);
    return () => clearInterval(interval);
  }, [uid]);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    getDoc(doc(db, "profiles", uid)).then((snap) => {
      if (snap.exists()) setProfile(snap.data());
    });
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const unsubChats = onSnapshot(
      query(collection(db, "chats"), where("participants", "array-contains", uid)),
      (snap) => {
        const chatsData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        chatsData.sort((a: any, b: any) => {
          const timeA = a.last_message_time?.seconds || 0;
          const timeB = b.last_message_time?.seconds || 0;
          return timeB - timeA;
        });
        setChats(chatsData);
        setLoading(false);
      }
    );
    return () => unsubChats();
  }, [uid]);

  useEffect(() => {
    if (!uid || !profile) return;
    loadContacts();
  }, [uid, profile]);

  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }
    
    const q = query(
      collection(db, "messages"),
      where("chat_id", "==", selectedChat.id)
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      msgs.sort((a: any, b: any) => {
        const timeA = a.created_at?.seconds || 0;
        const timeB = b.created_at?.seconds || 0;
        return timeA - timeB;
      });
      setMessages(msgs);
      
      const unreadMsgs = msgs.filter((m: any) => m.sender_id !== uid && !m.read);
      if (unreadMsgs.length > 0) {
        unreadMsgs.forEach((m: any) => {
          updateDoc(doc(db, "messages", m.id), { read: true }).catch(() => {});
        });
      }
      
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 100);
    });

    return () => unsub();
  }, [selectedChat, uid]);

  useEffect(() => {
    if (!selectedChat) return;
    const otherId = selectedChat.participants?.find((p: string) => p !== uid);
    if (!otherId) return;

    const unsub = onSnapshot(doc(db, "profiles", otherId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.typing_in === selectedChat.id) {
          setTypingUsers([data.full_name || "Собеседник"]);
        } else {
          setTypingUsers([]);
        }
      }
    });
    return () => unsub();
  }, [selectedChat, uid]);

  async function loadContacts() {
    try {
      if (role === "tutor") {
        const studentsSnap = await new Promise<any[]>((resolve) => {
          const unsub = onSnapshot(query(collection(db, "profiles"), where("role", "==", "student")), (snap) => {
            resolve(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            unsub();
          });
        });
        const parentsSnap = await new Promise<any[]>((resolve) => {
          const unsub = onSnapshot(query(collection(db, "profiles"), where("role", "==", "parent")), (snap) => {
            resolve(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            unsub();
          });
        });
        setContacts([...studentsSnap, ...parentsSnap]);
      } else if (role === "parent" || role === "student") {
        if (profile?.tutor_id) {
          const tutorSnap = await getDoc(doc(db, "profiles", profile.tutor_id));
          if (tutorSnap.exists()) setContacts([{ id: profile.tutor_id, ...tutorSnap.data() }]);
        } else if (profile?.child_id && role === "parent") {
          const childSnap = await getDoc(doc(db, "profiles", profile.child_id));
          if (childSnap.exists() && childSnap.data()?.tutor_id) {
            const tutorSnap = await getDoc(doc(db, "profiles", childSnap.data().tutor_id));
            if (tutorSnap.exists()) setContacts([{ id: childSnap.data().tutor_id, ...tutorSnap.data() }]);
          }
        }
      }
    } catch (error) {
      console.error("Ошибка загрузки контактов:", error);
    }
  }

  async function startChat() {
    if (!selectedContact) return;
    const existingChat = chats.find((c: any) => 
      c.participants?.includes(uid) && c.participants?.includes(selectedContact.id)
    );
    
    if (existingChat) {
      setSelectedChat(existingChat);
      setShowNewChat(false);
      setSelectedContact(null);
      setNewChatSearchQuery("");
      setShowMobileChat(true);
      return;
    }
    
    const chatRef = await addDoc(collection(db, "chats"), {
      participants: [uid, selectedContact.id],
      participant_names: {
        [uid]: profile?.full_name || "Я",
        [selectedContact.id]: selectedContact.full_name || selectedContact.email || "Собеседник",
      },
      created_at: serverTimestamp(),
      last_message: "",
      last_message_time: serverTimestamp(),
    });
    
    setSelectedChat({ 
      id: chatRef.id, 
      participants: [uid, selectedContact.id],
      participant_names: { [uid]: profile?.full_name || "Я", [selectedContact.id]: selectedContact.full_name || "Собеседник" },
    });
    setShowNewChat(false);
    setSelectedContact(null);
    setNewChatSearchQuery("");
    setShowMobileChat(true);
    toast.success("💕 Чат создан!");
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedChat) return;
    const message = newMessage.trim();
    setNewMessage("");
    setShowEmojiPicker(false);
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    updateDoc(doc(db, "profiles", uid), { typing_in: null }).catch(() => {});
    
    const tempId = "temp-" + Date.now();
    const tempMsg = {
      id: tempId, chat_id: selectedChat.id, sender_id: uid,
      sender_name: profile?.full_name || "Пользователь", text: message,
      created_at: { seconds: Date.now() / 1000 }, read: false, _sending: true,
    };
    setMessages((prev) => [...prev, tempMsg]);
    
    try {
      const docRef = await addDoc(collection(db, "messages"), {
        chat_id: selectedChat.id, sender_id: uid, sender_name: profile?.full_name || "Пользователь",
        text: message, created_at: serverTimestamp(), read: false,
      });
      setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, id: docRef.id, _sending: false } : m));
      
      await updateDoc(doc(db, "chats", selectedChat.id), {
        last_message: message.length > 40 ? message.slice(0, 40) + "..." : message,
        last_message_time: serverTimestamp(),
      });
    } catch (error) {
      toast.error("Ошибка отправки");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setNewMessage(message);
    }
  }

  async function deleteMessage(msgId: string) {
    if (!confirm("Удалить сообщение?")) return;
    try {
      await deleteDoc(doc(db, "messages", msgId));
      toast.success("🗑️ Удалено");
    } catch (error) {
      toast.error("Ошибка удаления");
    }
  }

  async function clearChatHistory() {
    if (!selectedChat) return;
    if (!confirm("Очистить всю историю сообщений в этом чате?")) return;
    
    try {
      const msgsSnap = await getDocs(query(collection(db, "messages"), where("chat_id", "==", selectedChat.id)));
      const batch = msgsSnap.docs.map(d => deleteDoc(doc(db, "messages", d.id)));
      await Promise.all(batch);
      
      await updateDoc(doc(db, "chats", selectedChat.id), {
        last_message: "",
        last_message_time: serverTimestamp(),
      });
      
      toast.success(" История очищена");
      setShowChatMenu(false);
    } catch (error) {
      console.error("Ошибка очистки:", error);
      toast.error("Ошибка при очистке");
    }
  }

  async function deleteChat() {
    if (!selectedChat) return;
    if (!confirm("Удалить чат полностью? Вся история будет потеряна.")) return;
    
    try {
      const msgsSnap = await getDocs(query(collection(db, "messages"), where("chat_id", "==", selectedChat.id)));
      const deleteMsgs = msgsSnap.docs.map(d => deleteDoc(doc(db, "messages", d.id)));
      await Promise.all(deleteMsgs);
      
      await deleteDoc(doc(db, "chats", selectedChat.id));
      
      setSelectedChat(null);
      toast.success("🗑️ Чат удалён");
      setShowChatMenu(false);
    } catch (error) {
      console.error("Ошибка удаления чата:", error);
      toast.error("Ошибка при удалении");
    }
  }

  async function submitFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!feedbackText.trim()) return toast.error("Введите текст обращения");
    
    setFeedbackSending(true);
    try {
      await addDoc(collection(db, "feedback"), {
        uid,
        user_name: profile?.full_name || "Неизвестно",
        role,
        type: feedbackType,
        text: feedbackText,
        created_at: serverTimestamp(),
        status: "new"
      });

      const typeEmoji = feedbackType === "bug" ? "🐛 <b>БАГ</b>" : "❓ <b>ВОПРОС</b>";
      const userName = profile?.full_name || "Неизвестный пользователь";
      
      const telegramMessage = `🚨 <b>Новый фидбэк с платформы!</b>\n\n <b>От:</b> ${userName} (${role})\n🏷️ <b>Тип:</b> ${typeEmoji}\n💬 <b>Сообщение:</b>\n<i>${feedbackText}</i>`;

      const response = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: telegramMessage }),
      });

      if (!response.ok) throw new Error("Ошибка API Telegram");

      toast.success("💕 Спасибо! Сообщение отправлено.");
      setShowFeedback(false);
      setFeedbackText("");
    } catch (error) {
      console.error("Ошибка отправки фидбэка:", error);
      toast.error("Ошибка отправки. Попробуйте позже.");
    } finally {
      setFeedbackSending(false);
    }
  }

  function handleTyping() {
    if (!selectedChat) return;
    updateDoc(doc(db, "profiles", uid), { typing_in: selectedChat.id }).catch(() => {});
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      updateDoc(doc(db, "profiles", uid), { typing_in: null }).catch(() => {});
    }, 3000);
  }

  function getOtherParticipant(chat: any) {
    const otherId = chat.participants?.find((p: string) => p !== uid);
    return chat.participant_names?.[otherId] || "Собеседник";
  }

  function getOtherRole(chat: any) {
    const otherId = chat.participants?.find((p: string) => p !== uid);
    const contact = contacts.find((c: any) => c.id === otherId);
    if (!contact) return "";
    if (contact.role === "tutor") return "‍🏫 Репетитор";
    if (contact.role === "student") return " Ученик";
    if (contact.role === "parent") return "👨‍‍👧 Родитель";
    return "";
  }

  function isOnline(contact: any) {
    if (!contact?.last_seen?.seconds) return false;
    return (new Date().getTime() - new Date(contact.last_seen.seconds * 1000).getTime()) < 120000;
  }

  function getLastSeen(chat: any) {
    const otherId = chat.participants?.find((p: string) => p !== uid);
    const contact = contacts.find((c: any) => c.id === otherId);
    if (!contact?.last_seen?.seconds) return "был(а) недавно";
    if (isOnline(contact)) return "онлайн";
    
    const lastSeen = new Date(contact.last_seen.seconds * 1000);
    const diff = new Date().getTime() - lastSeen.getTime();
    if (diff < 3600000) return `был(а) ${Math.floor(diff / 60000)} мин назад`;
    if (diff < 86400000) return `был(а) ${Math.floor(diff / 3600000)} ч назад`;
    return `был(а) ${lastSeen.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`;
  }

  function groupMessagesByDate(msgs: any[]) {
    const groups: { date: string; messages: any[] }[] = [];
    let currentDate = "";
    msgs.forEach(msg => {
      const msgDate = msg.created_at?.seconds 
        ? new Date(msg.created_at.seconds * 1000).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })
        : "Сегодня";
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });
    return groups;
  }

  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    return getOtherParticipant(chat).toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredContacts = contacts.filter((c: any) => {
    if (!newChatSearchQuery) return true;
    return (c.full_name || c.email || "").toLowerCase().includes(newChatSearchQuery.toLowerCase());
  });

  const groupedMessages = groupMessagesByDate(messages);
  const otherContact = selectedChat ? contacts.find(c => c.id === selectedChat.participants?.find((p: string) => p !== uid)) : null;

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4 animate-pulse">💕</div>
        <p className="text-rose-600 font-serif italic">Загрузка...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 relative overflow-hidden flex flex-col">
      <div className="fixed inset-0 pointer-events-none opacity-10">
        <div className="absolute top-10 left-10 text-8xl"></div>
        <div className="absolute bottom-20 right-10 text-7xl">🌸</div>
      </div>

      {/* ✅ ЗАГОЛОВОК ПО ЦЕНТРУ, БЕЗ СТРЕЛКИ */}
      <div className="bg-white/80 backdrop-blur-md border-b border-pink-200 px-4 sm:px-6 py-4 flex items-center justify-center sticky top-0 z-20">
        <h1 className="text-xl sm:text-2xl font-serif font-bold bg-gradient-to-r from-pink-600 to-rose-500 bg-clip-text text-transparent">
          Сообщения
        </h1>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-0 sm:p-4 h-[calc(100vh-73px)] relative z-10">
        <div className="bg-white/90 backdrop-blur sm:rounded-3xl shadow-xl border-2 border-pink-200 h-full flex overflow-hidden">
          
          <div className={`w-full md:w-80 lg:w-96 border-r border-pink-200 flex flex-col bg-white/50 ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-pink-100">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 Поиск чатов..."
                  className="w-full bg-pink-50/50 border-2 border-pink-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:border-rose-500 focus:outline-none transition"
                />
              </div>
              <button
                onClick={() => { setShowNewChat(true); setNewChatSearchQuery(""); }}
                className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-2.5 rounded-xl text-sm font-bold hover:from-pink-600 hover:to-rose-600 transition shadow-md shadow-rose-500/20 flex items-center justify-center gap-2"
              >
                <span>+</span> Новый чат
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredChats.length === 0 ? (
                <div className="p-8 text-center text-rose-400">
                  <p className="text-4xl mb-2">💌</p>
                  <p className="font-serif italic">Нет чатов</p>
                </div>
              ) : (
                filteredChats.map((chat: any) => {
                  const otherName = getOtherParticipant(chat);
                  const otherId = chat.participants?.find((p: string) => p !== uid);
                  const contact = contacts.find(c => c.id === otherId);
                  const online = isOnline(contact);
                  
                  return (
                    <button
                      key={chat.id}
                      onClick={() => { setSelectedChat(chat); setShowMobileChat(true); }}
                      className={`w-full text-left p-4 border-b border-pink-100 hover:bg-pink-50/50 transition flex items-start gap-3 ${
                        selectedChat?.id === chat.id ? "bg-gradient-to-r from-pink-100 to-rose-100 border-l-4 border-l-rose-500" : "border-l-4 border-l-transparent"
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                          {otherName[0].toUpperCase()}
                        </div>
                        {online && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white"></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-serif font-bold text-sm text-stone-800 truncate">{otherName}</p>
                          {chat.last_message_time?.seconds && (
                            <span className="text-xs text-rose-400 flex-shrink-0 ml-2">
                              {new Date(chat.last_message_time.seconds * 1000).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-rose-500 mb-1">{getOtherRole(chat)}</p>
                        <p className="text-sm text-stone-600 truncate">{chat.last_message || "Нет сообщений"}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className={`flex-1 flex flex-col bg-pink-50/30 ${showMobileChat ? 'flex' : 'hidden md:flex'}`}>
            {selectedChat ? (
              <>
                <div className="px-4 py-3 border-b border-pink-200 bg-white/80 backdrop-blur flex items-center gap-3 shadow-sm z-10">
                  <button onClick={() => setShowMobileChat(false)} className="md:hidden p-2 -ml-2 text-rose-600 hover:bg-pink-100 rounded-full">
                    ←
                  </button>
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold shadow-md">
                      {getOtherParticipant(selectedChat)[0].toUpperCase()}
                    </div>
                    {isOnline(contacts.find(c => c.id === selectedChat.participants?.find((p: string) => p !== uid))) && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif font-bold text-sm text-stone-800 truncate">{getOtherParticipant(selectedChat)}</p>
                    <p className="text-xs text-rose-500">
                      {typingUsers.length > 0 ? <span className="font-medium animate-pulse">печатает...</span> : getLastSeen(selectedChat)}
                    </p>
                  </div>
                  
                  <div className="relative" ref={menuRef}>
                    <button 
                      onClick={() => setShowChatMenu(!showChatMenu)} 
                      className="p-2 text-rose-400 hover:text-rose-600 hover:bg-pink-100 rounded-full transition"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    
                    {showChatMenu && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-pink-200 overflow-hidden z-50">
                        <button
                          onClick={() => { setShowUserInfo(true); setShowChatMenu(false); }}
                          className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-pink-50 transition text-sm text-stone-700"
                        >
                          <Info className="w-4 h-4 text-rose-500" />
                          <span>Информация о собеседнике</span>
                        </button>
                        <div className="border-t border-pink-100"></div>
                        <button
                          onClick={clearChatHistory}
                          className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-pink-50 transition text-sm text-stone-700"
                        >
                          <Eraser className="w-4 h-4 text-rose-500" />
                          <span>Очистить историю</span>
                        </button>
                        <div className="border-t border-pink-100"></div>
                        <button
                          onClick={deleteChat}
                          className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-red-50 transition text-sm text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Удалить чат</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-rose-400">
                      <p className="text-6xl mb-4">💌</p>
                      <p className="font-serif italic text-lg">Нет сообщений</p>
                      <p className="text-sm mt-2">Напишите первое сообщение!</p>
                    </div>
                  ) : (
                    groupedMessages.map((group, gi) => (
                      <div key={gi} className="space-y-3">
                        <div className="flex justify-center my-4">
                          <span className="px-4 py-1.5 bg-white/80 backdrop-blur rounded-full text-xs font-medium text-stone-500 shadow-sm border border-pink-200">
                            {group.date}
                          </span>
                        </div>
                        {group.messages.map((msg: any) => {
                          const isMine = msg.sender_id === uid;
                          return (
                            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"} group`}>
                              <div className={`max-w-[85%] md:max-w-[65%] relative ${msg._sending ? "opacity-60" : ""}`}>
                                <div className={`px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap break-words ${
                                  isMine
                                    ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-br-md"
                                    : "bg-white text-stone-800 border border-pink-200 rounded-bl-md"
                                }`}>
                                  {msg.text}
                                </div>
                                
                                <div className={`flex items-center gap-1.5 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                                  <span className={`text-[10px] ${isMine ? "text-rose-300" : "text-stone-400"}`}>
                                    {msg._sending ? "Отправка..." : 
                                      msg.created_at?.seconds
                                        ? new Date(msg.created_at.seconds * 1000).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
                                        : ""}
                                  </span>
                                  {isMine && !msg._sending && (
                                    msg.read ? <CheckCheck className="w-3.5 h-3.5 text-blue-400" /> : <Check className="w-3.5 h-3.5 text-rose-300" />
                                  )}
                                  
                                  {isMine && (
                                    <button onClick={() => deleteMessage(msg.id)} className="hidden group-hover:flex ml-2 text-rose-400 hover:text-rose-600 transition" title="Удалить">
                                      <span className="text-xs">🗑️</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}
                  
                  {typingUsers.length > 0 && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-pink-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                        <div className="flex gap-1.5">
                          <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }}></div>
                          <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-white border-t border-pink-200">
                  {showEmojiPicker && (
                    <div className="mb-3 p-3 bg-pink-50/50 rounded-xl border-2 border-pink-200 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">Смайлики</span>
                        <button onClick={() => setShowEmojiPicker(false)} className="text-rose-400 hover:text-rose-600 text-sm">✕ Закрыть</button>
                      </div>
                      <div className="grid grid-cols-10 gap-1">
                        {EMOJI_LIST.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => { setNewMessage(prev => prev + emoji); setShowEmojiPicker(false); }}
                            className="text-xl hover:bg-pink-200 rounded-lg p-1.5 transition flex items-center justify-center"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-end gap-2">
                    <button 
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                      className={`p-3 rounded-xl transition mb-0.5 ${showEmojiPicker ? 'bg-rose-100 text-rose-600' : 'text-rose-400 hover:bg-pink-100 hover:text-rose-600'}`}
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                    <div className="flex-1 bg-pink-50/50 border-2 border-pink-200 rounded-2xl flex items-end p-1 focus-within:ring-2 focus-within:ring-rose-500/20 focus-within:bg-white transition">
                      <textarea
                        value={newMessage}
                        onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder="Напишите сообщение... 💕"
                        rows={1}
                        className="flex-1 bg-transparent border-0 px-3 py-2.5 text-sm focus:ring-0 resize-none max-h-32"
                        style={{ minHeight: "44px" }}
                      />
                    </div>
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="bg-gradient-to-r from-pink-500 to-rose-500 text-white p-3 rounded-xl hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md shadow-rose-500/20 flex items-center justify-center"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-rose-400 bg-pink-50/30">
                <p className="text-7xl mb-4">💌</p>
                <p className="font-serif italic text-xl text-stone-600">Выберите чат</p>
                <p className="text-sm mt-2 text-stone-500">или создайте новый, чтобы начать общение</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowFeedback(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full shadow-lg shadow-rose-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
        title="Задать вопрос или сообщить о баге"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {showNewChat && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowNewChat(false); setSelectedContact(null); setNewChatSearchQuery(""); }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border-2 border-pink-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-pink-100 flex items-center justify-between bg-pink-50/50">
              <h2 className="font-serif font-bold text-stone-800 flex items-center gap-2"><span>💕</span> Новый чат</h2>
              <button onClick={() => setShowNewChat(false)} className="p-1 hover:bg-pink-200 rounded-full transition text-rose-500">✕</button>
            </div>
            
            <div className="p-4">
              <input
                type="text"
                value={newChatSearchQuery}
                onChange={(e) => setNewChatSearchQuery(e.target.value)}
                placeholder="🔍 Поиск контактов..."
                className="w-full bg-pink-50/50 border-2 border-pink-200 rounded-xl px-4 py-2.5 text-sm focus:border-rose-500 focus:outline-none mb-4 transition"
                autoFocus
              />
              
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar mb-4 pr-1">
                {filteredContacts.length === 0 ? (
                  <p className="text-rose-400 text-center py-4 font-serif italic">Контакты не найдены</p>
                ) : (
                  filteredContacts.map((contact: any) => (
                    <button
                      key={contact.id}
                      onClick={() => setSelectedContact(contact)}
                      className={`w-full text-left p-3 rounded-xl transition flex items-center gap-3 ${
                        selectedContact?.id === contact.id
                          ? "bg-gradient-to-r from-pink-100 to-rose-100 border-2 border-rose-400"
                          : "bg-pink-50/50 hover:bg-pink-100 border-2 border-transparent"
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {(contact.full_name || contact.email || "?")[0].toUpperCase()}
                        </div>
                        {isOnline(contact) && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"></div>}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-stone-800">{contact.full_name || contact.email}</p>
                        <p className="text-xs text-rose-500">
                          {contact.role === "tutor" ? "👨‍🏫 Репетитор" : contact.role === "student" ? "🎓 Ученик" : contact.role === "parent" ? "‍👩‍👧 Родитель" : contact.role}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setShowNewChat(false); setSelectedContact(null); setNewChatSearchQuery(""); }}
                  className="flex-1 py-2.5 bg-stone-100 text-stone-700 rounded-xl text-sm font-medium hover:bg-stone-200 transition"
                >
                  Отмена
                </button>
                <button
                  onClick={startChat}
                  disabled={!selectedContact}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white py-2.5 rounded-xl text-sm font-bold hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md shadow-rose-500/20"
                >
                  💕 Начать чат
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFeedback && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowFeedback(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border-2 border-pink-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-pink-100 flex items-center justify-between bg-pink-50/50">
              <h2 className="font-serif font-bold text-stone-800 flex items-center gap-2"><span>💡</span> Обратная связь</h2>
              <button onClick={() => setShowFeedback(false)} className="p-1 hover:bg-pink-200 rounded-full transition text-rose-500"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={submitFeedback} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-rose-500 uppercase tracking-wider mb-2">Тип обращения</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFeedbackType("question")}
                    className={`py-2.5 rounded-xl text-sm font-bold transition border-2 ${
                      feedbackType === "question" 
                        ? "bg-pink-100 border-rose-500 text-rose-700" 
                        : "bg-white border-pink-200 text-stone-600 hover:bg-pink-50"
                    }`}
                  >
                    ❓ Вопрос
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackType("bug")}
                    className={`py-2.5 rounded-xl text-sm font-bold transition border-2 ${
                      feedbackType === "bug" 
                        ? "bg-red-100 border-red-500 text-red-700" 
                        : "bg-white border-pink-200 text-stone-600 hover:bg-pink-50"
                    }`}
                  >
                    🐛 Баг
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-rose-500 uppercase tracking-wider mb-2">Описание</label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder={feedbackType === "question" ? "Опишите ваш вопрос подробно..." : "Что сломалось? Где и как это воспроизвести?"}
                  rows={4}
                  className="w-full bg-pink-50/50 border-2 border-pink-200 rounded-xl px-4 py-3 text-sm focus:border-rose-500 focus:outline-none transition resize-none"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={feedbackSending || !feedbackText.trim()}
                className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 rounded-xl text-sm font-bold hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md shadow-rose-500/20 flex items-center justify-center gap-2"
              >
                {feedbackSending ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Отправка...</>
                ) : (
                  "📤 Отправить"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {showUserInfo && otherContact && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowUserInfo(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm border-2 border-pink-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg mx-auto mb-4">
                {(otherContact.full_name || otherContact.email || "?")[0].toUpperCase()}
              </div>
              <h3 className="font-serif font-bold text-xl text-stone-800 mb-1">{otherContact.full_name || otherContact.email}</h3>
              <p className="text-rose-500 text-sm mb-4">
                {otherContact.role === "tutor" ? "👨‍🏫 Репетитор" : otherContact.role === "student" ? "🎓 Ученик" : otherContact.role === "parent" ? "👨‍👩‍ Родитель" : otherContact.role}
              </p>
              {otherContact.email && (
                <p className="text-stone-600 text-sm mb-2">📧 {otherContact.email}</p>
              )}
              <p className="text-stone-500 text-xs mb-4">
                {isOnline(otherContact) ? "🟢 Онлайн" : getLastSeen(selectedChat)}
              </p>
              <button
                onClick={() => setShowUserInfo(false)}
                className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-2.5 rounded-xl text-sm font-bold hover:from-pink-600 hover:to-rose-600 transition shadow-md shadow-rose-500/20"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #fda4af; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #f43f5e; }
      `}</style>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">💕</div>
          <p className="text-rose-600 font-serif italic">Загрузка...</p>
        </div>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}