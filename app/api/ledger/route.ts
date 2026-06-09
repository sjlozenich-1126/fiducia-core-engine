import { NextRequest, NextResponse } from 'next/server';

const UPSTASH_URL   = process.env.UPSTASH_REDIS_REST_URL!;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;
const SYS_TOKEN     = process.env.FIDUCIA_SYS_TOKEN!;
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
  const url = UPSTASH_URL.endsWith('/')
    ? UPSTASH_URL + 'pipeline'
    : UPSTASH_URL + '/pipeline';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([command]),  // pipeline wraps in array
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstash error ${res.status}: ${text}`);
  }

  const data = await res.json();
  // pipeline returns array of results, grab first
  return Array.isArray(data) ? data[0]?.result : data.result;
}

// GET /api/ledger — returns all ledger entries
export async function GET() {
  try {
    const entries = await redisCall(['LRANGE', KEY, 0, -1]);
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
    await redisCall(['LPUSH', KEY, JSON.stringify(body)]);
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