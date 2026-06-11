import { NextRequest, NextResponse } from 'next/server';

// Hardcoded while env vars are being diagnosed
const BASE  = 'https://gorgeous-monarch-69026.upstash.io';
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? '';
const KEY   = 'fiducia:ledger';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Fiducia-Token',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

async function upstash(args: (string | number)[]) {
  const path = args.map(a => encodeURIComponent(String(a))).join('/');
  const res  = await fetch(`${BASE}/${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}

export async function GET() {
  try {
    const raw = await upstash(['LRANGE', KEY, 0, -1]);
    const entries = (raw ?? []).map((e: string) => {
      try { return JSON.parse(e); } catch { return e; }
    });
    return NextResponse.json(entries.reverse(), { headers: CORS });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500, headers: CORS }
    );
  }
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-fiducia-token');
  if (token !== process.env.FIDUCIA_SYS_TOKEN) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: CORS }
    );
  }
  try {
    const body = await req.json();
    body._synced_at = new Date().toISOString();
    await upstash(['LPUSH', KEY, JSON.stringify(body)]);
    return NextResponse.json(
      { ok: true, id: body.id },
      { headers: CORS }
    );
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500, headers: CORS }
    );
  }
}