<div align="center">

# ⚖️ Verdict Protocol

**The On-Chain Verdict Layer — AI-Powered Arbitration Infrastructure**
*AI 驱动的链上仲裁基础设施*

[![Live](https://img.shields.io/badge/🌐_Live-verdictprotocol.online-0A0A0A?style=for-the-badge)](https://www.verdictprotocol.online)
[![Mantle](https://img.shields.io/badge/Mantle_Sepolia-Deployed-00D395?style=for-the-badge&logo=ethereum)](https://sepolia.mantlescan.xyz/address/0xE731a80668Ad0439a6B55e57f65C1D7885827566)
[![BNB](https://img.shields.io/badge/BNB_Testnet-Deployed-F0B90B?style=for-the-badge&logo=binance)](https://testnet.bscscan.com/address/0xa0A997cF05F7Baf21becEA4130209fD7C7D1A994)
[![npm](https://img.shields.io/badge/npm-@lant1ng/verdict--protocol--sdk-CB3837?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/@lant1ng/verdict-protocol-sdk)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.23-363636?style=for-the-badge&logo=solidity)](https://soliditylang.org)
[![Telegram](https://img.shields.io/badge/Bot-@VerdictProtocol__Bot-26A5E4?style=for-the-badge&logo=telegram)](https://t.me/VerdictProtocol_Bot)

---

> *"Any two parties. Any verifiable outcome. AI decides."*
> *任意两方，任意可验证结果，AI 裁定。*

</div>

---

## 🎯 What Is Verdict Protocol?

Verdict Protocol is an **AI-powered on-chain arbitration infrastructure** — not a prediction market. It is the on-chain equivalent of a Valuation Adjustment Mechanism (VAM): a bilateral agreement between two specific parties, settled by AI Judge based on verifiable evidence.

Four products. One AI Judge core. One closed-loop ecosystem — each product works independently, all tightly integrated.

| Product | Description |
|---------|-------------|
| ⚔️ **Protocol Bet** | Peer-to-peer on-chain wager protocol. Contract-first, ContractAI-reviewed, AI Judge-settled |
| 🛡 **ContractAI** | AI contract risk review — embedded in every duel, also works as a standalone tool |
| 🤖 **Telegram Bot** [@VerdictProtocol_Bot](https://t.me/VerdictProtocol_Bot) | On-chain intelligence across ETH, BNB Chain, Mantle — wallet analysis, AI verdicts, Mantle tracking, contract audit |
| 🔌 **Chrome Extension** *(in development)* | Real-time AI risk scores on DexScreener, GMGN, four.meme, Ave.ai |

---

## 🔄 Ecosystem Closed Loop

```
Bot /audit → ContractAI scan → Protocol Bet duel creation
                                        │
                           ContractAI pre-acceptance review
                                        │
                           Evidence submission
                                        │
                           AI Judge 4-step arbitration
                                        │
                           On-chain auto-settlement
                                        │
                           Bot push notification
                                        │
                           SDK / REST API → third-party integration
```

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         VERDICT PROTOCOL                             │
├──────────────┬──────────────┬──────────────┬────────────────────────┤
│  Protocol    │  ContractAI  │  TG Bot      │  Chrome Extension      │
│  Bet dApp    │  Risk Review │  @VPBot      │  (DexScreener/GMGN/    │
│  (Next.js)   │  (DeepSeek)  │  (Python)    │   four.meme/Ave.ai)    │
├──────────────┴──────────────┴──────────────┴────────────────────────┤
│              AI Judge Agent (4-Step Chain-of-Thought)                │
├──────────────────────────────────────────────────────────────────────┤
│              Upstash KV  |  Vercel  |  DeepSeek API                  │
├──────────────────────────────────────────────────────────────────────┤
│         Mantle Sepolia  ←→  BNB Testnet  (Multi-Chain)               │
└──────────────────────────────────────────────────────────────────────┘
```

---

## ⚔️ Protocol Bet

Peer-to-peer on-chain wager protocol. Structurally equivalent to a VAM in traditional commercial agreements — permissionless, trustless, AI-arbitrated.

### Contract-First Issuance

Every duel starts as a structured wager agreement (§1 Claim → §8 Signatures). ContractAI automatically scans before the challenger submits and before the defender accepts — the first on-chain wager protocol with built-in pre-execution legal risk review.

### Three-Layer Dispute Resolution

| Layer | Method | Description |
|-------|--------|-------------|
| **Layer 1** | 🤝 Mutual Settlement | Both parties agree → instant payout |
| **Layer 2** | 🤖 AI Judge | Submit evidence → 4-step reasoning → auto-settle ≥50% confidence |
| **Layer 3** | ⏰ Auto-Ruling *(Phase 2)* | Cron job rules expired duels automatically |

### Economics

```
Protocol Fee:    2% per duel
Winner Payout:   wager × 2 × 98%
Audience Pool:   spectators stake on either side → self-reinforcing engagement
Dispute Window:  48 hours
```

### Contracts

| Network | Address |
|---------|---------|
| Mantle Sepolia | `0xE731a80668Ad0439a6B55e57f65C1D7885827566` |
| BNB Testnet | `0xa0A997cF05F7Baf21becEA4130209fD7C7D1A994` |

---

## 🛡 ContractAI

AI contract risk review. Works in two modes:

**Embedded** — throughout the Protocol Bet duel lifecycle:
- Scans wager agreement during duel creation
- Surfaces cached risk report when defender clicks Accept
- Injects analysis as Level 3 evidence into AI Judge reasoning

**Standalone** — accessible independently:
- Official website: submit any contract text for instant risk report
- Telegram Bot: `/audit <text>`
- REST API: `POST /api/audit`

**Output format:**
```
Risk Score: 62/100  ⚠️ Medium Risk
🔴 High   — Ambiguous ruling standard
🟡 Medium — Dispute window too short
🟢 Low    — Missing notification preference
```

---

## 🤖 AI Judge Agent

4-step Chain-of-Thought agent powered by DeepSeek LLM.

```
Step 1: Case Analysis      → Dispute type + verifiable conditions
Step 2: Evidence Review    → Fetch links + credibility scoring (0–5)
Step 3: Condition Analysis → Cross-reference evidence vs ruling standard
Step 4: Final Ruling       → Weighted score + confidence + auto-settle
```

**Evidence Credibility:**
```
Level 5  On-chain transaction data
Level 4  Official announcements
Level 3  3rd-party data (CoinGecko, DeFiLlama) + ContractAI analysis
Level 2  Social media links
Level 1  Text description only
Level 0  Subjective claims → IGNORED
```

---

## 🤖 Telegram Bot Commands

**[@VerdictProtocol_Bot](https://t.me/VerdictProtocol_Bot)**

| Command | Description |
|---------|-------------|
| `/scan <address> [chain]` | AI wallet analysis — USD holdings, risk rating (⚖️ ACQUITTED → 🔨 CONDEMNED) |
| `/compare <addr1> <addr2>` | Head-to-head AI verdict with scoring |
| `/audit <text>` | ContractAI contract risk analysis |
| `/alert on\|off\|status` | Mantle ecosystem alerts (TVL ≥5% or MNT ≥8%) |
| `/mantle` | Live Mantle data — TVL, top protocols, gas, MNT price |
| `/price <token>` | Real-time price + 24h change |
| `/whale [chain]` | Large wallet activity tracker |
| `/watch <address>` | Monitor wallet + duel alerts |

---

## 📦 SDK

```bash
npm install @lant1ng/verdict-protocol-sdk
```

```typescript
import { VerdictClient } from '@lant1ng/verdict-protocol-sdk'

const client = new VerdictClient({ chainId: 5003, walletClient })

const duelId = await client.createDuel({
  claim: 'BTC will exceed $150K by Dec 31, 2026',
  rule: 'CoinGecko closing price on deadline date',
  durationDays: 30,
  wagerEth: '0.1',
  visibility: 'public',
})

await client.submitEvidence({ duelId, description: '...', links: ['https://...'] })
await client.claimReward({ duelId })
```

**Methods:** `createDuel` · `acceptDuel` · `placeBet` · `submitEvidence` · `claimReward` · `cancelDuel` · `getDuel` · `getVerdict` · `listDuels`

📦 [npmjs.com/package/@lant1ng/verdict-protocol-sdk](https://www.npmjs.com/package/@lant1ng/verdict-protocol-sdk)

---

## 🌐 REST API

Base URL: `https://verdictprotocol.online`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/audit` | ContractAI — analyze contract risk |
| `GET`  | `/api/audit?claimHash=` | Retrieve cached risk report |
| `POST` | `/api/judge` | Trigger AI Judge arbitration |
| `GET`  | `/api/judge?chainId=&duelId=` | Retrieve cached verdict |
| `POST` | `/api/claim` | Persist claim & rule text |
| `GET`  | `/api/claim?claimHash=` | Retrieve claim text |

---

## 🛠️ Tech Stack

| Layer | Stack |
|-------|-------|
| **Frontend** | Next.js 16, React 19, TypeScript, wagmi, RainbowKit, viem, Tailwind CSS |
| **Backend** | Vercel API Routes, Upstash Redis, DeepSeek API, Moralis API |
| **Contract** | Solidity 0.8.23, Mantle Sepolia, BNB Testnet |
| **Bot** | Python 3.x, python-telegram-bot 20.7, aiohttp, Railway |
| **SDK** | TypeScript, CJS + ESM, published to npm |

---

## 📁 Repository Structure

```
verdict-protocol/
├── protocol-bet/
│   ├── src/app/
│   │   ├── page_client.tsx
│   │   ├── verdict/[chainId]/[duelId]/
│   │   └── api/
│   │       ├── audit/route.ts         # ContractAI
│   │       ├── judge/route.ts         # AI Judge
│   │       ├── claim/route.ts
│   │       ├── duels/route.ts
│   │       ├── evidence/route.ts
│   │       └── notify/route.ts
│   └── src/lib/
│       ├── contract.ts
│       └── hooks.ts
├── bot/bot.py
├── extension/                         # Chrome Extension (in development)
├── packages/sdk/                      # @lant1ng/verdict-protocol-sdk
├── docs/
└── README.md
```

---

## 🚀 Quick Start

```bash
git clone https://github.com/lant1ng-1216/verdict-protocol
cd verdict-protocol/protocol-bet
npm install
cp .env.example .env.local
npm run dev
```

```env
KV_REST_API_URL=        # Upstash Redis URL
KV_REST_API_TOKEN=      # Upstash token
DEEPSEEK_API_KEY=       # DeepSeek API key
JUDGE_PRIVATE_KEY=      # Judge wallet private key
TELEGRAM_BOT_TOKEN=     # Telegram bot token
```

---

## 🗺️ Roadmap

### ✅ Phase 1 — Testnet (Current)
- [x] Smart contracts — Mantle Sepolia + BNB Testnet
- [x] Full dApp — sidebar layout, bilingual, contract-first issuance
- [x] ContractAI — embedded risk review + standalone tool
- [x] AI Judge — 4-step chain-of-thought, auto-settle
- [x] Three-layer dispute resolution
- [x] Telegram Bot — 8 commands including /audit and /alert
- [x] npm SDK — @lant1ng/verdict-protocol-sdk
- [x] REST API — /api/audit /api/judge /api/claim
- [x] Chrome Extension (in development)

### 🔨 Phase 2 — Mainnet
- [ ] Mainnet deployment (Mantle + BNB Chain)
- [ ] Layer 3: Auto-ruling cron job
- [ ] Audience pool activation
- [ ] ERC20 token wager support
- [ ] Bot subscription tiers (freemium → paid)

### 📋 Phase 3 — Expansion
- [ ] ContractAI paid deep reports + B2B API
- [ ] Multi-chain (Arbitrum, Base, Optimism)
- [ ] VERDICT governance token
- [ ] Mobile app

---

## ⚡ Competitive Advantage

| | Verdict Protocol | Polymarket | Augur |
|--|:--:|:--:|:--:|
| Peer-to-peer bilateral wager | ✅ | ❌ | ❌ |
| Any verifiable topic | ✅ | ❌ | ❌ |
| AI Judge (evidence-based) | ✅ | ❌ | ❌ |
| Built-in contract risk review | ✅ | ❌ | ❌ |
| No centralized arbitrator | ✅ | ❌ | ✅ |
| Open SDK + REST API | ✅ | ❌ | ❌ |
| Telegram Bot integration | ✅ | ❌ | ❌ |
| Trustless on-chain settlement | ✅ | ✅ | ✅ |

---

## 💡 Use Cases

```
🪙 Crypto       "BTC will hit $150K by EOY"
🥊 KOL vs KOL   "My market call will outperform yours in 30 days"
🏘️ Community    "Mantle TVL will surpass Arbitrum by Q3"
🏢 Business     "Our product will ship before yours"
👫 Personal     "I'll lose 20 lbs before you finish your book"
📄 VAM          "Revenue milestone agreement between founders and investors"
```

---

## 🏆 Milestones

- 🥇 **four.meme AI Sprint** — Top 10 finalist (196 projects), Community Award
- 🔨 **Mantle Turing Test Hackathon Phase II** — Protocol Bet + AI Alpha & Data tracks

---

## 📄 License

MIT License — see [LICENSE](./LICENSE)

---

<div align="center">

**Built for Mantle Turing Test Hackathon**

[![Website](https://img.shields.io/badge/🌐_Website-verdictprotocol.online-0A0A0A?style=for-the-badge)](https://www.verdictprotocol.online)
[![Telegram](https://img.shields.io/badge/💬_Bot-@VerdictProtocol__Bot-26A5E4?style=for-the-badge)](https://t.me/VerdictProtocol_Bot)
[![npm](https://img.shields.io/badge/📦_SDK-@lant1ng/verdict--protocol--sdk-CB3837?style=for-the-badge)](https://www.npmjs.com/package/@lant1ng/verdict-protocol-sdk)
[![Twitter](https://img.shields.io/badge/🐦_Twitter-@yundan1216-1DA1F2?style=for-the-badge)](https://x.com/yundan1216)
[![DoraHacks](https://img.shields.io/badge/🏆_DoraHacks-Submission-FF6B35?style=for-the-badge)](https://dorahacks.io/buidl/29128)

*⚖️ Any two parties. Any verifiable outcome. AI decides.*

</div>
