import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { message, targetChatId } = await request.json();
    
    const token = process.env.TELEGRAM_BOT_TOKEN;
    // Если targetChatId не передан, шлем тебе (админу)
    const chatId = targetChatId || process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      console.error('❌ Ошибка: Не хватает токена или chat_id');
      return NextResponse.json({ error: 'Настройки не найдены' }, { status: 500 });
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Ошибка Telegram API:', errorData);
      return NextResponse.json({ error: 'Telegram API error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Внутренняя ошибка:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}