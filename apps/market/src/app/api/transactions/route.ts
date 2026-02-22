import { NextResponse } from "next/server";
import { auth } from "@netk/auth";
import { getCharacterAccessToken, getUserCharacters } from "@netk/auth/eve";
import { prisma } from "@netk/database";
import { esi } from "@netk/eve-api";

/**
 * GET /api/transactions
 *
 * Fetches wallet transactions for the user's EVE characters.
 * Syncs from ESI to DB, then returns from DB.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const characters = await getUserCharacters(session.user.id);
    if (characters.length === 0) {
      return NextResponse.json({ transactions: [], characters: [] });
    }

    const allTransactions: Array<{
      transactionId: number;
      typeId: number;
      typeName: string;
      quantity: number;
      unitPrice: number;
      total: number;
      isBuy: boolean;
      stationId: number;
      stationName: string;
      date: string;
      characterId: string;
      characterName: string;
    }> = [];

    const characterResults: Array<{
      characterId: string;
      characterName: string;
      status: "ok" | "no_token" | "error";
      transactionCount: number;
    }> = [];

    for (const char of characters) {
      const charIdStr = char.characterId.toString();

      const accessToken = await getCharacterAccessToken(char.characterId);
      if (!accessToken) {
        characterResults.push({
          characterId: charIdStr,
          characterName: char.characterName,
          status: "no_token",
          transactionCount: 0,
        });
        continue;
      }

      try {
        const esiTransactions = await esi.getCharacterWalletTransactions(
          Number(char.characterId),
          accessToken
        );

        // Sync to DB: upsert each transaction
        for (const tx of esiTransactions) {
          await prisma.marketTransaction.upsert({
            where: { transactionId: BigInt(tx.transaction_id) },
            update: {},
            create: {
              characterId: char.characterId,
              transactionId: BigInt(tx.transaction_id),
              typeId: tx.type_id,
              quantity: tx.quantity,
              unitPrice: tx.unit_price,
              isBuy: tx.is_buy,
              stationId: BigInt(tx.location_id),
              journalRefId: BigInt(tx.journal_ref_id),
              date: new Date(tx.date),
            },
          });
        }

        // Resolve type names
        const typeIds = [...new Set(esiTransactions.map((t) => t.type_id))];
        const typeNames = await prisma.eveType.findMany({
          where: { id: { in: typeIds } },
          select: { id: true, name: true },
        });
        const typeNameMap = new Map(typeNames.map((t) => [t.id, t.name]));

        // Resolve location names
        const locationIds = [...new Set(esiTransactions.map((t) => t.location_id))];
        const locationNameMap = new Map<number, string>();
        for (const locId of locationIds) {
          const name = await esi.getLocationName(locId, accessToken);
          locationNameMap.set(locId, name);
        }

        for (const tx of esiTransactions) {
          allTransactions.push({
            transactionId: tx.transaction_id,
            typeId: tx.type_id,
            typeName: typeNameMap.get(tx.type_id) || `Type #${tx.type_id}`,
            quantity: tx.quantity,
            unitPrice: tx.unit_price,
            total: tx.quantity * tx.unit_price,
            isBuy: tx.is_buy,
            stationId: tx.location_id,
            stationName: locationNameMap.get(tx.location_id) || `Location #${tx.location_id}`,
            date: tx.date,
            characterId: charIdStr,
            characterName: char.characterName,
          });
        }

        characterResults.push({
          characterId: charIdStr,
          characterName: char.characterName,
          status: "ok",
          transactionCount: esiTransactions.length,
        });
      } catch (error) {
        console.error(`[Transactions] ESI error for ${char.characterName}:`, error);
        characterResults.push({
          characterId: charIdStr,
          characterName: char.characterName,
          status: "error",
          transactionCount: 0,
        });
      }
    }

    // Sort by date descending (most recent first)
    allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      transactions: allTransactions,
      characters: characterResults,
      totalTransactions: allTransactions.length,
      totalBuys: allTransactions.filter((t) => t.isBuy).length,
      totalSells: allTransactions.filter((t) => !t.isBuy).length,
    });
  } catch (error) {
    console.error("[Transactions] Error:", error);
    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}
