import { NextResponse } from 'next/server';
import { verifyTutorRequest } from '@/lib/verify-request';

const apiKey = process.env.OPENAI_API_KEY;

export async function POST(request: Request) {
  const auth = await verifyTutorRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { images, subject } = await request.json();
    if (!Array.isArray(images) || images.length === 0 || !subject) {
      return NextResponse.json({ error: 'Не хватает параметров' }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: 'API ключ не настроен' }, { status: 500 });
    }

    const systemPrompt = `Ты читаешь скан/страницу варианта ЕГЭ (${subject === 'chemistry' ? 'химия' : 'биология'}) и извлекаешь из неё отдельные задания ДОСЛОВНО, включая формулы (переведи их в текстовый вид, например H2SO4, C6H12O6).

ВАЖНО:
- НЕ придумывай ничего, только то, что видишь на изображении.
- НЕ пиши correct_answer и explanation — оставляй пустыми.
- Если на странице несколько заданий — верни их все отдельными объектами.

Верни JSON: { "tasks": [ { "title": "string", "type": "text"|"single_choice"|"multi_choice"|"matching", "task_text": "string", "variants": ["string"], "correct_answer": "", "explanation": "", "max_score": 1, "tags": [] } ] }`;

    const allTasks: any[] = [];
    const maxPages = Math.min(images.length, 8);

    for (let i = 0; i < maxPages; i++) {
      const imageUrl = images[i];
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Извлеки задания с этой страницы' },
                { type: 'image_url', image_url: { url: imageUrl } },
              ],
            },
          ],
          temperature: 0,
          response_format: { type: 'json_object' },
          max_tokens: 2048,
        }),
      });
      const data = await res.json();
      if (!res.ok) continue; // одна плохая страница не должна валить весь процесс
      try {
        const cleaned = data.choices[0].message.content.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
        const parsed = JSON.parse(cleaned);
        allTasks.push(...(parsed.tasks || []));
      } catch {
        continue;
      }
    }

    const tasksWithIds = allTasks.map((t: any) => ({
      ...t,
      id: `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      source: 'pdf',
    }));

    return NextResponse.json({ success: true, tasks: tasksWithIds });
  } catch (error: any) {
    console.error('Ошибка разбора изображений PDF:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}