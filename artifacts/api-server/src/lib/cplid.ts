import { db, transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateRandom(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return result;
}

export async function generateUniqueCplid(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `BKT-${generateRandom(8)}`;
    const existing = await db
      .select({ id: transactionsTable.id })
      .from(transactionsTable)
      .where(eq(transactionsTable.cplid, candidate))
      .limit(1);
    if (existing.length === 0) return candidate;
  }
  // Fallback with timestamp component
  return `BKT-${Date.now().toString(36).toUpperCase().slice(-8)}`;
}

export function generateReferenceNumber(): string {
  return `REF-${Date.now()}-${generateRandom(4)}`;
}
