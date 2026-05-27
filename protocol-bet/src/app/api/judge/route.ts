// src/app/api/judge/route.ts
import { NextRequest, NextResponse } from 'next/server';

const KV_URL = process.env.KV_REST_API_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || '';
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || '';

// Judge wallet private key for auto-settlement
const JUDGE_ADDRESS = '0xB0088d6Eb46c3C15D878b54900ce1d5AEad54bD7';

const CHAINS: Record<string, { rpc: string; contract: string; name: string }> = {
  '5003': { rpc: 'https://rpc.sepolia.mantle.xyz', contract: '0xE731a80668Ad0439a6B55e57f65C1D7885827566', name: 'Mantle Sepolia' },
  '97':   { rpc: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545', contract: '0xa0A997cF05F7Baf21becEA4130209fD7C7D1A994', name: 'BNB Testnet' },
};

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

async function callDeepSeek(prompt: string): Promise<string> {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${DEEPSEEK_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.3,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

async function rpcCall(rpc: string, method: string, params: any[]) {
  const res = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
  });
  const data = await res.json();
  return data.result;
}

// POST /api/judge
// body: { chainId, duelId }
export async function POST(req: NextRequest) {
  try {
    const { chainId, duelId } = await req.json();
    if (!chainId || !duelId) return NextResponse.json({ error: 'missing params' }, { status: 400 });
    if (!DEEPSEEK_KEY) return NextResponse.json({ error: 'AI judge unavailable' }, { status: 503 });

    const chain = CHAINS[String(chainId)];
    if (!chain) return NextResponse.json({ error: 'unsupported chain' }, { status: 400 });

    // Check if already judged
    const existingVerdict = await kvGet(`verdict:${chainId}:${duelId}`);
    if (existingVerdict) return NextResponse.json({ verdict: existingVerdict });

    // Get duel data from chain
    const idHex = Number(duelId).toString(16).padStart(64, '0');
    const hex = await rpcCall(chain.rpc, 'eth_call', [{ to: chain.contract, data: '0x565e614f' + idHex }, 'latest']);
    if (!hex || hex === '0x') return NextResponse.json({ error: 'duel not found' }, { status: 404 });

    const data = hex.slice(2);
    const uint = (offset: number) => BigInt('0x' + (data.slice(offset * 64, offset * 64 + 64) || '0'));
    const status = Number(uint(9));
    if (status !== 1) return NextResponse.json({ error: 'duel not active' }, { status: 400 });

    // Get claim and rule text
    const claimHash = '0x' + data.slice(6 * 64, 7 * 64);
    const ruleHash = '0x' + data.slice(7 * 64, 8 * 64);

    let claimText = '', ruleText = '';
    try {
      const [cr, rr] = await Promise.all([
        fetch(`${KV_URL}/get/${encodeURIComponent('claim:' + claimHash)}`, { headers: { Authorization: `Bearer ${KV_TOKEN}` } }),
        fetch(`${KV_URL}/get/${encodeURIComponent('rule:' + ruleHash)}`, { headers: { Authorization: `Bearer ${KV_TOKEN}` } }),
      ]);
      const [cd, rd] = await Promise.all([cr.json(), rr.json()]);
      claimText = cd.result || '';
      ruleText = rd.result || '';
    } catch {}

    // Get evidence
    const [redEvidence, blueEvidence] = await Promise.all([
      kvGet(`evidence:${chainId}:${duelId}:red`),
      kvGet(`evidence:${chainId}:${duelId}:blue`),
    ]);

    // Build AI prompt
    const prompt = `You are the AI Judge of Verdict Protocol, an on-chain dispute resolution system.

Your task: Analyze the evidence and determine the winner of this duel.

DUEL CLAIM: "${claimText || 'No claim text available'}"
RULING STANDARD: "${ruleText || 'Based on available evidence'}"

RED SIDE EVIDENCE:
${redEvidence ? `Description: ${redEvidence.description}\nLinks: ${(redEvidence.links || []).join(', ') || 'None'}` : 'No evidence submitted'}

BLUE SIDE EVIDENCE:
${blueEvidence ? `Description: ${blueEvidence.description}\nLinks: ${(blueEvidence.links || []).join(', ') || 'None'}` : 'No evidence submitted'}

Respond in this exact JSON format (no markdown, no explanation outside JSON):
{
  "winner": "Red" or "Blue",
  "confidence": 0-100,
  "reasoning": "Your ruling in 1-2 sentences"
}

Rules:
- If neither side submitted evidence, rule based on the claim and standard alone
- If only one side submitted evidence, that side has advantage
- Be objective and base ruling on the evidence provided`;

    const aiResponse = await callDeepSeek(prompt);

    let winner = 'Blue', confidence = 60, reasoning = 'Based on available evidence.';
    try {
      const parsed = JSON.parse(aiResponse);
      winner = parsed.winner === 'Red' ? 'Red' : 'Blue';
      confidence = Math.min(100, Math.max(0, Number(parsed.confidence) || 60));
      reasoning = parsed.reasoning || reasoning;
    } catch {
      // Try to extract winner from text
      if (aiResponse.toLowerCase().includes('"winner": "red"') || aiResponse.toLowerCase().includes('red wins')) {
        winner = 'Red';
      }
    }

    const verdict = {
      winner,
      winnerSide: winner === 'Red' ? 1 : 2,
      confidence,
      reasoning,
      judgedAt: Date.now(),
      chainId,
      duelId,
    };

    await kvSet(`verdict:${chainId}:${duelId}`, verdict);

    return NextResponse.json({ verdict, success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET /api/judge?chainId=5003&duelId=1
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chainId = searchParams.get('chainId');
  const duelId = searchParams.get('duelId');
  if (!chainId || !duelId) return NextResponse.json({ error: 'missing params' }, { status: 400 });

  const verdict = await kvGet(`verdict:${chainId}:${duelId}`);
  return NextResponse.json({ verdict });
}
