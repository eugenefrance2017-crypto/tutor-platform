"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, where, onSnapshot, doc, getDoc, updateDoc, serverTimestamp, deleteDoc, orderBy, limit } from "firebase/firestore";
import toast from "react-hot-toast";

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

const EMOJI_LIST = ["😊", "😂", "❤️", "👍", "🎉", "🔥", "💯", "✨", "🌟", "💕", "👋", "🙏", "😍", "🤔", "😎", "🥳"];

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [showMobileChat, setShowMobileChat] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Обновление last_seen для статуса онлайн
  useEffect(() => {
    if (!uid) return;
    const updateLastSeen = async () => {
      try {
        await updateDoc(doc(db, "profiles", uid), { last_seen: serverTimestamp() });
      } catch (e) {}
    };
    updateLastSeen();
    const interval = setInterval(updateLastSeen, 60000);
    return () => clearInterval(interval);
  }, [uid]);

  // Загрузка профиля
  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    getDoc(doc(db, "profiles", uid)).then((snap) => {
      if (snap.exists()) setProfile(snap.data());
    });
  }, [uid]);

  // Загрузка чатов
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

  // Загрузка контактов (после загрузки профиля)
  useEffect(() => {
    if (!uid || !profile) return;
    loadContacts();
  }, [uid, profile]);

  // Загрузка сообщений для выбранного чата
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }
    
    const q = query(
      collection(db, "messages"),
      where("chat_id", "==", selectedChat.id),
      orderBy("created_at", "asc")
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      
      // Помечаем как прочитанные
      msgs.filter(m => m.sender_id !== uid && !m.read).forEach(m => {
        updateDoc(doc(db, "messages", m.id), { read: true }).catch(() => {});
      });
      
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    return () => unsub();
  }, [selectedChat, uid]);

  // Подписка на "печатает"
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

  // Подсчёт непрочитанных
  useEffect(() => {
    if (!uid || chats.length === 0) return;
    const counts: Record<string, number> = {};
    
    chats.forEach(chat => {
      const q = query(
        collection(db, "messages"),
        where("chat_id", "==", chat.id),
        where("sender_id", "!=", uid),
        where("read", "==", false)
      );
      
      const unsub = onSnapshot(q, (snap) => {
        counts[chat.id] = snap.size;
        setUnreadCounts({ ...counts });
      });
      
      return unsub;
    });
  }, [chats, uid]);

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
          if (tutorSnap.exists()) {
            setContacts([{ id: profile.tutor_id, ...tutorSnap.data() }]);
          }
        } else if (profile?.child_id && role === "parent") {
          const childSnap = await getDoc(doc(db, "profiles", profile.child_id));
          if (childSnap.exists()) {
            const childData = childSnap.data();
            if (childData?.tutor_id) {
              const tutorSnap = await getDoc(doc(db, "profiles", childData.tutor_id));
              if (tutorSnap.exists()) {
                setContacts([{ id: childData.tutor_id, ...tutorSnap.data() }]);
              }
            }
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
      participant_names: {
        [uid]: profile?.full_name || "Я",
        [selectedContact.id]: selectedContact.full_name || selectedContact.email || "Собеседник",
      },
    });
    
    setShowNewChat(false);
    setSelectedContact(null);
    setShowMobileChat(true);
    toast.success("💕 Чат создан!");
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedChat) return;
    
    const message = newMessage.trim();
    setNewMessage("");
    setShowEmojiPicker(false);
    
    // Убираем статус "печатает"
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    updateDoc(doc(db, "profiles", uid), { typing_in: null }).catch(() => {});
    
    const tempId = "temp-" + Date.now();
    const tempMsg = {
      id: tempId,
      chat_id: selectedChat.id,
      sender_id: uid,
      sender_name: profile?.full_name || "Пользователь",
      text: message,
      created_at: { seconds: Date.now() / 1000 },
      read: false,
      _sending: true,
    };
    
    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    
    try {
      const docRef = await addDoc(collection(db, "messages"), {
        chat_id: selectedChat.id,
        sender_id: uid,
        sender_name: profile?.full_name || "Пользователь",
        text: message,
        created_at: serverTimestamp(),
        read: false,
      });
      
      setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, id: docRef.id, _sending: false } : m));
      
      await updateDoc(doc(db, "chats", selectedChat.id), {
        last_message: message.length > 50 ? message.slice(0, 50) + "..." : message,
        last_message_time: serverTimestamp(),
      });
    } catch (error: any) {
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

  async function addReaction(msgId: string, emoji: string) {
    try {
      const msgRef = doc(db, "messages", msgId);
      await updateDoc(msgRef, {
        [`reactions.${uid}`]: emoji,
      });
    } catch (error) {
      toast.error("Ошибка");
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
    switch (contact.role) {
      case "tutor": return "👨‍🏫 Репетитор";
      case "student": return "🎓 Ученик";
      case "parent": return "👨‍👩‍👧 Родитель";
      default: return "";
    }
  }

  function isOnline(contact: any) {
    if (!contact?.last_seen?.seconds) return false;
    const lastSeen = new Date(contact.last_seen.seconds * 1000);
    const now = new Date();
    return now.getTime() - lastSeen.getTime() < 120000; // 2 минуты
  }

  function getLastSeen(chat: any) {
    const otherId = chat.participants?.find((p: string) => p !== uid);
    const contact = contacts.find((c: any) => c.id === otherId);
    if (!contact?.last_seen?.seconds) return "";
    
    if (isOnline(contact)) return "онлайн";
    
    const lastSeen = new Date(contact.last_seen.seconds * 1000);
    const now = new Date();
    const diff = now.getTime() - lastSeen.getTime();
    
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
    return lastSeen.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
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
    const name = getOtherParticipant(chat).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const groupedMessages = groupMessagesByDate(messages);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4 animate-pulse">💕</div>
        <p className="text-pink-600 font-serif italic">Загрузка...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 relative overflow-hidden">
      {/* Фоновые элементы Lover */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-10 left-10 text-8xl">💕</div>
        <div className="absolute bottom-20 right-10 text-7xl">🌸</div>
        <div className="absolute top-1/3 right-1/4 text-6xl">💝</div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 relative z-10">
        {/* Заголовок */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-4xl">💕</span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 bg-clip-text text-transparent">
              Чат
            </h1>
            <span className="text-4xl">💌</span>
          </div>
          <p className="text-rose-600/70 font-serif italic text-sm">
            "Can I go where you go?" 💝
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-3xl shadow-xl border-2 border-pink-200 overflow-hidden" style={{ height: "calc(100vh - 180px)" }}>
          <div className="grid grid-cols-1 md:grid-cols-3 h-full">
            {/* Список чатов */}
            <div className={`md:col-span-1 border-r border-pink-200 overflow-y-auto ${showMobileChat ? 'hidden md:block' : 'block'}`}>
              {/* Поиск и кнопка нового чата */}
              <div className="p-3 border-b border-pink-100 bg-pink-50/50">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 Поиск..."
                  className="w-full border-2 border-pink-200 rounded-xl px-3 py-2 text-sm bg-white focus:border-pink-500 focus:outline-none mb-2"
                />
                <button
                  onClick={() => setShowNewChat(true)}
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-2 rounded-xl text-sm font-medium hover:from-pink-600 hover:to-rose-600 transition shadow-md"
                >
                  💕 Новый чат
                </button>
              </div>

              {filteredChats.length === 0 ? (
                <div className="p-8 text-center text-rose-400">
                  <p className="text-4xl mb-2">💌</p>
                  <p className="font-serif italic">Нет чатов</p>
                  <p className="text-xs mt-1">Нажмите "Новый чат"</p>
                </div>
              ) : (
                filteredChats.map((chat: any) => {
                  const unread = unreadCounts[chat.id] || 0;
                  return (
                    <button
                      key={chat.id}
                      onClick={() => { setSelectedChat(chat); setShowMobileChat(true); }}
                      className={`w-full text-left p-4 border-b border-pink-100 hover:bg-pink-50/50 transition ${
                        selectedChat?.id === chat.id ? "bg-gradient-to-r from-pink-100 to-rose-100 border-l-4 border-l-pink-500" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                            {getOtherParticipant(chat)[0]}
                          </div>
                          {isOnline(contacts.find(c => c.id === chat.participants?.find((p: string) => p !== uid))) && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-serif font-bold text-sm text-stone-800 truncate">{getOtherParticipant(chat)}</p>
                            {chat.last_message_time?.seconds && (
                              <span className="text-xs text-rose-400 flex-shrink-0 ml-2">
                                {new Date(chat.last_message_time.seconds * 1000).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-rose-500">{getOtherRole(chat)}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-stone-500 truncate flex-1">{chat.last_message || "Нет сообщений"}</p>
                            {unread > 0 && (
                              <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold rounded-full">
                                {unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Окно сообщений */}
            <div className={`md:col-span-2 flex flex-col h-full ${showMobileChat ? 'block' : 'hidden md:flex'}`}>
              {selectedChat ? (
                <>
                  {/* Шапка чата */}
                  <div className="p-4 border-b border-pink-200 flex items-center gap-3 bg-gradient-to-r from-pink-50 to-rose-50">
                    <button
                      onClick={() => setShowMobileChat(false)}
                      className="md:hidden text-pink-600 hover:text-pink-800 text-xl"
                    >
                      ←
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                      {getOtherParticipant(selectedChat)[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-serif font-bold text-sm text-stone-800">{getOtherParticipant(selectedChat)}</p>
                      <p className="text-xs text-rose-500">{getLastSeen(selectedChat)}</p>
                    </div>
                  </div>

                  {/* Сообщения */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-pink-50/30 to-rose-50/30">
                    {messages.length === 0 ? (
                      <div className="text-center text-rose-400 py-16">
                        <p className="text-6xl mb-4">💌</p>
                        <p className="font-serif italic text-lg">Нет сообщений</p>
                        <p className="text-sm mt-2">Напишите первое сообщение!</p>
                      </div>
                    ) : (
                      groupedMessages.map((group, gi) => (
                        <div key={gi}>
                          <div className="text-center my-4">
                            <span className="px-3 py-1 bg-white/80 rounded-full text-xs text-stone-500 font-medium">
                              {group.date}
                            </span>
                          </div>
                          <div className="space-y-3">
                            {group.messages.map((msg: any) => {
                              const isMine = msg.sender_id === uid;
                              const reactions = msg.reactions || {};
                              const reactionCounts: Record<string, number> = {};
                              Object.values(reactions).forEach((emoji: any) => {
                                reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
                              });
                              
                              return (
                                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"} group`}>
                                  <div className={`max-w-[75%] relative ${msg._sending ? "opacity-50" : ""}`}>
                                    <div className={`px-4 py-2.5 rounded-2xl ${
                                      isMine
                                        ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-br-md shadow-md"
                                        : "bg-white text-stone-800 rounded-bl-md shadow-md border border-pink-200"
                                    }`}>
                                      <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                                    </div>
                                    
                                    {/* Реакции */}
                                    {Object.keys(reactionCounts).length > 0 && (
                                      <div className="flex gap-1 mt-1">
                                        {Object.entries(reactionCounts).map(([emoji, count]) => (
                                          <span key={emoji} className="px-2 py-0.5 bg-white rounded-full text-xs border border-pink-200">
                                            {emoji} {count}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    
                                    <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : "justify-start"}`}>
                                      <span className="text-xs text-rose-400">
                                        {msg._sending ? "Отправка..." : 
                                          msg.created_at?.seconds
                                            ? new Date(msg.created_at.seconds * 1000).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
                                            : ""}
                                      </span>
                                      {isMine && !msg._sending && (
                                        <span className="text-xs">{msg.read ? "✓✓" : "✓"}</span>
                                      )}
                                      
                                      {/* Кнопки действий */}
                                      {isMine && (
                                        <div className="hidden group-hover:flex gap-1 ml-2">
                                          <button
                                            onClick={() => deleteMessage(msg.id)}
                                            className="text-xs text-rose-400 hover:text-rose-600"
                                            title="Удалить"
                                          >
                                            🗑️
                                          </button>
                                        </div>
                                      )}
                                      
                                      {!isMine && (
                                        <div className="hidden group-hover:flex gap-1 ml-2">
                                          {["👍", "❤️", "😂"].map(emoji => (
                                            <button
                                              key={emoji}
                                              onClick={() => addReaction(msg.id, emoji)}
                                              className="text-xs hover:scale-125 transition"
                                            >
                                              {emoji}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                    
                    {/* Индикатор "печатает" */}
                    {typingUsers.length > 0 && (
                      <div className="flex justify-start">
                        <div className="bg-white rounded-2xl rounded-bl-md px-4 py-2.5 shadow-md border border-pink-200">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                            <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Поле ввода */}
                  <div className="p-4 border-t border-pink-200 bg-white">
                    {/* Эмодзи пикер */}
                    {showEmojiPicker && (
                      <div className="mb-2 p-3 bg-pink-50 rounded-xl border border-pink-200">
                        <div className="flex flex-wrap gap-2">
                          {EMOJI_LIST.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => { setNewMessage(prev => prev + emoji); setShowEmojiPicker(false); }}
                              className="text-2xl hover:scale-125 transition"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="text-2xl hover:scale-110 transition"
                      >
                        😊
                      </button>
                      <input
                        value={newMessage}
                        onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder="Напишите сообщение... 💕"
                        className="flex-1 border-2 border-pink-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-pink-500 transition bg-pink-50/50"
                        autoFocus
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 transition shadow-md"
                      >
                        📤
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-rose-400">
                    <p className="text-7xl mb-4">💌</p>
                    <p className="font-serif italic text-xl">Выберите чат</p>
                    <p className="text-sm mt-2">или создайте новый</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Модальное окно нового чата */}
        {showNewChat && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowNewChat(false); setSelectedContact(null); }}>
            <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md border-2 border-pink-200" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-serif font-bold text-stone-800 mb-4 flex items-center gap-2">
                <span>💕</span> Новый чат
              </h2>
              
              <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                {contacts.length === 0 ? (
                  <p className="text-rose-400 text-center py-4 font-serif italic">Нет доступных контактов</p>
                ) : (
                  contacts.map((contact: any) => (
                    <button
                      key={contact.id}
                      onClick={() => setSelectedContact(contact)}
                      className={`w-full text-left p-3 rounded-xl transition flex items-center gap-3 ${
                        selectedContact?.id === contact.id
                          ? "bg-gradient-to-r from-pink-100 to-rose-100 border-2 border-pink-400"
                          : "bg-pink-50/50 hover:bg-pink-100 border-2 border-transparent"
                      }`}
                    >
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {(contact.full_name || contact.email || "?")[0]}
                        </div>
                        {isOnline(contact) && (
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-stone-800">{contact.full_name || contact.email}</p>
                        <p className="text-xs text-rose-500">
                          {contact.role === "tutor" ? "👨‍🏫 Репетитор" : contact.role === "student" ? "🎓 Ученик" : contact.role === "parent" ? "👨‍👩‍👧 Родитель" : contact.role}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={startChat}
                  disabled={!selectedContact}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white py-2.5 rounded-xl text-sm font-medium hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 transition shadow-md"
                >
                  💕 Начать чат
                </button>
                <button
                  onClick={() => { setShowNewChat(false); setSelectedContact(null); }}
                  className="px-4 py-2.5 bg-stone-200 text-stone-700 rounded-xl text-sm hover:bg-stone-300 transition"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">💕</div>
          <p className="text-pink-600 font-serif italic">Загрузка...</p>
        </div>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}