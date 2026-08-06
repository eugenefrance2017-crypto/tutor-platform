"use client";

import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff } from "lucide-react";
import type { CallState } from "@/hooks/useCall";

export default function CallControls({ call }: { call: CallState }) {
  const base = "h-10 w-10 flex items-center justify-center rounded-full transition-colors";

  const safe = (fn: () => Promise<void>, msg: string) => async () => {
    try {
      await fn();
    } catch (e) {
      console.error(e);
      alert(msg);
    }
  };

  return (
    <div className="flex justify-center gap-2 p-2 bg-white rounded-2xl border border-gray-200 shadow-sm shrink-0">
      <button
        onClick={safe(call.toggleMic, "Не удалось переключить микрофон")}
        title="Микрофон"
        className={`${base} ${call.micOn ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-red-500 text-white hover:bg-red-600"}`}
      >
        {call.micOn ? <Mic size={18} /> : <MicOff size={18} />}
      </button>
      <button
        onClick={safe(call.toggleCam, "Не удалось переключить камеру")}
        title="Камера"
        className={`${base} ${call.camOn ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-red-500 text-white hover:bg-red-600"}`}
      >
        {call.camOn ? <Video size={18} /> : <VideoOff size={18} />}
      </button>
      <button
        onClick={safe(call.toggleScreen, "Демонстрация экрана не поддерживается на этом устройстве")}
        title="Демонстрация экрана"
        className={`${base} ${call.screenOn ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
      >
        <MonitorUp size={18} />
      </button>
      <button
        onClick={call.leave}
        title="Выйти из звонка"
        className={`${base} bg-red-500 text-white hover:bg-red-600`}
      >
        <PhoneOff size={18} />
      </button>
    </div>
  );
}