import { NextResponse } from 'next/server';
import { verifyTutorRequest } from '@/lib/verify-request';

const improvementPrompts: Record<string, string> = {
  harder: 'Сделай задание сложнее: добавь больше шагов решения, используй более сложные вещества/понятия, увеличь количество вариантов ответа.',
  easier: 'Сделай задание проще: упрости условие, добавь подсказку, уменьши количество вариантов ответа.',
  hint: 'Добавь подробную подсказку к заданию, которая поможет ученику решить его самостоятельно.',
  explain: 'Добавь более подробное объяснение решения с пошаговым разбором.',
  variants: 'Добавь ещё 2 варианта ответа (всего должно быть 6 вариантов).'
};

export async function POST(request: Request) {
  const auth = await verifyTutorRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { task, improvementType } = await request.json();

    if (!task || !improvementType) {
      return NextResponse.json({ error: 'Не хватает параметров' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API ключ не настроен' }, { status: 500 });
    }

    const systemPrompt = `Ты — методист ЕГЭ. Улучши задание согласно запросу: "${improvementPrompts[improvementType] || improvementType}"

ИСХОДНОЕ ЗАДАНИЕ:
${JSON.stringify(task, null, 2)}

ВЕРНИ УЛУЧШЕННУЮ ВЕРСИЮ В ТОМ ЖЕ ФОРМАТЕ JSON. Не меняй структуру, только улучши содержание согласно запросу.`;

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
          { role: "user", content: "Улучши задание" }
        ],
        temperature: 0.3,
        max_tokens: 2048,
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message);

    let rawContent = data.choices[0].message.content.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
    const improvedTask = JSON.parse(rawContent);

    return NextResponse.json({ success: true, task: improvedTask });

  } catch (error: any) {
    console.error("Ошибка улучшения задания:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}