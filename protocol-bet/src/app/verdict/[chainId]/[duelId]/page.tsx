// src/app/verdict/[chainId]/[duelId]/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

function QualityBadge({ level, label }: { level: number; label: string }) {
  const colors = ['#9CA3AF','#F43F5E','#D97706','#F59E0B','#3B82F6','#059669'];
  const labels = ['None','Very Low','Low','Medium','High','Very High'];
  const color = colors[Math.min(level, 5)];
  return (
    <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '8px', background: color + '20', color, border: `1px solid ${color}40` }}>
      {'⭐'.repeat(Math.min(level, 5)) || '—'} {labels[Math.min(level, 5)]}
    </span>
  );
}

function ConditionRow({ c }: { c: any }) {
  const statusIcon = (s: string) => s === 'satisfied' ? '✅' : s === 'unsatisfied' ? '❌' : '❓';
  const statusColor = (s: string) => s === 'satisfied' ? '#059669' : s === 'unsatisfied' ? '#F43F5E' : '#9CA3AF';
  return (
    <div style={{ border: '1px solid #EEE9FC', borderRadius: '12px', padding: '12px 14px', marginBottom: '8px' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#1A1A2E', marginBottom: '8px' }}>{c.description}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div style={{ background: '#FFF1F2', borderRadius: '8px', padding: '8px 10px' }}>
          <div style={{ fontSize: '10px', color: '#9CA3AF', marginBottom: '3px' }}>🔴 Red</div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: statusColor(c.redStatus) }}>{statusIcon(c.redStatus)} {c.redStatus}</div>
          {c.redEvidence && <div style={{ fontSize: '10px', color: '#374151', marginTop: '3px', lineHeight: 1.4 }}>{c.redEvidence}</div>}
        </div>
        <div style={{ background: '#EFF6FF', borderRadius: '8px', padding: '8px 10px' }}>
          <div style={{ fontSize: '10px', color: '#9CA3AF', marginBottom: '3px' }}>🔵 Blue</div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: statusColor(c.blueStatus) }}>{statusIcon(c.blueStatus)} {c.blueStatus}</div>
          {c.blueEvidence && <div style={{ fontSize: '10px', color: '#374151', marginTop: '3px', lineHeight: 1.4 }}>{c.blueEvidence}</div>}
        </div>
      </div>
    </div>
  );
}

function EvidencePanel({ evidence, side, color, bgColor }: { evidence: any; side: string; color: string; bgColor: string }) {
  const isEmpty = !evidence;
  return (
    <div style={{ background: bgColor, borderRadius: '16px', padding: '16px', height: '100%', minHeight: '200px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color }}>{side === 'Red' ? '🔴' : '🔵'} {side}</div>
        {!isEmpty && <QualityBadge level={evidence.quality || 0} label={evidence.qualityLabel} />}
      </div>
      {isEmpty ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#C4B5FD' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📭</div>
          <div style={{ fontSize: '12px' }}>No evidence submitted</div>
        </div>
      ) : (
        <>
          {evidence.description && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px', textTransform: 'uppercase' }}>Evidence Description</div>
              <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5, background: '#fff', borderRadius: '8px', padding: '8px 10px' }}>{evidence.description}</div>
            </div>
          )}
          {evidence.links?.filter((l: string) => l).length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px', textTransform: 'uppercase' }}>Links</div>
              {evidence.linkContents?.map((l: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10px' }}>{l.accessible ? '✅' : '⚠️'}</span>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#7C3AED', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{l.title || l.url}</a>
                </div>
              ))}
            </div>
          )}
          {evidence.keyFindings && (
            <div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px', textTransform: 'uppercase' }}>AI Analysis</div>
              <div style={{ fontSize: '11px', color: '#374151', lineHeight: 1.5, fontStyle: 'italic' }}>"{evidence.keyFindings}"</div>
            </div>
          )}
          {evidence.validItems?.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#059669', marginBottom: '4px' }}>✅ Valid Evidence</div>
              {evidence.validItems.map((item: string, i: number) => (
                <div key={i} style={{ fontSize: '10px', color: '#374151', marginBottom: '2px' }}>• {item}</div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function VerdictPage() {
  const params = useParams();
  const chainId = params.chainId as string;
  const duelId = params.duelId as string;
  const [verdict, setVerdict] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/judge?chainId=${chainId}&duelId=${duelId}`)
      .then(r => r.json())
      .then(d => {
        if (d.verdict) setVerdict(d.verdict);
        else setError('No verdict found');
        setLoading(false);
      })
      .catch(() => { setError('Failed to load'); setLoading(false); });
  }, [chainId, duelId]);

  const explorerBase = chainId === '5003' ? 'https://sepolia.mantlescan.xyz/tx/' : 'https://testnet.bscscan.com/tx/';
  const chainName = chainId === '5003' ? 'Mantle Sepolia' : 'BNB Testnet';

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F7F5FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚖️</div>
        <div style={{ fontSize: '16px', color: '#7C3AED', fontWeight: 600 }}>Loading verdict...</div>
      </div>
    </div>
  );

  if (error || !verdict) return (
    <div style={{ minHeight: '100vh', background: '#F7F5FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
        <div style={{ fontSize: '16px', color: '#9CA3AF' }}>{error || 'No verdict available'}</div>
        <a href="/" style={{ marginTop: '16px', display: 'block', color: '#7C3AED', fontSize: '14px' }}>← Back to Arena</a>
      </div>
    </div>
  );

  const isRed = verdict.winner === 'Red';
  const isInsufficient = verdict.winner === 'Insufficient';
  const winnerColor = isInsufficient ? '#9CA3AF' : isRed ? '#F43F5E' : '#3B82F6';
  const winnerBg = isInsufficient ? '#F9F8FF' : isRed ? '#FFF1F2' : '#EFF6FF';

  return (
    <div style={{ minHeight: '100vh', background: '#F7F5FF', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #EEE9FC', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <a href="/" style={{ color: '#9CA3AF', textDecoration: 'none', fontSize: '20px' }}>←</a>
        <span style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A2E' }}>⚖️ AI Judge Ruling</span>
        <span style={{ fontSize: '11px', color: '#9CA3AF', background: '#F3F0FB', padding: '2px 8px', borderRadius: '8px' }}>#{String(duelId).padStart(4, '0')} · {chainName}</span>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px 16px' }}>

        {/* Case Info */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #EEE9FC', padding: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '6px' }}>
            {verdict.disputeTypeLabel || verdict.disputeType}
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A2E', marginBottom: '6px' }}>{verdict.claimText}</div>
          <div style={{ fontSize: '12px', color: '#6B7280' }}>
            ⚖️ Ruling Standard: <span style={{ fontWeight: 600, color: '#7C3AED' }}>{verdict.ruleText}</span>
          </div>
          {verdict.publicData && (
            <div style={{ marginTop: '8px', background: '#F0FDF4', borderRadius: '8px', padding: '8px 10px', fontSize: '11px', color: '#065F46' }}>
              📊 {verdict.publicData}
            </div>
          )}
        </div>

        {/* Evidence Panels */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <EvidencePanel evidence={verdict.redEvidence} side="Red" color="#F43F5E" bgColor="#FFF1F2" />
          <EvidencePanel evidence={verdict.blueEvidence} side="Blue" color="#3B82F6" bgColor="#EFF6FF" />
        </div>

        {/* Condition Analysis */}
        {verdict.conditionResults?.length > 0 && (
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #EEE9FC', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1A1A2E', marginBottom: '12px' }}>📋 Condition Analysis</div>
            {verdict.conditionResults.map((c: any, i: number) => <ConditionRow key={i} c={c} />)}
          </div>
        )}

        {/* Score Bar */}
        {!isInsufficient && (
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #EEE9FC', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1A1A2E', marginBottom: '12px' }}>📊 Score Comparison</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
              <span style={{ color: '#F43F5E', fontWeight: 700 }}>Red {verdict.redScore || 0}</span>
              <span style={{ color: '#3B82F6', fontWeight: 700 }}>Blue {verdict.blueScore || 0}</span>
            </div>
            <div style={{ height: '8px', borderRadius: '4px', background: '#F3F0FB', overflow: 'hidden', display: 'flex' }}>
              <div style={{ background: '#F43F5E', width: `${verdict.redScore || 0}%`, borderRadius: '4px 0 0 4px' }} />
              <div style={{ background: '#3B82F6', width: `${verdict.blueScore || 0}%`, borderRadius: '0 4px 4px 0' }} />
            </div>
          </div>
        )}

        {/* Verdict Result */}
        <div style={{ background: winnerBg, border: `2px solid ${winnerColor}40`, borderRadius: '20px', padding: '20px', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#7C3AED', marginBottom: '8px', textTransform: 'uppercase' }}>⚖️ AI Judge Ruling</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: winnerColor, marginBottom: '8px' }}>
            {isInsufficient ? '⚠️ Insufficient Evidence' : isRed ? '🏆 Red Wins' : '🏆 Blue Wins'}
          </div>

          {/* Confidence bar */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>
              <span>Confidence</span>
              <span style={{ fontWeight: 700 }}>{verdict.confidence}%</span>
            </div>
            <div style={{ height: '6px', borderRadius: '3px', background: '#E5E7EB', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: winnerColor, width: `${verdict.confidence}%`, borderRadius: '3px', transition: 'width 1s ease' }} />
            </div>
          </div>

          <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6, fontStyle: 'italic', marginBottom: '10px' }}>
            "{verdict.reasoningZh || verdict.reasoning}"
          </div>

          {verdict.keyEvidence && (
            <div style={{ fontSize: '11px', color: '#6B7280', background: '#fff', borderRadius: '8px', padding: '8px 10px' }}>
              🔑 Key Evidence: {verdict.keyEvidence}
            </div>
          )}

          {verdict.warnings?.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              {verdict.warnings.map((w: string, i: number) => (
                <div key={i} style={{ fontSize: '11px', color: '#D97706', marginBottom: '2px' }}>⚠️ {w}</div>
              ))}
            </div>
          )}

          {/* Settlement status */}
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #EEE9FC', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {verdict.settled ? (
              <a href={`${explorerBase}${verdict.txHash}`} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '12px', fontWeight: 600, color: '#059669', background: '#ECFDF5', padding: '6px 12px', borderRadius: '8px', textDecoration: 'none', border: '1px solid #A7F3D0' }}>
                ✅ Settled On-Chain →
              </a>
            ) : (
              <span style={{ fontSize: '12px', color: '#9CA3AF', background: '#F9F8FF', padding: '6px 12px', borderRadius: '8px', border: '1px solid #EEE9FC' }}>
                {isInsufficient ? '⚠️ Not settled — insufficient evidence' : '⏳ Settlement pending'}
              </span>
            )}
            <span style={{ fontSize: '11px', color: '#9CA3AF', padding: '6px 0' }}>
              {verdict.settleReason}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '11px', color: '#C4B5FD', padding: '16px' }}>
          Judged at {new Date(verdict.judgedAt).toLocaleString()} · Verdict Protocol
        </div>
      </div>
    </div>
  );
}
