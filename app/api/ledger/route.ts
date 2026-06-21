/**
 * app/api/ledger/route.ts
 * Fiducia Centrale — Ledger Read API (Stratum-06)
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json(
      { error: "Server misconfiguration: Supabase environment variables are missing." },
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
    // ── CASE 1: Single row lookup ──
    if (singleId) {
      const { data: entry, error } = await supabase
        .from("ledger_entries")
        .select("*")
        .eq("id", singleId)
        .maybeSingle();

      if (error) throw error;
      if (!entry) {
        return NextResponse.json({ error: "Entry not found" }, { status: 404 });
      }

      // Reconstruct the nested format the frontend expects
      const formattedEntry = {
        id: entry.id,
        type: entry.type,
        timestamp: entry.timestamp,
        hash: entry.hash,
        actor: {
          id: entry.actor_id,
          stratum: entry.stratum
        },
        payload: entry.payload,
        constraints: entry.constraints,
        references: entry.references_data
      };

      return NextResponse.json(formattedEntry, {
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }

    // ── CASE 2: High-performance list lookup ──
    let query = supabase
      .from("ledger_entries")
      .select("*", { count: "exact" });

    if (typeFilter) {
      query = query.eq("type", typeFilter);
    }
    if (stratumFilter) {
      query = query.eq("stratum", stratumFilter);
    }

    const { data: entries, error, count } = await query
      .order("timestamp", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Map the database rows back to the nested JSON structure expected by the UI
    const formattedEntries = (entries || []).map((entry: any) => ({
      id: entry.id,
      type: entry.type,
      timestamp: entry.timestamp,
      hash: entry.hash,
      actor: {
        id: entry.actor_id,
        stratum: entry.stratum
      },
      payload: entry.payload,
      constraints: entry.constraints,
      references: entry.references_data
    }));

    return NextResponse.json(formattedEntries, {
      headers: {
        "X-Total-Count": String(count ?? 0),
        "X-Ledger-Size": String(count ?? 0),
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: any) {
    console.error("[ledger/GET] Error:", err.message);
    return NextResponse.json({ error: err.message || "Failed to query ledger state" }, { status: 500 });
  }
}

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