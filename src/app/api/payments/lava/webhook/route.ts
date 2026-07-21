import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';

const LAVA_SECRET_KEY = process.env.LAVA_SECRET_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 1. Проверяем подпись webhook
    const isValid = verifyWebhookSignature(body);
    if (!isValid) {
      console.error('Неверная подпись webhook');
      return new NextResponse('Invalid signature', { status: 400 });
    }

    const { 
      order_id, 
      status, 
      amount,
      metadata 
    } = body;

    // 2. Находим платёж в базе
    const paymentsQuery = query(
      collection(db, 'payments'),
      where('order_id', '==', order_id)
    );
    const paymentsSnap = await getDocs(paymentsQuery);
    
    if (paymentsSnap.empty) {
      console.error('Платёж не найден:', order_id);
      return new NextResponse('Payment not found', { status: 404 });
    }

    const paymentDoc = paymentsSnap.docs[0];
    const paymentData = paymentDoc.data();

    // 3. Обновляем статус платежа
    await updateDoc(paymentDoc.ref, {
      status: status,
      paid_at: new Date().toISOString()
    });

    // 4. Обрабатываем успешную оплату
    if (status === 'success') {
      if (paymentData.payment_type === 'course') {
        // 📚 КУРС - открываем доступ на N дней
        await handleCourseSubscription(paymentData);
      } else if (paymentData.payment_type === 'lesson_pack') {
        // 📦 ПАКЕТ УРОКОВ - пополняем баланс
        await handleLessonPack(paymentData);
      }
    }

    return new NextResponse('OK', { status: 200 });

  } catch (error: any) {
    console.error('Ошибка обработки webhook:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

// Обработка подписки на курс
async function handleCourseSubscription(paymentData: any) {
  const { student_id, tutor_id, item_id: courseId, duration_days } = paymentData;
  
  const subscriptionId = `${student_id}_${courseId}`;
  const subscriptionRef = doc(db, 'course_subscriptions', subscriptionId);
  
  // Проверяем, есть ли уже подписка
  const existingSub = await getDoc(subscriptionRef);
  
  let expiresAt: Date;
  
  if (existingSub.exists() && existingSub.data().status === 'active') {
    // Продлеваем существующую подписку
    const currentExpires = new Date(existingSub.data().expires_at);
    expiresAt = new Date(currentExpires.getTime() + duration_days * 24 * 60 * 60 * 1000);
  } else {
    // Новая подписка
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration_days);
  }

  // Создаём/обновляем подписку
  await setDoc(subscriptionRef, {
    student_id: student_id,
    tutor_id: tutor_id,
    course_id: courseId,
    monthly_price: paymentData.amount,
    started_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
    status: 'active',
    auto_renew: false,
    payment_id: paymentData.order_id,
    updated_at: new Date().toISOString()
  });

  // Также создаём запись в course_progress для совместимости
  const progressQuery = query(
    collection(db, 'course_progress'),
    where('course_id', '==', courseId),
    where('student_id', '==', student_id)
  );
  const progressSnap = await getDocs(progressQuery);
  
  if (progressSnap.empty) {
    await addDoc(collection(db, 'course_progress'), {
      course_id: courseId,
      student_id: student_id,
      payment_status: 'paid',
      access_type: 'subscription',
      subscription_expires_at: expiresAt.toISOString(),
      status: 'active',
      completed_lessons: [],
      notes: {},
      bookmarks: [],
      time_spent: 0,
      assigned_at: new Date().toISOString()
    });
  } else {
    // Обновляем существующую запись
    await updateDoc(progressSnap.docs[0].ref, {
      payment_status: 'paid',
      access_type: 'subscription',
      subscription_expires_at: expiresAt.toISOString(),
      status: 'active'
    });
  }

  console.log(`✅ Подписка на курс ${courseId} активирована до ${expiresAt.toISOString()}`);
}

// Обработка пакета уроков
async function handleLessonPack(paymentData: any) {
  const { student_id, item_id: packId, amount } = paymentData;
  
  // Получаем информацию о пакете
  const packRef = doc(db, 'lesson_packs', packId);
  const packSnap = await getDoc(packRef);
  
  if (!packSnap.exists()) {
    console.error('Пакет не найден:', packId);
    return;
  }
  
  const packData = packSnap.data();
  const lessonsCount = packData.lessons_count;
  
  // Обновляем баланс уроков пользователя
  const balanceRef = doc(db, 'user_lesson_balance', student_id);
  const balanceSnap = await getDoc(balanceRef);
  
  if (balanceSnap.exists()) {
    // Увеличиваем баланс
    await updateDoc(balanceRef, {
      total_purchased: balanceSnap.data().total_purchased + lessonsCount,
      remaining: balanceSnap.data().remaining + lessonsCount,
      last_updated: new Date().toISOString(),
      packs: [
        ...balanceSnap.data().packs,
        {
          pack_id: packId,
          lessons_count: lessonsCount,
          purchased_at: new Date().toISOString(),
          used: 0,
          remaining: lessonsCount
        }
      ]
    });
  } else {
    // Создаём новый баланс
    await setDoc(balanceRef, {
      student_id: student_id,
      total_purchased: lessonsCount,
      total_used: 0,
      remaining: lessonsCount,
      last_updated: new Date().toISOString(),
      packs: [
        {
          pack_id: packId,
          lessons_count: lessonsCount,
          purchased_at: new Date().toISOString(),
          used: 0,
          remaining: lessonsCount
        }
      ]
    });
  }

  // Записываем в историю покупок
  await addDoc(collection(db, 'lesson_pack_purchases'), {
    student_id: student_id,
    pack_id: packId,
    lessons_count: lessonsCount,
    amount: amount,
    purchased_at: new Date().toISOString(),
    payment_id: paymentData.order_id
  });

  console.log(`✅ Пакет ${packId} (${lessonsCount} уроков) добавлен пользователю ${student_id}`);
}

// Проверка подписи webhook
function verifyWebhookSignature(body: any): boolean {
  // Lava отправляет подпись в заголовке или в теле запроса
  // Реализация зависит от документации Lava
  // Пример:
  const signature = body.sign || body.signature;
  const data = `${body.order_id}:${body.amount}:${LAVA_SECRET_KEY}`;
  const crypto = require('crypto');
  const expectedSignature = crypto.createHash('md5').update(data).digest('hex');
  
  return signature === expectedSignature;
}