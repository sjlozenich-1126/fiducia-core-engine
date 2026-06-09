import { NextRequest, NextResponse } from 'next/server';

const UPSTASH_URL   = process.env.UPSTASH_REDIS_REST_URL!;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;
const SYS_TOKEN     = process.env.FIDUCIA_SYS_TOKEN!;
const KEY           = 'fiducia:ledger';

async function redisCall(command: unknown[]) {
  const res = await fetch(`${UPSTASH_URL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  const data = await res.json();
  return data.result;
}

// POST /api/mint — mints a new ledger block
export async function POST(req: NextRequest) {
  const token = req.headers.get('x-fiducia-token');
  if (token !== SYS_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();

    // Attach server-side metadata
    body._synced    = true;
    body._synced_at = new Date().toISOString();
    body._minted_by = 'fiducia-mint-endpoint';

    // Get last entry to build the chain
    const last = await redisCall(['LINDEX', KEY, 0]);
    let prevHash = 'GENESIS';
    if (last) {
      try {
        const parsed = JSON.parse(last);
        prevHash = parsed.legal?.doc_hash ?? parsed._synced_at ?? 'GENESIS';
      } catch {}
    }
    body._prev_hash = prevHash;

    await redisCall(['LPUSH', KEY, JSON.stringify(body)]);

    return NextResponse.json({
      ok:        true,
      id:        body.id,
      prev_hash: prevHash,
      synced_at: body._synced_at,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Mint failed' }, { status: 500 });
  }
}