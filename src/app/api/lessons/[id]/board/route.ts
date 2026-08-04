import { NextRequest, NextResponse } from "next/server";

// ВРЕМЕННОЕ хранилище (in-memory).
// TODO (шаг 4): заменить на твою БД (Prisma/Drizzle/Mongo).
const store = new Map<string, unknown>();

function getLessonId(req: NextRequest): string {
  // /api/lessons/[id]/board
  return req.nextUrl.pathname.split("/")[3] ?? "unknown";
}

export async function GET(req: NextRequest) {
  const id = getLessonId(req);
  return NextResponse.json({ shapes: store.get(id) ?? [] });
}

export async function POST(req: NextRequest) {
  const id = getLessonId(req);
  const shapes = await req.json();
  store.set(id, shapes);
  return NextResponse.json({ ok: true });
}