"use client";

import { useState, useRef, useEffect } from "react";
import { Circle, Square, Download, Loader2 } from "lucide-react";

interface Props {
  lessonId: string;
  lessonTitle?: string;
}

export default function RecordingButton({ lessonId, lessonTitle }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    setError(null);
    try {
      // 1. Запрашиваем экран
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: 30 },
        audio: true, // звук системы (если браузер поддерживает)
      });

      // 2. Запрашиваем микрофон
      let micStream: MediaStream | null = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (micErr) {
        console.warn("Микрофон недоступен:", micErr);
        // Продолжаем без микрофона
      }

      // 3. Объединяем треки
      const combinedStream = new MediaStream();
      
      // Видео с экрана
      screenStream.getVideoTracks().forEach(t => combinedStream.addTrack(t));
      
      // Аудио: приоритет — микрофон, иначе звук системы
      if (micStream && micStream.getAudioTracks().length > 0) {
        micStream.getAudioTracks().forEach(t => combinedStream.addTrack(t));
      } else if (screenStream.getAudioTracks().length > 0) {
        screenStream.getAudioTracks().forEach(t => combinedStream.addTrack(t));
      }

      // 4. Создаём рекордер
      const mimeTypes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ];
      let mimeType = "";
      for (const mt of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mt)) {
          mimeType = mt;
          break;
        }
      }

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: mimeType || undefined,
        videoBitsPerSecond: 2_500_000,
      });

      mediaRecorderRef.current = recorder;
      streamRef.current = screenStream;
      micStreamRef.current = micStream;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const filename = `lesson-${lessonId}-${new Date().toISOString().slice(0, 16)}.webm`;
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        // Очистка
        screenStream.getTracks().forEach(t => t.stop());
        if (micStream) micStream.getTracks().forEach(t => t.stop());
        
        setIsProcessing(false);
        setIsRecording(false);
        setDuration(0);
      };

      recorder.start(1000); // собираем данные каждую секунду
      setIsRecording(true);
      setDuration(0);

      // Таймер
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);

      // Если пользователь остановил шаринг экрана через браузер
      screenStream.getVideoTracks()[0].onended = () => {
        if (recorder.state !== "inactive") {
          stopRecording();
        }
      };

    } catch (err: any) {
      console.error("Recording error:", err);
      if (err.name === "NotAllowedError") {
        setError("Доступ к экрану отклонён");
      } else {
        setError("Ошибка: " + err.message);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      setIsProcessing(true);
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (micStreamRef.current) micStreamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      {!isRecording ? (
        <button
          onClick={startRecording}
          disabled={isProcessing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 text-xs font-medium transition-colors"
          title="Записать экран урока"
        >
          <Circle size={12} fill="currentColor" />
          <span>Запись</span>
        </button>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            <span className="text-xs font-mono font-bold text-red-700 tabular-nums">
              {formatDuration(duration)}
            </span>
          </div>
          <button
            onClick={stopRecording}
            disabled={isProcessing}
            className="p-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            title="Остановить и скачать"
          >
            {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <Square size={12} fill="currentColor" />}
          </button>
        </div>
      )}
      
      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  );
}