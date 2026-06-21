/**
 * app/api/ledger/route.ts
 * Fiducia Centrale — Ledger Read API (Stratum-06)
 *
 * GET /api/ledger
 * Returns all ledger entries, newest-first.
 * Optional query params:
 * ?type=MINT_FDC           — filter by action token
 * ?stratum=07-Hereditary   — filter by stratum
 * ?limit=50                — max entries to return (default: 500)
 * ?offset=0                — pagination offset
 *
 * GET /api/ledger?id=entry-xxx
 * Returns a single entry by ID.
 *
 * No auth required for reads — the ledger is publicly auditable by design. * This is intentional: a provenance ledger that requires auth to read
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function GET(req: NextRequest) {
  // Check that Supabase variables are injected
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json(
      {
        error:
          "Server misconfiguration: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. " +
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
    // ── CASE 1: Single-entry lookup by ID ──
    if (singleId) {
      const { data: entry, error } = await supabase
        .from("ledger_entries")
        .select("*")
        .eq("id", singleId)
        .maybeSingle(); // Optimized single row database query

      if (error) throw error;
      if (!entry) {
        return NextResponse.json({ error: "Entry not found" }, { status: 404 });
      }
      return NextResponse.json(entry, {
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }

    // ── CASE 2: List lookup with server-side filtering ──
    // We start a native SQL query builder query on the database
    let query = supabase
      .from("ledger_entries")
      .select("*", { count: "exact" }); // Grabs the total counts safely

    // Server-side filtering rather than parsing arrays in application memory
    if (typeFilter) {
      query = query.eq("type", typeFilter);
    }
    if (stratumFilter) {
      query = query.eq("stratum", stratumFilter);
    }

    // Apply native database pagination and reverse-chronological ordering
    const { data: entries, error, count } = await query
      .order("timestamp", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json(entries, {
      headers: {
        "X-Total-Count": String(count ?? 0),
        "X-Ledger-Size": String(count ?? 0),
        "Access-Control-Allow-Origin": "*", // Publicly auditable
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