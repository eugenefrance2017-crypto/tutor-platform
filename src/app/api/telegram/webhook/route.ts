import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
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
    const update = await request.json();
    
    // Проверяем, что это сообщение и оно содержит текст
    if (!update.message || !update.message.text) {
      return NextResponse.json({ ok: true });
    }

    const text = update.message.text;
    const chatId = update.message.chat.id;

    // Проверяем, что это команда /start с кодом
    if (text.startsWith('/start ')) {
      const secretCode = text.split('/start ')[1].trim();

      // Ищем ученика с этим кодом
      const q = query(collection(db, 'profiles'), where('telegram_bind_code', '==', secretCode));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        
        // Обновляем профиль: добавляем chat_id и удаляем код
        await updateDoc(doc(db, 'profiles', userDoc.id), {
          telegram_chat_id: chatId.toString(),
          telegram_bind_code: null, // Очищаем код после успешной привязки
        });

        // Отправляем красивое сообщение ученику
        const token = process.env.TELEGRAM_BOT_TOKEN;
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `✅ Отлично! Теперь вы будете получать напоминания об уроках и домашние задания от Жени 🧪🧬\n\nМяу! 🐱`,
          }),
        });
      } else {
        // Если код не найден
        const token = process.env.TELEGRAM_BOT_TOKEN;
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '❌ Код не найден или уже использован. Пожалуйста, получите новую ссылку на сайте.',
          }),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ ok: true }); // Всегда возвращаем 200 OK Telegram'у
  }
}