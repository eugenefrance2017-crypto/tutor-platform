"use client";

import { useEffect, useRef } from "react";

function MediaTile({ 
  videoTrack, 
  audioTrack, 
  name, 
  muted = false,
  isLocal = false
}: { 
  videoTrack?: any;
  audioTrack?: any;
  name: string;
  muted?: boolean;
  isLocal?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Видео
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (!videoTrack) {
      el.srcObject = null;
      return;
    }

    // Локальный трек — используем mediaStream
    if (isLocal && videoTrack.mediaStream instanceof MediaStream) {
      el.srcObject = videoTrack.mediaStream;
      el.muted = muted;
    }
    // Удалённый трек — используем attach()
    else if (!isLocal && typeof videoTrack.attach === "function") {
      try {
        videoTrack.attach(el);
        el.muted = muted;
      } catch (e) {
        console.error("Video attach error:", e);
      }
    }
    // Фоллбэк
    else if (videoTrack instanceof MediaStream) {
      el.srcObject = videoTrack;
      el.muted = muted;
    }

    return () => {
      if (!isLocal && typeof videoTrack?.detach === "function") {
        try { videoTrack.detach(el); } catch {}
      }
      el.srcObject = null;
    };
  }, [videoTrack, muted, isLocal]);

  // Аудио (только для удалённых участников!)
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    // Локальный звук не рендерим — он уже в video элементе
    if (isLocal) {
      el.srcObject = null;
      return;
    }

    if (!audioTrack) {
      el.srcObject = null;
      return;
    }

    if (typeof audioTrack.attach === "function") {
      try {
        audioTrack.attach(el);
        el.muted = muted;
      } catch (e) {
        console.error("Audio attach error:", e);
      }
    } else if (audioTrack.mediaStream instanceof MediaStream) {
      el.srcObject = audioTrack.mediaStream;
      el.muted = muted;
    }

    return () => {
      if (typeof audioTrack?.detach === "function") {
        try { audioTrack.detach(el); } catch {}
      }
      el.srcObject = null;
    };
  }, [audioTrack, muted, isLocal]);

  const hasVideo = !!videoTrack;

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
      {hasVideo ? (
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover bg-gray-800" 
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs bg-gray-800">
          <div className="text-center">
            <div className="mb-1 text-2xl">👤</div>
            <div>{name}</div>
          </div>
        </div>
      )}
      {/* Аудио только для удалённых */}
      {!isLocal && <audio ref={audioRef} autoPlay playsInline className="hidden" />}
      
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
        <span className="text-[10px] text-white font-medium truncate flex items-center gap-1">
          {muted ? "" : "🔊"} {name}
        </span>
      </div>
    </div>
  );
}

interface Props {
  localVideo: any;
  localAudio?: any;
  localName: string;
  localMicOn: boolean;
  remotes: { 
    identity: string; 
    name: string; 
    videoTrack?: any;
    audioTrack?: any;
    isMicOn: boolean;
  }[];
}

export default function VideoPanel({ 
  localVideo, 
  localAudio, 
  localName, 
  localMicOn, 
  remotes 
}: Props) {
  const hasRemotes = remotes.length > 0;
  const useGridLayout = hasRemotes && remotes.length >= 2;

  return (
    <div className="space-y-1.5">
      {/* Локальное видео — isLocal=true */}
      <MediaTile 
        videoTrack={localVideo} 
        audioTrack={localAudio} 
        name={`${localName} (вы)`} 
        muted={!localMicOn}
        isLocal={true}
      />
      
      {/* Удалённые участники — isLocal=false */}
      {hasRemotes && (
        <div className={useGridLayout ? "grid grid-cols-2 gap-1" : "space-y-1"}>
          {remotes.map((r) => (
            <MediaTile 
              key={r.identity} 
              videoTrack={r.videoTrack}
              audioTrack={r.audioTrack}
              name={r.name} 
              muted={!r.isMicOn}
              isLocal={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}