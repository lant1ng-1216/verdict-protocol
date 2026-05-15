"""
Verdict Protocol — Meme Court Telegram Bot v3
⚖️ Full EVM Support + Meme Court Theme
"""

import os, re, json, asyncio, aiohttp
from datetime import datetime, timezone
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler

load_dotenv()
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN", "")
MORALIS_KEY    = os.getenv("MORALIS_API_KEY", "")
DEEPSEEK_KEY   = os.getenv("DEEPSEEK_API_KEY", "")

# ── 全 EVM 链配置 ─────────────────────────────────────────
CHAINS = {
    "eth":       {"name":"Ethereum",    "emoji":"🔵","moralis_chain":"eth",      "explorer":"https://etherscan.io",              "symbol":"ETH",  "whale_threshold":500000},
    "bnb":       {"name":"BNB Chain",   "emoji":"🟡","moralis_chain":"bsc",      "explorer":"https://bscscan.com",               "symbol":"BNB",  "whale_threshold":50000},
    "polygon":   {"name":"Polygon",     "emoji":"🟣","moralis_chain":"polygon",  "explorer":"https://polygonscan.com",           "symbol":"MATIC","whale_threshold":50000},
    "arbitrum":  {"name":"Arbitrum",    "emoji":"🔷","moralis_chain":"arbitrum", "explorer":"https://arbiscan.io",               "symbol":"ETH",  "whale_threshold":100000},
    "optimism":  {"name":"Optimism",    "emoji":"🔴","moralis_chain":"optimism", "explorer":"https://optimistic.etherscan.io",   "symbol":"ETH",  "whale_threshold":100000},
    "base":      {"name":"Base",        "emoji":"🟦","moralis_chain":"base",     "explorer":"https://basescan.org",              "symbol":"ETH",  "whale_threshold":100000},
    "mantle":    {"name":"Mantle",      "emoji":"🟢","moralis_chain":"mantle",   "explorer":"https://explorer.mantle.xyz",       "symbol":"MNT",  "whale_threshold":10000},
    "avalanche": {"name":"Avalanche",   "emoji":"🔺","moralis_chain":"avalanche","explorer":"https://snowtrace.io",              "symbol":"AVAX", "whale_threshold":100000},
}

# 链名别名
CHAIN_ALIASES = {
    "bsc":"bnb","binance":"bnb","eth":"eth","ethereum":"bnb",
    "poly":"polygon","matic":"polygon","arb":"arbitrum",
    "op":"optimism","mnt":"mantle","avax":"avalanche","avl":"avalanche",
}

# 默认尝试链顺序（没有指定时）
AUTO_DETECT_ORDER = ["bnb","eth","base","arbitrum","polygon","mantle","optimism","avalanche"]

EVM_RE = re.compile(r"0x[a-fA-F0-9]{40}")
watchlist: dict = {}

# 案件编号生成
def case_number(address: str) -> str:
    return f"#{abs(hash(address)) % 99999:05d}"

# ── Moralis API ───────────────────────────────────────────
async def moralis_get(path: str, params: dict = {}) -> dict:
    url = f"https://deep-index.moralis.io/api/v2.2{path}"
    headers = {"X-API-Key": MORALIS_KEY, "accept": "application/json"}
    try:
        async with aiohttp.ClientSession(trust_env=False) as s:
            async with s.get(url, headers=headers, params=params,
                             timeout=aiohttp.ClientTimeout(total=10)) as r:
                if r.status == 200:
                    return await r.json()
    except Exception as e:
        print(f"Moralis error {path}: {e}")
    return {}

async def get_transfers(address, chain, limit=10):
    data = await moralis_get(f"/{address}", {"chain": CHAINS[chain]["moralis_chain"], "limit": limit})
    return (data or {}).get("result", [])

async def get_balance(address, chain):
    return await moralis_get(f"/{address}/balance", {"chain": CHAINS[chain]["moralis_chain"]}) or {}

async def get_tokens(address, chain):
    data = await moralis_get(f"/{address}/erc20", {"chain": CHAINS[chain]["moralis_chain"], "limit": 5})
    if isinstance(data, list): return data
    return (data or {}).get("result", [])

async def auto_detect_chain(address: str) -> str:
    """自动检测地址在哪条链上有数据"""
    for chain in AUTO_DETECT_ORDER:
        bal = await get_balance(address, chain)
        try:
            if float(bal.get("balance","0")) > 0:
                return chain
        except: pass
        txs = await get_transfers(address, chain, 1)
        if txs: return chain
    return "bnb"  # fallback

# ── 工具函数 ──────────────────────────────────────────────
def saddr(a): return f"`{a[:6]}...{a[-4:]}`"
def fval(v, d=18):
    try:
        n = float(v)/(10**d)
        return f"{n/1e6:.2f}M" if n>=1e6 else f"{n/1e3:.2f}K" if n>=1e3 else f"{n:.4f}"
    except: return "?"
def tago(ts):
    try:
        dt = datetime.fromisoformat(ts.replace("Z","+00:00"))
        s = int((datetime.now(timezone.utc)-dt).total_seconds())
        return f"{s}s ago" if s<60 else f"{s//60}m ago" if s<3600 else f"{s//3600}h ago" if s<86400 else f"{s//86400}d ago"
    except: return "recently"

def parse_chain(args: list) -> tuple:
    """从 args 里解析链名，返回 (address, chain_or_None)"""
    address = args[0].strip()
    chain = None
    if len(args) > 1:
        raw = args[1].lower()
        chain = CHAIN_ALIASES.get(raw, raw)
        if chain not in CHAINS:
            chain = None
    return address, chain

# ── AI 法官裁定 ───────────────────────────────────────────
async def ai_judge(address, chain, transfers, balance):
    if not DEEPSEEK_KEY: return "The court stenographer is unavailable. Judgment deferred."
    ci = CHAINS[chain]
    try: nb = f"{float(balance.get('balance','0'))/1e18:.4f} {ci['symbol']}"
    except: nb = f"? {ci['symbol']}"
    txs = [{"from":t.get("from_address","")[:10],"to":t.get("to_address","")[:10],
             "value":t.get("value","0"),"time":t.get("block_timestamp","")} for t in transfers[:5]]
    prompt = f"""You are the AI Judge of Meme Court — a crypto on-chain tribunal.
Analyze this {ci['name']} wallet and deliver a dramatic court verdict.

Address: {address}
Balance: {nb}
Recent transactions: {json.dumps(txs)}

Respond in exactly 2 sentences using judge/court language:
- Sentence 1: Is this wallet a whale, suspicious actor, or ordinary citizen?
- Sentence 2: Your ruling — guilty/innocent/under surveillance, and why.

Be dramatic but factual. Use phrases like "The court finds...", "This defendant...", "Hereby sentenced to..."."""

    try:
        async with aiohttp.ClientSession(trust_env=False) as s:
            async with s.post("https://api.deepseek.com/v1/chat/completions",
                headers={"Authorization":f"Bearer {DEEPSEEK_KEY}","Content-Type":"application/json"},
                json={"model":"deepseek-chat","messages":[{"role":"user","content":prompt}],
                      "max_tokens":180,"temperature":0.7},
                timeout=aiohttp.ClientTimeout(total=12)) as r:
                if r.status==200:
                    d = await r.json()
                    return d["choices"][0]["message"]["content"].strip()
    except: pass
    return "The court is in recess. Judgment deferred pending further evidence."

def verdict_label(balance_eth: float, tx_count: int) -> tuple:
    """返回 (verdict_text, emoji)"""
    if balance_eth > 10000: return ("GUILTY — MEGA WHALE", "🔴")
    if balance_eth > 1000:  return ("GUILTY — WHALE ACTIVITY", "🟠")
    if balance_eth > 100:   return ("PERSON OF INTEREST", "🟡")
    if tx_count == 0:       return ("CASE DISMISSED — NO EVIDENCE", "⚪")
    return ("INNOCENT — ORDINARY CITIZEN", "🟢")

# ── 命令处理 ──────────────────────────────────────────────
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chains_list = " · ".join([f"{v['emoji']}{v['name']}" for v in CHAINS.values()])
    await update.message.reply_text(
f"""⚖️ *MEME COURT — Verdict Protocol*
_The On-Chain Tribunal. Every wallet gets judged._

*Commands:*
⚖️ `/scan` `/judge` `<address> [chain]` — Summon wallet to court
🐋 `/whale` `/suspect` `[chain]` — View whale suspects
👁 `/watch` `/subpoena` `<address> [label]` — Issue surveillance order
📋 `/watchlist` `/docket` — View active cases
❌ `/unwatch` `<address>` — Dismiss case

*Supported Chains:*
{chains_list}

*Chain shortcuts:* eth, bnb, polygon, arb, op, base, mantle, avax

_Or paste any wallet address directly — court is always in session_ 🔨""",
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup([[
            InlineKeyboardButton("⚖️ verdictprotocol.online", url="https://verdictprotocol.online")
        ]]),
        disable_web_page_preview=True)

async def scan_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    args = context.args or []
    if not args:
        await update.message.reply_text("Usage: `/judge <address> [chain]`\nExample: `/judge 0x1234...abcd bnb`", parse_mode="Markdown")
        return
    address, chain = parse_chain(args)
    if not EVM_RE.match(address):
        await update.message.reply_text("❌ *Objection!* Invalid address format.", parse_mode="Markdown")
        return

    ci_name = CHAINS.get(chain, {}).get("name", "detecting chain") if chain else "detecting chain..."
    wait = await update.message.reply_text(
        f"⚖️ *Court is now in session...*\n🔍 Summoning {saddr(address)} to the stand\n🔗 Chain: {ci_name}",
        parse_mode="Markdown")

    # 自动检测链
    if not chain:
        chain = await auto_detect_chain(address)

    ci = CHAINS[chain]
    transfers, balance, tokens = await asyncio.gather(
        get_transfers(address, chain),
        get_balance(address, chain),
        get_tokens(address, chain),
    )
    ruling = await ai_judge(address, chain, transfers, balance)

    try: nb_raw = float(balance.get("balance","0"))/1e18
    except: nb_raw = 0
    nb = f"{nb_raw:,.4f} {ci['symbol']}"

    tx_lines = []
    for tx in transfers[:5]:
        d = "📤 OUT" if tx.get("from_address","").lower()==address.lower() else "📥 IN"
        tx_lines.append(f"  {d} `{fval(tx.get('value','0'))}` · {tago(tx.get('block_timestamp',''))}")
    token_lines = [f"  • {t.get('symbol','?')}: `{fval(t.get('balance','0'),int(t.get('decimals',18)))}`" for t in tokens[:3]]

    vtext, vemoji = verdict_label(nb_raw, len(transfers))
    case_no = case_number(address)

    report = f"""⚖️ *MEME COURT — CASE {case_no}*
━━━━━━━━━━━━━━━━━━━
👨‍⚖️ *THE HONORABLE AI JUDGE PRESIDING*
🪙 *Defendant:* {saddr(address)}
🔗 *Jurisdiction:* {ci['emoji']} {ci['name']}
━━━━━━━━━━━━━━━━━━━
📋 *EVIDENCE ON RECORD*
💰 Holdings: `{nb}`
📊 Transactions reviewed: `{len(transfers)}`

{chr(10).join(tx_lines) if tx_lines else "  _No transaction history found_"}
━━━━━━━━━━━━━━━━━━━
🪙 *ASSETS SEIZED FOR REVIEW*
{chr(10).join(token_lines) if token_lines else "  _No ERC20 assets found_"}
━━━━━━━━━━━━━━━━━━━
🔨 *VERDICT: {vtext}* {vemoji}
━━━━━━━━━━━━━━━━━━━
👨‍⚖️ *Judge's Ruling:*
_{ruling}_
━━━━━━━━━━━━━━━━━━━
[🔍 Block Explorer]({ci['explorer']}/address/{address}) · [⚖️ verdictprotocol.online](https://verdictprotocol.online)"""

    await wait.delete()
    await update.message.reply_text(report, parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup([[
            InlineKeyboardButton("👁 Issue Subpoena", callback_data=f"watch:{address}:{chain}"),
            InlineKeyboardButton("🔍 Block Explorer", url=f"{ci['explorer']}/address/{address}"),
        ]]), disable_web_page_preview=True)

async def watch_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    args = context.args or []
    if not args:
        await update.message.reply_text("Usage: `/subpoena <address> [label]`\nExample: `/subpoena 0x1234...abcd SuspectA`", parse_mode="Markdown")
        return
    address = args[0].strip()
    if not EVM_RE.match(address):
        await update.message.reply_text("❌ Invalid address."); return
    label = args[1] if len(args)>1 else address[:8]+"..."
    chain = "bnb"
    if len(args)>2:
        raw = args[2].lower()
        chain = CHAIN_ALIASES.get(raw, raw) if raw in CHAIN_ALIASES or raw in CHAINS else "bnb"
    ci = CHAINS[chain]
    chat_id = update.effective_chat.id
    if chat_id not in watchlist: watchlist[chat_id] = []
    if any(w["address"].lower()==address.lower() for w in watchlist[chat_id]):
        await update.message.reply_text(f"⚠️ This suspect is already under surveillance."); return
    watchlist[chat_id].append({"address":address,"label":label,"chain":chain})
    await update.message.reply_text(
        f"📋 *Subpoena Issued*\n━━━━━━━━━━━━━━━━━━━\n"
        f"👤 *Suspect:* {label}\n{ci['emoji']} {ci['name']} · {saddr(address)}\n\n"
        f"_Court surveillance activated. You will be notified of large movements._ 🔨",
        parse_mode="Markdown")

async def watchlist_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    watches = watchlist.get(chat_id, [])
    if not watches:
        await update.message.reply_text(
            "📋 *Court Docket — No Active Cases*\n\nUse `/subpoena <address>` to open a case.",
            parse_mode="Markdown"); return
    lines = ["📋 *Court Docket — Active Cases*\n━━━━━━━━━━━━━━━━━━━\n"]
    for i,w in enumerate(watches,1):
        ci = CHAINS.get(w["chain"], CHAINS["bnb"])
        lines.append(f"{i}. {ci['emoji']} *{w['label']}* · {saddr(w['address'])}")
    lines.append(f"\n_Total: {len(watches)} case(s) under surveillance_")
    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")

async def unwatch_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    args = context.args or []
    if not args:
        await update.message.reply_text("Usage: `/unwatch <address>`", parse_mode="Markdown"); return
    address = args[0].lower()
    chat_id = update.effective_chat.id
    before = len(watchlist.get(chat_id,[]))
    watchlist[chat_id] = [w for w in watchlist.get(chat_id,[]) if w["address"].lower()!=address]
    if len(watchlist.get(chat_id,[]))<before:
        await update.message.reply_text("✅ *Case dismissed.* Surveillance order lifted. 🔨", parse_mode="Markdown")
    else:
        await update.message.reply_text("❌ Suspect not found in docket.")

# 已知巨鲸
KNOWN_WHALES = {
    "bnb": [
        {"address":"0x8894e0a0c962cb723c1976a4421c95949be2d4e3","label":"Binance Hot Wallet"},
        {"address":"0xF977814e90dA44bFA03b6295A0616a897441aceC","label":"Binance Whale #2"},
        {"address":"0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE","label":"Binance Cold Wallet"},
    ],
    "eth": [
        {"address":"0xDA9dfA130Df4dE4673b89022EE50ff26f6EA73Cf","label":"Kraken Exchange"},
        {"address":"0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503","label":"Binance ETH Whale"},
    ],
    "mantle": [
        {"address":"0x2F88a55a2E2F2c34b7eDDaDd99Dd3E10a3BCb2F4","label":"Mantle Foundation"},
    ]
}

async def whale_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    args = context.args or []
    raw = args[0].lower() if args else "bnb"
    chain = CHAIN_ALIASES.get(raw, raw) if raw in CHAIN_ALIASES else raw
    if chain not in CHAINS: chain = "bnb"
    ci = CHAINS[chain]
    whales = KNOWN_WHALES.get(chain, KNOWN_WHALES["bnb"])

    wait = await update.message.reply_text(
        f"⚖️ *Meme Court — Suspect Lineup*\n🔍 Scanning {ci['emoji']} {ci['name']} for whale activity...",
        parse_mode="Markdown")

    results = []
    for w in whales[:3]:
        txs = await get_transfers(w["address"], chain, 2)
        bal = await get_balance(w["address"], chain)
        try: nb = float(bal.get("balance","0"))/1e18
        except: nb = 0
        latest = txs[0] if txs else {}
        val = float(latest.get("value","0"))/1e18 if latest else 0
        direction = "📤 OUT" if latest.get("from_address","").lower()==w["address"].lower() else "📥 IN"
        results.append({"label":w["label"],"address":w["address"],"balance":nb,
                        "direction":direction,"last_val":val,"last_time":latest.get("block_timestamp","")})

    if not results:
        await wait.edit_text("🐋 No whale activity detected. Court is in recess.", parse_mode="Markdown"); return

    lines = [f"⚖️ *MEME COURT — SUSPECT LINEUP*\n{ci['emoji']} *{ci['name']} Whale Watch*\n━━━━━━━━━━━━━━━━━━━"]
    for i, r in enumerate(results, 1):
        bal_fmt = f"{r['balance']/1e3:.1f}K" if r['balance']>=1000 else f"{r['balance']:.2f}"
        status = "🔴 ACTIVE" if r['last_time'] and "ago" not in tago(r['last_time']) or "s ago" in tago(r['last_time']) or "m ago" in tago(r['last_time']) else "🟡 RECENT"
        lines.append(
            f"\n*Suspect #{i}:* {r['label']}\n"
            f"  💰 `{bal_fmt} {ci['symbol']}` · {status}\n"
            f"  {r['direction']} `{r['last_val']:.4f}` · {tago(r['last_time'])}\n"
            f"  {saddr(r['address'])}"
        )
    lines.append(f"\n━━━━━━━━━━━━━━━━━━━\n_All suspects are innocent until proven otherwise_ ⚖️")

    chain_buttons = [InlineKeyboardButton(f"{CHAINS[c]['emoji']} {CHAINS[c]['name']}", callback_data=f"whale:{c}")
                     for c in ["bnb","eth","base","mantle"]]
    await wait.edit_text("\n".join(lines), parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup([chain_buttons[:2], chain_buttons[2:]]),
        disable_web_page_preview=True)

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data = query.data
    if data.startswith("watch:"):
        _, address, chain = data.split(":")
        chat_id = update.effective_chat.id
        if chat_id not in watchlist: watchlist[chat_id] = []
        if not any(w["address"].lower()==address.lower() for w in watchlist[chat_id]):
            watchlist[chat_id].append({"address":address,"label":address[:8]+"...","chain":chain})
            await context.bot.send_message(chat_id, "📋 *Subpoena issued.* Suspect added to court docket. 🔨", parse_mode="Markdown")
        else:
            await context.bot.send_message(chat_id, "⚠️ Already under surveillance.")
    elif data.startswith("whale:"):
        context.args = [data.split(":")[1]]
        await whale_command(update, context)

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    addrs = EVM_RE.findall(text)
    if not addrs:
        if update.message.chat.type=="private":
            await update.message.reply_text("⚖️ *Court is in session.*\nPaste a wallet address to summon it before the judge, or use /help.", parse_mode="Markdown")
        return
    context.args = [addrs[0]]
    await scan_command(update, context)

# ── 后台监控 ──────────────────────────────────────────────
async def monitor_wallets(app):
    last_tx: dict = {}
    while True:
        await asyncio.sleep(60)
        for chat_id, watches in list(watchlist.items()):
            for w in watches:
                try:
                    txs = await get_transfers(w["address"], w["chain"], 3)
                    if not txs: continue
                    h = txs[0].get("hash","")
                    if last_tx.get(w["address"])==h: continue
                    last_tx[w["address"]] = h
                    tx = txs[0]
                    val = float(tx.get("value","0"))/1e18
                    ci = CHAINS.get(w["chain"], CHAINS["bnb"])
                    if val < ci["whale_threshold"]/2000: continue
                    direction = "📤 OUTBOUND" if tx.get("from_address","").lower()==w["address"].lower() else "📥 INBOUND"
                    await app.bot.send_message(chat_id,
                        f"🚨 *COURT ALERT — {w['label']}*\n━━━━━━━━━━━━━━━━━━━\n"
                        f"{ci['emoji']} {ci['name']} · {direction}\n"
                        f"💰 `{val:.4f} {ci['symbol']}` detected\n"
                        f"[🔍 View Evidence]({ci['explorer']}/tx/{h})\n\n"
                        f"_The court demands your attention._ ⚖️",
                        parse_mode="Markdown", disable_web_page_preview=True)
                except Exception as e:
                    print(f"Monitor err: {e}")

def main():
    if not TELEGRAM_TOKEN:
        print("❌ TELEGRAM_TOKEN not set"); return
    if not MORALIS_KEY:
        print("⚠️  MORALIS_API_KEY not set")
    print("⚖️  Meme Court Bot v3 starting...")
    app = Application.builder().token(TELEGRAM_TOKEN).build()

    # 原始命令 + 法庭别名
    for cmd in ["start","help"]: app.add_handler(CommandHandler(cmd, start))
    for cmd in ["scan","judge"]: app.add_handler(CommandHandler(cmd, scan_command))
    for cmd in ["watch","subpoena"]: app.add_handler(CommandHandler(cmd, watch_command))
    for cmd in ["watchlist","docket"]: app.add_handler(CommandHandler(cmd, watchlist_command))
    for cmd in ["whale","suspect"]: app.add_handler(CommandHandler(cmd, whale_command))
    app.add_handler(CommandHandler("unwatch", unwatch_command))
    app.add_handler(CallbackQueryHandler(button_callback))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    async def post_init(a): asyncio.create_task(monitor_wallets(a))
    app.post_init = post_init
    print("✅ Court is in session. Ctrl+C to adjourn.")
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
