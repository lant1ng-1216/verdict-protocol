// src/app/api/judge/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, http, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';

const KV_URL = process.env.KV_REST_API_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || '';
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || '';
const JUDGE_PRIVATE_KEY = process.env.JUDGE_PRIVATE_KEY as `0x${string}` | undefined;

const mantleSepolia = defineChain({
  id: 5003, name: 'Mantle Sepolia',
  nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.sepolia.mantle.xyz'] } },
});
const bscTestnet = defineChain({
  id: 97, name: 'BNB Testnet',
  nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
  rpcUrls: { default: { http: ['https://data-seed-prebsc-1-s1.bnbchain.org:8545'] } },
});

const CHAIN_CONFIG: Record<string, { rpc: string; contract: `0x${string}`; viemChain: typeof mantleSepolia }> = {
  '5003': { rpc: 'https://rpc.sepolia.mantle.xyz', contract: '0xE731a80668Ad0439a6B55e57f65C1D7885827566', viemChain: mantleSepolia },
  '97':   { rpc: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545', contract: '0xa0A997cF05F7Baf21becEA4130209fD7C7D1A994', viemChain: bscTestnet },
};

const SETTLE_ABI = [{ name: 'settle', type: 'function', inputs: [{ name: 'id', type: 'uint256' }, { name: 'winner', type: 'uint8' }], outputs: [], stateMutability: 'nonpayable' }] as const;

// ── KV helpers ──────────────────────────────────────────────────────────────
async function kvGet(key: string) {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${KV_TOKEN}` } });
    const data = await res.json();
    return data.result ? JSON.parse(data.result) : null;
  } catch { return null; }
}
async function kvSet(key: string, value: any) {
  if (!KV_URL || !KV_TOKEN) return;
  try {
    await fetch(`${KV_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(value))}`, { headers: { Authorization: `Bearer ${KV_TOKEN}` } });
  } catch {}
}

// ── DeepSeek call ───────────────────────────────────────────────────────────
async function callAI(systemPrompt: string, userPrompt: string, maxTokens = 800): Promise<string> {
  if (!DEEPSEEK_KEY) return '';
  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${DEEPSEEK_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  } catch (e) {
    console.error('DeepSeek error:', e);
    return '';
  }
}

// ── Fetch link content ──────────────────────────────────────────────────────
async function fetchLinkContent(url: string): Promise<{ url: string; title: string; snippet: string; accessible: boolean }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'VerdictProtocol-Judge/1.0' } });
    clearTimeout(timer);
    if (!res.ok) return { url, title: '', snippet: '', accessible: false };
    const html = await res.text();
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim().slice(0, 100) : '';
    // Extract text content (strip HTML)
    const text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1500);
    return { url, title, snippet: text, accessible: true };
  } catch {
    return { url, title: '', snippet: '', accessible: false };
  }
}

// ── Auto-fetch public data for price/on-chain types ────────────────────────
async function fetchPublicData(claim: string, ruleText: string): Promise<string> {
  const extras: string[] = [];
  // Detect price-related claims
  const priceMatch = claim.match(/\$(\d[\d,]+)/);
  const tokenMatch = claim.toUpperCase().match(/\b(BTC|ETH|BNB|MNT|SOL|MATIC|AVAX)\b/);
  if (priceMatch && tokenMatch) {
    try {
      const tokenMap: Record<string, string> = { BTC: 'bitcoin', ETH: 'ethereum', BNB: 'binancecoin', MNT: 'mantle', SOL: 'solana', MATIC: 'matic-network', AVAX: 'avalanche-2' };
      const coinId = tokenMap[tokenMatch[0]];
      if (coinId) {
        const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`, { headers: { 'Accept': 'application/json' } });
        const d = await r.json();
        const price = d[coinId]?.usd;
        if (price) extras.push(`[Public Data] Current ${tokenMatch[0]} price: $${price.toLocaleString()}`);
      }
    } catch {}
  }
  // Detect TVL claims
  if (claim.toLowerCase().includes('tvl') || ruleText.toLowerCase().includes('tvl')) {
    try {
      const r = await fetch('https://api.llama.fi/v2/chains');
      const chains = await r.json();
      const relevant = chains.filter((c: any) => claim.toLowerCase().includes(c.name?.toLowerCase()));
      relevant.slice(0, 3).forEach((c: any) => {
        if (c.tvl) extras.push(`[Public Data] ${c.name} TVL: $${(c.tvl / 1e6).toFixed(1)}M`);
      });
    } catch {}
  }
  return extras.join('\n');
}

// ── RPC helper ──────────────────────────────────────────────────────────────
async function rpcCall(rpc: string, method: string, params: any[]) {
  const res = await fetch(rpc, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }) });
  const data = await res.json();
  return data.result;
}

// ── On-chain settle ─────────────────────────────────────────────────────────
async function settleOnChain(chainId: string, duelId: number, winnerSide: number): Promise<string | null> {
  if (!JUDGE_PRIVATE_KEY) return null;
  const cfg = CHAIN_CONFIG[chainId];
  if (!cfg) return null;
  try {
    const account = privateKeyToAccount(JUDGE_PRIVATE_KEY);
    const walletClient = createWalletClient({ account, chain: cfg.viemChain, transport: http(cfg.rpc) });
    const data = encodeFunctionData({ abi: SETTLE_ABI, functionName: 'settle', args: [BigInt(duelId), winnerSide] });
    const txHash = await walletClient.sendTransaction({ to: cfg.contract, data, gas: BigInt(200000) });
    return txHash;
  } catch (e) {
    console.error('settle tx failed:', e);
    return null;
  }
}

// ── SYSTEM PROMPT ───────────────────────────────────────────────────────────
const JUDGE_SYSTEM = `You are the AI Judge of Verdict Protocol — a decentralized on-chain dispute arbitration system.

Your jurisdiction covers ALL types of wagers:
- Crypto price predictions (BTC > $X by date)
- Company/project milestones (IPO, product launch, partnerships)
- KOL vs KOL predictions (market calls, trend forecasts)
- Community vs community (TVL, user count, ecosystem growth)
- Personal challenges between friends (fitness, productivity, deadlines)
- Social metrics (follower counts, engagement rates)
- Any verifiable event or outcome

CORE PRINCIPLES:
1. Rule STRICTLY based on the ruling standard — never based on who "claims" to win
2. "I won", "I'm right", "I deserve to win" are NOT evidence — they score ZERO
3. Evidence hierarchy: On-chain data (5) > Official announcements (4) > Third-party data like CoinGecko/DeFiLlama (3) > Social media with links (2) > Text description only (1) > Subjective claims (0)
4. When in doubt, output Insufficient — do not force a verdict
5. Consider the ruling standard as the ONLY objective benchmark

FORBIDDEN:
- Ruling for a party because they submitted more text
- Being swayed by emotional language or confident tone
- Ignoring the ruling standard in favor of evidence quantity
- Hallucinating data that wasn't provided

Always respond with valid JSON only. No markdown, no explanation outside JSON.`;

// ── STEP 1: Parse case ──────────────────────────────────────────────────────
async function step1ParseCase(claim: string, ruleText: string) {
  const prompt = `Analyze this dispute and extract structured information.

CLAIM: "${claim}"
RULING STANDARD: "${ruleText}"

Classify the dispute type and extract verifiable conditions.

Respond with JSON:
{
  "disputeType": "PRICE|EVENT|COMPETITION|SOCIAL|PERSONAL|COMMUNITY|SUBJECTIVE",
  "disputeTypeLabel": "human readable label",
  "conditions": [
    {
      "id": 1,
      "description": "specific verifiable condition",
      "verifiability": "high|medium|low",
      "requiredEvidence": "what evidence would prove this"
    }
  ],
  "objectivity": "high|medium|low",
  "notes": "any important notes about this case"
}`;
  const raw = await callAI(JUDGE_SYSTEM, prompt, 400);
  try { return JSON.parse(raw); } catch { return { disputeType: 'SUBJECTIVE', conditions: [], objectivity: 'low', notes: '' }; }
}

// ── STEP 2: Process evidence ────────────────────────────────────────────────
async function step2ProcessEvidence(redEvidence: any, blueEvidence: any, disputeType: string) {
  const processEv = async (ev: any, side: string) => {
    if (!ev) return { side, hasEvidence: false, validItems: [], invalidItems: [], quality: 0, qualityLabel: 'none', linkContents: [] };
    const linkContents = await Promise.all((ev.links || []).filter((l: string) => l?.trim()).map(fetchLinkContent));
    const prompt = `Evaluate this ${side} side evidence for a ${disputeType} dispute.

Evidence description: "${ev.description || ''}"
Links provided: ${linkContents.map((l, i) => `Link ${i+1}: ${l.url} — ${l.accessible ? `Title: ${l.title}, Content: ${l.snippet?.slice(0,300)}` : 'INACCESSIBLE'}`).join('\n') || 'None'}

Evaluate evidence quality and validity.

JSON response:
{
  "validItems": ["list of valid evidence pieces"],
  "invalidItems": ["list of invalid/subjective claims"],
  "quality": 0-5,
  "qualityLabel": "none|very_low|low|medium|high|very_high",
  "keyFindings": "what the evidence actually shows",
  "subjectiveClaims": ["claims that are just assertions with no proof"]
}`;
    const raw = await callAI(JUDGE_SYSTEM, prompt, 400);
    try {
      const parsed = JSON.parse(raw);
      return { side, hasEvidence: true, linkContents, ...parsed };
    } catch {
      return { side, hasEvidence: true, quality: 0, qualityLabel: 'low', validItems: [], invalidItems: [], keyFindings: '', subjectiveClaims: [], linkContents };
    }
  };
  const [red, blue] = await Promise.all([processEv(redEvidence, 'Red'), processEv(blueEvidence, 'Blue')]);
  return { red, blue };
}

// ── STEP 3: Analyze conditions ──────────────────────────────────────────────
async function step3AnalyzeConditions(conditions: any[], redProcessed: any, blueProcessed: any, publicData: string, claim: string, ruleText: string) {
  if (!conditions?.length) conditions = [{ id: 1, description: ruleText || claim, verifiability: 'medium', requiredEvidence: 'any supporting evidence' }];
  const prompt = `Analyze each condition against the evidence provided.

RULING STANDARD: "${ruleText}"
CLAIM: "${claim}"

CONDITIONS TO EVALUATE:
${conditions.map((c, i) => `${i+1}. ${c.description} (verifiability: ${c.verifiability})`).join('\n')}

RED SIDE EVIDENCE ANALYSIS:
Quality: ${redProcessed.qualityLabel} (${redProcessed.quality}/5)
Valid evidence: ${redProcessed.validItems?.join('; ') || 'none'}
Key findings: ${redProcessed.keyFindings || 'none'}
Subjective claims (IGNORE THESE): ${redProcessed.subjectiveClaims?.join('; ') || 'none'}

BLUE SIDE EVIDENCE ANALYSIS:
Quality: ${blueProcessed.qualityLabel} (${blueProcessed.quality}/5)
Valid evidence: ${blueProcessed.validItems?.join('; ') || 'none'}
Key findings: ${blueProcessed.keyFindings || 'none'}
Subjective claims (IGNORE THESE): ${blueProcessed.subjectiveClaims?.join('; ') || 'none'}

${publicData ? `PUBLIC DATA RETRIEVED:\n${publicData}` : ''}

For each condition, determine if Red/Blue satisfies it based ONLY on valid evidence and public data.

JSON response:
{
  "conditionResults": [
    {
      "id": 1,
      "description": "condition text",
      "redStatus": "satisfied|unsatisfied|unverifiable",
      "blueStatus": "satisfied|unsatisfied|unverifiable",
      "redEvidence": "evidence that supports Red's status",
      "blueEvidence": "evidence that supports Blue's status",
      "weight": 1-5
    }
  ]
}`;
  const raw = await callAI(JUDGE_SYSTEM, prompt, 600);
  try { return JSON.parse(raw); } catch { return { conditionResults: [] }; }
}

// ── STEP 4: Final verdict ───────────────────────────────────────────────────
async function step4FinalVerdict(step1: any, step2: any, step3: any, claim: string, ruleText: string) {
  const { red, blue } = step2;
  const { conditionResults } = step3;
  const prompt = `Make the final ruling based on all analysis.

DISPUTE TYPE: ${step1.disputeType}
CLAIM: "${claim}"
RULING STANDARD: "${ruleText}"

CONDITION RESULTS:
${conditionResults?.map((c: any) => `- ${c.description}: Red=${c.redStatus}, Blue=${c.blueStatus}`).join('\n') || 'No conditions analyzed'}

EVIDENCE QUALITY:
Red: ${red.qualityLabel} (${red.quality}/5) — ${red.hasEvidence ? 'submitted evidence' : 'NO EVIDENCE SUBMITTED'}
Blue: ${blue.qualityLabel} (${blue.quality}/5) — ${blue.hasEvidence ? 'submitted evidence' : 'NO EVIDENCE SUBMITTED'}

SCORING RULES:
- Each satisfied condition = +weight points
- Quality bonus: quality 5=+3pts, 4=+2pts, 3=+1pt, 2+=0, 1=−1pt
- No evidence submitted = 0 base score
- Subjective claims only = score capped at 1

Determine winner. If evidence is too weak/ambiguous for both sides, use "Insufficient".

JSON response:
{
  "redScore": 0-100,
  "blueScore": 0-100,
  "winner": "Red|Blue|Insufficient",
  "winnerSide": 1,
  "confidence": 0-100,
  "autoSettle": true,
  "settleReason": "why we auto-settle or not",
  "reasoning": "detailed ruling in 2-3 sentences",
  "reasoningZh": "same ruling in Chinese",
  "warnings": ["any important warnings"],
  "keyEvidence": "the single most important piece of evidence"
}`;
  const raw = await callAI(JUDGE_SYSTEM, prompt, 500);
  try {
    const parsed = JSON.parse(raw);
    // Safety: enforce autoSettle=false if confidence < 50 or Insufficient
    if (parsed.winner === 'Insufficient' || parsed.confidence < 50) parsed.autoSettle = false;
    if (parsed.winner === 'Red') parsed.winnerSide = 1;
    else if (parsed.winner === 'Blue') parsed.winnerSide = 2;
    else parsed.winnerSide = 0;
    return parsed;
  } catch {
    return { winner: 'Insufficient', winnerSide: 0, confidence: 0, autoSettle: false, reasoning: 'Analysis failed', reasoningZh: '分析失败', warnings: [], redScore: 0, blueScore: 0 };
  }
}

// ── MAIN HANDLER ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { chainId, duelId } = await req.json();
    if (!chainId || !duelId) return NextResponse.json({ error: 'missing params' }, { status: 400 });
    if (!DEEPSEEK_KEY) return NextResponse.json({ error: 'AI judge unavailable' }, { status: 503 });

    const cfg = CHAIN_CONFIG[String(chainId)];
    if (!cfg) return NextResponse.json({ error: 'unsupported chain' }, { status: 400 });

    // Return existing verdict
    const existing = await kvGet(`verdict:${chainId}:${duelId}`);
    if (existing) return NextResponse.json({ verdict: existing });

    // Get duel from chain
    const idHex = Number(duelId).toString(16).padStart(64, '0');
    const hex = await rpcCall(cfg.rpc, 'eth_call', [{ to: cfg.contract, data: '0x565e614f' + idHex }, 'latest']);
    if (!hex || hex === '0x') return NextResponse.json({ error: 'duel not found' }, { status: 404 });

    const hexData = hex.slice(2);
    const uint = (offset: number) => BigInt('0x' + (hexData.slice(offset * 64, offset * 64 + 64) || '0'));
    const status = Number(uint(9));
    if (status !== 1) return NextResponse.json({ error: `duel not active (status=${status})` }, { status: 400 });

    // Get claim and rule text from KV
    const claimHash = '0x' + hexData.slice(6 * 64, 7 * 64);
    const ruleHash = '0x' + hexData.slice(7 * 64, 8 * 64);
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

    // Fetch public data
    const publicData = await fetchPublicData(claimText, ruleText);

    // Run 4-step agent
    const [s1, s2] = await Promise.all([
      step1ParseCase(claimText, ruleText),
      step2ProcessEvidence(redEvidence, blueEvidence, 'GENERAL'),
    ]);
    const s3 = await step3AnalyzeConditions(s1.conditions, s2.red, s2.blue, publicData, claimText, ruleText);
    const s4 = await step4FinalVerdict(s1, s2, s3, claimText, ruleText);

    // Build final verdict
    const verdict = {
      // Case info
      chainId: Number(chainId),
      duelId: Number(duelId),
      claimText,
      ruleText,
      judgedAt: Date.now(),
      // Dispute analysis
      disputeType: s1.disputeType,
      disputeTypeLabel: s1.disputeTypeLabel,
      objectivity: s1.objectivity,
      // Evidence
      redEvidence: redEvidence ? {
        description: redEvidence.description,
        links: redEvidence.links,
        quality: s2.red.quality,
        qualityLabel: s2.red.qualityLabel,
        validItems: s2.red.validItems,
        keyFindings: s2.red.keyFindings,
        linkContents: s2.red.linkContents?.map((l: any) => ({ url: l.url, title: l.title, accessible: l.accessible })),
      } : null,
      blueEvidence: blueEvidence ? {
        description: blueEvidence.description,
        links: blueEvidence.links,
        quality: s2.blue.quality,
        qualityLabel: s2.blue.qualityLabel,
        validItems: s2.blue.validItems,
        keyFindings: s2.blue.keyFindings,
        linkContents: s2.blue.linkContents?.map((l: any) => ({ url: l.url, title: l.title, accessible: l.accessible })),
      } : null,
      // Condition analysis
      conditionResults: s3.conditionResults,
      // Verdict
      winner: s4.winner,
      winnerSide: s4.winnerSide,
      confidence: s4.confidence,
      redScore: s4.redScore,
      blueScore: s4.blueScore,
      reasoning: s4.reasoning,
      reasoningZh: s4.reasoningZh,
      keyEvidence: s4.keyEvidence,
      warnings: s4.warnings || [],
      autoSettle: s4.autoSettle,
      settleReason: s4.settleReason,
      publicData: publicData || null,
      // Settlement
      txHash: null as string | null,
      settled: false,
    };

    // Auto-settle if confidence high enough
    if (verdict.autoSettle && verdict.winnerSide !== 0 && JUDGE_PRIVATE_KEY) {
      const txHash = await settleOnChain(String(chainId), Number(duelId), verdict.winnerSide);
      verdict.txHash = txHash;
      verdict.settled = !!txHash;
    }

    await kvSet(`verdict:${chainId}:${duelId}`, verdict);
    return NextResponse.json({ verdict, success: true });

  } catch (e: any) {
    console.error('Judge error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chainId = searchParams.get('chainId');
  const duelId = searchParams.get('duelId');
  if (!chainId || !duelId) return NextResponse.json({ error: 'missing params' }, { status: 400 });
  const verdict = await kvGet(`verdict:${chainId}:${duelId}`);
  return NextResponse.json({ verdict });
}
