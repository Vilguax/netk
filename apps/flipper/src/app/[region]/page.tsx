import { auth } from "@netk/auth";
import { redirect, notFound } from "next/navigation";
import { REGIONS } from "@netk/types";
import { getThemeForRegion } from "@netk/themes";
import { RegionScanner } from "./scanner";

interface PageProps {
  params: Promise<{ region: string }>;
}

// Gateway URL for login redirect
const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:3000";

export default async function RegionPage({ params }: PageProps) {
  const { region } = await params;
  const session = await auth();

  if (!session) {
    // Redirect to Gateway login
    redirect(`${GATEWAY_URL}/login`);
  }

  const regionData = REGIONS[region];
  if (!regionData) {
    notFound();
  }

  const theme = getThemeForRegion(region);

  return (
    <RegionScanner
      region={regionData}
      theme={theme}
      characterName={session.user?.name || "Pilote"}
      gatewayUrl={GATEWAY_URL}
    />
  );
}

export function generateStaticParams() {
  return Object.keys(REGIONS).map((region) => ({ region }));
}
