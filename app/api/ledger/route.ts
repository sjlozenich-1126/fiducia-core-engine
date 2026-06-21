/**
 * app/api/ledger/route.ts
 * Fiducia Centrale — Ledger Read + Write API (Stratum-06)
 * Backed by Supabase Postgres. Matches the nested schema used by app/page.tsx.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Fiducia-Token",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function rowToEntry(row: any) {
  return {
    id: row.id,
    timestamp: row.timestamp,
    asset: {
      id: row.asset_id,
      type: row.asset_type,
      label: row.asset_label,
    },
    action: {
      token: row.action_token,
      stratum: row.action_stratum,
      reason: row.action_reason,
    },
    parties: {
      issuer: row.issuer,
      from: row.party_from,
      to: row.party_to,
    },
    instrument: {
      type: row.instrument_type,
      unit: row.instrument_unit,
      amount: row.instrument_amount,
    },
    legal: {
      jurisdiction: row.jurisdiction,
      forum: row.forum,
      upstream_refs: row.upstream_refs || [],
      doc_hash: row.doc_hash,
    },
    authority: {
      stratum: row.authority_stratum,
      tier: row.authority_tier,
      level: row.authority_level,
    },
    policy: {
      gdr_index_delta: row.gdr_index_delta,
    },
    metadata: {
      tags: row.tags || [],
      notes: row.notes,
      version: row.version,
    },
    chain_hash: row.chain_hash,
    prev_hash: row.prev_hash,
    _synced: true,
    _local: false,
  };
}

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json(
      { error: "Server misconfiguration: Supabase environment variables are missing." },
      { status: 500, headers: CORS }
    );
  }

  try {
    const { data, error } = await supabase
      .from("ledger_entries")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(1000);

    if (error) throw error;

    const entries = (data || []).map(rowToEntry);
    return NextResponse.json(entries, { headers: CORS });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to query ledger state" },
      { status: 500, headers: CORS }
    );
  }
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-fiducia-token");
  if (token !== process.env.FIDUCIA_SYS_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
  }

  try {
    const body = await req.json();

    const row = {
      id: body.id,
      timestamp: body.timestamp || new Date().toISOString(),

      asset_id: body.asset?.id ?? null,
      asset_type: body.asset?.type ?? null,
      asset_label: body.asset?.label ?? null,

      action_token: body.action?.token,
      action_stratum: body.action?.stratum ?? null,
      action_reason: body.action?.reason ?? null,

      issuer: body.parties?.issuer ?? null,
      party_from: body.parties?.from ?? null,
      party_to: body.parties?.to ?? null,

      instrument_type: body.instrument?.type ?? null,
      instrument_unit: body.instrument?.unit ?? null,
      instrument_amount: body.instrument?.amount ?? null,

      jurisdiction: body.legal?.jurisdiction ?? null,
      forum: body.legal?.forum ?? null,
      upstream_refs: body.legal?.upstream_refs ?? [],
      doc_hash: body.legal?.doc_hash ?? null,

      authority_stratum: body.authority?.stratum ?? null,
      authority_tier: body.authority?.tier ?? null,
      authority_level: body.authority?.level ?? null,

      gdr_index_delta: body.policy?.gdr_index_delta ?? null,

      tags: body.metadata?.tags ?? [],
      notes: body.metadata?.notes ?? null,
      version: body.metadata?.version ?? "1.0",

      chain_hash: body.chain_hash ?? null,
      prev_hash: body.prev_hash ?? null,
    };

    const { data, error } = await supabase
      .from("ledger_entries")
      .insert([row])
      .select();

    if (error) throw error;

    return NextResponse.json(
      { ok: true, id: body.id, entry: rowToEntry(data[0]) },
      { headers: CORS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to write entry" },
      { status: 500, headers: CORS }
    );
  }
}