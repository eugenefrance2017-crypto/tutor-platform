"use client";

import { useState, useEffect } from "react";

export default function PushNotifications({ uid }: { uid: string }) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setSupported(false);
      return;
    }
    setSupported(true);
    setPermission(Notification.permission);
  }, []);

  async function requestPermission() {
    if (!supported) {
      alert("Ваш браузер не поддерживает уведомления");
      return;
    }

    try {
      const sw = await navigator.serviceWorker.ready;
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      
      if (permissionResult === "granted") {
        const subscription = await sw.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
  "BDw-nPE1HePfH4fa2FUT8QDHD4d0gln12ph8355h-BPX9P6p3JbW61s7UnE21HAVsYibmLE2ToevWcTuK6L4WtY"
),
        });
        
        // Сохраняем подписку в Firestore
        await fetch("/api/save-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription, userId: uid }),
        });
        
        alert("Уведомления включены!");
      }
    } catch (error) {
      console.error("Ошибка подписки:", error);
    }
  }

  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  if (!supported) return null;

  return (
    <button
      onClick={requestPermission}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
        permission === "granted"
          ? "bg-emerald-100 text-emerald-700"
          : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
      }`}
    >
      {permission === "granted" ? "🔔 Уведомления включены" : "🔔 Включить уведомления"}
    </button>
  );
}