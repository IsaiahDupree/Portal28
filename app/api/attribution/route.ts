import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const data = await req.json().catch(() => ({}));
  const res = NextResponse.json({ ok: true });

  res.cookies.set("p28_attrib", JSON.stringify(data), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  return res;
}
