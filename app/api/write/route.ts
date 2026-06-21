import { supabase } from '@/app/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. (Your custom Stratum authority verification step will happen here) [cite: 175, 213]

    // 2. Write natively to the live Supabase table
    const { data, error } = await supabase
      .from('ledger_entries')
      .insert([
        {
          id: body.id,
          type: body.type,
          stratum: body.actor.stratum,
          actor_id: body.actor.id,
          payload: body.payload,
          constraints: body.constraints,
          references_data: body.references || {},
          hash: body.hash || "computed-sha256",
          timestamp: body.timestamp || new Date().toISOString(),
        },
      ])
      .select();

    if (error) throw error;

    return Response.json({ success: true, entry: data[0] });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}