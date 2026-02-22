import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { status: "online", app: "rock-radar" },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      },
    }
  );
}
