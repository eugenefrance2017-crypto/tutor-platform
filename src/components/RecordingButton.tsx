"use client";

import { useState, useRef, useEffect } from "react";
import { Circle, Square, Loader2 } from "lucide-react";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Props {
  lessonId: string;
  lessonTitle?: string;
}

export default function RecordingButton({ lessonId, lessonTitle }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    try {
      let screenStream: MediaStream | null = null;
      let micStream: MediaStream | null = null;

      if (isMobile) {
        // На мобильных — камера + микрофон
        try {
          screenStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" },
            audio: true 
          });
        } catch (camErr) {
          throw new Error("Камера недоступна");
        }
      } else {
        // На десктопе — экран + микрофон
        try {
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: 15 },
            audio: true,
          });
        } catch (screenErr) {
          throw new Error("Доступ к экрану отклонён");
        }

        try {
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (micErr) {
          console.warn("Микрофон недоступен:", micErr);
        }
      }

      // Объединяем треки
      const combinedStream = new MediaStream();
      screenStream.getVideoTracks().forEach(t => combinedStream.addTrack(t));
      
      if (micStream && micStream.getAudioTracks().length > 0) {
        micStream.getAudioTracks().forEach(t => combinedStream.addTrack(t));
      } else if (screenStream.getAudioTracks().length > 0) {
        screenStream.getAudioTracks().forEach(t => combinedStream.addTrack(t));
      }

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
        videoBitsPerSecond: 1_000_000,
      });

      mediaRecorderRef.current = recorder;
      streamRef.current = screenStream;
      micStreamRef.current = micStream;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setIsUploading(true);
        
        try {
          const blob = new Blob(chunksRef.current, { type: "video/webm" });
          
          const formData = new FormData();
          formData.append('file', blob);
          formData.append('lessonId', lessonId);
          formData.append('duration', duration.toString());

          const uploadRes = await fetch('/api/upload-recording', {
            method: 'POST',
            body: formData,
          });

          const uploadData = await uploadRes.json();
          
          if (!uploadRes.ok) throw new Error(uploadData.error);

          const lessonRef = doc(db, "lessons", lessonId);
          await updateDoc(lessonRef, {
            recordings: arrayUnion({
              url: uploadData.publicUrl,
              filename: uploadData.filename,
              createdAt: new Date().toISOString(),
              duration: duration,
            })
          });

          alert("✅ Запись загружена!");
          
        } catch (uploadErr: any) {
          console.error("Upload error:", uploadErr);
          alert("❌ Ошибка загрузки: " + uploadErr.message);
        } finally {
          screenStream.getTracks().forEach(t => t.stop());
          if (micStream) micStream.getTracks().forEach(t => t.stop());
          
          setIsUploading(false);
          setIsRecording(false);
          setDuration(0);
        }
      };

      recorder.start(1000);
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);

      if (!isMobile && screenStream.getVideoTracks()[0]) {
        screenStream.getVideoTracks()[0].onended = () => {
          if (recorder.state !== "inactive") stopRecording();
        };
      }

    } catch (err: any) {
      console.error("Recording error:", err);
      setError(err.message || "Ошибка записи");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
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
          disabled={isUploading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 text-xs font-medium"
        >
          {isUploading ? (
            <><Loader2 size={12} className="animate-spin" /><span>Загрузка...</span></>
          ) : (
            <><Circle size={12} fill="currentColor" /><span>Запись</span></>
          )}
        </button>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
          <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
          <span className="text-xs font-mono font-bold text-red-700">{formatDuration(duration)}</span>
          <button onClick={stopRecording} disabled={isUploading} className="p-1 bg-red-600 text-white rounded hover:bg-red-700">
            {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Square size={12} fill="currentColor" />}
          </button>
        </div>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}