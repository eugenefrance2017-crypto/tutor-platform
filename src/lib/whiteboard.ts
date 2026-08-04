// Типы и утилиты доски

export interface Pt {
  x: number;
  y: number;
}

export type Tool = "pen" | "eraser" | "line" | "arrow" | "rect" | "ellipse" | "text";

interface Base {
  id: string;
  stroke: string;
  strokeWidth: number;
}

export interface PenShape extends Base { type: "pen"; points: number[] }
export interface LineShape extends Base { type: "line"; start: Pt; end: Pt }
export interface ArrowShape extends Base { type: "arrow"; start: Pt; end: Pt }
export interface RectShape extends Base { type: "rect"; x: number; y: number; width: number; height: number }
export interface EllipseShape extends Base { type: "ellipse"; x: number; y: number; radiusX: number; radiusY: number }
export interface TextShape extends Base { type: "text"; x: number; y: number; text: string; fontSize: number }

export type Shape = PenShape | LineShape | ArrowShape | RectShape | EllipseShape | TextShape;

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const dist2 = (ax: number, ay: number, bx: number, by: number) => (ax - bx) ** 2 + (ay - by) ** 2;

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const l2 = dist2(x1, y1, x2, y2);
  if (l2 === 0) return Math.sqrt(dist2(px, py, x1, y1));
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt(dist2(px, py, x1 + t * (x2 - x1), y1 + t * (y2 - y1)));
}

// Проверка попадания точки в фигуру (для ластика)
export function hitTest(s: Shape, x: number, y: number, r: number): boolean {
  switch (s.type) {
    case "pen": {
      for (let i = 0; i < s.points.length - 2; i += 2) {
        if (distToSegment(x, y, s.points[i], s.points[i + 1], s.points[i + 2], s.points[i + 3]) < r + s.strokeWidth) return true;
      }
      return false;
    }
    case "line":
    case "arrow":
      return distToSegment(x, y, s.start.x, s.start.y, s.end.x, s.end.y) < r + s.strokeWidth;
    case "rect": {
      const x1 = Math.min(s.x, s.x + s.width) - r;
      const x2 = Math.max(s.x, s.x + s.width) + r;
      const y1 = Math.min(s.y, s.y + s.height) - r;
      const y2 = Math.max(s.y, s.y + s.height) + r;
      return x >= x1 && x <= x2 && y >= y1 && y <= y2;
    }
    case "ellipse": {
      const rx = Math.abs(s.radiusX) + r;
      const ry = Math.abs(s.radiusY) + r;
      if (rx === 0 || ry === 0) return false;
      return ((x - s.x) ** 2) / (rx * rx) + ((y - s.y) ** 2) / (ry * ry) <= 1;
    }
    case "text": {
      const w = s.text.length * s.fontSize * 0.6 + r;
      const h = s.fontSize + r;
      return x >= s.x - r && x <= s.x + w && y >= s.y - r && y <= s.y + h;
    }
  }
}