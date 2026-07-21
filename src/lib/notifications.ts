import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { initializeApp } from "firebase/app";

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

export type NotificationType = "homework" | "lesson" | "message" | "achievement" | "payment" | "system";

export async function sendNotification({
  userId,
  type,
  title,
  body,
  link,
}: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}) {
  try {
    await addDoc(collection(db, "notifications"), {
      user_id: userId,
      type,
      title,
      body,
      link: link || "",
      read: false,
      created_at: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Ошибка отправки уведомления:", error);
    return false;
  }
}