import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.pathname.split("/")[3] ?? "room";
  const identity = req.nextUrl.searchParams.get("identity") || "guest-" + Math.random().toString(36).slice(2, 6);
  const name = req.nextUrl.searchParams.get("name") || "Гость";
  const role = req.nextUrl.searchParams.get("role") || "student";

  const token = new AccessToken(process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!, {
    identity,
    name,
  });

  token.addGrant({
    room: `lesson-${id}`,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return NextResponse.json({ token: await token.toJwt(), url: process.env.LIVEKIT_URL, role });
}