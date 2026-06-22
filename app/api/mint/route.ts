/**
 * app/api/mint/route.ts
 * Fiducia Centrale — Ledger Write API (Stratum-07)
 *
 * POST /api/mint
 * Registers a new entry to the immutable provenance ledger via Supabase.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { supabase } from "@/lib/supabase";
import {
  canPerform,
  type ActionToken,
  type StratumCode,
} from "../../../lib/authority";

const SYS_TOKEN = process.env.FIDUCIA_SYS_TOKEN!;

// ── Hashing ───────────────────────────────────────────────────────────────────
function hashEntry(entry: Record<string, unknown>): string {
  const { entry_hash: _h, prev_entry_hash: _p, ...content } = entry;
  void _h; void _p;
  const canonical = JSON.stringify(content, Object.keys(content).sort());
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

function hashDocument(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // ── 1. Env check ─────────────────────────────────────────────────────────
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !SYS_TOKEN) {
    return NextResponse.json(
      { error: "Server misconfiguration: Database environment or system tokens are missing." },
      { status: 500 }
    );
  }

  // ── 2. Authentication ─────────────────────────────────────────────────────
  const callerToken = req.headers.get("X-Fiducia-Token") ?? req.headers.get("x-fiducia-token");
  if (!callerToken || callerToken !== SYS_TOKEN) {
    return NextResponse.json(
      { error: "Unauthorised: missing or invalid X-Fiducia-Token." },
      { status: 401 }
    );
  }

  // ── 3. Parse body ─────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // ── 4. Required field validation ──────────────────────────────────────────
  const actionToken = (body?.action as Record<string, unknown> | undefined)?.token as ActionToken | undefined;
  const stratumCode = ((body?.action as Record<string, unknown> | undefined)?.stratum ?? 
                       (body?.authority as Record<string, unknown> | undefined)?.stratum) as StratumCode | undefined;
  const entryId = body?.id as string | undefined;

  if (!entryId || !actionToken || !stratumCode) {
    return NextResponse.json({ error: "Entry must contain a valid id, action.token, and stratum designation." }, { status: 400 });
  }

  try {
    // ── 5. Uniqueness Check & Sequence Calculation via Postgres ───────────
    const { data: existingCheck, error: checkError } = await supabase
      .from("ledger_entries")
      .select("id")
      .eq("id", entryId)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existingCheck) {
      return NextResponse.json(
        { error: "Immutability violation", detail: `Entry ID '${entryId}' already exists in the ledger.` },
        { status: 409 }
      );
    }

    // Grab total rows to figure out sequence positioning and head hash
    const { count: ledgerLength, error: countError } = await supabase
      .from("ledger_entries")
      .select("*", { count: "exact", head: true });

    if (countError) throw countError;
    const isBootstrap = (ledgerLength ?? 0) === 0;

    // Fetch the HEAD entry to chain hashes
    const { data: headRow, error: headError } = await supabase
      .from("ledger_entries")
      .select("hash")
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (headError) throw headError;
    const prevHash = headRow?.hash ?? "GENESIS";
    const sequence = (ledgerLength ?? 0) + 1;

    // ── 6. Authority enforcement ──────────────────────────────────────────
    const authResult = canPerform(stratumCode, actionToken, isBootstrap);
    if (!authResult.allowed) {
      return NextResponse.json(
        { error: "Authority enforcement failure", detail: authResult.reason },
        { status: 403 }
      );
    }

    // ── 7. Build the canonical entry ──────────────────────────────────────────
    const legal = body.legal as Record<string, unknown> | undefined;
    if (legal?.doc_hash && typeof legal.doc_hash === "string") {
      if (!/^[0-9a-f]{64}$/i.test(legal.doc_hash)) {
        legal.doc_hash = hashDocument(legal.doc_hash);
      }
    }

    const serverTimestamp = new Date().toISOString();
    const entryData: Record<string, unknown> = {
      ...body,
      legal,
      upstream_refs: body.upstream_refs ?? [],
      server_timestamp: serverTimestamp,
      sequence,
      prev_entry_hash: prevHash,
      authority_verified: true,
      authority_model_version: "1.0.0",
      entry_hash: "", 
    };

    entryData.entry_hash = hashEntry(entryData);

    // ── 8. Write to Supabase Table ───────────────────────────────────────────
    const { error: insertError } = await supabase
      .from("ledger_entries")
      .insert([
        {
          id: entryId,
          type: actionToken,
          stratum: stratumCode,
          actor_id: (body?.actor as Record<string, unknown> | undefined)?.id ?? "system-mint",
          payload: entryData,
          hash: entryData.entry_hash,
          timestamp: serverTimestamp
        }
      ]);

    if (insertError) throw insertError;

    return NextResponse.json(
      {
        ok: true,
        id: entryId,
        sequence,
        entry_hash: entryData.entry_hash,
        prev_entry_hash: prevHash,
        server_timestamp: serverTimestamp,
        authority_verified: true,
      },
      { status: 201 }
    );

  } catch (err: any) {
    console.error("[ledger/mint/POST] Error:", err.message);
    return NextResponse.json({ error: err.message || "Failed to execute mint transaction" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Fiducia-Token",
    },
  });
}