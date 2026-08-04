import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { query, subject, count = 5 } = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Не указан поисковый запрос' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API ключ не настроен' }, { status: 500 });
    }

    const subjectName = subject === "chemistry" ? "химии" : "биологии";
    const maxCount = Math.min(Number(count), 10);

    const systemPrompt = `Ты — эксперт по ЕГЭ/ОГЭ по ${subjectName}. Вспомни ${maxCount} реальных заданий по теме: "${query}".

ВАЖНО: Используй структуру JSON СТРОГО как в примерах ниже.

ПРИМЕР 1 (тест с выбором):
{
  "tasks": [{
    "title": "Задание 13. Арены",
    "type": "single_choice",
    "task_text": "Из перечня выберите два вещества, с которыми реагирует бензол",
    "variants": ["бромная вода", "азотная кислота", "водород", "гидроксид натрия"],
    "correct_indices": [1, 2],
    "correct_answer": "",
    "max_score": 2,
    "explanation": "Бензол реагирует с азотной кислотой и водородом",
    "tags": ["арены", "задание 13"]
  }]
}

ПРИМЕР 2 (текстовый ответ):
{
  "tasks": [{
    "title": "Задание 27. Расчёты",
    "type": "text",
    "task_text": "Вычислите массу соли для приготовления 200 г 15%-го раствора",
    "variants": [],
    "correct_indices": [],
    "correct_answer": "30",
    "max_score": 1,
    "explanation": "m = 200 × 0.15 = 30 г",
    "tags": ["растворы", "задание 27"]
  }]
}

ПРАВИЛА:
- Для single_choice/multi_choice: заполни variants (4 штуки) и correct_indices
- Для text: заполни correct_answer, variants = []
- Ответь СТРОГО в формате {"tasks": [...]}, без markdown`;

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
          { role: "user", content: `Вспомни ${maxCount} заданий ЕГЭ по ${subjectName}: ${query}` }
        ],
        temperature: 0.2,
        max_tokens: 4096,
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("OpenAI API error:", data);
      throw new Error(data.error?.message || "Ошибка API");
    }

    let rawContent = data.choices[0].message.content;
    rawContent = rawContent.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();

    let generatedTasks;
    try {
      const parsed = JSON.parse(rawContent);
      generatedTasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
    } catch (parseError) {
      console.error("JSON parse error:", rawContent);
      throw new Error("Некорректный JSON от нейросети");
    }

    if (generatedTasks.length === 0) {
      throw new Error("Задания не найдены");
    }

    return NextResponse.json({ success: true, tasks: generatedTasks });

  } catch (error: any) {
    console.error("Ошибка поиска:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}