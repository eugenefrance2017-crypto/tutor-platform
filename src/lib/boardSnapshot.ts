import { doc, getDoc } from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { app, db } from "@/lib/firebase";
import { Shape } from "@/lib/whiteboard";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

function polyline(ctx: CanvasRenderingContext2D, points: number[]) {
  ctx.beginPath();
  for (let i = 0; i < points.length; i += 2) {
    if (i === 0) ctx.moveTo(points[i], points[i + 1]);
    else ctx.lineTo(points[i], points[i + 1]);
  }
  ctx.stroke();
}

function arrowHead(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const len = 14;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - len * Math.cos(ang - Math.PI / 6), y2 - len * Math.sin(ang - Math.PI / 6));
  ctx.lineTo(x2 - len * Math.cos(ang + Math.PI / 6), y2 - len * Math.sin(ang + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

function drawShape(ctx: CanvasRenderingContext2D, s: Shape) {
  ctx.strokeStyle = s.stroke;
  ctx.lineWidth = s.strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  switch (s.type) {
    case "pen":
      polyline(ctx, s.points);
      break;
    case "marker":
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = s.strokeWidth * 2.5;
      polyline(ctx, s.points);
      ctx.globalAlpha = 1;
      break;
    case "line":
      ctx.beginPath();
      ctx.moveTo(s.start.x, s.start.y);
      ctx.lineTo(s.end.x, s.end.y);
      ctx.stroke();
      break;
    case "arrow":
      ctx.beginPath();
      ctx.moveTo(s.start.x, s.start.y);
      ctx.lineTo(s.end.x, s.end.y);
      ctx.stroke();
      arrowHead(ctx, s.start.x, s.start.y, s.end.x, s.end.y, s.stroke);
      break;
    case "rect":
      ctx.strokeRect(Math.min(s.x, s.x + s.width), Math.min(s.y, s.y + s.height), Math.abs(s.width), Math.abs(s.height));
      break;
    case "ellipse":
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, Math.max(1, s.radiusX), Math.max(1, s.radiusY), 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "triangle": {
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
        const px = s.x + s.radius * Math.cos(a);
        const py = s.y + s.radius * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case "star": {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? s.radius : s.radius / 2.5;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const px = s.x + r * Math.cos(a);
        const py = s.y + r * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case "text":
      ctx.fillStyle = s.stroke;
      ctx.font = `${s.fontSize}px sans-serif`;
      ctx.fillText(s.text, s.x, s.y + s.fontSize);
      break;
  }
}

export async function renderBoardSnapshot(lessonId: string): Promise<string | null> {
  const snap = await getDoc(doc(db, "lessons", lessonId, "board", "state"));
  if (!snap.exists()) return null;
  const data = snap.data();
  const shapes: Shape[] = Array.isArray(data.shapes) ? data.shapes : [];
  if (shapes.length === 0 && !data.bgUrl) return null;

  let bg: HTMLImageElement | null = null;
  if (typeof data.bgUrl === "string" && data.bgUrl) {
    try { bg = await loadImage(data.bgUrl); } catch { bg = null; }
  }

  const W = bg ? bg.width : 1600;
  const H = bg ? bg.height : 1000;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  if (bg) ctx.drawImage(bg, 0, 0);
  for (const s of shapes) drawShape(ctx, s);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const storage = getStorage(app);
  const r = ref(storage, `lesson_snapshots/${lessonId}-${Date.now()}.jpg`);
  await uploadString(r, dataUrl, "data_url");
  return await getDownloadURL(r);
}