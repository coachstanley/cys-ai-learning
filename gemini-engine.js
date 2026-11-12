/**
 * gemini-engine.js
 * 明愛元朗陳震夏中學 24小時自學系統 - 前端 AI 提問引擎
 */

// 取得當前選取的年級、學科與課題
function getLearningContext() {
  const subjectEl = document.getElementById('subjectSelect');
  const subject = subjectEl ? subjectEl.value : '綜合學科';

  // 取得勾選的課題
  const checkedTopics = [];
  document.querySelectorAll('.topic-checkbox:checked').forEach(cb => {
    checkedTopics.push(cb.value);
  });
  const customTopic = document.getElementById('customTopicInput')?.value?.trim();
  if (customTopic) checkedTopics.push(customTopic);

  return {
    subject: subject || 'CHI',
    topic: checkedTopics.length > 0 ? checkedTopics.join('、') : '日常自學探究'
  };
}

// 學生點擊提問核心處理函式
async function submitQuestion() {
  const inputEl = document.getElementById('chatInput');
  const chatContainer = document.getElementById('chatContainer');
  const question = inputEl ? inputEl.value.trim() : '';

  if (!question) {
    alert('請先輸入你想查詢的學科問題或知識！');
    return;
  }

  // 1. 在畫面上新增學生發問氣泡
  appendUserMessage(question);
  inputEl.value = '';

  // 2. 顯示「思考中」載入動畫氣泡
  const loadingId = 'loading-' + Date.now();
  appendLoadingMessage(loadingId, 'Gemini 正在透過 Vertex AI 思考並分析解答...');

  // 3. 取得上下文背景
  const context = getLearningContext();

  try {
    // 呼叫 GAS 後端 API
    const response = await fetch(APP_CONFIG.GAS_ENDPOINT_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'askGemini',
        prompt: question,
        subject: context.subject,
        topic: context.topic
      })
    });

    const result = await response.json();
    removeLoadingMessage(loadingId);

    if (result.status === 'success' && result.reply) {
      // 成功獲得解答：以美觀排版渲染
      appendAiResponse(result.reply);

      // 動態更新雷達圖能力指標
      if (typeof updateRadarBySubject === 'function') {
        updateRadarBySubject(context.subject);
      }
    } else {
      // 顯示真實錯誤訊息，不再顯示虛假罐頭文字
      const errText = result.message || '無法取得 AI 回覆';
      appendErrorMessage('⚠️ 查詢未成功：' + errText);
    }

  } catch (err) {
    removeLoadingMessage(loadingId);
    appendErrorMessage('⚠️ 網絡通訊中斷，請檢查連線或稍後重試。(' + err.message + ')');
  }
}

// 輔助函式：新增學生發問氣泡
function appendUserMessage(text) {
  const container = document.getElementById('chatContainer');
  if (!container) return;

  const div = document.createElement('div');
  div.className = 'flex justify-end my-3';
  div.innerHTML = `
    <div class="bg-[#8B1D24] text-white px-5 py-3 rounded-2xl rounded-tr-none max-w-[80%] shadow-md text-sm md:text-base leading-relaxed break-words">
      ${escapeHtml(text)}
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// 輔助函式：顯示載入中
function appendLoadingMessage(id, text) {
  const container = document.getElementById('chatContainer');
  if (!container) return;

  const div = document.createElement('div');
  div.id = id;
  div.className = 'flex items-start my-3 gap-3';
  div.innerHTML = `
    <div class="w-9 h-9 rounded-full bg-[#8B1D24] text-white flex items-center justify-center shrink-0 shadow">
      🤖
    </div>
    <div class="bg-gray-100 text-gray-600 px-5 py-3 rounded-2xl rounded-tl-none text-sm md:text-base flex items-center gap-2">
      <span class="inline-block animate-spin">⏳</span>
      <span>${text}</span>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// 移除載入中
function removeLoadingMessage(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// 輔助函式：渲染 AI 回答（支援 Markdown 粗體、換行與分點清單）
function appendAiResponse(markdownText) {
  const container = document.getElementById('chatContainer');
  if (!container) return;

  // 基本 Markdown 語意化轉換
  let html = escapeHtml(markdownText)
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900 font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-gray-700">$1</em>')
    .replace(/\n\n/g, '</p><p class="mt-3">')
    .replace(/\n/g, '<br/>');

  const div = document.createElement('div');
  div.className = 'flex items-start my-4 gap-3';
  div.innerHTML = `
    <div class="w-9 h-9 rounded-full bg-[#8B1D24] text-white flex items-center justify-center shrink-0 shadow mt-1">
      🤖
    </div>
    <div class="bg-white border border-gray-200 text-gray-800 px-6 py-4 rounded-2xl rounded-tl-none max-w-[90%] shadow-sm text-sm md:text-base leading-relaxed">
      <div class="text-xs text-[#8B1D24] font-bold mb-2 flex items-center gap-1">
        <span>✨ Google Gemini 官方解答</span>
      </div>
      <div class="prose prose-sm max-w-none">
        <p>${html}</p>
      </div>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// 輔助函式：渲染錯誤提示
function appendErrorMessage(errorText) {
  const container = document.getElementById('chatContainer');
  if (!container) return;

  const div = document.createElement('div');
  div.className = 'flex items-start my-3 gap-3';
  div.innerHTML = `
    <div class="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 shadow">
      ⚠️
    </div>
    <div class="bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-2xl rounded-tl-none text-sm max-w-[85%] leading-relaxed">
      ${escapeHtml(errorText)}
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
