"use client";

import dynamic from "next/dynamic";

// SSR off: Konva использует Canvas API, которого нет в Node
const WhiteboardCanvas = dynamic(
  () => import("@/components/WhiteboardCanvas"),
  { ssr: false }
);

export default WhiteboardCanvas;