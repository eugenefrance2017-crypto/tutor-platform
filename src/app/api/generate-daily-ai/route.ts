import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { topic, subject, count = 3 } = await request.json();
    
    if (!topic || !subject) {
      return NextResponse.json({ error: 'Не хватает параметров (topic, subject)' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API ключ не настроен' }, { status: 500 });
    }

    const subjectName = subject === "chemistry" ? "химии" : "биологии";

    // Промпт заточен ПОД СТРУКТУРУ library_items из твоего daily.tsx
    const systemPrompt = `Ты — методист ЕГЭ по ${subjectName}. Сгенерируй ${count} коротких, но ёмких заданий для ежедневной тренировки по теме: "${topic}".

Ты должен ответить СТРОГО в формате JSON-массива. Без markdown, без пояснений.

Структура КАЖДОГО объекта в массиве должна быть строго такой:
[
  {
    "title": "Краткое название (например: 'Задание на ОВР')",
    "topic": "${topic}",
    "sections": [
      {
        "type": "text",
        "task_text": "Условие задачи (чёткое и короткое, до 300 символов)",
        "hint": "Короткая подсказка, которая не даёт прямой ответ, но направляет мысль",
        "data": {
          "correct_answer": "Точный правильный ответ (число или формула)"
        },
        "explanation": "Пошаговое объяснение решения для ученика"
      }
    ]
  }
]

ПРАВИЛА:
1. Для ежедневного задания лучше всего подходит тип "text" с коротким числовым или формульным ответом.
2. Ответ в correct_answer должен быть однозначным (например, "42" или "FeCl3").
3. Задания должны быть РАЗНЫМИ.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Сгенерируй ${count} ежедневных заданий по ${subjectName} на тему: ${topic}` }
        ],
        temperature: 0.3,
        max_tokens: 2048,
        response_format: { type: "json_object" } // Заставляем вернуть {"tasks": [...]} или просто массив, обработаем оба варианта
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Ошибка API");

    let rawContent = data.choices[0].message.content;
    rawContent = rawContent.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();

    let generatedTasks;
    try {
      const parsed = JSON.parse(rawContent);
      // Обработка на случай, если ИИ вернул { "tasks": [...] } или сразу [...]
      generatedTasks = Array.isArray(parsed) ? parsed : (parsed.tasks || []);
    } catch (parseError) {
      console.error("Ошибка парсинга JSON:", rawContent);
      throw new Error("Некорректный формат ответа от ИИ");
    }

    return NextResponse.json({ success: true, tasks: generatedTasks });

  } catch (error: any) {
    console.error("Ошибка генерации ежедневного задания:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}