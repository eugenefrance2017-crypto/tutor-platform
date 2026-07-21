import { NextRequest, NextResponse } from "next/server";
import { getFirestore, doc, getDoc, updateDoc, addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { initializeApp, getApps, getApp } from "firebase/app";
import crypto from "crypto";

const firebaseConfig = {
  apiKey: "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4",
  authDomain: "tutor-platform-a5e37.firebaseapp.com",
  projectId: "tutor-platform-a5e37",
  storageBucket: "tutor-platform-a5e37.firebasestorage.app",
  messagingSenderId: "115123071384",
  appId: "1:115123071384:web:9517a29ed1fc2c46e163ed",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const settingsSnap = await getDoc(doc(db, "settings", "payments"));
    if (!settingsSnap.exists()) {
      return NextResponse.json({ error: "Settings not found" }, { status: 500 });
    }

    const settings = settingsSnap.data();
    const secretKey = settings.prodamus_secret_key;

    if (!secretKey) {
      return NextResponse.json({ error: "Secret key not configured" }, { status: 500 });
    }

    // Проверяем подпись
    const signString = `${body.merchant_id}:${body.order_id}:${body.amount}:${secretKey}`;
    const calculatedSign = crypto.createHash("sha256").update(signString).digest("hex");

    if (body.sign !== calculatedSign) {
      console.error("Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    if (body.status !== "success") {
      return NextResponse.json({ message: "Payment not successful" }, { status: 200 });
    }

    const paymentsQuery = query(
      collection(db, "prodamus_payments"),
      where("order_id", "==", body.order_id)
    );
    const paymentsSnap = await getDocs(paymentsQuery);

    if (paymentsSnap.empty) {
      console.error("Payment not found:", body.order_id);
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const paymentDoc = paymentsSnap.docs[0];
    const paymentData = paymentDoc.data();

    await updateDoc(doc(db, "prodamus_payments", paymentDoc.id), {
      status: "paid",
      paid_at: new Date().toISOString(),
    });

    await addDoc(collection(db, "payments"), {
      tutor_id: paymentData.tutor_id,
      student_id: paymentData.student_id,
      student_name: paymentData.description || "Оплата через Prodamus",
      amount: parseFloat(body.amount),
      lessons: 1,
      tariff: "Оплата через Prodamus",
      comment: "Оплачено через Prodamus",
      confirmed: true,
      confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    if (paymentData.student_id) {
      const studentSnap = await getDoc(doc(db, "profiles", paymentData.student_id));
      if (studentSnap.exists()) {
        const currentPaid = studentSnap.data().paid_lessons || 0;
        await updateDoc(doc(db, "profiles", paymentData.student_id), {
          paid_lessons: currentPaid + 1,
        });
      }
    }

    console.log("✅ Prodamus payment confirmed:", body.order_id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Prodamus webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}