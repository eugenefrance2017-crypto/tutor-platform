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
    const { amount, orderId, description, studentId, tutorId, payment_type, item_id, duration_days } = body;

    if (!amount || !orderId || !studentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

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

    const shopId = process.env.ENOT_MERCHANT_ID;
    const secretKey = process.env.ENOT_SECRET_KEY;

    if (!shopId || !secretKey) {
      throw new Error('Enot.io credentials not configured');
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://jenyawisch.com';
    
    const enotData = {
      amount: parseFloat(amount),
      order_id: orderId,
      currency: 'RUB',
      shop_id: shopId,
      comment: description || 'Оплата на платформе',
      success_url: `${baseUrl}/payments/success?order_id=${orderId}`,
      fail_url: `${baseUrl}/payments/failed?order_id=${orderId}`,
      hook_url: `${baseUrl}/api/payments/enot/webhook`,
      custom_fields: JSON.stringify({ studentId, payment_type, item_id, duration_days }),
    };

    const enotResponse = await fetch('https://api.enot.io/invoice/create', {
      method: 'POST',
      headers: { 
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': secretKey,
      },
      body: JSON.stringify(enotData),
    });

    // ✅ УЛУЧШЕННАЯ ОБРАБОТКА ОШИБОК: покажем точный текст от Enot.io
    if (!enotResponse.ok) {
      const errorData = await enotResponse.json().catch(() => ({ error: await enotResponse.text() }));
      console.error('❌ Детали ошибки Enot.io:', errorData);
      
      const errorMsg = errorData.error || errorData.message || JSON.stringify(errorData);
      throw new Error(`Enot.io (${enotResponse.status}): ${errorMsg}`);
    }

    const enotResult = await enotResponse.json();

    if (!enotResult.data || !enotResult.data.url) {
      throw new Error(enotResult.error || 'Не удалось получить ссылку на оплату');
    }

    return NextResponse.json({
      success: true,
      url: enotResult.data.url,
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