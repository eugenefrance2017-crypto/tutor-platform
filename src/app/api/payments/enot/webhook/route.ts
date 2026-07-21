import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, doc, updateDoc, query, where, getDocs, setDoc } from 'firebase/firestore';
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
      merchant_id,
      order_id,
      amount,
      currency,
      custom,
      sign,
      status,
    } = body;

    const secretKey = process.env.ENOT_SECRET_KEY;
    const secondKey = process.env.ENOT_SECOND_KEY || secretKey;

    if (!secretKey) {
      throw new Error('Enot.io secret key not configured');
    }

    // Проверяем подпись вебхука
    // Формат для проверки: merchant_id:amount:order_id:status:merchant_secret_key
    const signString = `${merchant_id}:${amount}:${order_id}:${status}:${secretKey}`;
    const expectedSign = crypto
      .createHash('sha256')
      .update(signString)
      .digest('hex');

    if (sign !== expectedSign) {
      console.error('Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Находим платёж в базе
    const paymentsQuery = query(
      collection(db, 'payments'),
      where('order_id', '==', order_id)
    );
    const paymentsSnap = await getDocs(paymentsQuery);

    if (paymentsSnap.empty) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const paymentDoc = paymentsSnap.docs[0];
    const paymentData = paymentDoc.data();

    // Обновляем статус платежа
    await updateDoc(paymentDoc.ref, {
      status: status === 'success' ? 'success' : 'failed',
      paid_at: new Date().toISOString(),
    });

    // Обрабатываем успешную оплату
    if (status === 'success') {
      if (paymentData.payment_type === 'subscription') {
        // Активируем подписку на курс
        const subscriptionId = `${paymentData.student_id}_${paymentData.item_id}`;
        await setDoc(doc(db, 'course_subscriptions', subscriptionId), {
          student_id: paymentData.student_id,
          course_id: paymentData.item_id,
          started_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + (paymentData.duration_days || 30) * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          payment_id: order_id,
          provider: 'enot',
        });
      } else if (paymentData.payment_type === 'lesson_pack') {
        // Пополняем баланс уроков
        const balanceRef = doc(db, 'lesson_balances', paymentData.student_id);
        const currentBalance = (await getDocs(query(collection(db, 'lesson_balances'), where('__name__', '==', paymentData.student_id)))).docs[0]?.data().remaining || 0;
        
        await setDoc(balanceRef, {
          remaining: (paymentData.duration_days || 1) + currentBalance,
          last_updated: new Date().toISOString(),
        }, { merge: true });
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}