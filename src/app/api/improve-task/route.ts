// Замени существующую функцию improveTask на эту версию.
// Единственное отличие — данные от GPT прогоняются через sanitizeTask()
// перед тем как попасть в состояние React, чтобы объект случайно не попал
// туда, где ожидается строка (это и роняло страницу с "Minified React error #31").

function sanitizeTask(raw: any) {
  const toStr = (v: any): string => {
    if (typeof v === 'string') return v;
    if (v === null || v === undefined) return '';
    // GPT иногда возвращает объект/массив там, где ждали строку — сериализуем,
    // чтобы страница не падала, а показала как есть (можно будет поправить вручную).
    return typeof v === 'object' ? JSON.stringify(v) : String(v);
  };

  return {
    ...raw,
    title: toStr(raw.title),
    task_text: toStr(raw.task_text),
    correct_answer: toStr(raw.correct_answer),
    explanation: toStr(raw.explanation),
    variants: Array.isArray(raw.variants) ? raw.variants.map(toStr) : [],
    tags: Array.isArray(raw.tags) ? raw.tags.map(toStr) : [],
  };
}

const improveTask = async (index: number, improvementType: string) => {
  const task = aiPreview[index];
  if (!task) return;

  setIsImproving(index);
  try {
    const res = await authedFetch('/api/improve-task', { task, improvementType });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    if (data.task) {
      const safeTask = sanitizeTask(data.task);
      const newPreview = [...aiPreview];
      newPreview[index] = { ...safeTask, id: task.id };
      setAiPreview(newPreview);
      toast.success("Задание улучшено!");
    }
  } catch (e: any) {
    toast.error(e.message || "Ошибка улучшения");
  } finally {
    setIsImproving(null);
  }
};