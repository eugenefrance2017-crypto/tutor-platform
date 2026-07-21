"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface NotificationBellProps {
  uid: string;
  role: string;
  isDark: boolean;
}

export default function NotificationBell({ uid, role, isDark }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!uid) return;
    
    const q = query(
      collection(db, "notifications"),
      where("user_id", "==", uid),
      where("read", "==", false)
    );
    
    const unsub = onSnapshot(q, (snap) => {
      setUnreadCount(snap.size);
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    return () => unsub();
  }, [uid]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (e) {}
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-full transition ${
          isDark 
            ? 'hover:bg-yellow-500/10 text-yellow-400' 
            : 'hover:bg-pink-100 text-pink-600'
        }`}
        title="Уведомления"
      >
        <span className="text-2xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Оверлей для закрытия при клике вне */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className={`fixed right-4 top-20 w-80 rounded-2xl shadow-2xl border overflow-hidden z-50 ${
            isDark ? 'bg-gray-900 border-yellow-500/30' : 'bg-white border-pink-200'
          }`}>
            <div className={`p-4 border-b ${isDark ? 'border-yellow-500/30' : 'border-pink-200'}`}>
              <h3 className={`font-bold ${isDark ? 'text-yellow-400' : 'text-pink-600'}`}>
                Уведомления {unreadCount > 0 && `(${unreadCount})`}
              </h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className={`p-4 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Нет новых уведомлений
                </p>
              ) : (
                notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    onClick={() => markAsRead(notif.id)}
                    className={`p-3 border-b cursor-pointer transition ${
                      isDark 
                        ? 'border-gray-800 hover:bg-gray-800' 
                        : 'border-pink-100 hover:bg-pink-50'
                    }`}
                  >
                    <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {notif.title}
                    </p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {notif.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}