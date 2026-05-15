# Verdict Protocol

> The on-chain verdict layer for Web3. AI-powered risk intelligence, 
> permissionless on-chain betting, contract audit, and IP arbitration — 
> built on BNB Chain, expanding to Mantle.

---

## Overview

Verdict Protocol is an AI-powered on-chain intelligence layer built 
for real users.

On one side: a smart money tracking and on-chain anomaly detection 
system — delivering live risk signals, whale movements, and wallet 
intelligence across 8 EVM chains through a Telegram Bot built for 
how traders actually operate.

On the other: a gamified, shareable consumer AI application that turns 
any on-chain disagreement into a live wager — between friends, rivals, 
or communities — with results that spread as verifiable, shareable cards.

Two products. One AI Judge core. Built on BNB Chain. Expanding to Mantle.

---

## Products

| Module | Status | Description |
|--------|--------|-------------|
| 🤖 Telegram Bot | ✅ Live | Smart money tracking & on-chain anomaly detection |
| ⚖️ Protocol Bet | 🔨 Building | Permissionless on-chain betting arena |
| 🔍 AI Audit | 📋 Planned | Smart contract risk analysis for Mantle & BNB Chain |
| 🏛️ IP Arbitration | 📋 Planned | On-chain IP dispute resolution |

---

## Track 02 — AI Alpha & Data Intelligence

Information asymmetry is a structural problem across all of Web3. 
Verdict Protocol addresses this through two channels: a Chrome 
extension and a Telegram Bot, both powered by the same AI Judge core.

The Chrome extension auto-detects contract addresses on DexScreener, 
GMGN, four.meme, and Ave.ai, delivering real-time risk scores and AI 
verdicts in seconds. The Telegram Bot provides deep wallet scanning, 
real-time whale tracking, and large transfer monitoring — covering 
8 EVM chains including Mantle, BNB Chain, Ethereum, Arbitrum, 
Optimism, Base, Polygon, and Avalanche.

**Data layer:** Moralis multi-chain API  
**Inference layer:** Large Language Model (LLM)  
**Live demo:** [@MemeCourt_Bot](https://t.me/MemeCourt_Bot) on Telegram

### Bot Commands

| Command | Description |
|---------|-------------|
| `/scan <address> <chain>` | Deep wallet scan + AI verdict |
| `/judge <address> <chain>` | AI Judge ruling |
| `/whale <chain>` | Real-time whale tracker |
| `/suspect <address>` | Suspect wallet analysis |
| `/watch <address> <chain>` | Monitor wallet for large transfers |
| `/subpoena <address>` | Issue subpoena to wallet |
| `/watchlist` | View monitored wallets |
| `/unwatch <address>` | Stop monitoring |

### Supported Chains

| Chain | Identifier |
|-------|------------|
| BNB Chain | `bnb` |
| Ethereum | `eth` |
| Polygon | `polygon` |
| Arbitrum | `arb` |
| Optimism | `op` |
| Base | `base` |
| Mantle | `mantle` |
| Avalanche | `avax` |

---

## Track 04 — Protocol Bet

Any disagreement can become a verifiable on-chain wager. Protocol Bet 
lets anyone create a bet on any on-chain event — token performance, 
market direction, or any disputed claim.

Use cases range from casual bets between friends (share a private link), 
to open challenges seeking any counterparty, to public disputes between 
KOLs or communities with opposing views. After settlement, results are 
automatically generated as shareable cards — fully verifiable on-chain.

No trusted intermediary required. The initiator sets the target, 
direction, time window, and stake amount. Once accepted, the contract 
locks funds and settles automatically on expiry. Transparent, automated, 
unstoppable.

---

## Tech Stack

- **Bot:** Python 3.9+, python-telegram-bot 20.7
- **Data:** Moralis Multi-chain API
- **AI:** Large Language Model (LLM)
- **Chains:** EVM-compatible (8 chains)
- **Target Network:** Mantle, BNB Chain

---

## Quick Start (Bot)

```bash
cd bot
pip install -r requirements.txt
cp .env.example .env
# Fill in your API keys in .env
python bot.py
```

### Environment Variables

```env
TELEGRAM_TOKEN=your_telegram_bot_token
MORALIS_API_KEY=your_moralis_api_key
LLM_API_KEY=your_llm_api_key
```

---

## Project Structure

```
verdict-protocol/
├── bot/                    # Telegram Bot (Live)
│   ├── bot.py
│   ├── requirements.txt
│   └── .env.example
├── extension/              # Chrome Extension (Coming Soon)
├── protocol-bet/           # On-chain Betting Arena (Building)
├── audit/                  # AI Contract Audit (Planned)
└── ip-arbitration/         # IP Arbitration (Planned)
```

---

## Links

- 🤖 Telegram Bot: [@MemeCourt_Bot](https://t.me/MemeCourt_Bot)
- 💬 Contact: [@lant1ng](https://t.me/lant1ng)
```
