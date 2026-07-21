"use client";

import { jsPDF } from "jspdf";

export function generateCertificate(
  studentName: string, 
  courseTitle: string, 
  completionDate: string,
  tutorName: string = "Jenyawisch"
) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 297;
  const pageHeight = 210;

  // Тёмный фон
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Внешняя золотая рамка
  doc.setDrawColor(251, 191, 36);
  doc.setLineWidth(3);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Внутренняя тонкая рамка
  doc.setLineWidth(0.5);
  doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

  // Декоративные уголки
  doc.setDrawColor(251, 191, 36);
  doc.setLineWidth(2);
  const cornerSize = 15;
  
  // Верхний левый
  doc.line(20, 20, 20 + cornerSize, 20);
  doc.line(20, 20, 20, 20 + cornerSize);
  
  // Верхний правый
  doc.line(pageWidth - 20, 20, pageWidth - 20 - cornerSize, 20);
  doc.line(pageWidth - 20, 20, pageWidth - 20, 20 + cornerSize);
  
  // Нижний левый
  doc.line(20, pageHeight - 20, 20 + cornerSize, pageHeight - 20);
  doc.line(20, pageHeight - 20, 20, pageHeight - 20 - cornerSize);
  
  // Нижний правый
  doc.line(pageWidth - 20, pageHeight - 20, pageWidth - 20 - cornerSize, pageHeight - 20);
  doc.line(pageWidth - 20, pageHeight - 20, pageWidth - 20, pageHeight - 20 - cornerSize);

  // Заголовок "СЕРТИФИКАТ"
  doc.setFont("helvetica", "bold");
  doc.setFontSize(56);
  doc.setTextColor(251, 191, 36);
  doc.text("СЕРТИФИКАТ", pageWidth / 2, 55, { align: "center" });

  // Декоративная линия под заголовком
  doc.setDrawColor(251, 191, 36);
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 50, 62, pageWidth / 2 + 50, 62);

  // Подзаголовок
  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.setTextColor(200, 200, 200);
  doc.text("Настоящий сертификат подтверждает, что", pageWidth / 2, 78, { align: "center" });

  // Имя студента
  doc.setFont("helvetica", "bold");
  doc.setFontSize(40);
  doc.setTextColor(251, 191, 36);
  doc.text(studentName, pageWidth / 2, 100, { align: "center" });

  // Линия под именем
  doc.setDrawColor(251, 191, 36);
  doc.setLineWidth(0.3);
  doc.line(pageWidth / 2 - 60, 105, pageWidth / 2 + 60, 105);

  // Текст о прохождении
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(200, 200, 200);
  doc.text("успешно завершил(а) курс", pageWidth / 2, 120, { align: "center" });

  // Название курса
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text(`"${courseTitle}"`, pageWidth / 2, 135, { align: "center" });

  // Дата
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(180, 180, 180);
  doc.text(`Дата завершения: ${completionDate}`, pageWidth / 2, 155, { align: "center" });

  // Подпись репетитора
  doc.setFont("helvetica", "italic");
  doc.setFontSize(14);
  doc.setTextColor(251, 191, 36);
  doc.text(tutorName, pageWidth / 2, 175, { align: "center" });

  // Линия под подписью
  doc.setDrawColor(251, 191, 36);
  doc.setLineWidth(0.3);
  doc.line(pageWidth / 2 - 30, 178, pageWidth / 2 + 30, 178);

  // Должность
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text("Репетитор по химии и биологии", pageWidth / 2, 185, { align: "center" });

  // Декоративные звёзды
  doc.setFontSize(24);
  doc.setTextColor(251, 191, 36);
  doc.text("★", 35, 100);
  doc.text("★", pageWidth - 35, 100);
  doc.text("★", 35, 130);
  doc.text("★", pageWidth - 35, 130);

  // Сохранить
  const fileName = `certificate_${studentName.replace(/\s+/g, '_')}_${courseTitle.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}