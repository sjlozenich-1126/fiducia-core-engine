import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

const redis = Redis.fromEnv();
const LEDGER_KEY = 'fiducia:ledger';
const SYS_TOKEN = process.env.FIDUCIA_SYS_TOKEN;

export async function GET() {
  const entries = await redis.lrange(LEDGER_KEY, 0, -1);
  return NextResponse.json(entries.reverse());
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-fiducia-token');
  if (token !== SYS_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  body._synced = true;
  body._synced_at = new Date().toISOString();
  await redis.lpush(LEDGER_KEY, JSON.stringify(body));
  return NextResponse.json({ ok: true, id: body.id });
}