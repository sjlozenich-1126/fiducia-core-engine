import { NextResponse } from 'next/server';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Lightweight HTTP client function to communicate with Upstash securely
async function queryRedis(command: string, ...args: any[]) {
  const response = await fetch(`${REDIS_URL}/${command}/${args.join('/')}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    cache: 'no-store'
  });
  return response.json();
}

export async function GET() {
  try {
    if (!REDIS_URL || !REDIS_TOKEN) {
      throw new Error("Missing cloud state environment parameters in .env.local");
    }
    
    const res = await queryRedis('GET', 'fiducia_ledger');
    const records = res.result ? JSON.parse(res.result) : [];
    
    return NextResponse.json({ success: true, data: records }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // Explicit server-side validation and structural formatting of your entries
    const recordId = payload.id || `FDC-${Date.now()}`;
    const newEntry = {
      id: recordId,
      stratum: payload.stratum || "01-Inherent",
      tier: payload.tier || "Tier-1",
      level: payload.level || "Level-1",
      action: payload.action || "GENERIC_RECORD",
      claim: payload.claim || "",
      timestamp: new Date().toISOString(),
      verified: true
    };

    // Pull down the current remote array state, inject the new entry first, and save it back
    const currentRes = await queryRedis('GET', 'fiducia_ledger');
    const currentLedger = currentRes.result ? JSON.parse(currentRes.result) : [];
    currentLedger.unshift(newEntry);

    await fetch(`${REDIS_URL}/SET/fiducia_ledger`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
      body: JSON.stringify(currentLedger)
    });

    return NextResponse.json({ success: true, data: newEntry }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}