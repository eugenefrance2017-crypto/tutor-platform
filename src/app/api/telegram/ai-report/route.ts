import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { targetChatId, recipientName, studentName, subject, date, topics, notes } = await request.json();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!botToken || !targetChatId) {
      return NextResponse.json({ error: "Missing Telegram config" }, { status: 500 });
    }

    let reportText = "";

    // Попытка использовать ИИ (если есть ключ)
    if (openaiKey) {
      try {
        const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: "Ты - профессиональный, поддерживающий репетитор. Напиши краткий, мотивирующий отчет для родителя или ученика о прошедшем занятии. Используй эмодзи, но не перебарщивай. Максимум 4-5 предложений. Тон: доброжелательный, профессиональный."
              },
              {
                role: "user",
                content: `Ученик: ${studentName}. Предмет: ${subject}. Дата: ${date}.\nТемы: ${topics}.\nЗаметки репетитора: ${notes}.\n\nНапиши отчет для ${recipientName}.`
              }
            ],
            temperature: 0.7,
            max_tokens: 250,
          }),
        });
        
        const aiData = await aiResponse.json();
        reportText = aiData.choices[0].message.content;
      } catch (aiError) {
        console.warn("OpenAI failed, falling back to template", aiError);
      }
    }

    // Fallback: Умный шаблон (если нет OpenAI ключа или произошла ошибка)
    if (!reportText) {
      reportText = `✨ *Отчёт о занятии* ✨\n\n *Ученик:* ${studentName}\n *Предмет:* ${subject}\n *Дата:* ${date}\n\n *Темы урока:*\n${topics}\n\n📝 *Комментарий репетитора:*\n${notes}\n\n Материал проработан, движение к цели продолжается! Если есть вопросы, я всегда на связи.`;
    }

    // Отправка в Telegram
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: reportText,
        parse_mode: "Markdown",
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Telegram API Error:", errorData);
      return NextResponse.json({ error: "Failed to send" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Internal Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}