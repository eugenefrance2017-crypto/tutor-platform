import { initializeApp } from "firebase/app";
import { getAuth, signOut } from "firebase/auth";
import { type NextRequest, NextResponse } from "next/server";

const firebaseConfig = {
  apiKey: "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4",
  authDomain: "tutor-platform-a5e37.firebaseapp.com",
  projectId: "tutor-platform-a5e37",
  storageBucket: "tutor-platform-a5e37.firebasestorage.app",
  messagingSenderId: "115123071384",
  appId: "1:115123071384:web:9517a29ed1fc2c46e163ed",
};

const app = initializeApp(firebaseConfig, "signout");
const auth = getAuth(app);

export async function POST(req: NextRequest) {
  try { await signOut(auth); } catch (e) {}
  return NextResponse.redirect(new URL("/login", req.url), { status: 302 });
}