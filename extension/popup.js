// ══ Meme Court · Popup Script ══
const colorMap = {
  BULLISH: { bg: '#0ec476', label: '看涨 BULLISH' },
  BEARISH: { bg: '#f03d3d', label: '看跌 BEARISH' },
  NEUTRAL: { bg: '#d97706', label: '中立 NEUTRAL' },
};
const riskColorMap = {
  '极高风险': '#f03d3d',
  '高风险': '#f97316',
  '中风险': '#d97706',
  '低风险': '#0ec476',
  '未知': '#888',
};

// 从 storage 读取当前页面的裁定缓存
chrome.storage.local.get(['lastContract', 'lastVerdict'], (data) => {
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  const addr = document.getElementById('statusAddr');
  const card = document.getElementById('verdictCard');

  if (data.lastContract) {
    dot.classList.remove('inactive');
    text.textContent = '已检测到合约地址';
    addr.textContent = data.lastContract;
    addr.classList.remove('empty');

    if (data.lastVerdict) {
      const v = data.lastVerdict;
      const vc = colorMap[v.verdict] || colorMap.NEUTRAL;
      const rc = riskColorMap[v.risk] || '#888';

      card.classList.add('show');
      const badge = document.getElementById('verdictBadge');
      badge.textContent = vc.label;
      badge.style.background = vc.bg;

      document.getElementById('verdictConf').textContent = `${v.confidence}% 置信度`;
      const riskEl = document.getElementById('verdictRisk');
      riskEl.textContent = `⚠ ${v.risk}`;
      riskEl.style.color = rc;
      document.getElementById('verdictShort').textContent = v.short;
      document.getElementById('verdictReason').textContent = v.reason;

      // 更新完整裁定链接（带合约地址）
      const btnFull = document.getElementById('btnFull');
      btnFull.href = `https://memecourt.online?contract=${data.lastContract}`;
    }
  } else {
    dot.classList.add('inactive');
    text.textContent = '请打开支持的平台页面';
    addr.textContent = '支持 DexScreener / GMGN / four.meme / Ave.ai';
    addr.classList.add('empty');
  }
});
