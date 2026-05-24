'use client';

import { useState, useEffect, useRef } from 'react';
import { ConnectButton, useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { formatEther } from 'viem';
import {
  useCounter, useAllDuels, useMyDuels,
  useCreate, useAccept, useBet, useClaim, useSettle, useDispute, useCancel,
  formatDeadline, shortAddr, fmtEther,
  type OnChainDuel,
} from '../lib/hooks';
import { DuelStatus, DuelSide } from '../lib/contract';

const WARRIOR_IMG = '/warrior.png';

const CHAINS = [
  { key: 'mantle',   name: 'Mantle',    token: 'MNT',  logo: 'https://icons.llamao.fi/icons/chains/rsz_mantle.jpg' },
  { key: 'bnb',      name: 'BNB Chain', token: 'BNB',  logo: 'https://icons.llamao.fi/icons/chains/rsz_binance.jpg' },
  { key: 'eth',      name: 'Ethereum',  token: 'ETH',  logo: 'https://icons.llamao.fi/icons/chains/rsz_ethereum.jpg' },
  { key: 'arb',      name: 'Arbitrum',  token: 'ETH',  logo: 'https://icons.llamao.fi/icons/chains/rsz_arbitrum.jpg' },
  { key: 'op',       name: 'Optimism',  token: 'ETH',  logo: 'https://icons.llamao.fi/icons/chains/rsz_optimism.jpg' },
  { key: 'base',     name: 'Base',      token: 'ETH',  logo: 'https://icons.llamao.fi/icons/chains/rsz_base.jpg' },
  { key: 'polygon',  name: 'Polygon',   token: 'POL',  logo: 'https://icons.llamao.fi/icons/chains/rsz_polygon.jpg' },
  { key: 'avax',     name: 'Avalanche', token: 'AVAX', logo: 'https://icons.llamao.fi/icons/chains/rsz_avalanche.jpg' },
];

const LANG = {
  en: {
    appName: 'Protocol Bet', arena: 'Arena', live: 'Live',
    connectWallet: 'Connect Wallet',
    issueBtn: '+ Issue a Duel', loadMore: 'Load more duels',
    filters: ['All', 'Hot 🔥', 'Ending soon', 'High stakes'],
    stats: { duels: 'Total Duels', pool: 'Prize Pool Today', settled: 'Total Settled' },
    nav: { arena: 'Arena', myDuels: 'My Duels' },
    ticker: [
      '@CryptoKing challenged @BlockWizard · 2.0 ETH · "Will Mantle flip Arbitrum?"',
      'New duel · 0.5 ETH · "My startup vs my friend\'s side project"',
      'AI Judge ruled: GUILTY · 1.2 ETH settled',
      '@zen_mode issued a personal challenge · 0.3 ETH',
    ],
    tags: {
      kolBattle: 'KOL Battle', friendsBet: 'Friends Bet', communityWar: 'Community War', personalChallenge: 'Personal Challenge',
      legendary: '★ Legendary', rare: '◆ Rare', common: 'Common',
      live: 'Live', open: 'Open', ending: '🔥 Ending', new: 'New',
    },
    card: {
      totalPot: 'Total Pot', watching: 'Watching', expires: 'Expires', pot: 'Pot',
      openSlot: 'Open Slot', awaiting: 'awaiting...',
      enterDuel: '⚔️ Enter duel', share: '↗ Share · Copy link', expiresIn: 'Expires in',
    },
    detail: {
      claimLabel: 'Claim on trial', rulingLabel: 'Ruling Standard',
      judgeNote: 'AI Judge delivers verdict on expiry based on the agreed ruling standard. No middleman. Automatic settlement.',
      openSlot: 'Open Slot', takeSide: 'Take the other side',
    },
    modal: {
      title: '⚔️ Issue a New Duel',
      claimLabel: 'Your claim', claimPlaceholder: "e.g. I'll launch my product before my friend does...",
      rulingLabel: 'Ruling standard', rulingPlaceholder: 'e.g. Based on official launch announcement on X...',
      networkLabel: 'Network & token', networkPlaceholder: 'Select network',
      stakeLabel: 'Stake amount', stakePlaceholder: '0.00',
      durationLabel: 'Duration', durationNote: 'Minimum 1 day',
      durationUnits: ['Days', 'Weeks', 'Months'],
      durationPresets: ['7d', '14d', '30d', '90d'],
      visibilityLabel: 'Visibility',
      visibilities: ['Public — anyone can join', 'Private — share link only'],
      visibilityAI: 'AI Judge — challenge the machine',
      visibilityDescPublic: 'Open to any challenger. Others can predict the AI ruling.',
      visibilityDescPrivate: 'Send directly to your opponent via link.',
      visibilityDescAI: 'No human opponent. The AI takes the other side.',
      visibilityAINote: '🏆 Win → earn $VRD tokens · Lose → your tokens enter the treasury',
      tgLabel: 'Telegram (optional)', tgPlaceholder: '@username — get notified when accepted',
      cancel: 'Cancel', submit: '🔒 Lock & Issue', submitAI: '🔒 Lock & Challenge AI',
    },
    duelModal: {
      supportPct: '% support', stakePlaceholder: 'Stake amount', odds: 'Est. odds', payout: 'If you win',
    },
    aiCard: { treasury: 'protocol treasury', reward: 'Reward' },
    liveCard: {
      watching: 'watching', online: 'online', communityVote: 'community vote',
      liveChat: 'Live Chat', saySomething: 'Say something...', send: '↑',
      enterDuel: '⚔️ Enter duel', expiresIn: 'Expires in',
    },
    events: { duelIssued: 'Duel Issued' },
    myDuels: {
      title: 'My Duels',
      subtitle: 'Track all your active, claimable, and past duels',
      tabs: { active: 'Active', claimable: 'Claimable', history: 'History' },
      empty: { active: 'No active duels', claimable: 'Nothing to claim yet', history: 'No past duels' },
      emptyDesc: {
        active: 'Head to the Arena and enter a duel to get started.',
        claimable: "Once a duel is settled and you've won, your rewards will appear here.",
        history: 'Your completed duels will be recorded here.',
      },
      labels: {
        yourStake: 'Your Stake', side: 'Your Side', payout: 'Payout',
        claimBy: 'Claim by', disputeWindow: 'Dispute window',
      },
      actions: { claim: '💰 Claim Reward', dispute: '🚨 Dispute', viewDuel: 'View Duel', goToArena: '⚔️ Go to Arena' },
      results: { won: '🏆 Won', lost: '💀 Lost', disputed: '⚠️ Disputed', pending: '⏳ Pending' },
      sides: { red: '👑 Red', blue: '⚔️ Blue' },
    },
    duels: [
      { claim: '"Mantle will flip Arbitrum in total TVL within 6 months — I\'ll stake 2 ETH on it"', rulingStd: 'Based on DeFiLlama TVL data at 00:00 UTC on the expiry date.', challengerStance: 'Bullish — Mantle flips Arbitrum', defenderStance: 'Bearish — Arbitrum stays dominant' },
      { claim: '"I\'ll ship my app before my co-founder finishes his side project. 0.5 ETH says I win."', rulingStd: 'Based on official product launch announcement on X.', challengerStance: 'I ship first', defenderStance: 'Take the other side' },
      { claim: '"Our community will hit 100K members before yours does."', rulingStd: 'Based on Twitter followers count at expiry date.', challengerStance: 'MantleDAO hits 100K first', defenderStance: 'ArbiDAO hits 100K first' },
      { claim: '"I can go 30 days without social media. Anyone want to bet against me?"', rulingStd: 'AI Judge verifies via public activity monitoring.', challengerStance: 'I can do it', defenderStance: 'Take the other side' },
    ],
  },
  zh: {
    appName: 'Protocol Bet', arena: '擂台', live: '实时',
    connectWallet: '连接钱包',
    issueBtn: '+ 发起对决', loadMore: '加载更多对决',
    filters: ['全部', '热门 🔥', '即将结束', '高额对赌'],
    stats: { duels: '总对决场次', pool: '今日奖池', settled: '已结算总额' },
    nav: { arena: '广场', myDuels: '我的对赌' },
    ticker: [
      '@CryptoKing 挑战了 @BlockWizard · 2.0 ETH · "Mantle能否超越Arbitrum？"',
      '新对决 · 0.5 ETH · "我的创业项目 vs 朋友的副业"',
      'AI法官裁定：有罪 · 1.2 ETH 已结算',
      '@zen_mode 发起个人挑战 · 0.3 ETH',
    ],
    tags: {
      kolBattle: 'KOL对战', friendsBet: '好友对赌', communityWar: '社区大战', personalChallenge: '个人挑战',
      legendary: '★ 传说', rare: '◆ 稀有', common: '普通',
      live: '进行中', open: '招募中', ending: '🔥 即将结束', new: '新对决',
    },
    card: {
      totalPot: '总奖池', watching: '观战', expires: '到期', pot: '奖池',
      openSlot: '等待应战', awaiting: '等待中...',
      enterDuel: '⚔️ 参与对决', share: '↗ 分享 · 复制链接', expiresIn: '剩余时间',
    },
    detail: {
      claimLabel: '对决声明', rulingLabel: '裁定标准',
      judgeNote: 'AI法官将在到期时根据双方约定的裁定标准给出裁决。无需中间人，自动结算。',
      openSlot: '等待应战', takeSide: '站到另一边',
    },
    modal: {
      title: '⚔️ 发起新对决',
      claimLabel: '你的声明', claimPlaceholder: '例如：我会在朋友之前先发布我的产品...',
      rulingLabel: '裁定标准', rulingPlaceholder: '例如：以X平台上的官方发布公告为准...',
      networkLabel: '网络与代币', networkPlaceholder: '选择网络',
      stakeLabel: '押注金额', stakePlaceholder: '0.00',
      durationLabel: '对决时长', durationNote: '最低1天',
      durationUnits: ['天', '周', '月'],
      durationPresets: ['7天', '14天', '30天', '90天'],
      visibilityLabel: '可见范围',
      visibilities: ['公开 — 任何人可参与', '私密 — 仅限链接'],
      visibilityAI: 'AI法官 — 挑战机器',
      visibilityDescPublic: '任何人都可以作为应战方加入，其他用户可预判AI裁定。',
      visibilityDescPrivate: '通过链接直接发送给你的对手。',
      visibilityDescAI: '无需真人对手，AI法官站到另一边。',
      visibilityAINote: '🏆 赢了 → 获得 $VRD 代币 · 输了 → 代币进入金库',
      tgLabel: 'Telegram（选填）', tgPlaceholder: '@用户名 — 有人接受时通知你',
      cancel: '取消', submit: '🔒 锁仓并发起', submitAI: '🔒 锁仓并挑战AI',
    },
    duelModal: {
      supportPct: '% 支持', stakePlaceholder: '押注金额', odds: '预计赔率', payout: '赢了可得',
    },
    aiCard: { treasury: '协议金库', reward: '奖励' },
    liveCard: {
      watching: '观战', online: '在线', communityVote: '社区投票',
      liveChat: '直播聊天', saySomething: '说点什么...', send: '↑',
      enterDuel: '⚔️ 参与对决', expiresIn: '剩余时间',
    },
    events: { duelIssued: '对决发起' },
    myDuels: {
      title: '我的对赌',
      subtitle: '查看所有参与过的对赌记录',
      tabs: { active: '进行中', claimable: '待领取', history: '历史记录' },
      empty: { active: '暂无进行中的对赌', claimable: '暂无可领取奖励', history: '暂无历史记录' },
      emptyDesc: {
        active: '前往广场参与对决吧。',
        claimable: '对赌结算后，你的奖励将在这里显示。',
        history: '你完成的对赌将记录在这里。',
      },
      labels: {
        yourStake: '你的押注', side: '你的立场', payout: '奖励',
        claimBy: '领取截止', disputeWindow: '质疑窗口',
      },
      actions: { claim: '💰 领取奖励', dispute: '🚨 提起质疑', viewDuel: '查看对决', goToArena: '⚔️ 去广场' },
      results: { won: '🏆 胜利', lost: '💀 失败', disputed: '⚠️ 质疑中', pending: '⏳ 待结算' },
      sides: { red: '👑 红方', blue: '⚔️ 蓝方' },
    },
    duels: [
      { claim: '"Mantle将在6个月内TVL总量超越Arbitrum — 我押2 ETH"', rulingStd: '以到期日00:00 UTC的DeFiLlama TVL数据为准。', challengerStance: '看涨 — Mantle超越Arbitrum', defenderStance: '看跌 — Arbitrum保持领先' },
      { claim: '"我会在联合创始人完成副业项目之前先上线产品，0.5 ETH为证。"', rulingStd: '以X平台上的官方产品发布公告为准。', challengerStance: '我先发布', defenderStance: '站到另一边' },
      { claim: '"我们社区将比你们社区先突破10万成员。"', rulingStd: '以到期日双方Twitter粉丝数为准。', challengerStance: 'MantleDAO先突破10万', defenderStance: 'ArbiDAO先突破10万' },
      { claim: '"我能坚持30天不用社交媒体，有人敢赌吗？"', rulingStd: 'AI法官通过监控主要社交平台公开活动进行裁定。', challengerStance: '我能做到', defenderStance: '站到另一边' },
    ],
  },
} as const;

type Lang = 'en' | 'zh';
type DuelType = 'kolBattle' | 'friendsBet' | 'communityWar' | 'personalChallenge';
type Rarity = 'legendary' | 'rare' | 'common';
type Status = 'live' | 'open' | 'ending' | 'new';
type Page = 'arena' | 'myDuels';
type MyDuelTab = 'active' | 'claimable' | 'history';

interface Duel {
  id: string; type: DuelType; rarity: Rarity; status: Status;
  challenger: { name: string; addr: string; color: string; amount: number };
  defender: { name: string; addr: string; color: string; amount: number } | null;
  supportRed: number; watchers: number; expires: string; network: string; token: string; index: number;
  isAIJudge?: boolean;
}

interface MyDuelRecord {
  id: string; claim: string; side: 'red' | 'blue';
  stake: number; token: string; network: string;
  opponentName: string; opponentColor: string; challengerColor: string;
  totalPot: number; tab: MyDuelTab;
  result?: 'won' | 'lost' | 'disputed' | 'pending';
  payout?: number; expires?: string; settledAt?: string;
  claimBy?: string; aiAnalysis?: string; disputeHoursLeft?: number;
}

const MY_DUELS_MOCK: MyDuelRecord[] = [
  { id: '0041', claim: '"Mantle will flip Arbitrum in total TVL within 6 months"', side: 'red', stake: 0.5, token: 'ETH', network: 'Mantle', opponentName: 'ArbiDAO', opponentColor: '#1a2a4a', challengerColor: '#4a1a00', totalPot: 1.5, tab: 'active', expires: '02h · 14m' },
  { id: '0038', claim: '"I can go 30 days without social media"', side: 'blue', stake: 0.3, token: 'MNT', network: 'Mantle', opponentName: 'AI Judge', opponentColor: '#1a1a3a', challengerColor: '#0a1a4a', totalPot: 0.6, tab: 'active', expires: '29d · 22h' },
  { id: '0031', claim: '"BTC will hit $120K before end of Q2"', side: 'red', stake: 1.0, token: 'ETH', network: 'BNB Chain', opponentName: '@bear_maxi', opponentColor: '#1a3a6a', challengerColor: '#6a1a1a', totalPot: 2.0, tab: 'claimable', result: 'won', payout: 1.92, settledAt: '2026-05-18', claimBy: '2026-05-20 18:00 UTC', disputeHoursLeft: 11, aiAnalysis: "BTC reached $121,450 on May 17 at 14:32 UTC. Challenger's prediction was validated by Binance spot price data." },
  { id: '0028', claim: '"Our community will hit 100K members before yours does"', side: 'blue', stake: 0.75, token: 'ETH', network: 'Mantle', opponentName: 'MantleDAO', opponentColor: '#4a1a00', challengerColor: '#1a2a4a', totalPot: 1.5, tab: 'history', result: 'lost', payout: 0, settledAt: '2026-05-10', aiAnalysis: 'MantleDAO reached 100,032 followers on May 10 at 09:14 UTC, 6 days ahead of ArbiDAO.' },
  { id: '0022', claim: '"I\'ll ship my app before my co-founder finishes his side project"', side: 'red', stake: 0.5, token: 'ETH', network: 'Ethereum', opponentName: '@cofounder_dev', opponentColor: '#1a3a1a', challengerColor: '#3a1a6a', totalPot: 1.0, tab: 'history', result: 'won', payout: 0.96, settledAt: '2026-04-28', aiAnalysis: 'Challenger published launch announcement on X at Apr 27 23:51 UTC. Opponent had no public launch by expiry.' },
];

const DUELS: Duel[] = [
  { id: '0039', type: 'friendsBet', rarity: 'common', status: 'open', challenger: { name: '@devlanting', addr: '0x9a...b33f', color: '#1a5a1a', amount: 0.5 }, defender: null, supportRed: 71, watchers: 23, expires: '29d · 04h', network: 'BNB Chain', token: 'BNB', index: 1 },
  { id: '0041', type: 'communityWar', rarity: 'rare', status: 'ending', challenger: { name: 'MantleDAO', addr: '0x4c...de12', color: '#4a1a00', amount: 0.75 }, defender: { name: 'ArbiDAO', addr: '0x7e...aa99', color: '#1a2a4a', amount: 0.75 }, supportRed: 55, watchers: 312, expires: '02h · 14m', network: 'Mantle', token: 'ETH', index: 2 },
  { id: '0038', type: 'personalChallenge', rarity: 'common', status: 'new', challenger: { name: '@zen_mode', addr: '0x2b...f091', color: '#0a1a4a', amount: 0.3 }, defender: null, supportRed: 48, watchers: 9, expires: '30d · 00h', network: 'Mantle', token: 'MNT', index: 3, isAIJudge: true },
];

const typeStyle: Record<DuelType, string> = {
  kolBattle: 'text-red-400 border-red-400/30 bg-red-400/10',
  friendsBet: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  communityWar: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
  personalChallenge: 'text-green-400 border-green-400/30 bg-green-400/10',
};
const rarityStyle: Record<Rarity, string> = {
  legendary: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  rare: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
  common: 'text-slate-500 border-slate-500/20 bg-slate-500/5',
};
const statusStyle: Record<Status, string> = {
  live: 'text-red-400 border-red-400/50 bg-red-400/10',
  open: 'text-blue-400 border-blue-400/50 bg-blue-400/10',
  ending: 'text-orange-400 border-orange-400/50 bg-orange-400/10',
  new: 'text-green-400 border-green-400/50 bg-green-400/10',
};

function useCountdown(base: string) {
  const [sec, setSec] = useState(0);
  useEffect(() => { const t = setInterval(() => setSec(s => s + 1), 1000); return () => clearInterval(t); }, []);
  return `${base} · ${String(sec % 60).padStart(2, '0')}s`;
}

function Ticker({ t, lang }: { t: typeof LANG['en']; lang: Lang }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let x = 0, id: number;
    const step = () => { x -= 0.4; if (Math.abs(x) > el.scrollWidth / 2) x = 0; el.style.transform = `translateX(${x}px)`; id = requestAnimationFrame(step); };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [lang]);
  return (
    <div className="bg-[#0a0a18] border-b border-white/5 px-4 py-1.5 flex items-center gap-3 overflow-hidden">
      <div className="flex items-center gap-1.5 text-[9px] tracking-widest uppercase text-red-400 whitespace-nowrap flex-shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />{t.live}
      </div>
      <div className="overflow-hidden flex-1">
        <div ref={ref} className="flex gap-12 whitespace-nowrap" style={{ width: 'max-content' }}>
          {[...t.ticker, ...t.ticker].map((item, i) => <span key={i} className="text-[10px] text-white/25">{item}</span>)}
        </div>
      </div>
    </div>
  );
}

function ChainSelector({ selectedChain, onSelect, placeholder }: { selectedChain: typeof CHAINS[0] | null; onSelect: (c: typeof CHAINS[0]) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className={`w-full bg-[#10101e] border rounded-xl px-3 py-2.5 flex items-center gap-2 text-sm outline-none transition-colors ${open ? 'border-red-400/50 rounded-b-none' : 'border-white/10 hover:border-white/20'}`}>
        {selectedChain ? (<><img src={selectedChain.logo} alt={selectedChain.name} className="w-5 h-5 rounded-full flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /><span className="text-white/80 flex-1 text-left">{selectedChain.name}</span><span className="text-white/40 text-xs">{selectedChain.token}</span></>) : <span className="text-white/25 flex-1 text-left">{placeholder}</span>}
        <span className={`text-white/30 text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 bg-[#10101e] border border-red-400/30 border-t-0 rounded-b-xl overflow-hidden z-20 max-h-48 overflow-y-auto">
          {CHAINS.map(c => (
            <button key={c.key} onClick={() => { onSelect(c); setOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${selectedChain?.key === c.key ? 'bg-red-400/8' : ''}`}>
              <img src={c.logo} alt={c.name} className="w-5 h-5 rounded-full flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <span className="text-white/80 flex-1 text-left">{c.name}</span>
              <span className="text-white/40 text-xs">{c.token}</span>
              {selectedChain?.key === c.key && <span className="text-red-400 text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function IssueModal({ t, onClose, chainId = 97 }: { t: typeof LANG['en']; onClose: () => void; chainId?: number }) {
  const m = t.modal;
  const [claim, setClaim] = useState('');
  const [rule, setRule] = useState('');
  const [stake, setStake] = useState('');
  const [duration, setDuration] = useState('7');
  const [durationUnit, setDurationUnit] = useState(0); // 0=天 1=周 2=月
  const [visibility, setVisibility] = useState<'public' | 'private' | 'ai'>('public');
  const [audienceRatio, setAudienceRatio] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [tgUsername, setTgUsername] = useState('');

  const currentToken = chainId === 97 ? 'tBNB' : chainId === 5003 ? 'MNT' : chainId === 56 ? 'BNB' : 'ETH';
  const currentNetwork = chainId === 97 ? 'BNB Testnet' : chainId === 5003 ? 'Mantle Sepolia' : chainId === 56 ? 'BNB Chain' : 'Ethereum';
  const winnerPct = 100 - audienceRatio;
  const presetDays = [7, 14, 30, 90];
  const unitLabels = m.durationUnits;
  const presetLabels = m.durationPresets;

  const { create, isPending, isConfirming, isSuccess, error } = useCreate();

  useEffect(() => {
    if (isSuccess) { setTimeout(onClose, 1500); }
  }, [isSuccess, onClose]);

  const canSubmit = claim.trim() && rule.trim() && parseFloat(stake) > 0 && !isPending && !isConfirming;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const multipliers = [1, 7, 30];
    const durationSecs = parseInt(duration) * multipliers[durationUnit] * 86400;
    const visNum = visibility === 'public' ? 0 : visibility === 'private' ? 1 : 2;
    const claimTrimmed = claim.trim();
    const ruleTrimmed = rule.trim();
    // 存到localStorage（本地快速读取）+ API（跨设备读取）
    if (typeof window !== 'undefined') {
      try {
        const { keccak256, toBytes } = require('viem');
        const cHash = keccak256(toBytes(claimTrimmed));
        const rHash = keccak256(toBytes(ruleTrimmed));
        localStorage.setItem('claim_' + cHash, claimTrimmed);
        localStorage.setItem('rule_' + rHash, ruleTrimmed);
        // 存到服务端（声明文字 + TG 用户名一次提交）
        const tgClean = tgUsername.trim() ? tgUsername.trim().replace(/^@/, '').toLowerCase() : undefined;
        fetch('/api/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ claimHash: cHash, ruleHash: rHash, claimText: claimTrimmed, ruleText: ruleTrimmed, tgUsername: tgClean }),
        }).catch(() => {});
      } catch (e) {}
    }
    create({ claim: claimTrimmed, rule: ruleTrimmed, durationSecs, wagerEth: stake, audioBps: audienceRatio * 100, vis: visNum });
  };

  const btnLabel = isSuccess ? '✓ 发起成功!' : isConfirming ? '链上确认中...' : isPending ? '等待签名...' : visibility === 'ai' ? m.submitAI : m.submit;

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}} onClick={onClose}>
      <div style={{background:'#0c0c1a',border:'1px solid rgba(255,107,107,0.3)',borderRadius:'16px',width:'100%',maxWidth:'448px',overflow:'hidden'}} onClick={e => e.stopPropagation()}>
        {/* HEADER */}
        <div style={{background:'#10101e',borderBottom:'1px solid rgba(255,255,255,0.05)',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:'14px',fontWeight:600,color:'rgba(255,255,255,0.9)'}}>{m.title}</span>
          <button onClick={onClose} style={{color:'rgba(255,255,255,0.3)',fontSize:'20px',lineHeight:1,background:'none',border:'none',cursor:'pointer'}}>×</button>
        </div>

        {/* BODY */}
        <div style={{padding:'20px',display:'flex',flexDirection:'column',gap:'16px',maxHeight:'70vh',overflowY:'auto'}}>

          {/* 你的声明 */}
          <div>
            <div style={{fontSize:'9px',letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(255,255,255,0.3)',marginBottom:'6px'}}>{m.claimLabel}</div>
            <textarea
              value={claim}
              onChange={e => setClaim(e.target.value)}
              rows={3}
              placeholder={m.claimPlaceholder}
              style={{width:'100%',background:'#10101e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'10px 12px',fontSize:'14px',color:'rgba(255,255,255,0.8)',outline:'none',resize:'none',boxSizing:'border-box'}}
            />
          </div>

          {/* 裁定标准 */}
          <div>
            <div style={{fontSize:'9px',letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(255,255,255,0.3)',marginBottom:'6px'}}>{m.rulingLabel}</div>
            <textarea
              value={rule}
              onChange={e => setRule(e.target.value)}
              rows={2}
              placeholder={m.rulingPlaceholder}
              style={{width:'100%',background:'#10101e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'10px 12px',fontSize:'14px',color:'rgba(255,255,255,0.8)',outline:'none',resize:'none',boxSizing:'border-box'}}
            />
          </div>

          {/* Telegram 通知 */}
          <div>
            <div style={{fontSize:'9px',letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(255,255,255,0.3)',marginBottom:'6px'}}>{m.tgLabel}</div>
            <input
              type="text"
              value={tgUsername}
              onChange={e => setTgUsername(e.target.value)}
              placeholder={m.tgPlaceholder}
              style={{width:'100%',background:'#10101e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'10px 12px',fontSize:'14px',color:'rgba(255,255,255,0.8)',outline:'none',boxSizing:'border-box'}}
            />
            <div style={{fontSize:'9px',color:'rgba(255,255,255,0.2)',marginTop:'4px'}}>先给 @MemeCourt_Bot 发 /start 才能收到通知</div>
          </div>

          {/* 网络 */}
          <div>
            <div style={{fontSize:'9px',letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(255,255,255,0.3)',marginBottom:'6px'}}>{m.networkLabel}</div>
            <div style={{background:'#10101e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'10px 12px',display:'flex',alignItems:'center',gap:'8px'}}>
              <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#4ade80',flexShrink:0}} />
              <span style={{color:'rgba(255,255,255,0.7)',flex:1,fontSize:'14px'}}>{currentNetwork}</span>
              <span style={{color:'rgba(255,255,255,0.4)',fontSize:'12px'}}>{currentToken}</span>
            </div>
          </div>

          {/* 押注金额 */}
          <div>
            <div style={{fontSize:'9px',letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(255,255,255,0.3)',marginBottom:'6px'}}>{m.stakeLabel}</div>
            <div style={{display:'flex',gap:'8px'}}>
              <input
                type="number" min="0" step="0.001"
                value={stake}
                onChange={e => setStake(e.target.value)}
                placeholder={m.stakePlaceholder}
                style={{flex:1,background:'#10101e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'10px 12px',fontSize:'14px',color:'rgba(255,255,255,0.8)',outline:'none'}}
              />
              <div style={{background:'#10101e',border:'1px solid rgba(255,107,107,0.3)',borderRadius:'12px',padding:'10px 12px',fontSize:'14px',fontWeight:600,color:'#ff6b6b',minWidth:'60px',textAlign:'center'}}>{currentToken}</div>
            </div>
          </div>

          {/* 分配比例 */}
          <div style={{background:'rgba(250,212,0,0.05)',border:'1px solid rgba(250,212,0,0.2)',borderRadius:'12px',padding:'16px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
              <div style={{fontSize:'9px',letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(250,212,0,0.6)'}}>对决池分配比例</div>
              <div style={{fontSize:'16px',fontWeight:'bold',color:'#fad400'}}>{audienceRatio}%</div>
            </div>
            <input type="range" min="0" max="100" step="5" value={audienceRatio} onChange={e => setAudienceRatio(Number(e.target.value))} style={{width:'100%',marginBottom:'12px',accentColor:'#fad400'}} />
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'12px'}}>
              <div style={{background:'rgba(255,107,107,0.08)',border:'1px solid rgba(255,107,107,0.2)',borderRadius:'8px',padding:'10px',textAlign:'center'}}>
                <div style={{fontSize:'7px',letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(255,107,107,0.5)',marginBottom:'4px'}}>赢家获得</div>
                <div style={{fontSize:'16px',fontWeight:'bold',color:'#ff6b6b'}}>{100-audienceRatio}%</div>
                <div style={{fontSize:'8px',color:'rgba(255,107,107,0.4)'}}>对决池</div>
              </div>
              <div style={{background:'rgba(107,159,255,0.08)',border:'1px solid rgba(107,159,255,0.2)',borderRadius:'8px',padding:'10px',textAlign:'center'}}>
                <div style={{fontSize:'7px',letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(107,159,255,0.5)',marginBottom:'4px'}}>观众瓜分</div>
                <div style={{fontSize:'16px',fontWeight:'bold',color:'#6b9fff'}}>{audienceRatio}%</div>
                <div style={{fontSize:'8px',color:'rgba(107,159,255,0.4)'}}>对决池</div>
              </div>
            </div>
            <div style={{fontSize:'10px',color:'rgba(255,255,255,0.25)',lineHeight:1.5}}>
              {audienceRatio === 0 ? '赢家独得 100% 对决池，观众押注收益来自独立的观众池。' : audienceRatio === 100 ? '赢家放弃全部收益，100% 对决池归押对的观众瓜分。' : `赢家获得对决池的 ${100-audienceRatio}%，押对的观众瓜分 ${audienceRatio}%。`}
            </div>
          </div>

          {/* 时长 */}
          <div>
            <div style={{fontSize:'9px',letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(255,255,255,0.3)',marginBottom:'6px'}}>{m.durationLabel}</div>
            <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
              <input
                type="number" min="1" step="1"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                style={{flex:1,background:'#10101e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'10px 12px',fontSize:'14px',color:'rgba(255,255,255,0.8)',outline:'none'}}
              />
              <select
                value={durationUnit}
                onChange={e => setDurationUnit(Number(e.target.value))}
                style={{background:'#10101e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'10px 12px',fontSize:'14px',color:'rgba(255,255,255,0.8)',outline:'none'}}
              >
                {unitLabels.map((u, i) => <option key={i} value={i}>{u}</option>)}
              </select>
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              {presetDays.map((d, i) => (
                <button
                  key={d}
                  onClick={() => { setDuration(String(d)); setDurationUnit(0); }}
                  style={{flex:1,padding:'6px',borderRadius:'8px',fontSize:'10px',border: duration === String(d) && durationUnit === 0 ? '1px solid rgba(255,107,107,0.5)' : '1px solid rgba(255,255,255,0.1)',background: duration === String(d) && durationUnit === 0 ? 'rgba(255,107,107,0.1)' : 'transparent',color: duration === String(d) && durationUnit === 0 ? '#ff6b6b' : 'rgba(255,255,255,0.3)',cursor:'pointer'}}
                >{presetLabels[i]}</button>
              ))}
            </div>
          </div>

          {/* 可见范围 */}
          <div>
            <div style={{fontSize:'9px',letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(255,255,255,0.3)',marginBottom:'8px'}}>{m.visibilityLabel}</div>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {[
                { key: 'public' as const, label: m.visibilities[0], desc: m.visibilityDescPublic },
                { key: 'private' as const, label: m.visibilities[1], desc: m.visibilityDescPrivate },
                { key: 'ai' as const, label: m.visibilityAI, desc: m.visibilityDescAI },
              ].map(opt => (
                <div
                  key={opt.key}
                  onClick={() => setVisibility(opt.key)}
                  style={{borderRadius:'12px',padding:'10px 12px',cursor:'pointer',display:'flex',alignItems:'flex-start',gap:'12px',border: visibility === opt.key ? (opt.key === 'ai' ? '1px solid rgba(168,107,255,0.4)' : '1px solid rgba(96,165,250,0.4)') : '1px solid rgba(255,255,255,0.08)',background: visibility === opt.key ? (opt.key === 'ai' ? 'rgba(168,107,255,0.05)' : 'rgba(96,165,250,0.05)') : '#10101e'}}
                >
                  <div style={{width:'14px',height:'14px',borderRadius:'50%',border: visibility === opt.key ? (opt.key === 'ai' ? '2px solid #a86bff' : '2px solid #60a5fa') : '2px solid rgba(255,255,255,0.2)',background: visibility === opt.key ? (opt.key === 'ai' ? '#a86bff' : '#60a5fa') : 'transparent',flexShrink:0,marginTop:'2px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {visibility === opt.key && <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'white'}} />}
                  </div>
                  <div>
                    <div style={{fontSize:'12px',fontWeight:600,color: visibility === opt.key ? (opt.key === 'ai' ? '#c084fc' : '#93c5fd') : 'rgba(255,255,255,0.6)',marginBottom:'2px'}}>{opt.label}</div>
                    <div style={{fontSize:'10px',color:'rgba(255,255,255,0.3)'}}>{opt.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <div style={{fontSize:'11px',color:'#f87171',background:'rgba(248,113,113,0.1)',borderRadius:'8px',padding:'8px 12px'}}>Error: {(error as any)?.shortMessage || error?.message}</div>}
        </div>

        {/* FOOTER */}
        <div style={{padding:'0 20px 20px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
          <button onClick={onClose} style={{padding:'10px',borderRadius:'12px',fontSize:'14px',fontWeight:500,color:'rgba(255,255,255,0.4)',border:'1px solid rgba(255,255,255,0.1)',background:'transparent',cursor:'pointer'}}>{m.cancel}</button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{padding:'10px',borderRadius:'12px',fontSize:'14px',fontWeight:600,border: isSuccess ? '1px solid rgba(74,222,128,0.5)' : visibility === 'ai' ? '1px solid rgba(168,107,255,0.5)' : '1px solid rgba(255,107,107,0.5)',background: isSuccess ? 'rgba(74,222,128,0.1)' : visibility === 'ai' ? 'rgba(168,107,255,0.1)' : 'rgba(255,107,107,0.1)',color: isSuccess ? '#4ade80' : visibility === 'ai' ? '#c084fc' : '#ff6b6b',cursor: canSubmit ? 'pointer' : 'not-allowed',opacity: canSubmit ? 1 : 0.5}}
          >{btnLabel}</button>
        </div>
      </div>
    </div>
  );
}

const LIVE_DUEL = {
  id: '0042', challenger: { name: '@CryptoKing', addr: '0x3f...a21c', color: '#6a1a1a' },
  defender: { name: '@BlockWizard', addr: '0x8b...cc44', color: '#1a1a6a' },
  amount: 1.0, expires: '44d · 08h',
};
const CHAT_SEED = [
  { color: '#6a1a3a', name: '@whale_hunter', cls: 'text-red-400', text: 'Mantle TVL up 40% 👀', pill: 'r' as const },
  { color: '#1a3a6a', name: '@defi_wizard', cls: 'text-blue-400', text: 'Arbitrum still 3x liquidity', pill: 'b' as const },
  { color: '#1a6a2a', name: '@on_chain_eyes', cls: 'text-green-400', text: 'Gap closing fast 📊', pill: null },
  { color: '#6a5a1a', name: '@mantle_maxi', cls: 'text-yellow-400', text: '2 ETH pot lets gooo 🚀', pill: 'r' as const },
  { color: '#3a1a6a', name: '@arbi_chad', cls: 'text-purple-400', text: 'BlockWizard knows 💎', pill: 'b' as const },
  { color: '#1a6a6a', name: '@data_nerd', cls: 'text-cyan-400', text: 'numbers are close...', pill: 'r' as const },
  { color: '#6a3a1a', name: '@crypto_lurker', cls: 'text-orange-400', text: 'who u betting on 👀', pill: null },
];
const HEATMAP_COLS = 26, HEATMAP_ROWS = 9;
const RED_STOPS = ['#0d0810','#ff6b6b22','#ff6b6b55','#ff6b6b88','#ff6b6bbb','#ff6b6b'];
const BLU_STOPS = ['#08080f','#6b9fff22','#6b9fff55','#6b9fff88','#6b9fffbb','#6b9fff'];
function initHeatmap(red: number) {
  return Array.from({length: HEATMAP_COLS}, (_, ci) => Array.from({length: HEATMAP_ROWS}, (_, ri) => {
    const v = red + Math.sin((ci+ri)*0.5)*18 + Math.random()*16 - 8;
    const side = v > 50 ? 'r' : 'b'; const dist = Math.abs(v-50)/50;
    return {side, intensity: Math.ceil(dist*4) || 1};
  }));
}
const LIVE_EVENTS = [
  {text:'Mantle TVL +2.3% ↑', side:'r'},{text:'@CryptoKing leading +4%', side:'r'},
  {text:'Arbitrum holds $2B TVL', side:'b'},{text:'⚖️ AI: gap still large', side:'g'},
  {text:'847 watching now', side:'g'},{text:'Community vote swings RED', side:'r'},
];

function LiveCard({ t, onEnter }: { t: typeof LANG['en']; onEnter: () => void }) {
  const timer = useCountdown(LIVE_DUEL.expires);
  const lt = t.liveCard;
  const [watchers, setWatchers] = useState(847);
  const [supportRed, setSupportRed] = useState(62);
  const [chatMsgs, setChatMsgs] = useState(CHAT_SEED.slice(0, 5));
  const [heatmap, setHeatmap] = useState(() => initHeatmap(62));
  const [eventBubble, setEventBubble] = useState<{text:string;side:string}|null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const msgIdx = useRef(0); const eventIdx = useRef(0);
  useEffect(() => {
    const t1 = setInterval(() => setWatchers(v => Math.max(800, v + Math.floor(Math.random() * 8) - 3)), 2000);
    const t2 = setInterval(() => {
      setSupportRed(v => {
        const next = Math.max(38, Math.min(76, v + (Math.random() - 0.5) * 1.5));
        setHeatmap(prev => {
          const n2 = prev.map(col => [...col]); const strength = Math.abs(next-50)/50; const isRed = next > 50;
          for(let i=0;i<Math.floor(HEATMAP_COLS*HEATMAP_ROWS*0.12);i++){
            const c=Math.floor(Math.random()*HEATMAP_COLS); const r=Math.floor(Math.random()*HEATMAP_ROWS);
            const thr=isRed?0.5+strength*0.45:0.5-strength*0.45;
            n2[c][r]={side:Math.random()<thr?'r':'b',intensity:Math.ceil(Math.random()*(1+strength*4))||1};
          }
          return n2;
        });
        return next;
      });
    }, 1200);
    const t3 = setInterval(() => { setChatMsgs(prev => [...prev.slice(-19), CHAT_SEED[msgIdx.current % CHAT_SEED.length]]); msgIdx.current++; }, 2800);
    const t4 = setInterval(() => {
      const e = LIVE_EVENTS[eventIdx.current % LIVE_EVENTS.length];
      setEventBubble(e); setTimeout(() => setEventBubble(null), 2000); eventIdx.current++;
    }, 3500);
    setTimeout(() => { setEventBubble(LIVE_EVENTS[0]); setTimeout(() => setEventBubble(null), 2000); }, 800);
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3); clearInterval(t4); };
  }, []);
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [chatMsgs]);
  const red = Math.round(supportRed); const isRedLeading = red > 50;
  return (
    <div className="bg-[#0c0c1a] border border-white/10 rounded-2xl overflow-hidden" style={{ display: 'grid', gridTemplateColumns: '70% 30%', height: '540px' }}>
      <div className="flex flex-col border-r border-white/10 bg-[#07070f] overflow-hidden">
        <div className="bg-[#09091e] border-b border-white/5 px-3 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded-full px-2.5 py-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /><span className="text-[9px] font-bold text-red-400 tracking-widest">LIVE</span></div>
          <div className="flex items-center gap-2"><div className="flex">{['#6a1a3a','#1a3a6a','#1a6a2a'].map((c,i) => (<div key={i} className="w-4 h-4 rounded-full overflow-hidden border border-[#09091e] -ml-1 first:ml-0 relative"><div className="absolute inset-0" style={{ background: c }} /><img src={WARRIOR_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-top" /></div>))}</div><span className="text-[10px] text-white/40"><span className="text-green-400 font-semibold">{watchers}</span> {lt.watching}</span></div>
          <div className="flex items-center gap-2"><span className="text-[8px] text-red-400 border border-red-400/30 bg-red-400/10 rounded px-1.5 py-0.5 tracking-wider">KOL BATTLE</span><span className="text-[8px] tracking-widest text-white/20">#{LIVE_DUEL.id}</span></div>
        </div>
        <div className="bg-[#0a0a1e] border-b border-white/5 px-3 py-2 flex-shrink-0 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[7px] tracking-widest uppercase text-white/20 mb-1">{t.events.duelIssued}</div>
            <div className="text-[11px] font-semibold text-white/80 leading-snug mb-1">{t.duels[0].claim}</div>
            <div className="flex items-center gap-2"><span className="text-[7px] tracking-widest uppercase text-white/15">Ruling</span><span className="text-[9px] text-white/25">DeFiLlama TVL data at expiry · 00:00 UTC</span></div>
          </div>
          <button onClick={onEnter} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-red-400 border border-red-400/40 bg-red-400/10 hover:bg-red-400/20 transition-colors whitespace-nowrap flex-shrink-0">{lt.enterDuel}</button>
        </div>
        <div className="px-3 py-3 flex-shrink-0" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', position: 'relative' }}>
          {/* RED */}
          <div className="flex flex-col items-center gap-2 text-center" style={{ transform: isRedLeading ? 'scale(1.04)' : 'scale(0.96)', transition: 'transform 0.6s ease' }}>
            <div className="relative">
              {isRedLeading && <div className="absolute inset-[-10px] rounded-2xl pointer-events-none" style={{ background: 'radial-gradient(circle,rgba(255,107,107,0.25),transparent 70%)' }} />}
              <div className="w-12 h-12 rounded-xl overflow-hidden relative border-2 border-red-400" style={{ filter: isRedLeading ? 'brightness(1.1)' : 'brightness(0.75) saturate(0.6)', transition: 'filter 0.6s ease' }}><div className="absolute inset-0" style={{ background: LIVE_DUEL.challenger.color }} /><img src={WARRIOR_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-top" /><div className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-green-400 border border-[#07070f]" /></div>
            </div>
            <div className="text-[10px] font-semibold text-white/80">{LIVE_DUEL.challenger.name}</div>
            <div className="text-[8px] text-white/25 font-mono">{LIVE_DUEL.challenger.addr}</div>
            <div className="text-[8px] text-white/40">Bullish — Mantle flips</div>
            <div className="text-lg font-bold text-red-400">{LIVE_DUEL.amount} <span className="text-[8px] text-white/25">ETH</span></div>
            <div className="w-full flex flex-col gap-1.5">
              {[{label:'SUP',val:`${red}%`,pct:red},{label:'TVL',val:'$588M',pct:22},{label:'MOM',val:'+40%',pct:78}].map(s => (<div key={s.label} className="flex items-center gap-1.5"><span className="text-[7px] text-white/20 w-6 text-right uppercase">{s.label}</span><div className="flex-1 h-[3px] bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-red-400 rounded-full transition-all duration-700" style={{ width: `${s.pct}%` }} /></div><span className="text-[7px] text-red-400 w-8 font-semibold">{s.val}</span></div>))}
            </div>
          </div>
          {/* CENTER */}
          <div className="flex flex-col items-center justify-center gap-2 px-3" style={{ position: 'relative' }}>
            <div className="w-px h-6 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
            <span className="text-[11px] font-bold text-white/15 tracking-widest">VS</span>
            <div className="flex items-center gap-1.5">
              <div className="bg-red-400/15 border border-red-400/25 rounded-lg px-2 py-1.5 text-center" style={{minWidth:'56px'}}><div className="text-[6px] tracking-widest uppercase text-red-400/50 mb-1">对决池</div><div className="text-sm font-bold text-red-400">2.0</div><div className="text-[7px] font-semibold text-red-400/60">ETH</div></div>
              <div className="bg-blue-400/15 border border-blue-400/25 rounded-lg px-2 py-1.5 text-center" style={{minWidth:'56px'}}><div className="text-[6px] tracking-widest uppercase text-blue-400/50 mb-1">观众池</div><div className="text-sm font-bold text-blue-400">4.8</div><div className="text-[7px] font-semibold text-blue-400/60">ETH</div></div>
            </div>
            <div className="w-px h-6 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
            {eventBubble && (<div className="absolute top-0 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-semibold rounded-md px-2 py-1 border z-10" style={{ color: eventBubble.side==='r'?'#ff9999':eventBubble.side==='b'?'#99bbff':'#ffcc66', background: eventBubble.side==='r'?'rgba(255,107,107,0.15)':eventBubble.side==='b'?'rgba(107,159,255,0.15)':'rgba(240,168,0,0.15)', borderColor: eventBubble.side==='r'?'rgba(255,107,107,0.3)':eventBubble.side==='b'?'rgba(107,159,255,0.3)':'rgba(240,168,0,0.3)', animation:'fadeInUp 0.3s ease' }}>{eventBubble.text}</div>)}
          </div>
          {/* BLUE */}
          <div className="flex flex-col items-center gap-2 text-center" style={{ transform: !isRedLeading ? 'scale(1.04)' : 'scale(0.96)', transition: 'transform 0.6s ease' }}>
            <div className="relative">
              {!isRedLeading && <div className="absolute inset-[-10px] rounded-2xl pointer-events-none" style={{ background: 'radial-gradient(circle,rgba(107,159,255,0.25),transparent 70%)' }} />}
              <div className="w-12 h-12 rounded-xl overflow-hidden relative border-2 border-blue-400" style={{ filter: !isRedLeading ? 'brightness(1.1)' : 'brightness(0.75) saturate(0.6)', transition: 'filter 0.6s ease' }}><div className="absolute inset-0" style={{ background: LIVE_DUEL.defender.color }} /><img src={WARRIOR_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-top" /><div className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-green-400 border border-[#07070f]" /></div>
            </div>
            <div className="text-[10px] font-semibold text-white/80">{LIVE_DUEL.defender.name}</div>
            <div className="text-[8px] text-white/25 font-mono">{LIVE_DUEL.defender.addr}</div>
            <div className="text-[8px] text-white/40">Bearish — Arbitrum holds</div>
            <div className="text-lg font-bold text-blue-400">{LIVE_DUEL.amount} <span className="text-[8px] text-white/25">ETH</span></div>
            <div className="w-full flex flex-col gap-1.5">
              {[{label:'SUP',val:`${100-red}%`,pct:100-red},{label:'TVL',val:'$2.08B',pct:80},{label:'MOM',val:'-1.2%',pct:18}].map(s => (<div key={s.label} className="flex items-center gap-1.5"><span className="text-[7px] text-white/20 w-6 text-right uppercase">{s.label}</span><div className="flex-1 h-[3px] bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-blue-400 rounded-full transition-all duration-700" style={{ width: `${s.pct}%` }} /></div><span className="text-[7px] text-blue-400 w-8 font-semibold">{s.val}</span></div>))}
            </div>
          </div>
        </div>
        <div className="px-3 pb-2 flex-shrink-0">
          <div className="flex justify-between mb-1"><span className="text-[10px] font-semibold text-red-400" style={{ fontSize: isRedLeading ? '12px' : '10px', transition: 'font-size 0.4s' }}>{red}%</span><span className="text-[8px] text-white/20 tracking-widest uppercase">{lt.communityVote}</span><span className="text-[10px] font-semibold text-blue-400" style={{ fontSize: !isRedLeading ? '12px' : '10px', transition: 'font-size 0.4s' }}>{100-red}%</span></div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden flex"><div className="bg-gradient-to-r from-red-600 to-red-400 rounded-l-full transition-all duration-700" style={{ width: `${red}%` }} /><div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-r-full flex-1" /></div>
          <div className="flex justify-between mt-0.5"><span className="text-[7px] text-red-400/40">{LIVE_DUEL.challenger.name}</span><span className="text-[7px] text-blue-400/40">{LIVE_DUEL.defender.name}</span></div>
        </div>
        <div className="px-3 pb-2 flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5"><span className="text-[7px] tracking-widest uppercase text-white/20">support_rate · live</span><div className="flex items-center gap-2"><div className="flex items-center gap-1"><span className="text-[7px] text-white/15">less</span>{[1,2,3,4,5].map(i => <div key={i} className="w-1.5 h-1.5 rounded-sm" style={{ background: RED_STOPS[i] }} />)}<span className="text-[7px] text-red-400/40">red</span></div><div className="flex items-center gap-1">{[1,2,3,4,5].map(i => <div key={i} className="w-1.5 h-1.5 rounded-sm" style={{ background: BLU_STOPS[i] }} />)}<span className="text-[7px] text-blue-400/40">blue</span><span className="text-[7px] text-white/15">more</span></div></div></div>
          <div className="flex gap-3">
            <div className="flex gap-[3px] flex-shrink-0">{heatmap.map((col, ci) => (<div key={ci} className="flex flex-col gap-[3px]">{col.map((cell, ri) => (<div key={ri} className="w-[10px] h-[10px] rounded-sm" style={{ background: cell.side === 'r' ? RED_STOPS[cell.intensity] : BLU_STOPS[cell.intensity], transition: 'background 1s ease' }} />))}</div>))}</div>
            <div className="flex-1 border-l border-white/5 pl-3 flex flex-col justify-between gap-2">
              <div><div className="text-[6px] tracking-widest uppercase text-white/15 mb-0.5">Watching</div><div className="flex items-baseline gap-1.5"><span className="text-sm font-bold text-green-400">{Math.round(red * 8 + 300)}</span><span className="text-[8px] text-green-400/50">↑ live</span></div></div>
              <div>
                <div className="text-[6px] tracking-widest uppercase text-white/15 mb-1">AI Judge · signal</div>
                <div className="flex items-center gap-1.5 mb-1"><div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" /><span className="text-[8px] text-purple-400 font-semibold">Monitoring</span></div>
                <div className="relative"><div className="h-1.5 bg-white/5 rounded-full overflow-hidden flex"><div className="bg-red-400/60 rounded-l-full transition-all duration-1000" style={{ width: `${red * 0.7}%` }} /><div className="bg-blue-400/60 rounded-r-full flex-1" /></div><div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-purple-400 border border-[#07070f] transition-all duration-1000" style={{ left: `calc(${red * 0.7}% - 4px)` }} /></div>
                <div className="flex justify-between mt-0.5"><span className="text-[6px] text-red-400/50">{LIVE_DUEL.challenger.name}</span><span className="text-[6px] text-purple-400/50">⚖️ {red > 55 ? 'leans RED' : red < 45 ? 'leans BLUE' : 'neutral'}</span><span className="text-[6px] text-blue-400/50">{LIVE_DUEL.defender.name}</span></div>
                <div className="text-[8px] text-purple-300/50 italic leading-snug mt-1">"{red > 55 ? 'Momentum favors challenger.' : red < 45 ? 'Defender holds ground.' : 'Outcome uncertain.'}"</div>
              </div>
              <div><div className="text-[6px] tracking-widest uppercase text-white/15 mb-0.5">Time elapsed</div><div className="h-1 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-orange-400/50 rounded-full" style={{ width: '41%' }} /></div><div className="flex justify-between mt-0.5"><span className="text-[6px] text-orange-400/40">41% elapsed</span><span className="text-[6px] text-white/15">44d left</span></div></div>
            </div>
          </div>
        </div>
        <div className="bg-[#04040c] border-t border-white/5 px-3 py-1.5 flex justify-between items-center flex-shrink-0"><span className="text-[7px] tracking-widest uppercase text-white/20">{lt.expiresIn}</span><span className="text-[9px] font-mono text-red-400/50">{timer}</span></div>
      </div>
      {/* CHAT */}
      <div className="flex flex-col bg-[#07070f] overflow-hidden">
        <div className="bg-[#08081a] border-b border-white/5 px-3 py-2 flex items-center justify-between flex-shrink-0"><span className="text-[9px] font-semibold tracking-widest uppercase text-white/40">{lt.liveChat}</span><span className="text-[8px] text-white/20">{Math.floor(watchers * 0.15)} {lt.online}</span></div>
        <div ref={chatRef} className="flex-1 overflow-y-auto p-2 flex flex-col gap-2" style={{ scrollbarWidth: 'none' }}>
          {chatMsgs.map((m, i) => (<div key={i} className="flex items-start gap-1.5"><div className="w-4 h-4 rounded-full overflow-hidden relative flex-shrink-0 mt-0.5"><div className="absolute inset-0" style={{ background: m.color }} /><img src={WARRIOR_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-top" /></div><div className="flex-1 min-w-0"><div className="flex items-center gap-1.5 mb-0.5 flex-wrap"><span className={`text-[8px] font-bold ${m.cls}`}>{m.name}</span>{m.pill && <span className={`text-[7px] font-semibold rounded px-1 py-0.5 ${m.pill==='r'?'text-red-400 bg-red-400/15 border border-red-400/25':'text-blue-400 bg-blue-400/15 border border-blue-400/25'}`}>{m.pill==='r'?'RED':'BLUE'}</span>}</div><div className="text-[9px] text-white/35 leading-snug">{m.text}</div></div></div>))}
        </div>
        <div className="border-t border-white/5 px-2 py-1.5 grid grid-cols-2 gap-1.5 bg-[#08081a] flex-shrink-0"><button className="py-1 rounded-md text-[8px] font-semibold text-red-400 border border-red-400/25 bg-red-400/8 hover:bg-red-400/15 transition-colors truncate">👑 {LIVE_DUEL.challenger.name}</button><button className="py-1 rounded-md text-[8px] font-semibold text-blue-400 border border-blue-400/25 bg-blue-400/8 hover:bg-blue-400/15 transition-colors truncate">⚔️ {LIVE_DUEL.defender.name}</button></div>
        <div className="border-t border-white/5 px-2 py-1.5 bg-[#08081a] flex gap-1.5 items-center flex-shrink-0"><input className="flex-1 bg-[#0c0c1e] border border-white/8 rounded-full px-2.5 py-1.5 text-[9px] text-white/50 placeholder-white/20 outline-none" placeholder={lt.saySomething} /><button className="bg-red-400/15 border border-red-400/25 rounded-full px-2.5 py-1.5 text-[9px] text-red-400">{lt.send}</button></div>
      </div>
    </div>
  );
}

function DuelCard({ duel, t, onClick, onEnter }: { duel: Duel; t: typeof LANG['en']; onClick: () => void; onEnter: () => void }) {
  const timer = useCountdown(duel.expires);
  const d = t.duels[duel.index];
  const isAI = duel.isAIJudge;
  const ac = t.aiCard;
  const border = isAI ? 'border-purple-400/30' : duel.rarity === 'legendary' ? 'border-yellow-400/25' : duel.status === 'ending' ? 'border-orange-400/35' : 'border-white/10';
  const hoverBorder = isAI ? 'hover:border-purple-400/50' : 'hover:border-red-400/50';
  return (
    <div onClick={onClick} className={`bg-[#0c0c1a] border ${border} rounded-xl overflow-hidden cursor-pointer transition-all duration-150 ${hoverBorder} hover:-translate-y-0.5 flex flex-col`} style={isAI ? { background: 'linear-gradient(180deg, rgba(168,107,255,0.06) 0%, #0c0c1a 50%)' } : undefined}>
      <div className="px-3 pt-2.5 pb-1.5 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 flex-wrap">
          <span className={`text-[8px] tracking-widest uppercase px-1.5 py-0.5 rounded border ${typeStyle[duel.type]}`}>{t.tags[duel.type]}</span>
          {duel.rarity !== 'common' && <span className={`text-[8px] tracking-wide px-1.5 py-0.5 rounded border ${rarityStyle[duel.rarity]}`}>{t.tags[duel.rarity]}</span>}
          {isAI && <span className="text-[8px] tracking-widest uppercase px-1.5 py-0.5 rounded border text-purple-400 border-purple-400/50 bg-purple-400/10">vs AI Judge</span>}
        </div>
        <span className={`text-[8px] tracking-widest uppercase px-1.5 py-0.5 rounded border flex-shrink-0 ${statusStyle[duel.status]}`}>{t.tags[duel.status]}</span>
      </div>
      <div className="px-3 pb-2" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '4px' }}>
        <div className="flex items-center gap-2">
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-xl overflow-hidden relative border-2 border-red-400"><div className="absolute inset-0" style={{ background: duel.challenger.color }} /><img src={WARRIOR_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-top" /><div className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-green-400 border border-[#0c0c1a]" /></div>
            {(() => { const chain = CHAINS.find(c => duel.network.includes(c.name)); return chain ? <img src={chain.logo} alt="" className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full border-2 border-[#0c0c1a]" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} /> : null; })()}
          </div>
          <div className="flex flex-col gap-0.5 min-w-0"><div className="text-[11px] font-semibold text-white/85 truncate">{duel.challenger.name}</div><div className="text-[8px] text-white/25 font-mono truncate">{duel.challenger.addr}</div><div className="flex items-center gap-1.5 mt-0.5"><span className="text-[17px] font-bold text-red-400 leading-none">{duel.challenger.amount}</span><span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded border ${isAI ? 'text-purple-400/70 border-purple-400/20 bg-purple-400/8' : 'text-red-400/70 border-red-400/20 bg-red-400/8'}`}>{duel.token}</span></div></div>
        </div>
        <div className="flex flex-col items-center gap-1 px-1">
          <div className="w-px h-2 bg-white/10" /><span className="text-[9px] font-medium text-white/15 tracking-widest">VS</span>
          <div className="flex items-center gap-1">
            <div className={`rounded-lg px-1.5 py-1 text-center ${isAI ? 'bg-purple-400/10 border border-purple-400/20' : 'bg-red-400/10 border border-red-400/20'}`} style={{minWidth:'50px'}}><div className={`text-[6px] tracking-widest uppercase mb-1 ${isAI ? 'text-purple-400/50' : 'text-red-400/50'}`}>对决池</div><div className={`text-[10px] font-bold leading-none ${isAI ? 'text-purple-400' : 'text-red-400'}`}>{duel.challenger.amount + (duel.defender?.amount ?? duel.challenger.amount)}</div><div className={`text-[7px] font-semibold mt-0.5 ${isAI ? 'text-purple-400/60' : 'text-red-400/60'}`}>{duel.token}</div></div>
            <div className="bg-blue-400/10 border border-blue-400/20 rounded-lg px-1.5 py-1 text-center" style={{minWidth:'50px'}}><div className="text-[6px] tracking-widest uppercase text-blue-400/50 mb-1">观众池</div><div className="text-[10px] font-bold leading-none text-blue-400">{(duel as any)._audiencePool !== undefined ? Number((duel as any)._audiencePool).toFixed(3) : ((duel.challenger.amount + (duel.defender?.amount ?? duel.challenger.amount)) * (1 + duel.watchers * 0.003)).toFixed(2)}</div><div className="text-[7px] font-semibold mt-0.5 text-blue-400/60">{duel.token}</div></div>
          </div>
          <div className="w-px h-2 bg-white/10" />
        </div>
        <div className="flex items-center gap-2 flex-row-reverse">
          {isAI ? (<div className="w-12 h-12 rounded-xl bg-purple-400/15 border-2 border-purple-400/50 flex items-center justify-center flex-shrink-0 text-xl">⚖️</div>)
          : duel.defender ? (<div className="relative flex-shrink-0"><div className={`w-12 h-12 rounded-xl overflow-hidden relative border-2 ${duel.status === 'ending' ? 'border-orange-400' : 'border-blue-400'}`}><div className="absolute inset-0" style={{ background: duel.defender.color }} /><img src={WARRIOR_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-top" /><div className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-green-400 border border-[#0c0c1a]" /></div>{(() => { const chain = CHAINS.find(c => duel.network.includes(c.name)); return chain ? <img src={chain.logo} alt="" className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0c0c1a]" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} /> : null; })()}</div>)
          : (<div className="w-12 h-12 rounded-xl border border-dashed border-white/10 flex items-center justify-center flex-shrink-0"><span className="text-white/20 text-lg">?</span></div>)}
          <div className="flex flex-col gap-0.5 min-w-0 text-right">
            {isAI ? (<><div className="text-[11px] font-semibold text-purple-400">AI Judge</div><div className="text-[8px] text-white/25 truncate">{ac.treasury}</div><div className="flex items-center gap-1.5 mt-0.5 justify-end"><span className="text-[8px] font-semibold px-1.5 py-0.5 rounded border text-purple-400/70 border-purple-400/20 bg-purple-400/8">{duel.token}</span><span className="text-[17px] font-bold text-purple-400 leading-none">{duel.challenger.amount}</span></div></>)
            : duel.defender ? (<><div className="text-[11px] font-semibold text-white/85 truncate">{duel.defender.name}</div><div className="text-[8px] text-white/25 font-mono truncate">{duel.defender.addr}</div><div className="flex items-center gap-1.5 mt-0.5 justify-end"><span className="text-[8px] font-semibold px-1.5 py-0.5 rounded border text-blue-400/70 border-blue-400/20 bg-blue-400/8">ETH</span><span className="text-[17px] font-bold text-blue-400 leading-none">{duel.defender.amount}</span></div></>)
            : (<><div className="text-[11px] font-semibold text-white/25">{t.card.openSlot}</div><div className="text-[8px] text-white/15">{t.card.awaiting}</div><div className="flex items-center gap-1.5 mt-0.5 justify-end"><span className="text-[17px] font-bold text-white/20 leading-none">???</span></div></>)}
          </div>
        </div>
      </div>
      <div className="px-3 pb-2"><div className="h-1 bg-white/5 rounded-full overflow-hidden flex"><div className="bg-red-400/65 rounded-l-full transition-all duration-1000" style={{ width: `${duel.supportRed}%` }} /><div className={`rounded-r-full flex-1 ${isAI ? 'bg-purple-400/65' : 'bg-blue-400/65'}`} /></div><div className="flex justify-between mt-1"><span className="text-[8px] font-semibold text-red-400/75">{duel.supportRed}%</span><span className="text-[7px] tracking-widest uppercase text-white/15">社区投票</span><span className={`text-[8px] font-semibold ${isAI ? 'text-purple-400/75' : 'text-blue-400/75'}`}>{100 - duel.supportRed}%</span></div></div>
      <div className="px-3 pb-1.5"><p className="text-[11px] font-medium text-white/65 leading-snug line-clamp-2">{(duel as any)._claimText || d.claim}</p></div>
      <div className="px-3 pb-2 flex items-center gap-1.5"><span className="text-[7px] tracking-widest uppercase text-white/15">裁定</span><span className="text-[9px] text-blue-400/50 truncate">{(() => { const rt = (duel as any)._ruleText || d.rulingStd; return rt.length > 40 ? rt.slice(0, 40) + '...' : rt; })()}</span></div>
      <div className="mx-3 border-t border-white/5" style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr' }}>
        <div className="py-2 text-center"><div className="text-[6px] tracking-widest uppercase text-white/20 mb-0.5">{isAI ? ac.reward : t.card.watching}</div><div className={`text-[10px] font-bold ${isAI ? 'text-purple-400' : duel.watchers > 100 ? 'text-orange-400' : 'text-white/40'}`}>{isAI ? '$VRD' : `${duel.watchers > 100 ? '🔥 ' : ''}${duel.watchers}`}</div></div>
        <div className="bg-white/5" />
        <div className="py-2 text-center"><div className="text-[6px] tracking-widest uppercase text-white/20 mb-0.5">{t.card.expires}</div><div className={`text-[10px] font-bold ${duel.status === 'ending' ? 'text-orange-400' : 'text-white/40'}`}>{duel.expires}</div></div>
        <div className="bg-white/5" />
        <div className="py-2 text-center"><div className="text-[6px] tracking-widest uppercase text-white/20 mb-0.5">参与人数</div><div className="text-[10px] font-bold text-white/40">{Math.floor(duel.watchers * 0.3)}</div></div>
      </div>
      <div className="px-3 py-2 flex items-center gap-1.5">
        <div className="flex">{['#6a1a3a','#1a3a6a','#1a6a3a','#6a5a1a'].map((c,i) => (<div key={i} className="w-4 h-4 rounded-full overflow-hidden border border-[#0c0c1a] -ml-1 first:ml-0 relative"><div className="absolute inset-0" style={{ background: c }} /><img src={WARRIOR_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-top" /></div>))}</div>
        <span className="text-[8px] text-white/25">+{duel.watchers} {t.card.watching}</span>
        <div className="ml-auto flex items-center gap-1">{(() => { const chain = CHAINS.find(c => duel.network.includes(c.name)); return chain ? <img src={chain.logo} alt="" className="w-3.5 h-3.5 rounded-full" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} /> : null; })()}<span className="text-[8px] text-white/25">{duel.network}</span></div>
      </div>
      <div className="px-3 pb-3 flex flex-col gap-1.5 mt-auto border-t border-white/5 pt-2">
        <button onClick={e => { e.stopPropagation(); onEnter(); }} className={`w-full py-2.5 rounded-lg text-[10px] font-semibold border transition-colors ${isAI ? 'text-purple-400 border-purple-400/40 bg-purple-400/10 hover:bg-purple-400/20' : 'text-red-400 border-red-400/40 bg-red-400/10 hover:bg-red-400/20'}`}>{t.card.enterDuel}</button>
        <button onClick={e => e.stopPropagation()} className="py-1.5 rounded-lg text-[8px] text-white/25 border border-dashed border-white/10 hover:border-white/20 transition-colors">{t.card.share}</button>
      </div>
      <div className="bg-[#080812] border-t border-white/5 px-3 py-1.5 flex justify-between items-center"><span className="text-[6px] tracking-widest uppercase text-white/20">{t.card.expiresIn}</span><span className={`text-[8px] font-mono ${isAI ? 'text-purple-400/50' : duel.status === 'ending' ? 'text-orange-400/70' : 'text-red-400/50'}`}>{timer}</span></div>
    </div>
  );
}

// ─── DuelDetailModal — 五种视角统一入口 ─────────────────────────────────────
function DuelDetailModal({ duel, t, onClose, onChainDuel }: { duel: Duel; t: typeof LANG['en']; onClose: () => void; onChainDuel?: OnChainDuel }) {
  const { address } = useAccount();
  const claimText = (duel as any)._claimText || (onChainDuel ? `#${onChainDuel.id} — on-chain duel` : duel.id);
  const ruleText = (duel as any)._ruleText || '';
  const token = duel.token;
  const wager = onChainDuel ? fmtEther(onChainDuel.wager) : String(duel.challenger.amount);
  const isMock = onChainDuel?.id === 42;

  const { openConnectModal } = useConnectModal();
  const { switchChain } = useSwitchChain();
  const currentChainId = useChainId();
  // 根据duel的network判断目标链
  const targetChainId = duel.network?.includes('Mantle') ? 5003 : 97; // BNB Testnet or Mantle Sepolia
  const isWrongNetwork = !!address && currentChainId !== targetChainId;
  const myAddr = ((address || (typeof window !== 'undefined' ? (window as any).ethereum?.selectedAddress : '') || '')).toLowerCase();
  const isMyRed = !!(myAddr && onChainDuel && onChainDuel.red.toLowerCase() === myAddr);
  const isMyBlue = !!(myAddr && onChainDuel && onChainDuel.blue.toLowerCase() === myAddr);
  const isParticipant = isMyRed || isMyBlue;
  const isOpen = onChainDuel?.status === DuelStatus.Open;
  const isActive = onChainDuel?.status === DuelStatus.Active;
  const isSettled = onChainDuel?.status === DuelStatus.Settled;
  const iWon = isSettled && onChainDuel && address && (
    (onChainDuel.winner === 1 && isMyRed) || (onChainDuel.winner === 2 && isMyBlue)
  );

  const { accept, isPending: acceptPending, isConfirming: acceptConfirming, isSuccess: acceptSuccess } = useAccept();
  const { placeBet, isPending: betPending, isConfirming: betConfirming, isSuccess: betSuccess } = useBet();
  const { claim, isPending: claimPending, isConfirming: claimConfirming, isSuccess: claimSuccess } = useClaim();
  const { cancel, isPending: cancelPending, isSuccess: cancelSuccess } = useCancel();
  const { dispute, isPending: disputePending, isSuccess: disputeSuccess } = useDispute();
  const JUDGE_ADDRESS = '0xB0088d6Eb46c3C15D878b54900ce1d5AEad54bD7';
  const isJudge = myAddr === JUDGE_ADDRESS.toLowerCase();
  const { settle, isPending: settlePending, isSuccess: settleSuccess } = useSettle();
  useEffect(() => { if (acceptSuccess || betSuccess || claimSuccess || cancelSuccess || settleSuccess) setTimeout(onClose, 1500); }, [acceptSuccess, betSuccess, claimSuccess, cancelSuccess, settleSuccess, onClose]);

  const [selectedSide, setSelectedSide] = useState<1|2|null>(null);
  const [betStake, setBetStake] = useState('');
  const betStakeNum = parseFloat(betStake) || 0;
  const totalPot = duel.challenger.amount + (duel.defender?.amount ?? duel.challenger.amount);
  const supportPool = selectedSide === 1 ? totalPot*(duel.supportRed/100)+betStakeNum : totalPot*((100-duel.supportRed)/100)+betStakeNum;
  const odds = betStakeNum > 0 ? ((totalPot+betStakeNum)/supportPool).toFixed(2) : '—';
  const payout = betStakeNum > 0 ? ((totalPot+betStakeNum)/supportPool*betStakeNum).toFixed(3) : '—';

  const S = { // inline styles shortcuts
    overlay: {position:'fixed' as const,inset:0,background:'rgba(0,0,0,0.8)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'},
    modal: {background:'#0c0c1a',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'16px',width:'100%',maxWidth:'440px',overflow:'hidden'},
    head: {background:'#10101e',borderBottom:'1px solid rgba(255,255,255,0.05)',padding:'11px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'},
    body: {padding:'14px',display:'flex',flexDirection:'column' as const,gap:'10px',maxHeight:'76vh',overflowY:'auto' as const},
    foot: {padding:'0 14px 14px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'},
    label: {fontSize:'9px',letterSpacing:'0.08em',textTransform:'uppercase' as const,color:'rgba(255,255,255,0.25)',marginBottom:'4px'},
    claimBox: {background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'10px',padding:'10px 12px',fontSize:'12px',color:'rgba(255,255,255,0.85)',lineHeight:1.5},
    ruleBox: {background:'rgba(107,159,255,0.05)',border:'1px solid rgba(107,159,255,0.2)',borderRadius:'10px',padding:'8px 12px',fontSize:'11px',color:'rgba(107,159,255,0.8)',lineHeight:1.5},
    sideRed: {background:'rgba(255,107,107,0.05)',border:'1px solid rgba(255,107,107,0.2)',borderRadius:'10px',padding:'8px 10px'},
    sideBlue: {background:'rgba(107,159,255,0.05)',border:'1px solid rgba(107,159,255,0.2)',borderRadius:'10px',padding:'8px 10px',textAlign:'right' as const},
    sideDash: {background:'rgba(255,255,255,0.03)',border:'1px dashed rgba(255,255,255,0.12)',borderRadius:'10px',padding:'8px 10px',textAlign:'center' as const},
    aiBox: {background:'rgba(168,107,255,0.05)',border:'1px solid rgba(168,107,255,0.15)',borderRadius:'10px',padding:'8px 12px',display:'flex',alignItems:'flex-start',gap:'8px'},
    statRow: {display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'6px'},
    statBox: {background:'rgba(255,255,255,0.04)',borderRadius:'8px',padding:'6px 8px',textAlign:'center' as const},
    divider: {height:'0.5px',background:'rgba(255,255,255,0.07)'},
    phaseBox: {background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'10px',padding:'8px 12px'},
    resultWin: {background:'rgba(74,222,128,0.06)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:'10px',padding:'10px 12px',display:'flex',alignItems:'center',gap:'10px'},
    resultLose: {background:'rgba(255,107,107,0.06)',border:'1px solid rgba(255,107,107,0.2)',borderRadius:'10px',padding:'10px 12px',display:'flex',alignItems:'center',gap:'10px'},
    disputeNote: {background:'rgba(250,199,117,0.08)',border:'1px solid rgba(250,199,117,0.25)',borderRadius:'10px',padding:'7px 10px',fontSize:'10px',color:'rgba(250,199,117,0.8)',lineHeight:1.5},
  };

  const Pill = ({ label, color }: { label: string; color: string }) => (
    <span style={{fontSize:'9px',padding:'2px 7px',borderRadius:'20px',fontWeight:500,border:`1px solid ${color}40`,color,background:`${color}10`}}>{label}</span>
  );

  const statusLabel = isOpen ? t.tags.open : isActive ? t.tags.live : isSettled ? t.tags.settled : t.tags.open;
  const statusColor = isOpen ? '#6b9fff' : isActive ? '#4ade80' : '#888780';

  const SideCard = ({ side }: { side: 'red'|'blue' }) => {
    const isRed = side === 'red';
    const name = isRed ? duel.challenger.name : (duel.defender?.name ?? '???');
    const amt = isRed ? duel.challenger.amount : (duel.defender?.amount ?? duel.challenger.amount);
    const isMe = (isRed && isMyRed) || (!isRed && isMyBlue);
    const c = isRed ? '#ff6b6b' : '#6b9fff';
    return (
      <div style={isRed ? S.sideRed : S.sideBlue}>
        <div style={{display:'flex',alignItems:'center',gap:'4px',justifyContent: isRed ? 'flex-start' : 'flex-end',marginBottom:'2px'}}>
          <span style={{fontSize:'11px',fontWeight:500,color:c}}>{isRed ? '👑' : '⚔️'} {name}</span>
          {isMe && <span style={{fontSize:'9px',padding:'1px 5px',borderRadius:'20px',background:`${c}15`,color:c,border:`1px solid ${c}30`}}>나</span>}
        </div>
        <div style={{fontSize:'9px',color:`${c}60`,marginBottom:'3px'}}>{isRed ? '발기인' : '수락인'}</div>
        <div style={{fontSize:'13px',fontWeight:500,color:c}}>{amt} <span style={{fontSize:'9px',color:'rgba(255,255,255,0.3)'}}>{token}</span></div>
      </div>
    );
  };

  const StatBox = ({ label, val, color }: { label: string; val: string; color?: string }) => (
    <div style={S.statBox}>
      <div style={{fontSize:'8px',letterSpacing:'0.06em',textTransform:'uppercase',color:'rgba(255,255,255,0.25)',marginBottom:'3px'}}>{label}</div>
      <div style={{fontSize:'12px',fontWeight:500,color:color||'rgba(255,255,255,0.8)'}}>{val}</div>
    </div>
  );

  const Btn = ({ label, color, bg, border, onClick, disabled }: { label:string; color:string; bg:string; border:string; onClick?:()=>void; disabled?:boolean }) => (
    <button onClick={onClick} disabled={disabled} style={{padding:'9px',borderRadius:'10px',fontSize:'12px',fontWeight:500,color,border:`1px solid ${border}`,background:bg,cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.5:1}}>{label}</button>
  );

  const BaseInfo = () => (
    <>
      <div><div style={S.label}>{t.detail.claimLabel}</div><div style={S.claimBox}>{claimText}</div></div>
      {ruleText && <div><div style={S.label}>{t.detail.rulingLabel}</div><div style={S.ruleBox}>{ruleText}</div></div>}
    </>
  );

  const VsRow = () => (
    <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:'8px',alignItems:'center'}}>
      <SideCard side="red" />
      <div style={{fontSize:'10px',color:'rgba(255,255,255,0.2)',textAlign:'center'}}>VS</div>
      {duel.defender ? <SideCard side="blue" /> :
        <div style={S.sideDash}><div style={{fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>等待应战</div><div style={{fontSize:'20px',color:'rgba(255,255,255,0.2)',lineHeight:1.2}}>?</div></div>
      }
    </div>
  );

  const SupportBar = () => (
    <div>
      <div style={{height:'4px',background:'rgba(255,255,255,0.05)',borderRadius:'2px',overflow:'hidden',display:'flex'}}>
        <div style={{background:'rgba(255,107,107,0.8)',width:`${duel.supportRed}%`,transition:'width 0.5s'}} />
        <div style={{background:'rgba(107,159,255,0.8)',flex:1}} />
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:'3px'}}>
        <span style={{fontSize:'10px',fontWeight:500,color:'rgba(255,107,107,0.8)'}}>{duel.supportRed}%</span>
        <span style={{fontSize:'9px',color:'rgba(255,255,255,0.2)'}}>社区支持率</span>
        <span style={{fontSize:'10px',fontWeight:500,color:'rgba(107,159,255,0.8)'}}>{100-duel.supportRed}%</span>
      </div>
    </div>
  );

  // ── 视角1：招募中，旁观者/接受方 ──
  const ViewOpenOutsider = () => (
    <>
      <BaseInfo />
      <VsRow />
      <div style={S.aiBox}><span style={{fontSize:'16px',flexShrink:0}}>⚖️</span><p style={{fontSize:'10px',color:'rgba(168,107,255,0.8)',lineHeight:1.5,margin:0}}>{t.detail.judgeNote}</p></div>
      <div style={S.statRow}>
        <StatBox label="到期" val={duel.expires} color="rgba(250,199,117,0.9)" />
        <StatBox label="需押注" val={`${wager} ${token}`} />
        <StatBox label="网络" val={duel.network} />
      </div>
      <div style={S.divider} />
      <div style={S.foot}>
        <Btn label="取消" color="rgba(255,255,255,0.4)" bg="transparent" border="rgba(255,255,255,0.15)" onClick={onClose} />
        <Btn
          label={!address ? '🔗 连接钱包后参与' : isWrongNetwork ? '⚠️ 切换到 BNB Testnet' : acceptSuccess ? '✓ 已接受!' : acceptConfirming ? '确认中...' : acceptPending ? '等待签名...' : '⚔️ 接受挑战'}
          color={isWrongNetwork ? 'rgba(250,199,117,0.9)' : '#ff6b6b'} bg={isWrongNetwork ? 'rgba(250,199,117,0.06)' : 'rgba(255,107,107,0.1)'} border={isWrongNetwork ? 'rgba(250,199,117,0.4)' : 'rgba(255,107,107,0.4)'}
          onClick={async () => {
            const chainDuelId = onChainDuel?.id ?? (duel as any)._onChainId;
            const wagerBigInt = onChainDuel?.wager ?? (duel as any)._wager;
            if (!chainDuelId) return;
            // 优先用 window.ethereum 直接调用，绕过wagmi状态问题
            if ((window as any).ethereum) {
              try {
                const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
                if (!accounts || accounts.length === 0) { openConnectModal?.(); return; }
                const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
                if (parseInt(chainId, 16) !== targetChainId) {
                  await (window as any).ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x' + targetChainId.toString(16) }] });
                }
                const idHex = chainDuelId.toString(16).padStart(64, '0');
                const data = '0x19b05f49' + idHex;
                const wagerHex = '0x' + (wagerBigInt ?? BigInt(Math.round(parseFloat(wager) * 1e18))).toString(16);
                await (window as any).ethereum.request({
                  method: 'eth_sendTransaction',
                  params: [{ from: accounts[0], to: '0xa0A997cF05F7Baf21becEA4130209fD7C7D1A994', value: wagerHex, data }]
                });
              } catch(e: any) { console.error('accept error:', e); }
            } else if (onChainDuel) {
              accept(onChainDuel.id, wager);
            } else {
              openConnectModal?.();
            }
          }}
          disabled={acceptPending || acceptConfirming}
        />
      </div>
    </>
  );

  // ── 视角2：招募中，发起方 ──
  const ViewOpenIssuer = () => (
    <>
      <BaseInfo />
      <VsRow />
      <div style={S.statRow}>
        <StatBox label="到期" val={duel.expires} color="rgba(250,199,117,0.9)" />
        <StatBox label="押注" val={`${wager} ${token}`} />
        <StatBox label="网络" val={duel.network} />
      </div>
      <div style={S.divider} />
      <div style={S.foot}>
        <Btn label={cancelPending ? '等待签名...' : cancelSuccess ? '✓ 已取消' : '取消对决'} color="rgba(255,107,107,0.6)" bg="rgba(255,107,107,0.06)" border="rgba(255,107,107,0.2)" onClick={() => onChainDuel && cancel(onChainDuel.id)} disabled={cancelPending} />
        <Btn label="复制分享链接" color="rgba(255,255,255,0.5)" bg="rgba(255,255,255,0.05)" border="rgba(255,255,255,0.15)"
          onClick={() => {
            const url = `${window.location.origin}${window.location.pathname}?duel=${onChainDuel?.id}`;
            navigator.clipboard?.writeText(url);
            alert(`链接已复制：${url}`);
          }} />
      </div>
    </>
  );

  // ── 视角3：进行中，参与方（红方或蓝方）──
  const ViewActiveParticipant = () => (
    <>
      <BaseInfo />
      <VsRow />
      <SupportBar />
      <div style={S.statRow}>
        <StatBox label="剩余" val={duel.expires} color="rgba(250,199,117,0.9)" />
        <StatBox label="观众池" val={`${(duel as any)._audiencePool?.toFixed(3) ?? '0.000'} ${token}`} />
        <StatBox label="观战" val={String(duel.watchers)} />
      </div>
      <div style={S.phaseBox}>
        <div style={{fontSize:'11px',fontWeight:500,color:'rgba(255,255,255,0.7)',marginBottom:'3px'}}>⏳ 对决进行中 — 到期后可操作</div>
        <div style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',lineHeight:1.5}}>到期后可提交证据申请裁定，或与对方达成共识直接结算。</div>
      </div>
      {isJudge && <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
        <Btn label={settlePending ? '裁定中...' : '⚖️ 裁红方胜'} color="rgba(255,107,107,0.9)" bg="rgba(255,107,107,0.06)" border="rgba(255,107,107,0.3)" onClick={() => onChainDuel && settle(onChainDuel.id, 1)} disabled={settlePending} />
        <Btn label={settlePending ? '裁定中...' : '⚖️ 裁蓝方胜'} color="rgba(107,159,255,0.9)" bg="rgba(107,159,255,0.06)" border="rgba(107,159,255,0.3)" onClick={() => onChainDuel && settle(onChainDuel.id, 2)} disabled={settlePending} />
      </div>}
      <div style={S.divider} />
      <div style={{padding:'0 14px 14px',display:'flex',flexDirection:'column',gap:'6px'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'6px'}}>
          <Btn label="共识结算" color="rgba(74,222,128,0.9)" bg="rgba(74,222,128,0.06)" border="rgba(74,222,128,0.3)" disabled={true} />
          <Btn label="提交证据" color="rgba(107,159,255,0.9)" bg="rgba(107,159,255,0.06)" border="rgba(107,159,255,0.3)" disabled={true} />
          <Btn label="申请裁定" color="rgba(250,199,117,0.9)" bg="rgba(250,199,117,0.06)" border="rgba(250,199,117,0.3)" disabled={true} />
        </div>
        <Btn label="复制分享链接" color="rgba(255,255,255,0.5)" bg="rgba(255,255,255,0.05)" border="rgba(255,255,255,0.15)"
          onClick={() => {
            const url = `${window.location.origin}${window.location.pathname}?duel=${onChainDuel?.id}`;
            navigator.clipboard?.writeText(url);
            alert('链接已复制！');
          }} />
      </div>
    </>
  );

  // ── 视角4：进行中，观众押注 ──
  const ViewActiveAudience = () => (
    <>
      <BaseInfo />
      <VsRow />
      <SupportBar />
      <div style={S.statRow}>
        <StatBox label="剩余" val={duel.expires} color="rgba(250,199,117,0.9)" />
        <StatBox label="观众池" val={`${(duel as any)._audiencePool?.toFixed(3) ?? '0.000'} ${token}`} />
        <StatBox label="观战" val={String(duel.watchers)} />
      </div>
      <div style={S.divider} />
      <div style={{fontSize:'9px',letterSpacing:'0.08em',textTransform:'uppercase' as const,color:'rgba(255,255,255,0.25)',marginBottom:'6px'}}>选择支持方</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
        {([1,2] as const).map(side => {
          const isRed = side === 1;
          const c = isRed ? '#ff6b6b' : '#6b9fff';
          const pct = isRed ? duel.supportRed : 100-duel.supportRed;
          const name = isRed ? duel.challenger.name : (duel.defender?.name ?? '???');
          return (
            <div key={side} onClick={()=>setSelectedSide(side)} style={{padding:'9px',borderRadius:'10px',cursor:'pointer',textAlign:'center',border:`1px solid ${selectedSide===side ? c+'80' : c+'25'}`,background:selectedSide===side ? `${c}12` : `${c}05`,transition:'all 0.15s'}}>
              <div style={{fontSize:'11px',fontWeight:500,color:c,marginBottom:'2px'}}>{isRed?'👑':'⚔️'} {name}</div>
              <div style={{fontSize:'10px',color:`${c}60`}}>{pct}% 支持</div>
            </div>
          );
        })}
      </div>
      <div style={{display:'flex',gap:'8px'}}>
        <input type="number" min="0" step="0.001" value={betStake} onChange={e=>setBetStake(e.target.value)} placeholder="0.00"
          style={{flex:1,background:'#10101e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'9px 12px',fontSize:'13px',color:'rgba(255,255,255,0.8)',outline:'none'}} />
        <div style={{padding:'9px 12px',borderRadius:'10px',fontSize:'12px',fontWeight:600,color:'#ff6b6b',border:'1px solid rgba(255,107,107,0.3)',background:'rgba(255,107,107,0.08)',display:'flex',alignItems:'center'}}>{token}</div>
      </div>
      {betStakeNum > 0 && (
        <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'10px',padding:'9px 12px',display:'grid',gridTemplateColumns:'1fr 1px 1fr',gap:'10px',alignItems:'center'}}>
          <div style={{textAlign:'center'}}><div style={{fontSize:'8px',color:'rgba(255,255,255,0.25)',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:'3px'}}>预计赔率</div><div style={{fontSize:'14px',fontWeight:500,color:'rgba(255,255,255,0.7)'}}>{odds}x</div></div>
          <div style={{background:'rgba(255,255,255,0.08)',height:'24px'}} />
          <div style={{textAlign:'center'}}><div style={{fontSize:'8px',color:'rgba(255,255,255,0.25)',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:'3px'}}>赢了可得</div><div style={{fontSize:'14px',fontWeight:500,color:'#ff6b6b'}}>{payout} {token}</div></div>
        </div>
      )}
      <div style={S.foot}>
        <Btn label="取消" color="rgba(255,255,255,0.4)" bg="transparent" border="rgba(255,255,255,0.15)" onClick={onClose} />
        <Btn
          label={!address && !isMock ? '🔗 连接钱包后参与' : isWrongNetwork && !isMock ? '⚠️ 切换到 BNB Testnet' : isMock ? '🎮 演示模式' : betSuccess ? '✓ 押注成功!' : betConfirming ? '确认中...' : betPending ? '等待签名...' : '🔒 确认押注'}
          color={isWrongNetwork && !isMock ? 'rgba(250,199,117,0.9)' : '#6b9fff'} bg={isWrongNetwork && !isMock ? 'rgba(250,199,117,0.06)' : 'rgba(107,159,255,0.1)'} border={isWrongNetwork && !isMock ? 'rgba(250,199,117,0.4)' : 'rgba(107,159,255,0.4)'}
          onClick={() => { if(!address && !isMock){ openConnectModal?.(); return; } if(isWrongNetwork && !isMock){ switchChain({ chainId: targetChainId }); return; } if(!isMock && selectedSide && betStakeNum && onChainDuel) placeBet(onChainDuel.id, selectedSide, betStake); }}
          disabled={isMock || betPending || betConfirming || (!!address && !isWrongNetwork && (!selectedSide || !betStakeNum))}
        />
      </div>
    </>
  );

  // ── 视角5：已结算 ──
  const ViewSettled = () => (
    <>
      {iWon !== undefined && (
        <div style={iWon ? S.resultWin : S.resultLose}>
          <span style={{fontSize:'20px',flexShrink:0}}>{iWon ? '🏆' : '😔'}</span>
          <div>
            <div style={{fontSize:'12px',fontWeight:500,color:iWon ? '#4ade80' : '#ff6b6b'}}>{iWon ? '你赢了这场对决' : '你输了这场对决'}</div>
            {iWon && <div style={{fontSize:'10px',color:'rgba(255,255,255,0.4)',marginTop:'2px'}}>可领取：{parseFloat(wager)*2} {token}</div>}
          </div>
        </div>
      )}
      <BaseInfo />
      <VsRow />
      <div style={S.statRow}>
        <StatBox label="结算时间" val="已结算" />
        <StatBox label="总奖池" val={`${parseFloat(wager)*2} ${token}`} />
        <StatBox label="网络" val={duel.network} />
      </div>
      <div style={S.disputeNote}>⚠️ 质疑窗口期内（48h），任何人可对裁定结果提起质疑，需支付 5% 保证金。</div>
      {isJudge && <div style={{padding:'0 0 8px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
        <Btn label={settlePending ? '裁定中...' : '⚖️ 裁红方胜'} color="rgba(255,107,107,0.9)" bg="rgba(255,107,107,0.06)" border="rgba(255,107,107,0.3)" onClick={() => onChainDuel && settle(onChainDuel.id, 1)} disabled={settlePending} />
        <Btn label={settlePending ? '裁定中...' : '⚖️ 裁蓝方胜'} color="rgba(107,159,255,0.9)" bg="rgba(107,159,255,0.06)" border="rgba(107,159,255,0.3)" onClick={() => onChainDuel && settle(onChainDuel.id, 2)} disabled={settlePending} />
      </div>}
      <div style={S.foot}>
        <Btn label={disputePending ? '等待签名...' : disputeSuccess ? '✓ 质疑已提交' : '🚨 提起质疑'} color="rgba(250,199,117,0.9)" bg="rgba(250,199,117,0.06)" border="rgba(250,199,117,0.3)"
          onClick={() => onChainDuel && dispute(onChainDuel.id, fmtEther(onChainDuel.wager * 5n / 100n))}
          disabled={disputePending || !isParticipant} />
        <Btn
          label={claimSuccess ? '✓ 已领取!' : claimConfirming ? '确认中...' : claimPending ? '等待签名...' : '💰 领取奖励'}
          color="#4ade80" bg="rgba(74,222,128,0.08)" border="rgba(74,222,128,0.3)"
          onClick={() => onChainDuel && claim(onChainDuel.id)}
          disabled={!iWon || claimPending || claimConfirming}
        />
      </div>
    </>
  );

  // 决定渲染哪个视角
  const renderBody = () => {
    if (isSettled) return <ViewSettled />;
    if (isActive && isParticipant) return <ViewActiveParticipant />;
    if (isActive && !isParticipant) return <ViewActiveAudience />;
    if (isOpen && isMyRed) return <ViewOpenIssuer />;
    if (isOpen && !isParticipant) return <ViewOpenOutsider />;
    // 无链上数据（模拟卡片）→ 观众押注视角
    return <ViewActiveAudience />;
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e=>e.stopPropagation()}>
        <div style={S.head}>
          <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
            <span className={`text-[8px] tracking-widest uppercase px-1.5 py-0.5 rounded border ${typeStyle[duel.type]}`}>{t.tags[duel.type]}</span>
            <Pill label={statusLabel} color={statusColor} />
            {isParticipant && <Pill label={isMyRed ? '红方' : '蓝方'} color={isMyRed ? '#ff6b6b' : '#6b9fff'} />}
          </div>
          <button onClick={onClose} style={{color:'rgba(255,255,255,0.3)',fontSize:'20px',lineHeight:1,background:'none',border:'none',cursor:'pointer'}}>×</button>
        </div>
        <div style={S.body}>{renderBody()}</div>
      </div>
    </div>
  );
}

function DuelModal({ duel, t, onClose, onChainDuel }: { duel: Duel; t: typeof LANG['en']; onClose: () => void; onChainDuel?: OnChainDuel }) {
  return <DuelDetailModal duel={duel} t={t} onClose={onClose} onChainDuel={onChainDuel} />;
}


// ─── MY DUELS PAGE ────────────────────────────────────────────────────────────
// ─── MY DUEL CARD (grid版) ────────────────────────────────────────────────────
function MyDuelCard({ record, t, onClaim, claimingId, fullWidth = false, onViewDuel }: {
  record: MyDuelRecord; t: typeof LANG['en']; onClaim: (id: string) => void; onViewDuel?: () => void;
  claimingId: string | null; fullWidth?: boolean;
}) {
  const m = t.myDuels;
  const isClaiming = claimingId === record.id;
  const isWon = record.result === 'won';
  const isLost = record.result === 'lost';
  const isClaimable = record.tab === 'claimable';
  const isActive = record.tab === 'active';
  const sideColor = record.side === 'red' ? 'text-red-400' : 'text-blue-400';
  const sideBg = record.side === 'red' ? 'bg-red-400/10 border-red-400/20' : 'bg-blue-400/10 border-blue-400/20';

  const cardBorder = isClaimable ? 'border-yellow-400/30' : isWon ? 'border-green-400/20' : isLost ? 'border-white/8' : 'border-white/10';
  const cardBg = isClaimable ? 'bg-[#0c0c1a]' : 'bg-[#0c0c1a]';

  return (
    <div className={`${cardBg} border ${cardBorder} rounded-xl overflow-hidden transition-all`}>
      {/* TOP STRIP */}
      {isClaimable && (
        <div className="bg-yellow-400/10 border-b border-yellow-400/20 px-3 py-1 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" />
          <span className="text-[8px] font-semibold text-yellow-400 tracking-widest uppercase">Reward Ready · Claim within {record.disputeHoursLeft}h</span>
        </div>
      )}

      <div className={`p-3 ${fullWidth ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-2.5'}`}>
        {/* LEFT / TOP SECTION */}
        <div className="flex flex-col gap-2.5 min-w-0">
          {/* META + CLAIM TEXT */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[7px] tracking-widest uppercase text-white/20 font-mono">#{record.id}</span>
              <span className="text-[7px] text-white/15">·</span>
              {(() => { const chain = CHAINS.find(c => c.name === record.network); return chain ? <img src={chain.logo} alt="" className="w-2.5 h-2.5 rounded-full flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} /> : null; })()}
              <span className="text-[7px] text-white/20">{record.network}</span>
              <div className="ml-auto">
                {record.result ? (
                  <span className={`text-[8px] font-bold px-2 py-0.5 rounded border ${isWon ? 'text-green-400 border-green-400/25 bg-green-400/8' : isLost ? 'text-red-400/60 border-red-400/15 bg-red-400/5' : 'text-white/30 border-white/10'}`}>
                    {m.results[record.result]}
                  </span>
                ) : isActive ? (
                  <span className="text-[8px] font-semibold text-blue-400 border border-blue-400/20 bg-blue-400/8 rounded px-2 py-0.5">⏳ {record.expires}</span>
                ) : null}
              </div>
            </div>
            <p className="text-[11px] font-semibold text-white/80 leading-snug line-clamp-2">{record.claim}</p>
          </div>

          {/* FIGHTERS */}
          <div className="flex items-center gap-2 bg-white/3 rounded-lg p-2 border border-white/5">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <div className="w-6 h-6 rounded-md overflow-hidden relative border border-red-400 flex-shrink-0">
                <div className="absolute inset-0" style={{ background: record.challengerColor }} />
                <img src={WARRIOR_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
              </div>
              <div className="min-w-0">
                <div className="text-[7px] text-white/25">Your side</div>
                <div className={`text-[9px] font-semibold ${record.side === 'red' ? 'text-red-400' : 'text-blue-400'}`}>
                  {record.side === 'red' ? m.sides.red : m.sides.blue}
                </div>
              </div>
            </div>
            <div className="text-center flex-shrink-0">
              <div className="text-[7px] text-white/15">VS</div>
              <div className="text-[9px] font-bold text-white/30">{record.totalPot}<span className="text-[7px] text-white/15 ml-0.5">{record.token}</span></div>
            </div>
            <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-row-reverse">
              <div className="w-6 h-6 rounded-md overflow-hidden relative border border-blue-400 flex-shrink-0">
                <div className="absolute inset-0" style={{ background: record.opponentColor }} />
                <img src={WARRIOR_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
              </div>
              <div className="min-w-0 text-right">
                <div className="text-[7px] text-white/25">Opponent</div>
                <div className="text-[9px] font-semibold text-white/55 truncate">{record.opponentName}</div>
              </div>
            </div>
          </div>

          {/* STATS ROW */}
          <div className="grid grid-cols-3 gap-1.5">
            <div className="bg-white/3 rounded-lg p-2 text-center border border-white/5">
              <div className="text-[6px] tracking-widest uppercase text-white/20 mb-0.5">{m.labels.yourStake}</div>
              <div className="text-[10px] font-bold text-white/65">{record.stake} <span className="text-[7px] text-white/25">{record.token}</span></div>
            </div>
            <div className={`rounded-lg p-2 text-center border ${sideBg}`}>
              <div className="text-[6px] tracking-widest uppercase text-white/20 mb-0.5">{m.labels.side}</div>
              <div className={`text-[10px] font-bold ${sideColor}`}>{record.side === 'red' ? m.sides.red : m.sides.blue}</div>
            </div>
            <div className="bg-white/3 rounded-lg p-2 text-center border border-white/5">
              <div className="text-[6px] tracking-widest uppercase text-white/20 mb-0.5">{m.labels.payout}</div>
              <div className={`text-[10px] font-bold ${isWon || isClaimable ? 'text-green-400' : isLost ? 'text-red-400/40' : 'text-white/30'}`}>
                {isClaimable || isWon ? `${record.payout}` : '—'}
                {(isClaimable || isWon) && <span className="text-[7px] text-white/25 ml-0.5">{record.token}</span>}
              </div>
            </div>
          </div>

          {/* ACTION BUTTON (non-claimable) */}
          {!isClaimable && (
            <button onClick={onViewDuel} className="w-full py-1.5 rounded-lg text-[9px] font-semibold text-white/25 border border-white/8 hover:border-white/18 transition-colors cursor-pointer">
              {m.actions.viewDuel}
            </button>
          )}
        </div>

        {/* RIGHT SECTION (claimable only, visible in both layouts) */}
        {isClaimable && (
          <div className="flex flex-col gap-2.5 min-w-0">
            {/* AI ANALYSIS */}
            {record.aiAnalysis && (
              <div className="bg-purple-400/5 border border-purple-400/15 rounded-lg p-2.5 flex items-start gap-2 flex-1">
                <span className="text-xs flex-shrink-0 mt-0.5">⚖️</span>
                <div>
                  <div className="text-[7px] tracking-widest uppercase text-purple-400/40 mb-1">AI Judge Analysis</div>
                  <p className="text-[9px] text-purple-300/60 leading-relaxed italic">"{record.aiAnalysis}"</p>
                </div>
              </div>
            )}
            {/* DISPUTE WINDOW */}
            {record.disputeHoursLeft !== undefined && (
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[7px] text-white/25">{m.labels.disputeWindow}</span>
                  <span className="text-[7px] text-orange-400">{record.disputeHoursLeft}h remaining</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-400/60 rounded-full" style={{ width: `${(record.disputeHoursLeft / 48) * 100}%` }} />
                </div>
                <div className="text-[7px] text-white/15 mt-1">{m.labels.claimBy}: {record.claimBy}</div>
              </div>
            )}
            {/* CLAIM ACTIONS */}
            <div className="flex gap-1.5 mt-auto">
              <button onClick={() => onClaim(record.id)}
                className={`flex-1 py-2 rounded-lg text-[10px] font-semibold border transition-all ${isClaiming ? 'text-green-400 border-green-400/40 bg-green-400/10 cursor-not-allowed' : 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10 hover:bg-yellow-400/18'}`}>
                {isClaiming ? '✓ Claimed!' : m.actions.claim}
              </button>
              <button className="px-3 py-2 rounded-lg text-[9px] font-semibold text-red-400/50 border border-red-400/15 hover:bg-red-400/8 transition-colors flex-shrink-0">
                {m.actions.dispute}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MY DUELS PAGE (sidebar + grid) ──────────────────────────────────────────
function MyDuelsPage({ t, onGoToArena, onChainDuels, chainId, onViewDuel }: { t: typeof LANG['en']; onGoToArena: () => void; onChainDuels: OnChainDuel[]; chainId: number; onViewDuel: (d: OnChainDuel) => void }) {
  const [activeTab, setActiveTab] = useState<MyDuelTab>('active');
  const { address } = useAccount();
  const { claim, isPending: claimPending, isConfirming: claimConfirming, isSuccess: claimSuccess } = useClaim();
  const m = t.myDuels;
  const token = chainId === 97 ? 'tBNB' : chainId === 5003 ? 'MNT' : 'BNB';
  const now = BigInt(Math.floor(Date.now() / 1000));

  // 按地址过滤当前用户的对决
  const myDuels = address ? onChainDuels.filter(d =>
    d.red.toLowerCase() === address.toLowerCase() ||
    d.blue.toLowerCase() === address.toLowerCase()
  ) : [];

  const activeDuels = myDuels.filter(d => d.status === DuelStatus.Open || d.status === DuelStatus.Active).sort((a,b) => b.id - a.id);
  const claimableDuels = myDuels.filter(d => d.status === DuelStatus.Settled).sort((a,b) => b.id - a.id);
  const historyDuels = myDuels.filter(d => d.status === DuelStatus.Settled || d.status === DuelStatus.Cancelled).sort((a,b) => b.id - a.id);

  const tabCounts = { active: activeDuels.length, claimable: claimableDuels.length, history: historyDuels.length };

  const currentDuels = activeTab === 'active' ? activeDuels : activeTab === 'claimable' ? claimableDuels : historyDuels;

  // 统计数据
  const totalStaked = myDuels.reduce((acc, d) => acc + parseFloat(fmtEther(d.wager)), 0);
  const wonDuels = myDuels.filter(d => d.status === DuelStatus.Settled && (
    (d.winner === 1 && address && d.red.toLowerCase() === address.toLowerCase()) ||
    (d.winner === 2 && address && d.blue.toLowerCase() === address.toLowerCase())
  ));
  const winRate = myDuels.filter(d => d.status === DuelStatus.Settled).length > 0
    ? Math.round(wonDuels.length / myDuels.filter(d => d.status === DuelStatus.Settled).length * 100)
    : 0;

  const handleClaim = (id: number) => { claim(id); };

  const TAB_CONFIG = [
    { key: 'active' as MyDuelTab, icon: '⚔️', activeStyle: 'bg-red-400/15 text-red-400 border-red-400/30', badgeStyle: 'bg-red-400 text-black' },
    { key: 'claimable' as MyDuelTab, icon: '💰', activeStyle: 'bg-yellow-400/15 text-yellow-400 border-yellow-400/30', badgeStyle: 'bg-yellow-400 text-black' },
    { key: 'history' as MyDuelTab, icon: '📜', activeStyle: 'bg-white/8 text-white/70 border-white/15', badgeStyle: 'bg-white/20 text-white' },
  ];

  return (
    <div className="flex" style={{ minHeight: 'calc(100vh - 52px)' }}>
      {/* ── SIDEBAR ── */}
      <div className="w-56 flex-shrink-0 border-r border-white/8 bg-[#09091a] flex flex-col" style={{ minHeight: 'calc(100vh - 52px)' }}>
        {/* WALLET */}
        <div className="px-4 py-4 border-b border-white/8">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl overflow-hidden relative border border-red-400/40 flex-shrink-0">
              <div className="absolute inset-0 bg-red-400/20" />
              <img src={WARRIOR_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-white/70">My Account</div>
              <div className="text-[9px] text-white/25 font-mono">{address ? shortAddr(address) : "—"}</div>
            </div>
          </div>
        </div>

        {/* OVERVIEW STATS */}
        <div className="px-3 py-3 border-b border-white/8">
          <div className="text-[8px] tracking-widest uppercase text-white/20 mb-2 px-1">Overview</div>
          <div className="flex flex-col gap-1.5">
            {[
              { label: 'Total Staked', value: totalStaked > 0 ? `${totalStaked.toFixed(3)} ${token}` : '—', color: 'text-white/60' },
              { label: 'Total Won', value: wonDuels.length > 0 ? `${wonDuels.reduce((a,d)=>a+parseFloat(fmtEther(d.wager*2n)),0).toFixed(3)} ${token}` : '—', color: 'text-green-400' },
              { label: 'Win Rate', value: myDuels.filter(d=>d.status===DuelStatus.Settled).length > 0 ? `${winRate}%` : '—', color: 'text-yellow-400' },
              { label: 'Duels Played', value: String(myDuels.length), color: 'text-white/50' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between px-2.5 py-1.5 bg-[#0c0c1a] rounded-lg border border-white/5">
                <span className="text-[9px] text-white/35">{s.label}</span>
                <span className={`text-[10px] font-semibold ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* TAB NAV */}
        <div className="px-3 py-3 flex-1">
          <div className="text-[8px] tracking-widest uppercase text-white/20 mb-2 px-1">Filter</div>
          <div className="flex flex-col gap-1">
            {TAB_CONFIG.map(({ key, icon, activeStyle }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[11px] font-semibold border transition-all ${activeTab === key ? activeStyle + ' border' : 'text-white/30 border-transparent hover:text-white/55 hover:bg-white/3'}`}>
                <span>{icon} {m.tabs[key]}</span>
                {tabCounts[key] > 0 && (
                  <span className={`text-[8px] rounded-full w-4 h-4 flex items-center justify-center font-bold ${activeTab === key ? TAB_CONFIG.find(c => c.key === key)!.badgeStyle : 'bg-white/10 text-white/35'}`}>
                    {tabCounts[key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* BOTTOM NOTICE */}
        <div className="px-3 pb-4">
          <div className="bg-[#0c0c1a] border border-white/8 rounded-lg p-2.5">
            <div className="text-[8px] text-white/20 leading-relaxed">
              🛡 Dispute window: 48h after settlement. Disputes cost 5% of stake.
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 min-w-0 p-5">
        {/* CONTENT HEADER */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-semibold text-white/80">{m.tabs[activeTab]}</div>
            <div className="text-[10px] text-white/30 mt-0.5">
              {currentDuels.length > 0 ? `${currentDuels.length} duels` : m.emptyDesc[activeTab]}
            </div>
          </div>
          <div className="text-[9px] text-white/20">sorted by expiry</div>
        </div>

        {/* EMPTY STATE */}
        {currentDuels.length === 0 ? (
          <div className="bg-[#0c0c1a] border border-white/8 rounded-2xl p-16 text-center">
            <div className="text-4xl mb-3">{activeTab === 'active' ? '⚔️' : activeTab === 'claimable' ? '💰' : '📜'}</div>
            <div className="text-sm font-semibold text-white/40 mb-2">{m.empty[activeTab]}</div>
            <div className="text-[11px] text-white/20 mb-5">{m.emptyDesc[activeTab]}</div>
            {activeTab === 'active' && (
              <button onClick={onGoToArena} className="text-xs font-semibold text-red-400 border border-red-400/40 bg-red-400/10 rounded-xl px-4 py-2 hover:bg-red-400/20 transition-colors">
                {m.actions.goToArena}
              </button>
            )}
          </div>
        ) : (
          /* CARD GRID */
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {currentDuels.map(d => {
              const myAddr2 = ((address || (typeof window !== 'undefined' ? (window as any).ethereum?.selectedAddress : '') || '')).toLowerCase();
              const isRed = !!(myAddr2 && d.red.toLowerCase() === myAddr2);
              const mySide = isRed ? 'red' : 'blue';
              const opponentAddr = isRed ? d.blue : d.red;
              const claimText = typeof window !== 'undefined' ? localStorage.getItem('claim_' + d.claimHash) || `#${d.id} — on-chain duel` : `#${d.id}`;
              const isClaimable = d.status === DuelStatus.Settled;
              const record = {
                id: String(d.id),
                tab: activeTab,
                claim: claimText,
                side: mySide,
                myStance: isRed ? '👑 红方（发起方）' : '⚔️ 蓝方（接受方）',
                myStanceKey: mySide,
                opponent: shortAddr(opponentAddr),
                opponentAvatar: WARRIOR_IMG,
                vs: parseFloat(fmtEther(d.wager * 2n)).toFixed(3),
                token,
                myStaked: parseFloat(fmtEther(d.wager)).toFixed(3),
                result: isClaimable ? (d.winner === (isRed ? 1 : 2) ? 'win' as const : 'loss' as const) : undefined,
                prize: isClaimable && d.winner === (isRed ? 1 : 2) ? parseFloat(fmtEther(d.wager * 2n)).toFixed(3) : undefined,
                expires: formatDeadline(d.deadline),
                network: chainId === 97 ? 'BNB Testnet' : chainId === 5003 ? 'Mantle Sepolia' : 'Unknown',
                onChainId: d.id,
              };
              return (
                <div key={d.id} style={isClaimable ? { gridColumn: '1 / -1' } : undefined}>
                  <MyDuelCard record={record as any} t={t} onClaim={() => handleClaim(d.id)} claimingId={null} fullWidth={isClaimable} onViewDuel={() => onViewDuel(d)} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
function NavBar({ t, lang, activePage, onPageChange, onLangToggle, onIssueClick }: { t: typeof LANG['en']; lang: Lang; activePage: Page; onPageChange: (p: Page) => void; onLangToggle: () => void; onIssueClick: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const claimableCount = 0; // AppInner에서 props로 전달 예정
  return (
    <div className="bg-[#0c0c1a] border-b border-white/10 px-4 flex items-center" style={{ height: '52px' }}>
      {/* LEFT */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-base font-semibold text-white/90">⚖️ {t.appName}</span>
      </div>
      {/* CENTER NAV */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center bg-[#0a0a18] rounded-xl p-1 border border-white/8 gap-1">
          <button onClick={() => onPageChange('arena')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activePage === 'arena' ? 'bg-red-400/15 text-red-400 border border-red-400/30' : 'text-white/30 hover:text-white/60'}`}>
            ⚔️ {t.nav.arena}
          </button>
          <button onClick={() => onPageChange('myDuels')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${activePage === 'myDuels' ? 'bg-yellow-400/15 text-yellow-400 border border-yellow-400/30' : 'text-white/30 hover:text-white/60'}`}>
            📋 {t.nav.myDuels}
            {claimableCount > 0 && <span className={`text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold ${activePage === 'myDuels' ? 'bg-yellow-400 text-black' : 'bg-yellow-400/60 text-black'}`}>{claimableCount}</span>}
          </button>
        </div>
      </div>
      {/* RIGHT */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={onLangToggle} className="text-xs text-white/40 bg-[#10101e] border border-white/10 rounded-lg px-3 py-1.5 hover:border-white/20 transition-colors">{lang === 'en' ? '中文' : 'EN'}</button>
        <ConnectButton.Custom>
          {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
            const connected = mounted && account && chain;
            if (!connected) return (<button onClick={openConnectModal} className="text-xs font-semibold text-red-400 bg-red-400/10 border border-red-400/40 rounded-lg px-3 py-1.5 hover:bg-red-400/20 transition-colors whitespace-nowrap">{t.connectWallet}</button>);
            return (
              <div className="relative" ref={menuRef}>
                <button onClick={() => setMenuOpen(o => !o)} className="flex items-center gap-2 bg-[#10101e] border border-white/10 rounded-lg px-2.5 py-1.5 hover:border-white/20 transition-colors">
                  <div className="w-5 h-5 rounded-full overflow-hidden relative flex-shrink-0 border border-white/20"><div className="absolute inset-0 bg-red-400/30" /><img src={WARRIOR_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-top" /></div>
                  <span className="text-xs text-white/60">{account.displayName}</span>
                  <span className="text-white/30 text-[10px]">▾</span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-[#10101e] border border-white/10 rounded-xl overflow-hidden z-50 min-w-[160px] shadow-xl">
                    <button onClick={() => { onPageChange('myDuels'); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-white/60 hover:bg-white/5 transition-colors border-b border-white/5">
                      <span>📋</span> {t.nav.myDuels}
                      {claimableCount > 0 && <span className="ml-auto text-[8px] bg-yellow-400 text-black rounded-full w-4 h-4 flex items-center justify-center font-bold">{claimableCount}</span>}
                    </button>
                    <button onClick={() => { onIssueClick(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-white/60 hover:bg-white/5 transition-colors border-b border-white/5"><span>⚔️</span> {t.issueBtn}</button>
                    <button onClick={() => { navigator.clipboard?.writeText(account.address); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-white/60 hover:bg-white/5 transition-colors border-b border-white/5"><span>📋</span> Copy address</button>
                    <button onClick={() => { openAccountModal(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-400/70 hover:bg-red-400/8 transition-colors"><span>⏏</span> Disconnect</button>
                  </div>
                )}
              </div>
            );
          }}
        </ConnectButton.Custom>
      </div>
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
// AppInner 包含所有wagmi hooks，必须在WagmiProvider内部渲染
function AppInner() {
  const [lang, setLang] = useState<Lang>('en');
  const [activePage, setActivePage] = useState<Page>('arena');
  const [activeFilter, setActiveFilter] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedDuel, setSelectedDuel] = useState<Duel | null>(null);
  const [selectedOnChainDuel, setSelectedOnChainDuel] = useState<OnChainDuel | undefined>(undefined);
  const t = LANG[lang];

  // ── 链上数据 ──
  // 从后端API读取链上数据，不依赖钱包网络
  const [onChainDuels, setOnChainDuels] = useState<OnChainDuel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDuels = async (forceSync = false) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/duels${forceSync ? '?sync=1' : ''}`);
      const data = await res.json();
      if (data.duels && data.duels.length > 0) {
        // 转换数据类型
        const duels: OnChainDuel[] = data.duels.map((d: any) => ({
          ...d,
          wager: BigInt(d.wager),
          audioBps: BigInt(d.audioBps),
          deadline: BigInt(d.deadline),
          settledAt: BigInt(d.settledAt),
          poolRed: BigInt(d.poolRed),
          poolBlue: BigInt(d.poolBlue),
          _claimText: d.claimText,
          _ruleText: d.ruleText,
        }));
        setOnChainDuels(duels);
        // 同步到localStorage供Modal使用
        if (typeof window !== 'undefined') {
          duels.forEach(d => {
            if (d._claimText) localStorage.setItem('claim_' + d.claimHash, d._claimText as string);
            if (d._ruleText) localStorage.setItem('rule_' + d.ruleHash, d._ruleText as string);
          });
        }
      }
    } catch (e) {
      console.error('Failed to fetch duels:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = () => fetchDuels(true);

  useEffect(() => { fetchDuels(); }, []);
  const totalCount = onChainDuels.length;

  // 过滤：只展示 Open 和 Active 状态，且未过期
  const now = BigInt(Math.floor(Date.now() / 1000));
  const visibleDuels = onChainDuels.filter(d =>
    (d.status === DuelStatus.Open || d.status === DuelStatus.Active) && d.deadline > now
  );

  // 从API批量拉取对决声明，补充localStorage没有的数据
  useEffect(() => {
    if (onChainDuels.length === 0) return;
    onChainDuels.forEach(d => {
      const localClaim = localStorage.getItem('claim_' + d.claimHash);
      if (!localClaim && d.claimHash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        fetch(`/api/claim?claimHash=${d.claimHash}`)
          .then(r => r.json())
          .then(data => {
            if (data.claimText) {
              localStorage.setItem('claim_' + d.claimHash, data.claimText);
              if (data.ruleText) localStorage.setItem('rule_' + d.ruleHash, data.ruleText);
            }
          }).catch(() => {});
      }
    });
  }, [onChainDuels]);

  // URL参数检测：?duel=id 自动弹出对应对决
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const duelId = params.get('duel');
    if (!duelId || onChainDuels.length === 0) return;
    const target = onChainDuels.find(d => d.id === parseInt(duelId));
    if (target) {
      const mapped = onChainToDuel(target, 0);
      setSelectedDuel(mapped as any);
      setSelectedOnChainDuel(target);
    }
  }, [onChainDuels]);

  // 把链上对决映射成前端 Duel 类型（用于现有卡片组件）
  const chainId = useChainId();
  const networkName = chainId === 97 ? 'BNB Testnet' : chainId === 5003 ? 'Mantle Sepolia' : chainId === 56 ? 'BNB Chain' : 'Unknown';

  function onChainToDuel(d: OnChainDuel, index: number): Duel {
    const isAI = d.vis === 2;
    const isOpen = d.status === DuelStatus.Open;
    const redAmt = parseFloat(fmtEther(d.wager));
    const token = chainId === 97 ? 'tBNB' : chainId === 5003 ? 'MNT' : 'BNB';
    // 用链上claimHash从localStorage读原文
    const storedClaim = typeof window !== 'undefined' ? localStorage.getItem('claim_' + d.claimHash) : null;
    const storedRule = typeof window !== 'undefined' ? localStorage.getItem('rule_' + d.ruleHash) : null;
    const claimText = storedClaim || `#${d.id} — on-chain duel`;
    const ruleText = storedRule || '';
    // 观众池 = poolRed + poolBlue（旁观者下注总额）
    const audiencePoolAmt = parseFloat(fmtEther(d.poolRed + d.poolBlue));
    // 支持率：根据观众池比例计算
    const totalAudience = d.poolRed + d.poolBlue;
    const supportRed = totalAudience > 0n ? Math.round(Number(d.poolRed * 100n / totalAudience)) : 50;
    return {
      id: String(d.id).padStart(4, '0'),
      type: 'personalChallenge' as DuelType,
      rarity: 'common' as Rarity,
      status: isOpen ? 'open' : 'live' as Status,
      challenger: { name: shortAddr(d.red), addr: shortAddr(d.red), color: '#3a1a6a', amount: redAmt },
      defender: isAI ? null : (isOpen ? null : { name: shortAddr(d.blue), addr: shortAddr(d.blue), color: '#1a3a6a', amount: redAmt }),
      supportRed,
      watchers: 0,
      expires: formatDeadline(d.deadline),
      network: networkName,
      token,
      index: Math.min(index, t.duels.length - 1),
      isAIJudge: isAI,
      _claimText: claimText,
      _ruleText: ruleText,
      _audiencePool: audiencePoolAmt,
      _onChainId: d.id,
      _wager: d.wager,
    } as any;
  }

  const handleSelectDuel = (duel: Duel, onChain?: OnChainDuel) => {
    setSelectedDuel(duel);
    setSelectedOnChainDuel(onChain);
  };

  // 统计数据
  const totalPotBigInt = onChainDuels.reduce((acc, d) => acc + d.wager * 2n, 0n);
  const totalPotStr = totalCount > 0 ? `${fmtEther(totalPotBigInt)} BNB` : '—';

  return (
    <div className="min-h-screen bg-[#080812] text-white">
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateX(-50%) translateY(6px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
      <NavBar t={t} lang={lang} activePage={activePage} onPageChange={setActivePage} onLangToggle={() => setLang(l => l === 'en' ? 'zh' : 'en')} onIssueClick={() => setShowModal(true)} />
      {activePage === 'arena' ? (
        <>
          <Ticker t={t} lang={lang} />
          <div className="border-b border-white/5" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
            {[
              { label: t.stats.duels, value: totalCount > 0 ? String(totalCount) : '—' },
              { label: t.stats.pool, value: totalPotStr },
              { label: t.stats.settled, value: onChainDuels.filter(d => d.status === DuelStatus.Settled).length > 0 ? String(onChainDuels.filter(d => d.status === DuelStatus.Settled).length) + ' settled' : '—' },
            ].map((s, i) => (
              <div key={i} className={`py-2.5 text-center ${i < 2 ? 'border-r border-white/5' : ''}`}>
                <div className="text-[8px] tracking-widest uppercase text-white/20 mb-0.5">{s.label}</div>
                <div className="text-base font-bold text-white/75">{s.value}</div>
              </div>
            ))}
          </div>
          <div className="bg-[#0a0a18] border-b border-white/5 px-4 py-2 flex items-center justify-between">
            <div className="flex gap-1.5">
              {t.filters.map((f, i) => (<button key={f} onClick={() => setActiveFilter(i)} className={`text-[10px] px-3 py-1.5 rounded-full border transition-colors ${activeFilter === i ? 'bg-red-400/15 text-red-400 border-red-400/50' : 'bg-[#10101e] text-white/30 border-white/10 hover:border-white/20'}`}>{f}</button>))}
            </div>
            <button onClick={() => setShowModal(true)} className="text-xs font-semibold text-red-300 bg-[#10101e] border border-red-400/70 rounded-xl px-4 py-1.5 hover:bg-red-400/10 transition-colors" style={{ boxShadow: '0 0 10px rgba(255,107,107,0.2)' }}>{t.issueBtn}</button>
          </div>
          <div className="p-4">
            <LiveCard t={t} onEnter={() => {
              const liveDuel = { id: '0042', type: 'kolBattle' as DuelType, rarity: 'legendary' as Rarity, status: 'live' as Status, challenger: { name: '@CryptoKing', addr: '0x3f...a21c', color: '#6a1a1a', amount: 2.0 }, defender: { name: '@BlockWizard', addr: '0x8b...cc44', color: '#1a1a6a', amount: 2.0 }, supportRed: 63, watchers: 875, expires: '44d · 08h', network: 'Mantle', token: 'ETH', index: 0, _claimText: '"Mantle将在6个月内TVL总量超越Arbitrum — 我押2 ETH"', _ruleText: '以到期日00:00 UTC的DeFiLlama TVL数据为准。' };
              const mockOnChain: OnChainDuel = { id: 42, red: '0x3fa21c0000000000000000000000000000000000' as `0x${string}`, blue: '0x8bcc440000000000000000000000000000000000' as `0x${string}`, token: '0x0000000000000000000000000000000000000000' as `0x${string}`, wager: BigInt(2e18), audioBps: 0n, deadline: BigInt(Math.floor(Date.now()/1000) + 44*86400), claimHash: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`, ruleHash: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`, vis: 0, status: DuelStatus.Active, winner: 0, settledAt: 0n, poolRed: BigInt(1.2e18), poolBlue: BigInt(0.8e18) };
              setSelectedDuel(liveDuel);
              setSelectedOnChainDuel(mockOnChain);
            }} />
          </div>
          <div className="px-4 pb-2">
            <div className="text-[9px] tracking-widest uppercase text-white/20 mb-3 flex items-center gap-2">
              All Duels
              {isLoading && <span className="text-white/15">loading...</span>}
              {!isLoading && visibleDuels.length === 0 && totalCount === 0 && (
                <span className="text-white/15">— no active duels</span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {visibleDuels.map((od, i) => {
                const duel = onChainToDuel(od, i);
                return <DuelCard key={od.id} duel={duel} t={t} onClick={() => handleSelectDuel(duel, od)} onEnter={() => handleSelectDuel(duel, od)} />;
              })}
            </div>
          </div>
          <div className="pb-8 pt-4 text-center">
            <button onClick={() => refetch()} className="text-xs text-white/30 bg-[#0c0c1a] border border-white/10 rounded-xl px-6 py-2.5 hover:border-white/20 transition-colors">↻ Refresh</button>
          </div>
        </>
      ) : (
        <MyDuelsPage t={t} onGoToArena={() => setActivePage('arena')} onChainDuels={onChainDuels} chainId={chainId} onViewDuel={(d) => {
          const mapped = onChainToDuel(d, 0);
          setSelectedDuel(mapped as any);
          setSelectedOnChainDuel(d);
        }} />
      )}
      {showModal && <IssueModal t={t} onClose={() => { setShowModal(false); refetch(); }} chainId={chainId} />}
      {selectedDuel && <DuelModal duel={selectedDuel} t={t} onClose={() => {
        setSelectedDuel(null);
        setSelectedOnChainDuel(undefined);
        refetch();
        if (typeof window !== 'undefined' && window.location.search.includes('duel=')) {
          window.history.replaceState({}, '', window.location.pathname);
        }
      }} onChainDuel={selectedOnChainDuel} />}
    </div>
  );
}

function HomeWrapper() {
  return <AppInner />;
}

import dynamic from 'next/dynamic';
export default dynamic(() => Promise.resolve(HomeWrapper), { ssr: false });
