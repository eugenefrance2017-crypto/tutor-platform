"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LocalTrack, RemoteTrack, Room, RoomEvent, Track, VideoPresets } from "livekit-client";

export interface RemoteInfo {
  sid: string;
  name: string;
  isMicOn: boolean;
  audioTrack?: RemoteTrack;
  videoTrack?: RemoteTrack;
  screenTrack?: RemoteTrack;
}

export function useCall() {
  const roomRef = useRef<Room | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected">("idle");
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [localVideo, setLocalVideo] = useState<LocalTrack | null>(null);
  const [remotes, setRemotes] = useState<RemoteInfo[]>([]);

  const syncLocal = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    let cam: LocalTrack | null = null;
    room.localParticipant.trackPublications.forEach((pub) => {
      if (pub.source === Track.Source.Camera && pub.track) cam = pub.track as LocalTrack;
    });
    setLocalVideo(cam);
    setMicOn(room.localParticipant.isMicrophoneEnabled);
    setCamOn(room.localParticipant.isCameraEnabled);
    setScreenOn(room.localParticipant.isScreenShareEnabled);
  }, []);

  const syncRemotes = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const list: RemoteInfo[] = [];
    room.remoteParticipants.forEach((p) => {
      const info: RemoteInfo = {
        sid: p.sid,
        name: p.name || p.identity,
        isMicOn: p.isMicrophoneEnabled,
      };
      p.trackPublications.forEach((pub) => {
        if (!pub.track) return;
        if (pub.kind === Track.Kind.Audio) info.audioTrack = pub.track as RemoteTrack;
        if (pub.kind === Track.Kind.Video) {
          if (pub.source === Track.Source.ScreenShare) info.screenTrack = pub.track as RemoteTrack;
          else info.videoTrack = pub.track as RemoteTrack;
        }
      });
      list.push(info);
    });
    setRemotes(list);
  }, []);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  const join = useCallback(async (lessonId: string, identity: string, name: string, role: string) => {
    try {
      setStatus("connecting");
      setError(null);
      const res = await fetch(
        `/api/lessons/${lessonId}/call-token?identity=${encodeURIComponent(identity)}&name=${encodeURIComponent(name)}&role=${encodeURIComponent(role)}`
      );
      if (!res.ok) throw new Error("token failed");
      const { token, url } = await res.json();

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.LocalTrackPublished, syncLocal);
      room.on(RoomEvent.LocalTrackUnpublished, syncLocal);
      room.on(RoomEvent.ParticipantConnected, syncRemotes);
      room.on(RoomEvent.ParticipantDisconnected, syncRemotes);
      room.on(RoomEvent.TrackSubscribed, syncRemotes);
      room.on(RoomEvent.TrackUnsubscribed, syncRemotes);
      room.on(RoomEvent.TrackPublished, syncRemotes);
      room.on(RoomEvent.TrackUnpublished, syncRemotes);
      room.on(RoomEvent.TrackMuted, syncRemotes);
      room.on(RoomEvent.TrackUnmuted, syncRemotes);
      room.on(RoomEvent.Disconnected, () => { stopInterval(); setStatus("idle"); });

      await room.connect(url, token);
      try { await room.localParticipant.setMicrophoneEnabled(true); } catch {}
      try {
        await room.localParticipant.setCameraEnabled(true, {
          resolution: VideoPresets.h360.resolution,
        });
      } catch {}
      syncLocal();
      syncRemotes();

      stopInterval();
      intervalRef.current = setInterval(() => {
        syncLocal();
        syncRemotes();
      }, 2000);

      setStatus("connected");
    } catch (e) {
      console.error(e);
      setError("Не удалось подключиться к звонку");
      setStatus("idle");
    }
  }, [syncLocal, syncRemotes, stopInterval]);

  const leave = useCallback(async () => {
    stopInterval();
    await roomRef.current?.disconnect();
    roomRef.current = null;
    setLocalVideo(null);
    setRemotes([]);
    setMicOn(false);
    setCamOn(false);
    setScreenOn(false);
    setStatus("idle");
  }, [stopInterval]);

  // Ошибки больше не глотаем — кнопки покажут alert
  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    await room.localParticipant.setMicrophoneEnabled(!room.localParticipant.isMicrophoneEnabled);
    syncLocal();
  }, [syncLocal]);

  const toggleCam = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    await room.localParticipant.setCameraEnabled(!room.localParticipant.isCameraEnabled);
    syncLocal();
  }, [syncLocal]);

  const toggleScreen = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    await room.localParticipant.setScreenShareEnabled(!room.localParticipant.isScreenShareEnabled);
    syncLocal();
  }, [syncLocal]);

  useEffect(() => () => {
    stopInterval();
    roomRef.current?.disconnect();
  }, [stopInterval]);

  return {
    status, error, join, leave,
    toggleMic, toggleCam, toggleScreen,
    micOn, camOn, screenOn,
    localVideo, remotes,
  };
}

export type CallState = ReturnType<typeof useCall>;