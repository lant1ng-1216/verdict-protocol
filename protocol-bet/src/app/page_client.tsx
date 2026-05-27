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

// Beam avatar — boring-avatars beam style, inline SVG implementation
const BEAM_COLORS = [
  ['#7C3AED','#F43F5E'],['#3B82F6','#06B6D4'],['#059669','#D97706'],
  ['#EC4899','#8B5CF6'],['#F59E0B','#EF4444'],['#6366F1','#14B8A6'],
  ['#0EA5E9','#7C3AED'],['#10B981','#F43F5E'],['#8B5CF6','#EC4899'],
];
function beamHash(addr: string): number[] {
  const s = (addr || '0xabcdef').toLowerCase().replace('0x','').padEnd(40,'0');
  return Array.from({length:10}, (_,i) => parseInt(s.slice(i*4,(i+1)*4)||'0',16) % 100);
}
function BeamAvatar({ addr, size = 36, square = false }: { addr: string; size?: number; square?: boolean }) {
  const nums = beamHash(addr);
  const ci = nums[0] % BEAM_COLORS.length;
  const [bg, fg] = BEAM_COLORS[ci];
  const angle = -15 + (nums[1] % 30);
  const tx = -10 + (nums[2] % 20);
  const ty = -10 + (nums[3] % 20);
  // eyes
  const ex1 = 10 + (nums[4] % 8); const ey = 14 + (nums[5] % 4);
  const ex2 = 22 + (nums[6] % 8);
  const er = 2.5 + (nums[7] % 2) * 0.5;
  // mouth
  const mx = 12 + (nums[8] % 6); const my = 24 + (nums[9] % 3);
  const mw = 10 + (nums[8] % 6);
  const radius = square ? 4 : size / 2;
  const uid = addr.replace(/[^a-zA-Z0-9]/g,'').slice(0,8) || 'beam';
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0,borderRadius:square?'8px':'50%',display:'block'}}>
      <mask id={`bm-${uid}`} maskUnits="userSpaceOnUse" x="0" y="0" width="40" height="40">
        <rect width="40" height="40" rx={radius} fill="#fff"/>
      </mask>
      <g mask={`url(#bm-${uid})`}>
        <rect width="40" height="40" fill={bg}/>
        <rect x="0" y="0" width="40" height="40"
          transform={`translate(${tx} ${ty}) rotate(${angle} 20 20)`}
          rx="8" fill={fg}/>
        <circle cx={ex1} cy={ey} r={er} fill="rgba(255,255,255,0.85)"/>
        <circle cx={ex2} cy={ey} r={er} fill="rgba(255,255,255,0.85)"/>
        <path d={`M${mx} ${my} Q20 ${my+5} ${mx+mw} ${my}`}
          stroke="rgba(255,255,255,0.9)" strokeWidth="2" fill="none" strokeLinecap="round"/>
      </g>
    </svg>
  );
}
const GradientAvatar = ({ addr, size = 36, className = '' }: { addr: string; size?: number; className?: string }) => (
  <BeamAvatar addr={addr} size={size} />
);
// ─── STAMP SHARE CARD ────────────────────────────────────────────────────────
function StampCard({ duel, id }: { duel: Duel; id: string }) {
  const claimText = (duel as any)._claimText || duel.id;
  const ruleText = (duel as any)._ruleText || '';
  const totalPot = (duel.challenger.amount + (duel.defender?.amount ?? duel.challenger.amount)).toFixed(3);
  const isSettled = duel.status === 'live' && duel.watchers > 500; // placeholder, real settled handled separately
  const isOpen = duel.status === 'open';
  const isLive = duel.status === 'live' || duel.status === 'ending';
  const bgColor = '#5B21B6';
  const statusLabel = isOpen ? '招募中' : isLive ? '进行中' : '已裁定';
  const statusEn = isOpen ? 'Open' : isLive ? 'Live' : 'Settled';
  const duelId = String((duel as any)._onChainId || duel.id).padStart(4,'0');
  const date = new Date().toISOString().slice(0,10).replace(/-/g,'·');

  return (
    <div id={id} style={{
      width:'260px', background:'#fff', position:'relative', padding:'14px',
      fontFamily:"'DM Sans', sans-serif",
    }}>
      {/* PERFORATED EDGE via box-shadow trick */}
      <div style={{
        border:'1.5px solid rgba(124,58,237,0.2)', borderRadius:'3px', overflow:'hidden',
        position:'relative'
      }}>
        {/* ART AREA */}
        <div style={{height:'130px', background:bgColor, display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden'}}>
          {/* decorative circles */}
          <div style={{position:'absolute',width:'180px',height:'180px',borderRadius:'50%',
            background:'rgba(255,255,255,0.06)',top:'50%',left:'50%',transform:'translate(-50%,-50%)'}}/>
          <div style={{position:'absolute',width:'130px',height:'130px',borderRadius:'50%',
            border:'1px solid rgba(255,255,255,0.08)',top:'50%',left:'50%',transform:'translate(-50%,-50%)'}}/>
          {/* corners */}
          {['VP','2026','BNB','#'+duelId].map((t,i) => (
            <span key={i} style={{position:'absolute',fontSize:'8px',fontWeight:700,letterSpacing:'1px',
              color:'rgba(255,255,255,0.5)',fontFamily:'monospace',
              ...(i===0?{top:'7px',left:'10px'}:i===1?{top:'7px',right:'10px'}:i===2?{bottom:'7px',left:'10px'}:{bottom:'7px',right:'10px'})
            }}>{t}</span>
          ))}
          <img src="/verdict_logo.png" alt="" style={{width:'52px',height:'52px',objectFit:'contain',marginBottom:'6px',filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.25))'}} />
          <div style={{fontSize:'11px',fontWeight:700,color:'#fff',letterSpacing:'0.5px',textTransform:'uppercase'}}>Verdict Protocol</div>
          <div style={{fontSize:'8px',color:'rgba(255,255,255,0.55)',letterSpacing:'0.8px',textTransform:'uppercase',marginTop:'2px'}}>
            On-Chain Duel · {statusEn}
          </div>
        </div>
        {/* VALUE BAR */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
          padding:'5px 10px',borderBottom:'1px solid #EEE9FC',background:'#fafafa'}}>
          <span style={{fontSize:'8px',fontWeight:700,color:'#9CA3AF',letterSpacing:'0.5px',textTransform:'uppercase'}}>{duel.network}</span>
          <span style={{fontSize:'12px',fontWeight:700,color:'#5B21B6'}}>{totalPot} {duel.token}</span>
          <span style={{fontSize:'8px',fontWeight:600,padding:'2px 7px',borderRadius:'10px',
            background: isOpen?'#EFF6FF':isLive?'#FFF1F2':'#ECFDF5',
            color: isOpen?'#1D4ED8':isLive?'#BE123C':'#065F46'
          }}>{statusLabel}</span>
        </div>
        {/* INFO */}
        <div style={{padding:'10px'}}>
          <div style={{background:'#F9F8FF',borderRadius:'8px',padding:'7px 9px',marginBottom:'8px',
            borderLeft:'2px solid #7C3AED'}}>
            <div style={{fontSize:'11px',fontWeight:600,color:'#1A1A2E',lineHeight:1.4,
              display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
              {claimText}
            </div>
          </div>
          {/* PLAYERS */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 20px 1fr',gap:'4px',alignItems:'center',marginBottom:'7px'}}>
            <div style={{background:'#FFF1F2',borderRadius:'7px',padding:'6px 7px',textAlign:'center'}}>
              <div style={{fontSize:'7px',color:'#9CA3AF',marginBottom:'2px',textTransform:'uppercase'}}>Challenger</div>
              <div style={{fontSize:'8px',color:'#6B7280',fontFamily:'monospace',marginBottom:'2px'}}>{duel.challenger.addr}</div>
              <div><span style={{fontSize:'15px',fontWeight:700,color:'#F43F5E'}}>{duel.challenger.amount}</span>
              <span style={{fontSize:'8px',fontWeight:600,padding:'1px 4px',borderRadius:'4px',
                background:'#FFE4E6',color:'#F43F5E',marginLeft:'2px'}}>{duel.token}</span></div>
            </div>
            <div style={{display:'flex',justifyContent:'center'}}>
              <span style={{fontSize:'8px',fontWeight:700,color:'#7C3AED',background:'#F5F3FF',
                padding:'2px 3px',borderRadius:'4px'}}>VS</span>
            </div>
            {duel.defender ? (
              <div style={{background:'#EFF6FF',borderRadius:'7px',padding:'6px 7px',textAlign:'center'}}>
                <div style={{fontSize:'7px',color:'#9CA3AF',marginBottom:'2px',textTransform:'uppercase'}}>Defender</div>
                <div style={{fontSize:'8px',color:'#6B7280',fontFamily:'monospace',marginBottom:'2px'}}>{duel.defender.addr}</div>
                <div><span style={{fontSize:'15px',fontWeight:700,color:'#3B82F6'}}>{duel.defender.amount}</span>
                <span style={{fontSize:'8px',fontWeight:600,padding:'1px 4px',borderRadius:'4px',
                  background:'#DBEAFE',color:'#3B82F6',marginLeft:'2px'}}>{duel.token}</span></div>
              </div>
            ) : (
              <div style={{background:'#F9F8FF',border:'1px dashed #C4B5FD',borderRadius:'7px',
                padding:'6px 7px',textAlign:'center',minHeight:'54px',display:'flex',
                flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'2px'}}>
                <span style={{fontSize:'16px',color:'#C4B5FD'}}>?</span>
                <span style={{fontSize:'7px',color:'#C4B5FD'}}>Waiting</span>
              </div>
            )}
          </div>
          {/* SUPPORT BAR */}
          {duel.defender && (
            <div style={{marginBottom:'7px'}}>
              <div style={{height:'4px',borderRadius:'4px',background:'#F3F0FB',overflow:'hidden',
                display:'flex',marginBottom:'2px'}}>
                <div style={{background:'#F43F5E',borderRadius:'4px 0 0 4px',width:`${duel.supportRed}%`}}/>
                <div style={{background:'#3B82F6',borderRadius:'0 4px 4px 0',flex:1}}/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'8px',fontWeight:600}}>
                <span style={{color:'#F43F5E'}}>{duel.supportRed}%</span>
                <span style={{color:'#C4B5FD',fontSize:'7px'}}>Community Vote</span>
                <span style={{color:'#3B82F6'}}>{100-duel.supportRed}%</span>
              </div>
            </div>
          )}
          <div style={{display:'flex',gap:'3px',flexWrap:'wrap'}}>
            <span style={{fontSize:'8px',fontWeight:500,padding:'2px 6px',borderRadius:'7px',
              background:'#F9F8FF',border:'1px solid #EEE9FC',color:'#374151'}}>⏰ {duel.expires}</span>
            <span style={{fontSize:'8px',fontWeight:500,padding:'2px 6px',borderRadius:'7px',
              background:'#F9F8FF',border:'1px solid #EEE9FC',color:'#374151'}}>💰 {totalPot} {duel.token}</span>
          </div>
        </div>
        {/* FOOTER */}
        <div style={{borderTop:'1px dashed #EEE9FC',padding:'5px 10px',
          display:'flex',justifyContent:'space-between',alignItems:'center',background:'#fafafa'}}>
          <span style={{fontSize:'7px',color:'#C4B5FD',letterSpacing:'0.3px'}}>verdictprotocol.online</span>
          <span style={{fontSize:'8px',fontWeight:700,color:'#9CA3AF',fontFamily:'monospace'}}>#{duelId}</span>
        </div>
      </div>
      {/* POSTMARK */}
      <svg style={{position:'absolute',top:'18px',right:'18px',opacity:0.12,transform:'rotate(15deg)',zIndex:10}}
        width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r="32" fill="none" stroke="#7C3AED" strokeWidth="2.5"/>
        <circle cx="36" cy="36" r="24" fill="none" stroke="#7C3AED" strokeWidth="1"/>
        <text x="36" y="32" textAnchor="middle" fontSize="7" fontWeight="700" fill="#7C3AED" fontFamily="monospace">VERDICT</text>
        <text x="36" y="41" textAnchor="middle" fontSize="6" fill="#7C3AED" fontFamily="monospace">PROTOCOL</text>
        <text x="36" y="50" textAnchor="middle" fontSize="5.5" fill="#7C3AED" fontFamily="monospace">{date}</text>
      </svg>
    </div>
  );
}

async function generateStampImage(duel: Duel) {
  const claimText = (duel as any)._claimText || String(duel.id);
  const totalPot = (duel.challenger.amount + (duel.defender?.amount ?? duel.challenger.amount)).toFixed(3);
  const duelId = String((duel as any)._onChainId || duel.id).padStart(4,'0');
  const isOpen = duel.status === 'open';
  const isLive = duel.status === 'live' || duel.status === 'ending';
  const statusLabel = isOpen ? '招募中' : isLive ? '进行中' : '已裁定';
  const statusEn = isOpen ? 'Open' : isLive ? 'Live' : 'Settled';
  const artBg = isOpen ? '#5B21B6' : isLive ? '#4C1D95' : '#065F46';
  const stBg = isOpen ? '#EFF6FF' : isLive ? '#FFF1F2' : '#ECFDF5';
  const stColor = isOpen ? '#1D4ED8' : isLive ? '#BE123C' : '#065F46';
  const valColor = isOpen || isLive ? '#5B21B6' : '#059669';
  const date = new Date().toISOString().slice(0,10).replace(/-/g,'·');

  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;left:-9999px;top:-9999px;z-index:-999;font-family:DM Sans,system-ui,sans-serif;';

  // STAMP OUTER —牛皮纸背景 + 锯齿边
  wrap.innerHTML = `
<div style="width:300px;background:#E8E0D4;padding:14px;position:relative;">
  <div style="position:absolute;inset:0;
    background:
      radial-gradient(circle at 0 50%,#E8E0D4 7px,transparent 7px),
      radial-gradient(circle at 100% 50%,#E8E0D4 7px,transparent 7px),
      radial-gradient(circle at 50% 0,#E8E0D4 7px,transparent 7px),
      radial-gradient(circle at 50% 100%,#E8E0D4 7px,transparent 7px);
    background-size:15px 15px;
    background-position:-7px 50%,calc(100% + 7px) 50%,50% -7px,50% calc(100% + 7px);
    background-repeat:repeat-y,repeat-y,repeat-x,repeat-x;
    z-index:1;pointer-events:none;">
  </div>
  <div style="position:relative;z-index:2;border:1.5px solid rgba(124,58,237,0.2);border-radius:3px;overflow:hidden;background:#fff;">

    <!-- ART AREA -->
    <div style="height:225px;background:${artBg};display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;overflow:hidden;">
      <div style="position:absolute;width:240px;height:240px;border-radius:50%;background:rgba(255,255,255,0.05);top:44%;left:50%;transform:translate(-50%,-50%);"></div>
      <div style="position:absolute;width:185px;height:185px;border-radius:50%;border:1px solid rgba(255,255,255,0.08);top:44%;left:50%;transform:translate(-50%,-50%);"></div>
      <div style="position:absolute;width:130px;height:130px;border-radius:50%;border:0.5px solid rgba(255,255,255,0.06);top:44%;left:50%;transform:translate(-50%,-50%);"></div>
      <span style="position:absolute;top:7px;left:10px;font-size:9px;font-weight:700;letter-spacing:1px;color:rgba(255,255,255,0.6);font-family:monospace;">VP</span>
      <span style="position:absolute;top:7px;right:10px;font-size:9px;font-weight:700;letter-spacing:1px;color:rgba(255,255,255,0.6);font-family:monospace;">2026</span>
      <span style="position:absolute;bottom:7px;left:10px;font-size:9px;font-weight:700;letter-spacing:1px;color:rgba(255,255,255,0.6);font-family:monospace;">BNB</span>
      <span style="position:absolute;bottom:7px;right:10px;font-size:9px;font-weight:700;letter-spacing:1px;color:rgba(255,255,255,0.6);font-family:monospace;">#${duelId}</span>
      <img src="/verdict_logo.png" style="width:155px;height:155px;object-fit:contain;margin-bottom:2px;filter:drop-shadow(0 4px 20px rgba(0,0,0,0.35));" crossorigin="anonymous" onerror="this.style.display='none'"/>
      <div style="font-size:13px;font-weight:700;color:#fff;letter-spacing:0.5px;text-transform:uppercase;text-shadow:0 1px 4px rgba(0,0,0,0.2);line-height:1;">VERDICT PROTOCOL</div>
      <div style="font-size:9px;color:rgba(255,255,255,0.6);letter-spacing:1px;text-transform:uppercase;margin-top:2px;">ON-CHAIN DUEL · ${statusEn.toUpperCase()}</div>
    </div>

    <!-- VALUE BAR -->
    <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 10px;border-bottom:1px solid #EEE9FC;background:#fafafa;">
      <span style="font-size:9px;font-weight:700;color:#9CA3AF;letter-spacing:0.5px;font-family:monospace;">BNB TESTNET</span>
      <span style="font-size:14px;font-weight:700;color:${valColor};">${totalPot} ${duel.token}</span>
      <span style="font-size:9px;font-weight:600;padding:3px 9px;border-radius:10px;background:${stBg};color:${stColor};">${statusLabel}</span>
    </div>

    <!-- INFO -->
    <div style="padding:10px;">
      <div style="background:#F9F8FF;border-radius:8px;padding:8px 10px;margin-bottom:8px;border-left:2px solid #7C3AED;">
        <div style="font-size:12px;font-weight:600;color:#1A1A2E;line-height:1.5;word-break:break-word;">${claimText}</div>
      </div>

      <!-- PLAYERS -->
      <div style="display:grid;grid-template-columns:1fr 20px 1fr;gap:4px;align-items:center;margin-bottom:7px;">
        <div style="background:#FFF1F2;border-radius:7px;padding:6px 7px;text-align:center;">
          <div style="font-size:8px;color:#9CA3AF;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.3px;font-weight:600;">Challenger</div>
          <div style="font-size:9px;color:#6B7280;font-family:monospace;margin-bottom:3px;">${duel.challenger.addr}</div>
          <div style="font-size:16px;font-weight:700;color:#F43F5E;margin-top:2px;">${duel.challenger.amount} <span style="font-size:9px;font-weight:600;padding:2px 5px;border-radius:4px;background:#FFE4E6;color:#F43F5E;">${duel.token}</span></div>
        </div>
        <div style="text-align:center;">
          <span style="font-size:8px;font-weight:700;color:#7C3AED;background:#F5F3FF;padding:2px 3px;border-radius:4px;">VS</span>
        </div>
        ${duel.defender ? `
        <div style="background:#EFF6FF;border-radius:7px;padding:6px 7px;text-align:center;">
          <div style="font-size:8px;color:#9CA3AF;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.3px;font-weight:600;">Defender</div>
          <div style="font-size:8px;color:#6B7280;font-family:monospace;margin-bottom:2px;">${duel.defender.addr}</div>
          <div style="font-size:16px;font-weight:700;color:#3B82F6;margin-top:2px;">${duel.defender.amount} <span style="font-size:9px;font-weight:600;padding:2px 5px;border-radius:4px;background:#DBEAFE;color:#3B82F6;">${duel.token}</span></div>
        </div>` : `
        <div style="background:#F9F8FF;border:1px dashed #C4B5FD;border-radius:7px;padding:6px 7px;text-align:center;min-height:54px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;">
          <span style="font-size:16px;color:#C4B5FD;">?</span>
          <span style="font-size:7px;color:#C4B5FD;">Waiting</span>
        </div>`}
      </div>

      ${duel.defender ? `
      <!-- BAR -->
      <div style="margin-bottom:7px;">
        <div style="height:4px;border-radius:4px;background:#F3F0FB;overflow:hidden;display:flex;margin-bottom:2px;">
          <div style="background:#F43F5E;width:${duel.supportRed}%;border-radius:4px 0 0 4px;"></div>
          <div style="background:#3B82F6;flex:1;border-radius:0 4px 4px 0;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:8px;font-weight:600;">
          <span style="color:#F43F5E;font-size:10px;font-weight:700;">${duel.supportRed}%</span>
          <span style="color:#C4B5FD;font-size:9px;font-weight:500;">Community Vote</span>
          <span style="color:#3B82F6;font-size:10px;font-weight:700;">${100-duel.supportRed}%</span>
        </div>
      </div>` : ''}

      <!-- CHIPS -->
      <div style="display:flex;gap:3px;flex-wrap:wrap;">
        <span style="font-size:9px;font-weight:500;padding:3px 8px;border-radius:8px;background:#F9F8FF;border:1px solid #EEE9FC;color:#374151;">⏰ ${duel.expires}</span>
        <span style="font-size:9px;font-weight:500;padding:3px 8px;border-radius:8px;background:#F9F8FF;border:1px solid #EEE9FC;color:#374151;">💰 ${totalPot} ${duel.token}</span>
      </div>
    </div>

    <!-- FOOT -->
    <div style="border-top:1px dashed #EEE9FC;padding:5px 10px;display:flex;justify-content:space-between;align-items:center;background:#fafafa;">
      <span style="font-size:9px;color:#C4B5FD;letter-spacing:0.3px;">verdictprotocol.online</span>
      <span style="font-size:9px;font-weight:700;color:#9CA3AF;font-family:monospace;">#${duelId}</span>
    </div>
  </div>

  <!-- POSTMARK -->
  <svg style="position:absolute;top:18px;right:18px;opacity:0.12;transform:rotate(15deg);z-index:10;" width="72" height="72" viewBox="0 0 72 72">
    <circle cx="36" cy="36" r="32" fill="none" stroke="${isOpen||isLive?'#7C3AED':'#059669'}" stroke-width="2.5"/>
    <circle cx="36" cy="36" r="24" fill="none" stroke="${isOpen||isLive?'#7C3AED':'#059669'}" stroke-width="1"/>
    <text x="36" y="32" text-anchor="middle" font-size="7" font-weight="700" fill="${isOpen||isLive?'#7C3AED':'#059669'}" font-family="monospace">VERDICT</text>
    <text x="36" y="41" text-anchor="middle" font-size="6" fill="${isOpen||isLive?'#7C3AED':'#059669'}" font-family="monospace">${isLive?'PROTOCOL':'SETTLED'}</text>
    <text x="36" y="50" text-anchor="middle" font-size="5.5" fill="${isOpen||isLive?'#7C3AED':'#059669'}" font-family="monospace">${date}</text>
  </svg>
</div>`;

  document.body.appendChild(wrap);
  await new Promise(r => setTimeout(r, 400));

  try {
    const h2c = (await import('html2canvas')).default;
    const el = wrap.firstElementChild as HTMLElement;
    const canvas = await h2c(el, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#E8E0D4',
      logging: false,
      onclone: (doc) => {
        const imgs = doc.querySelectorAll('img');
        imgs.forEach(img => { img.crossOrigin = 'anonymous'; });
      }
    });
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({'image/png': blob})]);
        showToast('✓ 分享卡片已复制到剪贴板');
      } catch {
        const link = document.createElement('a');
        link.download = 'verdict-'+duelId+'.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('✓ 图片已下载');
      }
    }, 'image/png');
  } finally {
    document.body.removeChild(wrap);
  }
}

function showToast(msg: string) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#7C3AED;color:#fff;padding:10px 22px;border-radius:20px;font-size:13px;font-weight:600;z-index:9999;font-family:DM Sans,sans-serif;box-shadow:0 4px 20px rgba(124,58,237,0.3);';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity 0.3s'; setTimeout(()=>t.remove(),300); }, 1800);
}



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
      detail: { challenger:'发起方', defender:'接受方', communityVote:'社区支持率', audiencePool:'观众池', watching:'观战', duelInProgress:'⏳ 对决进行中 — 到期后可操作', duelInProgressSub:'到期后可提交证据申请裁定，或与对方达成共识直接结算。', judgeRed:'⚖️ 裁红方胜', judgeBlue:'⚖️ 裁蓝方胜', judging:'裁定中...', mutualSettle:'共识结算', submitEvidence:'提交证据', requestRuling:'申请裁定', copyLink:'复制分享链接', submitted:'✅ 已提交', waitingConfirm:'你已声明 ', waitingConfirmSuffix:' 胜出，等待对方在 48 小时内确认。', mutualTitle:'⚖️ 共识结算', mutualDesc:'你认为谁赢得了这场对决？对方需在 48小时 内确认，若双方结果一致则自动结算。', iWon:'我赢了', theyWon:'对方赢了', cancel:'取消', confirm:'确认提交', submitting:'提交中...' },
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
    <div className="bg-[#F3F0FB] border-b border-[#EEE9FC] px-4 py-1.5 flex items-center gap-3 overflow-hidden">
      <div className="flex items-center gap-1.5 text-[9px] tracking-widest uppercase text-[#7C3AED] whitespace-nowrap flex-shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-pulse" />{t.live}
      </div>
      <div className="overflow-hidden flex-1">
        <div ref={ref} className="flex gap-12 whitespace-nowrap" style={{ width: 'max-content' }}>
          {[...t.ticker, ...t.ticker].map((item, i) => <span key={i} className="text-[10px] text-[#9CA3AF]">{item}</span>)}
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
      <button onClick={() => setOpen(o => !o)} className={`w-full bg-[#F9F8FF] border rounded-xl px-3 py-2.5 flex items-center gap-2 text-sm outline-none transition-colors ${open ? 'border-[#7C3AED] rounded-b-none' : 'border-[#EEE9FC] hover:border-[#C4B5FD]'}`}>
        {selectedChain ? (<><img src={selectedChain.logo} alt={selectedChain.name} className="w-5 h-5 rounded-full flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /><span className="text-[#1A1A2E] flex-1 text-left">{selectedChain.name}</span><span className="text-[#9CA3AF] text-xs">{selectedChain.token}</span></>) : <span className="text-[#9CA3AF] flex-1 text-left">{placeholder}</span>}
        <span className={`text-[#9CA3AF] text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border border-[#7C3AED] border-t-0 rounded-b-xl overflow-hidden z-20 max-h-48 overflow-y-auto">
          {CHAINS.map(c => (
            <button key={c.key} onClick={() => { onSelect(c); setOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${selectedChain?.key === c.key ? 'bg-red-400/8' : ''}`}>
              <img src={c.logo} alt={c.name} className="w-5 h-5 rounded-full flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <span className="text-[#1A1A2E] flex-1 text-left">{c.name}</span>
              <span className="text-[#9CA3AF] text-xs">{c.token}</span>
              {selectedChain?.key === c.key && <span className="text-[#7C3AED] text-xs">✓</span>}
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
    <div style={{position:'fixed',inset:0,background:'rgba(100,80,160,0.25)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}} onClick={onClose}>
      <div style={{background:'#fff',border:'1.5px solid #EEE9FC',borderRadius:'20px',width:'100%',maxWidth:'448px',overflow:'hidden',boxShadow:'0 8px 40px rgba(124,58,237,0.10)'}} onClick={e => e.stopPropagation()}>
        {/* HEADER */}
        <div style={{background:'#F7F5FF',borderBottom:'1px solid #EEE9FC',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:'14px',fontWeight:600,color:'#1A1A2E'}}>{m.title}</span>
          <button onClick={onClose} style={{color:'#9CA3AF',fontSize:'20px',lineHeight:1,background:'none',border:'none',cursor:'pointer'}}>×</button>
        </div>

        {/* BODY */}
        <div style={{padding:'20px',display:'flex',flexDirection:'column',gap:'16px',maxHeight:'70vh',overflowY:'auto'}}>

          {/* 你的声明 */}
          <div>
            <div style={{fontSize:'9px',letterSpacing:'0.1em',textTransform:'uppercase',color:'#374151',marginBottom:'6px'}}>{m.claimLabel}</div>
            <textarea
              value={claim}
              onChange={e => setClaim(e.target.value)}
              rows={3}
              placeholder={m.claimPlaceholder}
              style={{width:'100%',background:'#F9F8FF',border:'1.5px solid #DDD6FE',borderRadius:'12px',padding:'10px 12px',fontSize:'14px',color:'#1A1A2E',outline:'none',resize:'none',boxSizing:'border-box'}}
            />
          </div>

          {/* 裁定标准 */}
          <div>
            <div style={{fontSize:'9px',letterSpacing:'0.1em',textTransform:'uppercase',color:'#374151',marginBottom:'6px'}}>{m.rulingLabel}</div>
            <textarea
              value={rule}
              onChange={e => setRule(e.target.value)}
              rows={2}
              placeholder={m.rulingPlaceholder}
              style={{width:'100%',background:'#F9F8FF',border:'1.5px solid #DDD6FE',borderRadius:'12px',padding:'10px 12px',fontSize:'14px',color:'#1A1A2E',outline:'none',resize:'none',boxSizing:'border-box'}}
            />
          </div>

          {/* Telegram 通知 */}
          <div>
            <div style={{fontSize:'9px',letterSpacing:'0.1em',textTransform:'uppercase',color:'#374151',marginBottom:'6px'}}>{m.tgLabel}</div>
            <input
              type="text"
              value={tgUsername}
              onChange={e => setTgUsername(e.target.value)}
              placeholder={m.tgPlaceholder}
              style={{width:'100%',background:'#F9F8FF',border:'1.5px solid #DDD6FE',borderRadius:'12px',padding:'10px 12px',fontSize:'14px',color:'#1A1A2E',outline:'none',boxSizing:'border-box'}}
            />
            <div style={{fontSize:'9px',color:'#6B7280',marginTop:'4px'}}>先给 @MemeCourt_Bot 发 /start 才能收到通知</div>
          </div>

          {/* 网络 */}
          <div>
            <div style={{fontSize:'9px',letterSpacing:'0.1em',textTransform:'uppercase',color:'#374151',marginBottom:'6px'}}>{m.networkLabel}</div>
            <div style={{background:'#F9F8FF',border:'1px solid #EEE9FC',borderRadius:'12px',padding:'10px 12px',display:'flex',alignItems:'center',gap:'8px'}}>
              <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#4ade80',flexShrink:0}} />
              <span style={{color:'#1A1A2E',flex:1,fontSize:'14px',fontWeight:500}}>{currentNetwork}</span>
              <span style={{color:'#9CA3AF',fontSize:'12px'}}>{currentToken}</span>
            </div>
          </div>

          {/* 押注金额 */}
          <div>
            <div style={{fontSize:'9px',letterSpacing:'0.1em',textTransform:'uppercase',color:'#374151',marginBottom:'6px'}}>{m.stakeLabel}</div>
            <div style={{display:'flex',gap:'8px'}}>
              <input
                type="number" min="0" step="0.001"
                value={stake}
                onChange={e => setStake(e.target.value)}
                placeholder={m.stakePlaceholder}
                style={{flex:1,background:'#F9F8FF',border:'1.5px solid #DDD6FE',borderRadius:'12px',padding:'10px 12px',fontSize:'14px',color:'#1A1A2E',outline:'none'}}
              />
              <div style={{background:'#F5F3FF',border:'1px solid #DDD6FE',borderRadius:'12px',padding:'10px 12px',fontSize:'14px',fontWeight:600,color:'#7C3AED',minWidth:'60px',textAlign:'center'}}>{currentToken}</div>
            </div>
          </div>

          {/* 分配比例 */}
          <div style={{background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:'12px',padding:'16px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
              <div style={{fontSize:'9px',letterSpacing:'0.1em',textTransform:'uppercase',color:'#D97706'}}>对决池分配比例</div>
              <div style={{fontSize:'16px',fontWeight:'bold',color:'#D97706'}}>{audienceRatio}%</div>
            </div>
            <input type="range" min="0" max="100" step="5" value={audienceRatio} onChange={e => setAudienceRatio(Number(e.target.value))} style={{width:'100%',marginBottom:'12px',accentColor:'#7C3AED'}} />
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'12px'}}>
              <div style={{background:'#FFF1F2',border:'1px solid #FFE4E6',borderRadius:'8px',padding:'10px',textAlign:'center'}}>
                <div style={{fontSize:'7px',letterSpacing:'0.1em',textTransform:'uppercase',color:'#F43F5E',marginBottom:'4px'}}>赢家获得</div>
                <div style={{fontSize:'16px',fontWeight:'bold',color:'#F43F5E'}}>{100-audienceRatio}%</div>
                <div style={{fontSize:'8px',color:'#F43F5E'}}>对决池</div>
              </div>
              <div style={{background:'#EFF6FF',border:'1px solid #DBEAFE',borderRadius:'8px',padding:'10px',textAlign:'center'}}>
                <div style={{fontSize:'7px',letterSpacing:'0.1em',textTransform:'uppercase',color:'#3B82F6',marginBottom:'4px'}}>观众瓜分</div>
                <div style={{fontSize:'16px',fontWeight:'bold',color:'#3B82F6'}}>{audienceRatio}%</div>
                <div style={{fontSize:'8px',color:'#3B82F6'}}>对决池</div>
              </div>
            </div>
            <div style={{fontSize:'10px',color:'#9CA3AF',lineHeight:1.5,color:'#6B7280'}}>
              {audienceRatio === 0 ? '赢家独得 100% 对决池，观众押注收益来自独立的观众池。' : audienceRatio === 100 ? '赢家放弃全部收益，100% 对决池归押对的观众瓜分。' : `赢家获得对决池的 ${100-audienceRatio}%，押对的观众瓜分 ${audienceRatio}%。`}
            </div>
          </div>

          {/* 时长 */}
          <div>
            <div style={{fontSize:'9px',letterSpacing:'0.1em',textTransform:'uppercase',color:'#374151',marginBottom:'6px'}}>{m.durationLabel}</div>
            <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
              <input
                type="number" min="1" step="1"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                style={{flex:1,background:'#F9F8FF',border:'1.5px solid #DDD6FE',borderRadius:'12px',padding:'10px 12px',fontSize:'14px',color:'#1A1A2E',outline:'none'}}
              />
              <select
                value={durationUnit}
                onChange={e => setDurationUnit(Number(e.target.value))}
                style={{background:'#F9F8FF',border:'1.5px solid #DDD6FE',borderRadius:'12px',padding:'10px 12px',fontSize:'14px',color:'#1A1A2E',outline:'none'}}
              >
                {unitLabels.map((u, i) => <option key={i} value={i}>{u}</option>)}
              </select>
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              {presetDays.map((d, i) => (
                <button
                  key={d}
                  onClick={() => { setDuration(String(d)); setDurationUnit(0); }}
                  style={{flex:1,padding:'7px',borderRadius:'10px',fontSize:'11px',fontWeight:500,border: duration === String(d) && durationUnit === 0 ? '1.5px solid #7C3AED' : '1px solid #DDD6FE',background: duration === String(d) && durationUnit === 0 ? '#F5F3FF' : '#F9F8FF',color: duration === String(d) && durationUnit === 0 ? '#7C3AED' : '#6B7280',cursor:'pointer'}}
                >{presetLabels[i]}</button>
              ))}
            </div>
          </div>

          {/* 可见范围 */}
          <div>
            <div style={{fontSize:'9px',letterSpacing:'0.1em',textTransform:'uppercase',color:'#374151',marginBottom:'8px'}}>{m.visibilityLabel}</div>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {[
                { key: 'public' as const, label: m.visibilities[0], desc: m.visibilityDescPublic },
                { key: 'private' as const, label: m.visibilities[1], desc: m.visibilityDescPrivate },
                { key: 'ai' as const, label: m.visibilityAI, desc: m.visibilityDescAI },
              ].map(opt => (
                <div
                  key={opt.key}
                  onClick={() => setVisibility(opt.key)}
                  style={{borderRadius:'12px',padding:'10px 12px',cursor:'pointer',display:'flex',alignItems:'flex-start',gap:'12px',border: visibility === opt.key ? (opt.key === 'ai' ? '1.5px solid #C4B5FD' : '1.5px solid #DBEAFE') : '1px solid #EEE9FC',background: visibility === opt.key ? (opt.key === 'ai' ? '#F5F3FF' : '#EFF6FF') : '#F9F8FF'}}
                >
                  <div style={{width:'14px',height:'14px',borderRadius:'50%',border: visibility === opt.key ? (opt.key === 'ai' ? '2px solid #7C3AED' : '2px solid #3B82F6') : '2px solid #C4B5FD',background: visibility === opt.key ? (opt.key === 'ai' ? '#7C3AED' : '#3B82F6') : 'transparent',flexShrink:0,marginTop:'2px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {visibility === opt.key && <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'white'}} />}
                  </div>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:600,color: visibility === opt.key ? (opt.key === 'ai' ? '#7C3AED' : '#1D4ED8') : '#374151',marginBottom:'3px'}}>{opt.label}</div>
                    <div style={{fontSize:'11px',color:'#6B7280'}}>{opt.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <div style={{fontSize:'11px',color:'#f87171',background:'rgba(248,113,113,0.1)',borderRadius:'8px',padding:'8px 12px'}}>Error: {(error as any)?.shortMessage || error?.message}</div>}
        </div>

        {/* FOOTER */}
        <div style={{padding:'0 20px 20px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
          <button onClick={onClose} style={{padding:'10px',borderRadius:'12px',fontSize:'14px',fontWeight:500,color:'#9CA3AF',border:'1px solid #E5E7EB',background:'transparent',cursor:'pointer'}}>{m.cancel}</button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{padding:'10px',borderRadius:'12px',fontSize:'14px',fontWeight:600,border: isSuccess ? '1px solid #A7F3D0' : '1px solid #7C3AED',background: isSuccess ? '#ECFDF5' : '#7C3AED',color: isSuccess ? '#059669' : '#fff',cursor: canSubmit ? 'pointer' : 'not-allowed',opacity: canSubmit ? 1 : 0.5}}
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
    <div className="bg-white border border-[#EEE9FC] rounded-2xl overflow-hidden" style={{ display: 'grid', gridTemplateColumns: '70% 30%', height: '540px' }}>
      <div className="flex flex-col border-r border-white/10 bg-[#07070f] overflow-hidden">
        <div className="bg-[#09091e] border-b border-white/5 px-3 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded-full px-2.5 py-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /><span className="text-[9px] font-bold text-red-400 tracking-widest">LIVE</span></div>
          <div className="flex items-center gap-2"><div className="flex">{['#6a1a3a','#1a3a6a','#1a6a2a'].map((c,i) => (<div key={i} className="w-4 h-4 rounded-full overflow-hidden border border-[#09091e] -ml-1 first:ml-0 relative"><div className="absolute inset-0" style={{ background: c }} /><img src={WARRIOR_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-top" /></div>))}</div><span className="text-[10px] text-[#9CA3AF]"><span className="text-green-400 font-semibold">{watchers}</span> {lt.watching}</span></div>
          <div className="flex items-center gap-2"><span className="text-[8px] text-red-400 border border-red-400/30 bg-red-400/10 rounded px-1.5 py-0.5 tracking-wider">KOL BATTLE</span><span className="text-[8px] tracking-widest text-[#C4B5FD]">#{LIVE_DUEL.id}</span></div>
        </div>
        <div className="bg-[#0a0a1e] border-b border-white/5 px-3 py-2 flex-shrink-0 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[7px] tracking-widest uppercase text-white/20 mb-1">{t.events.duelIssued}</div>
            <div className="text-[11px] font-semibold text-white/80 leading-snug mb-1">{t.duels[0].claim}</div>
            <div className="flex items-center gap-2"><span className="text-[7px] tracking-widest uppercase text-[#C4B5FD]">Ruling</span><span className="text-[9px] text-[#C4B5FD]">DeFiLlama TVL data at expiry · 00:00 UTC</span></div>
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
            <div className="text-[8px] text-[#9CA3AF]">Bullish — Mantle flips</div>
            <div className="text-lg font-bold text-red-400">{LIVE_DUEL.amount} <span className="text-[8px] text-[#C4B5FD]">ETH</span></div>
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
            <div className="text-[8px] text-[#9CA3AF]">Bearish — Arbitrum holds</div>
            <div className="text-lg font-bold text-blue-400">{LIVE_DUEL.amount} <span className="text-[8px] text-[#C4B5FD]">ETH</span></div>
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
          <div className="flex items-center justify-between mb-1.5"><span className="text-[7px] tracking-widest uppercase text-[#C4B5FD]">support_rate · live</span><div className="flex items-center gap-2"><div className="flex items-center gap-1"><span className="text-[7px] text-[#C4B5FD]">less</span>{[1,2,3,4,5].map(i => <div key={i} className="w-1.5 h-1.5 rounded-sm" style={{ background: RED_STOPS[i] }} />)}<span className="text-[7px] text-red-400/40">red</span></div><div className="flex items-center gap-1">{[1,2,3,4,5].map(i => <div key={i} className="w-1.5 h-1.5 rounded-sm" style={{ background: BLU_STOPS[i] }} />)}<span className="text-[7px] text-blue-400/40">blue</span><span className="text-[7px] text-[#C4B5FD]">more</span></div></div></div>
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
              <div><div className="text-[6px] tracking-widest uppercase text-white/15 mb-0.5">Time elapsed</div><div className="h-1.5 bg-[#F3F0FB] rounded-full overflow-hidden"><div className="h-full bg-orange-400/50 rounded-full" style={{ width: '41%' }} /></div><div className="flex justify-between mt-0.5"><span className="text-[6px] text-orange-400/40">41% elapsed</span><span className="text-[6px] text-[#C4B5FD]">44d left</span></div></div>
            </div>
          </div>
        </div>
        <div className="bg-[#04040c] border-t border-white/5 px-3 py-1.5 flex justify-between items-center flex-shrink-0"><span className="text-[7px] tracking-widest uppercase text-[#C4B5FD]">{lt.expiresIn}</span><span className="text-[9px] font-mono text-red-400/50">{timer}</span></div>
      </div>
      {/* CHAT */}
      <div className="flex flex-col bg-[#07070f] overflow-hidden">
        <div className="bg-[#08081a] border-b border-white/5 px-3 py-2 flex items-center justify-between flex-shrink-0"><span className="text-[9px] font-semibold tracking-widest uppercase text-[#9CA3AF]">{lt.liveChat}</span><span className="text-[8px] text-[#C4B5FD]">{Math.floor(watchers * 0.15)} {lt.online}</span></div>
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
  const isEnding = duel.status === 'ending';
  const isOpen = duel.status === 'open';
  const claimText = (duel as any)._claimText || d.claim;
  const ruleText = (duel as any)._ruleText || d.rulingStd;
  const totalPot = (duel.challenger.amount + (duel.defender?.amount ?? duel.challenger.amount)).toFixed(3);
  const chain = CHAINS.find(c => duel.network.includes(c.name));
  const borderColor = isAI ? '#DDD6FE' : isEnding ? '#FED7AA' : '#EEE9FC';
  const challengerAddr = (duel as any)._onChainId ? duel.challenger.addr : duel.challenger.addr;

  return (
    <div onClick={onClick} className="bg-white rounded-3xl overflow-hidden cursor-pointer group flex flex-col" style={{border:`1.5px solid ${borderColor}`,transition:'box-shadow 0.2s,transform 0.2s'}} onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.transform='translateY(-3px)';(e.currentTarget as HTMLDivElement).style.boxShadow='0 12px 32px rgba(124,58,237,0.10)'}} onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.transform='';(e.currentTarget as HTMLDivElement).style.boxShadow=''}}>
      
      {/* HEADER */}
      <div className="px-4 pt-3.5 pb-0 flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${duel.type==='kolBattle'?'text-[#F43F5E] bg-[#FFF1F2]':duel.type==='friendsBet'?'text-[#3B82F6] bg-[#EFF6FF]':duel.type==='communityWar'?'text-[#7C3AED] bg-[#F5F3FF]':'text-[#059669] bg-[#ECFDF5]'}`}>{t.tags[duel.type]}</span>
          {isAI && <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full text-[#7C3AED] bg-[#F5F3FF]">vs AI</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#C4B5FD] font-medium">#{(duel as any)._onChainId || duel.id}</span>
          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${duel.status==='live'?'text-[#F43F5E] bg-[#FFF1F2]':isOpen?'text-[#3B82F6] bg-[#EFF6FF]':isEnding?'text-[#EA580C] bg-[#FFF7ED]':'text-[#059669] bg-[#ECFDF5]'}`}>{t.tags[duel.status]}</span>
        </div>
      </div>

      {/* CLAIM — accent bar style */}
      <div className="mx-4 mt-3 mb-3 rounded-2xl overflow-hidden flex" style={{background:'#F9F8FF',border:'1px solid #EEE9FC'}}>
        <div className="w-1 flex-shrink-0 rounded-l-2xl" style={{background: isEnding?'#EA580C':isAI?'#7C3AED':'#7C3AED'}} />
        <div className="px-3 py-2.5 min-w-0">
          <p className="text-[12px] font-semibold text-[#1A1A2E] leading-snug line-clamp-2">{claimText}</p>
          {ruleText && <p className="text-[10px] text-[#9CA3AF] mt-1 truncate">⚖️ {ruleText.length>50?ruleText.slice(0,50)+'...':ruleText}</p>}
        </div>
      </div>

      {/* PLAYERS */}
      <div className="px-4 pb-3" style={{display:'grid',gridTemplateColumns:'1fr 44px 1fr',gap:'8px',alignItems:'center'}}>
        {/* RED */}
        <div className="rounded-2xl p-3" style={{background:'#FFF1F2',border:'1px solid #FFE4E6'}}>
          <div className="flex items-center gap-2 mb-2.5">
            <GradientAvatar addr={duel.challenger.addr || '0xabc'} size={36} />
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-[#1A1A2E] truncate">{duel.challenger.name}</div>
              <div className="text-[9px] text-[#9CA3AF] mt-0.5">{t.nav.arena === '广场' ? '发起方' : 'Challenger'}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[22px] font-bold text-[#F43F5E] leading-none">{duel.challenger.amount}</span>
            <span className="text-[10px] font-semibold text-[#F43F5E] bg-[#FFE4E6] px-2 py-0.5 rounded-lg">{duel.token}</span>
          </div>
        </div>

        {/* VS */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-[10px] font-bold text-[#7C3AED] bg-[#F5F3FF] px-2 py-1.5 rounded-xl w-full text-center">VS</div>
          {chain && <img src={chain.logo} alt={chain.name} className="w-5 h-5 rounded-full border border-[#EEE9FC]" onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />}
        </div>

        {/* BLUE / EMPTY */}
        {isAI ? (
          <div className="rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5" style={{background:'#F5F3FF',border:'1px solid #DDD6FE',minHeight:'84px'}}>
            <div className="w-9 h-9 rounded-full bg-[#EDE9FD] flex items-center justify-center text-xl">⚖️</div>
            <div className="text-[11px] font-semibold text-[#7C3AED]">AI Judge</div>
          </div>
        ) : duel.defender ? (
          <div className="rounded-2xl p-3" style={{background:'#EFF6FF',border:'1px solid #DBEAFE'}}>
            <div className="flex items-center gap-2 mb-2.5">
              <GradientAvatar addr={duel.defender.addr || '0xdef'} size={36} />
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-[#1A1A2E] truncate">{duel.defender.name}</div>
                <div className="text-[9px] text-[#9CA3AF] mt-0.5">{t.nav.arena === '广场' ? '接受方' : 'Defender'}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[22px] font-bold text-[#3B82F6] leading-none">{duel.defender.amount}</span>
              <span className="text-[10px] font-semibold text-[#3B82F6] bg-[#DBEAFE] px-2 py-0.5 rounded-lg">{duel.token}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5" style={{background:'#F9F8FF',border:'1.5px dashed #C4B5FD',minHeight:'84px'}}>
            <div className="text-3xl text-[#C4B5FD]">?</div>
            <div className="text-[10px] font-medium text-[#C4B5FD]">{t.nav.arena === '广场' ? '等待应战' : 'Waiting'}</div>
          </div>
        )}
      </div>

      {/* SUPPORT BAR */}
      <div className="px-4 pb-3">
        <div className="h-2.5 bg-[#F3F0FB] rounded-full overflow-hidden flex mb-2" style={{position:'relative'}}>
          <div className="bg-[#F43F5E] rounded-l-full transition-all duration-700" style={{width:`${duel.supportRed}%`}} />
          <div className={`rounded-r-full flex-1 ${isAI?'bg-[#7C3AED]':'bg-[#3B82F6]'}`} />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-bold text-[#F43F5E]">{duel.supportRed}%</span>
          <span className="text-[9px] text-[#C4B5FD] tracking-wide">{t.nav.arena === '广场' ? '社区支持率' : 'Community Vote'}</span>
          <span className={`text-[11px] font-bold ${isAI?'text-[#7C3AED]':'text-[#3B82F6]'}`}>{100-duel.supportRed}%</span>
        </div>
      </div>

      {/* CHIPS ROW */}
      <div className="px-4 pb-3 flex gap-2 flex-wrap">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold border ${isEnding?'bg-[#FFF7ED] border-[#FED7AA] text-[#EA580C]':'bg-[#F9F8FF] border-[#EEE9FC] text-[#374151]'}`}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          {duel.expires}
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold border bg-[#F9F8FF] border-[#EEE9FC] text-[#374151]">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6"/><path d="M8 14h8"/></svg>
          {totalPot} {duel.token}
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold border bg-[#F9F8FF] border-[#EEE9FC] text-[#374151]">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          {duel.watchers}
        </div>
      </div>

      {/* FOOTER BUTTONS */}
      <div className="px-4 pb-4 mt-auto flex gap-2 border-t border-[#F3F0FB] pt-3">
        <button onClick={e=>{e.stopPropagation();onEnter();}} className="flex-1 py-2.5 rounded-2xl text-[12px] font-bold text-white transition-all hover:opacity-90 active:scale-95" style={{background:isOpen?'#EA580C':'#7C3AED'}}>
          {isOpen ? (t.nav.arena === '广场' ? '⚔️ 接受挑战' : '⚔️ Accept Challenge') : t.card.enterDuel}
        </button>
        <button onClick={e=>{e.stopPropagation();generateStampImage(duel);}} className="px-3 py-2.5 rounded-2xl text-[12px] font-semibold bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE] hover:bg-[#EDE9FD] transition-colors" title="Share as image">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        </button>
      </div>

      {/* NETWORK BAR */}
      <div className="px-4 py-2 flex justify-between items-center" style={{background:'#F7F5FF',borderTop:'1px solid #EEE9FC'}}>
        <div className="flex items-center gap-1.5">
          {chain && <img src={chain.logo} alt="" className="w-3.5 h-3.5 rounded-full" onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />}
          <span className="text-[9px] font-medium text-[#9CA3AF]">{duel.network}</span>
        </div>
        <span className={`text-[9px] font-mono font-semibold ${isEnding?'text-[#EA580C]':'text-[#F43F5E]'}`}>{timer}</span>
      </div>
    </div>
  );
}


// ─── DuelDetailModal — 五种视角统一入口 ─────────────────────────────────────

async function readMutualClaim(rpc: string, contract: string, duelId: number, addr: string): Promise<number> {
  try {
    // mutualClaim(uint256,address) - need to compute selector
    // keccak256("mutualClaim(uint256,address)") = we'll use eth_call with storage slot
    // Actually mutualClaim is a public mapping so we can call it directly
    // function selector for mutualClaim: keccak256("mutualClaim(uint256,address)")[:4]
    const idHex = duelId.toString(16).padStart(64, '0');
    const addrHex = addr.toLowerCase().replace('0x','').padStart(64, '0');
    // selector for mutualClaim(uint256,address) = 0x... computed offline
    const data = '0x2599522f' + idHex + addrHex; // mutualClaim(uint256,address)
    const res = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_call', params: [{ to: contract, data }, 'latest'], id: 1 })
    });
    const json = await res.json();
    return parseInt(json.result || '0x0', 16);
  } catch { return 0; }
}

function DuelDetailModal({ duel, t, onClose, onChainDuel, refetch }: { duel: Duel; t: typeof LANG['en']; onClose: () => void; onChainDuel?: OnChainDuel; refetch?: () => void }) {
  const { address } = useAccount();
  const claimText = (duel as any)._claimText || (onChainDuel ? `#${onChainDuel.id} — on-chain duel` : duel.id);
  const ruleText = (duel as any)._ruleText || '';
  const token = duel.token;
  const wager = onChainDuel ? fmtEther(onChainDuel.wager) : String(duel.challenger.amount);
  const isMock = onChainDuel?.id === 42;
  const oid = (onChainDuel as any)?.originalId ?? onChainDuel?.id; // original chain id for contract calls

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
  const [showMutualModal, setShowMutualModal] = useState(false);
  const [mutualChoice, setMutualChoice] = useState<'self'|'opponent'|null>(null);
  const [mutualPending, setMutualPending] = useState(false);
  const [mutualSubmitted, setMutualSubmitted] = useState<'self'|'opponent'|null>(null);
  const [opponentClaim, setOpponentClaim] = useState<number>(0); // 0=none, 1=Red, 2=Blue

  // Read opponent's on-chain mutualClaim
  useEffect(() => {
    if (!onChainDuel || !isParticipant) return;
    const opponentAddr = isMyRed ? onChainDuel.blue : onChainDuel.red;
    if (!opponentAddr || opponentAddr === '0x0000000000000000000000000000000000000000') return;
    const rpc = targetChainId === 5003 ? 'https://rpc.sepolia.mantle.xyz' : 'https://data-seed-prebsc-1-s1.bnbchain.org:8545';
    const contract = targetChainId === 5003 ? '0xE731a80668Ad0439a6B55e57f65C1D7885827566' : '0xa0A997cF05F7Baf21becEA4130209fD7C7D1A994';
    const originalId = (onChainDuel as any).originalId ?? onChainDuel.id;
    readMutualClaim(rpc, contract, originalId, opponentAddr).then(setOpponentClaim);
  }, [onChainDuel?.id, isParticipant]);
  const betStakeNum = parseFloat(betStake) || 0;
  const totalPot = duel.challenger.amount + (duel.defender?.amount ?? duel.challenger.amount);
  const supportPool = selectedSide === 1 ? totalPot*(duel.supportRed/100)+betStakeNum : totalPot*((100-duel.supportRed)/100)+betStakeNum;
  const odds = betStakeNum > 0 ? ((totalPot+betStakeNum)/supportPool).toFixed(2) : '—';
  const payout = betStakeNum > 0 ? ((totalPot+betStakeNum)/supportPool*betStakeNum).toFixed(3) : '—';

  const S = { // inline styles shortcuts
    overlay: {position:'fixed' as const,inset:0,background:'rgba(100,80,160,0.25)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'},
    modal: {background:'#fff',border:'1.5px solid #EEE9FC',borderRadius:'20px',width:'100%',maxWidth:'440px',overflow:'hidden',boxShadow:'0 8px 40px rgba(124,58,237,0.10)'},
    head: {background:'#F7F5FF',borderBottom:'1px solid #EEE9FC',padding:'11px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'},
    body: {padding:'14px',display:'flex',flexDirection:'column' as const,gap:'10px',maxHeight:'76vh',overflowY:'auto' as const},
    foot: {padding:'0 14px 14px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'},
    label: {fontSize:'9px',letterSpacing:'0.08em',textTransform:'uppercase' as const,color:'#9CA3AF',marginBottom:'4px'},
    claimBox: {background:'#F5F3FF',border:'1px solid #DDD6FE',borderRadius:'12px',padding:'11px 13px',fontSize:'13px',color:'#1A1A2E',lineHeight:1.6,fontWeight:500},
    ruleBox: {background:'#EFF6FF',border:'1px solid #DBEAFE',borderRadius:'12px',padding:'9px 12px',fontSize:'12px',color:'#1D4ED8',lineHeight:1.5,fontWeight:500},
    sideRed: {background:'#FFF1F2',border:'1px solid #FFE4E6',borderRadius:'12px',padding:'8px 10px'},
    sideBlue: {background:'#EFF6FF',border:'1px solid #DBEAFE',borderRadius:'12px',padding:'8px 10px',textAlign:'right' as const},
    sideDash: {background:'#F9F8FF',border:'1px dashed #C4B5FD',borderRadius:'12px',padding:'8px 10px',textAlign:'center' as const},
    aiBox: {background:'#F0EDFB',border:'1.5px solid #C4B5FD',borderRadius:'12px',padding:'10px 13px',display:'flex',alignItems:'flex-start',gap:'8px'},
    statRow: {display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'6px'},
    statBox: {background:'#F9F8FF',borderRadius:'10px',padding:'6px 8px',textAlign:'center' as const,border:'1px solid #EEE9FC'},
    divider: {height:'0.5px',background:'#EEE9FC'},
    phaseBox: {background:'#F0EDFB',border:'1.5px solid #C4B5FD',borderRadius:'12px',padding:'10px 13px'},
    resultWin: {background:'#ECFDF5',border:'1px solid #A7F3D0',borderRadius:'12px',padding:'10px 12px',display:'flex',alignItems:'center',gap:'10px'},
    resultLose: {background:'#FFF1F2',border:'1px solid #FFE4E6',borderRadius:'12px',padding:'10px 12px',display:'flex',alignItems:'center',gap:'10px'},
    disputeNote: {background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:'12px',padding:'7px 10px',fontSize:'10px',color:'#D97706',lineHeight:1.5},
  };

  const Pill = ({ label, color }: { label: string; color: string }) => (
    <span style={{fontSize:'9px',padding:'2px 7px',borderRadius:'20px',fontWeight:500,border:`1px solid ${color}40`,color,background:`${color}15`}}>{label}</span>
  );

  const statusLabel = isOpen ? t.tags.open : isActive ? t.tags.live : isSettled ? (t.tags as any).settled ?? 'Settled' : t.tags.open;
  const statusColor = isOpen ? '#3B82F6' : isActive ? '#7C3AED' : '#9CA3AF';

  const SideCard = ({ side }: { side: 'red'|'blue' }) => {
    const isRed = side === 'red';
    const name = isRed ? duel.challenger.name : (duel.defender?.name ?? '???');
    const amt = isRed ? duel.challenger.amount : (duel.defender?.amount ?? duel.challenger.amount);
    const isMe = (isRed && isMyRed) || (!isRed && isMyBlue);
    const c = isRed ? '#F43F5E' : '#3B82F6';
    return (
      <div style={isRed ? S.sideRed : S.sideBlue}>
        <div style={{display:'flex',alignItems:'center',gap:'4px',justifyContent: isRed ? 'flex-start' : 'flex-end',marginBottom:'3px'}}>
          <span style={{fontSize:'11px',fontWeight:500,color:c}}>{isRed ? '👑' : '⚔️'} {name}</span>
          {isMe && <span style={{fontSize:'9px',padding:'1px 5px',borderRadius:'20px',background:`${c}15`,color:c,border:`1px solid ${c}30`}}>나</span>}
        </div>
        <div style={{fontSize:'10px',color:`${c}`,marginBottom:'3px',fontWeight:500,opacity:0.75}}>{isRed ? (t.nav.arena === '广场' ? '发起方' : 'Challenger') : (t.nav.arena === '广场' ? '接受方' : 'Defender')}</div>
        <div style={{fontSize:'15px',fontWeight:700,color:c}}>{amt} <span style={{fontSize:'9px',color:'#9CA3AF'}}>{token}</span></div>
      </div>
    );
  };

  const StatBox = ({ label, val, color }: { label: string; val: string; color?: string }) => (
    <div style={S.statBox}>
      <div style={{fontSize:'8px',letterSpacing:'0.06em',textTransform:'uppercase',color:'#9CA3AF',marginBottom:'3px'}}>{label}</div>
      <div style={{fontSize:'13px',fontWeight:600,color:color||'#1A1A2E'}}>{val}</div>
    </div>
  );

  const Btn = ({ label, color, bg, border, onClick, disabled }: { label:string; color:string; bg:string; border:string; onClick?:()=>void; disabled?:boolean }) => (
    <button onClick={onClick} disabled={disabled} style={{padding:'10px',borderRadius:'12px',fontSize:'12px',fontWeight:600,color,border:`1.5px solid ${border}`,background:bg,cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.5:1}}>{label}</button>
  );

  const BaseInfo = () => (
    <>
      <div><div style={S.label}>{t.claimLabel}</div><div style={S.claimBox}>{claimText}</div></div>
      {ruleText && <div><div style={S.label}>{t.rulingLabel}</div><div style={S.ruleBox}>{ruleText}</div></div>}
    </>
  );

  const VsRow = () => (
    <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:'8px',alignItems:'center'}}>
      <SideCard side="red" />
      <div style={{fontSize:'10px',color:'#9CA3AF',textAlign:'center',fontWeight:500}}>VS</div>
      {duel.defender ? <SideCard side="blue" /> :
        <div style={S.sideDash}><div style={{fontSize:'11px',color:'#9CA3AF'}}>{t.nav.arena === '广场' ? '等待应战' : 'Waiting'}</div><div style={{fontSize:'20px',color:'#C4B5FD',lineHeight:1.2}}>?</div></div>
      }
    </div>
  );

  const SupportBar = () => (
    <div>
      <div style={{height:'5px',background:'#F3F0FB',borderRadius:'3px',overflow:'hidden',display:'flex'}}>
        <div style={{background:'#F43F5E',width:`${duel.supportRed}%`,transition:'width 0.5s'}} />
        <div style={{background:'#3B82F6',flex:1}} />
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:'3px'}}>
        <span style={{fontSize:'10px',fontWeight:500,color:'#F43F5E'}}>{duel.supportRed}%</span>
        <span style={{fontSize:'9px',color:'#9CA3AF'}}>{t.nav.arena === '广场' ? '社区支持率' : 'Community Vote'}</span>
        <span style={{fontSize:'10px',fontWeight:500,color:'#3B82F6'}}>{100-duel.supportRed}%</span>
      </div>
    </div>
  );

  // ── 视角1：招募中，旁观者/接受方 ──
  const ViewOpenOutsider = () => (
    <>
      <BaseInfo />
      <VsRow />
      <div style={S.aiBox}><span style={{fontSize:'16px',flexShrink:0}}>⚖️</span><p style={{fontSize:'10px',color:'#7C3AED',lineHeight:1.5,margin:0}}>{t.detail?.judgeNote ?? ""}</p></div>
      <div style={S.statRow}>
        <StatBox label="到期" val={duel.expires} color="#D97706" />
        <StatBox label="需押注" val={`${wager} ${token}`} />
        <StatBox label="网络" val={duel.network} />
      </div>
      <div style={S.divider} />
      <div style={S.foot}>
        <Btn label={t.nav.arena === '广场' ? '取消' : 'Cancel'} color="#9CA3AF" bg="transparent" border="#E5E7EB" onClick={onClose} />
        <Btn
          label={!address ? (t.nav.arena === '广场' ? '🔗 连接钱包后参与' : '🔗 Connect Wallet') : isWrongNetwork ? (t.nav.arena === '广场' ? '⚠️ 切换网络' : '⚠️ Switch Network') : acceptSuccess ? (t.nav.arena === '广场' ? '✓ 已接受!' : '✓ Accepted!') : acceptConfirming ? (t.nav.arena === '广场' ? '确认中...' : 'Confirming...') : acceptPending ? (t.nav.arena === '广场' ? '等待签名...' : 'Signing...') : (t.nav.arena === '广场' ? '⚔️ 接受挑战' : '⚔️ Accept Challenge')}
          color={isWrongNetwork ? '#D97706' : '#fff'} bg={isWrongNetwork ? '#FFF7ED' : '#7C3AED'} border={isWrongNetwork ? '#FDE68A' : '#7C3AED'}
          onClick={async () => {
            const chainDuelId = (onChainDuel as any)?.originalId ?? onChainDuel?.id ?? (duel as any)._onChainId;
            const wagerBigInt = onChainDuel?.wager ?? (duel as any)._wager;
            const contractAddr = targetChainId === 5003
              ? '0xE731a80668Ad0439a6B55e57f65C1D7885827566'
              : '0xa0A997cF05F7Baf21becEA4130209fD7C7D1A994';
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
                  params: [{ from: accounts[0], to: contractAddr, value: wagerHex, data }]
                });
              } catch(e: any) { console.error('accept error:', e); }
            } else if (onChainDuel) {
              accept(oid, wager);
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
        <Btn label={cancelPending ? (t.nav.arena === '广场' ? '等待签名...' : 'Signing...') : cancelSuccess ? (t.nav.arena === '广场' ? '✓ 已取消' : '✓ Cancelled') : (t.nav.arena === '广场' ? '取消对决' : 'Cancel Duel')} color="rgba(255,107,107,0.6)" bg="rgba(255,107,107,0.06)" border="rgba(255,107,107,0.2)" onClick={() => onChainDuel && cancel(oid, undefined)} disabled={cancelPending} />
        <Btn label={t.nav.arena === '广场' ? '复制分享链接' : 'Copy Share Link'} color="#9CA3AF" bg="transparent" border="#E5E7EB"
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
        <StatBox label={t.nav.arena === '广场' ? '观众池' : 'Audience Pool'} val={`${(duel as any)._audiencePool?.toFixed(3) ?? '0.000'} ${token}`} />
        <StatBox label={t.nav.arena === '广场' ? '观战' : 'Watching'} val={String(duel.watchers)} />
      </div>
      <div style={S.phaseBox}>
        <div style={{fontSize:'11px',fontWeight:600,color:'#1A1A2E',marginBottom:'3px'}}>{t.nav.arena === '广场' ? '⏳ 对决进行中 — 到期后可操作' : '⏳ Duel in progress — actions after expiry'}</div>
        <div style={{fontSize:'10px',color:'#374151',lineHeight:1.5}}>{t.nav.arena === '广场' ? '到期后可提交证据申请裁定，或与对方达成共识直接结算。' : 'After expiry, submit evidence to request ruling, or reach consensus.'}</div>
      </div>
      {isJudge && <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
        <Btn label={settlePending ? t.nav.arena === '广场' ? '裁定中...' : 'Ruling...' : t.nav.arena === '广场' ? '⚖️ 裁红方胜' : '⚖️ Rule Red Wins'} color="rgba(255,107,107,0.9)" bg="rgba(255,107,107,0.06)" border="rgba(255,107,107,0.3)" onClick={() => onChainDuel && settle(oid, 1)} disabled={settlePending} />
        <Btn label={settlePending ? t.nav.arena === '广场' ? '裁定中...' : 'Ruling...' : t.nav.arena === '广场' ? '⚖️ 裁蓝方胜' : '⚖️ Rule Blue Wins'} color="rgba(107,159,255,0.9)" bg="rgba(107,159,255,0.06)" border="rgba(107,159,255,0.3)" onClick={() => onChainDuel && settle(oid, 2)} disabled={settlePending} />
      </div>}
      <div style={S.divider} />
      <div style={{padding:'0 14px 14px',display:'flex',flexDirection:'column',gap:'6px'}}>
        {opponentClaim > 0 && !mutualSubmitted && (
          <div style={{background:'#FFF7ED',border:'1px solid #FDE68A',borderRadius:'12px',padding:'10px 13px',marginBottom:'8px',fontSize:'12px',color:'#D97706'}}>
            ⚠️ {t.nav.arena === '广场' ? `对方已声明 ${opponentClaim === 1 ? '红方' : '蓝方'} 胜出，请确认你的结果` : `Opponent claimed ${opponentClaim === 1 ? 'Red' : 'Blue'} wins. Please confirm your result`}
          </div>
        )}
        {mutualSubmitted && (
          <div style={{background:'#F0FDF4',border:'1.5px solid #A7F3D0',borderRadius:'12px',padding:'10px 13px',fontSize:'12px',color:'#059669',lineHeight:1.5}}>
            {t.nav.arena === '广场' ? '你已声明 ' : 'You declared '}<strong>{mutualSubmitted === 'self' ? myLabel : oppLabel}</strong>{t.nav.arena === '广场' ? ' 胜出，等待对方在 48 小时内确认。' : ' as winner. Waiting for opponent to confirm within 48h.'}
          </div>
        )}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'6px'}}>
          <Btn label={mutualSubmitted ? t.nav.arena === '广场' ? '✅ 已提交' : '✅ Submitted' : t.nav.arena === '广场' ? '共识结算' : 'Mutual Settle'} color={mutualSubmitted ? '#059669' : '#7C3AED'} bg={mutualSubmitted ? '#ECFDF5' : '#F5F3FF'} border={mutualSubmitted ? '#A7F3D0' : '#DDD6FE'} onClick={mutualSubmitted ? undefined : () => setShowMutualModal(true)} disabled={!!mutualSubmitted} />
          <Btn label={t.nav.arena === '广场' ? '提交证据' : 'Submit Evidence'} color="#3B82F6" bg="#EFF6FF" border="#DBEAFE" disabled={true} />
          <Btn label={t.nav.arena === '广场' ? '申请裁定' : 'Request Ruling'} color="#D97706" bg="#FFFBEB" border="#FDE68A" disabled={true} />
        </div>
        <Btn label={t.nav.arena === '广场' ? '复制分享链接' : 'Copy Share Link'} color="#9CA3AF" bg="transparent" border="#E5E7EB"
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
        <StatBox label={t.nav.arena === '广场' ? '观众池' : 'Audience Pool'} val={`${(duel as any)._audiencePool?.toFixed(3) ?? '0.000'} ${token}`} />
        <StatBox label={t.nav.arena === '广场' ? '观战' : 'Watching'} val={String(duel.watchers)} />
      </div>
      <div style={S.divider} />
      <div style={{fontSize:'9px',letterSpacing:'0.08em',textTransform:'uppercase' as const,color:'#374151',marginBottom:'6px'}}>选择支持方</div>
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
          style={{flex:1,background:'#F9F8FF',border:'1px solid #EEE9FC',borderRadius:'10px',padding:'9px 12px',fontSize:'13px',color:'#1A1A2E',outline:'none'}} />
        <div style={{padding:'9px 12px',borderRadius:'10px',fontSize:'12px',fontWeight:600,color:'#F43F5E',border:'1px solid rgba(255,107,107,0.3)',background:'rgba(255,107,107,0.08)',display:'flex',alignItems:'center'}}>{token}</div>
      </div>
      {betStakeNum > 0 && (
        <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'10px',padding:'9px 12px',display:'grid',gridTemplateColumns:'1fr 1px 1fr',gap:'10px',alignItems:'center'}}>
          <div style={{textAlign:'center'}}><div style={{fontSize:'8px',color:'#9CA3AF',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:'3px'}}>预计赔率</div><div style={{fontSize:'14px',fontWeight:500,color:'rgba(255,255,255,0.7)'}}>{odds}x</div></div>
          <div style={{background:'rgba(255,255,255,0.08)',height:'24px'}} />
          <div style={{textAlign:'center'}}><div style={{fontSize:'8px',color:'#9CA3AF',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:'3px'}}>赢了可得</div><div style={{fontSize:'14px',fontWeight:500,color:'#F43F5E'}}>{payout} {token}</div></div>
        </div>
      )}
      <div style={S.foot}>
        <Btn label={t.nav.arena === '广场' ? '取消' : 'Cancel'} color="rgba(255,255,255,0.4)" bg="transparent" border="rgba(255,255,255,0.15)" onClick={onClose} />
        <Btn
          label={!address && !isMock ? '🔗 连接钱包后参与' : isWrongNetwork && !isMock ? (t.nav.arena === '广场' ? '⚠️ 切换网络' : '⚠️ Switch Network') : isMock ? '🎮 演示模式' : betSuccess ? '✓ 押注成功!' : betConfirming ? '确认中...' : betPending ? '等待签名...' : '🔒 确认押注'}
          color={isWrongNetwork && !isMock ? 'rgba(250,199,117,0.9)' : '#6b9fff'} bg={isWrongNetwork && !isMock ? 'rgba(250,199,117,0.06)' : 'rgba(107,159,255,0.1)'} border={isWrongNetwork && !isMock ? 'rgba(250,199,117,0.4)' : 'rgba(107,159,255,0.4)'}
          onClick={() => { if(!address && !isMock){ openConnectModal?.(); return; } if(isWrongNetwork && !isMock){ switchChain({ chainId: targetChainId }); return; } if(!isMock && selectedSide && betStakeNum && onChainDuel) placeBet(oid, selectedSide, betStake); }}
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
        <Btn label={settlePending ? t.nav.arena === '广场' ? '裁定中...' : 'Ruling...' : t.nav.arena === '广场' ? '⚖️ 裁红方胜' : '⚖️ Rule Red Wins'} color="rgba(255,107,107,0.9)" bg="rgba(255,107,107,0.06)" border="rgba(255,107,107,0.3)" onClick={() => onChainDuel && settle(oid, 1)} disabled={settlePending} />
        <Btn label={settlePending ? t.nav.arena === '广场' ? '裁定中...' : 'Ruling...' : t.nav.arena === '广场' ? '⚖️ 裁蓝方胜' : '⚖️ Rule Blue Wins'} color="rgba(107,159,255,0.9)" bg="rgba(107,159,255,0.06)" border="rgba(107,159,255,0.3)" onClick={() => onChainDuel && settle(oid, 2)} disabled={settlePending} />
      </div>}
      <div style={S.foot}>
        <Btn label={disputePending ? '等待签名...' : disputeSuccess ? '✓ 质疑已提交' : '🚨 提起质疑'} color="rgba(250,199,117,0.9)" bg="rgba(250,199,117,0.06)" border="rgba(250,199,117,0.3)"
          onClick={() => onChainDuel && dispute(oid, fmtEther(onChainDuel.wager * 5n / 100n))}
          disabled={disputePending || !isParticipant} />
        <Btn
          label={claimSuccess ? '✓ 已领取!' : claimConfirming ? '确认中...' : claimPending ? '等待签名...' : '💰 领取奖励'}
          color="#4ade80" bg="rgba(74,222,128,0.08)" border="rgba(74,222,128,0.3)"
          onClick={() => onChainDuel && claim(oid)}
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

  const isZh = t.nav.arena === '广场';
  const myLabel = isMyRed ? (isZh ? '红方（我）' : 'Red (Me)') : (isZh ? '蓝方（我）' : 'Blue (Me)');
  const oppLabel = isMyRed ? (isZh ? '蓝方（对方）' : 'Blue (Them)') : (isZh ? '红方（对方）' : 'Red (Them)');
  const myColor = isMyRed ? '#F43F5E' : '#3B82F6';
  const oppColor = isMyRed ? '#3B82F6' : '#F43F5E';

  return (
    <>
    {showMutualModal && (
      <div style={{position:'fixed',inset:0,background:'rgba(100,80,160,0.25)',zIndex:60,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}
        onClick={() => setShowMutualModal(false)}>
        <div style={{background:'#fff',border:'1.5px solid #EEE9FC',borderRadius:'20px',width:'100%',maxWidth:'380px',overflow:'hidden',boxShadow:'0 8px 40px rgba(124,58,237,0.12)'}}
          onClick={e => e.stopPropagation()}>
          <div style={{background:'#F7F5FF',borderBottom:'1px solid #EEE9FC',padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{fontSize:'14px',fontWeight:600,color:'#1A1A2E'}}>{t.nav.arena === '广场' ? '⚖️ 共识结算' : '⚖️ Mutual Settlement'}</div>
            <button onClick={() => setShowMutualModal(false)} style={{color:'#9CA3AF',fontSize:'20px',background:'none',border:'none',cursor:'pointer',lineHeight:1}}>×</button>
          </div>
          <div style={{padding:'18px'}}>
            <div style={{fontSize:'13px',color:'#374151',marginBottom:'16px',lineHeight:1.6}}>
              {t.nav.arena === '广场' ? '你认为谁赢得了这场对决？对方需在 48小时 内确认，若双方结果一致则自动结算。' : 'Who do you think won this duel? Opponent has 48h to confirm. If both agree, settlement is automatic.'}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'16px'}}>
              <button onClick={() => setMutualChoice('self')}
                style={{padding:'14px 10px',borderRadius:'14px',border:`2px solid ${mutualChoice==='self' ? myColor : '#EEE9FC'}`,background:mutualChoice==='self' ? `${myColor}18` : '#F9F8FF',cursor:'pointer',transition:'all 0.15s'}}>
                <div style={{fontSize:'20px',marginBottom:'6px'}}>🏆</div>
                <div style={{fontSize:'12px',fontWeight:600,color:mutualChoice==='self' ? myColor : '#374151'}}>{t.nav.arena === '广场' ? '我赢了' : 'I Won'}</div>
                <div style={{fontSize:'10px',color:'#9CA3AF',marginTop:'2px'}}>{myLabel}</div>
              </button>
              <button onClick={() => setMutualChoice('opponent')}
                style={{padding:'14px 10px',borderRadius:'14px',border:`2px solid ${mutualChoice==='opponent' ? oppColor : '#EEE9FC'}`,background:mutualChoice==='opponent' ? `${oppColor}18` : '#F9F8FF',cursor:'pointer',transition:'all 0.15s'}}>
                <div style={{fontSize:'20px',marginBottom:'6px'}}>🤝</div>
                <div style={{fontSize:'12px',fontWeight:600,color:mutualChoice==='opponent' ? oppColor : '#374151'}}>{t.nav.arena === '广场' ? '对方赢了' : 'They Won'}</div>
                <div style={{fontSize:'10px',color:'#9CA3AF',marginTop:'2px'}}>{oppLabel}</div>
              </button>
            </div>
            {mutualChoice && (
              <div style={{background:'#F5F3FF',borderRadius:'12px',padding:'10px 13px',marginBottom:'14px',fontSize:'12px',color:'#5B21B6',lineHeight:1.5}}>
                {t.nav.arena === '广场' ? '你声明 ' : 'You declared '}<strong>{mutualChoice === 'self' ? myLabel : oppLabel}</strong>{t.nav.arena === '广场' ? ' 赢得了此次对决。提交后等待对方在 48 小时内确认。' : ' won this duel. Submit to wait for opponent confirmation within 48h.'}
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
              <button onClick={() => { setShowMutualModal(false); setMutualChoice(null); }}
                style={{padding:'11px',borderRadius:'12px',fontSize:'13px',fontWeight:500,color:'#9CA3AF',border:'1px solid #E5E7EB',background:'transparent',cursor:'pointer'}}>
                {t.nav.arena === '广场' ? '取消' : 'Cancel'}
              </button>
              <button disabled={!mutualChoice || mutualPending}
                onClick={async () => {
                  if (!mutualChoice || !onChainDuel) return;
                  setMutualPending(true);
                  try {
                    const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
                    const currentChain = await (window as any).ethereum.request({ method: 'eth_chainId' });
                    // switch network if needed
                    if (parseInt(currentChain, 16) !== targetChainId) {
                      await (window as any).ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x' + targetChainId.toString(16) }] });
                    }
                    const contractAddr = targetChainId === 5003
                      ? '0xE731a80668Ad0439a6B55e57f65C1D7885827566'
                      : '0xa0A997cF05F7Baf21becEA4130209fD7C7D1A994';
                    const originalId = (onChainDuel as any).originalId ?? onChainDuel.id;
                    // Side: Red=1, Blue=2. If I chose 'self' and I'm red → Red wins, if I'm blue → Blue wins
                    const sideNum = mutualChoice === 'self'
                      ? (isMyRed ? 1 : 2)
                      : (isMyRed ? 2 : 1);
                    // encode mutualSettle(uint256,uint8) = 0x8f5bb485
                    const idHex = originalId.toString(16).padStart(64, '0');
                    const sideHex = sideNum.toString(16).padStart(64, '0');
                    const data = '0x8f5bb485' + idHex + sideHex;
                    const txHash = await (window as any).ethereum.request({
                      method: 'eth_sendTransaction',
                      params: [{ from: accounts[0], to: contractAddr, data }]
                    });
                    // wait for confirmation
                    let receipt = null;
                    for (let i = 0; i < 30; i++) {
                      await new Promise(r => setTimeout(r, 2000));
                      receipt = await (window as any).ethereum.request({ method: 'eth_getTransactionReceipt', params: [txHash] });
                      if (receipt) break;
                    }
                    if (receipt?.status === '0x1') {
                      setMutualSubmitted(mutualChoice);
                      setShowMutualModal(false);
                      setMutualChoice(null);
                      refetch?.();
                      setTimeout(() => refetch?.(), 3000);
                    } else {
                      alert(t.nav.arena === '广场' ? '交易失败，请重试' : 'Transaction failed, please retry');
                    }
                  } catch (e: any) {
                    if (e.code !== 4001) alert(e.message || 'Error');
                  } finally {
                    setMutualPending(false);
                  }
                }}
                style={{padding:'11px',borderRadius:'12px',fontSize:'13px',fontWeight:600,border:'none',cursor:mutualChoice?'pointer':'not-allowed',background:mutualChoice?'#7C3AED':'#E5E7EB',color:mutualChoice?'#fff':'#9CA3AF',transition:'all 0.15s'}}>
                {mutualPending ? t.nav.arena === '广场' ? '提交中...' : 'Submitting...' : t.nav.arena === '广场' ? '确认提交' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e=>e.stopPropagation()}>
        <div style={S.head}>
          <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
            <span className={`text-[8px] tracking-widest uppercase px-1.5 py-0.5 rounded border ${typeStyle[duel.type]}`}>{t.tags[duel.type]}</span>
            <Pill label={statusLabel} color={statusColor} />
            {isParticipant && <Pill label={isMyRed ? '红方' : '蓝方'} color={isMyRed ? '#F43F5E' : '#3B82F6'} />}
          </div>
          <button onClick={onClose} style={{color:'#9CA3AF',fontSize:'20px',lineHeight:1,background:'none',border:'none',cursor:'pointer'}}>×</button>
        </div>
        <div style={S.body}>{renderBody()}</div>
      </div>
    </div>
    </>
  );
}

function DuelModal({ duel, t, onClose, onChainDuel, refetch }: { duel: Duel; t: typeof LANG['en']; onClose: () => void; onChainDuel?: OnChainDuel; refetch?: () => void }) {
  return <DuelDetailModal duel={duel} t={t} onClose={onClose} onChainDuel={onChainDuel} refetch={refetch} />;
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
  const chain = CHAINS.find(c => c.name === record.network);
  const sideIsRed = record.side === 'red';
  const initials = (name: string) => name.replace('0x','').slice(0,2).toUpperCase();
  const borderColor = isClaimable ? '#FDE68A' : isWon ? '#A7F3D0' : '#EEE9FC';

  return (
    <div className="bg-white rounded-3xl overflow-hidden transition-all" style={{border:`1.5px solid ${borderColor}`}}>
      {/* CLAIMABLE STRIP */}
      {isClaimable && (
        <div className="bg-[#FFFBEB] border-b border-[#FDE68A] px-4 py-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#D97706] animate-pulse" />
          <span className="text-[10px] font-semibold text-[#D97706]">奖励已就绪 · {record.disputeHoursLeft}h 内领取</span>
        </div>
      )}
      <div className="p-4">
        {/* HEADER */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#C4B5FD] font-medium font-mono">#{record.id}</span>
            {chain && <img src={chain.logo} alt="" className="w-3.5 h-3.5 rounded-full" onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />}
            <span className="text-[10px] text-[#9CA3AF]">{record.network}</span>
          </div>
          {record.result ? (
            <span className={`text-[11px] font-semibold px-3 py-1 rounded-full ${isWon ? 'bg-[#ECFDF5] text-[#059669]' : isLost ? 'bg-[#FFF1F2] text-[#F43F5E]' : 'bg-[#F9F8FF] text-[#9CA3AF]'}`}>{m.results[record.result]}</span>
          ) : isActive ? (
            <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-[#EFF6FF] text-[#3B82F6]">⏳ {record.expires}</span>
          ) : null}
        </div>
        {/* CLAIM TEXT */}
        <p className="text-[13px] font-semibold text-[#1A1A2E] leading-snug mb-3 line-clamp-2">{record.claim}</p>
        {/* PLAYERS ROW */}
        <div className="grid gap-2 mb-3" style={{gridTemplateColumns:'1fr auto 1fr'}}>
          {/* MY SIDE */}
          <div className={`rounded-2xl p-3 ${sideIsRed ? 'bg-[#FFF1F2] border border-[#FFE4E6]' : 'bg-[#EFF6FF] border border-[#DBEAFE]'}`}>
            <div className="text-[9px] text-[#9CA3AF] mb-2">{sideIsRed ? '👑 我的立场' : '⚔️ 我的立场'}</div>
            <div className="flex items-center gap-2 mb-2">
              <BeamAvatar addr={record.challengerColor || '0xB008'} size={32} />
              <div className="min-w-0"><div className="text-[10px] font-semibold text-[#1A1A2E] truncate">{record.challengerColor ? '나' : 'Me'}</div><div className="text-[9px] text-[#9CA3AF]">{sideIsRed ? 'Red' : 'Blue'} side</div></div>
            </div>
            <div className={`text-[18px] font-semibold ${sideIsRed ? 'text-[#F43F5E]' : 'text-[#3B82F6]'}`}>{record.stake} <span className="text-[10px]">{record.token}</span></div>
          </div>
          {/* POT CENTER */}
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="text-[9px] text-[#9CA3AF]">总奖池</div>
            <div className="text-[16px] font-semibold text-[#7C3AED]">{record.totalPot}</div>
            <div className="text-[9px] text-[#C4B5FD]">{record.token}</div>
          </div>
          {/* OPPONENT */}
          <div className={`rounded-2xl p-3 ${sideIsRed ? 'bg-[#EFF6FF] border border-[#DBEAFE]' : 'bg-[#FFF1F2] border border-[#FFE4E6]'}`}>
            <div className="text-[9px] text-[#9CA3AF] mb-2">⚔️ 对手</div>
            <div className="flex items-center gap-2 mb-2">
              <BeamAvatar addr={record.opponentColor || '0xabc123'} size={32} />
              <div className="min-w-0"><div className="text-[10px] font-semibold text-[#1A1A2E] truncate">{record.opponentName}</div><div className="text-[9px] text-[#9CA3AF]">{sideIsRed ? 'Blue' : 'Red'} side</div></div>
            </div>
            <div className={`text-[18px] font-semibold ${sideIsRed ? 'text-[#3B82F6]' : 'text-[#F43F5E]'}`}>{record.stake} <span className="text-[10px]">{record.token}</span></div>
          </div>
        </div>
        {/* STATS ROW */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-[#F9F8FF] rounded-2xl p-2.5 text-center border border-[#EEE9FC]">
            <div className="text-[9px] text-[#9CA3AF] mb-1">{m.labels.yourStake}</div>
            <div className="text-[12px] font-semibold text-[#1A1A2E]">{record.stake} <span className="text-[9px] text-[#C4B5FD]">{record.token}</span></div>
          </div>
          <div className="bg-[#F9F8FF] rounded-2xl p-2.5 text-center border border-[#EEE9FC]">
            <div className="text-[9px] text-[#9CA3AF] mb-1">{m.labels.side}</div>
            <div className={`text-[12px] font-semibold ${sideIsRed ? 'text-[#F43F5E]' : 'text-[#3B82F6]'}`}>{sideIsRed ? m.sides.red : m.sides.blue}</div>
          </div>
          <div className="bg-[#F9F8FF] rounded-2xl p-2.5 text-center border border-[#EEE9FC]">
            <div className="text-[9px] text-[#9CA3AF] mb-1">{m.labels.payout}</div>
            <div className={`text-[12px] font-semibold ${isWon || isClaimable ? 'text-[#059669]' : isLost ? 'text-[#F43F5E]' : 'text-[#9CA3AF]'}`}>{isClaimable || isWon ? `${record.payout}` : '—'}{(isClaimable || isWon) && <span className="text-[9px] ml-0.5 text-[#C4B5FD]">{record.token}</span>}</div>
          </div>
        </div>
        {/* AI ANALYSIS */}
        {(isClaimable || isWon || isLost) && record.aiAnalysis && (
          <div className="bg-[#F5F3FF] rounded-2xl p-3 mb-3 flex gap-2.5 items-start border border-[#DDD6FE]">
            <span className="text-lg flex-shrink-0 mt-0.5">⚖️</span>
            <div>
              <div className="text-[9px] font-semibold text-[#7C3AED] uppercase tracking-wide mb-1">AI Judge 裁定</div>
              <p className="text-[11px] text-[#6D28D9] leading-relaxed italic">"{record.aiAnalysis}"</p>
            </div>
          </div>
        )}
        {/* DISPUTE WINDOW */}
        {isClaimable && record.disputeHoursLeft !== undefined && (
          <div className="mb-3">
            <div className="flex justify-between mb-1.5">
              <span className="text-[10px] text-[#9CA3AF]">{m.labels.disputeWindow}</span>
              <span className="text-[10px] font-medium text-[#D97706]">{record.disputeHoursLeft}h 剩余</span>
            </div>
            <div className="h-1.5 bg-[#F3F0FB] rounded-full overflow-hidden">
              <div className="h-full bg-[#D97706] rounded-full" style={{width:`${(record.disputeHoursLeft/48)*100}%`}} />
            </div>
            <div className="text-[9px] text-[#9CA3AF] mt-1">{m.labels.claimBy}: {record.claimBy}</div>
          </div>
        )}
        {/* ACTIONS */}
        {isClaimable ? (
          <div className="flex gap-2">
            <button onClick={()=>onClaim(record.id)} className={`flex-1 py-2.5 rounded-2xl text-[11px] font-semibold transition-all ${isClaiming ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]' : 'text-white hover:opacity-90'}`} style={isClaiming ? {} : {background:'#D97706'}}>{isClaiming ? '✓ 已领取!' : m.actions.claim}</button>
            <button className="px-3 py-2.5 rounded-2xl text-[11px] font-semibold text-[#F43F5E] border border-[#FFE4E6] bg-[#FFF1F2] hover:bg-[#FFE4E6] transition-colors flex-shrink-0">{m.actions.dispute}</button>
          </div>
        ) : (
          <button onClick={onViewDuel} className="w-full py-2.5 rounded-2xl text-[11px] font-semibold text-[#7C3AED] border border-[#DDD6FE] bg-[#F5F3FF] hover:bg-[#EDE9FD] transition-colors">{m.actions.viewDuel}</button>
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
    { key: 'active' as MyDuelTab, icon: '⚔️', activeStyle: 'bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]', badgeStyle: 'bg-[#7C3AED] text-white' },
    { key: 'claimable' as MyDuelTab, icon: '💰', activeStyle: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]', badgeStyle: 'bg-[#D97706] text-white' },
    { key: 'history' as MyDuelTab, icon: '📜', activeStyle: 'bg-[#F9F8FF] text-[#374151] border-[#EEE9FC]', badgeStyle: 'bg-[#EEE9FC] text-[#374151]' },
  ];

  return (
    <div className="flex bg-[#F7F5FF]" style={{ minHeight: 'calc(100vh - 56px)' }}>
      {/* ── SIDEBAR ── */}
      <div className="w-56 flex-shrink-0 border-r border-[#EEE9FC] bg-white flex flex-col" style={{ minHeight: 'calc(100vh - 52px)' }}>
        {/* WALLET */}
        <div className="px-4 py-4 border-b border-[#EEE9FC]">
          <div className="flex items-center gap-2.5 mb-3">
            <BeamAvatar addr={address || '0xabc'} size={36} square />
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-[#374151]">My Account</div>
              <div className="text-[9px] text-[#9CA3AF] font-mono">{address ? shortAddr(address) : "—"}</div>
            </div>
          </div>
        </div>

        {/* OVERVIEW STATS */}
        <div className="px-3 py-3 border-b border-[#EEE9FC]">
          <div className="text-[8px] tracking-widest uppercase text-[#9CA3AF] mb-2 px-1">Overview</div>
          <div className="flex flex-col gap-1.5">
            {[
              { label: 'Total Staked', value: totalStaked > 0 ? `${totalStaked.toFixed(3)} ${token}` : '—', color: 'text-[#374151]' },
              { label: 'Total Won', value: wonDuels.length > 0 ? `${wonDuels.reduce((a,d)=>a+parseFloat(fmtEther(d.wager*2n)),0).toFixed(3)} ${token}` : '—', color: 'text-green-400' },
              { label: 'Win Rate', value: myDuels.filter(d=>d.status===DuelStatus.Settled).length > 0 ? `${winRate}%` : '—', color: 'text-yellow-400' },
              { label: 'Duels Played', value: String(myDuels.length), color: 'text-white/50' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between px-2.5 py-1.5 bg-[#F9F8FF] rounded-lg border border-[#EEE9FC]">
                <span className="text-[9px] text-[#9CA3AF]">{s.label}</span>
                <span className={`text-[10px] font-semibold ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* TAB NAV */}
        <div className="px-3 py-3 flex-1">
          <div className="text-[8px] tracking-widest uppercase text-[#9CA3AF] mb-2 px-1">Filter</div>
          <div className="flex flex-col gap-1">
            {TAB_CONFIG.map(({ key, icon, activeStyle }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[11px] font-semibold border transition-all ${activeTab === key ? activeStyle + ' border' : 'text-[#9CA3AF] border-transparent hover:text-[#7C3AED] hover:bg-[#F5F3FF]'}`}>
                <span>{icon} {m.tabs[key]}</span>
                {tabCounts[key] > 0 && (
                  <span className={`text-[8px] rounded-full w-4 h-4 flex items-center justify-center font-bold ${activeTab === key ? TAB_CONFIG.find(c => c.key === key)!.badgeStyle : 'bg-[#EEE9FC] text-[#9CA3AF]'}`}>
                    {tabCounts[key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* BOTTOM NOTICE */}
        <div className="px-3 pb-4">
          <div className="bg-[#F9F8FF] border border-[#EEE9FC] rounded-lg p-2.5">
            <div className="text-[8px] text-[#9CA3AF] leading-relaxed">
              🛡 Dispute window: 48h after settlement. Disputes cost 5% of stake.
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 min-w-0 p-5 bg-[#F7F5FF]">
        {/* CONTENT HEADER */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-semibold text-[#1A1A2E]">{m.tabs[activeTab]}</div>
            <div className="text-[10px] text-[#9CA3AF] mt-0.5">
              {currentDuels.length > 0 ? `${currentDuels.length} duels` : m.emptyDesc[activeTab]}
            </div>
          </div>
          <div className="text-[9px] text-[#C4B5FD]">sorted by expiry</div>
        </div>

        {/* EMPTY STATE */}
        {currentDuels.length === 0 ? (
          <div className="bg-white border border-[#EEE9FC] rounded-2xl p-16 text-center">
            <div className="text-4xl mb-3">{activeTab === 'active' ? '⚔️' : activeTab === 'claimable' ? '💰' : '📜'}</div>
            <div className="text-sm font-semibold text-[#374151] mb-2">{m.empty[activeTab]}</div>
            <div className="text-[11px] text-[#9CA3AF] mb-5">{m.emptyDesc[activeTab]}</div>
            {activeTab === 'active' && (
              <button onClick={onGoToArena} className="text-xs font-semibold text-white rounded-xl px-4 py-2 hover:opacity-90 transition-colors" style={{background:'#7C3AED'}}>
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
    <div className="bg-white border-b border-[#EEE9FC] px-4 flex items-center" style={{ height: '64px' }}>
      {/* LEFT */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <img src="/verdict_logo.png" alt="Verdict Protocol" className="w-12 h-12 object-contain" />
        <span className="text-[17px] font-bold text-[#1A1A2E]" style={{letterSpacing:'-0.3px'}}>{t.appName}</span>
      </div>
      {/* CENTER NAV */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center bg-[#F3F0FB] rounded-2xl p-1.5 gap-1">
          <button onClick={() => onPageChange('arena')} className={`px-5 py-2 rounded-xl text-[13px] font-bold transition-all ${activePage === 'arena' ? 'bg-white text-[#7C3AED]' : 'text-[#9CA3AF] hover:text-[#7C3AED]'}`}>
            {t.nav.arena}
          </button>
          <button onClick={() => onPageChange('myDuels')} className={`px-5 py-2 rounded-xl text-[13px] font-bold transition-all flex items-center gap-1.5 ${activePage === 'myDuels' ? 'bg-white text-[#7C3AED]' : 'text-[#9CA3AF] hover:text-[#7C3AED]'}`}>
            {t.nav.myDuels}
            {claimableCount > 0 && <span className="text-[8px] bg-[#7C3AED] text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">{claimableCount}</span>}
          </button>
        </div>
      </div>
      {/* RIGHT */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={onLangToggle} className="text-[13px] font-medium text-[#6B7280] bg-[#F7F5FF] border border-[#EEE9FC] rounded-xl px-3 py-2 hover:border-[#C4B5FD] transition-colors">{lang === 'en' ? '中文' : 'EN'}</button>
        <ConnectButton.Custom>
          {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
            const connected = mounted && account && chain;
            if (!connected) return (<button onClick={openConnectModal} className="text-[13px] font-bold text-white rounded-xl px-4 py-2 transition-colors whitespace-nowrap hover:opacity-90" style={{background:'#7C3AED'}}>{t.connectWallet}</button>);
            return (
              <div className="relative" ref={menuRef}>
                <button onClick={() => setMenuOpen(o => !o)} className="flex items-center gap-2 bg-[#F7F5FF] border border-[#EEE9FC] rounded-xl px-3 py-2 hover:border-[#C4B5FD] transition-colors">
                  <BeamAvatar addr={account.address || '0xabc'} size={22} />
                  <span className="text-[13px] font-semibold text-[#6D28D9]">{account.displayName}</span>
                  <span className="text-[#C4B5FD] text-[10px]">▾</span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-[#EEE9FC] rounded-2xl overflow-hidden z-50 min-w-[160px]" style={{boxShadow:'0 4px 24px rgba(124,58,237,0.10)'}}>
                    <button onClick={() => { onPageChange('myDuels'); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-[#1A1A2E] hover:bg-[#F7F5FF] transition-colors border-b border-[#F3F0FB]">
                      <span>📋</span> {t.nav.myDuels}
                      {claimableCount > 0 && <span className="ml-auto text-[8px] bg-[#7C3AED] text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">{claimableCount}</span>}
                    </button>
                    <button onClick={() => { onIssueClick(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-[#1A1A2E] hover:bg-[#F7F5FF] transition-colors border-b border-[#F3F0FB]"><span>⚔️</span> {t.issueBtn}</button>
                    <button onClick={() => { navigator.clipboard?.writeText(account.address); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-[#1A1A2E] hover:bg-[#F7F5FF] transition-colors border-b border-[#F3F0FB]"><span>📋</span> Copy address</button>
                    <button onClick={() => { openAccountModal(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-[#F43F5E] hover:bg-[#FFF1F2] transition-colors"><span>⏏</span> Disconnect</button>
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

  useEffect(() => { fetchDuels(); fetch("/api/notify").catch(()=>{}); }, []);
  const totalCount = onChainDuels.length;

  // ── 本地模拟数据（仅用于开发预览，部署时删除）──
  const MOCK_DUELS: OnChainDuel[] = [
    { id: 1, red: '0xB0088d6Eb46c3C15D878b54900ce1d5AEad54bD7' as `0x${string}`, blue: '0x4531000000000000000000000000000000000ebe4' as `0x${string}`, token: '0x0000000000000000000000000000000000000000' as `0x${string}`, wager: BigInt(1e15), audioBps: 0n, deadline: BigInt(Math.floor(Date.now()/1000) + 86400), claimHash: '0x0000000000000000000000000000000000000000000000000000000000000001' as `0x${string}`, ruleHash: '0x0000000000000000000000000000000000000000000000000000000000000001' as `0x${string}`, vis: 1, status: DuelStatus.Active, winner: 0, settledAt: 0n, poolRed: 0n, poolBlue: 0n, _claimText: t.duels[0].claim, _ruleText: t.duels[0].rulingStd } as any,
    { id: 2, red: '0xabc0000000000000000000000000000000000001' as `0x${string}`, blue: '0x0000000000000000000000000000000000000000' as `0x${string}`, token: '0x0000000000000000000000000000000000000000' as `0x${string}`, wager: BigInt(5e15), audioBps: 0n, deadline: BigInt(Math.floor(Date.now()/1000) + 7*86400), claimHash: '0x0000000000000000000000000000000000000000000000000000000000000002' as `0x${string}`, ruleHash: '0x0000000000000000000000000000000000000000000000000000000000000002' as `0x${string}`, vis: 0, status: DuelStatus.Open, winner: 0, settledAt: 0n, poolRed: 0n, poolBlue: 0n, _claimText: t.duels[1].claim, _ruleText: t.duels[1].rulingStd } as any,
    { id: 3, red: '0xdef0000000000000000000000000000000000001' as `0x${string}`, blue: '0xfff0000000000000000000000000000000000001' as `0x${string}`, token: '0x0000000000000000000000000000000000000000' as `0x${string}`, wager: BigInt(2e15), audioBps: 0n, deadline: BigInt(Math.floor(Date.now()/1000) + 2*3600), claimHash: '0x0000000000000000000000000000000000000000000000000000000000000003' as `0x${string}`, ruleHash: '0x0000000000000000000000000000000000000000000000000000000000000003' as `0x${string}`, vis: 0, status: DuelStatus.Active, winner: 0, settledAt: 0n, poolRed: BigInt(8e14), poolBlue: BigInt(5e14), _claimText: t.duels[2].claim, _ruleText: t.duels[2].rulingStd } as any,
  ];
  const displayDuels = onChainDuels.length > 0 ? onChainDuels : MOCK_DUELS;
  const now = BigInt(Math.floor(Date.now() / 1000));
  const visibleDuels = displayDuels.filter(d =>
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
    const duelChainId = (d as any).chainId ?? chainId;
    const token = (d as any).chainToken ?? (duelChainId === 97 ? 'tBNB' : duelChainId === 5003 ? 'MNT' : 'BNB');
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
      network: (d as any).chainName ?? networkName,
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
  const [usdPrices, setUsdPrices] = useState<{MNT?: number, BNB?: number, tBNB?: number}>({});
  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=mantle,binancecoin&vs_currencies=usd')
      .then(r => r.json())
      .then(d => setUsdPrices({ MNT: d.mantle?.usd, BNB: d.binancecoin?.usd, tBNB: d.binancecoin?.usd }))
      .catch(() => {});
  }, []);
  const totalPotUSD = onChainDuels.reduce((acc, d) => {
    const tk = (d as any).chainToken ?? 'BNB';
    const price = usdPrices[tk as keyof typeof usdPrices] ?? 0;
    return acc + parseFloat(fmtEther(d.wager * 2n)) * price;
  }, 0);
  const totalPotStr = totalPotUSD > 0
    ? '$' + (totalPotUSD < 1 ? totalPotUSD.toFixed(4) : totalPotUSD.toFixed(2))
    : totalCount > 0 ? '...' : '—';

  return (
    <div className="min-h-screen bg-[#F7F5FF] text-[#1A1A2E]">
      <style>{`
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
* { font-family: 'DM Sans', sans-serif; }
.font-mono, code { font-family: 'DM Mono', monospace !important; }
@keyframes fadeInUp { from { opacity:0; transform:translateX(-50%) translateY(6px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
@keyframes cardIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
.duel-card-grid > * { animation: cardIn 0.35s ease both; }
.duel-card-grid > *:nth-child(1) { animation-delay: 0.05s; }
.duel-card-grid > *:nth-child(2) { animation-delay: 0.10s; }
.duel-card-grid > *:nth-child(3) { animation-delay: 0.15s; }
.duel-card-grid > *:nth-child(4) { animation-delay: 0.20s; }
.duel-card-grid > *:nth-child(5) { animation-delay: 0.25s; }
.duel-card-grid > *:nth-child(6) { animation-delay: 0.30s; }
`}</style>
      <NavBar t={t} lang={lang} activePage={activePage} onPageChange={setActivePage} onLangToggle={() => setLang(l => l === 'en' ? 'zh' : 'en')} onIssueClick={() => setShowModal(true)} />
      {activePage === 'arena' ? (
        <>
          <Ticker t={t} lang={lang} />
          <div className="border-b border-[#EEE9FC]" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
            {[
              { label: t.stats.duels, value: totalCount > 0 ? String(totalCount) : '—' },
              { label: t.stats.pool, value: totalPotStr },
              { label: t.stats.settled, value: onChainDuels.filter(d => d.status === DuelStatus.Settled).length > 0 ? String(onChainDuels.filter(d => d.status === DuelStatus.Settled).length) : '—' },
            ].map((s, i) => (
              <div key={i} className={`py-3 text-center bg-white ${i < 2 ? 'border-r border-[#EEE9FC]' : ''}`}>
                <div className="text-[9px] tracking-widest uppercase text-[#9CA3AF] mb-1 font-medium">{s.label}</div>
                <div className="text-lg font-bold text-[#1A1A2E]">{s.value}</div>
              </div>
            ))}
          </div>
          <div className="bg-white border-b border-[#EEE9FC] px-4 py-3 flex items-center justify-between">
            <div className="flex gap-1.5">
              {t.filters.map((f, i) => (<button key={f} onClick={() => setActiveFilter(i)} className={`text-[10px] px-3 py-1.5 rounded-full border transition-colors font-medium ${activeFilter === i ? 'bg-[#7C3AED] text-white border-[#7C3AED]' : 'bg-[#F7F5FF] text-[#9CA3AF] border-[#EEE9FC] hover:border-[#C4B5FD]'}`}>{f}</button>))}
            </div>
            <button onClick={() => setShowModal(true)} className="text-xs font-semibold text-white rounded-xl px-4 py-1.5 transition-colors" style={{background:'#7C3AED'}}>{t.issueBtn}</button>
          </div>
          <div className="p-4">
            <div className="text-[11px] font-semibold text-[#9CA3AF] mb-4 flex items-center gap-2 uppercase tracking-widest">
              All Duels
              {isLoading && <span className="text-[#C4B5FD]">loading...</span>}
              {!isLoading && visibleDuels.length === 0 && totalCount === 0 && (
                <span className="text-[#C4B5FD]">— no active duels</span>
              )}
            </div>
            <div className="duel-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {visibleDuels.map((od, i) => {
                const duel = onChainToDuel(od, i);
                return <DuelCard key={od.id} duel={duel} t={t} onClick={() => handleSelectDuel(duel, od)} onEnter={() => handleSelectDuel(duel, od)} />;
              })}
            </div>
          </div>
          <div className="pb-8 pt-4 text-center">
            <button onClick={() => refetch()} className="text-xs text-[#9CA3AF] bg-white border border-[#EEE9FC] rounded-xl px-6 py-2.5 hover:border-[#C4B5FD] transition-colors">↻ Refresh</button>
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
      {selectedDuel && <DuelModal duel={selectedDuel} t={t} refetch={refetch} onClose={() => {
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
