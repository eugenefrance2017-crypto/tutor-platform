"use client";

import { useParams } from "next/navigation";
import LessonRoom from "@/components/LessonRoom";

export default function LessonPage() {
  const params = useParams<{ id: string }>();
  if (!params?.id) return null;
  return <LessonRoom lessonId={params.id} />;
}