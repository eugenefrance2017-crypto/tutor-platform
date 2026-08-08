"use client";

import { useCallback, useRef, useState } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db, app } from "@/lib/firebase";

const storage = getStorage(app);

export function useLessonRecorder(
  lessonId: string,
  canvasElement: HTMLCanvasElement | null,
  localAudioStream?: MediaStream | null // Берём звук из текущего звонка
) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    if (!canvasElement) {
      alert("Не удалось найти холст для записи. Попробуйте обновить страницу.");
      return;
    }

    try {
      chunksRef.current = [];

      // 1. Захватываем видео с холста (доска + нарисованная камера)
      const canvasStream = canvasElement.captureStream(30);
      
      // 2. Собираем итоговый поток: Видео с холста + Твой микрофон
      const tracks = [...canvasStream.getVideoTracks()];
      if (localAudioStream) {
        tracks.push(...localAudioStream.getAudioTracks());
      }
      
      const combinedStream = new MediaStream(tracks);

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: "video/webm;codecs=vp9,opus",
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setIsRecording(false);
        setRecordingTime(0);
        if (timerRef.current) clearInterval(timerRef.current);

        try {
          const fileName = `recordings/${lessonId}/${Date.now()}.webm`;
          const fileRef = ref(storage, fileName);
          await uploadBytes(fileRef, blob);
          const url = await getDownloadURL(fileRef);

          // Сохраняем в Firestore (структура подходит под твой LessonsHistoryPage)
          await updateDoc(doc(db, "lessons", lessonId), {
            recordings: arrayUnion({
              url,
              filename: fileName,
              createdAt: new Date().toISOString(),
              duration: recordingTime,
            }),
          });
          alert("✅ Запись урока сохранена! Она появится на вкладке 'Уроки'.");
        } catch (err) {
          console.error("Failed to save recording:", err);
          alert("Не удалось сохранить запись в облако");
        }
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);

    } catch (err: any) {
      console.error("Recording error:", err);
      alert("Не удалось начать запись: " + err.message);
    }
  }, [lessonId, canvasElement, localAudioStream, recordingTime]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    formatTime,
  };
}