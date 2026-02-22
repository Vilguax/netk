import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { status: "online", app: "appraisal" },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      },
    }
  );
}
