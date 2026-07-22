import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import crypto from 'crypto';

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

    if (!amount || !orderId || !studentId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 1. Сохраняем платеж в базе как "pending"
    await addDoc(collection(db, 'payments'), {
      order_id: orderId,
      amount: parseFloat(amount),
      student_id: studentId,
      tutor_id: tutorId || null,
      payment_type: payment_type || 'subscription',
      item_id: item_id || 'pricing_page',
      duration_days: duration_days || 30,
      status: 'pending',
      created_at: new Date().toISOString(),
      description: description || 'Оплата через Enot.io',
      provider: 'enot',
    });

    const merchantId = process.env.ENOT_MERCHANT_ID;
    const secretKey = process.env.ENOT_SECRET_KEY;

    if (!merchantId || !secretKey) {
      throw new Error('Enot.io credentials not configured');
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://jenyawisch.com';
    
    // 2. Формируем подпись (MD5 от amount:orderid:secretkey:currency)
    const signString = `${amount}:${orderId}:${secretKey}:RUB`;
    const signature = crypto
      .createHash('md5')
      .update(signString)
      .digest('hex');

    // 3. Данные для Enot.io
    const enotData = {
      m_shop: merchantId,
      m_orderid: orderId,
      m_amount: amount,
      m_curr: 'RUB',
      m_desc: Buffer.from(description || 'Оплата на платформе').toString('base64'),
      m_sign: signature,
      m_url: `${baseUrl}/payments/success?order_id=${orderId}`,
      m_fail_url: `${baseUrl}/payments/failed?order_id=${orderId}`,
      m_notify_url: `${baseUrl}/api/payments/enot/webhook`,
    };

    // ✅ ИСПРАВЛЕНО: Правильный URL для создания счета в Enot.io
    const enotResponse = await fetch('https://enot.io/merchant/api/invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enotData),
    });

    // 4. Проверяем, что ответ именно JSON, а не HTML-ошибка
    const contentType = enotResponse.headers.get('content-type');
    if (!enotResponse.ok || !contentType?.includes('application/json')) {
      const errorText = await enotResponse.text();
      console.error('Enot.io error:', errorText);
      throw new Error(`Enot.io вернул ошибку: ${enotResponse.status}`);
    }

    const enotResult = await enotResponse.json();

    if (!enotResult.url) {
      throw new Error(enotResult.message || 'Не удалось получить ссылку на оплату');
    }

    return NextResponse.json({
      success: true,
      url: enotResult.url,
      orderId: orderId,
    });

  } catch (error: any) {
    console.error('❌ Ошибка создания платежа:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment' },
      { status: 500 }
    );
  }
}