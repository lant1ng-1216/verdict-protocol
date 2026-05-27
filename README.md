<div align="center">

# ⚖️ Verdict Protocol

**The On-Chain Wager Protocol with AI Judge**
*链上对赌协议，AI 法官裁定*

[![Live](https://img.shields.io/badge/🌐_Live-verdictprotocol.online-7C3AED?style=for-the-badge)](https://www.verdictprotocol.online)
[![Mantle](https://img.shields.io/badge/Mantle_Sepolia-Deployed-00D395?style=for-the-badge&logo=ethereum)](https://sepolia.mantlescan.xyz/address/0xE731a80668Ad0439a6B55e57f65C1D7885827566)
[![BNB](https://img.shields.io/badge/BNB_Testnet-Deployed-F0B90B?style=for-the-badge&logo=binance)](https://testnet.bscscan.com/address/0xa0A997cF05F7Baf21becEA4130209fD7C7D1A994)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.23-363636?style=for-the-badge&logo=solidity)](https://soliditylang.org)
[![DeepSeek](https://img.shields.io/badge/AI-DeepSeek-4A90E2?style=for-the-badge)](https://deepseek.com)
[![Telegram](https://img.shields.io/badge/Bot-@VerdictProtocol__Bot-26A5E4?style=for-the-badge&logo=telegram)](https://t.me/VerdictProtocol_Bot)

---

> *"Any two parties. Any verifiable outcome. AI decides."*
> *任意两方，任意可验证结果，AI 裁定。*

</div>

---

## 🎯 What Is Verdict Protocol? | 这是什么？

Verdict Protocol is a **decentralized on-chain wager protocol** where anyone can challenge anyone else on **any verifiable outcome** — crypto price predictions, personal challenges between friends, KOL vs KOL disputes, company milestones, community competitions, and more.

Verdict Protocol 是一个**去中心化链上对赌协议**，任意两方可以就**任意可验证结果**发起对赌。

**Without a trusted third party. Without counterparty risk. Settled automatically by an AI Judge.**
*无需可信第三方，无对手方风险，由 AI 法官自动结算。*

---

## 🏗️ Architecture Overview | 架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                     VERDICT PROTOCOL                        │
├──────────────┬──────────────┬────────────┬──────────────────┤
│  Protocol    │  AI Judge    │  TG Bot    │  Smart Contract  │
│  Bet dApp    │  Agent       │  @VPBot    │  ProtocolBet.sol │
│  (Next.js)   │  (4-Step)    │  (Python)  │  (Solidity)      │
├──────────────┴──────────────┴────────────┴──────────────────┤
│              Upstash KV  |  Vercel  |  DeepSeek API         │
├─────────────────────────────────────────────────────────────┤
│         Mantle Sepolia  ←→  BNB Testnet  (Multi-Chain)      │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚖️ Three-Layer Dispute Resolution | 三层争议解决机制

| Layer | Method | Description | 描述 |
|-------|--------|-------------|------|
| **Layer 1** | 🤝 Mutual Settlement | Both parties agree → instant payout | 双方共识 → 直接打款 |
| **Layer 2** | 🤖 AI Judge | Submit evidence → 4-step AI analysis → auto-settle | 提交证据 → AI 4步分析 → 自动结算 |
| **Layer 3** | ⏰ Auto-Ruling | Cron job rules expired duels automatically | 定时任务自动裁定过期对决（规划中）|

---

## 🤖 AI Judge Agent | AI 法官 Agent

The AI Judge is a **4-step Chain-of-Thought agent** powered by DeepSeek, designed to rule on any type of dispute.

AI 法官是基于 DeepSeek 的 **4 步链式推理 Agent**，可裁定任意类型的争议。

```
Step 1: Case Analysis      → Dispute type + verifiable conditions
        案件解析            → 争议类型 + 可验证条件

Step 2: Evidence Review    → Fetch links + credibility scoring (0-5)
        证据审查            → 抓取链接内容 + 可信度评分（0-5）

Step 3: Condition Analysis → Cross-reference evidence vs ruling standard
        条件分析            → 证据与裁定标准交叉对比

Step 4: Final Ruling       → Weighted score + confidence + auto-settle
        最终裁定            → 加权得分 + 置信度 + 自动结算
```

**Evidence Credibility Hierarchy | 证据可信度分级:**
```
Level 5 ██████  On-chain transaction data | 链上交易数据
Level 4 █████░  Official announcements    | 官方公告
Level 3 ████░░  3rd-party data (CoinGecko, DeFiLlama) | 第三方数据
Level 2 ███░░░  Social media links        | 社交媒体链接
Level 1 ██░░░░  Text description only     | 纯文字描述
Level 0 ░░░░░░  Subjective claims ("I won") → IGNORED | 主观声明 → 忽略
```

> Auto-settles on-chain when confidence ≥ 50%. Returns `Insufficient` when evidence is too weak.
> 置信度 ≥ 50% 时自动链上结算，证据不足时返回"证据不足"。

---

## 📱 Screenshots | 产品截图

<table>
  <tr>
    <td align="center"><b>🏟️ Arena | 广场</b><br/><img src="https://www.verdictprotocol.online/og-image.png" width="280" alt="Arena"/></td>
    <td align="center"><b>⚔️ Duel Detail | 对决详情</b><br/><i>[screenshot coming soon]</i></td>
    <td align="center"><b>⚖️ AI Ruling | AI 裁定</b><br/><i>[screenshot coming soon]</i></td>
  </tr>
  <tr>
    <td align="center"><b>📋 My Duels | 我的对赌</b><br/><i>[screenshot coming soon]</i></td>
    <td align="center"><b>🤖 TG Bot | TG 机器人</b><br/><i>[screenshot coming soon]</i></td>
    <td align="center"><b>📊 Verdict Page | 裁定详情页</b><br/><i>[screenshot coming soon]</i></td>
  </tr>
</table>

---

## 🔗 Smart Contract | 智能合约

### Deployments | 部署信息

| Network | Address | Explorer |
|---------|---------|----------|
| Mantle Sepolia | `0xE731a80668Ad0439a6B55e57f65C1D7885827566` | [View ↗](https://sepolia.mantlescan.xyz/address/0xE731a80668Ad0439a6B55e57f65C1D7885827566) |
| BNB Testnet | `0xa0A997cF05F7Baf21becEA4130209fD7C7D1A994` | [View ↗](https://testnet.bscscan.com/address/0xa0A997cF05F7Baf21becEA4130209fD7C7D1A994) |

### Core Functions | 核心函数

```solidity
// Create a new duel | 发起对决
function createDuel(bytes32 claimHash, bytes32 ruleHash, address token, 
                    uint256 wager, uint64 deadline, Vis vis, uint16 audioBps) external payable

// Accept a challenge | 接受挑战
function accept(uint256 id) external payable

// Layer 1: Mutual settlement | 第一层：共识结算
function mutualSettle(uint256 id, Side claimedWinner) external

// Layer 2/3: Judge settles | 第二/三层：法官结算
function settle(uint256 id, Side winner) external  // onlyJudge

// Cancel unmatched duel (refund) | 取消未匹配对决（退款）
function cancel(uint256 id) external
```

### Economics | 经济模型

```
Protocol Fee:  2% (200 BPS)    协议手续费：2%
Winner Payout: wager × 2 × 98% 胜方获得：押注 × 2 × 98%
Dispute Window: 48 hours        争议窗口：48 小时
```

---

## 🛠️ Tech Stack | 技术栈

<table>
<tr>
<td>

**Frontend | 前端**
- Next.js 16.2.6 (Turbopack)
- React 19 + TypeScript
- wagmi + RainbowKit + viem
- Tailwind CSS

</td>
<td>

**Backend | 后端**
- Vercel (API Routes)
- Upstash KV (Redis)
- DeepSeek API (AI Judge)
- Moralis API (Wallet data)

</td>
<td>

**Contract | 合约**
- Solidity 0.8.23
- Mantle Sepolia
- BNB Testnet

</td>
<td>

**Bot | 机器人**
- Python 3.x
- python-telegram-bot 20.7
- aiohttp
- Railway (hosting)

</td>
</tr>
</table>

---

## 📁 Repository Structure | 仓库结构

```
verdict-protocol/
├── protocol-bet/                      # Main Next.js dApp | 主应用
│   ├── src/app/
│   │   ├── page_client.tsx            # Main UI (~2700 lines) | 主界面
│   │   ├── verdict/[chainId]/[duelId] # AI Ruling detail page | 裁定详情页
│   │   └── api/
│   │       ├── duels/route.ts         # Multi-chain duel fetcher | 多链对决拉取
│   │       ├── evidence/route.ts      # Evidence storage | 证据存储
│   │       ├── judge/route.ts         # AI 4-step agent | AI 4步 Agent
│   │       └── notify/route.ts        # TG notifications | TG 通知
│   └── src/lib/
│       ├── contract.ts                # Contract addresses + ABI
│       └── hooks.ts                   # wagmi hooks
├── bot/
│   ├── bot.py                         # Telegram Bot
│   └── requirements.txt
└── ProtocolBet.sol                    # Smart contract source | 合约源码
```

---

## 🚀 Quick Start | 快速开始

### Run dApp locally | 本地运行

```bash
git clone https://github.com/lant1ng-1216/verdict-protocol
cd verdict-protocol/protocol-bet
npm install
cp .env.example .env.local  # Add your env vars
npm run dev
```

### Environment Variables | 环境变量

```env
KV_REST_API_URL=        # Upstash Redis URL
KV_REST_API_TOKEN=      # Upstash token
DEEPSEEK_API_KEY=       # DeepSeek API key
JUDGE_PRIVATE_KEY=      # Judge wallet private key (for auto-settle)
TELEGRAM_BOT_TOKEN=     # Telegram bot token
```

### Run Telegram Bot | 运行 TG Bot

```bash
cd bot
pip install -r requirements.txt
python bot.py
```

---

## 🤖 Telegram Bot | TG 机器人

**[@VerdictProtocol_Bot](https://t.me/VerdictProtocol_Bot)**

| Command | Description | 功能 |
|---------|-------------|------|
| `/scan <address>` | AI wallet analysis | AI 钱包分析 |
| `/compare <addr1> <addr2>` | Head-to-head comparison | 双钱包对比 |
| `/whale [chain]` | Whale activity tracker | 巨鲸追踪 |
| `/price <token>` | Token price + 24h change | 代币价格 |
| `/mantle` | Mantle ecosystem live data | Mantle 生态数据 |
| `/watch <address>` | Watch wallet for movements | 监控钱包 |

**Duel notifications | 对决通知:** Start the bot → get notified when your duels are accepted or settled.
*启动 Bot → 对决被接受或结算时自动收到通知。*

---

## 🗺️ Roadmap | 路线图

### ✅ Phase 1 — Testnet (Current | 当前)
- [x] Smart contract (Mantle Sepolia + BNB Testnet)
- [x] Full dApp UI with bilingual support
- [x] Layer 1: Mutual settlement
- [x] Layer 2: Evidence + AI 4-step judge agent
- [x] AI verdict detail page
- [x] Telegram Bot with duel notifications
- [x] Multi-chain support (simultaneous display)
- [x] Share cards, BeamAvatar, Prize Pool USD

### 📋 Phase 2 — Mainnet
- [ ] Mainnet deployment (Mantle + BNB)
- [ ] Layer 3: Cron-based auto-ruling
- [ ] Audience pool (spectator betting)
- [ ] TG account binding
- [ ] Image/PDF evidence upload

### 📋 Phase 3 — Expansion
- [ ] Multi-chain expansion (Arbitrum, Base, OP)
- [ ] Official landing website
- [ ] ERC20 token support
- [ ] VERDICT governance token
- [ ] Mobile app

---

## 💡 Use Cases | 使用场景

```
🪙 Crypto          "BTC will hit $150K by EOY"
                   "BTC 年底会突破 $150K"

🏢 Business        "Our product will ship before yours"
                   "我们的产品会比你们先上线"

📊 KOL vs KOL      "My market call will outperform yours in 30 days"
                   "我的预测 30 天内跑赢你的"

🏘️ Community       "Mantle TVL will surpass Arbitrum by Q3"
                   "Mantle TVL 将在 Q3 超越 Arbitrum"

👫 Personal        "I'll lose 20 lbs before you finish your book"
                   "我在你写完书之前减掉 20 斤"
```

---

## ⚡ Competitive Advantage | 竞争优势

| | Verdict Protocol | Polymarket | Augur |
|--|:--:|:--:|:--:|
| Any topic (not just markets) | ✅ | ❌ | ❌ |
| Peer-to-peer 1v1 | ✅ | ❌ | ❌ |
| AI Judge | ✅ | ❌ | ❌ |
| No centralized arbitrator | ✅ | ❌ | ✅ |
| Social / personal bets | ✅ | ❌ | ❌ |
| TG Bot integration | ✅ | ❌ | ❌ |
| Trustless settlement | ✅ | ✅ | ✅ |

---

## 📄 License

MIT License — see [LICENSE](./LICENSE)

---

<div align="center">

**Built for Mantle Hackathon 2026**

[![Website](https://img.shields.io/badge/🌐_Website-verdictprotocol.online-7C3AED?style=for-the-badge)](https://www.verdictprotocol.online)
[![Telegram](https://img.shields.io/badge/💬_Bot-@VerdictProtocol__Bot-26A5E4?style=for-the-badge)](https://t.me/VerdictProtocol_Bot)
[![DoraHacks](https://img.shields.io/badge/🏆_DoraHacks-Submission-FF6B35?style=for-the-badge)](https://dorahacks.io)

*⚖️ Any two parties. Any verifiable outcome. AI decides.*

</div>
