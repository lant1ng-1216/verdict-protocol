// src/app/api/notify/route.ts
// 轮询链上对决状态，发现变化时通过 Telegram Bot 发通知

import { NextRequest, NextResponse } from 'next/server';

const CONTRACT = '0xa0A997cF05F7Baf21becEA4130209fD7C7D1A994';
const RPC = 'https://data-seed-prebsc-1-s1.bnbchain.org:8545';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const KV_URL = process.env.KV_REST_API_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || '';

async function kvGet(key: string) {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
    });
    const data = await res.json();
    return data.result || null;
  } catch { return null; }
}

async function kvSet(key: string, value: string) {
  if (!KV_URL || !KV_TOKEN) return;
  await fetch(`${KV_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
}

async function rpcCall(method: string, params: any[]) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
  });
  const data = await res.json();
  return data.result;
}

async function sendTelegramMessage(chatId: string, text: string) {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
}

async function getDuelStatus(id: number): Promise<{ status: number; blue: string } | null> {
  try {
    const idHex = id.toString(16).padStart(64, '0');
    const hex = await rpcCall('eth_call', [{ to: CONTRACT, data: '0x565e614f' + idHex }, 'latest']);
    if (!hex || hex === '0x' || hex.length < 10) return null;
    const data = hex.slice(2);
    const blue = '0x' + data.slice(1 * 64 + 24, 1 * 64 + 64);
    const status = parseInt(data.slice(9 * 64, 10 * 64), 16);
    return { status, blue };
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  try {
    // 读取 counter
    const counterHex = await rpcCall('eth_call', [{ to: CONTRACT, data: '0x61bc221a' }, 'latest']);
    const count = parseInt(counterHex, 16);
    if (!count) return NextResponse.json({ checked: 0 });

    const notifications: string[] = [];

    for (let i = 1; i <= count; i++) {
      const current = await getDuelStatus(i);
      if (!current) continue;

      const prevStatusKey = `duel:status:${i}`;
      const prevStatus = await kvGet(prevStatusKey);
      const prevStatusNum = prevStatus ? parseInt(prevStatus) : -1;

      // 状态没变就跳过
      if (prevStatusNum === current.status) continue;

      // 保存新状态
      await kvSet(prevStatusKey, String(current.status));

      // 读取这个对决的 TG 用户名
      const tgKey = `duel:tg:${i}`;
      const tgUsername = await kvGet(tgKey);

      if (!tgUsername) continue;

      // 读取 chat_id
      const chatId = await kvGet(`tg:user:${tgUsername.toLowerCase()}`);
      if (!chatId) continue;

      // status: 0=Open, 1=Active, 2=Settled, 3=Cancelled
      let message = '';
      if (current.status === 1 && prevStatusNum === 0) {
        // Open → Active：有人接受了
        const blue = current.blue !== '0x0000000000000000000000000000000000000000'
          ? `${current.blue.slice(0, 6)}...${current.blue.slice(-4)}`
          : '未知';
        message = `⚔️ *你的对决 #${i} 已被接受！*\n\n对手：\`${blue}\`\n\n前往广场查看详情：https://verdictprotocol.online/?duel=${i}`;
      } else if (current.status === 2) {
        // → Settled：结算了
        message = `🏆 *对决 #${i} 已结算！*\n\n前往查看结果并领取奖励：https://verdictprotocol.online/?duel=${i}`;
      }

      if (message) {
        await sendTelegramMessage(chatId, message);
        notifications.push(`duel #${i}: status ${prevStatusNum}→${current.status}, notified @${tgUsername}`);
      }
    }

    return NextResponse.json({ checked: count, notifications });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
