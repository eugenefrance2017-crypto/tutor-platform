"use client";

import { useEffect, useRef, useState } from "react";
import { Layer, Line, Rect, Ellipse, Arrow, Text, Stage, Image as KonvaImage, RegularPolygon, Star, Circle as KonvaCircle, Group } from "react-konva";
import { Pt, Shape } from "@/lib/whiteboard";
import { WhiteboardState } from "@/hooks/useWhiteboard";

const MIN_SCALE = 0.1;
const MAX_SCALE = 5;

function getShapeBounds(s: Shape): { x: number; y: number; width: number; height: number } {
  switch (s.type) {
    case "pen": case "marker": {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i < s.points.length; i += 2) {
        minX = Math.min(minX, s.points[i]); minY = Math.min(minY, s.points[i + 1]);
        maxX = Math.max(maxX, s.points[i]); maxY = Math.max(maxY, s.points[i + 1]);
      }
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
    case "line": case "arrow": return { x: Math.min(s.start.x, s.end.x), y: Math.min(s.start.y, s.end.y), width: Math.abs(s.end.x - s.start.x), height: Math.abs(s.end.y - s.start.y) };
    case "rect": return { x: Math.min(s.x, s.x + s.width), y: Math.min(s.y, s.y + s.height), width: Math.abs(s.width), height: Math.abs(s.height) };
    case "ellipse": return { x: s.x - s.radiusX, y: s.y - s.radiusY, width: s.radiusX * 2, height: s.radiusY * 2 };
    case "triangle": case "star": return { x: s.x - s.radius, y: s.y - s.radius, width: s.radius * 2, height: s.radius * 2 };
    case "text": return { x: s.x, y: s.y - s.fontSize, width: s.text.length * s.fontSize * 0.6, height: s.fontSize };
  }
}

function SelectionBox({ s }: { s: Shape }) {
  const bounds = getShapeBounds(s);
  const padding = 8;
  return (
    <Rect x={bounds.x - padding} y={bounds.y - padding} width={bounds.width + padding * 2} height={bounds.height + padding * 2}
      stroke="#3b82f6" strokeWidth={2} dash={[5, 5]} listening={false} />
  );
}

function CursorNode({ cursor }: { cursor: { x: number; y: number; name: string; color: string } }) {
  return (
    <Group listening={false}>
      <KonvaCircle x={cursor.x} y={cursor.y} radius={4} fill={cursor.color} opacity={0.7} />
    </Group>
  );
}

function ShapeNode({ s, isSelected }: { s: Shape; isSelected?: boolean }) {
  const node = (() => {
    switch (s.type) {
      case "pen": return <Line points={s.points} stroke={s.stroke} strokeWidth={s.strokeWidth} lineCap="round" lineJoin="round" tension={0.3} />;
      case "marker": return <Line points={s.points} stroke={s.stroke} strokeWidth={s.strokeWidth * 2.5} opacity={0.4} lineCap="round" lineJoin="round" tension={0.3} />;
      case "line": return <Line points={[s.start.x, s.start.y, s.end.x, s.end.y]} stroke={s.stroke} strokeWidth={s.strokeWidth} lineCap="round" />;
      case "arrow": return <Arrow points={[s.start.x, s.start.y, s.end.x, s.end.y]} stroke={s.stroke} strokeWidth={s.strokeWidth} fill={s.stroke} pointerLength={12} pointerWidth={10} lineCap="round" />;
      case "rect": return <Rect x={Math.min(s.x, s.x + s.width)} y={Math.min(s.y, s.y + s.height)} width={Math.abs(s.width)} height={Math.abs(s.height)} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
      case "ellipse": return <Ellipse x={s.x} y={s.y} radiusX={s.radiusX} radiusY={s.radiusY} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
      case "triangle": return <RegularPolygon x={s.x} y={s.y} sides={3} radius={s.radius} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
      case "star": return <Star x={s.x} y={s.y} numPoints={5} innerRadius={s.radius / 2.5} radius={s.radius} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
      case "text": return <Text x={s.x} y={s.y} text={s.text} fontSize={s.fontSize} fill={s.stroke} />;
    }
  })();
  return (
    <>
      {node}
      {isSelected && <SelectionBox s={s} />}
    </>
  );
}

function LaserLines({ laserPoints, cursors }: { 
  laserPoints: Record<string, number[]>;
  cursors: Record<string, { x: number; y: number; name: string; color: string }>;
}) {
  return (
    <>
      {Object.entries(laserPoints).map(([userId, points]) => {
        if (points.length < 2) return null;
        const color = cursors[userId]?.color || "#ff0000";
        return (
          <Line
            key={userId}
            points={points}
            stroke={color}
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
            opacity={0.9}
            listening={false}
            shadowColor={color}
            shadowBlur={10}
          />
        );
      })}
    </>
  );
}

// 🔥 Компонент для отрисовки камеры в углу холста (PiP) во время записи
function CameraPiP({ stream, stageWidth, stageHeight, scale }: { 
  stream: MediaStream | null | undefined;
  stageWidth: number;
  stageHeight: number;
  scale: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!stream || !videoRef.current) return;
    videoRef.current.srcObject = stream;
    videoRef.current.muted = true;
    videoRef.current.play().catch(console.error);
    setVideoEl(videoRef.current);
  }, [stream]);

  if (!stream || !videoEl) return null;

  const width = 200;
  const height = 150;
  const x = (stageWidth / scale) - width - 20;
  const y = (stageHeight / scale) - height - 20;

  return (
    <>
      <video ref={videoRef} style={{ display: "none" }} />
      <KonvaImage 
        image={videoEl} 
        x={x} 
        y={y} 
        width={width} 
        height={height} 
        cornerRadius={12}
        shadowColor="black"
        shadowBlur={10}
        shadowOpacity={0.5}
        listening={false}
      />
    </>
  );
}

interface Props {
  wb: WhiteboardState;
  onStageReady?: (stage: any) => void;
  isRecording?: boolean;
  localVideoStream?: MediaStream | null;
}

export default function WhiteboardCanvas({ wb, onStageReady, isRecording, localVideoStream }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [mounted, setMounted] = useState(false);
  const [textPos, setTextPos] = useState<Pt | null>(null);
  const [textValue, setTextValue] = useState("");
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const panRef = useRef<Pt | null>(null);

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

  useEffect(() => {
    const currentUrl = wb.bgUrls[wb.currentBgPage];
    if (!currentUrl) { setBgImage(null); return; }
    const img = new Image();
    img.onload = () => setBgImage(img);
    img.src = currentUrl;
  }, [wb.bgUrls, wb.currentBgPage]);

  const getPos = (): Pt | null => {
    const stage = stageRef.current;
    const p = stage?.getPointerPosition();
    if (!stage || !p) return null;
    const s = stage.scaleX();
    const st = stage.position();
    return { x: (p.x - st.x) / s, y: (p.y - st.y) / s };
  };

  const handleDown = (e: any) => {
    if (e.evt.cancelable) e.evt.preventDefault();
    if (wb.tool === "hand") {
      const p = stageRef.current?.getPointerPosition();
      if (p) panRef.current = p;
      return;
    }
    const pt = getPos();
    if (!pt) return;
    if (wb.tool === "text") { setTextPos(pt); setTextValue(""); }
    else wb.start(pt);
  };

  const handleMove = () => {
    const pt = getPos();
    if (pt) wb.patchCursor(pt);
    if (wb.tool === "hand" && panRef.current) {
      const p = stageRef.current?.getPointerPosition();
      if (!p) return;
      const dx = p.x - panRef.current.x;
      const dy = p.y - panRef.current.y;
      panRef.current = p;
      setPos((old) => ({ x: old.x + dx, y: old.y + dy }));
      return;
    }
    if (pt) wb.move(pt);
  };

  const handleUp = () => { panRef.current = null; wb.end(); };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, oldScale * (1 + direction * 0.1)));
    const st = stage.position();
    const point = { x: (pointer.x - st.x) / oldScale, y: (pointer.y - st.y) / oldScale };
    setScale(newScale);
    setPos({ x: pointer.x - point.x * newScale, y: pointer.y - point.y * newScale });
  };

  const gridSize = 40 * scale;
  const offsetX = pos.x % gridSize;
  const offsetY = pos.y % gridSize;

  return (
    <div ref={containerRef}
      className="relative flex-1 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
      style={{ touchAction: "none", cursor: wb.tool === "hand" ? "grab" : wb.tool === "select" ? "default" : "crosshair" }}>

      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        <defs>
          <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse" x={offsetX} y={offsetY}>
            <circle cx={1} cy={1} r={1} fill="#d1d5db" opacity={0.5} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {mounted && size.w > 0 && (
        <Stage width={size.w} height={size.h} ref={stageRef}
          scaleX={scale} scaleY={scale} x={pos.x} y={pos.y}
          onWheel={handleWheel} onMouseDown={handleDown} onTouchStart={handleDown}
          onMouseMove={handleMove} onTouchMove={handleMove}
          onMouseUp={handleUp} onTouchEnd={handleUp} onMouseLeave={handleUp}
          style={{ position: "relative", zIndex: 1 }}>
          <Layer>
            {bgImage && <KonvaImage image={bgImage} x={0} y={0} width={bgImage.width} height={bgImage.height} listening={false} opacity={0.95} />}
            {wb.shapes.map((s) => <ShapeNode key={s.id} s={s} isSelected={s.id === wb.selectedId} />)}
            {wb.draft && <ShapeNode s={wb.draft} />}
            <LaserLines laserPoints={wb.laserPoints} cursors={wb.cursors} />
            {Object.entries(wb.cursors).map(([id, cursor]) => <CursorNode key={id} cursor={cursor} />)}
            {isRecording && (
              <CameraPiP 
                stream={localVideoStream} 
                stageWidth={size.w} 
                stageHeight={size.h} 
                scale={scale} 
              />
            )}
          </Layer>
        </Stage>
      )}

      {textPos && (
        <input autoFocus value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { wb.addText(textPos, textValue); setTextPos(null); } if (e.key === "Escape") setTextPos(null); }}
          onBlur={() => { wb.addText(textPos, textValue); setTextPos(null); }}
          placeholder="Текст + Enter"
          style={{ left: textPos.x * scale + pos.x, top: textPos.y * scale + pos.y }}
          className="absolute z-10 border border-indigo-400 rounded-lg px-2 py-1 text-sm outline-none bg-white" />
      )}
    </div>
  );
}