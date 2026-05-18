// ══ Meme Court · Background Service Worker ══

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Meme Court] Extension installed.');
  chrome.storage.local.clear();
});

// 点击扩展图标时，主动注入 content script
chrome.action.onClicked && chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['content.css']
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  } catch(e) {
    console.log('[Meme Court] Inject error:', e);
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'FETCH_VERDICT') {
    sendResponse({ status: 'ok' });
  }
  return true;
});
