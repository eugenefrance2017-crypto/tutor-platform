import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { verifyTutorRequest } from '@/lib/verify-request';

const SUBJECT_MAP: Record<string, string> = {
  chemistry: 'chem',
  biology: 'bio',
};

export async function POST(request: Request) {
  const auth = await verifyTutorRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { query, subject, count = 5 } = await request.json();
    if (!query || !subject) {
      return NextResponse.json({ error: 'Не хватает параметров' }, { status: 400 });
    }

    const subjSlug = SUBJECT_MAP[subject];
    if (!subjSlug) {
      return NextResponse.json({ error: 'Неизвестный предмет' }, { status: 400 });
    }

    // Поиск заданий по ключевым словам в открытом каталоге sdamgia.ru
    // (важно: домен .ru, не .net — сайт называется chem-ege.sdamgia.ru)
    const searchUrl = `https://${subjSlug}-ege.sdamgia.ru/search?search=${encodeURIComponent(query)}`;

    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EGEBot/1.0)' },
    });
    if (!res.ok) throw new Error(`Не удалось получить страницу: ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);

    const tasks: any[] = [];

    $('.prob_maindiv').each((i, el) => {
      if (tasks.length >= count) return;

      const $el = $(el);
      const taskId = $el.find('.prob_nums a').first().text().trim();
      const $body = $el.find('.pbody');

      // Убираем служебные блоки (кнопки, ссылки на "показать ответ")
      $body.find('script, .no-print').remove();
      const taskText = $body.text().replace(/\s+/g, ' ').trim();

      if (!taskText) return;

      // Пытаемся вытащить варианты ответа, если это тест
      const variants: string[] = [];
      $el.find('.answer_choices li, .pbody ol li').each((_, li) => {
        variants.push($(li).text().trim());
      });

      tasks.push({
        id: `sdamgia-${taskId || Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: `Задание из открытого банка (${taskId || 'ID неизвестен'})`,
        type: variants.length > 0 ? 'single_choice' : 'text',
        task_text: taskText,
        variants,
        correct_answer: '',   // ответ на источнике под спойлером — не парсим автоматически
        explanation: '',      // репетитор допишет сам
        max_score: 1,
        tags: [query],
        source: 'sdamgia',
        source_url: `https://${subjSlug}-ege.sdamgia.ru/problem?id=${taskId}`,
      });
    });

    if (tasks.length === 0) {
      return NextResponse.json({ error: 'По этому запросу ничего не нашлось на источнике' }, { status: 404 });
    }

    return NextResponse.json({ success: true, tasks });
  } catch (error: any) {
    console.error('Ошибка поиска в открытых источниках:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}