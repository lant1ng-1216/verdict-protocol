# Verdict Protocol

> An AI-powered on-chain intelligence layer for Web3.  
> Smart money tracking, permissionless on-chain betting, contract audit, and IP arbitration.  
> Built on BNB Chain. Expanding to Mantle.

---

## Overview

Verdict Protocol is an AI-powered on-chain intelligence layer built for real users.

On one side: a smart money tracking and on-chain anomaly detection system — delivering live risk signals, whale movements, and wallet intelligence across 8 EVM chains through a Telegram Bot built for how traders actually operate.

On the other: a gamified, shareable consumer AI application that turns any on-chain disagreement into a live wager — between friends, rivals, or communities — with results that spread as verifiable, shareable cards.

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

Information asymmetry is a structural problem across all of Web3. Verdict Protocol addresses this through two channels: a Chrome extension and a Telegram Bot, both powered by the same AI Judge core.

The Chrome extension auto-detects contract addresses on DexScreener, GMGN, four.meme, and Ave.ai, delivering real-time risk scores and AI verdicts in seconds. The Telegram Bot provides deep wallet scanning (/scan), real-time whale tracking (/whale), and large transfer monitoring (/watch) — covering 8 EVM chains including Mantle, BNB Chain, Ethereum, Arbitrum, Optimism, Base, Polygon, and Avalanche.

This is intelligent information infrastructure for every on-chain participant.

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
| `/watchlist` | View monitored wallets |
| `/unwatch <address>` | Stop monitoring |

### Supported Chains

`bnb` · `eth` · `polygon` · `arb` · `op` · `base` · `mantle` · `avax`

---

## Track 04 — Protocol Bet

Disagreement is the most frequent event in on-chain markets — over token performance, project direction, or any on-chain outcome. Protocol Bet converts any verifiable on-chain dispute into a settleable wager.

Use cases are highly diverse: send a private bet link to a friend for a casual one-on-one wager; launch an open challenge and let anyone take the other side; stage a public showdown between KOLs or communities with opposing views; or go head-to-head against the AI Judge itself.

After settlement, results are automatically generated as shareable cards — on-chain verifiable, immediately readable.

No trusted intermediary required. The initiator sets the target, direction, time window, and stake amount. Once accepted, the contract locks funds and settles automatically on expiry. Transparent, automated, unstoppable.

---

## Track 05 — AI DevTools: Contract Audit Assistant

Smart contract risk and Gas efficiency are universal pain points for every Mantle developer and on-chain user. Verdict Protocol's AI audit module delivers instant pre-purchase contract risk analysis.

Core detection capabilities:
- **Honeypot detection** — sell restrictions, transfer locks, token trap patterns
- **Privilege risk** — hidden mint functions, dangerous admin permissions
- **Blacklist functions** — address-level trading or transfer blocks
- **Liquidity risk** — LP lock status, unlock timing, drainable pool flags
- **Holder concentration** — top wallet distribution and dump risk signals

Additionally, Verdict Protocol provides Gas consumption analysis and optimisation recommendations tailored to Mantle's network characteristics, helping developers identify high-cost call paths before deployment.

All capabilities are available via open API for third-party platform integration — native DevTools infrastructure for the Mantle ecosystem.

---

## IP Arbitration

Originality and IP disputes are a deep governance problem across Web3 — from on-chain assets to protocol branding, conflicts are widespread but have long lacked a credible resolution mechanism.

Verdict Protocol's IP arbitration module allows anyone to file an on-chain IP claim. A community jury participates in the review process, the AI Judge synthesises on-chain evidence to deliver a verdict, and the result is permanently recorded on-chain.

This is the infrastructure layer that moves Web3 creator economies from unverified claims toward accountable, on-chain truth.

---

## Tech Stack

- **Bot:** Python 3.9+, python-telegram-bot 20.7
- **Data:** Moralis Multi-chain API
- **AI:** Large Language Model (LLM)
- **Chains:** 8 EVM-compatible chains
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
