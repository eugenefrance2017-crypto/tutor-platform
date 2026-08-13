import { NextResponse } from 'next/server';
import { verifyTutorRequest } from '@/lib/verify-request';

const apiKey = process.env.OPENAI_API_KEY;

// ВАЖНО: pdf-parse и pdf-to-img импортируются динамически (не на верхнем уровне
// файла), внутри try/catch. Раньше эти пакеты крашили весь роут ещё до того,
// как срабатывал try/catch внутри функций (тот же класс проблем, что был
// с firebase-admin/auth) — из-за этого браузер видел пустую страницу 500
// вместо понятного текста ошибки. Теперь любая ошибка импорта (ESM-конфликт,
// известный баг pdf-parse с тестовым файлом и т.п.) ловится и возвращается
// как обычный JSON { error: "..." }, видимый во вкладке Network → Response.

// Шаг 1: пробуем вытащить текстовый слой
async function tryExtractText(buffer: Buffer): Promise<string> {
  try {
    const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (e: any) {
    console.error('tryExtractText failed:', e);
    return '';
  }
}

// Шаг 2: если текста мало (скан или формулы картинками) — рендерим страницы в PNG
async function renderPagesToImages(buffer: Buffer, maxPages = 8): Promise<string[]> {
  const { pdf } = await import('pdf-to-img');
  const document = await pdf(buffer, { scale: 2 });
  const images: string[] = [];
  let i = 0;
  for await (const pageBuffer of document) {
    if (i >= maxPages) break;
    images.push(`data:image/png;base64,${pageBuffer.toString('base64')}`);
    i++;
  }
  return images;
}

async function splitTasksFromText(text: string, subject: string) {
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
        { role: 'user', content: text.slice(0, 15000) },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message);
  const cleaned = data.choices[0].message.content.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
  return JSON.parse(cleaned).tasks || [];
}

async function splitTasksFromImages(images: string[], subject: string) {
  const systemPrompt = `Ты читаешь скан/страницу варианта ЕГЭ (${subject === 'chemistry' ? 'химия' : 'биология'}) и извлекаешь из неё отдельные задания ДОСЛОВНО, включая формулы (переведи их в текстовый вид, например H2SO4, C6H12O6).

ВАЖНО:
- НЕ придумывай ничего, только то, что видишь на изображении.
- НЕ пиши correct_answer и explanation — оставляй пустыми.
- Если на странице несколько заданий — верни их все отдельными объектами.

Верни JSON: { "tasks": [ { "title": "string", "type": "text"|"single_choice"|"multi_choice"|"matching", "task_text": "string", "variants": ["string"], "correct_answer": "", "explanation": "", "max_score": 1, "tags": [] } ] }`;

  const allTasks: any[] = [];

  for (const imageUrl of images) {
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

  return allTasks;
}

export async function POST(request: Request) {
  const auth = await verifyTutorRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { fileBase64, subject } = await request.json();
    if (!fileBase64 || !subject) {
      return NextResponse.json({ error: 'Не хватает параметров' }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: 'API ключ не настроен' }, { status: 500 });
    }

    const buffer = Buffer.from(fileBase64.replace(/^data:application\/pdf;base64,/, ''), 'base64');

    const rawText = await tryExtractText(buffer);
    // Эвристика: если текста в PDF мало — скорее всего скан/картинки/формулы-картинки
    const looksLikeScannedOrFormulaHeavy = rawText.trim().length < 500;

    let tasks;
    let source: 'text' | 'vision';
    if (!looksLikeScannedOrFormulaHeavy) {
      tasks = await splitTasksFromText(rawText, subject);
      source = 'text';
    } else {
      const images = await renderPagesToImages(buffer);
      tasks = await splitTasksFromImages(images, subject);
      source = 'vision';
    }

    const tasksWithIds = tasks.map((t: any) => ({
      ...t,
      id: `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      source: 'pdf',
    }));

    return NextResponse.json({ success: true, tasks: tasksWithIds, extraction: source });
  } catch (error: any) {
    console.error('Ошибка разбора PDF:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}