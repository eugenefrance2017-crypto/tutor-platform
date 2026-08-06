"use client";

import { useEffect, useRef } from "react";

function VideoTile({ stream, name, muted = false, small = false }: { stream: MediaStream | null; name: string; muted?: boolean; small?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${small ? "aspect-square" : "aspect-video"}`}>
      {stream ? (
        <video ref={ref} autoPlay playsInline muted={muted} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
          нет видео
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1">
        <span className="text-[10px] text-white font-medium truncate">{name}</span>
      </div>
    </div>
  );
}

interface Props {
  localVideo: MediaStream | null;
  localName: string;
  localMicOn: boolean;
  remotes: { identity: string; name: string; stream: MediaStream | null }[];
}

export default function VideoPanel({ localVideo, localName, localMicOn, remotes }: Props) {
  const hasRemotes = remotes.length > 0;
  
  // Если много участников - показываем сетку маленьких видео
  const useGridLayout = hasRemotes && remotes.length >= 2;

  return (
    <div className="space-y-1.5">
      {/* Своё видео */}
      <VideoTile stream={localVideo} name={`${localName} (вы)`} muted small={useGridLayout} />
      
      {/* Остальные */}
      {hasRemotes && (
        <div className={useGridLayout ? "grid grid-cols-2 gap-1" : "space-y-1"}>
          {remotes.map((r) => (
            <VideoTile key={r.identity} stream={r.stream} name={r.name} small={useGridLayout} />
          ))}
        </div>
      )}
    </div>
  );
}