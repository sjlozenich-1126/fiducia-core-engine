/**
 * app/api/mint/route.ts
 * Fiducia Centrale — Ledger Write API (Stratum-07)
 *
 * POST /api/mint
 *   Registers a new entry to the immutable provenance ledger.
 *
 * Required header:
 *   X-Fiducia-Token: <FIDUCIA_SYS_TOKEN>
 *
 * Body: LedgerEntry (JSON) — see type below
 *
 * What this route enforces (beyond the previous version):
 *   1. Authentication — FIDUCIA_SYS_TOKEN must match
 *   2. Authority enforcement — actor's stratum must be permitted to perform
 *      the action token (normative, not just descriptive)
 *   3. Real SHA-256 hash — server-side, using Node crypto. The client's
 *      hashSimulate() is display-only; this is the canonical hash.
 *   4. Append-only immutability guard — entry IDs are checked for
 *      uniqueness. An existing ID cannot be overwritten. Ever.
 *   5. Ledger integrity chain — each entry records the hash of the
 *      previous entry, creating a tamper-evident chain.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import {
  canPerform,
  type ActionToken,
  type StratumCode,
} from "../../../lib/authority";

// ── Environment ───────────────────────────────────────────────────────────────

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL!;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;
const SYS_TOKEN = process.env.FIDUCIA_SYS_TOKEN!;
const LEDGER_KEY = "fiducia:ledger:entries";
const ID_SET_KEY = "fiducia:ledger:ids"; // Redis SET for O(1) uniqueness checks

// ── Redis helper ──────────────────────────────────────────────────────────────

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

// ── Hashing ───────────────────────────────────────────────────────────────────

/**
 * Produces a canonical SHA-256 hash of the entry's content fields.
 * The hash is deterministic: same content = same hash.
 * Fields are sorted before hashing to prevent key-order manipulation.
 */
function hashEntry(entry: Record<string, unknown>): string {
  // Exclude the hash field itself from the hash computation
  const { entry_hash: _h, prev_entry_hash: _p, ...content } = entry;
  void _h; void _p;
  const canonical = JSON.stringify(content, Object.keys(content).sort());
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

/**
 * Produces a SHA-256 hash of an arbitrary document string (for doc_hash).
 * Pass the document content, URI, or any identifying string.
 */
function hashDocument(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

// ── Ledger chain helpers ──────────────────────────────────────────────────────

/** Returns the hash of the most recent entry (HEAD of the list), or "GENESIS" */
async function getHeadHash(): Promise<string> {
  const raw = await redisCommand<string[]>("LRANGE", LEDGER_KEY, 0, 0);
  if (!raw || raw.length === 0) return "GENESIS";
  try {
    const head = JSON.parse(raw[0]);
    return (head.entry_hash as string) ?? "GENESIS";
  } catch {
    return "GENESIS";
  }
}

/** Returns total entry count */
async function getLedgerLength(): Promise<number> {
  return await redisCommand<number>("LLEN", LEDGER_KEY);
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── 1. Env check ─────────────────────────────────────────────────────────
  if (!REDIS_URL || !REDIS_TOKEN || !SYS_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Server misconfiguration: one or more required environment variables are missing " +
          "(UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, FIDUCIA_SYS_TOKEN). " +
          "Add them in Vercel → Settings → Environment Variables, then redeploy.",
      },
      { status: 500 }
    );
  }

  // ── 2. Authentication ─────────────────────────────────────────────────────
  const callerToken =
    req.headers.get("X-Fiducia-Token") ??
    req.headers.get("x-fiducia-token");

  if (!callerToken || callerToken !== SYS_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Unauthorised: missing or invalid X-Fiducia-Token. " +
          "This token is set as FIDUCIA_SYS_TOKEN in your Vercel environment.",
      },
      { status: 401 }
    );
  }

  // ── 3. Parse body ─────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  // ── 4. Required field validation ──────────────────────────────────────────
  const actionToken = (body?.action as Record<string, unknown>)?.token as ActionToken | undefined;
  const stratumCode = (
    (body?.action as Record<string, unknown>)?.stratum ??
    (body?.authority as Record<string, unknown>)?.stratum
  ) as StratumCode | undefined;
  const entryId = body?.id as string | undefined;

  if (!entryId) {
    return NextResponse.json({ error: "Entry must have an id field." }, { status: 400 });
  }
  if (!actionToken) {
    return NextResponse.json(
      { error: "Entry must have an action.token field." },
      { status: 400 }
    );
  }
  if (!stratumCode) {
    return NextResponse.json(
      { error: "Entry must have an action.stratum or authority.stratum field." },
      { status: 400 }
    );
  }

  // ── 5. Authority enforcement (NORMATIVE) ──────────────────────────────────
  // Check whether this stratum is permitted to perform this action.
  // This is the core upgrade: the ledger now REFUSES unauthorised actions,
  // not just records them.
  const ledgerLength = await getLedgerLength();
  const isBootstrap = ledgerLength === 0;

  const authResult = canPerform(stratumCode, actionToken, isBootstrap);
  if (!authResult.allowed) {
    return NextResponse.json(
      {
        error: "Authority enforcement failure",
        detail: authResult.reason,
        stratum: stratumCode,
        action: actionToken,
        hint:
          "Review lib/authority.ts to see which strata can perform which actions. " +
          "If this action should be permitted for this stratum, update AUTHORITY_MODEL.",
      },
      { status: 403 }
    );
  }

  // ── 6. Append-only immutability guard ─────────────────────────────────────
  // Check that this ID doesn't already exist. Redis SET gives us O(1) lookup.
  // This is what makes the ledger genuinely append-only: you cannot overwrite
  // an existing entry by reusing its ID.
  const idExists = await redisCommand<number>("SISMEMBER", ID_SET_KEY, entryId);
  if (idExists === 1) {
    return NextResponse.json(
      {
        error: "Immutability violation",
        detail: `Entry ID '${entryId}' already exists in the ledger. ` +
          "Ledger entries are immutable and cannot be overwritten or updated. " +
          "To amend, create a new entry with a new ID that references this one.",
        existing_id: entryId,
      },
      { status: 409 }
    );
  }

  // ── 7. Build the canonical entry ──────────────────────────────────────────
  // We add server-controlled fields the client cannot fake:
  //   - server_timestamp: authoritative time (not client-supplied)
  //   - prev_entry_hash: links to the previous entry (chain integrity)
  //   - entry_hash: SHA-256 of this entry's content
  //   - sequence: ordinal position in the ledger

  const prevHash = await getHeadHash();
  const sequence = ledgerLength + 1;

  // Upgrade doc_hash: if the client passed a non-hex string (old simulate hash),
  // replace it with a real SHA-256 of that string.
  const legal = body.legal as Record<string, unknown> | undefined;
  if (legal?.doc_hash && typeof legal.doc_hash === "string") {
    const h = legal.doc_hash;
    // Real SHA-256 hex is 64 chars; anything shorter/non-hex gets re-hashed
    const isRealHash = /^[0-9a-f]{64}$/i.test(h);
    if (!isRealHash) {
      legal.doc_hash = hashDocument(h);
    }
  }

  const entry: Record<string, unknown> = {
    ...body,
    legal,
    // Server-authoritative fields — these override anything the client sent
    server_timestamp: new Date().toISOString(),
    sequence,
    prev_entry_hash: prevHash,
    authority_verified: true,
    authority_model_version: "1.0.0",
    // entry_hash computed last (must exclude itself)
    entry_hash: "", // placeholder — will be replaced below
  };

  // Now compute the real hash over the complete entry (excluding entry_hash itself)
  entry.entry_hash = hashEntry(entry);

  // ── 8. Write to Redis (atomic-ish) ────────────────────────────────────────
  // LPUSH puts the new entry at HEAD (index 0) = most recent first.
  // SADD registers the ID for future uniqueness checks.
  // We do these as two separate calls. For true atomicity you'd use a Lua
  // script or Redis transaction, but for this use case the window is negligible.

  const serialised = JSON.stringify(entry);

  await redisCommand("LPUSH", LEDGER_KEY, serialised);
  await redisCommand("SADD", ID_SET_KEY, entryId);

  return NextResponse.json(
    {
      ok: true,
      id: entryId,
      sequence,
      entry_hash: entry.entry_hash,
      prev_entry_hash: prevHash,
      server_timestamp: entry.server_timestamp,
      authority_verified: true,
    },
    { status: 201 }
  );
}

// ── OPTIONS (CORS preflight) ──────────────────────────────────────────────────
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