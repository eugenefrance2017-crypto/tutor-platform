import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      amount,
      orderId,
      description,
      studentId,
      tutorId,
      payment_type,
      item_id,
      duration_days,
    } = body;

    // Проверка обязательных полей
    if (!amount || !orderId || !studentId) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, orderId, studentId' },
        { status: 400 }
      );
    }

    // Создаём запись в Firestore с защитой от undefined
    const paymentRef = await addDoc(collection(db, 'payments'), {
      order_id: orderId,
      amount: parseFloat(amount),
      student_id: studentId,
      tutor_id: tutorId || null,  // ← ИСПРАВЛЕНО: null вместо undefined
      payment_type: payment_type || 'subscription',  // ← ИСПРАВЛЕНО: дефолтное значение
      item_id: item_id || 'pricing_page',  // ← ИСПРАВЛЕНО: дефолтное значение
      duration_days: duration_days || 30,  // ← ИСПРАВЛЕНО: дефолтное значение
      status: 'pending',
      created_at: new Date().toISOString(),
      description: description || 'Оплата через Lava',
    });

    // Генерируем URL для Lava
    const successUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://jenyawisch.com'}/payments/success?order_id=${orderId}`;
    const failUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://jenyawisch.com'}/payments/failed?order_id=${orderId}`;
    
    // Параметры для Lava API
    const lavaData = {
      shopId: process.env.LAVA_SHOP_ID,
      orderId: orderId,
      amount: amount,
      currency: 'RUB',
      description: description || 'Оплата на платформе',
      successUrl: successUrl,
      failUrl: failUrl,
      webhookUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://jenyawisch.com'}/api/payments/lava/webhook`,
    };

    // Создаём подпись (signature) для Lava
    const signatureString = `${lavaData.shopId}|${lavaData.amount}|${lavaData.orderId}|${process.env.LAVA_SECRET_KEY}`;
    const signature = require('crypto')
      .createHash('sha256')
      .update(signatureString)
      .digest('hex');

    lavaData.signature = signature;

    // Отправляем запрос в Lava
    const lavaResponse = await fetch('https://api.lava.ru/payment/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lavaData),
    });

    const lavaDataResponse = await lavaResponse.json();

    if (!lavaResponse.ok) {
      throw new Error(`Lava API error: ${lavaDataResponse.message || 'Unknown error'}`);
    }

    return NextResponse.json({
      success: true,
      url: lavaDataResponse.url,
      orderId: orderId,
    });

  } catch (error: any) {
    console.error('Ошибка создания платежа:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment' },
      { status: 500 }
    );
  }
}