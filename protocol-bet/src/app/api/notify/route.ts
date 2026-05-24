// src/app/api/notify/route.ts
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

async function getDuel(id: number) {
  try {
    const idHex = id.toString(16).padStart(64, '0');
    const hex = await rpcCall('eth_call', [{ to: CONTRACT, data: '0x565e614f' + idHex }, 'latest']);
    if (!hex || hex === '0x' || hex.length < 10) return null;
    const data = hex.slice(2);
    const blue = '0x' + data.slice(1 * 64 + 24, 1 * 64 + 64);
    const status = parseInt(data.slice(9 * 64, 10 * 64), 16);
    const claimHash = '0x' + data.slice(6 * 64, 7 * 64);
    return { status, blue, claimHash };
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  try {
    const counterHex = await rpcCall('eth_call', [{ to: CONTRACT, data: '0x61bc221a' }, 'latest']);
    const count = parseInt(counterHex, 16);
    if (!count) return NextResponse.json({ checked: 0 });

    const notifications: string[] = [];

    for (let i = 1; i <= count; i++) {
      const duel = await getDuel(i);
      if (!duel) continue;

      const prevStatusKey = `duel:status:${i}`;
      const prevStatus = await kvGet(prevStatusKey);
      const prevStatusNum = prevStatus ? parseInt(prevStatus) : -1;

      // 第一次运行，记录初始状态
      if (prevStatusNum === -1) {
        await kvSet(prevStatusKey, String(duel.status));
        // 如果第一次见到就已经是 Active，说明在我们监控前就被接受了，也发通知
        if (duel.status === 1) {
          const tgUsername = await kvGet(`tg:claim:${duel.claimHash}`);
          if (tgUsername) {
            const chatId = await kvGet(`tg:user:${tgUsername}`);
            if (chatId) {
              const blue = duel.blue !== '0x0000000000000000000000000000000000000000'
                ? `${duel.blue.slice(0, 6)}...${duel.blue.slice(-4)}` : '未知';
              const message = `⚔️ *你的对决 #${i} 已被接受！*\n\n对手：\`${blue}\`\n\n查看详情：https://verdictprotocol.online/?duel=${i}`;
              await sendTelegramMessage(chatId, message);
              notifications.push(`duel #${i}: first-seen Active, notified @${tgUsername}`);
            }
          }
        }
        continue;
      }

      // 状态没变就跳过
      if (prevStatusNum === duel.status) continue;

      // 状态变了，更新记录
      await kvSet(prevStatusKey, String(duel.status));

      // 通过 claimHash 找 TG 用户名
      const tgUsername = await kvGet(`tg:claim:${duel.claimHash}`);
      if (!tgUsername) continue;

      // 找 chat_id
      const chatId = await kvGet(`tg:user:${tgUsername}`);
      if (!chatId) continue;

      let message = '';
      if (duel.status === 1 && prevStatusNum === 0) {
        // Open → Active：有人接受了
        const blue = duel.blue !== '0x0000000000000000000000000000000000000000'
          ? `${duel.blue.slice(0, 6)}...${duel.blue.slice(-4)}`
          : '未知';
        message = `⚔️ *你的对决 #${i} 已被接受！*\n\n对手：\`${blue}\`\n\n查看详情：https://verdictprotocol.online/?duel=${i}`;
      } else if (duel.status === 2 && prevStatusNum !== 2) {
        message = `🏆 *对决 #${i} 已结算！*\n\n前往领取奖励：https://verdictprotocol.online/?duel=${i}`;
      }

      if (message) {
        await sendTelegramMessage(chatId, message);
        notifications.push(`duel #${i}: ${prevStatusNum}→${duel.status}, notified @${tgUsername}`);
      }
    }

    return NextResponse.json({ checked: count, notifications });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
