import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { topic, subject, type, count, exam, taskNumber } = await request.json();
    
    if (!topic || !subject || !type) {
      return NextResponse.json({ error: 'Не хватает параметров' }, { status: 400 });
    }
    
    const tasks = [];
    const subjectName = subject === "chemistry" ? "химии" : "биологии";
    
    for (let i = 0; i < count; i++) {
      // Заглушка с более реалистичными заданиями
      let taskText = "";
      let correctAnswer = "";
      let explanation = "";
      
      if (type === "text") {
        taskText = `Задание ${i + 1}. Раскройте тему "${topic}" в контексте ${subjectName}. Приведите примеры и объясните основные закономерности.`;
        correctAnswer = `Правильный ответ зависит от конкретных знаний по теме "${topic}". Ожидается развёрнутый ответ с примерами.`;
        explanation = `Ключевые аспекты темы "${topic}": определение, основные свойства, примеры, применение в ${subjectName === "химии" ? "химических реакциях" : "биологических процессах"}.`;
      } else if (type === "single_choice") {
        taskText = `Задание ${i + 1}. Выберите правильный вариант о теме "${topic}":\n\nА) Вариант A\nБ) Вариант B\nВ) Вариант C\nГ) Вариант D`;
        correctAnswer = "А";
        explanation = `Правильный ответ: А, так как это соответствует основному определению темы "${topic}".`;
      } else if (type === "multi_choice") {
        taskText = `Задание ${i + 1}. Выберите все верные утверждения о теме "${topic}":\n\n☐ Утверждение 1\n☐ Утверждение 2\n☐ Утверждение 3\n☐ Утверждение 4`;
        correctAnswer = "1,2";
        explanation = `Правильные ответы: 1 и 2, так как они отражают основные свойства темы "${topic}".`;
      }
      
      tasks.push({
        title: `Задание ${i + 1}: ${topic}`,
        task_text: taskText,
        correct_answer: correctAnswer,
        max_score: 10,
        explanation: explanation,
        type: type,
        subject: subject,
        exam: exam,
      });
    }
    
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Ошибка генерации:", error);
    return NextResponse.json({ error: 'Ошибка генерации' }, { status: 500 });
  }
}