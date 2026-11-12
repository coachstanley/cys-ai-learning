/**
 * ==============================================================================
 * 明愛元朗陳震夏中學 (CYS) - 24小時學習支援系統
 * 前端核心引擎：gemini-engine.js (縱向排版修復與排錯加強版)
 * 
 * 核心功能：
 * 1. 【縱向獨立對話流】：徹底修復橫向並排擠壓問題，強制縱向單行排列。
 * 2. 【主聊天視窗鎖定】：所有問答對話嚴格收攏在「Gemini 24小時自學解難助手」內部。
 * 3. 【雙模式自由切換】：支援「📚 校本教材＋AI」與「🌐 純 Gemini 自學」即時切換。
 * 4. 【GAS 連線自愈保底】：內建 resolveGasApiUrl() 與 Failed to fetch 防呆導引。
 * ==============================================================================
 */

// 內部狀態管理
const GeminiEngineState = {
  isProcessing: false,
  answerMode: 'PURE_GEMINI', // 預設或依使用者選擇
  attachedImageBase64: null,
  attachedImageMime: null,
  lastQuestion: ''
};

/**
 * 0. 智能解析並獲取後端 GAS API 網址（內建學校生產環境雙重保底）
 */
function resolveGasApiUrl() {
  if (typeof CONFIG !== 'undefined' && CONFIG) {
    if (CONFIG.GAS_API_URL) return CONFIG.GAS_API_URL;
    if (CONFIG.GAS_URL) return CONFIG.GAS_URL;
    if (CONFIG.API_URL) return CONFIG.API_URL;
  }
  if (window.GAS_API_URL) return window.GAS_API_URL;
  if (window.GAS_URL) return window.GAS_URL;
  if (window.API_URL) return window.API_URL;

  // 學校正式生產環境 GAS 網址（終極安全保底）
  return 'https://script.google.com/macros/s/AKfycbx8PZ9v0Eze0M1ALXZmk1X6cLMZejgdJKSnFWHaY7Gbh2gyHbzX6hKMcjvesF-lNE4sxw/exec';
}

/**
 * 1. 判斷當前是否處於「學生自學查詢頁」
 */
function isStudentQueryPageView() {
  const loginView = document.getElementById('viewLogin');
  if (loginView && loginView.style.display !== 'none' && !loginView.classList.contains('hidden')) {
    return false;
  }

  const studentView = document.getElementById('viewStudent');
  if (studentView && studentView.style.display !== 'none' && !studentView.classList.contains('hidden')) {
    return true;
  }

  const inputEl = document.querySelector('input[placeholder*="知識疑問"], textarea[placeholder*="知識疑問"]');
  if (inputEl && !inputEl.closest('#viewLogin') && !inputEl.closest('#viewTeacher') && !inputEl.closest('#viewAdmin')) {
    return true;
  }

  return false;
}

/**
 * 2. 【核心定位修復】：精準獲取「Gemini 24小時自學解難助手」主視窗內的真正的垂直訊息清單容器
 */
function getUpperChatArea() {
  const studentView = document.getElementById('viewStudent') || document.body;
  const allElements = Array.from(studentView.querySelectorAll('*'));

  // 尋找中央歡迎詞「我是陳震夏中學 24 小時學習助理」
  const welcomeTextEl = allElements.find(el => {
    const txt = (el.textContent || '').trim();
    return (txt.includes('我是陳震夏中學 24 小時學習助理') || txt.includes('請輸入你想查詢的學科問題')) &&
           !el.closest('#viewLogin') &&
           !el.closest('select') &&
           el.children.length === 0;
  });

  if (welcomeTextEl) {
    // 找到包含頭像和文字氣泡的整個「歡迎行 (Welcome Row)」
    let welcomeRow = welcomeTextEl.closest('.flex') || welcomeTextEl.parentElement;
    
    // 確保找到的是該行的頂層容器（該容器的父級即是整條對話歷史清單）
    while (welcomeRow && welcomeRow.parentElement && 
           welcomeRow.parentElement !== studentView &&
           !welcomeRow.parentElement.classList.contains('overflow-y-auto') &&
           welcomeRow.parentElement.children.length <= 1) {
      welcomeRow = welcomeRow.parentElement;
    }

    if (welcomeRow && welcomeRow.parentElement) {
      const chatListContainer = welcomeRow.parentElement;

      // 強制將對話列表容器校正為縱向排列（Column），徹底根治橫向並排擠壓
      chatListContainer.style.display = 'flex';
      chatListContainer.style.flexDirection = 'column';
      chatListContainer.style.width = '100%';
      chatListContainer.style.gap = '1.25rem';
      
      // 確保具備垂直捲動特性
      if (!chatListContainer.classList.contains('overflow-y-auto')) {
        chatListContainer.style.overflowY = 'auto';
      }

      return chatListContainer;
    }
  }

  // 備用策略：以標題「Gemini 24小時自學解難助手」鎖定
  const titleEl = allElements.find(el => {
    return (el.textContent || '').trim().includes('Gemini 24小時自學解難助手') && el.children.length === 0;
  });

  if (titleEl) {
    const mainCard = titleEl.closest('.bg-white, .rounded-2xl, .rounded-xl, .shadow') || titleEl.parentElement.parentElement;
    if (mainCard) {
      const scrollable = mainCard.querySelector('.overflow-y-auto, [class*="overflow-y"]');
      if (scrollable) {
        scrollable.style.display = 'flex';
        scrollable.style.flexDirection = 'column';
        scrollable.style.width = '100%';
        return scrollable;
      }
    }
  }

  return document.getElementById('viewStudent') || document.body;
}

/**
 * 3. 平滑滾動至對話框底部
 */
function scrollChatToBottom() {
  const container = getUpperChatArea();
  if (!container) return;
  setTimeout(() => {
    container.scrollTo({
      top: container.scrollHeight + 1500,
      behavior: 'smooth'
    });
  }, 100);
}

/**
 * 4. 尋找主對話框提問輸入框
 */
function findQuestionInput() {
  const studentView = document.getElementById('viewStudent') || document;
  const directInput = studentView.querySelector('#questionInput, #userInput, #promptInput, input[placeholder*="知識疑問"], textarea[placeholder*="知識疑問"]');
  if (directInput && !directInput.closest('#viewLogin')) return directInput;

  const candidates = Array.from(document.querySelectorAll('input[type="text"], textarea'));
  for (const el of candidates) {
    if (el.closest('#viewLogin') || el.closest('#viewTeacher') || el.closest('#viewAdmin')) continue;
    const ph = (el.placeholder || '').toLowerCase();
    if (ph.includes('知識疑問') || ph.includes('題目') || ph.includes('甚麼是') || ph.includes('什麼是')) {
      return el;
    }
  }
  return null;
}

/**
 * 5. 模式切換按鈕（📚 校本教材＋AI vs 🌐 純 Gemini 自學）
 */
function injectModeToggleBar() {
  if (!isStudentQueryPageView()) {
    const allMisplaced = document.querySelectorAll('#cys-mode-toggle-bar');
    allMisplaced.forEach(el => el.remove());
    return;
  }

  if (document.getElementById('cys-mode-toggle-bar')) return;

  const inputEl = findQuestionInput();
  if (!inputEl) return;

  const inputContainer = inputEl.closest('.flex, .bg-white, form, div') || inputEl.parentElement;

  const toggleBar = document.createElement('div');
  toggleBar.id = 'cys-mode-toggle-bar';
  toggleBar.className = 'w-full flex items-center justify-between px-3 py-1.5 mb-2 bg-gray-100/95 rounded-xl text-xs text-gray-700 transition-all shadow-xs border border-gray-200/90';

  toggleBar.innerHTML = `
    <div class="flex items-center gap-2 font-medium">
      <span class="text-xs font-bold text-gray-800 flex items-center gap-1">
        <span>🤖</span> 解答模式：
      </span>
      <div class="inline-flex p-0.5 bg-gray-200/90 rounded-lg shadow-inner">
        <button type="button" id="cys-mode-hybrid" onclick="switchAnswerMode('HYBRID')" 
          class="px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${GeminiEngineState.answerMode === 'HYBRID' ? 'bg-red-800 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}">
          📚 校本教材＋AI (推薦)
        </button>
        <button type="button" id="cys-mode-pure" onclick="switchAnswerMode('PURE_GEMINI')" 
          class="px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${GeminiEngineState.answerMode === 'PURE_GEMINI' ? 'bg-blue-700 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}">
          🌐 純 Gemini 自學 (不搜教材)
        </button>
      </div>
    </div>
    <span id="cys-mode-desc" class="text-[11px] text-gray-500 hidden sm:inline">
      ${GeminiEngineState.answerMode === 'HYBRID' ? '優先依據陳震夏中學雲端講義精確字眼作答' : '跳過教材檢索，由 Gemini 3.8 Flash 直接解答'}
    </span>
  `;

  if (inputContainer && inputContainer.parentElement) {
    inputContainer.parentElement.insertBefore(toggleBar, inputContainer);
  }
}

/**
 * 6. 切換解答模式
 */
function switchAnswerMode(mode) {
  GeminiEngineState.answerMode = mode;
  const btnHybrid = document.getElementById('cys-mode-hybrid');
  const btnPure = document.getElementById('cys-mode-pure');
  const descEl = document.getElementById('cys-mode-desc');

  if (mode === 'HYBRID') {
    if (btnHybrid) btnHybrid.className = 'px-2.5 py-1 rounded-md text-xs font-semibold transition-all bg-red-800 text-white shadow-xs';
    if (btnPure) btnPure.className = 'px-2.5 py-1 rounded-md text-xs font-semibold transition-all text-gray-600 hover:text-gray-900';
    if (descEl) descEl.innerText = '優先依據陳震夏中學雲端講義精確字眼作答';
    showToast('📚 已切換為【校本教材優先】模式');
  } else {
    if (btnHybrid) btnHybrid.className = 'px-2.5 py-1 rounded-md text-xs font-semibold transition-all text-gray-600 hover:text-gray-900';
    if (btnPure) btnPure.className = 'px-2.5 py-1 rounded-md text-xs font-semibold transition-all bg-blue-700 text-white shadow-xs';
    if (descEl) descEl.innerText = '跳過教材檢索，由 Gemini 3.8 Flash 直接解答';
    showToast('🌐 已切換為【純 Gemini 自學】模式（不檢索雲端教材）');
  }
}

/**
 * 7. 動態獲取查詢頁左側學習脈絡
 */
function getLearningContext() {
  let grade = 'S1';
  const gradeEl = document.querySelector('#selectedGrade, select[name="grade"], #gradeSelect');
  if (gradeEl && gradeEl.value) grade = gradeEl.value;

  let subject = '創新科技';
  const subEl = document.querySelector('#selectedSubject, select[name="subject"], #subjectSelect');
  if (subEl && subEl.value) subject = subEl.value;

  let classGroup = 'ACD';
  const classEl = document.querySelector('select:has(option[value*="ACD"]), #classGroupSelect, select[name="classGroup"]');
  if (classEl && classEl.value) classGroup = classEl.value.replace('班', '').trim();

  let topic = '常規課程';
  const checkedBoxes = Array.from(document.querySelectorAll('#viewStudent input[type="checkbox"]:checked'));
  const topicCheckbox = checkedBoxes.find(b => {
    const label = b.closest('label') || b.parentElement;
    const txt = label ? label.innerText : '';
    return txt.includes('單元') || txt.includes('CH') || txt.includes('課題') || txt.includes('章節');
  });

  if (topicCheckbox) {
    const label = topicCheckbox.closest('label') || topicCheckbox.parentElement;
    topic = label.innerText.replace(/[\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  return { grade, subject, classGroup, topic };
}

/**
 * 8. 輕量 Markdown 渲染器
 */
function renderMarkdown(text) {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 代碼區塊
  html = html.replace(/```([\s\S]*?)```/g, function(match, code) {
    return `<div class="bg-gray-900 text-green-400 p-3.5 my-2.5 rounded-xl font-mono text-xs overflow-x-auto border border-gray-700 leading-relaxed">${code.trim()}</div>`;
  });

  // 標題
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-base font-bold text-gray-800 mt-3.5 mb-1.5 flex items-center gap-1.5"><span class="w-1.5 h-4 bg-red-600 rounded-full inline-block"></span>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-gray-900 mt-4 mb-2 pb-1 border-b border-gray-200">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-xl font-extrabold text-red-900 mt-4 mb-2">$1</h1>');

  // 粗體與斜體
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900 bg-amber-50/80 px-1 py-0.5 rounded text-amber-950">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em class="italic text-gray-700">$1</em>');

  // 引言
  html = html.replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-red-500 bg-red-50/60 p-2.5 my-2 rounded-r-lg text-gray-700 text-sm italic">$1</blockquote>');

  // 清單
  html = html.replace(/^\s*[\*\-]\s+(.*$)/gim, '<li class="ml-4 list-disc text-gray-700 my-1 leading-relaxed">$1</li>');
  html = html.replace(/^\s*(\d+)\.\s+(.*$)/gim, '<li class="ml-4 list-decimal text-gray-700 my-1 leading-relaxed"><span class="font-semibold">$1.</span> $2</li>');

  // 高亮卡片：校本教材原文依據
  html = html.replace(/(【🏫 校本教材原文依據】[\s\S]*?)(?=(【|$))/gim, function(match) {
    return `<div class="my-3 p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 shadow-xs leading-relaxed"><div class="font-bold text-emerald-800 text-sm mb-1 flex items-center gap-1.5">📖 校本教材準確字眼依據</div>${match.replace('【🏫 校本教材原文依據】', '').trim()}</div>`;
  });

  // 高亮卡片：延伸思考與生活應用
  html = html.replace(/(【💡 延伸思考與生活應用】[\s\S]*?)(?=(【|$))/gim, function(match) {
    return `<div class="my-3 p-3.5 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-950 shadow-xs leading-relaxed"><div class="font-bold text-sky-800 text-sm mb-1 flex items-center gap-1.5">💡 智能延伸與生活實踐</div>${match.replace('【💡 延伸思考與生活應用】', '').trim()}</div>`;
  });

  html = html.replace(/\n\n/g, '<div class="h-2"></div>');
  html = html.replace(/\n/g, '<br>');

  return html;
}

/**
 * 9. 上方主視窗：加入學生發問氣泡（強制整行獨立）
 */
function appendStudentBubble(questionText, imageBase64, mode) {
  const container = getUpperChatArea();
  if (!container) return;

  const bubbleWrapper = document.createElement('div');
  bubbleWrapper.className = 'w-full flex justify-end my-2 animate-fadeIn';
  bubbleWrapper.style.width = '100%';
  bubbleWrapper.style.display = 'flex';
  bubbleWrapper.style.justifyContent = 'flex-end';

  let imageHtml = '';
  if (imageBase64) {
    imageHtml = `<div class="mb-2"><img src="${imageBase64}" class="max-h-48 rounded-lg border border-red-200 shadow-sm object-contain" alt="題目相片"></div>`;
  }

  const modeBadge = mode === 'PURE_GEMINI'
    ? `<span class="bg-blue-900/80 text-blue-100 text-[10px] px-1.5 py-0.5 rounded ml-1 font-semibold">🌐 純AI自學</span>`
    : `<span class="bg-red-900/80 text-red-100 text-[10px] px-1.5 py-0.5 rounded ml-1 font-semibold">📚 校本教材</span>`;

  bubbleWrapper.innerHTML = `
    <div class="flex items-start gap-2.5 max-w-[85%] sm:max-w-[75%] flex-row-reverse">
      <div class="w-8 h-8 rounded-full bg-red-800 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow">
        我
      </div>
      <div class="bg-red-800 text-white p-3.5 rounded-2xl rounded-tr-none shadow-md text-sm leading-relaxed break-words">
        <div class="text-[10px] text-red-200 mb-1 flex items-center justify-end">模式：${modeBadge}</div>
        ${imageHtml}
        <div>${escapeHtml(questionText)}</div>
      </div>
    </div>
  `;

  container.appendChild(bubbleWrapper);
  scrollChatToBottom();
}

/**
 * 10. 上方主視窗：加入「思考中」動畫（強制整行獨立）
 */
function appendThinkingBubble(mode) {
  const container = getUpperChatArea();
  if (!container) return null;

  const thinkingId = 'ai-thinking-' + Date.now();
  const bubbleWrapper = document.createElement('div');
  bubbleWrapper.id = thinkingId;
  bubbleWrapper.className = 'w-full flex justify-start my-2 animate-pulse';
  bubbleWrapper.style.width = '100%';
  bubbleWrapper.style.display = 'flex';
  bubbleWrapper.style.justifyContent = 'flex-start';

  const statusText = mode === 'PURE_GEMINI'
    ? '正在調用 Gemini 3.8 Flash 直接解答...'
    : '正在檢索 Google Drive 教材精確字眼並融合生成...';

  const subText = mode === 'PURE_GEMINI'
    ? '純 AI 自由自學 ➔ 快速回傳'
    : '校本教材優先 ➔ 針對性解析';

  bubbleWrapper.innerHTML = `
    <div class="flex items-start gap-2.5 max-w-[85%]">
      <div class="w-8 h-8 rounded-full bg-red-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow">
        🤖
      </div>
      <div class="bg-white border border-gray-200 p-4 rounded-2xl rounded-tl-none shadow-sm text-sm text-gray-600 flex items-center gap-3">
        <svg class="animate-spin h-5 w-5 text-red-700 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <div>
          <span class="font-medium text-gray-800">${statusText}</span>
          <div class="text-xs text-gray-400 mt-0.5">${subText}</div>
        </div>
      </div>
    </div>
  `;

  container.appendChild(bubbleWrapper);
  scrollChatToBottom();
  return thinkingId;
}

/**
 * 11. 上方主視窗：加入 AI 正式解答卡片（強制全寬滿版排列）
 */
function appendAiAnswerBubble(answerMarkdown, citedFiles = [], mode = 'PURE_GEMINI') {
  const container = getUpperChatArea();
  if (!container) return;

  const answerHtml = renderMarkdown(answerMarkdown);
  const bubbleWrapper = document.createElement('div');
  bubbleWrapper.className = 'w-full flex justify-start my-3 animate-fadeIn';
  bubbleWrapper.style.width = '100%';
  bubbleWrapper.style.display = 'flex';
  bubbleWrapper.style.justifyContent = 'flex-start';

  let sourceBadge = '';
  if (mode === 'PURE_GEMINI') {
    sourceBadge = `<span class="bg-blue-100 text-blue-800 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-blue-300">🌐 純 Gemini 知識庫解答</span>`;
  } else if (citedFiles && citedFiles.length > 0) {
    sourceBadge = `<span class="bg-emerald-100 text-emerald-800 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-300">📖 已依據校本教材精確解答</span>`;
  } else {
    sourceBadge = `<span class="bg-sky-50 text-sky-700 text-[11px] font-medium px-2 py-0.5 rounded-full border border-sky-200">🌐 Gemini 智能補充解答</span>`;
  }

  let filesBadgeHtml = '';
  if (mode !== 'PURE_GEMINI' && citedFiles && citedFiles.length > 0) {
    const fileListHtml = citedFiles.map(f => `
      <span class="inline-flex items-center gap-1 bg-white border border-amber-300 text-amber-800 text-[11px] px-2 py-0.5 rounded-md font-medium shadow-2xs">
        📄 ${escapeHtml(f)}
      </span>
    `).join(' ');
    filesBadgeHtml = `
      <div class="mt-3 pt-2.5 border-t border-gray-100 flex flex-wrap items-center gap-1.5">
        <span class="text-xs text-gray-500 font-semibold">📚 參照教材：</span>
        ${fileListHtml}
      </div>
    `;
  }

  bubbleWrapper.innerHTML = `
    <div class="flex items-start gap-2.5 max-w-[95%] sm:max-w-[90%] w-full">
      <div class="w-8 h-8 rounded-full bg-red-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow mt-0.5">
        🤖
      </div>
      <div class="bg-white border border-gray-200/90 p-4 sm:p-5 rounded-2xl rounded-tl-none shadow-md text-sm text-gray-800 leading-relaxed w-full">
        <div class="flex items-center justify-between pb-2 mb-3 border-b border-gray-100 text-xs text-gray-500">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-gray-800">CYS 智能學習助教 (Gemini 3.8 Flash)</span>
            ${sourceBadge}
          </div>
          <button onclick="copyAnswerToClipboard(this)" class="text-gray-400 hover:text-red-700 text-xs flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-gray-50">
            📋 複製解答
          </button>
        </div>

        <div class="ai-response-body leading-relaxed text-gray-800">
          ${answerHtml}
        </div>

        ${filesBadgeHtml}
      </div>
    </div>
  `;

  container.appendChild(bubbleWrapper);
  scrollChatToBottom();
  triggerRadarGrowth();
}

/**
 * 12. 發送提問主流程
 */
async function askQuestion(customText = null) {
  if (GeminiEngineState.isProcessing) return;

  const inputEl = findQuestionInput();
  const questionText = customText || (inputEl ? inputEl.value.trim() : '');

  if (!questionText && !GeminiEngineState.attachedImageBase64) {
    showToast('請先輸入學科問題，或拍照上傳題目！');
    if (inputEl) inputEl.focus();
    return;
  }

  const gasUrl = resolveGasApiUrl();
  const currentMode = GeminiEngineState.answerMode;
  GeminiEngineState.isProcessing = true;
  GeminiEngineState.lastQuestion = questionText;
  const context = getLearningContext();
  const currentImage = GeminiEngineState.attachedImageBase64;
  const currentMime = GeminiEngineState.attachedImageMime;

  appendStudentBubble(questionText, currentImage, currentMode);
  const thinkingId = appendThinkingBubble(currentMode);

  if (inputEl) inputEl.value = '';
  clearImageAttachment();

  try {
    const requestPayload = {
      action: 'askGemini',
      prompt: questionText,
      grade: context.grade,
      subject: context.subject,
      classGroup: context.classGroup,
      topic: context.topic,
      ragStrategy: currentMode === 'PURE_GEMINI' ? 'PURE_GEMINI' : 'DRIVE_FIRST_THEN_GEMINI',
      image: currentImage ? { data: currentImage.split(',')[1], mimeType: currentMime } : null
    };

    // 使用無預檢純文字 POST，確保跨域呼叫順暢
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(requestPayload)
    });

    const result = await response.json();

    const thinkingEl = document.getElementById(thinkingId);
    if (thinkingEl) thinkingEl.remove();

    if (result && result.status === 'success') {
      appendAiAnswerBubble(result.answer, result.citedFiles || [], currentMode);
    } else {
      appendAiAnswerBubble(`⚠️ **解答生成時發生狀況**：\n${result.error || '伺服器未能回傳內容，請稍後重試。'}`, [], currentMode);
    }

  } catch (err) {
    console.error('[GeminiEngine] 連線異常:', err);
    const thinkingEl = document.getElementById(thinkingId);
    if (thinkingEl) thinkingEl.remove();

    let friendlyError = err.message;
    if (err.message.includes('Failed to fetch')) {
      friendlyError = '無法連接至 Google Apps Script 後端（`Failed to fetch`）。\n\n👉 **請張副校長檢查 GAS 後台權限**：\n1. 前往 GAS 點擊右上角「**部署 ➔ 管理部署作業**」\n2. 點擊鉛筆 ✏️ 編輯，檢查「**誰可以存取 (Who has access)**」是否設定為「**所有人 (Anyone)**」！\n3. 若不是「所有人」，瀏覽器會因安全政策攔截而無法通訊。設定為「所有人」並發布為新版本即可立即解決！';
    }

    appendAiAnswerBubble(`⚠️ **通訊中斷**：無法連接至雲端學習支援引擎。\n\n${friendlyError}`, [], currentMode);
  } finally {
    GeminiEngineState.isProcessing = false;
  }
}

/**
 * 13. 相機拍照與圖片上傳處理
 */
function findSubmitButton() {
  const buttons = Array.from(document.querySelectorAll('#viewStudent button, button'));
  return buttons.find(b => !b.closest('#viewLogin') && (b.innerText.includes('提問') || b.id === 'btnAsk' || b.id === 'sendBtn'));
}

function findCameraButton() {
  const buttons = Array.from(document.querySelectorAll('#viewStudent button, button'));
  return buttons.find(b => !b.closest('#viewLogin') && b.querySelector('svg') && (b.title?.includes('相機') || b.innerText.includes('照') || b.getAttribute('aria-label')?.includes('相機'))) ||
         document.querySelector('#btnCamera, #cameraBtn');
}

function setupCameraAndUpload() {
  let fileInput = document.getElementById('cys-hidden-file-input');
  if (!fileInput) {
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'cys-hidden-file-input';
    fileInput.accept = 'image/*';
    fileInput.capture = 'environment';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    fileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(event) {
        GeminiEngineState.attachedImageBase64 = event.target.result;
        GeminiEngineState.attachedImageMime = file.type;
        showToast('📷 已選取相片！請輸入問題後點擊「提問」。');
        renderImagePreview(event.target.result);
      };
      reader.readAsDataURL(file);
    });
  }

  const cameraBtn = findCameraButton();
  if (cameraBtn) {
    cameraBtn.onclick = (e) => {
      e.preventDefault();
      fileInput.click();
    };
  }
}

function renderImagePreview(base64Data) {
  let previewArea = document.getElementById('cys-image-preview-area');
  const inputEl = findQuestionInput();
  if (!previewArea && inputEl) {
    previewArea = document.createElement('div');
    previewArea.id = 'cys-image-preview-area';
    previewArea.className = 'w-full flex items-center gap-2 p-2 bg-red-50 rounded-lg mb-2 border border-red-200';
    inputEl.parentElement.parentElement.insertBefore(previewArea, inputEl.parentElement);
  }

  if (previewArea) {
    previewArea.innerHTML = `
      <img src="${base64Data}" class="h-12 w-12 object-cover rounded border border-red-300">
      <span class="text-xs text-red-800 font-medium">相片已就緒</span>
      <button onclick="clearImageAttachment()" class="ml-auto text-red-500 hover:text-red-700 text-xs px-2 py-1 font-bold">✕ 移除</button>
    `;
    previewArea.style.display = 'flex';
  }
}

function clearImageAttachment() {
  GeminiEngineState.attachedImageBase64 = null;
  GeminiEngineState.attachedImageMime = null;
  const previewArea = document.getElementById('cys-image-preview-area');
  if (previewArea) previewArea.style.display = 'none';
  const fileInput = document.getElementById('cys-hidden-file-input');
  if (fileInput) fileInput.value = '';
}

function showToast(message) {
  let toast = document.getElementById('cys-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'cys-toast';
    toast.className = 'fixed bottom-5 right-5 bg-gray-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl z-50 transition-opacity duration-300 pointer-events-none opacity-0';
    document.body.appendChild(toast);
  }
  toast.innerText = message;
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

function copyAnswerToClipboard(btn) {
  const card = btn.closest('.bg-white');
  const body = card ? card.querySelector('.ai-response-body') : null;
  if (body) {
    navigator.clipboard.writeText(body.innerText).then(() => {
      btn.innerText = '✅ 已複製！';
      setTimeout(() => { btn.innerText = '📋 複製解答'; }, 2000);
    });
  }
}

function triggerRadarGrowth() {
  try {
    if (typeof updateRadarPoints === 'function') {
      updateRadarPoints();
    } else if (window.studentRadarChart) {
      const data = window.studentRadarChart.data.datasets[0].data;
      const randIdx = Math.floor(Math.random() * data.length);
      data[randIdx] = Math.min(100, data[randIdx] + 5);
      window.studentRadarChart.update();
    }
  } catch (e) {}
}

function escapeHtml(string) {
  const entityMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(string).replace(/[&<>"']/g, s => entityMap[s]);
}

/**
 * 14. 模組初始化與動態視圖監視器
 */
function initGeminiEngine() {
  injectModeToggleBar();

  const submitBtn = findSubmitButton();
  if (submitBtn) {
    submitBtn.onclick = (e) => {
      e.preventDefault();
      askQuestion();
    };
  }

  const inputEl = findQuestionInput();
  if (inputEl) {
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        askQuestion();
      }
    });
  }

  setupCameraAndUpload();

  const observer = new MutationObserver(() => {
    if (isStudentQueryPageView()) {
      if (!document.getElementById('cys-mode-toggle-bar')) {
        injectModeToggleBar();
      }
    } else {
      const misplaced = document.querySelectorAll('#cys-mode-toggle-bar');
      misplaced.forEach(el => el.remove());
    }
  });

  observer.observe(document.body, { childList: true, subtree: true, attributes: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGeminiEngine);
} else {
  initGeminiEngine();
}

window.askQuestion = askQuestion;
window.switchAnswerMode = switchAnswerMode;
window.clearImageAttachment = clearImageAttachment;
window.copyAnswerToClipboard = copyAnswerToClipboard;
