"use client";

import { useEffect, useRef, useState } from "react";
import { Layer, Line, Rect, Ellipse, Arrow, Text, Stage } from "react-konva";
import { Pt, Shape } from "@/lib/whiteboard";
import { WhiteboardState } from "@/hooks/useWhiteboard";

function ShapeNode({ s }: { s: Shape }) {
  switch (s.type) {
    case "pen":
      return <Line points={s.points} stroke={s.stroke} strokeWidth={s.strokeWidth} lineCap="round" lineJoin="round" tension={0.3} />;
    case "line":
      return <Line points={[s.start.x, s.start.y, s.end.x, s.end.y]} stroke={s.stroke} strokeWidth={s.strokeWidth} lineCap="round" />;
    case "arrow":
      return <Arrow points={[s.start.x, s.start.y, s.end.x, s.end.y]} stroke={s.stroke} strokeWidth={s.strokeWidth} fill={s.stroke} pointerLength={12} pointerWidth={10} lineCap="round" />;
    case "rect":
      return <Rect x={Math.min(s.x, s.x + s.width)} y={Math.min(s.y, s.y + s.height)} width={Math.abs(s.width)} height={Math.abs(s.height)} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
    case "ellipse":
      return <Ellipse x={s.x} y={s.y} radiusX={s.radiusX} radiusY={s.radiusY} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
    case "text":
      return <Text x={s.x} y={s.y} text={s.text} fontSize={s.fontSize} fill={s.stroke} />;
  }
}

interface Props {
  wb: WhiteboardState;
  onStageReady?: (stage: any) => void;
}

export default function WhiteboardCanvas({ wb, onStageReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [mounted, setMounted] = useState(false);
  const [textPos, setTextPos] = useState<Pt | null>(null);
  const [textValue, setTextValue] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (mounted && stageRef.current) onStageReady?.(stageRef.current);
  }, [mounted, size, onStageReady]);

  const getPos = (): Pt | null => {
    const p = stageRef.current?.getPointerPosition();
    return p ? { x: p.x, y: p.y } : null;
  };

  const handleDown = (e: any) => {
    e.evt.preventDefault();
    const pt = getPos();
    if (!pt) return;
    if (wb.tool === "text") {
      setTextPos(pt);
      setTextValue("");
    } else {
      wb.start(pt);
    }
  };

  const handleMove = () => {
    const pt = getPos();
    if (pt) wb.move(pt);
  };

  return (
    <div ref={containerRef} className="relative flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ touchAction: "none" }}>
      {mounted && size.w > 0 && (
        <Stage
          width={size.w}
          height={size.h}
          ref={stageRef}
          onMouseDown={handleDown}
          onTouchStart={handleDown}
          onMouseMove={handleMove}
          onTouchMove={handleMove}
          onMouseUp={wb.end}
          onTouchEnd={wb.end}
          onMouseLeave={wb.end}
        >
          <Layer>
            {wb.shapes.map((s) => <ShapeNode key={s.id} s={s} />)}
            {wb.draft && <ShapeNode s={wb.draft} />}
          </Layer>
        </Stage>
      )}

      {textPos && (
        <input
          autoFocus
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { wb.addText(textPos, textValue); setTextPos(null); }
            if (e.key === "Escape") setTextPos(null);
          }}
          onBlur={() => { wb.addText(textPos, textValue); setTextPos(null); }}
          placeholder="Текст + Enter"
          style={{ left: textPos.x, top: textPos.y }}
          className="absolute z-10 border border-indigo-400 rounded-lg px-2 py-1 text-sm outline-none bg-white"
        />
      )}
    </div>
  );
}