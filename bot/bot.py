"""
Verdict Protocol — Verdict Protocol Telegram Bot v3
⚖️ Full EVM Support + Verdict Protocol Theme + Bilingual (EN/ZH)
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

CHAINS = {
    "eth":       {"name":"Ethereum",    "emoji":"🔵","moralis_chain":"eth",      "explorer":"https://etherscan.io",              "symbol":"ETH",  "whale_threshold":500000},
    "bnb":       {"name":"BNB Chain",   "emoji":"🟡","moralis_chain":"bsc",      "explorer":"https://bscscan.com",               "symbol":"BNB",  "whale_threshold":50000},
    "polygon":   {"name":"Polygon",     "emoji":"🟣","moralis_chain":"polygon",  "explorer":"https://polygonscan.com",           "symbol":"MATIC","whale_threshold":50000},
    "arbitrum":  {"name":"Arbitrum",    "emoji":"🔷","moralis_chain":"arbitrum", "explorer":"https://arbiscan.io",               "symbol":"ETH",  "whale_threshold":100000},
    "optimism":  {"name":"Optimism",    "emoji":"🔴","moralis_chain":"optimism", "explorer":"https://optimistic.etherscan.io",   "symbol":"ETH",  "whale_threshold":100000},
    "base":      {"name":"Base",        "emoji":"🟦","moralis_chain":"base",     "explorer":"https://basescan.org",              "symbol":"ETH",  "whale_threshold":100000},
    "mantle":    {"name":"Mantle",      "emoji":"🟢","moralis_chain":"mantle",   "explorer":"https://mantlescan.xyz",            "symbol":"MNT",  "whale_threshold":10000},
    "avalanche": {"name":"Avalanche",   "emoji":"🔺","moralis_chain":"avalanche","explorer":"https://snowtrace.io",              "symbol":"AVAX", "whale_threshold":100000},
}

CHAIN_ALIASES = {
    "bsc":"bnb","binance":"bnb","eth":"eth","ethereum":"bnb",
    "poly":"polygon","matic":"polygon","arb":"arbitrum",
    "op":"optimism","mnt":"mantle","avax":"avalanche","avl":"avalanche",
}

AUTO_DETECT_ORDER = ["bnb","eth","base","arbitrum","polygon","mantle","optimism","avalanche"]
EVM_RE = re.compile(r"0x[a-fA-F0-9]{40}")
KV_URL   = os.getenv("KV_REST_API_URL", "")
KV_TOKEN = os.getenv("KV_REST_API_TOKEN", "")

# ── KV helpers ────────────────────────────────────────────
async def kv_set(key: str, value: str):
    if not KV_URL or not KV_TOKEN: return
    import urllib.parse
    url = f"{KV_URL}/set/{urllib.parse.quote(key, safe='')}/{urllib.parse.quote(value, safe='')}"
    try:
        async with aiohttp.ClientSession() as s:
            await s.get(url, headers={"Authorization": f"Bearer {KV_TOKEN}"}, timeout=aiohttp.ClientTimeout(total=5))
    except Exception as e:
        print(f"KV set error: {e}")

async def kv_get(key: str) -> str:
    if not KV_URL or not KV_TOKEN: return ""
    import urllib.parse
    url = f"{KV_URL}/get/{urllib.parse.quote(key, safe='')}"
    try:
        async with aiohttp.ClientSession() as s:
            async with s.get(url, headers={"Authorization": f"Bearer {KV_TOKEN}"}, timeout=aiohttp.ClientTimeout(total=5)) as r:
                data = await r.json()
                return data.get("result") or ""
    except Exception as e:
        print(f"KV get error: {e}")
    return ""

# ── Language system ───────────────────────────────────────
T = {
    "en": {
        "start_intro": "⚖️ *VERDICT PROTOCOL — Verdict Protocol*\n_The On-Chain Tribunal. Every wallet gets judged._",
        "start_commands": "*Commands:*\n⚖️ `/scan` `/judge` `<address> [chain]` — Analyze wallet on-chain\n🐋 `/whale` `/wallet` `[chain]` — View whale wallets\n🟢 `/mantle` — Mantle ecosystem live data\n💰 `/price` `<token or address>` — Token price & 24h change\n⚔️ `/compare` `<addr1> <addr2> [chain]` — Compare two wallets, get AI ruling\n👁 `/watch` `/subpoena` `<address> [label]` — Issue surveillance order\n📋 `/watchlist` `/docket` — View active cases\n❌ `/unwatch` `<address>` — Dismiss case\n🌐 `/lang en` or `/lang zh` — Switch language",
        "supported_chains": "Supported Chains",
        "chains_note": "Or paste any wallet address directly — protocol is always live",
        "lang_set": "✅ Language set to English",
        "lang_invalid": "Please use `/lang en` or `/lang zh`",
        "scan_usage": "Usage: `/judge <address> [chain]`\nExample: `/judge 0x1234...abcd bnb`",
        "scan_invalid": "❌ *Objection!* Invalid address format.",
        "scan_detecting": "detecting chain...",
        "scan_session": "⚖️ *Protocol is now live...*\n🔍 Analyzeing {addr} for analysis\n🔗 Chain: {chain}",
        "scan_no_tx": "_No transaction history found_",
        "scan_no_tokens": "_No ERC20 assets found_",
        "watch_usage": "Usage: `/subpoena <address> [label]`\nExample: `/subpoena 0x1234...abcd WalletA`",
        "watch_invalid": "❌ Invalid address.",
        "watch_exists": "⚠️ This wallet is already being watched.",
        "watch_issued": "📋 *Watch Added*\n━━━━━━━━━━━━━━━━━━━\n👤 *Wallet:* {label}\n{emoji} {chain} · {addr}\n\n_Protocol watch activated. You will be notified of large movements._ 🔨",
        "watchlist_empty": "📋 *Watch List — No Active Watches*\n\nUse `/subpoena <address>` to add a watch.",
        "watchlist_header": "📋 *Watch List — Active Watches*\n━━━━━━━━━━━━━━━━━━━\n",
        "watchlist_footer": "\n_Total: {n} case(s) being watched_",
        "unwatch_usage": "Usage: `/unwatch <address>`",
        "unwatch_ok": "✅ *Report dismissed.* Watch removed. 🔨",
        "unwatch_fail": "❌ Wallet not found in docket.",
        "whale_session": "⚖️ *Verdict Protocol — Wallet Analysis*\n🔍 Scanning {emoji} {chain} for whale activity...",
        "whale_empty": "🐋 No whale activity detected. Court is in recess.",
        "whale_footer": "\n_All wallets are innocent until proven otherwise_ ⚖️",
        "compare_usage": "Usage: `/compare <address1> <address2> [chain]`\nExample: `/compare 0xAAA...aaa 0xBBB...bbb mantle`",
        "compare_invalid": "❌ *Invalid address format.*",
        "compare_session": "⚖️ *Protocol is comparing two wallets...*\n🔍 Analyzeing both defendants for analysis\n🔗 Chain: {emoji} {chain}",
        "compare_disagree": "⚔️ *Challenge the result?*\n_Issue a duel and let on-chain data decide!_",
        "price_usage": "Usage:\n`/price MNT` — by token name\n`/price 0x1234...abcd mantle` — by contract address",
        "price_fetching": "💰 *Fetching price data...*",
        "price_not_found": "❌ *Token not found:* `{query}`\n\nTry using the contract address:\n`/price 0x... mantle`",
        "mantle_loading": "🟢 *Mantle Ecosystem — Loading...*\n🔍 Fetching live data from DeFiLlama & Mantle RPC...",
        "mantle_no_data": "_No data available_",
        "mantle_rpc_unavail": "_RPC unavailable_",
        "subpoena_issued": "📋 *Watch added.* Wallet added to watch list. 🔨",
        "already_watching": "⚠️ Already being watched.",
        "handle_msg": "⚖️ *Protocol is live.*\nPaste a wallet address to analyze it before the judge, or use /help.",
        "monitor_alert": "🚨 *PROTOCOL ALERT — {label}*\n━━━━━━━━━━━━━━━━━━━\n{emoji} {chain} · {direction}\n💰 `{val:.4f} {symbol}` detected\n[🔍 View Evidence]({explorer}/tx/{hash})\n\n_Protocol requires your attention._ ⚖️",
        "monitor_outbound": "📤 OUTBOUND",
        "monitor_inbound": "📥 INBOUND",
    },
    "zh": {
        "start_intro": "⚖️ *VERDICT PROTOCOL — Verdict Protocol*\n_链上裁判所。每个钱包都将被审判。_",
        "start_commands": "*命令列表：*\n⚖️ `/scan` `/judge` `<地址> [链]` — 分析链上钱包\n🐋 `/whale` `/wallet` `[链]` — 查看巨鲸钱包\n🟢 `/mantle` — Mantle 生态实时数据\n💰 `/price` `<代币或地址>` — 代币价格与24h涨跌\n⚔️ `/compare` `<地址1> <地址2> [链]` — 对比两个钱包，获取 AI 裁决\n👁 `/watch` `/subpoena` `<地址> [标签]` — 发出监控令\n📋 `/watchlist` `/docket` — 查看活跃监控\n❌ `/unwatch` `<地址>` — 撤销案件\n🌐 `/lang en` 或 `/lang zh` — 切换语言",
        "supported_chains": "支持的链",
        "chains_note": "或直接粘贴钱包地址 — 协议随时运行",
        "lang_set": "✅ 语言已切换为中文",
        "lang_invalid": "请使用 `/lang en` 或 `/lang zh`",
        "scan_usage": "用法：`/judge <地址> [链]`\n示例：`/judge 0x1234...abcd bnb`",
        "scan_invalid": "❌ *异议！* 地址格式无效。",
        "scan_detecting": "自动检测链中...",
        "scan_session": "⚖️ *协议运行中...*\n🔍 正在分析 {addr} 上庭\n🔗 链：{chain}",
        "scan_no_tx": "_未找到交易记录_",
        "scan_no_tokens": "_未找到 ERC20 资产_",
        "watch_usage": "用法：`/subpoena <地址> [标签]`\n示例：`/subpoena 0x1234...abcd 钱包A`",
        "watch_invalid": "❌ 地址无效。",
        "watch_exists": "⚠️ 该钱包已在监控列表中。",
        "watch_issued": "📋 *已发出传票*\n━━━━━━━━━━━━━━━━━━━\n👤 *钱包：* {label}\n{emoji} {chain} · {addr}\n\n_协议监控已激活。发现大额转账将立即通知你。_ 🔨",
        "watchlist_empty": "📋 *监控列表 — 无活跃监控*\n\n使用 `/subpoena <地址>` 添加监控。",
        "watchlist_header": "📋 *监控列表 — 活跃监控*\n━━━━━━━━━━━━━━━━━━━\n",
        "watchlist_footer": "\n_共 {n} 个地址监控中_",
        "unwatch_usage": "用法：`/unwatch <地址>`",
        "unwatch_ok": "✅ *监控已移除。* 监控已移除。 🔨",
        "unwatch_fail": "❌ 台账中未找到该钱包。",
        "whale_session": "⚖️ *法庭钱包分析*\n🔍 正在扫描 {emoji} {chain} 巨鲸活动...",
        "whale_empty": "🐋 未检测到巨鲸活动。协议暂时离线。",
        "whale_footer": "\n_所有钱包在定罪前均为无辜_ ⚖️",
        "compare_usage": "用法：`/compare <地址1> <地址2> [链]`\n示例：`/compare 0xAAA...aaa 0xBBB...bbb mantle`",
        "compare_invalid": "❌ *地址格式无效。*",
        "compare_session": "⚖️ *协议正在比对两个钱包...*\n🔍 正在分析两位被告上庭\n🔗 链：{emoji} {chain}",
        "compare_disagree": "⚔️ *对结果有异议？*\n_发起对决，让数据说话！_",
        "price_usage": "用法：\n`/price MNT` — 按代币名称\n`/price 0x1234...abcd mantle` — 按合约地址",
        "price_fetching": "💰 *正在获取价格数据...*",
        "price_not_found": "❌ *未找到代币：* `{query}`\n\n请尝试使用合约地址：\n`/price 0x... mantle`",
        "mantle_loading": "🟢 *Mantle 生态报告 — 加载中...*\n🔍 正在从 DeFiLlama & Mantle RPC 获取实时数据...",
        "mantle_no_data": "_暂无数据_",
        "mantle_rpc_unavail": "_RPC 不可用_",
        "subpoena_issued": "📋 *已加入监控。* 钱包已加入监控列表。 🔨",
        "already_watching": "⚠️ 已在监控列表中。",
        "handle_msg": "⚖️ *协议运行中。*\n粘贴钱包地址即可分析上庭，或使用 /help。",
        "monitor_alert": "🚨 *协议警报 — {label}*\n━━━━━━━━━━━━━━━━━━━\n{emoji} {chain} · {direction}\n💰 检测到 `{val:.4f} {symbol}`\n[🔍 查看证据]({explorer}/tx/{hash})\n\n_协议需要你立即关注。_ ⚖️",
        "monitor_outbound": "📤 转出",
        "monitor_inbound": "📥 转入",
    }
}

async def get_user_lang(username: str) -> str:
    if not username: return "en"
    lang = await kv_get(f"lang:{username.lower()}")
    return lang if lang in ("en", "zh") else "en"

async def lang_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    username = user.username if user else None
    args = context.args
    if not args or args[0] not in ("en", "zh"):
        lang = await get_user_lang(username)
        await update.message.reply_text(T[lang]["lang_invalid"], parse_mode="Markdown")
        return
    new_lang = args[0]
    if username:
        await kv_set(f"lang:{username.lower()}", new_lang)
    await update.message.reply_text(T[new_lang]["lang_set"], parse_mode="Markdown")

async def send_duel_notification(bot, username: str, message: str):
    chat_id = await kv_get(f"tg:user:{username.lower()}")
    if not chat_id:
        print(f"[Notify] No chat_id for @{username}")
        return False
    try:
        await bot.send_message(chat_id=int(chat_id), text=message, parse_mode="Markdown")
        print(f"[Notify] Sent to @{username}")
        return True
    except Exception as e:
        print(f"[Notify] Failed: {e}")
        return False

watchlist: dict = {}

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
    for chain in AUTO_DETECT_ORDER:
        bal = await get_balance(address, chain)
        try:
            if float(bal.get("balance","0")) > 0:
                return chain
        except: pass
        txs = await get_transfers(address, chain, 1)
        if txs: return chain
    return "bnb"

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
    address = args[0].strip()
    chain = None
    if len(args) > 1:
        raw = args[1].lower()
        chain = CHAIN_ALIASES.get(raw, raw)
        if chain not in CHAINS:
            chain = None
    return address, chain

async def ai_judge(address, chain, transfers, balance):
    if not DEEPSEEK_KEY: return "The AI analysis is unavailable. Judgment deferred."
    ci = CHAINS[chain]
    try: nb = f"{float(balance.get('balance','0'))/1e18:.4f} {ci['symbol']}"
    except: nb = f"? {ci['symbol']}"
    txs = [{"from":t.get("from_address","")[:10],"to":t.get("to_address","")[:10],
             "value":t.get("value","0"),"time":t.get("block_timestamp","")} for t in transfers[:5]]
    prompt = f"""You are the AI Judge of Verdict Protocol — a crypto on-chain tribunal.
Analyze this {ci['name']} wallet and deliver a dramatic court verdict.

Address: {address}
Balance: {nb}
Recent transactions: {json.dumps(txs)}

Respond in exactly 2 sentences using judge/court language:
- Sentence 1: Is this wallet a whale, suspicious actor, or ordinary citizen?
- Sentence 2: Your ruling — guilty/innocent/being watched, and why.

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
    return "The protocol is offline. Judgment deferred pending further evidence."

def verdict_label(balance_eth: float, tx_count: int) -> tuple:
    if balance_eth > 10000: return ("GUILTY — MEGA WHALE", "🔴")
    if balance_eth > 1000:  return ("GUILTY — WHALE ACTIVITY", "🟠")
    if balance_eth > 100:   return ("PERSON OF INTEREST", "🟡")
    if tx_count == 0:       return ("REPORT DISMISSED — NO EVIDENCE", "⚪")
    return ("INNOCENT — ORDINARY CITIZEN", "🟢")

# ── Commands ──────────────────────────────────────────────
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chains_list = " · ".join([f"{v['emoji']}{v['name']}" for v in CHAINS.values()])
    user = update.effective_user
    if user and user.username:
        await kv_set(f"tg:user:{user.username.lower()}", str(update.effective_chat.id))
        print(f"[KV] Registered @{user.username} → {update.effective_chat.id}")
    lang = await get_user_lang(user.username if user else None)
    L = T[lang]
    await update.message.reply_text(
f"""{L["start_intro"]}

{L["start_commands"]}

{L["supported_chains"]}:
{chains_list}

{L["chains_note"]} 🔨""",
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup([[
            InlineKeyboardButton("⚖️ verdictprotocol.online", url="https://verdictprotocol.online")
        ]]),
        disable_web_page_preview=True)

async def scan_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    lang = await get_user_lang(user.username if user else None)
    L = T[lang]
    args = context.args or []
    if not args:
        await update.message.reply_text(L["scan_usage"], parse_mode="Markdown")
        return
    address, chain = parse_chain(args)
    if not EVM_RE.match(address):
        await update.message.reply_text(L["scan_invalid"], parse_mode="Markdown")
        return

    ci_name = CHAINS.get(chain, {}).get("name", L["scan_detecting"]) if chain else L["scan_detecting"]
    wait = await update.message.reply_text(
        L["scan_session"].format(addr=saddr(address), chain=ci_name),
        parse_mode="Markdown")

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

    report = f"""⚖️ *VERDICT PROTOCOL — REPORT {case_no}*
━━━━━━━━━━━━━━━━━━━
👨‍⚖️ *VERDICT PROTOCOL AI ANALYSIS*
🪙 *Defendant:* {saddr(address)}
🔗 *Network:* {ci['emoji']} {ci['name']}
━━━━━━━━━━━━━━━━━━━
📋 *ON-CHAIN DATA*
💰 Holdings: `{nb}`
📊 Transactions analyzed: `{len(transfers)}`

{chr(10).join(tx_lines) if tx_lines else "  " + L["scan_no_tx"]}
━━━━━━━━━━━━━━━━━━━
🪙 *TOKEN HOLDINGS*
{chr(10).join(token_lines) if token_lines else "  " + L["scan_no_tokens"]}
━━━━━━━━━━━━━━━━━━━
🔨 *VERDICT: {vtext}* {vemoji}
━━━━━━━━━━━━━━━━━━━
👨‍⚖️ *AI Verdict:*
_{ruling}_
━━━━━━━━━━━━━━━━━━━
[🔍 Block Explorer]({ci['explorer']}/address/{address}) · [⚖️ verdictprotocol.online](https://verdictprotocol.online)"""

    await wait.delete()
    await update.message.reply_text(report, parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup([[
            InlineKeyboardButton("👁 Add to Watch", callback_data=f"watch:{address}:{chain}"),
            InlineKeyboardButton("🔍 Block Explorer", url=f"{ci['explorer']}/address/{address}"),
        ]]), disable_web_page_preview=True)

async def watch_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    lang = await get_user_lang(user.username if user else None)
    L = T[lang]
    args = context.args or []
    if not args:
        await update.message.reply_text(L["watch_usage"], parse_mode="Markdown")
        return
    address = args[0].strip()
    if not EVM_RE.match(address):
        await update.message.reply_text(L["watch_invalid"]); return
    label = args[1] if len(args)>1 else address[:8]+"..."
    chain = "bnb"
    if len(args)>2:
        raw = args[2].lower()
        chain = CHAIN_ALIASES.get(raw, raw) if raw in CHAIN_ALIASES or raw in CHAINS else "bnb"
    ci = CHAINS[chain]
    chat_id = update.effective_chat.id
    if chat_id not in watchlist: watchlist[chat_id] = []
    if any(w["address"].lower()==address.lower() for w in watchlist[chat_id]):
        await update.message.reply_text(L["watch_exists"]); return
    watchlist[chat_id].append({"address":address,"label":label,"chain":chain})
    await update.message.reply_text(
        L["watch_issued"].format(label=label, emoji=ci["emoji"], chain=ci["name"], addr=saddr(address)),
        parse_mode="Markdown")

async def watchlist_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    lang = await get_user_lang(user.username if user else None)
    L = T[lang]
    chat_id = update.effective_chat.id
    watches = watchlist.get(chat_id, [])
    if not watches:
        await update.message.reply_text(L["watchlist_empty"], parse_mode="Markdown"); return
    lines = [L["watchlist_header"]]
    for i,w in enumerate(watches,1):
        ci = CHAINS.get(w["chain"], CHAINS["bnb"])
        lines.append(f"{i}. {ci['emoji']} *{w['label']}* · {saddr(w['address'])}")
    lines.append(L["watchlist_footer"].format(n=len(watches)))
    await update.message.reply_text("".join(lines) if L["watchlist_header"].endswith("\n") else "\n".join(lines), parse_mode="Markdown")

async def unwatch_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    lang = await get_user_lang(user.username if user else None)
    L = T[lang]
    args = context.args or []
    if not args:
        await update.message.reply_text(L["unwatch_usage"], parse_mode="Markdown"); return
    address = args[0].lower()
    chat_id = update.effective_chat.id
    before = len(watchlist.get(chat_id,[]))
    watchlist[chat_id] = [w for w in watchlist.get(chat_id,[]) if w["address"].lower()!=address]
    if len(watchlist.get(chat_id,[]))<before:
        await update.message.reply_text(L["unwatch_ok"], parse_mode="Markdown")
    else:
        await update.message.reply_text(L["unwatch_fail"])

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
    user = update.effective_user
    lang = await get_user_lang(user.username if user else None)
    L = T[lang]
    args = context.args or []
    raw = args[0].lower() if args else "bnb"
    chain = CHAIN_ALIASES.get(raw, raw) if raw in CHAIN_ALIASES else raw
    if chain not in CHAINS: chain = "bnb"
    ci = CHAINS[chain]
    whales = KNOWN_WHALES.get(chain, KNOWN_WHALES["bnb"])

    wait = await update.message.reply_text(
        L["whale_session"].format(emoji=ci["emoji"], chain=ci["name"]),
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
        await wait.edit_text(L["whale_empty"], parse_mode="Markdown"); return

    lines = [f"⚖️ *VERDICT PROTOCOL — WALLET ANALYSIS*\n{ci['emoji']} *{ci['name']} Whale Watch*\n━━━━━━━━━━━━━━━━━━━"]
    for i, r in enumerate(results, 1):
        bal_fmt = f"{r['balance']/1e3:.1f}K" if r['balance']>=1000 else f"{r['balance']:.2f}"
        status = "🔴 ACTIVE" if r['last_time'] and ("s ago" in tago(r['last_time']) or "m ago" in tago(r['last_time'])) else "🟡 RECENT"
        lines.append(
            f"\n*Wallet #{i}:* {r['label']}\n"
            f"  💰 `{bal_fmt} {ci['symbol']}` · {status}\n"
            f"  {r['direction']} `{r['last_val']:.4f}` · {tago(r['last_time'])}\n"
            f"  {saddr(r['address'])}"
        )
    lines.append(L["whale_footer"])

    chain_buttons = [InlineKeyboardButton(f"{CHAINS[c]['emoji']} {CHAINS[c]['name']}", callback_data=f"whale:{c}")
                     for c in ["bnb","eth","base","mantle"]]
    await wait.edit_text("\n".join(lines), parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup([chain_buttons[:2], chain_buttons[2:]]),
        disable_web_page_preview=True)

async def compare_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    lang = await get_user_lang(user.username if user else None)
    L = T[lang]
    args = context.args or []
    if len(args) < 2:
        await update.message.reply_text(L["compare_usage"], parse_mode="Markdown")
        return

    addr1, addr2 = args[0].strip(), args[1].strip()
    if not EVM_RE.match(addr1) or not EVM_RE.match(addr2):
        await update.message.reply_text(L["compare_invalid"], parse_mode="Markdown")
        return

    chain = "bnb"
    if len(args) > 2:
        raw = args[2].lower()
        chain = CHAIN_ALIASES.get(raw, raw) if raw in CHAIN_ALIASES or raw in CHAINS else "bnb"

    ci = CHAINS[chain]
    case_no = case_number(addr1 + addr2)

    wait = await update.message.reply_text(
        L["compare_session"].format(emoji=ci["emoji"], chain=ci["name"]),
        parse_mode="Markdown")

    txs1, bal1, tok1, txs2, bal2, tok2 = await asyncio.gather(
        get_transfers(addr1, chain, 20), get_balance(addr1, chain), get_tokens(addr1, chain),
        get_transfers(addr2, chain, 20), get_balance(addr2, chain), get_tokens(addr2, chain),
    )

    def analyze(addr, txs, bal, tokens):
        try: balance = float(bal.get("balance","0"))/1e18
        except: balance = 0
        inflow = sum(float(t.get("value","0"))/1e18 for t in txs if t.get("to_address","").lower()==addr.lower())
        outflow = sum(float(t.get("value","0"))/1e18 for t in txs if t.get("from_address","").lower()==addr.lower())
        net = inflow - outflow
        max_tx = max((float(t.get("value","0"))/1e18 for t in txs), default=0)
        last_active = tago(txs[0].get("block_timestamp","")) if txs else "N/A"
        score = 0
        score += min(40, balance * 0.4)
        score += min(20, len(txs))
        score += min(20, max(0, net * 2))
        score += min(10, len(tokens) * 2)
        if txs and "ago" in last_active:
            if "s ago" in last_active or "m ago" in last_active: score += 10
            elif "h ago" in last_active: score += 7
            elif "d ago" in last_active: score += 3
        return {"balance": balance, "tx_count": len(txs), "net": net, "max_tx": max_tx,
                "token_count": len(tokens), "last_active": last_active, "score": min(100, int(score)),
                "inflow": inflow, "outflow": outflow}

    a1 = analyze(addr1, txs1, bal1, tok1)
    a2 = analyze(addr2, txs2, bal2, tok2)
    symbol = ci["symbol"]

    def fmt(v): return f"{v:,.4f}" if v < 1000 else f"{v:,.2f}"

    prompt = f"""You are the AI Judge of Verdict Protocol — an on-chain tribunal for wallet disputes.
Compare these two {ci['name']} wallets and deliver a dramatic court ruling.
RED CORNER: {addr1[:10]}... — Balance: {fmt(a1['balance'])} {symbol}, Txs: {a1['tx_count']}, Score: {a1['score']}/100
BLUE CORNER: {addr2[:10]}... — Balance: {fmt(a2['balance'])} {symbol}, Txs: {a2['tx_count']}, Score: {a2['score']}/100
Respond in exactly 2 dramatic sentences. Declare the winner."""

    ruling = ""
    if DEEPSEEK_KEY:
        try:
            async with aiohttp.ClientSession(trust_env=False) as s:
                async with s.post("https://api.deepseek.com/v1/chat/completions",
                    headers={"Authorization":f"Bearer {DEEPSEEK_KEY}","Content-Type":"application/json"},
                    json={"model":"deepseek-chat","messages":[{"role":"user","content":prompt}],
                          "max_tokens":200,"temperature":0.7},
                    timeout=aiohttp.ClientTimeout(total=12)) as r:
                    if r.status==200:
                        d = await r.json()
                        ruling = d["choices"][0]["message"]["content"].strip()
        except: ruling = "Protocol analysis unavailable at this time."
    if not ruling:
        ruling = await ai_judge(addr1, chain, txs1, bal1)

    winner = "🔴 RED" if a1['score'] >= a2['score'] else "🔵 BLUE"
    score_bar1 = "█" * (a1['score']//10) + "░" * (10 - a1['score']//10)
    score_bar2 = "█" * (a2['score']//10) + "░" * (10 - a2['score']//10)

    report = f"""⚖️ *VERDICT PROTOCOL — REPORT {case_no}*
{ci['emoji']} *{ci['name']} Wallet Comparison*
━━━━━━━━━━━━━━━━━━━
*🔴 RED CORNER*
  👤 `{addr1[:6]}...{addr1[-4:]}`
  💰 Balance: `{fmt(a1['balance'])} {symbol}`
  📊 Transactions: `{a1['tx_count']}`
  💸 Net Flow: `{'+' if a1['net']>=0 else ''}{fmt(a1['net'])} {symbol}`
  🕐 Last Active: `{a1['last_active']}`

*🔵 BLUE CORNER*
  👤 `{addr2[:6]}...{addr2[-4:]}`
  💰 Balance: `{fmt(a2['balance'])} {symbol}`
  📊 Transactions: `{a2['tx_count']}`
  💸 Net Flow: `{'+' if a2['net']>=0 else ''}{fmt(a2['net'])} {symbol}`
  🕐 Last Active: `{a2['last_active']}`
━━━━━━━━━━━━━━━━━━━
📊 *PROTOCOL SCORING*
  🔴 `{score_bar1}` {a1['score']}/100
  🔵 `{score_bar2}` {a2['score']}/100
━━━━━━━━━━━━━━━━━━━
🏆 *LEADING: {winner} CORNER*
━━━━━━━━━━━━━━━━━━━
👨‍⚖️ *AI Verdict:*
_{ruling}_
━━━━━━━━━━━━━━━━━━━
{L["compare_disagree"]}
[⚖️ verdictprotocol.online](https://verdictprotocol.online)"""

    await wait.delete()
    await update.message.reply_text(report, parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup([[
            InlineKeyboardButton("⚔️ Issue a Duel", url="https://verdictprotocol.online"),
            InlineKeyboardButton(f"🔍 Red", url=f"{ci['explorer']}/address/{addr1}"),
        ],[
            InlineKeyboardButton(f"🔍 Blue", url=f"{ci['explorer']}/address/{addr2}"),
        ]]), disable_web_page_preview=True)

async def price_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    lang = await get_user_lang(user.username if user else None)
    L = T[lang]
    args = context.args or []
    if not args:
        await update.message.reply_text(L["price_usage"], parse_mode="Markdown")
        return

    wait = await update.message.reply_text(L["price_fetching"], parse_mode="Markdown")
    query = args[0].strip()
    is_address = EVM_RE.match(query)

    async def fetch_by_address(addr, chain):
        chain_key = CHAINS.get(chain, {}).get("moralis_chain", chain)
        llama_chain = {"bsc":"bsc","eth":"ethereum","polygon":"polygon","arbitrum":"arbitrum",
                       "optimism":"optimism","base":"base","mantle":"mantle","avalanche":"avax"}.get(chain_key, chain_key)
        url = f"https://coins.llama.fi/prices/current/{llama_chain}:{addr}"
        try:
            async with aiohttp.ClientSession(trust_env=False) as s:
                async with s.get(url, timeout=aiohttp.ClientTimeout(total=10)) as r:
                    if r.status == 200:
                        d = await r.json()
                        coins = d.get("coins", {})
                        if coins:
                            key = list(coins.keys())[0]
                            return coins[key], key
        except Exception as e:
            print(f"Price fetch error: {e}")
        return None, None

    async def fetch_by_name(name):
        common = {"mnt":"coingecko:mantle","eth":"coingecko:ethereum","bnb":"coingecko:binancecoin",
                  "btc":"coingecko:bitcoin","usdt":"coingecko:tether","usdc":"coingecko:usd-coin",
                  "matic":"coingecko:matic-network","avax":"coingecko:avalanche-2"}
        coin_id = common.get(name.lower())
        if not coin_id:
            try:
                async with aiohttp.ClientSession(trust_env=False) as s:
                    async with s.get(f"https://coins.llama.fi/search?query={name}",
                                     timeout=aiohttp.ClientTimeout(total=10)) as r:
                        if r.status == 200:
                            d = await r.json()
                            coins = d.get("coins", [])
                            if coins: coin_id = coins[0].get("coin", "")
            except Exception as e:
                print(f"Search error: {e}")
        if not coin_id: return None, None
        try:
            async with aiohttp.ClientSession(trust_env=False) as s:
                async with s.get(f"https://coins.llama.fi/prices/current/{coin_id}",
                                 timeout=aiohttp.ClientTimeout(total=10)) as r:
                    if r.status == 200:
                        d = await r.json()
                        coins = d.get("coins", {})
                        if coins:
                            key = list(coins.keys())[0]
                            return coins[key], key
        except Exception as e:
            print(f"Price by name error: {e}")
        return None, None

    if is_address:
        chain = "mantle"
        if len(args) > 1:
            raw = args[1].lower()
            chain = CHAIN_ALIASES.get(raw, raw) if raw in CHAIN_ALIASES or raw in CHAINS else "mantle"
        data, coin_key = await fetch_by_address(query, chain)
    else:
        data, coin_key = await fetch_by_name(query)

    await wait.delete()

    if not data:
        await update.message.reply_text(L["price_not_found"].format(query=query), parse_mode="Markdown")
        return

    price = data.get("price", 0)
    symbol = data.get("symbol", query.upper())
    chain_name = coin_key.split(":")[0] if coin_key else "unknown"

    if price >= 1: price_fmt = f"${price:,.4f}"
    elif price >= 0.001: price_fmt = f"${price:.6f}"
    else: price_fmt = f"${price:.8f}"

    change_24h = None
    try:
        async with aiohttp.ClientSession(trust_env=False) as s:
            async with s.get(f"https://coins.llama.fi/percentage/{coin_key}?period=24h",
                             timeout=aiohttp.ClientTimeout(total=8)) as r:
                if r.status == 200:
                    d = await r.json()
                    coins = d.get("coins", {})
                    if coins: change_24h = list(coins.values())[0]
    except: pass

    change_line = ""
    if change_24h is not None:
        emoji = "📈" if change_24h >= 0 else "📉"
        change_line = f"\n{emoji} 24h Change: `{'+' if change_24h >= 0 else ''}{change_24h:.2f}%`"

    report = f"""💰 *{symbol.upper()} Price*
━━━━━━━━━━━━━━━━━━━
💵 Price: `{price_fmt}`{change_line}
🔗 Source: `{chain_name}`
━━━━━━━━━━━━━━━━━━━
[⚖️ verdictprotocol.online](https://verdictprotocol.online)"""

    await update.message.reply_text(report, parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup([[
            InlineKeyboardButton("🟢 /mantle ecosystem", callback_data="mantle_eco"),
        ]]), disable_web_page_preview=True)

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data = query.data
    user = update.effective_user
    lang = await get_user_lang(user.username if user else None)
    L = T[lang]
    if data.startswith("watch:"):
        _, address, chain = data.split(":")
        chat_id = update.effective_chat.id
        if chat_id not in watchlist: watchlist[chat_id] = []
        if not any(w["address"].lower()==address.lower() for w in watchlist[chat_id]):
            watchlist[chat_id].append({"address":address,"label":address[:8]+"...","chain":chain})
            await context.bot.send_message(chat_id, L["subpoena_issued"], parse_mode="Markdown")
        else:
            await context.bot.send_message(chat_id, L["already_watching"])
    elif data.startswith("whale:"):
        context.args = [data.split(":")[1]]
        await whale_command(update, context)
    elif data.startswith("mantle_eco"):
        await mantle_command(update, context)

async def mantle_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    lang = await get_user_lang(user.username if user else None)
    L = T[lang]
    wait = await update.message.reply_text(L["mantle_loading"], parse_mode="Markdown")

    async def get_mantle_tvl():
        try:
            async with aiohttp.ClientSession(trust_env=False) as s:
                async with s.get("https://api.llama.fi/v2/chains", timeout=aiohttp.ClientTimeout(total=10)) as r:
                    if r.status == 200:
                        chains = await r.json()
                        for c in chains:
                            if c.get("name","").lower() == "mantle":
                                return c
        except Exception as e:
            print(f"DeFiLlama chains error: {e}")
        return {}

    async def get_mantle_protocols():
        try:
            async with aiohttp.ClientSession(trust_env=False) as s:
                async with s.get("https://api.llama.fi/protocols", timeout=aiohttp.ClientTimeout(total=10)) as r:
                    if r.status == 200:
                        all_p = await r.json()
                        mantle_p = [p for p in all_p if "mantle" in [c.lower() for c in p.get("chains", [])]]
                        return sorted(mantle_p, key=lambda x: x.get("tvl", 0), reverse=True)[:5]
        except Exception as e:
            print(f"DeFiLlama protocols error: {e}")
        return []

    async def get_mantle_rpc():
        try:
            async with aiohttp.ClientSession(trust_env=False) as s:
                async with s.post("https://rpc.mantle.xyz",
                    json={"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1},
                    timeout=aiohttp.ClientTimeout(total=8)) as r:
                    if r.status == 200:
                        d = await r.json()
                        return int(d.get("result","0x0"), 16)
        except Exception as e:
            print(f"Mantle RPC error: {e}")
        return None

    async def get_mantle_gas():
        try:
            async with aiohttp.ClientSession(trust_env=False) as s:
                async with s.post("https://rpc.mantle.xyz",
                    json={"jsonrpc":"2.0","method":"eth_gasPrice","params":[],"id":1},
                    timeout=aiohttp.ClientTimeout(total=8)) as r:
                    if r.status == 200:
                        d = await r.json()
                        return int(d.get("result","0x0"), 16) / 1e9
        except Exception as e:
            print(f"Mantle gas error: {e}")
        return None

    tvl_data, protocols, block_num, gas = await asyncio.gather(
        get_mantle_tvl(), get_mantle_protocols(), get_mantle_rpc(), get_mantle_gas()
    )

    tvl = tvl_data.get("tvl", 0)
    tvl_change = tvl_data.get("change_1d", 0) or 0
    if tvl >= 1e9: tvl_fmt = f"${tvl/1e9:.2f}B"
    elif tvl >= 1e6: tvl_fmt = f"${tvl/1e6:.2f}M"
    else: tvl_fmt = f"${tvl:,.0f}"
    change_emoji = "📈" if tvl_change >= 0 else "📉"
    change_fmt = f"{'+' if tvl_change >= 0 else ''}{tvl_change:.2f}%"

    proto_lines = []
    for i, p in enumerate(protocols, 1):
        ptv = p.get("tvl", 0)
        ptv_fmt = f"${ptv/1e6:.1f}M" if ptv >= 1e6 else f"${ptv:,.0f}"
        proto_lines.append(f"  {i}. *{p.get('name','?')}* — `{ptv_fmt}`")

    network_lines = []
    if block_num: network_lines.append(f"  📦 Latest Block: `{block_num:,}`")
    if gas is not None: network_lines.append(f"  ⛽ Gas Price: `{gas:.4f} Gwei`")

    report = f"""🟢 *MANTLE ECOSYSTEM REPORT*
━━━━━━━━━━━━━━━━━━━
📊 *Total Value Locked*
  💰 `{tvl_fmt}` {change_emoji} `{change_fmt}` (24h)
━━━━━━━━━━━━━━━━━━━
🏆 *Top Protocols on Mantle*
{chr(10).join(proto_lines) if proto_lines else "  " + L["mantle_no_data"]}
━━━━━━━━━━━━━━━━━━━
🌐 *Network Status*
{chr(10).join(network_lines) if network_lines else "  " + L["mantle_rpc_unavail"]}
━━━━━━━━━━━━━━━━━━━
[🔍 MantleScan](https://mantlescan.xyz) · [🌉 Bridge](https://app.mantle.xyz/bridge) · [⚖️ verdictprotocol.online](https://verdictprotocol.online)"""

    await wait.delete()
    await update.message.reply_text(report, parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup([[
            InlineKeyboardButton("🔍 MantleScan", url="https://mantlescan.xyz"),
            InlineKeyboardButton("🌉 Bridge", url="https://app.mantle.xyz/bridge"),
        ]]), disable_web_page_preview=True)

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    lang = await get_user_lang(user.username if user else None)
    L = T[lang]
    text = update.message.text.strip()
    addrs = EVM_RE.findall(text)
    if not addrs:
        if update.message.chat.type=="private":
            await update.message.reply_text(L["handle_msg"], parse_mode="Markdown")
        return
    context.args = [addrs[0]]
    await scan_command(update, context)

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
                    direction_en = "📤 OUTBOUND" if tx.get("from_address","").lower()==w["address"].lower() else "📥 INBOUND"
                    await app.bot.send_message(chat_id,
                        f"🚨 *PROTOCOL ALERT — {w['label']}*\n━━━━━━━━━━━━━━━━━━━\n"
                        f"{ci['emoji']} {ci['name']} · {direction_en}\n"
                        f"💰 `{val:.4f} {ci['symbol']}` detected\n"
                        f"[🔍 View Evidence]({ci['explorer']}/tx/{h})\n\n"
                        f"_Protocol requires your attention._ ⚖️",
                        parse_mode="Markdown", disable_web_page_preview=True)
                except Exception as e:
                    print(f"Monitor err: {e}")

def main():
    if not TELEGRAM_TOKEN:
        print("❌ TELEGRAM_TOKEN not set"); return
    if not MORALIS_KEY:
        print("⚠️  MORALIS_API_KEY not set")
    print("⚖️  Verdict Protocol Bot v3 starting...")
    app = Application.builder().token(TELEGRAM_TOKEN).build()

    for cmd in ["start","help"]: app.add_handler(CommandHandler(cmd, start))
    app.add_handler(CommandHandler("lang", lang_command))
    for cmd in ["scan","judge"]: app.add_handler(CommandHandler(cmd, scan_command))
    for cmd in ["watch","subpoena"]: app.add_handler(CommandHandler(cmd, watch_command))
    for cmd in ["watchlist","docket"]: app.add_handler(CommandHandler(cmd, watchlist_command))
    for cmd in ["whale","wallet"]: app.add_handler(CommandHandler(cmd, whale_command))
    app.add_handler(CommandHandler("mantle", mantle_command))
    app.add_handler(CommandHandler("price", price_command))
    app.add_handler(CommandHandler("compare", compare_command))
    app.add_handler(CommandHandler("unwatch", unwatch_command))
    app.add_handler(CallbackQueryHandler(button_callback))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    async def post_init(a): asyncio.create_task(monitor_wallets(a))
    app.post_init = post_init
    print("✅ Protocol is live. Ctrl+C to adjourn.")
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
