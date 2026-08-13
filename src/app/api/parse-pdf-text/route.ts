import { NextResponse } from 'next/server';
import { verifyTutorRequest } from '@/lib/verify-request';

const apiKey = process.env.OPENAI_API_KEY;

export async function POST(request: Request) {
  const auth = await verifyTutorRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { text, subject } = await request.json();
    if (!text || !subject) {
      return NextResponse.json({ error: 'Не хватает параметров' }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: 'API ключ не настроен' }, { status: 500 });
    }

    const systemPrompt = `Ты помогаешь методисту по ЕГЭ (${subject === 'chemistry' ? 'химия' : 'биология'}) разбить сырой текст варианта экзамена на отдельные задания.

ВАЖНО:
- НЕ придумывай задания, НЕ дописывай ничего от себя — только то, что реально есть в тексте.
- НЕ вычисляй и НЕ пиши правильные ответы.
- НЕ пиши объяснения — это поле должно остаться пустым, репетитор допишет сам.
- Если номер задания или тема неочевидны — оставь title обобщённым ("Задание из варианта").

Верни JSON:
{
  "tasks": [
    {
      "title": "string",
      "type": "text" | "single_choice" | "multi_choice" | "matching",
      "task_text": "string — точный текст задания, как в источнике",
      "variants": ["string"],
      "correct_answer": "",
      "explanation": "",
      "max_score": 1,
      "tags": []
    }
  ]
}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: String(text).slice(0, 15000) },
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message);

    const cleaned = data.choices[0].message.content.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
    const tasks = JSON.parse(cleaned).tasks || [];

    const tasksWithIds = tasks.map((t: any) => ({
      ...t,
      id: `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      source: 'pdf',
    }));

    return NextResponse.json({ success: true, tasks: tasksWithIds });
  } catch (error: any) {
    console.error('Ошибка разбора текста PDF:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}