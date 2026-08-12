import { NextResponse } from 'next/server';
import { verifyTutorRequest } from '@/lib/verify-request';

export async function POST(request: Request) {
  const auth = await verifyTutorRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { topic, subject, type, count = 1 } = await request.json();

    if (!topic || !subject || !type) {
      return NextResponse.json({ error: 'Не хватает параметров' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API ключ не настроен' }, { status: 500 });
    }

    const subjectName = subject === "chemistry" ? "химии" : "биологии";
    const maxCount = Math.min(Number(count), 10);

    const systemPrompt = `Ты генерируешь задания СТРОГО в формате ЕГЭ по ${subjectName}.

СТРУКТУРА JSON (НЕ МЕНЯТЬ!):
{
  "tasks": [
    {
      "title": "string",
      "type": "${type}",
      "task_text": "string",
      "variants": ["string", "string", "string", "string"],
      "correct_indices": [number],
      "correct_answer": "string",
      "max_score": 1,
      "explanation": "string",
      "tags": ["string"]
    }
  ]
}

ПРАВИЛА:
- type = "single_choice" → заполни variants (4 штуки) и correct_indices (например [0] или [2])
- type = "text" → заполни correct_answer (например "2341" или "FeCl3"), variants = []
- type = "matching" → task_text описывает две колонки, variants = пары через запятую

ПРИМЕРЫ РЕАЛЬНЫХ ЗАДАНИЙ ЕГЭ:

Пример 1 (Химия, single_choice):
{
  "title": "Задание 13. Алкены",
  "type": "single_choice",
  "task_text": "Из перечисленных веществ выберите два вещества, с которыми реагирует этилен:",
  "variants": ["вода", "азот", "водород", "аргон", "кислород"],
  "correct_indices": [0, 2, 4],
  "correct_answer": "",
  "max_score": 2,
  "explanation": "Этилен реагирует с водой (гидратация), водородом (гидрирование) и кислородом (горение)",
  "tags": ["алкены", "химические свойства"]
}

Пример 2 (Химия, text):
{
  "title": "Задание 27. Расчётная задача",
  "type": "text",
  "task_text": "Вычислите массу соли (в граммах), необходимую для приготовления 200 г 15%-го раствора.",
  "variants": [],
  "correct_indices": [],
  "correct_answer": "30",
  "max_score": 1,
  "explanation": "m(соли) = m(раствора) × ω = 200 × 0.15 = 30 г",
  "tags": ["растворы", "массовая доля"]
}

Пример 3 (Биология, single_choice):
{
  "title": "Задание 2. Клетка",
  "type": "single_choice",
  "task_text": "Какая органелла клетки отвечает за синтез белка?",
  "variants": ["митохондрия", "рибосома", "лизосома", "комплекс Гольджи"],
  "correct_indices": [1],
  "correct_answer": "",
  "max_score": 1,
  "explanation": "Рибосомы — место синтеза белка в клетке",
  "tags": ["клетка", "органеллы"]
}

Теперь сгенерируй ${maxCount} заданий по теме "${topic}" в ТОЧНО ТАКОЙ ЖЕ структуре.`;

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
          { role: "user", content: `Сгенерируй ${maxCount} заданий по ${subjectName} на тему: ${topic}, тип: ${type}` }
        ],
        temperature: 0.1,
        max_tokens: 4096,
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message);

    let rawContent = data.choices[0].message.content.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(rawContent);
    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];

    // Валидация структуры — отбрасываем задания без обязательных полей
    const validTasks = tasks.filter((task: any, idx: number) => {
      if (!task.type || !task.task_text) {
        console.error(`Задание ${idx} не имеет обязательных полей — пропущено`);
        return false;
      }
      if (task.type === 'single_choice' && (!task.variants || task.variants.length < 2)) {
        console.error(`Задание ${idx} типа single_choice не имеет вариантов — пропущено`);
        return false;
      }
      return true;
    });

    return NextResponse.json({ success: true, tasks: validTasks });

  } catch (error: any) {
    console.error("Ошибка:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}