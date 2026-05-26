// src/app/api/duels/route.ts
import { NextRequest, NextResponse } from 'next/server';

// 多链配置
const CHAINS = [
  {
    chainId: 5003,
    name: 'Mantle Sepolia',
    contract: '0xE731a80668Ad0439a6B55e57f65C1D7885827566',
    rpc: 'https://rpc.sepolia.mantle.xyz',
    token: 'MNT',
    cacheKey: 'duels:mantle5003',
  },
  {
    chainId: 97,
    name: 'BNB Testnet',
    contract: '0xE731a80668Ad0439a6B55e57f65C1D7885827566',
    rpc: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545',
    token: 'tBNB',
    cacheKey: 'duels:bnb97',
  },
];

const CACHE_TTL = 60;
const COMBINED_CACHE_KEY = 'duels:all';

async function rpcCall(rpc: string, method: string, params: any[]) {
  const res = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`RPC error: ${JSON.stringify(data.error)}`);
  return data.result;
}

async function kvGet(key: string) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.result ? JSON.parse(data.result) : null;
}

async function kvSetEx(key: string, value: any, ttl: number) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return;
  await fetch(`${url}/setex/${encodeURIComponent(key)}/${ttl}/${encodeURIComponent(JSON.stringify(value))}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

function parseDuel(id: number, hex: string, poolRedHex: string, poolBlueHex: string) {
  if (!hex || hex === '0x' || hex.length < 10) return null;
  const data = hex.slice(2);
  const addr = (offset: number) => '0x' + data.slice(offset * 64 + 24, offset * 64 + 64);
  const uint = (offset: number) => BigInt('0x' + (data.slice(offset * 64, offset * 64 + 64) || '0'));
  const red = addr(0);
  if (red === '0x0000000000000000000000000000000000000000') return null;
  return {
    id,
    red,
    blue: addr(1),
    token: addr(2),
    wager: uint(3).toString(),
    audioBps: uint(4).toString(),
    deadline: uint(5).toString(),
    claimHash: '0x' + data.slice(6 * 64, 7 * 64),
    ruleHash: '0x' + data.slice(7 * 64, 8 * 64),
    vis: Number(uint(8)),
    status: Number(uint(9)),
    winner: Number(uint(10)),
    settledAt: uint(11).toString(),
    poolRed: poolRedHex && poolRedHex !== '0x' ? BigInt(poolRedHex).toString() : '0',
    poolBlue: poolBlueHex && poolBlueHex !== '0x' ? BigInt(poolBlueHex).toString() : '0',
  };
}

async function syncChain(chain: typeof CHAINS[0]) {
  try {
    const counterHex = await rpcCall(chain.rpc, 'eth_call', [
      { to: chain.contract, data: '0x61bc221a' }, 'latest'
    ]);
    const count = parseInt(counterHex, 16);
    if (!count) return [];

    const calls = [];
    for (let i = 1; i <= count; i++) {
      const idHex = i.toString(16).padStart(64, '0');
      calls.push({ to: chain.contract, data: '0x565e614f' + idHex });
      calls.push({ to: chain.contract, data: '0xd831f3c5' + idHex });
      calls.push({ to: chain.contract, data: '0x3a33cdea' + idHex });
    }

    const results = await Promise.all(
      calls.map(call => rpcCall(chain.rpc, 'eth_call', [call, 'latest']))
    );

    const duels = [];
    for (let i = 0; i < count; i++) {
      const duel = parseDuel(i + 1, results[i * 3], results[i * 3 + 1], results[i * 3 + 2]);
      if (duel) duels.push({
        ...duel,
        chainId: chain.chainId,
        chainName: chain.name,
        chainToken: chain.token,
        // make id unique across chains
        id: chain.chainId * 100000 + duel.id,
        originalId: duel.id,
      });
    }

    // 读取声明文字
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (url && token) {
      for (const duel of duels) {
        try {
          const claimRes = await fetch(`${url}/get/${encodeURIComponent('claim:' + duel.claimHash)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const claimData = await claimRes.json();
          if (claimData.result) duel.claimText = claimData.result;

          const ruleRes = await fetch(`${url}/get/${encodeURIComponent('rule:' + duel.ruleHash)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const ruleData = await ruleRes.json();
          if (ruleData.result) duel.ruleText = ruleData.result;
        } catch {}
      }
    }

    return duels;
  } catch (e) {
    console.error(`Failed to sync chain ${chain.name}:`, e);
    return [];
  }
}

async function syncAllChains() {
  const results = await Promise.allSettled(CHAINS.map(c => syncChain(c)));
  const allDuels = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => (r as PromiseFulfilledResult<any[]>).value);
  return allDuels;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const forceSync = searchParams.get('sync') === '1';

    if (!forceSync) {
      const cached = await kvGet(COMBINED_CACHE_KEY);
      if (cached) {
        return NextResponse.json({ duels: cached, cached: true });
      }
    }

    const duels = await syncAllChains();
    await kvSetEx(COMBINED_CACHE_KEY, duels, CACHE_TTL);

    return NextResponse.json({ duels, cached: false, count: duels.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, duels: [] }, { status: 500 });
  }
}
