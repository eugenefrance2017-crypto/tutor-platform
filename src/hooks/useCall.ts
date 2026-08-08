"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LocalTrack, RemoteTrack, Room, RoomEvent, Track, VideoPresets } from "livekit-client";

export interface RemoteInfo {
  sid: string;
  name: string;
  isMicOn: boolean;
  videoTrack?: RemoteTrack;
  audioTrack?: RemoteTrack;
}

export function useCall() {
  const roomRef = useRef<Room | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected">("idle");
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [localVideo, setLocalVideo] = useState<LocalTrack | null>(null);
  const [localAudio, setLocalAudio] = useState<LocalTrack | null>(null);
  const [remotes, setRemotes] = useState<RemoteInfo[]>([]);

  const syncLocal = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    let cam: LocalTrack | null = null;
    let mic: LocalTrack | null = null;
    let screen = false;
    room.localParticipant.trackPublications.forEach((pub) => {
      if (pub.track) {
        if (pub.source === Track.Source.Camera) cam = pub.track as LocalTrack;
        if (pub.source === Track.Source.Microphone) mic = pub.track as LocalTrack;
        if (pub.source === Track.Source.ScreenShare) screen = true;
      }
    });
    setLocalVideo(cam);
    setLocalAudio(mic);
    setMicOn(room.localParticipant.isMicrophoneEnabled);
    setCamOn(room.localParticipant.isCameraEnabled);
    setScreenOn(screen);
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
        if (pub.subscribed === false) pub.setSubscribed(true);
        if (pub.source === Track.Source.ScreenShare) {
          info.videoTrack = pub.track as RemoteTrack;
        } else if (pub.kind === Track.Kind.Video && !info.videoTrack) {
          info.videoTrack = pub.track as RemoteTrack;
        } else if (pub.kind === Track.Kind.Audio) {
          info.audioTrack = pub.track as RemoteTrack;
        }
      });
      list.push(info);
    });
    setRemotes(list);
  }, []);

  const join = useCallback(async (lessonId: string, identity: string, name: string, role: string) => {
    try {
      setStatus("connecting");
      setError(null);
      const res = await fetch(`/api/lessons/${lessonId}/call-token?identity=${encodeURIComponent(identity)}&name=${encodeURIComponent(name)}&role=${encodeURIComponent(role)}`);
      if (!res.ok) throw new Error("token failed");
      const { token, url } = await res.json();

      const room = new Room({ 
        adaptiveStream: true, 
        dynacast: true, 
        videoCaptureDefaults: { resolution: VideoPresets.h360.resolution } 
      });
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
      room.on(RoomEvent.Disconnected, () => { setStatus("idle"); });

      await room.connect(url, token);
      try { await room.localParticipant.setMicrophoneEnabled(true); } catch {}
      try { await room.localParticipant.setCameraEnabled(true, { resolution: VideoPresets.h360.resolution }); } catch {}

      syncLocal();
      syncRemotes();
      setStatus("connected");
    } catch (e) {
      console.error(e);
      setError("Не удалось подключиться");
      setStatus("idle");
    }
  }, [syncLocal, syncRemotes]);

  const leave = useCallback(async () => {
    await roomRef.current?.disconnect();
    roomRef.current = null;
    setLocalVideo(null);
    setLocalAudio(null);
    setRemotes([]);
    setMicOn(false);
    setCamOn(false);
    setScreenOn(false);
    setStatus("idle");
  }, []);

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
    const isEnabled = room.localParticipant.isScreenShareEnabled;
    if (!isEnabled) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 30 },
          audio: false,
        });
        const screenTrack = screenStream.getVideoTracks()[0];
        if (screenTrack) {
          await room.localParticipant.publishTrack(screenTrack, {
            source: Track.Source.ScreenShare,
            name: "screen",
          });
          screenTrack.onended = () => {
            room.localParticipant.unpublishTrack(screenTrack);
            syncLocal();
          };
          syncLocal();
        }
      } catch (err: any) {
        console.error("Screen share error:", err);
        if (err.name === "NotAllowedError") alert("Демонстрация экрана отменена");
        else if (err.name === "NotFoundError") alert("Демонстрация экрана не поддерживается на этом устройстве. Используйте компьютер.");
        else alert("Не удалось начать демонстрацию экрана: " + err.message);
      }
    } else {
      room.localParticipant.trackPublications.forEach((pub) => {
        if (pub.source === Track.Source.ScreenShare && pub.track) {
          room.localParticipant.unpublishTrack(pub.track);
        }
      });
      syncLocal();
    }
  }, [syncLocal]);

  useEffect(() => () => { roomRef.current?.disconnect(); }, []);

  return { 
    status, error, join, leave, 
    toggleMic, toggleCam, toggleScreen, 
    micOn, camOn, screenOn, 
    localVideo, localAudio, remotes 
  };
}

export type CallState = ReturnType<typeof useCall>;