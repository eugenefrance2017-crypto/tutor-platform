export type Pt = { x: number; y: number };

export type Tool =
  | "select" | "pen" | "marker" | "eraser" | "hand" | "laser"
  | "line" | "arrow"
  | "rect" | "ellipse" | "triangle" | "star"
  | "text";

type Base = { id: string; stroke: string; strokeWidth: number };

export type Shape =
  | (Base & { type: "pen"; points: number[] })
  | (Base & { type: "marker"; points: number[] })
  | (Base & { type: "line"; start: Pt; end: Pt })
  | (Base & { type: "arrow"; start: Pt; end: Pt })
  | (Base & { type: "rect"; x: number; y: number; width: number; height: number })
  | (Base & { type: "ellipse"; x: number; y: number; radiusX: number; radiusY: number })
  | (Base & { type: "triangle"; x: number; y: number; radius: number })
  | (Base & { type: "star"; x: number; y: number; radius: number })
  | (Base & { type: "text"; x: number; y: number; text: string; fontSize: number });

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function hitTest(s: Shape, x: number, y: number, pad = 8): boolean {
  switch (s.type) {
    case "pen":
    case "marker": {
      const r = (pad + s.strokeWidth) ** 2;
      for (let i = 0; i < s.points.length; i += 2) {
        const dx = s.points[i] - x;
        const dy = s.points[i + 1] - y;
        if (dx * dx + dy * dy <= r) return true;
      }
      return false;
    }
    case "line":
    case "arrow": {
      const l2 = (s.end.x - s.start.x) ** 2 + (s.end.y - s.start.y) ** 2;
      if (l2 === 0) return Math.hypot(x - s.start.x, y - s.start.y) <= pad;
      let t = ((x - s.start.x) * (s.end.x - s.start.x) + (y - s.start.y) * (s.end.y - s.start.y)) / l2;
      t = Math.max(0, Math.min(1, t));
      const px = s.start.x + t * (s.end.x - s.start.x);
      const py = s.start.y + t * (s.end.y - s.start.y);
      return Math.hypot(x - px, y - py) <= pad + s.strokeWidth;
    }
    case "rect": {
      const x1 = Math.min(s.x, s.x + s.width), x2 = Math.max(s.x, s.x + s.width);
      const y1 = Math.min(s.y, s.y + s.height), y2 = Math.max(s.y, s.y + s.height);
      return x >= x1 - pad && x <= x2 + pad && y >= y1 - pad && y <= y2 + pad;
    }
    case "ellipse": {
      const dx = (x - s.x) / (s.radiusX + pad);
      const dy = (y - s.y) / (s.radiusY + pad);
      return dx * dx + dy * dy <= 1;
    }
    case "triangle":
    case "star":
      return Math.hypot(x - s.x, y - s.y) <= s.radius + pad;
    case "text":
      return x >= s.x - pad && x <= s.x + s.text.length * s.fontSize * 0.6 + pad && y >= s.y - s.fontSize && y <= s.y + pad;
  }
}