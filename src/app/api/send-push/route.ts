import { NextResponse } from "next/server";
import webpush from "web-push";
import { getFirestore, doc, getDoc } from "firebase/firestore";
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

const vapidKeys = {
  publicKey: "BDw-nPE1HePfH4fa2FUT8QDHD4d0gln12ph8355h-BPX9P6p3JbW61s7UnE21HAVsYibmLE2ToevWcTuK6L4WtY",
  privateKey: "bz5R-xqVWRHmUXMJ4apDvx2LntsOhzm24nY2NCVOSBk",
};

webpush.setVapidDetails(
  "mailto:your-email@example.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export async function POST(request: Request) {
  try {
    const { userId, title, body, url } = await request.json();
    
    const subDoc = await getDoc(doc(db, "push_subscriptions", userId));
    if (!subDoc.exists()) return NextResponse.json({ error: "Нет подписки" });
    
    const subscription = subDoc.data().subscription;
    
    await webpush.sendNotification(subscription, JSON.stringify({ title, body, url }));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}