// src/app/api/duels/route.ts
import { NextRequest, NextResponse } from 'next/server';

const CONTRACT = '0xa0A997cF05F7Baf21becEA4130209fD7C7D1A994';
const RPC = 'https://data-seed-prebsc-1-s1.bnbchain.org:8545';
const CACHE_KEY = 'duels:bnb97';
const CACHE_TTL = 60; // 60秒缓存

async function rpcCall(method: string, params: any[]) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
  });
  const data = await res.json();
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

// 解析getDuel返回的数据
function parseDuel(id: number, hex: string, poolRed: string, poolBlue: string) {
  if (!hex || hex === '0x') return null;
  const data = hex.slice(2);
  const addr = (offset: number) => '0x' + data.slice(offset * 64 + 24, offset * 64 + 64);
  const uint = (offset: number) => BigInt('0x' + (data.slice(offset * 64, offset * 64 + 64) || '0'));
  try {
    return {
      id,
      red: addr(0),
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
      poolRed: BigInt('0x' + (poolRed?.slice(2) || '0')).toString(),
      poolBlue: BigInt('0x' + (poolBlue?.slice(2) || '0')).toString(),
    };
  } catch { return null; }
}

async function syncDuels() {
  // 读counter
  const counterHex = await rpcCall('eth_call', [
    { to: CONTRACT, data: '0x61bc221a' }, 'latest'
  ]);
  const count = parseInt(counterHex, 16);
  if (!count) return [];

  // 批量读所有对决
  const calls = [];
  for (let i = 1; i <= count; i++) {
    const idHex = i.toString(16).padStart(64, '0');
    calls.push({ to: CONTRACT, data: '0xf4fab493' + idHex }); // getDuel
    calls.push({ to: CONTRACT, data: '0x1c4b774b' + idHex }); // poolRed
    calls.push({ to: CONTRACT, data: '0xe4b50cb8' + idHex }); // poolBlue
  }

  const results = await Promise.all(
    calls.map(call => rpcCall('eth_call', [call, 'latest']))
  );

  const duels = [];
  for (let i = 0; i < count; i++) {
    const duel = parseDuel(i + 1, results[i * 3], results[i * 3 + 1], results[i * 3 + 2]);
    if (duel) duels.push(duel);
  }

  // 同时读取声明文字
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
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const forceSync = searchParams.get('sync') === '1';

    // 先读缓存
    if (!forceSync) {
      const cached = await kvGet(CACHE_KEY);
      if (cached) {
        return NextResponse.json({ duels: cached, cached: true });
      }
    }

    // 从链上同步
    const duels = await syncDuels();
    await kvSetEx(CACHE_KEY, duels, CACHE_TTL);

    return NextResponse.json({ duels, cached: false });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, duels: [] }, { status: 500 });
  }
}
