'use client';

import { useState, useEffect, useRef } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

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
    issueBtn: '+ Issue a Duel', loadMore: 'Load more duels', backToArena: '← Back to Arena',
    filters: ['All', 'Hot 🔥', 'Ending soon', 'High stakes'],
    stats: { duels: 'Total Duels', pool: 'Prize Pool Today', settled: 'Total Settled' },
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
      supportLeft: '👑 Support', supportRight: '⚔️ Support',
      enterDuel: '⚔️ Enter duel', vsAI: '🤖 vs AI Judge',
      share: '↗ Share · Copy link', expiresIn: 'Expires in',
    },
    detail: {
      claimLabel: 'Claim on trial', rulingLabel: 'Ruling Standard',
      totalPot: 'Total Pot', expires: 'Expires', network: 'Network',
      enterDuel: '⚔️ Enter the duel', challengeAI: '🤖 Challenge AI Judge',
      share: '↗ Share · Copy link', expiresIn: 'Expires in',
      judgeNote: 'AI Judge delivers verdict on expiry based on the agreed ruling standard. No middleman. Automatic settlement.',
      howItWorks: 'How it works →',
      openSlot: 'Open Slot', awaitingChallenger: 'awaiting challenger', takeSide: 'Take the other side',
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
      cancel: 'Cancel', submit: '🔒 Lock & Issue', submitAI: '🔒 Lock & Challenge AI',
    },
    predict: {
      title: '⚖️ Predict the ruling',
      red: 'AI judges RED wins',
      blue: 'AI judges BLUE wins',
      note: 'Predict correctly → share the wrong side\'s pool',
    },
    duelModal: {
      supportPct: '% support',
      stakePlaceholder: 'Stake amount',
      odds: 'Est. odds',
      payout: 'If you win',
    },
    result: {
      verdict: 'AI Judge verdict',
      wins: 'wins',
      analysisLabel: 'AI Judge analysis',
      disputeTitle: '🚨 Dispute this ruling',
      disputeDesc: 'If you believe the AI Judge ruled incorrectly, file a dispute within the 48h window. Win → ruling reversed + reward. Lose → your stake goes to treasury.',
      disputeCost: 'Dispute cost:',
      disputeBtn: 'File a dispute',
      disputeRemaining: 'remaining',
      share: '↗ Share result · Copy link',
    },
    aiCard: {
      treasury: 'protocol treasury',
      rewardWin: 'If you win',
      rewardWinVal: 'Earn $VRD tokens',
      rewardLose: 'If AI wins',
      rewardLoseVal: 'Tokens → treasury',
      reward: 'Reward',
    },
    liveCard: {
      watching: 'watching', online: 'online', communityVote: 'community vote',
      liveChat: 'Live Chat', saySomething: 'Say something...', send: '↑',
      enterDuel: '⚔️ Enter duel', vsAI: '🤖 vs AI Judge', expiresIn: 'Expires in',
    },
    events: {
      duelIssued: 'Duel Issued', onChain: 'On-chain snapshot', aiMid: 'AI Judge · Mid Report',
      supportShift: 'Support shift', latestSnapshot: 'Latest snapshot', aiLive: 'AI Judge · Live Signal',
      justNow: 'Just now', new: 'NEW', live: 'LIVE',
    },
    duels: [
      { claim: '"Mantle will flip Arbitrum in total TVL within 6 months — I\'ll stake 2 ETH on it"', rulingStd: 'Based on DeFiLlama TVL data at 00:00 UTC on the expiry date.', watchStd: 'DeFiLlama TVL', challengerStance: 'Bullish — Mantle flips Arbitrum', defenderStance: 'Bearish — Arbitrum stays dominant' },
      { claim: '"I\'ll ship my app before my co-founder finishes his side project. 0.5 ETH says I win."', rulingStd: 'Based on official product launch announcement on X.', watchStd: 'X announcement', challengerStance: 'I ship first', defenderStance: 'Take the other side' },
      { claim: '"Our community will hit 100K members before yours does."', rulingStd: 'Based on Twitter followers count at expiry date.', watchStd: 'Twitter followers', challengerStance: 'MantleDAO hits 100K first', defenderStance: 'ArbiDAO hits 100K first' },
      { claim: '"I can go 30 days without social media. Anyone want to bet against me?"', rulingStd: 'AI Judge verifies via public activity monitoring.', watchStd: 'AI Judge', challengerStance: 'I can do it', defenderStance: 'Take the other side' },
    ],
  },
  zh: {
    appName: 'Protocol Bet', arena: '擂台', live: '实时',
    issueBtn: '+ 发起对决', loadMore: '加载更多对决', backToArena: '← 返回广场',
    filters: ['全部', '热门 🔥', '即将结束', '高额对赌'],
    stats: { duels: '总对决场次', pool: '今日奖池', settled: '已结算总额' },
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
      supportLeft: '👑 支持', supportRight: '⚔️ 支持',
      enterDuel: '⚔️ 参与对决', vsAI: '🤖 挑战AI法官',
      share: '↗ 分享 · 复制链接', expiresIn: '剩余时间',
    },
    detail: {
      claimLabel: '对决声明', rulingLabel: '裁定标准',
      totalPot: '总奖池', expires: '到期时间', network: '网络',
      enterDuel: '⚔️ 参与对决', challengeAI: '🤖 挑战AI法官',
      share: '↗ 分享 · 复制链接', expiresIn: '剩余时间',
      judgeNote: 'AI法官将在到期时根据双方约定的裁定标准给出裁决。无需中间人，自动结算。',
      howItWorks: '了解更多 →',
      openSlot: '等待应战', awaitingChallenger: '等待挑战者', takeSide: '站到另一边',
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
      cancel: '取消', submit: '🔒 锁仓并发起', submitAI: '🔒 锁仓并挑战AI',
    },
    predict: {
      title: '⚖️ 预判裁定',
      red: 'AI判红方赢',
      blue: 'AI判蓝方赢',
      note: '预判正确 → 瓜分错误方的奖池',
    },
    duelModal: {
      supportPct: '% 支持',
      stakePlaceholder: '押注金额',
      odds: '预计赔率',
      payout: '赢了可得',
    },
    result: {
      verdict: 'AI法官裁定',
      wins: '胜出',
      analysisLabel: 'AI法官分析',
      disputeTitle: '🚨 质疑裁定',
      disputeDesc: '如果你认为AI法官裁定有误，可在48小时内提起质疑。质疑成功 → 裁定推翻并获奖励。质疑失败 → 押注代币进入金库。',
      disputeCost: '质疑费用：',
      disputeBtn: '提起质疑',
      disputeRemaining: '剩余',
      share: '↗ 分享结果 · 复制链接',
    },
    aiCard: {
      treasury: '协议金库',
      rewardWin: '你赢了',
      rewardWinVal: '获得 $VRD 代币',
      rewardLose: 'AI赢了',
      rewardLoseVal: '代币进入金库',
      reward: '奖励',
    },
    liveCard: {
      watching: '观战', online: '在线', communityVote: '社区投票',
      liveChat: '直播聊天', saySomething: '说点什么...', send: '↑',
      enterDuel: '⚔️ 参与对决', vsAI: '🤖 挑战AI法官', expiresIn: '剩余时间',
    },
    events: {
      duelIssued: '对决发起', onChain: '链上快照', aiMid: 'AI法官 · 中期报告',
      supportShift: '支持率变化', latestSnapshot: '最新快照', aiLive: 'AI法官 · 实时信号',
      justNow: '刚刚', new: '新', live: '实时',
    },
    duels: [
      { claim: '"Mantle将在6个月内TVL总量超越Arbitrum — 我押2 ETH"', rulingStd: '以到期日00:00 UTC的DeFiLlama TVL数据为准。', watchStd: 'DeFiLlama TVL', challengerStance: '看涨 — Mantle超越Arbitrum', defenderStance: '看跌 — Arbitrum保持领先' },
      { claim: '"我会在联合创始人完成副业项目之前先上线产品，0.5 ETH为证。"', rulingStd: '以X平台上的官方产品发布公告为准。', watchStd: 'X平台公告', challengerStance: '我先发布', defenderStance: '站到另一边' },
      { claim: '"我们社区将比你们社区先突破10万成员。"', rulingStd: '以到期日双方Twitter粉丝数为准。', watchStd: 'Twitter粉丝数', challengerStance: 'MantleDAO先突破10万', defenderStance: 'ArbiDAO先突破10万' },
      { claim: '"我能坚持30天不用社交媒体，有人敢赌吗？"', rulingStd: 'AI法官通过监控主要社交平台公开活动进行裁定。', watchStd: 'AI法官', challengerStance: '我能做到', defenderStance: '站到另一边' },
    ],
  },
} as const;

type Lang = 'en' | 'zh';
type DuelType = 'kolBattle' | 'friendsBet' | 'communityWar' | 'personalChallenge';
type Rarity = 'legendary' | 'rare' | 'common';
type Status = 'live' | 'open' | 'ending' | 'new';

interface Duel {
  id: string; type: DuelType; rarity: Rarity; status: Status;
  challenger: { name: string; addr: string; color: string; amount: number };
  defender: { name: string; addr: string; color: string; amount: number } | null;
  supportRed: number; watchers: number; expires: string; network: string; index: number;
  isAIJudge?: boolean;
}

const DUELS: Duel[] = [
  { id: '0039', type: 'friendsBet', rarity: 'common', status: 'open', challenger: { name: '@devlanting', addr: '0x9a...b33f', color: '#1a5a1a', amount: 0.5 }, defender: null, supportRed: 71, watchers: 23, expires: '29d · 04h', network: 'BNB Chain', index: 1 },
  { id: '0041', type: 'communityWar', rarity: 'rare', status: 'ending', challenger: { name: 'MantleDAO', addr: '0x4c...de12', color: '#4a1a00', amount: 0.75 }, defender: { name: 'ArbiDAO', addr: '0x7e...aa99', color: '#1a2a4a', amount: 0.75 }, supportRed: 55, watchers: 312, expires: '02h · 14m', network: 'Mantle', index: 2 },
  { id: '0038', type: 'personalChallenge', rarity: 'common', status: 'new', challenger: { name: '@zen_mode', addr: '0x2b...f091', color: '#0a1a4a', amount: 0.3 }, defender: null, supportRed: 48, watchers: 9, expires: '30d · 00h', network: 'Mantle', index: 3, isAIJudge: true },
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

function Avatar({ color, size = 'md', border = 'default' }: { color: string; size?: 'sm' | 'md' | 'lg'; border?: 'red' | 'blue' | 'orange' | 'default' }) {
  const sz = size === 'sm' ? 'w-7 h-7 rounded-md' : size === 'lg' ? 'w-14 h-14 rounded-xl' : 'w-9 h-9 rounded-xl';
  const bc = border === 'red' ? 'border-red-400' : border === 'blue' ? 'border-blue-400' : border === 'orange' ? 'border-orange-400' : 'border-white/10';
  return (
    <div className={`${sz} overflow-hidden relative flex-shrink-0 border-2 ${bc}`}>
      <div className="absolute inset-0" style={{ background: color }} />
      <img src={WARRIOR_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
      <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-green-400 border border-[#0c0c1a]" />
    </div>
  );
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
        {selectedChain ? (
          <>
            <img src={selectedChain.logo} alt={selectedChain.name} className="w-5 h-5 rounded-full flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <span className="text-white/80 flex-1 text-left">{selectedChain.name}</span>
            <span className="text-white/40 text-xs">{selectedChain.token}</span>
          </>
        ) : <span className="text-white/25 flex-1 text-left">{placeholder}</span>}
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

function IssueModal({ t, onClose }: { t: typeof LANG['en']; onClose: () => void }) {
  const m = t.modal;
  const [selectedChain, setSelectedChain] = useState<typeof CHAINS[0] | null>(null);
  const [stake, setStake] = useState('');
  const [duration, setDuration] = useState('7');
  const [durationUnit, setDurationUnit] = useState(m.durationUnits[0]);
  const [visibility, setVisibility] = useState<'public' | 'private' | 'ai'>('public');
  const presetDays = [7, 14, 30, 90];

  const visOptions = [
    { key: 'public' as const, label: m.visibilities[0], desc: m.visibilityDescPublic },
    { key: 'private' as const, label: m.visibilities[1], desc: m.visibilityDescPrivate },
    { key: 'ai' as const, label: m.visibilityAI, desc: m.visibilityDescAI },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0c0c1a] border border-red-400/30 rounded-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-[#10101e] border-b border-white/5 px-5 py-3.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-white/90">{m.title}</span>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 text-xl leading-none">×</button>
        </div>
        <div className="p-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          <div>
            <div className="text-[9px] tracking-widest uppercase text-white/30 mb-1.5">{m.claimLabel}</div>
            <textarea className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/80 placeholder-white/20 outline-none focus:border-red-400/50 resize-none" rows={3} placeholder={m.claimPlaceholder} />
          </div>
          <div>
            <div className="text-[9px] tracking-widest uppercase text-white/30 mb-1.5">{m.rulingLabel}</div>
            <textarea className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/80 placeholder-white/20 outline-none focus:border-red-400/50 resize-none" rows={2} placeholder={m.rulingPlaceholder} />
          </div>
          <div>
            <div className="text-[9px] tracking-widest uppercase text-white/30 mb-1.5">{m.networkLabel}</div>
            <ChainSelector selectedChain={selectedChain} onSelect={setSelectedChain} placeholder={m.networkPlaceholder} />
          </div>
          <div>
            <div className="text-[9px] tracking-widest uppercase text-white/30 mb-1.5">{m.stakeLabel}</div>
            <div className="flex gap-2">
              <input type="number" min="0" step="0.001" value={stake} onChange={e => { if (Number(e.target.value) >= 0 || e.target.value === '') setStake(e.target.value); }}
                className="flex-1 bg-[#10101e] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/80 placeholder-white/20 outline-none focus:border-red-400/50"
                placeholder={m.stakePlaceholder} />
              <div className="bg-[#10101e] border border-red-400/30 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-400 flex items-center min-w-[60px] justify-center">
                {selectedChain ? selectedChain.token : '—'}
              </div>
            </div>
          </div>
          <div>
            <div className="text-[9px] tracking-widest uppercase text-white/30 mb-1.5">
              {m.durationLabel} <span className="text-white/20 normal-case tracking-normal text-[8px]">({m.durationNote})</span>
            </div>
            <div className="flex gap-2 mb-2">
              <input type="number" min="1" step="1" value={duration}
                onChange={e => { const v = parseInt(e.target.value); if (v >= 1 || e.target.value === '') setDuration(e.target.value); }}
                className="flex-1 bg-[#10101e] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/80 outline-none focus:border-red-400/50" />
              <select value={durationUnit} onChange={e => setDurationUnit(e.target.value)}
                className="bg-[#10101e] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/80 outline-none focus:border-red-400/50">
                {m.durationUnits.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              {presetDays.map((d, i) => (
                <button key={d} onClick={() => { setDuration(String(d)); setDurationUnit(m.durationUnits[0]); }}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] border transition-colors ${duration === String(d) && durationUnit === m.durationUnits[0] ? 'border-red-400/50 text-red-400 bg-red-400/10' : 'border-white/10 text-white/30 hover:border-white/20'}`}>
                  {m.durationPresets[i]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[9px] tracking-widest uppercase text-white/30 mb-2">{m.visibilityLabel}</div>
            <div className="flex flex-col gap-2">
              {visOptions.map(opt => (
                <div key={opt.key} onClick={() => setVisibility(opt.key)}
                  className={`rounded-xl px-3 py-2.5 cursor-pointer flex items-start gap-3 border transition-colors ${
                    visibility === opt.key && opt.key === 'ai'
                      ? 'border-purple-400/40 bg-purple-400/5'
                      : visibility === opt.key
                      ? 'border-blue-400/40 bg-blue-400/5'
                      : 'border-white/8 bg-[#10101e] hover:border-white/15'
                  }`}>
                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                    visibility === opt.key && opt.key === 'ai'
                      ? 'border-purple-400 bg-purple-400'
                      : visibility === opt.key
                      ? 'border-blue-400 bg-blue-400'
                      : 'border-white/20'
                  }`}>
                    {visibility === opt.key && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-semibold mb-0.5 ${
                      visibility === opt.key && opt.key === 'ai' ? 'text-purple-300' :
                      visibility === opt.key ? 'text-blue-300' : 'text-white/60'
                    }`}>{opt.label}</div>
                    <div className="text-[10px] text-white/30 leading-snug">{opt.desc}</div>
                    {opt.key === 'ai' && visibility === 'ai' && (
                      <div className="mt-2 bg-purple-400/10 border border-purple-400/25 rounded-lg px-2.5 py-1.5 text-[10px] text-purple-300/80 leading-snug">
                        {m.visibilityAINote}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 pb-5 grid grid-cols-2 gap-3">
          <button onClick={onClose} className="py-2.5 rounded-xl text-sm font-medium text-white/40 border border-white/10 hover:border-white/20 transition-colors">{m.cancel}</button>
          <button className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
            visibility === 'ai'
              ? 'text-purple-400 border-purple-400/50 bg-purple-400/10 hover:bg-purple-400/20'
              : 'text-red-400 border-red-400/50 bg-red-400/10 hover:bg-red-400/20'
          }`}>{visibility === 'ai' ? m.submitAI : m.submit}</button>
        </div>
      </div>
    </div>
  );
}

const LIVE_DUEL = {
  id: '0042', type: 'KOL Battle',
  challenger: { name: '@CryptoKing', addr: '0x3f...a21c', color: '#6a1a1a' },
  defender: { name: '@BlockWizard', addr: '0x8b...cc44', color: '#1a1a6a' },
  amount: 1.0, expires: '44d · 08h', network: 'Mantle',
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

const HEATMAP_COLS = 26;
const HEATMAP_ROWS = 9;
const RED_STOPS = ['#0d0810','#ff6b6b22','#ff6b6b55','#ff6b6b88','#ff6b6bbb','#ff6b6b'];
const BLU_STOPS = ['#08080f','#6b9fff22','#6b9fff55','#6b9fff88','#6b9fffbb','#6b9fff'];

function initHeatmap(red: number) {
  return Array.from({length: HEATMAP_COLS}, (_, ci) =>
    Array.from({length: HEATMAP_ROWS}, (_, ri) => {
      const v = red + Math.sin((ci+ri)*0.5)*18 + Math.random()*16 - 8;
      const side = v > 50 ? 'r' : 'b';
      const dist = Math.abs(v-50)/50;
      const intensity = Math.ceil(dist*4) || 1;
      return {side, intensity};
    })
  );
}

const LIVE_EVENTS = [
  {text:'Mantle TVL +2.3% ↑', side:'r'},{text:'@CryptoKing leading +4%', side:'r'},
  {text:'Arbitrum holds $2B TVL', side:'b'},{text:'⚖️ AI: gap still large', side:'g'},
  {text:'847 watching now', side:'g'},{text:'Community vote swings RED', side:'r'},
  {text:'New data: Mantle +$13M', side:'r'},{text:'BlockWizard: fundamentals hold', side:'b'},
];

function LiveCard({ t }: { t: typeof LANG['en'] }) {
  const timer = useCountdown(LIVE_DUEL.expires);
  const lt = t.liveCard;
  const et = t.events;
  const [watchers, setWatchers] = useState(847);
  const [supportRed, setSupportRed] = useState(62);
  const [chatMsgs, setChatMsgs] = useState(CHAT_SEED.slice(0, 5));
  const [heatmap, setHeatmap] = useState(() => initHeatmap(62));
  const [eventBubble, setEventBubble] = useState<{text:string;side:string}|null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const msgIdx = useRef(0);
  const eventIdx = useRef(0);

  useEffect(() => {
    const t1 = setInterval(() => setWatchers(v => Math.max(800, v + Math.floor(Math.random() * 8) - 3)), 2000);
    const t2 = setInterval(() => {
      setSupportRed(v => {
        const next = Math.max(38, Math.min(76, v + (Math.random() - 0.5) * 1.5));
        setHeatmap(prev => {
          const next2 = prev.map(col => [...col]);
          const strength = Math.abs(next-50)/50;
          const isRedDom = next > 50;
          const numUpdate = Math.floor(HEATMAP_COLS * HEATMAP_ROWS * 0.12);
          for(let i=0;i<numUpdate;i++){
            const c=Math.floor(Math.random()*HEATMAP_COLS);
            const r=Math.floor(Math.random()*HEATMAP_ROWS);
            const threshold=isRedDom?0.5+strength*0.45:0.5-strength*0.45;
            const side=Math.random()<threshold?'r':'b';
            const maxInt=Math.ceil(1+strength*4);
            next2[c][r]={side,intensity:Math.ceil(Math.random()*maxInt)||1};
          }
          return next2;
        });
        return next;
      });
    }, 1200);
    const t3 = setInterval(() => { setChatMsgs(prev => [...prev.slice(-19), CHAT_SEED[msgIdx.current % CHAT_SEED.length]]); msgIdx.current++; }, 2800);
    const t4 = setInterval(() => {
      const e = LIVE_EVENTS[eventIdx.current % LIVE_EVENTS.length];
      setEventBubble(e);
      setTimeout(() => setEventBubble(null), 2000);
      eventIdx.current++;
    }, 3500);
    setTimeout(() => {
      setEventBubble(LIVE_EVENTS[0]);
      setTimeout(() => setEventBubble(null), 2000);
    }, 800);
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3); clearInterval(t4); };
  }, []);

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [chatMsgs]);

  const red = Math.round(supportRed);
  const isRedLeading = red > 50;
  const strength = Math.abs(red - 50) / 50;

  return (
    <div className="bg-[#0c0c1a] border border-white/10 rounded-2xl overflow-hidden" style={{ display: 'grid', gridTemplateColumns: '70% 30%', height: '540px' }}>
      {/* LEFT */}
      <div className="flex flex-col border-r border-white/10 bg-[#07070f] overflow-hidden">

        {/* TOP BAR */}
        <div className="bg-[#09091e] border-b border-white/5 px-3 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded-full px-2.5 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[9px] font-bold text-red-400 tracking-widest">LIVE</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex">
              {['#6a1a3a','#1a3a6a','#1a6a2a'].map((c,i) => (
                <div key={i} className="w-4 h-4 rounded-full overflow-hidden border border-[#09091e] -ml-1 first:ml-0 relative">
                  <div className="absolute inset-0" style={{ background: c }} />
                  <img src={WARRIOR_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
                </div>
              ))}
            </div>
            <span className="text-[10px] text-white/40"><span className="text-green-400 font-semibold">{watchers}</span> {lt.watching}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-red-400 border border-red-400/30 bg-red-400/10 rounded px-1.5 py-0.5 tracking-wider">KOL BATTLE</span>
            <span className="text-[8px] tracking-widest text-white/20">#{LIVE_DUEL.id}</span>
          </div>
        </div>

        {/* CLAIM BAR */}
        <div className="bg-[#0a0a1e] border-b border-white/5 px-3 py-2 flex-shrink-0 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[7px] tracking-widest uppercase text-white/20 mb-1">{et.duelIssued}</div>
            <div className="text-[11px] font-semibold text-white/80 leading-snug mb-1" style={{fontFamily:'var(--font-sans)'}}>{t.duels[0].claim}</div>
            <div className="flex items-center gap-2">
              <span className="text-[7px] tracking-widest uppercase text-white/15">Ruling</span>
              <span className="text-[9px] text-white/25" style={{fontFamily:'var(--font-sans)'}}>DeFiLlama TVL data at expiry · 00:00 UTC</span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <button className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-red-400 border border-red-400/40 bg-red-400/10 hover:bg-red-400/20 transition-colors whitespace-nowrap">{lt.enterDuel}</button>
          </div>
        </div>

        {/* BATTLE ZONE */}
        <div className="px-3 py-3 flex-shrink-0" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0', position: 'relative' }}>
          {/* RED FIGHTER */}
          <div className="flex flex-col items-center gap-2 text-center" style={{ transform: isRedLeading ? 'scale(1.04)' : 'scale(0.96)', transition: 'transform 0.6s ease' }}>
            <div className="relative">
              {isRedLeading && <div className="absolute inset-[-10px] rounded-2xl pointer-events-none" style={{ background: 'radial-gradient(circle,rgba(255,107,107,0.25),transparent 70%)', transition: 'opacity 0.6s' }} />}
              <div className="w-12 h-12 rounded-xl overflow-hidden relative border-2 border-red-400 flex-shrink-0" style={{ filter: isRedLeading ? 'brightness(1.1)' : 'brightness(0.75) saturate(0.6)', transition: 'filter 0.6s ease' }}>
                <div className="absolute inset-0" style={{ background: LIVE_DUEL.challenger.color }} />
                <img src={WARRIOR_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
                <div className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-green-400 border border-[#07070f]" />
              </div>
            </div>
            <div className="text-[10px] font-semibold text-white/80">{LIVE_DUEL.challenger.name}</div>
            <div className="text-[8px] text-white/25 font-mono">{LIVE_DUEL.challenger.addr}</div>
            <div className="text-[8px] text-white/40 leading-tight" style={{fontFamily:'var(--font-sans)'}}>Bullish — Mantle flips</div>
            <div className="text-lg font-bold text-red-400">{LIVE_DUEL.amount} <span className="text-[8px] text-white/25">ETH</span></div>
            {/* stat bars */}
            <div className="w-full flex flex-col gap-1.5">
              {[
                { label:'SUP', val:`${red}%`, pct: red },
                { label:'TVL', val:'$588M', pct: 22 },
                { label:'MOM', val:'+40%', pct: 78 },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span className="text-[7px] text-white/20 w-6 text-right tracking-wider uppercase">{s.label}</span>
                  <div className="flex-1 h-[3px] bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full transition-all duration-700" style={{ width: `${s.pct}%` }} />
                  </div>
                  <span className="text-[7px] text-red-400 w-8 text-left font-semibold">{s.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* VS CENTER */}
          <div className="flex flex-col items-center justify-center gap-2 px-3" style={{ position: 'relative' }}>
            <div className="w-px h-6 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
            <span className="text-[11px] font-bold text-white/15 tracking-widest">VS</span>
            <div className="bg-red-400/15 border border-red-400/25 rounded-lg px-2 py-1 text-center">
              <div className="text-sm font-bold text-red-400">2.0</div>
              <div className="text-[6px] text-red-400/50 tracking-widest uppercase">ETH pot</div>
            </div>
            <div className="w-px h-6 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
            {/* EVENT BUBBLE */}
            {eventBubble && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-semibold rounded-md px-2 py-1 border z-10"
                style={{
                  color: eventBubble.side === 'r' ? '#ff9999' : eventBubble.side === 'b' ? '#99bbff' : '#ffcc66',
                  background: eventBubble.side === 'r' ? 'rgba(255,107,107,0.15)' : eventBubble.side === 'b' ? 'rgba(107,159,255,0.15)' : 'rgba(240,168,0,0.15)',
                  borderColor: eventBubble.side === 'r' ? 'rgba(255,107,107,0.3)' : eventBubble.side === 'b' ? 'rgba(107,159,255,0.3)' : 'rgba(240,168,0,0.3)',
                  fontFamily: 'var(--font-sans)',
                  animation: 'fadeInUp 0.3s ease',
                }}>
                {eventBubble.text}
              </div>
            )}
          </div>

          {/* BLUE FIGHTER */}
          <div className="flex flex-col items-center gap-2 text-center" style={{ transform: !isRedLeading ? 'scale(1.04)' : 'scale(0.96)', transition: 'transform 0.6s ease' }}>
            <div className="relative">
              {!isRedLeading && <div className="absolute inset-[-10px] rounded-2xl pointer-events-none" style={{ background: 'radial-gradient(circle,rgba(107,159,255,0.25),transparent 70%)', transition: 'opacity 0.6s' }} />}
              <div className="w-12 h-12 rounded-xl overflow-hidden relative border-2 border-blue-400 flex-shrink-0" style={{ filter: !isRedLeading ? 'brightness(1.1)' : 'brightness(0.75) saturate(0.6)', transition: 'filter 0.6s ease' }}>
                <div className="absolute inset-0" style={{ background: LIVE_DUEL.defender.color }} />
                <img src={WARRIOR_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
                <div className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-green-400 border border-[#07070f]" />
              </div>
            </div>
            <div className="text-[10px] font-semibold text-white/80">{LIVE_DUEL.defender.name}</div>
            <div className="text-[8px] text-white/25 font-mono">{LIVE_DUEL.defender.addr}</div>
            <div className="text-[8px] text-white/40 leading-tight" style={{fontFamily:'var(--font-sans)'}}>Bearish — Arbitrum holds</div>
            <div className="text-lg font-bold text-blue-400">{LIVE_DUEL.amount} <span className="text-[8px] text-white/25">ETH</span></div>
            <div className="w-full flex flex-col gap-1.5">
              {[
                { label:'SUP', val:`${100-red}%`, pct: 100-red },
                { label:'TVL', val:'$2.08B', pct: 80 },
                { label:'MOM', val:'-1.2%', pct: 18 },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span className="text-[7px] text-white/20 w-6 text-right tracking-wider uppercase">{s.label}</span>
                  <div className="flex-1 h-[3px] bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full transition-all duration-700" style={{ width: `${s.pct}%` }} />
                  </div>
                  <span className="text-[7px] text-blue-400 w-8 text-left font-semibold">{s.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SUPPORT BAR */}
        <div className="px-3 pb-2 flex-shrink-0">
          <div className="flex justify-between mb-1">
            <span className="text-[10px] font-semibold text-red-400" style={{ fontSize: isRedLeading ? '12px' : '10px', transition: 'font-size 0.4s' }}>{red}%</span>
            <span className="text-[8px] text-white/20 tracking-widest uppercase">{lt.communityVote}</span>
            <span className="text-[10px] font-semibold text-blue-400" style={{ fontSize: !isRedLeading ? '12px' : '10px', transition: 'font-size 0.4s' }}>{100-red}%</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden flex">
            <div className="bg-gradient-to-r from-red-600 to-red-400 rounded-l-full transition-all duration-700" style={{ width: `${red}%` }} />
            <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-r-full flex-1" />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-[7px] text-red-400/40">{LIVE_DUEL.challenger.name}</span>
            <span className="text-[7px] text-blue-400/40">{LIVE_DUEL.defender.name}</span>
          </div>
        </div>

        {/* GITHUB HEATMAP + DATA PANEL */}
        <div className="px-3 pb-2 flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[7px] tracking-widest uppercase text-white/20">support_rate · live</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-[7px] text-white/15">less</span>
                {[1,2,3,4,5].map(i => <div key={i} className="w-1.5 h-1.5 rounded-sm" style={{ background: RED_STOPS[i] }} />)}
                <span className="text-[7px] text-red-400/40">red</span>
              </div>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => <div key={i} className="w-1.5 h-1.5 rounded-sm" style={{ background: BLU_STOPS[i] }} />)}
                <span className="text-[7px] text-blue-400/40">blue</span>
                <span className="text-[7px] text-white/15">more</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            {/* HEATMAP */}
            <div className="flex gap-[3px] flex-shrink-0">
              {heatmap.map((col, ci) => (
                <div key={ci} className="flex flex-col gap-[3px]">
                  {col.map((cell, ri) => (
                    <div key={ri} className="w-[10px] h-[10px] rounded-sm"
                      style={{ background: cell.side === 'r' ? RED_STOPS[cell.intensity] : BLU_STOPS[cell.intensity], transition: 'background 1s ease' }} />
                  ))}
                </div>
              ))}
            </div>

            {/* DATA PANEL */}
            <div className="flex-1 border-l border-white/5 pl-3 flex flex-col justify-between gap-2">
              {/* WATCHING */}
              <div>
                <div className="text-[6px] tracking-widest uppercase text-white/15 mb-0.5">Watching</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-bold text-green-400">{Math.round(red * 8 + 300)}</span>
                  <span className="text-[8px] text-green-400/50">↑ live</span>
                </div>
              </div>

              {/* AI JUDGE */}
              <div>
                <div className="text-[6px] tracking-widest uppercase text-white/15 mb-1">AI Judge · signal</div>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                  <span className="text-[8px] text-purple-400 font-semibold">Monitoring</span>
                </div>
                {/* bias indicator */}
                <div className="relative">
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                    <div className="bg-red-400/60 rounded-l-full transition-all duration-1000" style={{ width: `${red * 0.7}%` }} />
                    <div className="bg-blue-400/60 rounded-r-full flex-1" />
                  </div>
                  <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-purple-400 border border-[#07070f] transition-all duration-1000"
                    style={{ left: `calc(${red * 0.7}% - 4px)` }} />
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="text-[6px] text-red-400/50">{LIVE_DUEL.challenger.name}</span>
                  <span className="text-[6px] text-purple-400/50">⚖️ {red > 55 ? 'leans RED' : red < 45 ? 'leans BLUE' : 'neutral'}</span>
                  <span className="text-[6px] text-blue-400/50">{LIVE_DUEL.defender.name}</span>
                </div>
                <div className="text-[8px] text-purple-300/50 italic leading-snug mt-1" style={{fontFamily:'var(--font-sans)'}}>
                  "{red > 55 ? 'Momentum favors challenger. Gap closing.' : red < 45 ? 'Defender holds ground. Fundamentals intact.' : 'Outcome uncertain. Both sides within range.'}"
                </div>
              </div>

              {/* TIME LEFT */}
              <div>
                <div className="text-[6px] tracking-widest uppercase text-white/15 mb-0.5">Time elapsed</div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-400/50 rounded-full" style={{ width: '41%' }} />
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="text-[6px] text-orange-400/40">41% elapsed</span>
                  <span className="text-[6px] text-white/15">44d left</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        
        <div className="bg-[#04040c] border-t border-white/5 px-3 py-1.5 flex justify-between items-center flex-shrink-0">
          <span className="text-[7px] tracking-widest uppercase text-white/20">{lt.expiresIn}</span>
          <span className="text-[9px] font-mono text-red-400/50">{timer}</span>
        </div>
      </div>

      {/* RIGHT: CHAT */}
      <div className="flex flex-col bg-[#07070f] overflow-hidden">
        <div className="bg-[#08081a] border-b border-white/5 px-3 py-2 flex items-center justify-between flex-shrink-0">
          <span className="text-[9px] font-semibold tracking-widest uppercase text-white/40">{lt.liveChat}</span>
          <span className="text-[8px] text-white/20">{Math.floor(watchers * 0.15)} {lt.online}</span>
        </div>
        <div ref={chatRef} className="flex-1 overflow-y-auto p-2 flex flex-col gap-2" style={{ scrollbarWidth: 'none' }}>
          {chatMsgs.map((m, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <div className="w-4 h-4 rounded-full overflow-hidden relative flex-shrink-0 mt-0.5">
                <div className="absolute inset-0" style={{ background: m.color }} />
                <img src={WARRIOR_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <span className={`text-[8px] font-bold ${m.cls}`}>{m.name}</span>
                  {m.pill && (
                    <span className={`text-[7px] font-semibold rounded px-1 py-0.5 ${m.pill === 'r' ? 'text-red-400 bg-red-400/15 border border-red-400/25' : 'text-blue-400 bg-blue-400/15 border border-blue-400/25'}`}>
                      {m.pill === 'r' ? 'RED' : 'BLUE'}
                    </span>
                  )}
                </div>
                <div className="text-[9px] text-white/35 leading-snug" style={{fontFamily:'var(--font-sans)'}}>{m.text}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/5 px-2 py-1.5 grid grid-cols-2 gap-1.5 bg-[#08081a] flex-shrink-0">
          <button className="py-1 rounded-md text-[8px] font-semibold text-red-400 border border-red-400/25 bg-red-400/8 hover:bg-red-400/15 transition-colors truncate">👑 {LIVE_DUEL.challenger.name}</button>
          <button className="py-1 rounded-md text-[8px] font-semibold text-blue-400 border border-blue-400/25 bg-blue-400/8 hover:bg-blue-400/15 transition-colors truncate">⚔️ {LIVE_DUEL.defender.name}</button>
        </div>
        <div className="border-t border-white/5 px-2 py-1.5 bg-[#08081a] flex gap-1.5 items-center flex-shrink-0">
          <input className="flex-1 bg-[#0c0c1e] border border-white/8 rounded-full px-2.5 py-1.5 text-[9px] text-white/50 placeholder-white/20 outline-none" placeholder={lt.saySomething} />
          <button className="bg-red-400/15 border border-red-400/25 rounded-full px-2.5 py-1.5 text-[9px] text-red-400">{lt.send}</button>
        </div>
      </div>
    </div>
  );
}

function DuelCard({ duel, t, onClick, onEnter }: { duel: Duel; t: typeof LANG['en']; onClick: () => void; onEnter: () => void }) {
  const timer = useCountdown(duel.expires);
  const d = t.duels[duel.index];
  const pt = t.predict;
  const ac = t.aiCard;
  const isAI = duel.isAIJudge;
  const border = isAI ? 'border-purple-400/30' : duel.rarity === 'legendary' ? 'border-yellow-400/25' : duel.status === 'ending' ? 'border-orange-400/35' : 'border-white/10';
  const cardBg = isAI ? 'bg-[#0c0c1a]' : 'bg-[#0c0c1a]';
  const hoverBorder = isAI ? 'hover:border-purple-400/50' : 'hover:border-red-400/50';
  return (
    <div onClick={onClick} className={`${cardBg} border ${border} rounded-xl overflow-hidden cursor-pointer transition-all duration-150 ${hoverBorder} hover:-translate-y-0.5 flex flex-col`}
      style={isAI ? { background: 'linear-gradient(180deg, rgba(168,107,255,0.06) 0%, #0c0c1a 50%)' } : undefined}>
      {/* HEADER */}
      <div className="px-3 pt-2.5 pb-1.5 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 flex-wrap">
          <span className={`text-[8px] tracking-widest uppercase px-1.5 py-0.5 rounded border ${typeStyle[duel.type]}`}>{t.tags[duel.type]}</span>
          {duel.rarity !== 'common' && <span className={`text-[8px] tracking-wide px-1.5 py-0.5 rounded border ${rarityStyle[duel.rarity]}`}>{t.tags[duel.rarity]}</span>}
          {isAI && <span className="text-[8px] tracking-widest uppercase px-1.5 py-0.5 rounded border text-purple-400 border-purple-400/50 bg-purple-400/10">vs AI Judge</span>}
        </div>
        <span className={`text-[8px] tracking-widest uppercase px-1.5 py-0.5 rounded border flex-shrink-0 ${statusStyle[duel.status]}`}>{t.tags[duel.status]}</span>
      </div>
      {/* VS ROW */}
      <div className="px-3 pb-2" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '4px' }}>
        <div className="flex items-center gap-2">
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-xl overflow-hidden relative border-2 border-red-400">
              <div className="absolute inset-0" style={{ background: duel.challenger.color }} />
              <img src={WARRIOR_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
              <div className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-green-400 border border-[#0c0c1a]" />
            </div>
            {(() => { const chain = CHAINS.find(c => duel.network.includes(c.name)); return chain ? <img src={chain.logo} alt="" className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full border-2 border-[#0c0c1a]" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} /> : null; })()}
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="text-[11px] font-semibold text-white/85 truncate">{duel.challenger.name}</div>
            <div className="text-[8px] text-white/25 font-mono truncate">{duel.challenger.addr}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[17px] font-bold text-red-400 leading-none">{duel.challenger.amount}</span>
              <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded border ${isAI ? 'text-purple-400/70 border-purple-400/20 bg-purple-400/8' : 'text-red-400/70 border-red-400/20 bg-red-400/8'}`}>{duel.network.includes('BNB') ? 'BNB' : 'ETH'}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1.5 px-1">
          <div className="w-px h-2 bg-white/10" />
          <span className="text-[9px] font-medium text-white/15 tracking-widest">VS</span>
          <div className={`rounded-lg px-2 py-1.5 text-center ${isAI ? 'bg-purple-400/10 border border-purple-400/20' : 'bg-red-400/10 border border-red-400/20'}`}>
            <div className={`text-[9px] font-bold leading-none ${isAI ? 'text-purple-400' : 'text-red-400'}`}>{duel.challenger.amount + (duel.defender?.amount ?? duel.challenger.amount)}</div>
            <div className={`text-[5px] tracking-widest uppercase mt-0.5 opacity-50 ${isAI ? 'text-purple-400' : 'text-red-400'}`}>底池</div>
            <div className="w-full h-px bg-white/10 my-1" />
            <div className={`text-[11px] font-bold leading-none ${isAI ? 'text-purple-400' : 'text-red-400'}`}>{((duel.challenger.amount + (duel.defender?.amount ?? duel.challenger.amount)) * (1 + duel.watchers * 0.003)).toFixed(2)}</div>
            <div className={`text-[5px] tracking-widest uppercase mt-0.5 opacity-50 ${isAI ? 'text-purple-400' : 'text-red-400'}`}>总奖池</div>
          </div>
          <div className="w-px h-2 bg-white/10" />
        </div>
        <div className="flex items-center gap-2 flex-row-reverse">
          {isAI ? (
            <div className="w-12 h-12 rounded-xl bg-purple-400/15 border-2 border-purple-400/50 flex items-center justify-center flex-shrink-0 text-xl">⚖️</div>
          ) : duel.defender ? (
            <div className="relative flex-shrink-0">
              <div className={`w-12 h-12 rounded-xl overflow-hidden relative border-2 ${duel.status === 'ending' ? 'border-orange-400' : 'border-blue-400'}`}>
                <div className="absolute inset-0" style={{ background: duel.defender.color }} />
                <img src={WARRIOR_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
                <div className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-green-400 border border-[#0c0c1a]" />
              </div>
              {(() => { const chain = CHAINS.find(c => duel.network.includes(c.name)); return chain ? <img src={chain.logo} alt="" className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0c0c1a]" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} /> : null; })()}
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl border border-dashed border-white/10 flex items-center justify-center flex-shrink-0"><span className="text-white/20 text-lg">?</span></div>
          )}
          <div className="flex flex-col gap-0.5 min-w-0 text-right">
            {isAI ? (
              <>
                <div className="text-[11px] font-semibold text-purple-400">AI Judge</div>
                <div className="text-[8px] text-white/25 truncate">{ac.treasury}</div>
                <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                  <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded border text-purple-400/70 border-purple-400/20 bg-purple-400/8">{duel.network.includes('BNB') ? 'BNB' : 'ETH'}</span>
                  <span className="text-[17px] font-bold text-purple-400 leading-none">{duel.challenger.amount}</span>
                </div>
              </>
            ) : duel.defender ? (
              <>
                <div className="text-[11px] font-semibold text-white/85 truncate">{duel.defender.name}</div>
                <div className="text-[8px] text-white/25 font-mono truncate">{duel.defender.addr}</div>
                <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                  <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded border text-blue-400/70 border-blue-400/20 bg-blue-400/8">ETH</span>
                  <span className="text-[17px] font-bold text-blue-400 leading-none">{duel.defender.amount}</span>
                </div>
              </>
            ) : (
              <>
                <div className="text-[11px] font-semibold text-white/25">{t.card.openSlot}</div>
                <div className="text-[8px] text-white/15">{t.card.awaiting}</div>
                <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                  <span className="text-[17px] font-bold text-white/20 leading-none">???</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {/* PROGRESS BAR */}
      <div className="px-3 pb-2">
        <div className="h-1 bg-white/5 rounded-full overflow-hidden flex">
          <div className="bg-red-400/65 rounded-l-full transition-all duration-1000" style={{ width: `${duel.supportRed}%` }} />
          <div className={`rounded-r-full flex-1 ${isAI ? 'bg-purple-400/65' : 'bg-blue-400/65'}`} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[8px] font-semibold text-red-400/75">{duel.supportRed}%</span>
          <span className="text-[7px] tracking-widest uppercase text-white/15">社区投票</span>
          <span className={`text-[8px] font-semibold ${isAI ? 'text-purple-400/75' : 'text-blue-400/75'}`}>{100 - duel.supportRed}%</span>
        </div>
      </div>
      {/* CLAIM */}
      <div className="px-3 pb-1.5">
        <p className="text-[11px] font-medium text-white/65 leading-snug line-clamp-2">{d.claim}</p>
      </div>
      {/* RULING STANDARD */}
      <div className="px-3 pb-2 flex items-center gap-1.5">
        <span className="text-[7px] tracking-widest uppercase text-white/15">裁定</span>
        <span className="text-[9px] text-blue-400/50 truncate">{d.rulingStd.slice(0, 40)}{d.rulingStd.length > 40 ? '...' : ''}</span>
      </div>
      {/* STATS */}
      <div className="mx-3 border-t border-white/5" style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr' }}>
        <div className="py-2 text-center">
          <div className="text-[6px] tracking-widest uppercase text-white/20 mb-0.5">{t.card.pot}</div>
          <div className={`text-[10px] font-bold ${isAI ? 'text-purple-400' : 'text-red-400'}`}>{duel.challenger.amount + (duel.defender?.amount ?? duel.challenger.amount)} {duel.network.includes('BNB') ? 'BNB' : 'ETH'}</div>
        </div>
        <div className="bg-white/5" />
        <div className="py-2 text-center">
          <div className="text-[6px] tracking-widest uppercase text-white/20 mb-0.5">{isAI ? ac.reward : t.card.watching}</div>
          <div className={`text-[10px] font-bold ${isAI ? 'text-purple-400' : duel.watchers > 100 ? 'text-orange-400' : 'text-white/40'}`}>{isAI ? '$VRD' : `${duel.watchers > 100 ? '🔥 ' : ''}${duel.watchers}`}</div>
        </div>
        <div className="bg-white/5" />
        <div className="py-2 text-center">
          <div className="text-[6px] tracking-widest uppercase text-white/20 mb-0.5">{t.card.expires}</div>
          <div className={`text-[10px] font-bold ${duel.status === 'ending' ? 'text-orange-400' : 'text-white/40'}`}>{duel.expires}</div>
        </div>
      </div>
      {/* WATCHERS + NETWORK */}
      <div className="px-3 py-2 flex items-center gap-1.5">
        <div className="flex">
          {['#6a1a3a','#1a3a6a','#1a6a3a','#6a5a1a'].map((c,i) => (
            <div key={i} className="w-4 h-4 rounded-full overflow-hidden border border-[#0c0c1a] -ml-1 first:ml-0 relative">
              <div className="absolute inset-0" style={{ background: c }} />
              <img src={WARRIOR_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
            </div>
          ))}
        </div>
        <span className="text-[8px] text-white/25">+{duel.watchers} {t.card.watching}</span>
        <div className="ml-auto flex items-center gap-1">
          {(() => { const chain = CHAINS.find(c => duel.network.includes(c.name)); return chain ? <img src={chain.logo} alt="" className="w-3.5 h-3.5 rounded-full" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} /> : null; })()}
          <span className="text-[8px] text-white/25">{duel.network}</span>
        </div>
      </div>
      {/* ACTIONS */}
      <div className="px-3 pb-3 flex flex-col gap-1.5 mt-auto border-t border-white/5 pt-2">
        <button onClick={e => { e.stopPropagation(); onEnter(); }} className={`w-full py-2.5 rounded-lg text-[10px] font-semibold border transition-colors ${isAI ? 'text-purple-400 border-purple-400/40 bg-purple-400/10 hover:bg-purple-400/20' : 'text-red-400 border-red-400/40 bg-red-400/10 hover:bg-red-400/20'}`}>{t.card.enterDuel}</button>
        <button onClick={e => e.stopPropagation()} className="py-1.5 rounded-lg text-[8px] text-white/25 border border-dashed border-white/10 hover:border-white/20 transition-colors">{t.card.share}</button>
      </div>
      {/* FOOTER */}
      <div className="bg-[#080812] border-t border-white/5 px-3 py-1.5 flex justify-between items-center">
        <span className="text-[6px] tracking-widest uppercase text-white/20">{t.card.expiresIn}</span>
        <span className={`text-[8px] font-mono ${isAI ? 'text-purple-400/50' : duel.status === 'ending' ? 'text-orange-400/70' : 'text-red-400/50'}`}>{timer}</span>
      </div>
    </div>
  );
}
function DuelModal({ duel, t, onClose }: { duel: Duel; t: typeof LANG['en']; onClose: () => void }) {
  const d = t.duels[duel.index];
  const isAI = duel.isAIJudge;
  const ac = t.aiCard;
  const [selectedSide, setSelectedSide] = useState<'red' | 'blue' | null>(null);
  const [stake, setStake] = useState('');
  const token = duel.network.includes('BNB') ? 'BNB' : 'ETH';
  const totalPot = duel.challenger.amount + (duel.defender?.amount ?? duel.challenger.amount);
  const stakeNum = parseFloat(stake) || 0;
  const supportingPool = selectedSide === 'red'
    ? totalPot * (duel.supportRed / 100) + stakeNum
    : totalPot * ((100 - duel.supportRed) / 100) + stakeNum;
  const odds = stakeNum > 0 ? ((totalPot + stakeNum) / supportingPool).toFixed(2) : '—';
  const payout = stakeNum > 0 ? ((totalPot + stakeNum) / supportingPool * stakeNum).toFixed(3) : '—';

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0c0c1a] border border-red-400/30 rounded-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* HEADER */}
        <div className="bg-[#10101e] border-b border-white/5 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[8px] tracking-widest uppercase px-1.5 py-0.5 rounded border ${typeStyle[duel.type]}`}>{t.tags[duel.type]}</span>
            {duel.rarity !== 'common' && <span className={`text-[8px] tracking-wide px-1.5 py-0.5 rounded border ${rarityStyle[duel.rarity]}`}>{t.tags[duel.rarity]}</span>}
            {isAI && <span className="text-[8px] tracking-widest uppercase px-1.5 py-0.5 rounded border text-purple-400 border-purple-400/50 bg-purple-400/10">vs AI Judge</span>}
            <span className={`text-[8px] tracking-widest uppercase px-1.5 py-0.5 rounded border ${statusStyle[duel.status]}`}>{t.tags[duel.status]}</span>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 text-xl leading-none ml-2">×</button>
        </div>

        <div className="p-5 flex flex-col gap-4 max-h-[78vh] overflow-y-auto">
          {/* STANCES */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'stretch' }}>
            <div className="bg-red-400/5 border border-red-400/20 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-lg overflow-hidden relative border-2 border-red-400 flex-shrink-0">
                  <div className="absolute inset-0" style={{ background: duel.challenger.color }} />
                  <img src={WARRIOR_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-white/85 truncate">{duel.challenger.name}</div>
                  <div className="text-[8px] text-white/25 font-mono truncate">{duel.challenger.addr}</div>
                </div>
              </div>
              <p className="text-[10px] text-red-400/80 leading-relaxed mb-2">{d.challengerStance}</p>
              <div className="text-sm font-bold text-red-400">{duel.challenger.amount} <span className="text-[8px] text-white/30 font-normal">{token}</span></div>
            </div>
            <div className="flex flex-col items-center justify-center gap-1 px-1">
              <div className="w-px flex-1 bg-white/10" />
              <span className="text-[10px] font-medium text-white/15 tracking-widest">VS</span>
              <div className="w-px flex-1 bg-white/10" />
            </div>
            <div className="bg-blue-400/5 border border-blue-400/20 rounded-xl p-3">
              {isAI ? (
                <>
                  <div className="flex items-center gap-2 mb-2 flex-row-reverse">
                    <div className="w-9 h-9 rounded-lg bg-purple-400/15 border-2 border-purple-400/50 flex items-center justify-center flex-shrink-0 text-lg">⚖️</div>
                    <div className="min-w-0 text-right">
                      <div className="text-[11px] font-semibold text-purple-400">AI Judge</div>
                      <div className="text-[8px] text-white/25 truncate">{ac.treasury}</div>
                    </div>
                  </div>
                  <p className="text-[10px] text-purple-400/70 leading-relaxed mb-2 text-right">{d.defenderStance}</p>
                  <div className="text-sm font-bold text-purple-400 text-right">{duel.challenger.amount} <span className="text-[8px] text-white/30 font-normal">{token}</span></div>
                </>
              ) : duel.defender ? (
                <>
                  <div className="flex items-center gap-2 mb-2 flex-row-reverse">
                    <div className="w-9 h-9 rounded-lg overflow-hidden relative border-2 border-blue-400 flex-shrink-0">
                      <div className="absolute inset-0" style={{ background: duel.defender.color }} />
                      <img src={WARRIOR_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
                    </div>
                    <div className="min-w-0 text-right">
                      <div className="text-[11px] font-semibold text-white/85 truncate">{duel.defender.name}</div>
                      <div className="text-[8px] text-white/25 font-mono truncate">{duel.defender.addr}</div>
                    </div>
                  </div>
                  <p className="text-[10px] text-blue-400/80 leading-relaxed mb-2 text-right">{d.defenderStance}</p>
                  <div className="text-sm font-bold text-blue-400 text-right">{duel.defender.amount} <span className="text-[8px] text-white/30 font-normal">{token}</span></div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2 flex-row-reverse">
                    <div className="w-9 h-9 rounded-xl border border-dashed border-white/10 flex items-center justify-center flex-shrink-0"><span className="text-white/20">?</span></div>
                    <div className="min-w-0 text-right">
                      <div className="text-[11px] font-semibold text-white/25">{t.card.openSlot}</div>
                    </div>
                  </div>
                  <p className="text-[10px] text-white/30 leading-relaxed mb-2 text-right">{d.defenderStance}</p>
                  <div className="text-sm font-bold text-white/20 text-right">??? <span className="text-[8px] text-white/20 font-normal">{token}</span></div>
                </>
              )}
            </div>
          </div>

          {/* CLAIM */}
          <div className="bg-white/5 border border-white/5 rounded-xl p-4">
            <div className="text-[8px] tracking-widest uppercase text-white/20 mb-2">{t.detail.claimLabel}</div>
            <p className="text-sm font-semibold text-white/85 leading-relaxed">{d.claim}</p>
          </div>

          {/* RULING STANDARD */}
          <div className="bg-blue-400/4 border border-blue-400/15 rounded-xl p-4">
            <div className="text-[8px] tracking-widest uppercase text-blue-400/50 mb-2">{t.detail.rulingLabel}</div>
            <p className="text-[12px] text-blue-400/70 leading-relaxed">{d.rulingStd}</p>
          </div>

          {/* AI JUDGE NOTE */}
          <div className="bg-purple-400/5 border border-purple-400/15 rounded-xl p-3 flex items-center gap-3">
            <span className="text-xl flex-shrink-0">⚖️</span>
            <p className="text-[11px] text-purple-400/65 leading-relaxed">{t.detail.judgeNote}</p>
          </div>

          {/* CHOOSE SIDE + BET */}
          <div className="border-t border-white/5 pt-4 flex flex-col gap-3">
            <div className="text-[9px] tracking-widest uppercase text-white/20">{isAI ? t.detail.takeSide : t.card.enterDuel}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div onClick={() => setSelectedSide('red')}
                className={`rounded-xl p-3 cursor-pointer border transition-colors text-center ${selectedSide === 'red' ? 'border-red-400/60 bg-red-400/10' : 'border-red-400/20 bg-red-400/5 hover:bg-red-400/10'}`}>
                <div className="text-[10px] font-semibold text-red-400 mb-1">👑 {duel.challenger.name}</div>
                <div className="text-[8px] text-red-400/50">{duel.supportRed}{t.duelModal.supportPct}</div>
              </div>
              <div onClick={() => setSelectedSide('blue')}
                className={`rounded-xl p-3 cursor-pointer border transition-colors text-center ${selectedSide === 'blue' ? (isAI ? 'border-purple-400/60 bg-purple-400/10' : 'border-blue-400/60 bg-blue-400/10') : (isAI ? 'border-purple-400/20 bg-purple-400/5 hover:bg-purple-400/10' : 'border-blue-400/20 bg-blue-400/5 hover:bg-blue-400/10')}`}>
                <div className={`text-[10px] font-semibold mb-1 ${isAI ? 'text-purple-400' : 'text-blue-400'}`}>⚔️ {isAI ? 'AI Judge' : (duel.defender?.name ?? t.card.openSlot)}</div>
                <div className={`text-[8px] ${isAI ? 'text-purple-400/50' : 'text-blue-400/50'}`}>{100 - duel.supportRed}{t.duelModal.supportPct}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <input type="number" min="0" step="0.001" value={stake} onChange={e => setStake(e.target.value)}
                className="flex-1 bg-[#10101e] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/80 placeholder-white/20 outline-none focus:border-red-400/50"
                placeholder={t.duelModal.stakePlaceholder} />
              <div className={`bg-[#10101e] border rounded-xl px-3 py-2.5 text-sm font-semibold flex items-center min-w-[56px] justify-center ${isAI ? 'border-purple-400/30 text-purple-400' : 'border-red-400/30 text-red-400'}`}>{token}</div>
            </div>
            {stakeNum > 0 && (
              <div className="bg-white/5 rounded-xl px-3 py-2 flex justify-between items-center">
                <div className="text-center">
                  <div className="text-[8px] text-white/20 mb-0.5">{t.duelModal.odds}</div>
                  <div className="text-[11px] font-semibold text-white/60">{odds}x</div>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div className="text-center">
                  <div className="text-[8px] text-white/20 mb-0.5">{t.duelModal.payout}</div>
                  <div className={`text-[11px] font-semibold ${isAI ? 'text-purple-400' : 'text-red-400'}`}>{payout} {token}</div>
                </div>
              </div>
            )}
            <button disabled={!selectedSide || !stakeNum}
              className={`w-full py-3 rounded-xl text-sm font-semibold border transition-colors ${!selectedSide || !stakeNum ? 'text-white/20 border-white/10 bg-transparent cursor-not-allowed' : isAI ? 'text-purple-400 border-purple-400/50 bg-purple-400/10 hover:bg-purple-400/20 cursor-pointer' : 'text-red-400 border-red-400/50 bg-red-400/10 hover:bg-red-400/20 cursor-pointer'}`}>
              🔒 {isAI ? t.modal.submitAI : t.modal.submit}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [lang, setLang] = useState<Lang>('en');
  const [activeFilter, setActiveFilter] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedDuel, setSelectedDuel] = useState<Duel | null>(null);
  const t = LANG[lang];

  return (
    <div className="min-h-screen bg-[#080812] text-white">
      <style>{`@keyframes danmaku { from { transform: translateX(500px); } to { transform: translateX(-800px); } } @keyframes fadeInUp { from { opacity:0; transform:translateX(-50%) translateY(6px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
      <div className="bg-[#0c0c1a] border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-white/90">⚖️ {t.appName}</span>
          <span className="text-[9px] tracking-widest uppercase text-white/20 border border-white/10 rounded px-2 py-0.5">{t.arena}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLang(l => l === 'en' ? 'zh' : 'en')} className="text-xs text-white/40 bg-[#10101e] border border-white/10 rounded-lg px-3 py-1.5 hover:border-white/20 transition-colors">
            {lang === 'en' ? '中文' : 'EN'}
          </button>
          <ConnectButton />
        </div>
      </div>

      <Ticker t={t} lang={lang} />

      <div className="border-b border-white/5" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
        {[{ label: t.stats.duels, value: '1,247' }, { label: t.stats.pool, value: '48.3 ETH' }, { label: t.stats.settled, value: '892.6 ETH' }].map((s, i) => (
          <div key={i} className={`py-2.5 text-center ${i < 2 ? 'border-r border-white/5' : ''}`}>
            <div className="text-[8px] tracking-widest uppercase text-white/20 mb-0.5">{s.label}</div>
            <div className="text-base font-bold text-white/75">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#0a0a18] border-b border-white/5 px-4 py-2 flex items-center justify-between">
        <div className="flex gap-1.5">
          {t.filters.map((f, i) => (
            <button key={f} onClick={() => setActiveFilter(i)} className={`text-[10px] px-3 py-1.5 rounded-full border transition-colors ${activeFilter === i ? 'bg-red-400/15 text-red-400 border-red-400/50' : 'bg-[#10101e] text-white/30 border-white/10 hover:border-white/20'}`}>{f}</button>
          ))}
        </div>
        <button onClick={() => setShowModal(true)} className="text-xs font-semibold text-red-300 bg-[#10101e] border border-red-400/70 rounded-xl px-4 py-1.5 hover:bg-red-400/10 transition-colors" style={{ boxShadow: '0 0 10px rgba(255,107,107,0.2)' }}>
          {t.issueBtn}
        </button>
      </div>

      <div className="p-4"><LiveCard t={t} /></div>

      <div className="px-4 pb-2">
        <div className="text-[9px] tracking-widest uppercase text-white/20 mb-3">All Duels</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {DUELS.map(d => <DuelCard key={d.id} duel={d} t={t} onClick={() => setSelectedDuel(d)} onEnter={() => setSelectedDuel(d)} />)}
        </div>
      </div>

      <div className="pb-8 pt-4 text-center">
        <button className="text-xs text-white/30 bg-[#0c0c1a] border border-white/10 rounded-xl px-6 py-2.5 hover:border-white/20 transition-colors">{t.loadMore}</button>
      </div>

      {showModal && <IssueModal t={t} onClose={() => setShowModal(false)} />}
      {selectedDuel && <DuelModal duel={selectedDuel} t={t} onClose={() => setSelectedDuel(null)} />}
    </div>
  );
}
