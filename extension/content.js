// ══ Meme Court Verdict · Content Script ══
(function() {
  if (window.__MC_LOADED__) {
    if (window.__MC_RERUN__) window.__MC_RERUN__();
    return;
  }
  window.__MC_LOADED__ = true;

  var MC_ID = 'meme-court-verdict-widget';
  var DS_KEY = 'sk-792c9ca476a64b56a262030afb063f4b';
  var DS_URL = 'https://api.deepseek.com/chat/completions';

  // ── 语言检测 ──
  var isZh = !navigator.language || navigator.language.toLowerCase().indexOf('zh') > -1;
  var T = {
    loading:    isZh ? 'AI 法官正在核查证据…' : 'AI Judge reviewing evidence…',
    confidence: isZh ? '置信度' : 'Confidence',
    price:      isZh ? '价格' : 'Price',
    liquidity:  isZh ? '流动性' : 'Liquidity',
    h24:        '24h',
    holders:    isZh ? '持有者' : 'Holders',
    liqSig:     isZh ? '💧 流动性' : '💧 Liquidity',
    momentum:   isZh ? '📈 动能' : '📈 Momentum',
    safety:     isZh ? '🛡 安全' : '🛡 Safety',
    bet:        isZh ? '协议对赌 →' : 'Bet →',
    ip:         isZh ? 'IP 立案' : 'IP Claim',
    copy:       isZh ? '⎘ 复制' : '⎘ Copy',
    copied:     isZh ? '✓ 已复制' : '✓ Copied',
    powered:    'Powered by Meme Court · memecourt.online',
    verdictMap: {
      BULLISH: isZh ? '看涨 BULLISH' : 'BULLISH',
      BEARISH: isZh ? '看跌 BEARISH' : 'BEARISH',
      NEUTRAL: isZh ? '中立 NEUTRAL' : 'NEUTRAL',
    },
    riskMap: {
      '极高风险': isZh ? '极高风险' : 'Extreme Risk',
      '高风险':   isZh ? '高风险'   : 'High Risk',
      '中风险':   isZh ? '中风险'   : 'Medium Risk',
      '低风险':   isZh ? '低风险'   : 'Low Risk',
      '未知':     isZh ? '未知'     : 'Unknown',
    },
  };

  // ── 提取真实代币合约 ──
  function extractContract() {
    var host = window.location.hostname;

    if (host.indexOf('dexscreener.com') > -1) {
      // 优先从 BSCScan 链接提取代币合约
      var links = document.querySelectorAll('a[href]');
      for (var i = 0; i < links.length; i++) {
        var m = links[i].href.match(/bscscan\.com\/token\/(0x[0-9a-fA-F]{40})/);
        if (m) return m[1];
      }
      // 从页面文本统计地址频率，排除 URL 里的池子地址
      var urlAddr = (window.location.href.match(/0x[0-9a-fA-F]{40}/) || [])[0] || '';
      var allText = document.body ? document.body.innerText : '';
      var found = allText.match(/0x[0-9a-fA-F]{40}/g) || [];
      var freq = {};
      for (var j = 0; j < found.length; j++) {
        var a = found[j];
        if (a.toLowerCase() !== urlAddr.toLowerCase()) {
          freq[a] = (freq[a] || 0) + 1;
        }
      }
      var best = null, bestN = 0;
      for (var addr in freq) {
        if (freq[addr] > bestN) { bestN = freq[addr]; best = addr; }
      }
      if (best) return best;
      return urlAddr || null;
    }

    if (host.indexOf('gmgn.ai') > -1) {
      var gm = window.location.pathname.match(/\/token\/(0x[0-9a-fA-F]{40})/i);
      if (gm) return gm[1];
    }

    var um = window.location.href.match(/0x[0-9a-fA-F]{40}/);
    if (um) return um[0];

    try {
      var tm = window.top.location.href.match(/0x[0-9a-fA-F]{40}/);
      if (tm) return tm[0];
    } catch(e) {}

    return null;
  }

  // ── 提取页面数据 ──
  function extractPageData() {
    var host = window.location.hostname;
    var t = document.body ? document.body.innerText : '';
    function get(re) { var m = t.match(re); return m ? m[1] : null; }
    var h1 = document.querySelector('h1');

    // 平台名称
    var platform = 'UNKNOWN';
    if (host.indexOf('dexscreener.com') > -1) platform = 'DEXSCREENER';
    else if (host.indexOf('gmgn.ai') > -1) platform = 'GMGN';
    else if (host.indexOf('four.meme') > -1) platform = 'FOUR.MEME';
    else if (host.indexOf('ave.ai') > -1) platform = 'AVE.AI';

    // 从页面 DOM 抓取代币 logo（各平台尝试常见选择器）
    var logoUrl = null;
    var logoSelectors = [
      'img[class*="token-logo"]', 'img[class*="coin-logo"]', 'img[class*="TokenLogo"]',
      'img[class*="CoinLogo"]', 'img[class*="token-icon"]', 'img[class*="coin-icon"]',
      'img[alt*="logo"]', 'img[alt*="Logo"]',
    ];
    for (var si = 0; si < logoSelectors.length; si++) {
      var el = document.querySelector(logoSelectors[si]);
      if (el && el.src && el.src.indexOf('data:') !== 0) { logoUrl = el.src; break; }
    }

    // GMGN 专用数据提取（页面结构不同）
    var price = null, liquidity = null, change24h = null, holders = null;
    var marketCap = null, volume = null, txns = null, buys = null, sells = null;
    var fdv = null, change1h = null, change5m = null;

    if (host.indexOf('gmgn.ai') > -1) {
      // 基于真实页面文本结构（价格\n$xxx，池子\n$xxx，持有者 156，市值\n$xxx）
      price     = get(/价格\s*\n\s*\$([0-9₀-₉,.]+)/);
      liquidity = get(/池子\s*\n\s*\$([0-9,.]+[KMBkmb]?)/);
      marketCap = get(/市值\s*\n\s*\$([0-9,.]+[KMBkmb]?)/);
      change24h = get(/24h\s*\n\s*([+-]?[0-9.]+%)/);
      change1h  = get(/1h\s*\n\s*([+-]?[0-9.]+%)/);
      change5m  = get(/5m\s*\n\s*([+-]?[0-9.]+%)/);
      holders   = get(/持有者\s+([0-9,]+)/);
      volume    = get(/24h\s*成交额\s*\n\s*\$([0-9,.]+[KMBkmb]?)/);
    } else {
      price     = get(/PRICE USD[\s\S]{0,20}\$([0-9,.]+)/i);
      liquidity = get(/LIQUIDITY[\s\S]{0,15}\$([0-9,.]+[KMBkmb]?)/i);
      marketCap = get(/MKT CAP[\s\S]{0,15}\$([0-9,.]+[KMBkmb]?)/i);
      fdv       = get(/FDV[\s\S]{0,15}\$([0-9,.]+[KMBkmb]?)/i);
      change24h = get(/24H[\s\S]{0,10}([+-]?[0-9.]+%)/i);
      change1h  = get(/1H[\s\S]{0,10}([+-]?[0-9.]+%)/i);
      change5m  = get(/5M[\s\S]{0,10}([+-]?[0-9.]+%)/i);
      volume    = get(/VOLUME[\s\S]{0,15}\$([0-9,.]+[KMBkmb]?)/i);
      txns      = get(/TXNS[\s\S]{0,10}([0-9,]{3,})/i);
      holders   = get(/Holders\s*\(([0-9,]+)\)/i);
      buys      = get(/BUYS[\s\S]{0,10}([0-9,]{2,})/i);
      sells     = get(/SELLS[\s\S]{0,10}([0-9,]{2,})/i);
    }

    return {
      name: h1 ? h1.textContent.split('/')[0].trim() : null,
      platform: platform,
      logoUrl: logoUrl,
      price, liquidity, marketCap, fdv,
      change24h, change1h, change5m,
      volume, txns, holders, buys, sells
    };
  }

  // ── AI 裁定 ──
  async function fetchVerdict(contract, pd) {
    var lines = [];
    if (pd.name)      lines.push((isZh ? '代币名称：' : 'Token: ') + pd.name);
    if (pd.price)     lines.push((isZh ? '当前价格：$' : 'Price: $') + pd.price);
    if (pd.change5m)  lines.push((isZh ? '5分钟涨跌：' : '5m Change: ') + pd.change5m);
    if (pd.change1h)  lines.push((isZh ? '1小时涨跌：' : '1h Change: ') + pd.change1h);
    if (pd.change24h) lines.push((isZh ? '24小时涨跌：' : '24h Change: ') + pd.change24h);
    if (pd.liquidity) lines.push((isZh ? '流动性：$' : 'Liquidity: $') + pd.liquidity);
    if (pd.marketCap) lines.push((isZh ? '市值：$' : 'Mkt Cap: $') + pd.marketCap);
    if (pd.fdv)       lines.push((isZh ? 'FDV：$' : 'FDV: $') + pd.fdv);
    if (pd.volume)    lines.push((isZh ? '交易量：$' : 'Volume: $') + pd.volume);
    if (pd.txns)      lines.push((isZh ? '交易次数：' : 'Txns: ') + pd.txns);
    if (pd.holders)   lines.push((isZh ? '持有者：' : 'Holders: ') + pd.holders);
    if (pd.buys && pd.sells) lines.push((isZh ? '买入/卖出：' : 'Buys/Sells: ') + pd.buys + '/' + pd.sells);

    var dataStr = lines.length > 0 ? ('页面真实数据：\n' + lines.join('\n')) : '（无页面数据，请保守分析）';

    var langNote = isZh
      ? '所有文字字段必须用中文输出。'
      : 'All text fields (short, reason, signals) MUST be in English.';

    var prompt;
    if (isZh) {
      prompt = '你是Meme Court的AI法官，裁定BNB Chain Meme代币风险。\n'
        + '合约：' + contract + '\n'
        + dataStr + '\n\n'
        + '基于以上真实数据综合分析，返回JSON（不含其他文字）：\n'
        + '{"verdict":"BULLISH或BEARISH或NEUTRAL","confidence":0到100,"risk":"极高风险或高风险或中风险或低风险","short":"核心结论，25字以内，直接说明风险或机会","reason":"引用具体数据说明判断依据，80字以内，信息量要饱满","signals":{"liquidity":"流动性深度评估，20字以内","momentum":"价格动能评估，20字以内","safety":"安全性评估，20字以内"}}';
    } else {
      var dataStrEn = lines.length > 0 ? ('Real page data:\n' + lines.join('\n')) : '(No page data. Be conservative.)';
      prompt = 'You are the AI Judge of Meme Court. Analyze the risk of this BNB Chain Meme token.\n'
        + 'Contract: ' + contract + '\n'
        + dataStrEn + '\n\n'
        + 'Analyze based on the data above. Return strict JSON only (no other text):\n'
        + '{"verdict":"BULLISH or BEARISH or NEUTRAL","confidence":0-100,"risk":"极高风险 or 高风险 or 中风险 or 低风险","short":"Core conclusion in English, under 20 words, state the key risk or opportunity directly","reason":"Data-driven analysis in English, under 60 words, cite specific numbers","signals":{"liquidity":"Liquidity assessment in English, under 15 words","momentum":"Price momentum in English, under 15 words","safety":"Safety assessment in English, under 15 words"}}\n'
        + 'IMPORTANT: short, reason, and all signals values MUST be in English. risk field must be one of the Chinese values listed above.';
    }

    try {
      var res = await fetch(DS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + DS_KEY },
        body: JSON.stringify({ model: 'deepseek-chat', max_tokens: 600, messages: [{ role: 'user', content: prompt }] })
      });
      var data = await res.json();
      var raw = (data.choices && data.choices[0] && data.choices[0].message) ? data.choices[0].message.content : '';
      var m = raw.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]);
    } catch(e) { console.log('[MC] AI err:', e); }

    return { verdict: 'NEUTRAL', confidence: 50, risk: '未知', short: '法庭暂时无法连线', reason: 'AI服务暂时不可用', signals: { liquidity: '-', momentum: '-', safety: '-' } };
  }

  // ── 显示加载中 ──
  function showLoading(name) {
    var old = document.getElementById(MC_ID);
    if (old) old.remove();
    var w = document.createElement('div');
    w.id = MC_ID;
    w.innerHTML = '<div class="mc-header"><div class="mc-logo">\u2696\uFE0F <span>Verdict Protocol</span></div><div class="mc-close" id="mc-x">\u2715</div></div>'
      + '<div class="mc-token-row"><div class="mc-token-name">' + (name || '...') + '</div></div>'
      + '<div class="mc-loading"><div class="mc-spinner"></div><div class="mc-loading-text">' + T.loading + '</div></div>'
      + '<div class="mc-powered">' + T.powered + '</div>';
    document.body.appendChild(w);
    document.getElementById('mc-x').onclick = function() { w.remove(); };
  }

  // ── 显示裁定结果 ──
  function showVerdict(contract, v, pd) {
    var old = document.getElementById(MC_ID);
    if (old) old.remove();

    var CM = { BULLISH: { bg: '#0ec476' }, BEARISH: { bg: '#f03d3d' }, NEUTRAL: { bg: '#d97706' } };
    var RM = { '极高风险': '#f03d3d', '高风险': '#f97316', '中风险': '#d97706', '低风险': '#0ec476', '未知': '#888' };
    var vc = CM[v.verdict] || CM.NEUTRAL;
    var rc = RM[v.risk] || '#888';
    var sa = contract.slice(0,6) + '...' + contract.slice(-4);
    var platform = (pd && pd.platform) ? pd.platform : 'MEME COURT';
    var tokenName = (pd && pd.name) ? pd.name : '';
    var sg = v.signals || {};
    var verdictLabel = T.verdictMap[v.verdict] || v.verdict;
    var riskLabel = T.riskMap[v.risk] || v.risk;

    // logo：GMGN 直接显示代币名称，其他平台尝试加载 DexScreener 图片
    var logoUrl = 'https://dd.dexscreener.com/ds-data/tokens/bsc/' + contract + '.png';
    var logoPlaceholder = '<span id="mc-logo-wrap" style="display:flex;align-items:center;flex-shrink:0"></span>';

    var dataHtml = '';
    if (pd && (pd.price || pd.liquidity || pd.change24h || pd.holders)) {
      dataHtml = '<div class="mc-data-row">';
      if (pd.price)     dataHtml += '<div class="mc-data-item"><div class="mc-data-val">$' + pd.price + '</div><div class="mc-data-lbl">' + T.price + '</div></div>';
      if (pd.liquidity) dataHtml += '<div class="mc-data-item"><div class="mc-data-val">$' + pd.liquidity + '</div><div class="mc-data-lbl">' + T.liquidity + '</div></div>';
      if (pd.change24h) dataHtml += '<div class="mc-data-item"><div class="mc-data-val" style="color:' + (pd.change24h.charAt(0) === '-' ? '#f03d3d' : '#0ec476') + '">' + pd.change24h + '</div><div class="mc-data-lbl">' + T.h24 + '</div></div>';
      if (pd.holders)   dataHtml += '<div class="mc-data-item"><div class="mc-data-val">' + pd.holders + '</div><div class="mc-data-lbl">' + T.holders + '</div></div>';
      dataHtml += '</div>';
    }

    var sigHtml = '';
    if (sg.liquidity || sg.momentum || sg.safety) {
      sigHtml = '<div class="mc-signals">';
      if (sg.liquidity) sigHtml += '<div class="mc-sig"><span class="mc-sig-l">' + T.liqSig + '</span><span class="mc-sig-v">' + sg.liquidity + '</span></div>';
      if (sg.momentum)  sigHtml += '<div class="mc-sig"><span class="mc-sig-l">' + T.momentum + '</span><span class="mc-sig-v">' + sg.momentum + '</span></div>';
      if (sg.safety)    sigHtml += '<div class="mc-sig"><span class="mc-sig-l">' + T.safety + '</span><span class="mc-sig-v">' + sg.safety + '</span></div>';
      sigHtml += '</div>';
    }

    var w = document.createElement('div');
    w.id = MC_ID;
    w.innerHTML =
      '<div class="mc-header"><div class="mc-logo">\u2696\uFE0F <span>Verdict Protocol</span></div><div class="mc-close" id="mc-x">\u2715</div></div>'
      + '<div class="mc-token-row">'
      +   '<div class="mc-token-name">' + platform + '</div>'
      +   '<div class="mc-token-addr">' + sa + '</div>'
      +   '<button id="mc-copy" style="display:flex;align-items:center;gap:3px;padding:3px 8px;border:1px solid #e8e6e0;border-radius:6px;background:#fff;color:#8a8a87;font-size:10px;cursor:pointer;flex-shrink:0;font-family:inherit">' + T.copy + '</button>'
      + '</div>'
      + '<div class="mc-verdict-main"><div style="display:flex;align-items:center;gap:8px">' + logoPlaceholder + '<div class="mc-verdict-badge" style="background:' + vc.bg + '">' + verdictLabel + '</div></div>'
      + '<div class="mc-conf-wrap">'
      +   '<div class="mc-conf-num">' + v.confidence + '%</div>'
      +   '<div class="mc-conf-lbl">' + T.confidence + '</div>'
      +   '<div style="width:52px;height:4px;background:#f0ede8;border-radius:99px;overflow:hidden;margin-top:4px">'
      +     '<div style="width:' + v.confidence + '%;height:100%;background:' + vc.bg + ';border-radius:99px"></div>'
      +   '</div>'
      + '</div></div>'
      + '<div class="mc-risk-bar" style="border-left:3px solid ' + rc + '"><span style="color:' + rc + ';font-weight:700">\u26A0 ' + riskLabel + '</span></div>'
      + '<div class="mc-short">' + v.short + '</div>'
      + '<div class="mc-reason">' + v.reason + '</div>'
      + dataHtml + sigHtml
      + '<div class="mc-footer">'
      + '<a class="mc-btn-p" href="https://memecourt.online" target="_blank">' + T.bet + '</a>'
      + '<a class="mc-btn-s" href="https://memecourt.online/ip" target="_blank">' + T.ip + '</a>'
      + '</div>'
      + '<div class="mc-powered">' + T.powered + '</div>';

    document.body.appendChild(w);
    document.getElementById('mc-x').onclick = function() { w.remove(); };

    // Image 对象预加载 logo，检查 naturalWidth 排除无效图片
    var logoWrap = document.getElementById('mc-logo-wrap');
    if (logoWrap) {
      // GMGN 直接显示代币名称，不尝试加载图片
      if (platform === 'GMGN') {
        var nameEl = document.createElement('span');
        nameEl.textContent = tokenName;
        nameEl.style.cssText = 'font-size:13px;font-weight:700;color:#1a1a18;flex-shrink:0';
        logoWrap.appendChild(nameEl);
      } else {
        var testImg = new Image();
        testImg.onload = function() {
          if (testImg.naturalWidth > 1 && testImg.naturalHeight > 1) {
            var imgEl = document.createElement('img');
            imgEl.src = logoUrl;
            imgEl.style.cssText = 'width:32px;height:32px;border-radius:50%;object-fit:cover;border:1px solid #e8e6e0;flex-shrink:0';
            logoWrap.appendChild(imgEl);
          } else {
            var nameEl2 = document.createElement('span');
            nameEl2.textContent = tokenName;
            nameEl2.style.cssText = 'font-size:13px;font-weight:700;color:#1a1a18;flex-shrink:0';
            logoWrap.appendChild(nameEl2);
          }
        };
        testImg.onerror = function() {
          var nameEl3 = document.createElement('span');
          nameEl3.textContent = tokenName;
          nameEl3.style.cssText = 'font-size:13px;font-weight:700;color:#1a1a18;flex-shrink:0';
          logoWrap.appendChild(nameEl3);
        };
        testImg.src = logoUrl;
      }
    }

    var drag = false, ox = 0, oy = 0;
    w.querySelector('.mc-header').onmousedown = function(e) { drag = true; ox = e.clientX - w.offsetLeft; oy = e.clientY - w.offsetTop; };
    document.onmousemove = function(e) { if (!drag) return; w.style.left = (e.clientX-ox)+'px'; w.style.top = (e.clientY-oy)+'px'; w.style.right='auto'; w.style.bottom='auto'; };
    document.onmouseup = function() { drag = false; };

    // 复制合约地址
    var copyBtn = document.getElementById('mc-copy');
    if (copyBtn) {
      copyBtn.onclick = function() {
        var done = function() {
          copyBtn.textContent = T.copied;
          copyBtn.style.color = '#0ec476';
          setTimeout(function() { copyBtn.textContent = T.copy; copyBtn.style.color = '#8a8a87'; }, 1500);
        };
        if (navigator.clipboard) {
          navigator.clipboard.writeText(contract).then(done).catch(function() {
            var ta = document.createElement('textarea');
            ta.value = contract; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done();
          });
        } else {
          var ta = document.createElement('textarea');
          ta.value = contract; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done();
        }
      };
    }

    try { chrome.storage.local.set({ lastContract: contract, lastVerdict: v }); } catch(e) {}
  }

  // ── 主流程 ──
  var lastContract = null;
  var running = false;
  var verdictCache = {};  // 会话内缓存

  async function run() {
    if (running) return;
    running = true;

    await new Promise(function(r) { setTimeout(r, 1000); });

    var contract = extractContract();
    console.log('[Meme Court] contract:', contract);

    if (!contract) { running = false; return; }
    if (contract === lastContract) { running = false; return; }
    lastContract = contract;

    var pd = extractPageData();
    console.log('[Meme Court] pageData:', pd);

    // 命中缓存直接显示，不重复请求 AI
    if (verdictCache[contract]) {
      console.log('[Meme Court] cache hit:', contract);
      showVerdict(contract, verdictCache[contract], pd);
      running = false;
      return;
    }

    showLoading(pd.name);
    var verdict = await fetchVerdict(contract, pd);
    verdictCache[contract] = verdict;
    showVerdict(contract, verdict, pd);
    running = false;
  }

  // URL 变化监听
  window.__mcUrl = location.href;
  new MutationObserver(function() {
    if (location.href !== window.__mcUrl) {
      window.__mcUrl = location.href;
      lastContract = null;
      setTimeout(run, 2000);
    }
  }).observe(document.documentElement, { subtree: true, childList: true });

  window.__MC_RERUN__ = function() { lastContract = null; run(); };

  // 自动运行
  run();

})();
