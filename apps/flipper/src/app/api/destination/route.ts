import { NextResponse } from "next/server";
import { auth } from "@netk/auth";
import { enforceMaxBodySize, enforceRateLimit, ensureCsrf } from "@netk/auth/security";

export async function POST(request: Request) {
  const csrfError = ensureCsrf(request);
  if (csrfError) return csrfError;

  const bodyTooLarge = enforceMaxBodySize(request, 8 * 1024);
  if (bodyTooLarge) return bodyTooLarge;

  const rateLimitError = await enforceRateLimit(request, {
    bucket: "flipper:destination",
    limit: 30,
    windowSeconds: 60,
  });
  if (rateLimitError) return rateLimitError;

  const session = await auth();
  const accessToken = (session as unknown as { accessToken?: string } | null)
    ?.accessToken;

  if (!accessToken) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const destinationId = body?.destinationId;

    if (
      destinationId === undefined ||
      destinationId === null ||
      typeof destinationId !== "number" ||
      !Number.isInteger(destinationId) ||
      destinationId <= 0
    ) {
      return NextResponse.json({ error: "destinationId invalide" }, { status: 400 });
    }

    const esiUrl = new URL("https://esi.evetech.net/latest/ui/autopilot/waypoint/");
    esiUrl.searchParams.set("add_to_beginning", "false");
    esiUrl.searchParams.set("clear_other_waypoints", "true");
    esiUrl.searchParams.set("destination_id", destinationId.toString());
    esiUrl.searchParams.set("datasource", "tranquility");

    const response = await fetch(esiUrl.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ESI waypoint error:", response.status, errorText);

      if (response.status === 403) {
        return NextResponse.json(
          { error: "Scope manquant - reconnectez-vous" },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: "Impossible de définir la destination" },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Destination error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
