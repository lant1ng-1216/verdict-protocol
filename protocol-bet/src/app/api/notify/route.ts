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

function fmtEther(weiStr: string): string {
  try {
    const val = parseFloat((BigInt(weiStr) * 10000n / BigInt(1e18)).toString()) / 10000;
    return val.toFixed(4).replace(/\.?0+$/, '');
  } catch { return '?'; }
}

function fmtDeadline(deadlineStr: string): string {
  try {
    const now = Math.floor(Date.now() / 1000);
    const deadline = parseInt(deadlineStr);
    const diff = deadline - now;
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    if (days > 0) return `~${days}d ${hours}h`;
    return `~${hours}h`;
  } catch { return 'unknown'; }
}

async function getDuel(id: number) {
  try {
    const idHex = id.toString(16).padStart(64, '0');
    const hex = await rpcCall('eth_call', [{ to: CONTRACT, data: '0x565e614f' + idHex }, 'latest']);
    if (!hex || hex === '0x' || hex.length < 10) return null;
    const data = hex.slice(2);
    const addr = (offset: number) => '0x' + data.slice(offset * 64 + 24, offset * 64 + 64);
    const uint = (offset: number) => BigInt('0x' + (data.slice(offset * 64, offset * 64 + 64) || '0'));
    return {
      blue: addr(1),
      wager: uint(3).toString(),
      deadline: uint(5).toString(),
      claimHash: '0x' + data.slice(6 * 64, 7 * 64),
      ruleHash: '0x' + data.slice(7 * 64, 8 * 64),
      status: Number(uint(9)),
      winner: Number(uint(10)),
    };
  } catch { return null; }
}

function buildAcceptedMessage(i: number, duel: any, claimText: string, ruleText: string): string {
  const blue = duel.blue !== '0x0000000000000000000000000000000000000000'
    ? `${duel.blue.slice(0, 6)}...${duel.blue.slice(-4)}` : 'unknown';
  const wager = fmtEther(duel.wager);
  const totalPool = fmtEther((BigInt(duel.wager) * 2n).toString());
  const deadline = fmtDeadline(duel.deadline);
  const claim = claimText || `#${i} — on-chain duel`;
  const rule = ruleText || 'Based on on-chain data';

  return `⚔️ *Your duel #${i} has been accepted!*

📋 *Claim:* "${claim}"
📏 *Ruling standard:* ${rule}

🆚 *Opponent:* \`${blue}\`
💰 *Total pool:* ${totalPool} tBNB (${wager} tBNB each)
⏰ *Expires:* ${deadline}
🌐 *Network:* BNB Testnet

*What you can do:*
• Negotiate before expiry → Mutual settlement
• Submit evidence after expiry → Request AI ruling
• Winner claims reward within 48h after verdict

🔗 [View duel](https://verdictprotocol.online/?duel=${i})`;
}

function buildSettledMessage(i: number, claimText: string, won: boolean): string {
  const claim = claimText || `#${i} — on-chain duel`;
  if (won) {
    return `🏆 *You won duel #${i}!*

📋 "${claim}"

🎉 Congratulations! Claim your reward within 48 hours.

🔗 [Claim reward](https://verdictprotocol.online/?duel=${i})`;
  } else {
    return `💀 *Duel #${i} settled*

📋 "${claim}"

Better luck next time!

🔗 [View result](https://verdictprotocol.online/?duel=${i})`;
  }
}

async function processNotification(i: number, duel: any, prevStatus: number, notifications: string[], tgUsername: string, chatId: string) {
  const claimText = await kvGet(`claim:${duel.claimHash}`) || '';
  const ruleText = await kvGet(`rule:${duel.ruleHash}`) || '';

  let message = '';
  if (duel.status === 1 && prevStatus === 0) {
    message = buildAcceptedMessage(i, duel, claimText, ruleText);
  } else if (duel.status === 2 && prevStatus !== 2) {
    const won = duel.winner === 1;
    message = buildSettledMessage(i, claimText, won);
  }

  if (message) {
    await sendTelegramMessage(chatId, message);
    notifications.push(`duel #${i}: ${prevStatus}→${duel.status}, notified @${tgUsername}`);
  }
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

      if (prevStatusNum === -1) {
        await kvSet(prevStatusKey, String(duel.status));
        if (duel.status === 1) {
          const tgUsername = await kvGet(`tg:claim:${duel.claimHash}`);
          if (tgUsername) {
            const chatId = await kvGet(`tg:user:${tgUsername}`);
            if (chatId) {
              await processNotification(i, duel, 0, notifications, tgUsername, chatId);
            }
          }
        }
        continue;
      }

      if (prevStatusNum === duel.status) continue;
      await kvSet(prevStatusKey, String(duel.status));

      const tgUsername = await kvGet(`tg:claim:${duel.claimHash}`);
      if (!tgUsername) continue;
      const chatId = await kvGet(`tg:user:${tgUsername}`);
      if (!chatId) continue;

      await processNotification(i, duel, prevStatusNum, notifications, tgUsername, chatId);
    }

    return NextResponse.json({ checked: count, notifications });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
