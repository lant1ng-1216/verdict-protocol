// src/app/api/evidence/route.ts
import { NextRequest, NextResponse } from 'next/server';

const KV_URL = process.env.KV_REST_API_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || '';

async function kvGet(key: string) {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    });
    const data = await res.json();
    return data.result ? JSON.parse(data.result) : null;
  } catch { return null; }
}

async function kvSet(key: string, value: any) {
  if (!KV_URL || !KV_TOKEN) return;
  await fetch(`${KV_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(value))}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` }
  });
}

// GET /api/evidence?chainId=5003&duelId=1
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chainId = searchParams.get('chainId');
  const duelId = searchParams.get('duelId');
  if (!chainId || !duelId) return NextResponse.json({ error: 'missing params' }, { status: 400 });

  const redEvidence = await kvGet(`evidence:${chainId}:${duelId}:red`);
  const blueEvidence = await kvGet(`evidence:${chainId}:${duelId}:blue`);
  const verdict = await kvGet(`verdict:${chainId}:${duelId}`);

  return NextResponse.json({ redEvidence, blueEvidence, verdict });
}

// POST /api/evidence
// body: { chainId, duelId, side, address, description, links[] }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chainId, duelId, side, address, description, links } = body;

    if (!chainId || !duelId || !side || !address || !description) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 });
    }
    if (!['red', 'blue'].includes(side)) {
      return NextResponse.json({ error: 'invalid side' }, { status: 400 });
    }
    if (description.length > 500) {
      return NextResponse.json({ error: 'description too long' }, { status: 400 });
    }

    const evidence = {
      address,
      description,
      links: (links || []).slice(0, 3),
      submittedAt: Date.now(),
    };

    await kvSet(`evidence:${chainId}:${duelId}:${side}`, evidence);
    return NextResponse.json({ success: true, evidence });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
