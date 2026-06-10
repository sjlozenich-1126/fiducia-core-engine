import { NextRequest, NextResponse } from 'next/server';

const UPSTASH_URL   = process.env.UPSTASH_REDIS_REST_URL ?? '';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? '';
const SYS_TOKEN     = process.env.FIDUCIA_SYS_TOKEN ?? '';
const KEY           = 'fiducia:ledger';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Fiducia-Token',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

async function redisCall(command: unknown[]) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    throw new Error('ENV_MISSING: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set');
  }

  const base = UPSTASH_URL.replace(/\/$/, '');
  const parts = command.map((part) => encodeURIComponent(String(part)));
  const res = await fetch(`${base}/${parts.join('/')}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstash ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.result;
}

// GET /api/ledger — returns all ledger entries
export async function GET() {
  try {
    const entries = await redisCall(['LRANGE', KEY, '0', '-1']);
    const parsed = (entries ?? []).map((e: string) => {
      try { return JSON.parse(e); } catch { return e; }
    });
    return NextResponse.json(parsed.reverse(), { headers: CORS });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to read ledger', detail: msg },
      { status: 500, headers: CORS }
    );
  }
}

// POST /api/ledger — writes a new entry (requires X-Fiducia-Token header)
export async function POST(req: NextRequest) {
  const token = req.headers.get('x-fiducia-token');
  if (!SYS_TOKEN) {
    return NextResponse.json(
      { error: 'Server misconfigured: SYS_TOKEN not set' },
      { status: 500, headers: CORS }
    );
  }
  if (token !== SYS_TOKEN) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: CORS }
    );
  }
  try {
    const body = await req.json();
    body._synced    = true;
    body._synced_at = new Date().toISOString();

    const base = UPSTASH_URL.replace(/\/$/, '');
    const res = await fetch(`${base}/lpush/${encodeURIComponent(KEY)}/${encodeURIComponent(JSON.stringify(body))}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upstash ${res.status}: ${text}`);
    }

    return NextResponse.json(
      { ok: true, id: body.id },
      { headers: CORS }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to write entry', detail: msg },
      { status: 500, headers: CORS }
    );
  }
}