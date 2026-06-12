/**
 * app/api/ledger/route.ts
 * Fiducia Centrale — Ledger Read API (Stratum-06)
 *
 * GET /api/ledger
 *   Returns all ledger entries, newest-first.
 *   Optional query params:
 *     ?type=MINT_FDC           — filter by action token
 *     ?stratum=07-Hereditary   — filter by stratum
 *     ?limit=50                — max entries to return (default: 500)
 *     ?offset=0                — pagination offset
 *
 * GET /api/ledger?id=entry-xxx
 *   Returns a single entry by ID.
 *
 * No auth required for reads — the ledger is publicly auditable by design.
 * This is intentional: a provenance ledger that requires auth to read
 * is not a provenance ledger.
 */

import { NextRequest, NextResponse } from "next/server";

// ── Upstash REST helpers ──────────────────────────────────────────────────────
// We use plain fetch() — no @upstash/redis package needed.
// The REST API is: POST {UPSTASH_REDIS_REST_URL}  with Bearer token.

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL!;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;
const LEDGER_KEY = "fiducia:ledger:entries"; // Redis list key

async function redisCommand<T = unknown>(
  ...args: (string | number)[]
): Promise<T> {
  const res = await fetch(REDIS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Redis error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as { result: T; error?: string };
  if (json.error) throw new Error(`Redis error: ${json.error}`);
  return json.result;
}

// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Verify env vars are present — give a clear error rather than a cryptic Redis fail
  if (!REDIS_URL || !REDIS_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Server misconfiguration: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set. " +
          "Add both to your Vercel environment variables and redeploy.",
      },
      { status: 500 }
    );
  }

  const { searchParams } = req.nextUrl;
  const singleId = searchParams.get("id");
  const typeFilter = searchParams.get("type");
  const stratumFilter = searchParams.get("stratum");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "500"), 1000);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  try {
    // LRANGE returns the list from index 0 to end.
    // We store newest entries at the HEAD (LPUSH), so index 0 = newest.
    const raw = await redisCommand<string[]>("LRANGE", LEDGER_KEY, 0, -1);

    // Parse all entries
    const all = raw
      .map((item) => {
        try {
          return JSON.parse(item);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    // Single-entry lookup
    if (singleId) {
      const entry = all.find((e) => e.id === singleId);
      if (!entry) {
        return NextResponse.json({ error: "Entry not found" }, { status: 404 });
      }
      return NextResponse.json(entry);
    }

    // Filter
    let filtered = all;
    if (typeFilter) {
      filtered = filtered.filter((e) => e.action?.token === typeFilter);
    }
    if (stratumFilter) {
      filtered = filtered.filter(
        (e) =>
          e.action?.stratum === stratumFilter ||
          e.authority?.stratum === stratumFilter
      );
    }

    // Paginate
    const page = filtered.slice(offset, offset + limit);

    return NextResponse.json(page, {
      headers: {
        "X-Total-Count": String(filtered.length),
        "X-Ledger-Size": String(all.length),
        // Public auditable ledger — allow cross-origin reads
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ledger/GET]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── OPTIONS (CORS preflight) ──────────────────────────────────────────────────
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}