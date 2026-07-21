import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

const PRODAMUS_SHOP_ID = process.env.PRODAMUS_SHOP_ID || '';
const PRODAMUS_SECRET_KEY = process.env.PRODAMUS_SECRET_KEY || '';
const PRODAMUS_API_URL = 'https://api.prodamus.ru/payment';

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
      duration_days
    } = body;

    // 1. Создаём запись о платеже
    const paymentRef = await addDoc(collection(db, 'payments'), {
      order_id: orderId,
      amount: amount,
      student_id: studentId,
      tutor_id: tutorId,
      payment_type: payment_type,
      item_id: item_id,
      duration_days: duration_days || 30,
      status: 'pending',
      created_at: new Date().toISOString(),
      provider: 'prodamus',
      description: description
    });

    // 2. Формируем запрос к Prodamus API
    const signature = generateProdamusSignature(orderId, amount);
    
    const prodamusRequest = {
      shop_id: PRODAMUS_SHOP_ID,
      order_id: orderId,
      amount: amount,
      currency: 'RUB',
      desc: description,
      sign: signature,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments/success?order_id=${orderId}`,
      fail_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments/failed?order_id=${orderId}`,
      webhook_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payments/prodamus/webhook`
    };

    // 3. Отправляем запрос
    const response = await fetch(PRODAMUS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(prodamusRequest)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Ошибка создания платежа');
    }

    return NextResponse.json({
      success: true,
      url: data.url,
      payment_id: paymentRef.id
    });

  } catch (error: any) {
    console.error('Ошибка создания платежа Prodamus:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

function generateProdamusSignature(orderId: string, amount: number): string {
  const data = `${PRODAMUS_SHOP_ID}:${amount}:${orderId}:${PRODAMUS_SECRET_KEY}`;
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(data).digest('hex');
}