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
          <img src="/verdict_logo.svg" alt="" style={{width:'52px',height:'52px',objectFit:'contain',marginBottom:'6px',filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.25))'}} />
          <div style={{fontSize:'11px',fontWeight:700,color:'#fff',letterSpacing:'0.5px',textTransform:'uppercase'}}>Verdict Protocol</div>
          <div style={{fontSize:'8px',color:'rgba(255,255,255,0.55)',letterSpacing:'0.8px',textTransform:'uppercase',marginTop:'2px'}}>
            On-Chain Duel · {statusEn}
          </div>
        </div>
        {/* VALUE BAR */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
          padding:'5px 10px',borderBottom:'1px solid #F0F0F0',background:'#fafafa'}}>
          <span style={{fontSize:'8px',fontWeight:700,color:'#999999',letterSpacing:'0.5px',textTransform:'uppercase'}}>{duel.network}</span>
          <span style={{fontSize:'12px',fontWeight:700,color:'#5B21B6'}}>{totalPot} {duel.token}</span>
          <span style={{fontSize:'8px',fontWeight:600,padding:'2px 7px',borderRadius:'10px',
            background: isOpen?'#F5F9FF':isLive?'#FFF5F5':'#ECFDF5',
            color: isOpen?'#1D4ED8':isLive?'#BE123C':'#065F46'
          }}>{statusLabel}</span>
        </div>
        {/* INFO */}
        <div style={{padding:'10px'}}>
          <div style={{background:'#FFFFFF',borderRadius:'6px',padding:'7px 9px',marginBottom:'8px',
            borderLeft:'2px solid #7C3AED'}}>
            <div style={{fontSize:'11px',fontWeight:600,color:'#0A0A0A',lineHeight:1.4,
              display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
              {claimText}
            </div>
          </div>
          {/* PLAYERS */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 20px 1fr',gap:'4px',alignItems:'center',marginBottom:'7px'}}>
            <div style={{background:'#FFF5F5',borderRadius:'7px',padding:'6px 7px',textAlign:'center'}}>
              <div style={{fontSize:'7px',color:'#999999',marginBottom:'2px',textTransform:'uppercase'}}>Challenger</div>
              <div style={{fontSize:'8px',color:'#666666',fontFamily:'monospace',marginBottom:'2px'}}>{duel.challenger.addr}</div>
              <div><span style={{fontSize:'15px',fontWeight:700,color:'#F43F5E'}}>{duel.challenger.amount}</span>
              <span style={{fontSize:'8px',fontWeight:600,padding:'1px 4px',borderRadius:'4px',
                background:'#FFE0E0',color:'#F43F5E',marginLeft:'2px'}}>{duel.token}</span></div>
            </div>
            <div style={{display:'flex',justifyContent:'center'}}>
              <span style={{fontSize:'8px',fontWeight:700,color:'#7C3AED',background:'#F5F5F5',
                padding:'2px 3px',borderRadius:'4px'}}>VS</span>
            </div>
            {duel.defender ? (
              <div style={{background:'#F5F9FF',borderRadius:'7px',padding:'6px 7px',textAlign:'center'}}>
                <div style={{fontSize:'7px',color:'#999999',marginBottom:'2px',textTransform:'uppercase'}}>Defender</div>
                <div style={{fontSize:'8px',color:'#666666',fontFamily:'monospace',marginBottom:'2px'}}>{duel.defender.addr}</div>
                <div><span style={{fontSize:'15px',fontWeight:700,color:'#3B82F6'}}>{duel.defender.amount}</span>
                <span style={{fontSize:'8px',fontWeight:600,padding:'1px 4px',borderRadius:'4px',
                  background:'#E0EEFF',color:'#3B82F6',marginLeft:'2px'}}>{duel.token}</span></div>
              </div>
            ) : (
              <div style={{background:'#FFFFFF',border:'1px dashed #E0E0E0',borderRadius:'7px',
                padding:'6px 7px',textAlign:'center',minHeight:'54px',display:'flex',
                flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'2px'}}>
                <span style={{fontSize:'16px',color:'#E0E0E0'}}>?</span>
                <span style={{fontSize:'7px',color:'#E0E0E0'}}>Waiting</span>
              </div>
            )}
          </div>
          {/* SUPPORT BAR */}
          {duel.defender && (
            <div style={{marginBottom:'7px'}}>
              <div style={{height:'4px',borderRadius:'4px',background:'#F5F5F5',overflow:'hidden',
                display:'flex',marginBottom:'2px'}}>
                <div style={{background:'#F43F5E',borderRadius:'4px 0 0 4px',width:`${duel.supportRed}%`}}/>
                <div style={{background:'#3B82F6',borderRadius:'0 4px 4px 0',flex:1}}/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'8px',fontWeight:600}}>
                <span style={{color:'#F43F5E'}}>{duel.supportRed}%</span>
                <span style={{color:'#E0E0E0',fontSize:'7px'}}>Community Vote</span>
                <span style={{color:'#3B82F6'}}>{100-duel.supportRed}%</span>
              </div>
            </div>
          )}
          <div style={{display:'flex',gap:'3px',flexWrap:'wrap'}}>
            <span style={{fontSize:'8px',fontWeight:500,padding:'2px 6px',borderRadius:'7px',
              background:'#FFFFFF',border:'1px solid #F0F0F0',color:'#444444'}}>⏰ {duel.expires}</span>
            <span style={{fontSize:'8px',fontWeight:500,padding:'2px 6px',borderRadius:'7px',
              background:'#FFFFFF',border:'1px solid #F0F0F0',color:'#444444'}}>💰 {totalPot} {duel.token}</span>
          </div>
        </div>
        {/* FOOTER */}
        <div style={{borderTop:'1px dashed #F0F0F0',padding:'5px 10px',
          display:'flex',justifyContent:'space-between',alignItems:'center',background:'#fafafa'}}>
          <span style={{fontSize:'7px',color:'#E0E0E0',letterSpacing:'0.3px'}}>verdictprotocol.online</span>
          <span style={{fontSize:'8px',fontWeight:700,color:'#999999',fontFamily:'monospace'}}>#{duelId}</span>
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
  const stBg = isOpen ? '#F5F9FF' : isLive ? '#FFF5F5' : '#ECFDF5';
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
      <img src="/verdict_logo.svg" style="width:155px;height:155px;object-fit:contain;margin-bottom:2px;filter:drop-shadow(0 4px 20px rgba(0,0,0,0.35));" crossorigin="anonymous" onerror="this.style.display='none'"/>
      <div style="font-size:13px;font-weight:700;color:#fff;letter-spacing:0.5px;text-transform:uppercase;text-shadow:0 1px 4px rgba(0,0,0,0.2);line-height:1;">VERDICT PROTOCOL</div>
      <div style="font-size:9px;color:rgba(255,255,255,0.6);letter-spacing:1px;text-transform:uppercase;margin-top:2px;">ON-CHAIN DUEL · ${statusEn.toUpperCase()}</div>
    </div>

    <!-- VALUE BAR -->
    <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 10px;border-bottom:1px solid #F0F0F0;background:#fafafa;">
      <span style="font-size:9px;font-weight:700;color:#999999;letter-spacing:0.5px;font-family:monospace;">BNB TESTNET</span>
      <span style="font-size:14px;font-weight:700;color:${valColor};">${totalPot} ${duel.token}</span>
      <span style="font-size:9px;font-weight:600;padding:3px 9px;border-radius:10px;background:${stBg};color:${stColor};">${statusLabel}</span>
    </div>

    <!-- INFO -->
    <div style="padding:10px;">
      <div style="background:#FFFFFF;border-radius:8px;padding:8px 10px;margin-bottom:8px;border-left:2px solid #7C3AED;">
        <div style="font-size:12px;font-weight:600;color:#0A0A0A;line-height:1.5;word-break:break-word;">${claimText}</div>
      </div>

      <!-- PLAYERS -->
      <div style="display:grid;grid-template-columns:1fr 20px 1fr;gap:4px;align-items:center;margin-bottom:7px;">
        <div style="background:#FFF5F5;border-radius:7px;padding:6px 7px;text-align:center;">
          <div style="font-size:8px;color:#999999;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.3px;font-weight:600;">Challenger</div>
          <div style="font-size:9px;color:#666666;font-family:monospace;margin-bottom:3px;">${duel.challenger.addr}</div>
          <div style="font-size:16px;font-weight:700;color:#F43F5E;margin-top:2px;">${duel.challenger.amount} <span style="font-size:9px;font-weight:600;padding:2px 5px;border-radius:4px;background:#FFE0E0;color:#F43F5E;">${duel.token}</span></div>
        </div>
        <div style="text-align:center;">
          <span style="font-size:8px;font-weight:700;color:#7C3AED;background:#F5F5F5;padding:2px 3px;border-radius:4px;">VS</span>
        </div>
        ${duel.defender ? `
        <div style="background:#F5F9FF;border-radius:7px;padding:6px 7px;text-align:center;">
          <div style="font-size:8px;color:#999999;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.3px;font-weight:600;">Defender</div>
          <div style="font-size:8px;color:#666666;font-family:monospace;margin-bottom:2px;">${duel.defender.addr}</div>
          <div style="font-size:16px;font-weight:700;color:#3B82F6;margin-top:2px;">${duel.defender.amount} <span style="font-size:9px;font-weight:600;padding:2px 5px;border-radius:4px;background:#E0EEFF;color:#3B82F6;">${duel.token}</span></div>
        </div>` : `
        <div style="background:#FFFFFF;border:1px dashed #E0E0E0;border-radius:7px;padding:6px 7px;text-align:center;min-height:54px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;">
          <span style="font-size:16px;color:#E0E0E0;">?</span>
          <span style="font-size:7px;color:#E0E0E0;">Waiting</span>
        </div>`}
      </div>

      ${duel.defender ? `
      <!-- BAR -->
      <div style="margin-bottom:7px;">
        <div style="height:4px;border-radius:4px;background:#F5F5F5;overflow:hidden;display:flex;margin-bottom:2px;">
          <div style="background:#F43F5E;width:${duel.supportRed}%;border-radius:4px 0 0 4px;"></div>
          <div style="background:#3B82F6;flex:1;border-radius:0 4px 4px 0;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:8px;font-weight:600;">
          <span style="color:#F43F5E;font-size:10px;font-weight:700;">${duel.supportRed}%</span>
          <span style="color:#E0E0E0;font-size:9px;font-weight:500;">Community Vote</span>
          <span style="color:#3B82F6;font-size:10px;font-weight:700;">${100-duel.supportRed}%</span>
        </div>
      </div>` : ''}

      <!-- CHIPS -->
      <div style="display:flex;gap:3px;flex-wrap:wrap;">
        <span style="font-size:9px;font-weight:500;padding:3px 8px;border-radius:8px;background:#FFFFFF;border:1px solid #F0F0F0;color:#444444;">⏰ ${duel.expires}</span>
        <span style="font-size:9px;font-weight:500;padding:3px 8px;border-radius:8px;background:#FFFFFF;border:1px solid #F0F0F0;color:#444444;">💰 ${totalPot} ${duel.token}</span>
      </div>
    </div>

    <!-- FOOT -->
    <div style="border-top:1px dashed #F0F0F0;padding:5px 10px;display:flex;justify-content:space-between;align-items:center;background:#fafafa;">
      <span style="font-size:9px;color:#E0E0E0;letter-spacing:0.3px;">verdictprotocol.online</span>
      <span style="font-size:9px;font-weight:700;color:#999999;font-family:monospace;">#${duelId}</span>
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
  t.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#0A0A0A;color:#fff;padding:10px 22px;border-radius:20px;font-size:13px;font-weight:600;z-index:9999;font-family:DM Sans,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.12);';
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
    <div className="bg-[#F5F5F5] border-b border-[#F0F0F0] px-4 py-1.5 flex items-center gap-3 overflow-hidden">
      <div className="flex items-center gap-1.5 text-[9px] tracking-widest uppercase text-[#444444] whitespace-nowrap flex-shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-[#444444] animate-pulse" />{t.live}
      </div>
      <div className="overflow-hidden flex-1">
        <div ref={ref} className="flex gap-12 whitespace-nowrap" style={{ width: 'max-content' }}>
          {[...t.ticker, ...t.ticker].map((item, i) => <span key={i} className="text-[10px] text-[#999999]">{item}</span>)}
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
      <button onClick={() => setOpen(o => !o)} className={`w-full bg-[#FFFFFF] border rounded-lg px-3 py-2.5 flex items-center gap-2 text-sm outline-none transition-colors ${open ? 'border-[#0A0A0A] rounded-b-none' : 'border-[#F0F0F0] hover:border-[#E0E0E0]'}`}>
        {selectedChain ? (<><img src={selectedChain.logo} alt={selectedChain.name} className="w-5 h-5 rounded-full flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /><span className="text-[#0A0A0A] flex-1 text-left">{selectedChain.name}</span><span className="text-[#999999] text-xs">{selectedChain.token}</span></>) : <span className="text-[#999999] flex-1 text-left">{placeholder}</span>}
        <span className={`text-[#999999] text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border border-[#0A0A0A] border-t-0 rounded-b-xl overflow-hidden z-20 max-h-48 overflow-y-auto">
          {CHAINS.map(c => (
            <button key={c.key} onClick={() => { onSelect(c); setOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${selectedChain?.key === c.key ? 'bg-red-400/8' : ''}`}>
              <img src={c.logo} alt={c.name} className="w-5 h-5 rounded-full flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <span className="text-[#0A0A0A] flex-1 text-left">{c.name}</span>
              <span className="text-[#999999] text-xs">{c.token}</span>
              {selectedChain?.key === c.key && <span className="text-[#0A0A0A] text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function IssueModal({ t, onClose, chainId = 97 }: { t: typeof LANG['en']; onClose: () => void; chainId?: number }) {
  const m = t.modal;
  const isZh = t.nav.arena === '广场';

  // Form state
  const [claim, setClaim] = useState('');
  const [rule, setRule] = useState('');
  const [stake, setStake] = useState('');
  const [duration, setDuration] = useState('30');
  const [durationUnit, setDurationUnit] = useState(0);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [audienceRatio] = useState(0);
  const [tgUsername, setTgUsername] = useState('');

  // Step: 'form' | 'scanning' | 'report' | 'signing'
  const [step, setStep] = useState<'form' | 'scanning' | 'report' | 'signing'>('form');
  const [auditResult, setAuditResult] = useState<any>(null);

  const currentToken = chainId === 97 ? 'tBNB' : chainId === 5003 ? 'MNT' : chainId === 56 ? 'BNB' : 'ETH';
  const currentNetwork = chainId === 97 ? 'BNB Testnet' : chainId === 5003 ? 'Mantle Sepolia' : chainId === 56 ? 'BNB Chain' : 'Ethereum';
  const presetDays = [7, 14, 30, 90];

  const { create, isPending, isConfirming, isSuccess, error } = useCreate();

  useEffect(() => {
    if (isSuccess) { setTimeout(onClose, 1500); }
  }, [isSuccess, onClose]);

  const canReview = claim.trim() && rule.trim() && parseFloat(stake) > 0;

  // Call /api/audit then show report
  const handleReview = async () => {
    if (!canReview) return;
    setStep('scanning');
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimText: claim.trim(),
          ruleText: rule.trim(),
          lang: isZh ? 'zh' : 'en',
        }),
      });
      const data = await res.json();
      setAuditResult(data.error ? null : data);
    } catch {
      setAuditResult(null);
    }
    setStep('report');
  };

  // Proceed to sign after reviewing
  const handleProceed = () => {
    const multipliers = [1, 7, 30];
    const durationSecs = parseInt(duration) * multipliers[durationUnit] * 86400;
    const visNum = visibility === 'public' ? 0 : 1;
    const claimTrimmed = claim.trim();
    const ruleTrimmed = rule.trim();
    if (typeof window !== 'undefined') {
      try {
        const { keccak256, toBytes } = require('viem');
        const cHash = keccak256(toBytes(claimTrimmed));
        const rHash = keccak256(toBytes(ruleTrimmed));
        localStorage.setItem('claim_' + cHash, claimTrimmed);
        localStorage.setItem('rule_' + rHash, ruleTrimmed);
        const tgClean = tgUsername.trim() ? tgUsername.trim().replace(/^@/, '').toLowerCase() : undefined;
        fetch('/api/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ claimHash: cHash, ruleHash: rHash, claimText: claimTrimmed, ruleText: ruleTrimmed, tgUsername: tgClean }),
        }).catch(() => {});
        // Cache audit result
        if (auditResult) {
          fetch('/api/audit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ claimText: claimTrimmed, ruleText: ruleTrimmed, lang: isZh ? 'zh' : 'en', claimHash: cHash }),
          }).catch(() => {});
        }
      } catch (e) {}
    }
    create({ claim: claimTrimmed, rule: ruleTrimmed, durationSecs, wagerEth: stake, audioBps: audienceRatio * 100, vis: visNum });
    setStep('signing');
  };

  const RISK_COLOR: Record<string, string> = { high: '#E24B4A', mid: '#EF9F27', low: '#639922' };
  const RISK_BG: Record<string, string> = { high: '#FCEBEB', mid: '#FAEEDA', low: '#EAF3DE' };
  const RISK_TEXT: Record<string, string> = { high: '#A32D2D', mid: '#854F0B', low: '#3B6D11' };
  const RISK_LABEL_EN: Record<string, string> = { high: 'High', mid: 'Medium', low: 'Low' };
  const RISK_LABEL_ZH: Record<string, string> = { high: '高风险', mid: '中风险', low: '低风险' };

  const btnLabel = isSuccess ? (isZh ? '✓ 发起成功!' : '✓ Created!') :
    isConfirming ? (isZh ? '链上确认中...' : 'Confirming...') :
    isPending ? (isZh ? '等待签名...' : 'Signing...') :
    (isZh ? '签名并上链 →' : 'Sign & submit →');

  const caseNo = `#${Math.floor(Math.random() * 90000 + 10000)}`;

  // ── Shared styles ──
  const S = {
    wrap: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' },
    modal: { background: '#fff', border: '0.5px solid #F0F0F0', borderRadius: '16px', width: '100%', maxWidth: '480px', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.12)' },
    header: { padding: '18px 24px 14px', borderBottom: '0.5px solid #F0F0F0', textAlign: 'center' as const },
    body: { padding: '20px 24px', display: 'flex', flexDirection: 'column' as const, gap: '16px', maxHeight: '65vh', overflowY: 'auto' as const },
    footer: { padding: '14px 24px', borderTop: '0.5px solid #F0F0F0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
    clause: { display: 'flex', gap: '10px', alignItems: 'flex-start' as const },
    clauseNum: { fontSize: '10px', fontWeight: 500, color: '#999999', fontFamily: 'monospace', minWidth: '24px', paddingTop: '10px', letterSpacing: '0.04em' },
    clauseContent: { flex: 1 },
    label: { fontSize: '10px', fontWeight: 500, color: '#666666', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '6px' },
    input: { width: '100%', background: '#FFFFFF', border: '0.5px solid #E0E0E0', borderRadius: '10px', padding: '9px 12px', fontSize: '13px', color: '#0A0A0A', outline: 'none', boxSizing: 'border-box' as const },
    textarea: { width: '100%', background: '#FFFFFF', border: '0.5px solid #E0E0E0', borderRadius: '10px', padding: '9px 12px', fontSize: '13px', color: '#0A0A0A', outline: 'none', resize: 'none' as const, boxSizing: 'border-box' as const, lineHeight: '1.6' },
    btnCancel: { padding: '10px', borderRadius: '10px', fontSize: '13px', color: '#666666', border: '0.5px solid #E0E0E0', background: 'transparent', cursor: 'pointer' },
    btnPrimary: { padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, color: '#fff', border: 'none', background: '#0A0A0A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },
  };

  // ── STEP: FORM ──
  if (step === 'form') return (
    <div style={S.wrap} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={S.header}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '0.5px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: '18px' }}>⚖️</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0A0A0A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
            {isZh ? '链上对赌协议' : 'On-Chain Wager Agreement'}
          </div>
          <div style={{ fontSize: '11px', color: '#999999' }}>Verdict Protocol · {currentNetwork}</div>
          <div style={{ fontSize: '10px', color: '#E0E0E0', marginTop: '4px', fontFamily: 'monospace' }}>CASE #—————  |  Draft</div>
        </div>

        {/* Body */}
        <div style={S.body}>
          {/* §1 Claim */}
          <div style={S.clause}>
            <div style={S.clauseNum}>§ 1</div>
            <div style={S.clauseContent}>
              <div style={S.label}>{isZh ? '声明 — 发起方主张' : 'Claim — The claimant asserts that'}</div>
              <textarea style={S.textarea} rows={3} value={claim} onChange={e => setClaim(e.target.value)}
                placeholder={isZh ? '例：BTC 将在 2026 年 12 月 31 日前突破 15 万美元（以 CoinGecko 收盘价为准）' : 'e.g. BTC will exceed $150,000 by Dec 31, 2026, as measured by CoinGecko closing price.'} />
            </div>
          </div>

          {/* §2 Ruling standard */}
          <div style={S.clause}>
            <div style={S.clauseNum}>§ 2</div>
            <div style={S.clauseContent}>
              <div style={S.label}>{isZh ? '裁定标准 — 结果以此为准' : 'Ruling standard — The verdict shall be determined by'}</div>
              <textarea style={S.textarea} rows={2} value={rule} onChange={e => setRule(e.target.value)}
                placeholder={isZh ? '例：以截止日 CoinGecko 日收盘价为准，链上数据优先。' : 'e.g. CoinGecko daily closing price on deadline. On-chain data takes precedence.'} />
            </div>
          </div>

          {/* §3 Stakes */}
          <div style={S.clause}>
            <div style={S.clauseNum}>§ 3</div>
            <div style={S.clauseContent}>
              <div style={S.label}>{isZh ? '押注金额' : 'Stakes'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                <input style={S.input} type="number" min="0" step="0.001" value={stake} onChange={e => setStake(e.target.value)} placeholder="0.00" />
                <div style={{ background: '#F5F5F5', border: '0.5px solid #F0F0F0', borderRadius: '10px', padding: '9px 14px', fontSize: '13px', fontWeight: 600, color: '#444444' }}>{currentToken}</div>
              </div>
            </div>
          </div>

          {/* §4 Duration */}
          <div style={S.clause}>
            <div style={S.clauseNum}>§ 4</div>
            <div style={S.clauseContent}>
              <div style={S.label}>{isZh ? '有效期' : 'Duration'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <input style={S.input} type="number" min="1" value={duration} onChange={e => setDuration(e.target.value)} />
                <select style={S.input} value={durationUnit} onChange={e => setDurationUnit(Number(e.target.value))}>
                  <option value={0}>{isZh ? '天' : 'Days'}</option>
                  <option value={1}>{isZh ? '周' : 'Weeks'}</option>
                  <option value={2}>{isZh ? '月' : 'Months'}</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {presetDays.map(d => (
                  <button key={d} onClick={() => { setDuration(String(d)); setDurationUnit(0); }}
                    style={{ flex: 1, padding: '6px', borderRadius: '8px', fontSize: '11px', fontWeight: 500, cursor: 'pointer',
                      border: duration === String(d) && durationUnit === 0 ? '1px solid #0A0A0A' : '0.5px solid #F0F0F0',
                      background: duration === String(d) && durationUnit === 0 ? '#0A0A0A' : '#FFFFFF',
                      color: duration === String(d) && durationUnit === 0 ? '#fff' : '#666666' }}>
                    {d}{isZh ? '天' : 'd'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* §5 Audience pool */}
          <div style={S.clause}>
            <div style={S.clauseNum}>§ 5</div>
            <div style={S.clauseContent}>
              <div style={S.label}>
                {isZh ? '观众池分配' : 'Audience pool allocation'}
                <span style={{ fontSize: '9px', color: '#E0E0E0', fontStyle: 'italic', textTransform: 'none', letterSpacing: 0, marginLeft: '6px' }}>
                  {isZh ? '开发中' : 'in development'}
                </span>
              </div>
              <div style={{ background: '#FFFFFF', border: '0.5px solid #F0F0F0', borderRadius: '10px', padding: '12px', opacity: 0.6 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ textAlign: 'center', padding: '8px', background: '#fff', border: '0.5px solid #F0F0F0', borderRadius: '8px' }}>
                    <div style={{ fontSize: '9px', color: '#999999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{isZh ? '赢家获得' : 'Winner gets'}</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#444444' }}>100%</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px', background: '#fff', border: '0.5px solid #F0F0F0', borderRadius: '8px' }}>
                    <div style={{ fontSize: '9px', color: '#999999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{isZh ? '观众池' : 'Audience'}</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#444444' }}>0%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* §6 Visibility */}
          <div style={S.clause}>
            <div style={S.clauseNum}>§ 6</div>
            <div style={S.clauseContent}>
              <div style={S.label}>{isZh ? '可见性' : 'Visibility'}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {[
                  { key: 'public' as const, name: isZh ? '公开' : 'Public', desc: isZh ? '在广场展示，任何人可接受挑战' : 'Listed in Arena. Any wallet may accept.' },
                  { key: 'private' as const, name: isZh ? '私密' : 'Private', desc: isZh ? '仅通过链接访问，分享给指定对手' : 'Accessible via link only. Share with your challenger.' },
                ].map(opt => (
                  <div key={opt.key} onClick={() => setVisibility(opt.key)}
                    style={{ border: visibility === opt.key ? '1px solid #444444' : '0.5px solid #F0F0F0', borderRadius: '10px', padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '10px', background: visibility === opt.key ? '#FFFFFF' : '#fff' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: visibility === opt.key ? '2px solid #0A0A0A' : '1.5px solid #E0E0E0', background: visibility === opt.key ? '#0A0A0A' : 'transparent', flexShrink: 0, marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {visibility === opt.key && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#fff' }} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#0A0A0A', marginBottom: '2px' }}>{opt.name}</div>
                      <div style={{ fontSize: '11px', color: '#666666' }}>{opt.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* §7 TG */}
          <div style={S.clause}>
            <div style={S.clauseNum}>§ 7</div>
            <div style={S.clauseContent}>
              <div style={S.label}>{isZh ? 'Telegram 通知' : 'Telegram notification'}</div>
              <input style={S.input} type="text" value={tgUsername} onChange={e => setTgUsername(e.target.value)} placeholder="@your_telegram_username" />
              <div style={{ fontSize: '10px', color: '#999999', marginTop: '4px' }}>
                {isZh ? '先给 @VerdictProtocol_Bot 发 /start 才能收到通知' : 'Send /start to @VerdictProtocol_Bot first to activate notifications.'}
              </div>
            </div>
          </div>

          {/* §8 Signatures */}
          <div style={{ borderTop: '0.5px dashed #F0F0F0', paddingTop: '16px' }}>
            <div style={S.clause}>
              <div style={S.clauseNum}>§ 8</div>
              <div style={S.clauseContent}>
                <div style={S.label}>{isZh ? '签名' : 'Signatures'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ border: '0.5px solid #F0F0F0', borderRadius: '10px', padding: '10px 12px', minHeight: '52px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <div style={{ fontSize: '9px', color: '#999999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{isZh ? '发起方 (红方)' : 'Claimant (Red)'}</div>
                    <div style={{ fontSize: '12px', color: '#666666', fontStyle: 'italic' }}>{isZh ? '已连接钱包' : 'Connected wallet'}</div>
                  </div>
                  <div style={{ border: '0.5px dashed #F0F0F0', borderRadius: '10px', padding: '10px 12px', minHeight: '52px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <div style={{ fontSize: '9px', color: '#999999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{isZh ? '挑战方 (蓝方)' : 'Challenger (Blue)'}</div>
                    <div style={{ fontSize: '12px', color: '#E0E0E0', fontStyle: 'italic' }}>{isZh ? '等待接受' : 'Awaiting acceptance'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={S.footer}>
          <button style={S.btnCancel} onClick={onClose}>{isZh ? '取消' : 'Cancel'}</button>
          <button style={{ ...S.btnPrimary, opacity: canReview ? 1 : 0.45, cursor: canReview ? 'pointer' : 'not-allowed' }}
            onClick={handleReview} disabled={!canReview}>
            <span>🛡</span>
            {isZh ? 'ContractAI 审查' : 'Review with ContractAI'}
            <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '4px', background: 'rgba(255,255,255,0.2)', fontWeight: 500 }}>AI</span>
          </button>
        </div>
      </div>
    </div>
  );

  // ── STEP: SCANNING ──
  if (step === 'scanning') return (
    <div style={S.wrap}>
      <div style={{ ...S.modal, maxWidth: '360px' }}>
        <div style={{ padding: '40px 32px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '68px', margin: '0 auto 20px', position: 'relative', border: '0.5px solid #F0F0F0', borderRadius: '5px', overflow: 'hidden', background: '#FAFAFA' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, height: '1.5px', background: 'linear-gradient(90deg, transparent, #0A0A0A, transparent)', animation: 'scanBeam 1.6s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '5px', padding: '10px 8px' }}>
              {[1, 0.5, 0.3].map((op, i) => (
                <div key={i} style={{ height: '2px', borderRadius: '1px', background: '#E0E0E0', opacity: op }} />
              ))}
            </div>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#0A0A0A', marginBottom: '12px' }}>
            {isZh ? 'ContractAI 审查中...' : 'ContractAI analyzing...'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {(isZh ? ['解析合同结构', '审查条款风险', '生成报告'] : ['Parsing contract', 'Reviewing clauses', 'Generating report']).map((s, i) => (
              <div key={i} style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '7px', color: i === 1 ? '#0A0A0A' : '#999999' }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', flexShrink: 0, background: i === 0 ? '#639922' : i === 1 ? '#0A0A0A' : '#F0F0F0' }} />
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes scanBeam { 0% { top: -2px; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }`}</style>
    </div>
  );

  // ── STEP: REPORT ──
  if (step === 'report') {
    const risks = auditResult?.risks || [];
    const score = auditResult?.overallScore ?? 0;
    const summary = auditResult?.summary || '';
    const highCount = risks.filter((r: any) => r.level === 'high').length;
    const midCount = risks.filter((r: any) => r.level === 'mid').length;
    const lowCount = risks.filter((r: any) => r.level === 'low').length;
    const riskLevel = score <= 30 ? (isZh ? '⚖️ 低风险' : '⚖️ Low risk') :
      score <= 60 ? (isZh ? '🔍 中等风险' : '🔍 Medium risk') :
      score <= 80 ? (isZh ? '⚠️ 高风险' : '⚠️ High risk') :
      (isZh ? '🔨 极高风险' : '🔨 Critical');

    return (
      <div style={S.wrap} onClick={onClose}>
        <div style={S.modal} onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div style={{ ...S.header, display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' as const, padding: '16px 24px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '0.5px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>⚖️</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0A0A0A' }}>
                {isZh ? 'ContractAI 风险报告' : 'ContractAI Risk Report'}
              </div>
              <div style={{ fontSize: '11px', color: '#999999' }}>CASE {caseNo} · {isZh ? '对赌协议' : 'Wager Agreement'} · Draft</div>
            </div>
          </div>

          {/* Score bar */}
          {auditResult && (
            <div style={{ padding: '16px 24px', borderBottom: '0.5px solid #F0F0F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#999999', marginBottom: '2px' }}>{isZh ? '风险评分' : 'Risk score'}</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: '#0A0A0A' }}>{score} <span style={{ fontSize: '13px', fontWeight: 400, color: '#999999' }}>/100</span></div>
                </div>
                <div style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', background: score > 60 ? '#FCEBEB' : score > 30 ? '#FAEEDA' : '#EAF3DE', color: score > 60 ? '#A32D2D' : score > 30 ? '#854F0B' : '#3B6D11' }}>
                  {riskLevel}
                </div>
              </div>
              <div style={{ height: '3px', background: '#F5F5F5', borderRadius: '2px', overflow: 'hidden', marginBottom: '10px' }}>
                <div style={{ height: '100%', width: `${score}%`, borderRadius: '2px', background: score > 60 ? '#E24B4A' : score > 30 ? '#EF9F27' : '#639922' }} />
              </div>
              <div style={{ display: 'flex', gap: '14px' }}>
                {[{ c: '#E24B4A', n: highCount, l: isZh ? '高' : 'High' }, { c: '#EF9F27', n: midCount, l: isZh ? '中' : 'Med' }, { c: '#639922', n: lowCount, l: isZh ? '低' : 'Low' }].map(s => (
                  <div key={s.l} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#666666' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: s.c }} />
                    {s.n} {s.l}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div style={{ padding: '12px 24px', borderBottom: '0.5px solid #F0F0F0', fontSize: '12px', color: '#666666', lineHeight: '1.6', fontStyle: 'italic' }}>
              "{summary}"
            </div>
          )}

          {/* Risk list */}
          <div style={{ padding: '14px 24px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
            {!auditResult ? (
              <div style={{ fontSize: '13px', color: '#999999', textAlign: 'center', padding: '20px 0' }}>
                {isZh ? 'AI 分析暂时不可用，你仍然可以继续发起。' : 'AI analysis temporarily unavailable. You may still proceed.'}
              </div>
            ) : risks.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#639922', textAlign: 'center', padding: '20px 0' }}>
                {isZh ? '✓ 未发现明显风险' : '✓ No significant risks found'}
              </div>
            ) : risks.map((r: any, i: number) => (
              <div key={i} style={{ border: '0.5px solid #F0F0F0', borderLeft: `2.5px solid ${RISK_COLOR[r.level] || '#F0F0F0'}`, borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', background: RISK_BG[r.level], color: RISK_TEXT[r.level] }}>
                    {isZh ? RISK_LABEL_ZH[r.level] : RISK_LABEL_EN[r.level]}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#0A0A0A' }}>{r.title}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#666666', lineHeight: '1.5', marginBottom: '8px' }}>{r.description}</div>
                <div style={{ fontSize: '11px', color: '#999999', lineHeight: '1.5', padding: '7px 10px', background: '#FFFFFF', borderRadius: '7px', display: 'flex', gap: '6px' }}>
                  <span>💡</span><span>{r.suggestion}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ ...S.footer, flexDirection: 'column' as const, display: 'flex', gap: '8px' }}>
            <div style={{ fontSize: '11px', color: '#999999', textAlign: 'center' }}>
              {isZh ? '你可以返回修改，或确认风险继续签名。' : 'You may revise the contract, or acknowledge the risks and proceed.'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button style={S.btnCancel} onClick={() => setStep('form')}>
                {isZh ? '← 返回修改' : '← Revise'}
              </button>
              <button style={{ ...S.btnPrimary, opacity: isPending || isConfirming ? 0.6 : 1 }}
                onClick={handleProceed} disabled={isPending || isConfirming}>
                {btnLabel}
              </button>
            </div>
            {error && <div style={{ fontSize: '11px', color: '#E24B4A', background: '#FCEBEB', borderRadius: '8px', padding: '8px 12px' }}>
              {(error as any)?.shortMessage || (error as any)?.message}
            </div>}
          </div>
        </div>
      </div>
    );
  }

  // ── STEP: SIGNING ──
  return (
    <div style={S.wrap}>
      <div style={{ ...S.modal, maxWidth: '360px' }}>
        <div style={{ padding: '40px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>{isSuccess ? '✅' : '✍️'}</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0A0A0A', marginBottom: '6px' }}>
            {isSuccess ? (isZh ? '对决已上链！' : 'Duel is live!') :
             isConfirming ? (isZh ? '链上确认中...' : 'Confirming on-chain...') :
             (isZh ? '等待钱包签名...' : 'Waiting for wallet signature...')}
          </div>
          <div style={{ fontSize: '12px', color: '#999999' }}>
            {isSuccess ? (isZh ? '正在关闭...' : 'Closing...') : (isZh ? '请在钱包中确认交易' : 'Please confirm in your wallet')}
          </div>
          {error && (
            <div style={{ marginTop: '16px', fontSize: '11px', color: '#E24B4A', background: '#FCEBEB', borderRadius: '8px', padding: '8px 12px' }}>
              {(error as any)?.shortMessage || (error as any)?.message}
            </div>
          )}
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
    <div className="bg-white border border-[#F0F0F0] rounded-lg overflow-hidden" style={{ display: 'grid', gridTemplateColumns: '70% 30%', height: '540px' }}>
      <div className="flex flex-col border-r border-white/10 bg-[#07070f] overflow-hidden">
        <div className="bg-[#09091e] border-b border-white/5 px-3 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded px-2.5 py-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /><span className="text-[9px] font-bold text-red-400 tracking-widest">LIVE</span></div>
          <div className="flex items-center gap-2"><div className="flex">{['#6a1a3a','#1a3a6a','#1a6a2a'].map((c,i) => (<div key={i} className="w-4 h-4 rounded-full overflow-hidden border border-[#09091e] -ml-1 first:ml-0 relative"><div className="absolute inset-0" style={{ background: c }} /><img src={WARRIOR_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-top" /></div>))}</div><span className="text-[10px] text-[#999999]"><span className="text-green-400 font-semibold">{watchers}</span> {lt.watching}</span></div>
          <div className="flex items-center gap-2"><span className="text-[8px] text-red-400 border border-red-400/30 bg-red-400/10 rounded px-1.5 py-0.5 tracking-wider">KOL BATTLE</span><span className="text-[8px] tracking-widest text-[#E0E0E0]">#{LIVE_DUEL.id}</span></div>
        </div>
        <div className="bg-[#0a0a1e] border-b border-white/5 px-3 py-2 flex-shrink-0 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[7px] tracking-widest uppercase text-white/20 mb-1">{t.events.duelIssued}</div>
            <div className="text-[11px] font-semibold text-white/80 leading-snug mb-1">{t.duels[0].claim}</div>
            <div className="flex items-center gap-2"><span className="text-[7px] tracking-widest uppercase text-[#E0E0E0]">Ruling</span><span className="text-[9px] text-[#999999]">DeFiLlama TVL data at expiry · 00:00 UTC</span></div>
          </div>
          <button onClick={onEnter} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-red-400 border border-red-400/40 bg-red-400/10 hover:bg-red-400/20 transition-colors whitespace-nowrap flex-shrink-0">{lt.enterDuel}</button>
        </div>
        <div className="px-3 py-3 flex-shrink-0" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', position: 'relative' }}>
          {/* RED */}
          <div className="flex flex-col items-center gap-2 text-center" style={{ transform: isRedLeading ? 'scale(1.04)' : 'scale(0.96)', transition: 'transform 0.6s ease' }}>
            <div className="relative">
              {isRedLeading && <div className="absolute inset-[-10px] rounded-lg pointer-events-none" style={{ background: 'radial-gradient(circle,rgba(255,107,107,0.25),transparent 70%)' }} />}
              <div className="w-12 h-12 rounded-lg overflow-hidden relative border-2 border-red-400" style={{ filter: isRedLeading ? 'brightness(1.1)' : 'brightness(0.75) saturate(0.6)', transition: 'filter 0.6s ease' }}><div className="absolute inset-0" style={{ background: LIVE_DUEL.challenger.color }} /><img src={WARRIOR_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-top" /><div className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-green-400 border border-[#07070f]" /></div>
            </div>
            <div className="text-[10px] font-semibold text-white/80">{LIVE_DUEL.challenger.name}</div>
            <div className="text-[8px] text-white/25 font-mono">{LIVE_DUEL.challenger.addr}</div>
            <div className="text-[8px] text-[#999999]">Bullish — Mantle flips</div>
            <div className="text-lg font-bold text-red-400">{LIVE_DUEL.amount} <span className="text-[8px] text-[#E0E0E0]">ETH</span></div>
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
              {!isRedLeading && <div className="absolute inset-[-10px] rounded-lg pointer-events-none" style={{ background: 'radial-gradient(circle,rgba(107,159,255,0.25),transparent 70%)' }} />}
              <div className="w-12 h-12 rounded-lg overflow-hidden relative border-2 border-blue-400" style={{ filter: !isRedLeading ? 'brightness(1.1)' : 'brightness(0.75) saturate(0.6)', transition: 'filter 0.6s ease' }}><div className="absolute inset-0" style={{ background: LIVE_DUEL.defender.color }} /><img src={WARRIOR_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-top" /><div className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-green-400 border border-[#07070f]" /></div>
            </div>
            <div className="text-[10px] font-semibold text-white/80">{LIVE_DUEL.defender.name}</div>
            <div className="text-[8px] text-white/25 font-mono">{LIVE_DUEL.defender.addr}</div>
            <div className="text-[8px] text-[#999999]">Bearish — Arbitrum holds</div>
            <div className="text-lg font-bold text-blue-400">{LIVE_DUEL.amount} <span className="text-[8px] text-[#E0E0E0]">ETH</span></div>
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
          <div className="flex items-center justify-between mb-1.5"><span className="text-[7px] tracking-widest uppercase text-[#E0E0E0]">support_rate · live</span><div className="flex items-center gap-2"><div className="flex items-center gap-1"><span className="text-[7px] text-[#E0E0E0]">less</span>{[1,2,3,4,5].map(i => <div key={i} className="w-1.5 h-1.5 rounded-sm" style={{ background: RED_STOPS[i] }} />)}<span className="text-[7px] text-red-400/40">red</span></div><div className="flex items-center gap-1">{[1,2,3,4,5].map(i => <div key={i} className="w-1.5 h-1.5 rounded-sm" style={{ background: BLU_STOPS[i] }} />)}<span className="text-[7px] text-blue-400/40">blue</span><span className="text-[7px] text-[#E0E0E0]">more</span></div></div></div>
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
              <div><div className="text-[6px] tracking-widest uppercase text-white/15 mb-0.5">Time elapsed</div><div className="h-1.5 bg-[#F5F5F5] rounded-full overflow-hidden"><div className="h-full bg-orange-400/50 rounded-full" style={{ width: '41%' }} /></div><div className="flex justify-between mt-0.5"><span className="text-[6px] text-orange-400/40">41% elapsed</span><span className="text-[6px] text-[#E0E0E0]">44d left</span></div></div>
            </div>
          </div>
        </div>
        <div className="bg-[#04040c] border-t border-white/5 px-3 py-1.5 flex justify-between items-center flex-shrink-0"><span className="text-[7px] tracking-widest uppercase text-[#E0E0E0]">{lt.expiresIn}</span><span className="text-[9px] font-mono text-red-400/50">{timer}</span></div>
      </div>
      {/* CHAT */}
      <div className="flex flex-col bg-[#07070f] overflow-hidden">
        <div className="bg-[#08081a] border-b border-white/5 px-3 py-2 flex items-center justify-between flex-shrink-0"><span className="text-[9px] font-semibold tracking-widest uppercase text-[#999999]">{lt.liveChat}</span><span className="text-[8px] text-[#E0E0E0]">{Math.floor(watchers * 0.15)} {lt.online}</span></div>
        <div ref={chatRef} className="flex-1 overflow-y-auto p-2 flex flex-col gap-2" style={{ scrollbarWidth: 'none' }}>
          {chatMsgs.map((m, i) => (<div key={i} className="flex items-start gap-1.5"><div className="w-4 h-4 rounded-full overflow-hidden relative flex-shrink-0 mt-0.5"><div className="absolute inset-0" style={{ background: m.color }} /><img src={WARRIOR_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-top" /></div><div className="flex-1 min-w-0"><div className="flex items-center gap-1.5 mb-0.5 flex-wrap"><span className={`text-[8px] font-bold ${m.cls}`}>{m.name}</span>{m.pill && <span className={`text-[7px] font-semibold rounded px-1 py-0.5 ${m.pill==='r'?'text-red-400 bg-red-400/15 border border-red-400/25':'text-blue-400 bg-blue-400/15 border border-blue-400/25'}`}>{m.pill==='r'?'RED':'BLUE'}</span>}</div><div className="text-[9px] text-white/35 leading-snug">{m.text}</div></div></div>))}
        </div>
        <div className="border-t border-white/5 px-2 py-1.5 grid grid-cols-2 gap-1.5 bg-[#08081a] flex-shrink-0"><button className="py-1 rounded-md text-[8px] font-semibold text-red-400 border border-red-400/25 bg-red-400/8 hover:bg-red-400/15 transition-colors truncate">👑 {LIVE_DUEL.challenger.name}</button><button className="py-1 rounded-md text-[8px] font-semibold text-blue-400 border border-blue-400/25 bg-blue-400/8 hover:bg-blue-400/15 transition-colors truncate">⚔️ {LIVE_DUEL.defender.name}</button></div>
        <div className="border-t border-white/5 px-2 py-1.5 bg-[#08081a] flex gap-1.5 items-center flex-shrink-0"><input className="flex-1 bg-[#0c0c1e] border border-white/8 rounded px-2.5 py-1.5 text-[9px] text-white/50 placeholder-white/20 outline-none" placeholder={lt.saySomething} /><button className="bg-red-400/15 border border-red-400/25 rounded px-2.5 py-1.5 text-[9px] text-red-400">{lt.send}</button></div>
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
  const borderColor = isAI ? '#F0F0F0' : isEnding ? '#FED7AA' : '#F0F0F0';
  const challengerAddr = (duel as any)._onChainId ? duel.challenger.addr : duel.challenger.addr;

  return (
    <div onClick={onClick} className="bg-white rounded-lg overflow-hidden cursor-pointer group flex flex-col" style={{border:`1.5px solid ${borderColor}`,transition:'box-shadow 0.2s,transform 0.2s'}} onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.transform='translateY(-3px)';(e.currentTarget as HTMLDivElement).style.boxShadow='0 12px 32px rgba(0,0,0,0.06)'}} onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.transform='';(e.currentTarget as HTMLDivElement).style.boxShadow=''}}>
      
      {/* HEADER */}
      <div className="px-4 pt-3.5 pb-0 flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${duel.type==='kolBattle'?'text-[#F43F5E] bg-[#FFF5F5]':duel.type==='friendsBet'?'text-[#1D4ED8] bg-[#F5F9FF]':duel.type==='communityWar'?'text-[#444444] bg-[#F5F5F5]':'text-[#065F46] bg-[#ECFDF5]'}`}>{t.tags[duel.type]}</span>
          {isAI && <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full text-[#444444] bg-[#F5F5F5]">vs AI</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#999999] font-medium">#{(duel as any)._onChainId || duel.id}</span>
          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${duel.status==='live'?'text-[#F43F5E] bg-[#FFF5F5]':isOpen?'text-[#3B82F6] bg-[#F5F9FF]':isEnding?'text-[#EA580C] bg-[#FFF7ED]':'text-[#059669] bg-[#ECFDF5]'}`}>{t.tags[duel.status]}</span>
        </div>
      </div>

      {/* CLAIM — accent bar style */}
      <div className="mx-4 mt-3 mb-3 rounded-lg overflow-hidden flex" style={{background:'#FFFFFF',border:'1px solid #F0F0F0'}}>
        <div className="w-1 flex-shrink-0 rounded-l-2xl" style={{background: isEnding?'#F97316':'#0A0A0A'}} />
        <div className="px-3 py-2.5 min-w-0">
          <p className="text-[13px] font-medium text-[#0A0A0A] leading-snug line-clamp-2">{claimText}</p>
          {ruleText && <p className="text-[10px] text-[#999999] mt-1 truncate">⚖️ {ruleText.length>50?ruleText.slice(0,50)+'...':ruleText}</p>}
        </div>
      </div>

      {/* PLAYERS */}
      <div className="px-4 pb-3" style={{display:'grid',gridTemplateColumns:'1fr 44px 1fr',gap:'8px',alignItems:'center'}}>
        {/* RED */}
        <div className="rounded-lg p-3" style={{background:'#FFF5F5',border:'1px solid #FFE0E0'}}>
          <div className="flex items-center gap-2 mb-2.5">
            <GradientAvatar addr={duel.challenger.addr || '0xabc'} size={36} />
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-[#0A0A0A] truncate">{duel.challenger.name}</div>
              <div className="text-[9px] text-[#999999] mt-0.5">{t.nav.arena === '广场' ? '发起方' : 'Challenger'}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[22px] font-bold text-[#F43F5E] leading-none">{duel.challenger.amount}</span>
            <span className="text-[10px] font-semibold text-[#F43F5E] bg-[#FFE0E0] px-2 py-0.5 rounded-lg">{duel.token}</span>
          </div>
        </div>

        {/* VS */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-[10px] font-bold text-[#444444] bg-[#F5F5F5] px-2 py-1.5 rounded-lg w-full text-center">VS</div>
          {chain && <img src={chain.logo} alt={chain.name} className="w-5 h-5 rounded-full border border-[#F0F0F0]" onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />}
        </div>

        {/* BLUE / EMPTY */}
        {isAI ? (
          <div className="rounded-lg p-3 flex flex-col items-center justify-center gap-1.5" style={{background:'#F5F5F5',border:'1px solid #F0F0F0',minHeight:'84px'}}>
            <div className="w-9 h-9 rounded-full bg-[#F5F5F5] flex items-center justify-center text-xl">⚖️</div>
            <div className="text-[11px] font-semibold text-[#444444]">AI Judge</div>
          </div>
        ) : duel.defender ? (
          <div className="rounded-lg p-3" style={{background:'#F5F9FF',border:'1px solid #E0EEFF'}}>
            <div className="flex items-center gap-2 mb-2.5">
              <GradientAvatar addr={duel.defender.addr || '0xdef'} size={36} />
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-[#0A0A0A] truncate">{duel.defender.name}</div>
                <div className="text-[9px] text-[#999999] mt-0.5">{t.nav.arena === '广场' ? '接受方' : 'Defender'}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[20px] font-normal text-[#3B82F6] leading-none">{duel.defender.amount}</span>
              <span className="text-[10px] font-semibold text-[#3B82F6] bg-[#E0EEFF] px-2 py-0.5 rounded-lg">{duel.token}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-lg p-3 flex flex-col items-center justify-center gap-1.5" style={{background:'#FFFFFF',border:'1.5px dashed #E0E0E0',minHeight:'84px'}}>
            <div className="text-3xl text-[#E0E0E0]">?</div>
            <div className="text-[10px] font-medium text-[#999999]">{t.nav.arena === '广场' ? '等待应战' : 'Waiting'}</div>
          </div>
        )}
      </div>

      {/* SUPPORT BAR */}
      <div className="px-4 pb-3">
        <div className="h-2 bg-[#F5F5F5] rounded-full overflow-hidden flex mb-2" style={{position:'relative'}}>
          <div className="bg-[#F43F5E] rounded-l-full transition-all duration-700" style={{width:`${duel.supportRed}%`}} />
          <div className={`rounded-r-full flex-1 ${isAI?'bg-[#444444]':'bg-[#3B82F6]'}`} />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-bold text-[#F43F5E]">{duel.supportRed}%</span>
          <span className="text-[9px] text-[#999999] tracking-wide">{t.nav.arena === '广场' ? '社区支持率' : 'Community Vote'}</span>
          <span className={`text-[11px] font-bold ${isAI?'text-[#444444]':'text-[#3B82F6]'}`}>{100-duel.supportRed}%</span>
        </div>
      </div>

      {/* CHIPS ROW */}
      <div className="px-4 pb-3 flex gap-2 flex-wrap">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold border ${isEnding?'bg-[#FFF7ED] border-[#FED7AA] text-[#EA580C]':'bg-[#FFFFFF] border-[#F0F0F0] text-[#444444]'}`}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          {duel.expires}
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold border bg-[#FFFFFF] border-[#F0F0F0] text-[#444444]">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6"/><path d="M8 14h8"/></svg>
          {totalPot} {duel.token}
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold border bg-[#FFFFFF] border-[#F0F0F0] text-[#444444]">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          {duel.watchers}
        </div>
      </div>

      {/* FOOTER BUTTONS */}
      <div className="px-4 pb-4 mt-auto flex gap-2 border-t border-[#F5F5F5] pt-3">
        <button onClick={e=>{e.stopPropagation();onEnter();}} className="flex-1 py-2.5 rounded-lg text-[12px] font-bold text-white transition-all hover:opacity-90 active:scale-95" style={{background:isOpen?'#E24B4A':'#0A0A0A'}}>
          {isOpen ? (t.nav.arena === '广场' ? '⚔️ 接受挑战' : '⚔️ Accept Challenge') : t.card.enterDuel}
        </button>
        <button onClick={e=>{e.stopPropagation();generateStampImage(duel);}} className="px-3 py-2.5 rounded-lg text-[12px] font-semibold bg-[#F5F5F5] text-[#444444] border border-[#F0F0F0] hover:bg-[#F5F5F5] transition-colors" title="Share as image">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        </button>
      </div>

      {/* NETWORK BAR */}
      <div className="px-4 py-2 flex justify-between items-center" style={{background:'#FFFFFF',borderTop:'1px solid #F0F0F0'}}>
        <div className="flex items-center gap-1.5">
          {chain && <img src={chain.logo} alt="" className="w-3.5 h-3.5 rounded-full" onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />}
          <span className="text-[9px] font-medium text-[#999999]">{duel.network}</span>
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
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceDesc, setEvidenceDesc] = useState('');
  const [evidenceLinks, setEvidenceLinks] = useState(['', '', '']);
  const [evidencePending, setEvidencePending] = useState(false);
  const [evidenceSubmitted, setEvidenceSubmitted] = useState(false);
  const [verdictData, setVerdictData] = useState<any>(null);
  const [requestingRuling, setRequestingRuling] = useState(false);
  const [agentStep, setAgentStep] = useState(0); // 0=idle, 1-4=steps, 5=done
  const [agentStepText, setAgentStepText] = useState('');
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [mutualChoice, setMutualChoice] = useState<'self'|'opponent'|null>(null);
  const [mutualPending, setMutualPending] = useState(false);
  const [mutualSubmitted, setMutualSubmitted] = useState<'self'|'opponent'|null>(null);
  const [settleResult, setSettleResult] = useState<{winner: string, amount: string} | null>(null);
  const [opponentClaim, setOpponentClaim] = useState<number>(0); // 0=none, 1=Red, 2=Blue

  // Load existing verdict and evidence status
  useEffect(() => {
    if (!onChainDuel) return;
    const chainId = targetChainId;
    const originalId = (onChainDuel as any).originalId ?? onChainDuel.id;
    fetch(`/api/judge?chainId=${chainId}&duelId=${originalId}`)
      .then(r => r.json())
      .then(d => { if (d.verdict) setVerdictData(d.verdict); })
      .catch(() => {});
    // check if I already submitted evidence
    const myAddr = address?.toLowerCase() || '';
    const side = isMyRed ? 'red' : 'blue';
    fetch(`/api/evidence?chainId=${chainId}&duelId=${originalId}`)
      .then(r => r.json())
      .then(d => {
        const myEvidence = side === 'red' ? d.redEvidence : d.blueEvidence;
        if (myEvidence?.address?.toLowerCase() === myAddr) setEvidenceSubmitted(true);
      })
      .catch(() => {});
  }, [onChainDuel?.id, address]);

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
    overlay: {position:'fixed' as const,inset:0,background:'rgba(0,0,0,0.35)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'},
    modal: {background:'#fff',border:'1.5px solid #F0F0F0',borderRadius:'10px',width:'100%',maxWidth:'440px',overflow:'hidden',boxShadow:'0 2px 16px rgba(0,0,0,0.06)'},
    head: {background:'#FFFFFF',borderBottom:'1px solid #F0F0F0',padding:'11px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'},
    body: {padding:'14px',display:'flex',flexDirection:'column' as const,gap:'10px',maxHeight:'76vh',overflowY:'auto' as const},
    foot: {padding:'0 14px 14px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'},
    label: {fontSize:'9px',letterSpacing:'0.08em',textTransform:'uppercase' as const,color:'#999999',marginBottom:'4px'},
    claimBox: {background:'#F5F5F5',border:'1px solid #F0F0F0',borderRadius:'6px',padding:'11px 13px',fontSize:'13px',color:'#0A0A0A',lineHeight:1.6,fontWeight:500},
    ruleBox: {background:'#F5F9FF',border:'1px solid #E0EEFF',borderRadius:'6px',padding:'9px 12px',fontSize:'12px',color:'#1D4ED8',lineHeight:1.5,fontWeight:500},
    sideRed: {background:'#FFF5F5',border:'1px solid #FFE0E0',borderRadius:'6px',padding:'8px 10px'},
    sideBlue: {background:'#F5F9FF',border:'1px solid #E0EEFF',borderRadius:'6px',padding:'8px 10px',textAlign:'right' as const},
    sideDash: {background:'#FFFFFF',border:'1px dashed #E0E0E0',borderRadius:'6px',padding:'8px 10px',textAlign:'center' as const},
    aiBox: {background:'#F0EDFB',border:'1.5px solid #E0E0E0',borderRadius:'6px',padding:'10px 13px',display:'flex',alignItems:'flex-start',gap:'8px'},
    statRow: {display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'6px'},
    statBox: {background:'#FFFFFF',borderRadius:'10px',padding:'6px 8px',textAlign:'center' as const,border:'1px solid #F0F0F0'},
    divider: {height:'0.5px',background:'#F0F0F0'},
    phaseBox: {background:'#F0EDFB',border:'1.5px solid #E0E0E0',borderRadius:'6px',padding:'10px 13px'},
    resultWin: {background:'#ECFDF5',border:'1px solid #A7F3D0',borderRadius:'6px',padding:'10px 12px',display:'flex',alignItems:'center',gap:'10px'},
    resultLose: {background:'#FFF5F5',border:'1px solid #FFE0E0',borderRadius:'6px',padding:'10px 12px',display:'flex',alignItems:'center',gap:'10px'},
    disputeNote: {background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:'6px',padding:'7px 10px',fontSize:'10px',color:'#D97706',lineHeight:1.5},
  };

  const Pill = ({ label, color }: { label: string; color: string }) => (
    <span style={{fontSize:'9px',padding:'2px 7px',borderRadius:'10px',fontWeight:500,border:`1px solid ${color}40`,color,background:`${color}15`}}>{label}</span>
  );

  const statusLabel = isOpen ? t.tags.open : isActive ? t.tags.live : isSettled ? (t.tags as any).settled ?? 'Settled' : t.tags.open;
  const statusColor = isOpen ? '#3B82F6' : isActive ? '#7C3AED' : '#999999';

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
          {isMe && <span style={{fontSize:'9px',padding:'1px 5px',borderRadius:'10px',background:`${c}15`,color:c,border:`1px solid ${c}30`}}>나</span>}
        </div>
        <div style={{fontSize:'10px',color:`${c}`,marginBottom:'3px',fontWeight:500,opacity:0.75}}>{isRed ? (t.nav.arena === '广场' ? '发起方' : 'Challenger') : (t.nav.arena === '广场' ? '接受方' : 'Defender')}</div>
        <div style={{fontSize:'15px',fontWeight:700,color:c}}>{amt} <span style={{fontSize:'9px',color:'#999999'}}>{token}</span></div>
      </div>
    );
  };

  const StatBox = ({ label, val, color }: { label: string; val: string; color?: string }) => (
    <div style={S.statBox}>
      <div style={{fontSize:'8px',letterSpacing:'0.06em',textTransform:'uppercase',color:'#999999',marginBottom:'3px'}}>{label}</div>
      <div style={{fontSize:'13px',fontWeight:600,color:color||'#0A0A0A'}}>{val}</div>
    </div>
  );

  const Btn = ({ label, color, bg, border, onClick, disabled }: { label:string; color:string; bg:string; border:string; onClick?:()=>void; disabled?:boolean }) => (
    <button onClick={onClick} disabled={disabled} style={{padding:'10px',borderRadius:'6px',fontSize:'12px',fontWeight:600,color,border:`1.5px solid ${border}`,background:bg,cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.5:1}}>{label}</button>
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
      <div style={{fontSize:'10px',color:'#999999',textAlign:'center',fontWeight:500}}>VS</div>
      {duel.defender ? <SideCard side="blue" /> :
        <div style={S.sideDash}><div style={{fontSize:'11px',color:'#999999'}}>{t.nav.arena === '广场' ? '等待应战' : 'Waiting'}</div><div style={{fontSize:'20px',color:'#E0E0E0',lineHeight:1.2}}>?</div></div>
      }
    </div>
  );

  const SupportBar = () => (
    <div>
      <div style={{height:'5px',background:'#F5F5F5',borderRadius:'3px',overflow:'hidden',display:'flex'}}>
        <div style={{background:'#F43F5E',width:`${duel.supportRed}%`,transition:'width 0.5s'}} />
        <div style={{background:'#3B82F6',flex:1}} />
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:'3px'}}>
        <span style={{fontSize:'10px',fontWeight:500,color:'#F43F5E'}}>{duel.supportRed}%</span>
        <span style={{fontSize:'9px',color:'#999999'}}>{t.nav.arena === '广场' ? '社区支持率' : 'Community Vote'}</span>
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
        <Btn label={t.nav.arena === '广场' ? '取消' : 'Cancel'} color="#999999" bg="transparent" border="#F0F0F0" onClick={onClose} />
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
        {BigInt(Math.floor(Date.now()/1000)) > onChainDuel!.deadline && onChainDuel!.status === DuelStatus.Open ? (
          <Btn label={cancelPending ? (t.nav.arena==='广场'?'退款中...':'Refunding...') : cancelSuccess ? (t.nav.arena==='广场'?'✓ 已退款':'✓ Refunded') : (t.nav.arena==='广场'?'↩️ 申请退款':'↩️ Request Refund')} color="#D97706" bg="#FFFBEB" border="#FDE68A" onClick={() => onChainDuel && cancel(oid, undefined)} disabled={cancelPending} />
        ) : (
          <Btn label={cancelPending ? (t.nav.arena === '广场' ? '等待签名...' : 'Signing...') : cancelSuccess ? (t.nav.arena === '广场' ? '✓ 已取消' : '✓ Cancelled') : (t.nav.arena === '广场' ? '取消对决' : 'Cancel Duel')} color="rgba(255,107,107,0.6)" bg="rgba(255,107,107,0.06)" border="rgba(255,107,107,0.2)" onClick={() => onChainDuel && cancel(oid, undefined)} disabled={cancelPending} />
        )}
        <Btn label={t.nav.arena === '广场' ? '复制分享链接' : 'Copy Share Link'} color="#999999" bg="transparent" border="#F0F0F0"
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
        <div style={{fontSize:'11px',fontWeight:600,color:'#0A0A0A',marginBottom:'3px'}}>{t.nav.arena === '广场' ? '⏳ 对决进行中 — 到期后可操作' : '⏳ Duel in progress — actions after expiry'}</div>
        <div style={{fontSize:'10px',color:'#444444',lineHeight:1.5}}>{t.nav.arena === '广场' ? '到期后可提交证据申请裁定，或与对方达成共识直接结算。' : 'After expiry, submit evidence to request ruling, or reach consensus.'}</div>
      </div>
      {isJudge && <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
        <Btn label={settlePending ? t.nav.arena === '广场' ? '裁定中...' : 'Ruling...' : t.nav.arena === '广场' ? '⚖️ 裁红方胜' : '⚖️ Rule Red Wins'} color="rgba(255,107,107,0.9)" bg="rgba(255,107,107,0.06)" border="rgba(255,107,107,0.3)" onClick={() => onChainDuel && settle(oid, 1)} disabled={settlePending} />
        <Btn label={settlePending ? t.nav.arena === '广场' ? '裁定中...' : 'Ruling...' : t.nav.arena === '广场' ? '⚖️ 裁蓝方胜' : '⚖️ Rule Blue Wins'} color="rgba(107,159,255,0.9)" bg="rgba(107,159,255,0.06)" border="rgba(107,159,255,0.3)" onClick={() => onChainDuel && settle(oid, 2)} disabled={settlePending} />
      </div>}
      <div style={S.divider} />
      <div style={{padding:'0 14px 14px',display:'flex',flexDirection:'column',gap:'6px'}}>
        {verdictData && (() => {
          const isInsufficient = verdictData.winner === 'Insufficient' || verdictData.winnerSide === 0;
          const iWin = !isInsufficient && verdictData.winnerSide === (isMyRed ? 1 : 2);
          const bgColor = isInsufficient ? '#FFFBEB' : iWin ? '#ECFDF5' : '#FFF5F5';
          const borderColor = isInsufficient ? '#FDE68A' : iWin ? '#A7F3D0' : '#FFE0E0';
          const textColor = isInsufficient ? '#D97706' : iWin ? '#059669' : '#F43F5E';
          const resultText = isInsufficient
            ? (t.nav.arena==='广场'?'⚠️ 证据不足，无法裁定':'⚠️ Insufficient Evidence')
            : iWin ? (t.nav.arena==='广场'?'🏆 你赢了':'🏆 You Win')
            : (t.nav.arena==='广场'?'💀 对方赢了':'💀 Opponent Wins');
          const reasoning = verdictData.reasoningZh || verdictData.reasoning || '';
          const chainId = targetChainId;
          const originalId = (onChainDuel as any)?.originalId ?? onChainDuel?.id;
          return (
            <div style={{background:bgColor,border:`1px solid ${borderColor}`,borderRadius:'6px',padding:'12px 14px',marginBottom:'8px'}}>
              <div style={{fontSize:'11px',fontWeight:700,color:'#7C3AED',marginBottom:'4px'}}>⚖️ AI {t.nav.arena==='广场'?'裁定结果':'Judge Ruling'}</div>
              <div style={{fontSize:'14px',fontWeight:700,color:textColor,marginBottom:'4px'}}>{resultText}</div>
              <div style={{fontSize:'11px',color:'#444444',lineHeight:1.5,fontStyle:'italic',marginBottom:'6px'}}>"{t.nav.arena==='广场' ? (verdictData.reasoningZh || verdictData.reasoning) : (verdictData.reasoning || verdictData.reasoningZh)}"</div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:'10px',color:'#999999'}}>{t.nav.arena==='广场'?'置信度':'Confidence'}: {verdictData.confidence}%</div>
                <button onClick={() => window.open(`/verdict/${chainId}/${originalId}`, '_blank')}
                  style={{fontSize:'11px',fontWeight:600,color:'#7C3AED',background:'#F5F5F5',border:'1px solid #F0F0F0',borderRadius:'6px',padding:'4px 10px',cursor:'pointer'}}>
                  {t.nav.arena==='广场'?'🔍 查看裁定详情':'🔍 View Ruling'}
                </button>
              </div>
            </div>
          );
        })()}
        {opponentClaim > 0 && !mutualSubmitted && (
          <div style={{background:'#FFF7ED',border:'1px solid #FDE68A',borderRadius:'6px',padding:'10px 13px',marginBottom:'8px',fontSize:'12px',color:'#D97706'}}>
            ⚠️ {t.nav.arena === '广场' ? `对方已声明 ${opponentClaim === 1 ? '红方' : '蓝方'} 胜出，请确认你的结果` : `Opponent claimed ${opponentClaim === 1 ? 'Red' : 'Blue'} wins. Please confirm your result`}
          </div>
        )}
        {mutualSubmitted && (
          <div style={{background:'#F0FDF4',border:'1.5px solid #A7F3D0',borderRadius:'6px',padding:'10px 13px',fontSize:'12px',color:'#059669',lineHeight:1.5}}>
            {t.nav.arena === '广场' ? '你已声明 ' : 'You declared '}<strong>{mutualSubmitted === 'self' ? myLabel : oppLabel}</strong>{t.nav.arena === '广场' ? ' 胜出，等待对方在 48 小时内确认。' : ' as winner. Waiting for opponent to confirm within 48h.'}
          </div>
        )}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'6px'}}>
          <Btn label={mutualSubmitted ? t.nav.arena === '广场' ? '✅ 已提交' : '✅ Submitted' : t.nav.arena === '广场' ? '共识结算' : 'Mutual Settle'} color={mutualSubmitted ? '#059669' : '#7C3AED'} bg={mutualSubmitted ? '#ECFDF5' : '#F5F5F5'} border={mutualSubmitted ? '#A7F3D0' : '#F0F0F0'} onClick={mutualSubmitted ? undefined : () => setShowMutualModal(true)} disabled={!!mutualSubmitted} />
          <Btn label={evidenceSubmitted ? (t.nav.arena==='广场'?'✅ 证据已提交':'✅ Evidence Submitted') : (t.nav.arena==='广场'?'提交证据':'Submit Evidence')} color={evidenceSubmitted?'#059669':'#3B82F6'} bg={evidenceSubmitted?'#ECFDF5':'#F5F9FF'} border={evidenceSubmitted?'#A7F3D0':'#E0EEFF'} onClick={evidenceSubmitted ? undefined : () => setShowEvidenceModal(true)} disabled={evidenceSubmitted} />
          <Btn label={requestingRuling ? (t.nav.arena==='广场'?'裁定中...':'Judging...') : verdictData ? (t.nav.arena==='广场'?'✅ 已裁定':'✅ Judged') : (t.nav.arena==='广场'?'申请裁定':'Request Ruling')} color={verdictData?'#059669':'#D97706'} bg={verdictData?'#ECFDF5':'#FFFBEB'} border={verdictData?'#A7F3D0':'#FDE68A'} onClick={verdictData || requestingRuling ? undefined : async () => {
            if (!onChainDuel) return;
            setRequestingRuling(true);
            setShowAgentModal(true);
            setAgentStep(1);
            const chainId = targetChainId;
            const originalId = (onChainDuel as any).originalId ?? onChainDuel.id;
            const isZh = t.nav.arena === '广场';
            // Simulate step progress while API runs
            const stepTexts = isZh
              ? ['正在解析案件类型和可验证条件...','正在抓取证据链接内容并评估可信度...','正在逐条对照裁定标准分析双方证据...','正在综合评分并生成裁定报告...']
              : ['Parsing case type and verifiable conditions...','Fetching evidence links and evaluating credibility...','Analyzing evidence against ruling conditions...','Calculating scores and generating ruling report...'];
            setAgentStepText(stepTexts[0]);
            const stepTimers = [
              setTimeout(() => { setAgentStep(2); setAgentStepText(stepTexts[1]); }, 3500),
              setTimeout(() => { setAgentStep(3); setAgentStepText(stepTexts[2]); }, 7000),
              setTimeout(() => { setAgentStep(4); setAgentStepText(stepTexts[3]); }, 10500),
            ];
            try {
              const res = await fetch('/api/judge', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({chainId, duelId: originalId}) });
              const data = await res.json();
              stepTimers.forEach(clearTimeout);
              setAgentStep(5);
              if (data.verdict) {
                setVerdictData(data.verdict);
                if (data.verdict.settled && data.verdict.winnerSide !== 0) {
                  const wager2 = onChainDuel?.wager ?? 0n;
                  const amt2 = (parseFloat(fmtEther(typeof wager2 === 'bigint' ? wager2 * 2n : BigInt(wager2) * 2n)) * 0.98).toFixed(4);
                  const winnerLabel = data.verdict.winner === 'Red'
                    ? (isMyRed ? (isZh?'你（红方）':'You (Red)') : (isZh?'对方（红方）':'Opponent (Red)'))
                    : (isMyRed ? (isZh?'对方（蓝方）':'Opponent (Blue)') : (isZh?'你（蓝方）':'You (Blue)'));
                  setSettleResult({ winner: winnerLabel, amount: amt2 + ' ' + token });
                  setTimeout(() => setSettleResult(null), 5000);
                  refetch?.();
                }
              }
            } catch { stepTimers.forEach(clearTimeout); setAgentStep(5); }
            setRequestingRuling(false);
          }} disabled={!!verdictData || requestingRuling} />
        </div>
        <Btn label={t.nav.arena === '广场' ? '复制分享链接' : 'Copy Share Link'} color="#999999" bg="transparent" border="#F0F0F0"
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
      <div style={{fontSize:'9px',letterSpacing:'0.08em',textTransform:'uppercase' as const,color:'#444444',marginBottom:'6px'}}>选择支持方</div>
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
          style={{flex:1,background:'#FFFFFF',border:'1px solid #F0F0F0',borderRadius:'10px',padding:'9px 12px',fontSize:'13px',color:'#0A0A0A',outline:'none'}} />
        <div style={{padding:'9px 12px',borderRadius:'10px',fontSize:'12px',fontWeight:600,color:'#F43F5E',border:'1px solid rgba(255,107,107,0.3)',background:'rgba(255,107,107,0.08)',display:'flex',alignItems:'center'}}>{token}</div>
      </div>
      {betStakeNum > 0 && (
        <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'10px',padding:'9px 12px',display:'grid',gridTemplateColumns:'1fr 1px 1fr',gap:'10px',alignItems:'center'}}>
          <div style={{textAlign:'center'}}><div style={{fontSize:'8px',color:'#999999',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:'3px'}}>预计赔率</div><div style={{fontSize:'14px',fontWeight:500,color:'rgba(255,255,255,0.7)'}}>{odds}x</div></div>
          <div style={{background:'rgba(255,255,255,0.08)',height:'24px'}} />
          <div style={{textAlign:'center'}}><div style={{fontSize:'8px',color:'#999999',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:'3px'}}>赢了可得</div><div style={{fontSize:'14px',fontWeight:500,color:'#F43F5E'}}>{payout} {token}</div></div>
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
    {settleResult && (
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}
        onClick={() => setSettleResult(null)}>
        <div style={{background:'#fff',borderRadius:'24px',padding:'32px 24px',textAlign:'center',maxWidth:'320px',width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
          <div style={{fontSize:'56px',marginBottom:'12px'}}>🎉</div>
          <div style={{fontSize:'20px',fontWeight:700,color:'#059669',marginBottom:'8px'}}>
            {t.nav.arena === '广场' ? '结算成功！' : 'Settled!'}
          </div>
          <div style={{fontSize:'14px',color:'#444444',marginBottom:'4px'}}>
            {t.nav.arena === '广场' ? '胜方：' : 'Winner: '}<strong>{settleResult.winner}</strong>
          </div>
          <div style={{fontSize:'18px',fontWeight:700,color:'#7C3AED',marginTop:'12px'}}>
            +{settleResult.amount}
          </div>
          <div style={{fontSize:'11px',color:'#999999',marginTop:'8px'}}>
            {t.nav.arena === '广场' ? '点击任意处关闭' : 'Tap anywhere to close'}
          </div>
        </div>
      </div>
    )}
    {showEvidenceModal && (
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.35)',zIndex:60,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}
        onClick={() => setShowEvidenceModal(false)}>
        <div style={{background:'#fff',border:'1.5px solid #F0F0F0',borderRadius:'10px',width:'100%',maxWidth:'420px',overflow:'hidden',boxShadow:'0 8px 40px rgba(124,58,237,0.12)'}}
          onClick={e => e.stopPropagation()}>
          <div style={{background:'#FFFFFF',borderBottom:'1px solid #F0F0F0',padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{fontSize:'14px',fontWeight:600,color:'#0A0A0A'}}>📋 {t.nav.arena === '广场' ? '提交证据' : 'Submit Evidence'}</div>
            <button onClick={() => setShowEvidenceModal(false)} style={{color:'#999999',fontSize:'20px',background:'none',border:'none',cursor:'pointer',lineHeight:1}}>×</button>
          </div>
          <div style={{padding:'18px'}}>
            <div style={{fontSize:'12px',color:'#444444',marginBottom:'12px',lineHeight:1.6,background:'#FFFFFF',borderRadius:'10px',padding:'10px 12px',border:'1px solid #F0F0F0'}}>
              📋 {t.nav.arena === '广场' ? '声明：' : 'Claim: '}<strong>{typeof window !== 'undefined' ? localStorage.getItem('claim_' + onChainDuel?.claimHash) || '' : ''}</strong>
            </div>
            <div style={{marginBottom:'14px'}}>
              <div style={{fontSize:'11px',fontWeight:600,color:'#444444',marginBottom:'6px'}}>
                {t.nav.arena === '广场' ? '证据描述 *' : 'Evidence Description *'}
                <span style={{fontSize:'10px',fontWeight:400,color:'#999999',marginLeft:'6px'}}>{evidenceDesc.length}/500</span>
              </div>
              <textarea
                value={evidenceDesc}
                onChange={e => setEvidenceDesc(e.target.value.slice(0,500))}
                placeholder={t.nav.arena === '广场' ? '描述你的证据，说明为什么你应该赢得这场对决...' : 'Describe your evidence and why you should win this duel...'}
                style={{width:'100%',minHeight:'100px',padding:'10px 12px',borderRadius:'6px',border:'1px solid #F0F0F0',fontSize:'12px',resize:'vertical',outline:'none',fontFamily:'inherit',boxSizing:'border-box',lineHeight:1.5}}
              />
            </div>
            <div style={{marginBottom:'16px'}}>
              <div style={{fontSize:'11px',fontWeight:600,color:'#444444',marginBottom:'6px'}}>{t.nav.arena === '广场' ? '证据链接（可选，最多3条）' : 'Evidence Links (optional, max 3)'}</div>
              {evidenceLinks.map((link, i) => (
                <input key={i} type="url" value={link}
                  onChange={e => { const nl = [...evidenceLinks]; nl[i] = e.target.value; setEvidenceLinks(nl); }}
                  placeholder={`URL ${i+1} (https://...)`}
                  style={{width:'100%',padding:'8px 12px',borderRadius:'10px',border:'1px solid #F0F0F0',fontSize:'12px',marginBottom:'6px',outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}
                />
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
              <button onClick={() => setShowEvidenceModal(false)}
                style={{padding:'11px',borderRadius:'6px',fontSize:'13px',fontWeight:500,color:'#999999',border:'1px solid #F0F0F0',background:'transparent',cursor:'pointer'}}>
                {t.nav.arena === '广场' ? '取消' : 'Cancel'}
              </button>
              <button
                disabled={!evidenceDesc.trim() || evidencePending}
                onClick={async () => {
                  if (!evidenceDesc.trim() || !onChainDuel || !address) return;
                  setEvidencePending(true);
                  try {
                    const chainId = targetChainId;
                    const originalId = (onChainDuel as any).originalId ?? onChainDuel.id;
                    const side = isMyRed ? 'red' : 'blue';
                    const res = await fetch('/api/evidence', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        chainId, duelId: originalId, side, address,
                        description: evidenceDesc,
                        links: evidenceLinks.filter(l => l.trim()),
                      })
                    });
                    if (res.ok) {
                      setEvidenceSubmitted(true);
                      setShowEvidenceModal(false);
                    }
                  } catch {}
                  setEvidencePending(false);
                }}
                style={{padding:'11px',borderRadius:'6px',fontSize:'13px',fontWeight:600,border:'none',cursor:evidenceDesc.trim()?'pointer':'not-allowed',background:evidenceDesc.trim()?'#7C3AED':'#F0F0F0',color:evidenceDesc.trim()?'#fff':'#999999'}}>
                {evidencePending ? (t.nav.arena === '广场' ? '提交中...' : 'Submitting...') : (t.nav.arena === '广场' ? '提交证据' : 'Submit Evidence')}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    {showAgentModal && agentStep > 0 && (
      <div style={{position:'fixed',inset:0,background:'rgba(20,10,40,0.7)',zIndex:70,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px',backdropFilter:'blur(4px)'}}>
        <div style={{background:'#1A0E2E',border:'1px solid rgba(124,58,237,0.4)',borderRadius:'24px',width:'100%',maxWidth:'360px',overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,0.12)'}}>
          {/* Header */}
          <div style={{padding:'20px 20px 0',textAlign:'center'}}>
            <div style={{fontSize:'32px',marginBottom:'8px',animation:'pulse 2s infinite'}}>⚖️</div>
            <div style={{fontSize:'16px',fontWeight:700,color:'#E9D5FF',marginBottom:'4px'}}>
              {agentStep < 5 ? (t.nav.arena==='广场'?'AI 法官分析中...':'AI Judge Analyzing...') : (t.nav.arena==='广场'?'裁定完成':'Analysis Complete')}
            </div>
            <div style={{fontSize:'11px',color:'rgba(196,181,253,0.6)',marginBottom:'16px'}}>
              {agentStep < 5 ? (t.nav.arena==='广场'?'请稍候，AI 正在审查所有证据':'Please wait while AI reviews all evidence') : ''}
            </div>
          </div>
          {/* Steps */}
          <div style={{padding:'0 20px 16px'}}>
            {[
              {n:1, en:'Case Analysis', zh:'案件解析', en2:'Parsing dispute type & conditions', zh2:'解析争议类型和裁定条件'},
              {n:2, en:'Evidence Review', zh:'证据审查', en2:'Evaluating credibility & fetching links', zh2:'评估证据可信度和链接内容'},
              {n:3, en:'Condition Analysis', zh:'条件分析', en2:'Cross-referencing ruling standard', zh2:'对照裁定标准逐条分析'},
              {n:4, en:'Final Ruling', zh:'综合裁定', en2:'Calculating scores & generating report', zh2:'综合评分生成裁定报告'},
            ].map(step => {
              const isDone = agentStep > step.n;
              const isActive = agentStep === step.n;
              const isPending = agentStep < step.n;
              return (
                <div key={step.n} style={{display:'flex',gap:'12px',alignItems:'flex-start',marginBottom:'12px',opacity:isPending ? 0.35 : 1,transition:'opacity 0.5s'}}>
                  {/* Icon */}
                  <div style={{width:'28px',height:'28px',borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',
                    background: isDone ? 'rgba(5,150,105,0.2)' : isActive ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.05)',
                    border: isDone ? '1px solid rgba(5,150,105,0.5)' : isActive ? '1px solid rgba(124,58,237,0.6)' : '1px solid rgba(255,255,255,0.1)',
                    boxShadow: isActive ? '0 0 12px rgba(124,58,237,0.4)' : 'none',
                  }}>
                    {isDone ? '✓' : isActive ? '◈' : String(step.n)}
                  </div>
                  {/* Content */}
                  <div style={{flex:1}}>
                    <div style={{fontSize:'12px',fontWeight:600,color: isDone ? '#6EE7B7' : isActive ? '#E0E0E0' : '#666666'}}>
                      {t.nav.arena==='广场' ? step.zh : step.en}
                    </div>
                    <div style={{fontSize:'10px',color:'rgba(156,163,175,0.7)',marginTop:'1px'}}>
                      {t.nav.arena==='广场' ? step.zh2 : step.en2}
                    </div>
                    {/* Progress bar for active step */}
                    {isActive && agentStep < 5 && (
                      <div style={{marginTop:'6px',height:'3px',borderRadius:'2px',background:'rgba(255,255,255,0.1)',overflow:'hidden'}}>
                        <div style={{height:'100%',background:'linear-gradient(90deg,#7C3AED,#E0E0E0)',borderRadius:'2px',
                          animation:'progress-indeterminate 1.5s ease-in-out infinite',
                          backgroundSize:'200% 100%'}} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Bottom */}
          <div style={{padding:'12px 20px 20px',borderTop:'1px solid rgba(124,58,237,0.2)',textAlign:'center'}}>
            {agentStep < 5 ? (
              <div style={{fontSize:'11px',color:'rgba(196,181,253,0.5)',animation:'pulse 2s infinite'}}>
                {agentStepText}
              </div>
            ) : (
              <button onClick={() => setShowAgentModal(false)}
                style={{width:'100%',padding:'12px',borderRadius:'10px',fontSize:'13px',fontWeight:600,border:'none',cursor:'pointer',background:'#0A0A0A',color:'#fff',boxShadow:'none'}}>
                {t.nav.arena==='广场'?'✓ 查看裁定结果':'✓ View Result'}
              </button>
            )}
          </div>
        </div>
        <style>{`
          @keyframes progress-indeterminate {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    )}
    {showMutualModal && (
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.35)',zIndex:60,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}
        onClick={() => setShowMutualModal(false)}>
        <div style={{background:'#fff',border:'1.5px solid #F0F0F0',borderRadius:'10px',width:'100%',maxWidth:'380px',overflow:'hidden',boxShadow:'0 8px 40px rgba(124,58,237,0.12)'}}
          onClick={e => e.stopPropagation()}>
          <div style={{background:'#FFFFFF',borderBottom:'1px solid #F0F0F0',padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{fontSize:'14px',fontWeight:600,color:'#0A0A0A'}}>{t.nav.arena === '广场' ? '⚖️ 共识结算' : '⚖️ Mutual Settlement'}</div>
            <button onClick={() => setShowMutualModal(false)} style={{color:'#999999',fontSize:'20px',background:'none',border:'none',cursor:'pointer',lineHeight:1}}>×</button>
          </div>
          <div style={{padding:'18px'}}>
            <div style={{fontSize:'13px',color:'#444444',marginBottom:'16px',lineHeight:1.6}}>
              {t.nav.arena === '广场' ? '你认为谁赢得了这场对决？对方需在 48小时 内确认，若双方结果一致则自动结算。' : 'Who do you think won this duel? Opponent has 48h to confirm. If both agree, settlement is automatic.'}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'16px'}}>
              <button onClick={() => setMutualChoice('self')}
                style={{padding:'14px 10px',borderRadius:'10px',border:`2px solid ${mutualChoice==='self' ? myColor : '#F0F0F0'}`,background:mutualChoice==='self' ? `${myColor}18` : '#FFFFFF',cursor:'pointer',transition:'all 0.15s'}}>
                <div style={{fontSize:'20px',marginBottom:'6px'}}>🏆</div>
                <div style={{fontSize:'12px',fontWeight:600,color:mutualChoice==='self' ? myColor : '#444444'}}>{t.nav.arena === '广场' ? '我赢了' : 'I Won'}</div>
                <div style={{fontSize:'10px',color:'#999999',marginTop:'2px'}}>{myLabel}</div>
              </button>
              <button onClick={() => setMutualChoice('opponent')}
                style={{padding:'14px 10px',borderRadius:'10px',border:`2px solid ${mutualChoice==='opponent' ? oppColor : '#F0F0F0'}`,background:mutualChoice==='opponent' ? `${oppColor}18` : '#FFFFFF',cursor:'pointer',transition:'all 0.15s'}}>
                <div style={{fontSize:'20px',marginBottom:'6px'}}>🤝</div>
                <div style={{fontSize:'12px',fontWeight:600,color:mutualChoice==='opponent' ? oppColor : '#444444'}}>{t.nav.arena === '广场' ? '对方赢了' : 'They Won'}</div>
                <div style={{fontSize:'10px',color:'#999999',marginTop:'2px'}}>{oppLabel}</div>
              </button>
            </div>
            {mutualChoice && (
              <div style={{background:'#F5F5F5',borderRadius:'6px',padding:'10px 13px',marginBottom:'14px',fontSize:'12px',color:'#5B21B6',lineHeight:1.5}}>
                {t.nav.arena === '广场' ? '你声明 ' : 'You declared '}<strong>{mutualChoice === 'self' ? myLabel : oppLabel}</strong>{t.nav.arena === '广场' ? ' 赢得了此次对决。提交后等待对方在 48 小时内确认。' : ' won this duel. Submit to wait for opponent confirmation within 48h.'}
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
              <button onClick={() => { setShowMutualModal(false); setMutualChoice(null); }}
                style={{padding:'11px',borderRadius:'6px',fontSize:'13px',fontWeight:500,color:'#999999',border:'1px solid #F0F0F0',background:'transparent',cursor:'pointer'}}>
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
                      setTimeout(() => refetch?.(), 2000);
                      // check if both claimed same side → show settlement success
                      const rpc = targetChainId === 5003 ? 'https://rpc.sepolia.mantle.xyz' : 'https://data-seed-prebsc-1-s1.bnbchain.org:8545';
                      const contract = targetChainId === 5003 ? '0xE731a80668Ad0439a6B55e57f65C1D7885827566' : '0xa0A997cF05F7Baf21becEA4130209fD7C7D1A994';
                      setTimeout(async () => {
                        try {
                          const idHex2 = (oid ?? 1).toString(16).padStart(64,'0');
                          const res2 = await fetch(rpc, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',method:'eth_call',params:[{to:contract,data:'0x565e614f'+idHex2},'latest'],id:1})});
                          const json2 = await res2.json();
                          const r2 = json2.result.slice(2);
                          const status2 = parseInt(r2.slice(9*64,10*64),16);
                          const winner2 = parseInt(r2.slice(10*64,11*64),16);
                          if (status2 === 2) {
                            const wager2 = BigInt('0x'+r2.slice(3*64,4*64));
                            const amt2 = (parseFloat(fmtEther(wager2 * 2n)) * 0.98).toFixed(4);
                            const winnerLabel = winner2 === 1 ? (isMyRed ? (t.nav.arena==='广场'?'你（红方）':'You (Red)') : (t.nav.arena==='广场'?'对方（红方）':'Opponent (Red)')) : (isMyRed ? (t.nav.arena==='广场'?'对方（蓝方）':'Opponent (Blue)') : (t.nav.arena==='广场'?'你（蓝方）':'You (Blue)'));
                            setSettleResult({winner: winnerLabel, amount: amt2 + ' ' + token});
                            setTimeout(() => setSettleResult(null), 5000);
                          }
                        } catch {}
                      }, 2500);
                    } else {
                      alert(t.nav.arena === '广场' ? '交易失败，请重试' : 'Transaction failed, please retry');
                    }
                  } catch (e: any) {
                    if (e.code !== 4001) alert(e.message || 'Error');
                  } finally {
                    setMutualPending(false);
                  }
                }}
                style={{padding:'11px',borderRadius:'6px',fontSize:'13px',fontWeight:600,border:'none',cursor:mutualChoice?'pointer':'not-allowed',background:mutualChoice?'#7C3AED':'#F0F0F0',color:mutualChoice?'#fff':'#999999',transition:'all 0.15s'}}>
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
          <button onClick={onClose} style={{color:'#999999',fontSize:'20px',lineHeight:1,background:'none',border:'none',cursor:'pointer'}}>×</button>
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



// ─── HISTORY ROW (流水账单样式) ─────────────────────────────────────────────────
function HistoryRow({ d, t, address, token, onViewDuel }: {
  d: OnChainDuel; t: typeof LANG['en']; address?: string; token: string; onViewDuel: () => void;
}) {
  const isZh = t.nav.arena === '广场';
  const myAddr = (address || '').toLowerCase();
  const isRed = !!(myAddr && d.red.toLowerCase() === myAddr);
  const claimText = typeof window !== 'undefined'
    ? localStorage.getItem('claim_' + d.claimHash) || `#${(d as any).originalId ?? d.id} — on-chain duel`
    : `#${(d as any).originalId ?? d.id}`;
  const chainToken = (d as any).chainToken ?? token;
  const chainName = (d as any).chainName ?? 'Unknown';
  const originalId = (d as any).originalId ?? d.id;
  const wager = parseFloat(fmtEther(d.wager));
  const totalPot = wager * 2;
  const isWon = d.status === DuelStatus.Settled && d.winner === (isRed ? 1 : 2);
  const isLost = d.status === DuelStatus.Settled && d.winner !== (isRed ? 1 : 2) && d.winner !== 0;
  const isCancelled = d.status === DuelStatus.Cancelled;

  const resultColor = isWon ? '#059669' : isLost ? '#F43F5E' : '#999999';
  const resultBg = isWon ? '#ECFDF5' : isLost ? '#FFF5F5' : '#FFFFFF';
  const resultText = isWon
    ? (isZh ? '🏆 胜出' : '🏆 Won')
    : isLost ? (isZh ? '💀 败北' : '💀 Lost')
    : isCancelled ? (isZh ? '↩️ 已退款' : '↩️ Refunded')
    : (isZh ? '已结算' : 'Settled');
  const amtText = isWon
    ? `+${(totalPot * 0.98).toFixed(4)}`
    : isCancelled ? `+${wager.toFixed(4)}`
    : `-${wager.toFixed(4)}`;
  const amtColor = isWon || isCancelled ? '#059669' : '#F43F5E';

  const settledDate = d.settledAt && d.settledAt !== '0'
    ? new Date(parseInt(d.settledAt) * 1000).toLocaleDateString()
    : '—';

  return (
    <div
      onClick={onViewDuel}
      style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 14px',borderBottom:'1px solid #F5F5F5',cursor:'pointer',transition:'background 0.1s'}}
      onMouseEnter={e=>(e.currentTarget.style.background='#FFFFFF')}
      onMouseLeave={e=>(e.currentTarget.style.background='transparent')}
    >
      {/* Result badge */}
      <div style={{flexShrink:0,minWidth:'68px',padding:'3px 8px',borderRadius:'6px',background:resultBg,textAlign:'center'}}>
        <span style={{fontSize:'11px',fontWeight:600,color:resultColor}}>{resultText}</span>
      </div>
      {/* Claim text */}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:'12px',fontWeight:500,color:'#0A0A0A',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
          {claimText}
        </div>
        <div style={{fontSize:'10px',color:'#999999',marginTop:'2px',display:'flex',gap:'6px',alignItems:'center'}}>
          <span style={{fontFamily:'monospace'}}>#{String(originalId).padStart(4,'0')}</span>
          <span>·</span>
          <span>{chainName}</span>
          <span>·</span>
          <span>{settledDate}</span>
        </div>
      </div>
      {/* Amount */}
      <div style={{flexShrink:0,textAlign:'right'}}>
        <div style={{fontSize:'13px',fontWeight:700,color:amtColor}}>{amtText}</div>
        <div style={{fontSize:'10px',color:'#E0E0E0'}}>{chainToken}</div>
      </div>
      {/* Arrow */}
      <div style={{flexShrink:0,color:'#E0E0E0',fontSize:'12px'}}>›</div>
    </div>
  );
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
  const borderColor = isClaimable ? '#FDE68A' : isWon ? '#A7F3D0' : '#F0F0F0';

  return (
    <div className="bg-white rounded-lg overflow-hidden transition-all" style={{border:`1.5px solid ${borderColor}`}}>
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
            <span className="text-[10px] text-[#E0E0E0] font-medium font-mono">#{record.id}</span>
            {chain && <img src={chain.logo} alt="" className="w-3.5 h-3.5 rounded-full" onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />}
            <span className="text-[10px] text-[#999999]">{record.network}</span>
          </div>
          {record.result ? (
            <span className={`text-[11px] font-semibold px-3 py-1 rounded-full ${isWon ? 'bg-[#ECFDF5] text-[#059669]' : isLost ? 'bg-[#FFF5F5] text-[#F43F5E]' : 'bg-[#FFFFFF] text-[#999999]'}`}>{m.results[record.result]}</span>
          ) : isActive ? (
            <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-[#F5F9FF] text-[#3B82F6]">⏳ {record.expires}</span>
          ) : null}
        </div>
        {/* CLAIM TEXT */}
        <p className="text-[13px] font-semibold text-[#0A0A0A] leading-snug mb-3 line-clamp-2">{record.claim}</p>
        {/* PLAYERS ROW */}
        <div className="grid gap-2 mb-3" style={{gridTemplateColumns:'1fr auto 1fr'}}>
          {/* MY SIDE */}
          <div className={`rounded-lg p-3 ${sideIsRed ? 'bg-[#FFF5F5] border border-[#FFE0E0]' : 'bg-[#F5F9FF] border border-[#E0EEFF]'}`}>
            <div className="text-[9px] text-[#999999] mb-2">{sideIsRed ? '👑 我的立场' : '⚔️ 我的立场'}</div>
            <div className="flex items-center gap-2 mb-2">
              <BeamAvatar addr={record.challengerColor || '0xB008'} size={32} />
              <div className="min-w-0"><div className="text-[10px] font-semibold text-[#0A0A0A] truncate">{record.challengerColor ? '나' : 'Me'}</div><div className="text-[9px] text-[#999999]">{sideIsRed ? 'Red' : 'Blue'} side</div></div>
            </div>
            <div className={`text-[18px] font-semibold ${sideIsRed ? 'text-[#F43F5E]' : 'text-[#3B82F6]'}`}>{record.stake} <span className="text-[10px]">{record.token}</span></div>
          </div>
          {/* POT CENTER */}
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="text-[9px] text-[#999999]">总奖池</div>
            <div className="text-[16px] font-semibold text-[#0A0A0A]">{record.totalPot}</div>
            <div className="text-[9px] text-[#999999]">{record.token}</div>
          </div>
          {/* OPPONENT */}
          <div className={`rounded-lg p-3 ${sideIsRed ? 'bg-[#F5F9FF] border border-[#E0EEFF]' : 'bg-[#FFF5F5] border border-[#FFE0E0]'}`}>
            <div className="text-[9px] text-[#999999] mb-2">⚔️ 对手</div>
            <div className="flex items-center gap-2 mb-2">
              <BeamAvatar addr={record.opponentColor || '0xabc123'} size={32} />
              <div className="min-w-0"><div className="text-[10px] font-semibold text-[#0A0A0A] truncate">{record.opponentName}</div><div className="text-[9px] text-[#999999]">{sideIsRed ? 'Blue' : 'Red'} side</div></div>
            </div>
            <div className={`text-[18px] font-semibold ${sideIsRed ? 'text-[#3B82F6]' : 'text-[#F43F5E]'}`}>{record.stake} <span className="text-[10px]">{record.token}</span></div>
          </div>
        </div>
        {/* STATS ROW */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-[#FFFFFF] rounded-lg p-2.5 text-center border border-[#F0F0F0]">
            <div className="text-[9px] text-[#999999] mb-1">{m.labels.yourStake}</div>
            <div className="text-[12px] font-semibold text-[#0A0A0A]">{record.stake} <span className="text-[9px] text-[#999999]">{record.token}</span></div>
          </div>
          <div className="bg-[#FFFFFF] rounded-lg p-2.5 text-center border border-[#F0F0F0]">
            <div className="text-[9px] text-[#999999] mb-1">{m.labels.side}</div>
            <div className={`text-[12px] font-semibold ${sideIsRed ? 'text-[#F43F5E]' : 'text-[#3B82F6]'}`}>{sideIsRed ? m.sides.red : m.sides.blue}</div>
          </div>
          <div className="bg-[#FFFFFF] rounded-lg p-2.5 text-center border border-[#F0F0F0]">
            <div className="text-[9px] text-[#999999] mb-1">{m.labels.payout}</div>
            <div className={`text-[12px] font-semibold ${isWon || isClaimable ? 'text-[#059669]' : isLost ? 'text-[#F43F5E]' : 'text-[#999999]'}`}>{isClaimable || isWon ? `${record.payout}` : '—'}{(isClaimable || isWon) && <span className="text-[9px] ml-0.5 text-[#E0E0E0]">{record.token}</span>}</div>
          </div>
        </div>
        {/* AI ANALYSIS */}
        {(isClaimable || isWon || isLost) && record.aiAnalysis && (
          <div className="bg-[#F5F5F5] rounded-lg p-3 mb-3 flex gap-2.5 items-start border border-[#F0F0F0]">
            <span className="text-lg flex-shrink-0 mt-0.5">⚖️</span>
            <div>
              <div className="text-[9px] font-semibold text-[#444444] uppercase tracking-wide mb-1">AI Judge 裁定</div>
              <p className="text-[11px] text-[#444444] leading-relaxed italic">"{record.aiAnalysis}"</p>
            </div>
          </div>
        )}
        {/* DISPUTE WINDOW */}
        {isClaimable && record.disputeHoursLeft !== undefined && (
          <div className="mb-3">
            <div className="flex justify-between mb-1.5">
              <span className="text-[10px] text-[#999999]">{m.labels.disputeWindow}</span>
              <span className="text-[10px] font-medium text-[#D97706]">{record.disputeHoursLeft}h 剩余</span>
            </div>
            <div className="h-1.5 bg-[#F5F5F5] rounded-full overflow-hidden">
              <div className="h-full bg-[#D97706] rounded-full" style={{width:`${(record.disputeHoursLeft/48)*100}%`}} />
            </div>
            <div className="text-[9px] text-[#999999] mt-1">{m.labels.claimBy}: {record.claimBy}</div>
          </div>
        )}
        {/* ACTIONS */}
        {isClaimable ? (
          <div className="flex gap-2">
            <button onClick={()=>onClaim(record.id)} className={`flex-1 py-2.5 rounded-lg text-[11px] font-semibold transition-all ${isClaiming ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]' : 'text-white hover:opacity-90'}`} style={isClaiming ? {} : {background:'#D97706'}}>{isClaiming ? '✓ 已领取!' : m.actions.claim}</button>
            <button className="px-3 py-2.5 rounded-lg text-[11px] font-semibold text-[#F43F5E] border border-[#FFE0E0] bg-[#FFF5F5] hover:bg-[#FFE0E0] transition-colors flex-shrink-0">{m.actions.dispute}</button>
          </div>
        ) : (record as any).isExpired && record.side === 'red' && !record.result && !(record as any).hasDefender ? (
          <div className="flex gap-2">
            <button onClick={onViewDuel} className="flex-1 py-2.5 rounded-lg text-[11px] font-semibold text-[#D97706] border border-[#FDE68A] bg-[#FFFBEB] hover:bg-[#FEF3C7] transition-colors">
              {t.nav.arena === '广场' ? '↩️ 申请退款' : '↩️ Request Refund'}
            </button>
            <button onClick={onViewDuel} className="px-3 py-2.5 rounded-lg text-[11px] font-semibold text-[#444444] border border-[#F0F0F0] bg-[#F5F5F5] hover:bg-[#F5F5F5] transition-colors flex-shrink-0">
              {m.actions.viewDuel}
            </button>
          </div>
        ) : (
          <button onClick={onViewDuel} className="w-full py-2.5 rounded-lg text-[11px] font-semibold text-[#444444] border border-[#F0F0F0] bg-[#F5F5F5] hover:bg-[#F5F5F5] transition-colors">{m.actions.viewDuel}</button>
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
  const expiredDuels = activeDuels.filter(d => d.deadline < now);
  const liveDuels = activeDuels.filter(d => d.deadline >= now);
  // Mutual settle pays directly — no manual claim needed for now
  // Future: judge-settled duels with dispute window will appear here
  const claimableDuels: OnChainDuel[] = [];
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
    { key: 'active' as MyDuelTab, icon: '⚔️', activeStyle: 'bg-[#F5F5F5] text-[#444444] border-[#F0F0F0]', badgeStyle: 'bg-[#0A0A0A] text-white' },
    { key: 'claimable' as MyDuelTab, icon: '💰', activeStyle: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]', badgeStyle: 'bg-[#D97706] text-white' },
    { key: 'history' as MyDuelTab, icon: '📜', activeStyle: 'bg-[#FFFFFF] text-[#444444] border-[#F0F0F0]', badgeStyle: 'bg-[#F0F0F0] text-[#444444]' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', padding: '28px 32px' }}>

      {/* ── TOP: TABS + STATS ── */}
      <div style={{ marginBottom: '24px' }}>
        {/* Tab switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '20px' }}>
          {TAB_CONFIG.map(({ key, icon }) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              padding: '7px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: activeTab === key ? '#0A0A0A' : 'transparent',
              color: activeTab === key ? '#FFFFFF' : '#999999',
              fontSize: '13px', fontWeight: activeTab === key ? 500 : 400,
              transition: 'all .12s ease', display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              {icon} {m.tabs[key]}
              {tabCounts[key] > 0 && (
                <span style={{
                  fontSize: '9px', background: activeTab === key ? 'rgba(255,255,255,0.2)' : '#F0F0F0',
                  color: activeTab === key ? '#fff' : '#999999',
                  borderRadius: '10px', padding: '1px 6px', fontWeight: 600,
                }}>
                  {tabCounts[key]}
                </span>
              )}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: '11px', color: '#BBBBBB' }}>sorted by expiry</span>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '32px', paddingBottom: '20px', borderBottom: '0.5px solid #F0F0F0' }}>
          {[
            { label: 'Total Staked', value: totalStaked > 0 ? `${totalStaked.toFixed(3)} ${token}` : '—' },
            { label: 'Total Won', value: wonDuels.length > 0 ? `${wonDuels.reduce((a,d)=>a+parseFloat(fmtEther(d.wager*2n)),0).toFixed(3)} ${token}` : '—' },
            { label: 'Win Rate', value: myDuels.filter(d=>d.status===DuelStatus.Settled).length > 0 ? `${winRate}%` : '—' },
            { label: 'Duels Played', value: String(myDuels.length) },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: '10px', color: '#BBBBBB', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px' }}>{s.label}</div>
              <div style={{ fontSize: '20px', fontWeight: 300, color: '#0A0A0A', letterSpacing: '-0.5px', lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

        {/* EMPTY STATE */}
        {currentDuels.length === 0 ? (
          <div className="bg-white border border-[#F0F0F0] rounded-lg p-16 text-center">
            <div className="text-4xl mb-3">{activeTab === 'active' ? '⚔️' : activeTab === 'claimable' ? '💰' : '📜'}</div>
            <div className="text-sm font-semibold text-[#444444] mb-2">{m.empty[activeTab]}</div>
            <div className="text-[11px] text-[#999999] mb-5">{m.emptyDesc[activeTab]}</div>
            {activeTab === 'active' && (
              <button onClick={onGoToArena} className="text-xs font-semibold text-white rounded-lg px-4 py-2 hover:opacity-90 transition-colors" style={{background:'#0A0A0A'}}>
                {m.actions.goToArena}
              </button>
            )}
          </div>
        ) : activeTab === 'history' ? (
          /* HISTORY — 流水账单样式 */
          <div style={{background:'#fff',borderRadius:'10px',border:'1px solid #F0F0F0',overflow:'hidden'}}>
            {currentDuels.length === 0 ? (
              <div style={{padding:'32px',textAlign:'center',color:'#999999',fontSize:'13px'}}>
                {t.myDuels.empty.history}
              </div>
            ) : (
              currentDuels.map(d => (
                <HistoryRow
                  key={d.id}
                  d={d}
                  t={t}
                  address={address}
                  token={token}
                  onViewDuel={() => onViewDuel(d)}
                />
              ))
            )}
          </div>
        ) : (
          /* CARD GRID — active / claimable */
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {currentDuels.map(d => {
              const myAddr2 = ((address || (typeof window !== 'undefined' ? (window as any).ethereum?.selectedAddress : '') || '')).toLowerCase();
              const isRed = !!(myAddr2 && d.red.toLowerCase() === myAddr2);
              const isExpired = d.deadline < now;
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
                prize: isClaimable && d.winner !== 0 ? (d.winner === (isRed ? 1 : 2) ? parseFloat(fmtEther(d.wager * 196n / 100n)).toFixed(4) : '0') : undefined,
                expires: isExpired ? (t.nav.arena === '广场' ? '⏰ 已过期' : '⏰ Expired') : formatDeadline(d.deadline),
                isExpired,
                hasDefender: d.blue !== '0x0000000000000000000000000000000000000000',
                network: (d as any).chainName ?? (chainId === 97 ? 'BNB Testnet' : chainId === 5003 ? 'Mantle Sepolia' : 'Unknown'),
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
  );
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
function NavBar({ t, lang, activePage, onPageChange, onLangToggle, onIssueClick }: { t: typeof LANG['en']; lang: Lang; activePage: Page; onPageChange: (p: Page) => void; onLangToggle: () => void; onIssueClick: () => void }) {
  return (
    <div style={{position:'fixed',left:0,top:0,bottom:0,width:'200px',background:'#FFFFFF',borderRight:'0.5px solid #EBEBEB',display:'flex',flexDirection:'column',zIndex:40}}>
      <div style={{padding:'24px 20px 20px',borderBottom:'0.5px solid #F5F5F5'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <img src="/verdict_logo.svg" alt="logo" style={{width:'36px',height:'36px',objectFit:'contain'}} />
          <span style={{fontSize:'13px',fontWeight:600,color:'#0A0A0A',letterSpacing:'-0.2px'}}>Protocol Bet</span>
        </div>
      </div>
      <div style={{padding:'12px',display:'flex',flexDirection:'column',gap:'2px'}}>
        {([['arena', t.nav.arena], ['myDuels', t.nav.myDuels]] as [Page, string][]).map(([key, label]) => (
          <button key={key} onClick={() => onPageChange(key)} style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 10px',borderRadius:'6px',border:'none',cursor:'pointer',background:activePage===key?'#F5F5F5':'transparent',color:activePage===key?'#0A0A0A':'#999999',fontSize:'13px',fontWeight:activePage===key?500:400,textAlign:'left',width:'100%',transition:'all .12s'}}>
            {key === 'arena'
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            }
            {label}
          </button>
        ))}
      </div>
      <div style={{flex:1}} />
      <div style={{padding:'16px 12px',borderTop:'0.5px solid #F5F5F5',display:'flex',flexDirection:'column',gap:'8px'}}>
        <button onClick={onIssueClick} style={{width:'100%',padding:'9px 12px',background:'#0A0A0A',color:'#fff',border:'none',borderRadius:'6px',fontSize:'12px',fontWeight:500,cursor:'pointer',transition:'opacity .12s'}} onMouseEnter={e=>(e.currentTarget.style.opacity='0.85')} onMouseLeave={e=>(e.currentTarget.style.opacity='1')} onMouseDown={e=>(e.currentTarget.style.transform='scale(0.98)')} onMouseUp={e=>(e.currentTarget.style.transform='scale(1)')}>
          {t.issueBtn}
        </button>
        <ConnectButton.Custom>
          {({ account, openAccountModal, openConnectModal, mounted }) => {
            if (!mounted || !account) return (
              <button onClick={openConnectModal} style={{width:'100%',padding:'8px 12px',background:'transparent',color:'#999999',border:'0.5px solid #EBEBEB',borderRadius:'6px',fontSize:'12px',cursor:'pointer'}}>
                Connect wallet
              </button>
            );
            return (
              <button onClick={openAccountModal} style={{display:'flex',alignItems:'center',gap:'7px',padding:'7px 10px',background:'#F5F5F5',border:'none',borderRadius:'6px',cursor:'pointer',width:'100%'}}>
                <BeamAvatar addr={account.address||'0xabc'} size={20} />
                <span style={{fontSize:'11px',color:'#444444',flex:1,textAlign:'left',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{account.displayName}</span>
              </button>
            );
          }}
        </ConnectButton.Custom>
        <div style={{display:'flex',alignItems:'center',gap:'6px',padding:'2px 10px'}}>
          <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#22c55e',flexShrink:0}} />
          <span style={{fontSize:'11px',color:'#999999'}}>Mantle Sepolia</span>
        </div>
        <button onClick={onLangToggle} style={{padding:'5px 10px',background:'transparent',border:'none',cursor:'pointer',fontSize:'11px',color:'#999999',textAlign:'left',borderRadius:'6px'}} onMouseEnter={e=>(e.currentTarget.style.color='#444444')} onMouseLeave={e=>(e.currentTarget.style.color='#999999')}>
          {lang === 'en' ? '中文' : 'EN'}
        </button>
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
    <div style={{minHeight:'100vh',background:'#FFFFFF',display:'flex'}}>
      <style>{`
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
* { font-family: 'DM Sans', sans-serif; }
.font-mono, code { font-family: 'DM Mono', monospace !important; }
@keyframes fadeInUp { from { opacity:0; transform:translateX(-50%) translateY(6px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
@keyframes cardIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
@keyframes scanBeam { 0% { top:-2px; opacity:0; } 10% { opacity:1; } 90% { opacity:1; } 100% { top:100%; opacity:0; } }
.duel-card-grid > * { animation: cardIn 0.35s ease both; }
.duel-card-grid > *:nth-child(1) { animation-delay: 0.05s; }
.duel-card-grid > *:nth-child(2) { animation-delay: 0.10s; }
.duel-card-grid > *:nth-child(3) { animation-delay: 0.15s; }
.duel-card-grid > *:nth-child(4) { animation-delay: 0.20s; }
.duel-card-grid > *:nth-child(5) { animation-delay: 0.25s; }
.duel-card-grid > *:nth-child(6) { animation-delay: 0.30s; }
`}</style>
      <NavBar t={t} lang={lang} activePage={activePage} onPageChange={setActivePage} onLangToggle={() => setLang(l => l === 'en' ? 'zh' : 'en')} onIssueClick={() => setShowModal(true)} />
      <div style={{marginLeft:'200px',flex:1,minWidth:0}}>
      {activePage === 'arena' ? (
        <>
          <Ticker t={t} lang={lang} />
          <div className="border-b border-[#F0F0F0]" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
            {[
              { label: t.stats.duels, value: totalCount > 0 ? String(totalCount) : '—' },
              { label: t.stats.pool, value: totalPotStr },
              { label: t.stats.settled, value: onChainDuels.filter(d => d.status === DuelStatus.Settled).length > 0 ? String(onChainDuels.filter(d => d.status === DuelStatus.Settled).length) : '—' },
            ].map((s, i) => (
              <div key={i} className={`py-3 text-center bg-white ${i < 2 ? 'border-r border-[#F0F0F0]' : ''}`}>
                <div className="text-[9px] tracking-widest uppercase text-[#999999] mb-1 font-medium">{s.label}</div>
                <div className="text-lg font-bold text-[#0A0A0A]">{s.value}</div>
              </div>
            ))}
          </div>
          <div className="bg-white border-b border-[#F0F0F0] px-4 py-3 flex items-center justify-between">
            <div className="flex gap-1.5">
              {t.filters.map((f, i) => (<button key={f} onClick={() => setActiveFilter(i)} className={`text-[10px] px-3 py-1.5 rounded-full border transition-colors font-medium ${activeFilter === i ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]' : 'bg-white text-[#999999] border-[#F0F0F0] hover:text-[#444444]'}`}>{f}</button>))}
            </div>
          </div>
          <div className="p-4">
            <div className="text-[11px] font-semibold text-[#999999] mb-4 flex items-center gap-2 uppercase tracking-widest">
              All Duels
              {isLoading && <span className="text-[#E0E0E0]">loading...</span>}
              {!isLoading && visibleDuels.length === 0 && totalCount === 0 && (
                <span className="text-[#E0E0E0]">— no active duels</span>
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
            <button onClick={() => refetch()} className="text-xs text-[#999999] bg-white border border-[#F0F0F0] rounded-lg px-6 py-2.5 hover:border-[#E0E0E0] transition-colors">↻ Refresh</button>
          </div>
        </>
      ) : (
        <MyDuelsPage t={t} onGoToArena={() => setActivePage('arena')} onChainDuels={onChainDuels} chainId={chainId} onViewDuel={(d) => {
          const mapped = onChainToDuel(d, 0);
          setSelectedDuel(mapped as any);
          setSelectedOnChainDuel(d);
        }} />
      )}
      </div>
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
