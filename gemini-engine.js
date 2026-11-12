/**
 * ==============================================================================
 * 明愛元朗陳震夏中學 (CYS) - 24小時學習支援系統
 * 前端核心引擎：gemini-engine.js (雙模式切換 + Gemini 3.8-Flash)
 * 
 * 功能亮點：
 * 1. 【雙模式自由切換】：支援「📚 校本教材＋AI」與「🌐 純 Gemini 自學」即時切換。
 * 2. 【無侵入式 UI】：自動於提問輸入框上方注入切換按鈕，免動 index.html。
 * 3. 【上方框架對話】：問答氣泡、思考動畫與正式解答精準渲染於上方框架內。
 * 4. 【多模態拍照解題】：相機按鈕支援拍照與圖片上傳（自動轉換 Base64）。
 * 5. 【自適應防呆綁定】：自動綁定「提問」按鈕、支援 Enter 鍵發送。
 * ==============================================================================
 */

// 內部狀態管理
const GeminiEngineState = {
  isProcessing: false,
  answerMode: 'HYBRID', // 'HYBRID' (校本結合) 或 'PURE_GEMINI' (純 Gemini)
  attachedImageBase64: null,
  attachedImageMime: null,
  lastQuestion: ''
};

/**
 * 1. 取得上方對話視窗滾動容器
 */
function getUpperChatArea() {
  const welcomeBubble = document.querySelector('.bg-white.rounded-2xl, .bg-gray-50.rounded-2xl, div[class*="rounded"]');
  if (welcomeBubble && welcomeBubble.parentElement) {
    const parent = welcomeBubble.parentElement;
    if (parent.scrollHeight > 100 || parent.classList.contains('overflow-y-auto') || parent.id.includes('chat')) {
      return parent;
    }
  }

  const potentialContainers = [
    '#chatMessages',
    '#chatHistory',
    '#chatBox',
    '#conversationContainer',
    '.chat-container',
    '#aiResponseArea'
  ];

  for (const selector of potentialContainers) {
    const el = document.querySelector(selector);
    if (el) return el;
  }

  const inputEl = findQuestionInput();
  if (inputEl) {
    let curr = inputEl.parentElement;
    while (curr && curr !== document.body) {
      const prev = curr.previousElementSibling;
      if (prev && (prev.scrollHeight > 150 || prev.offsetHeight > 150)) {
        return prev;
      }
      curr = curr.parentElement;
    }
  }

  return document.body;
}

/**
 * 2. 平滑滾動至對話框底部
 */
function scrollChatToBottom() {
  const container = getUpperChatArea();
  if (!container) return;
  setTimeout(() => {
    container.scrollTo({
      top: container.scrollHeight + 1000,
      behavior: 'smooth'
    });
  }, 80);
}

/**
 * 3. 動態取得左側學習脈絡（年級、學科、班別、課題）
 */
function getLearningContext() {
  let grade = 'S1';
  const gradeEl = document.querySelector('#selectedGrade, select[name="grade"], #gradeSelect');
  if (gradeEl && gradeEl.value) {
    grade = gradeEl.value;
  } else {
    const activeGradeBtn = document.querySelector('.grade-btn.active, button[data-grade].active');
    if (activeGradeBtn) grade = activeGradeBtn.getAttribute('data-grade') || activeGradeBtn.innerText.trim();
  }

  let subject = '創新科技';
  const subEl = document.querySelector('#selectedSubject, select[name="subject"], #subjectSelect');
  if (subEl && subEl.value) {
    subject = subEl.value;
  }

  let classGroup = 'ACD';
  const classEl = document.querySelector('select:has(option[value*="ACD"]), #classGroupSelect, select[name="classGroup"]');
  if (classEl && classEl.value) {
    classGroup = classEl.value.replace('班', '').trim();
  }

  let topic = '常規課程';
  const checkedBoxes = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'));
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
 * 4. 插入「純 Gemini vs 教材優先」模式切換膠囊
 */
function injectModeToggleBar() {
  if (document.getElementById('cys-mode-toggle-bar')) return;

  const inputEl = findQuestionInput();
  if (!inputEl) return;

  const container = inputEl.closest('.flex, .bg-white, form, div') || inputEl.parentElement;

  const toggleBar = document.createElement('div');
  toggleBar.id = 'cys-mode-toggle-bar';
  toggleBar.className = 'flex items-center justify-between px-3 py-1.5 mb-2 bg-gray-100/95 rounded-xl text-xs text-gray-600 transition-all shadow-sm border border-gray-200/80';

  toggleBar.innerHTML = `
    <div class="flex items-center gap-2 font-medium text-gray-700">
      <span class="text-xs font-semibold text-gray-800">🤖 解答來源：</span>
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
      ${GeminiEngineState.answerMode === 'HYBRID' ? '優先依據陳震夏中學雲端講義精確字眼作答' : '由 Gemini 3.8 Flash 龐大知識庫直接解答（更快速）'}
    </span>
  `;

  if (container && container.parentElement) {
    container.parentElement.insertBefore(toggleBar, container);
  }
}

/**
 * 5. 切換解答模式
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
    if (descEl) descEl.innerText = '由 Gemini 3.8 Flash 龐大知識庫直接解答（更快速）';
    showToast('🌐 已切換為【純 Gemini 自學】模式（不檢索雲端教材）');
  }
}

/**
 * 6. 輕量 Markdown 渲染器
 */
function renderMarkdown(text) {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 代碼塊
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

  // 高亮卡片：校本教材依據
  html = html.replace(/(【🏫 校本教材原文依據】[\s\S]*?)(?=(【|$))/gim, function(match) {
    return `<div class="my-3 p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 shadow-xs leading-relaxed"><div class="font-bold text-emerald-800 text-sm mb-1 flex items-center gap-1.5">📖 校本教材準確字眼依據</div>${match.replace('【🏫 校本教材原文依據】', '').trim()}</div>`;
  });

  // 高亮卡片：延伸思考
  html = html.replace(/(【💡 延伸思考與生活應用】[\s\S]*?)(?=(【|$))/gim, function(match) {
    return `<div class="my-3 p-3.5 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-950 shadow-xs leading-relaxed"><div class="font-bold text-sky-800 text-sm mb-1 flex items-center gap-1.5">💡 智能延伸與生活實踐</div>${match.replace('【💡 延伸思考與生活應用】', '').trim()}</div>`;
  });

  html = html.replace(/\n\n/g, '<div class="h-2"></div>');
  html = html.replace(/\n/g, '<br>');

  return html;
}

/**
 * 7. 上方框架氣泡：學生提問
 */
function appendStudentBubble(questionText, imageBase64, mode) {
  const container = getUpperChatArea();
  if (!container) return;

  const bubbleWrapper = document.createElement('div');
  bubbleWrapper.className = 'flex justify-end my-3.5 animate-fadeIn';

  let imageHtml = '';
  if (imageBase64) {
    imageHtml = `<div class="mb-2"><img src="${imageBase64}" class="max-h-48 rounded-lg border border-red-200 shadow-sm object-contain" alt="拍照題目"></div>`;
  }

  const modeBadge = mode === 'PURE_GEMINI'
    ? `<span class="bg-blue-900/70 text-blue-100 text-[10px] px-1.5 py-0.5 rounded ml-1 font-semibold">🌐 純AI自學</span>`
    : `<span class="bg-red-900/70 text-red-100 text-[10px] px-1.5 py-0.5 rounded ml-1 font-semibold">📚 校本教材</span>`;

  bubbleWrapper.innerHTML = `
    <div class="flex items-start gap-2.5 max-w-[85%] flex-row-reverse">
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
 * 8. 上方框架氣泡：思考中
 */
function appendThinkingBubble(mode) {
  const container = getUpperChatArea();
  if (!container) return null;

  const thinkingId = 'ai-thinking-' + Date.now();
  const bubbleWrapper = document.createElement('div');
  bubbleWrapper.id = thinkingId;
  bubbleWrapper.className = 'flex justify-start my-3.5 animate-pulse';

  const statusText = mode === 'PURE_GEMINI'
    ? '正在調用 Gemini 3.8 Flash 直接思考解答...'
    : '正在查閱 Google Drive 校本教材精確字眼與生成解析...';

  const subText = mode === 'PURE_GEMINI'
    ? '純 AI 自由自學 ➔ 即時生成'
    : '校本教材優先 ➔ 智能融合解析';

  bubbleWrapper.innerHTML = `
    <div class="flex items-start gap-2.5 max-w-[85%]">
      <div class="w-8 h-8 rounded-full bg-red-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow">
        🤖
      </div>
      <div class="bg-white border border-gray-200 p-4 rounded-2xl rounded-tl-none shadow-sm text-sm text-gray-600 flex items-center gap-3">
        <svg class="animate-spin h-5 w-5 text-red-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
 * 9. 上方框架氣泡：AI 正式解答卡片
 */
function appendAiAnswerBubble(answerMarkdown, citedFiles = [], mode = 'HYBRID') {
  const container = getUpperChatArea();
  if (!container) return;

  const answerHtml = renderMarkdown(answerMarkdown);
  const bubbleWrapper = document.createElement('div');
  bubbleWrapper.className = 'flex justify-start my-4 animate-fadeIn';

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
    <div class="flex items-start gap-2.5 max-w-[92%] sm:max-w-[85%] w-full">
      <div class="w-8 h-8 rounded-full bg-red-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow mt-0.5">
        🤖
      </div>
      <div class="bg-white border border-gray-200/90 p-4 sm:p-5 rounded-2xl rounded-tl-none shadow-md text-sm text-gray-800 leading-relaxed w-full">
        <!-- 頂部資訊列 -->
        <div class="flex items-center justify-between pb-2 mb-3 border-b border-gray-100 text-xs text-gray-500">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-gray-800">CYS 智能學習助教 (Gemini 3.8 Flash)</span>
            ${sourceBadge}
          </div>
          <button onclick="copyAnswerToClipboard(this)" class="text-gray-400 hover:text-red-700 text-xs flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-gray-50">
            📋 複製解答
          </button>
        </div>

        <!-- 解答主體 -->
        <div class="ai-response-body leading-relaxed text-gray-800">
          ${answerHtml}
        </div>

        <!-- 教材來源列 -->
        ${filesBadgeHtml}
      </div>
    </div>
  `;

  container.appendChild(bubbleWrapper);
  scrollChatToBottom();
  triggerRadarGrowth();
}

/**
 * 10. 發送提問主流程
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

  const gasUrl = (typeof CONFIG !== 'undefined' && CONFIG.GAS_API_URL) ? CONFIG.GAS_API_URL : window.GAS_API_URL;
  if (!gasUrl) {
    showToast('系統配置錯誤：找不到 GAS_API_URL');
    return;
  }

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
    appendAiAnswerBubble(`⚠️ **通訊中斷**：無法連接至雲端學習支援引擎。\n\`${err.message}\``, [], currentMode);
  } finally {
    GeminiEngineState.isProcessing = false;
  }
}

/**
 * 11. DOM 輔助
 */
function findQuestionInput() {
  return document.querySelector('#questionInput, #userInput, #promptInput, input[placeholder*="知識疑問"], textarea[placeholder*="知識疑問"], input[type="text"]:not([id*="Topic"])');
}

function findSubmitButton() {
  const buttons = Array.from(document.querySelectorAll('button'));
  return buttons.find(b => b.innerText.includes('提問') || b.id === 'btnAsk' || b.id === 'sendBtn');
}

function findCameraButton() {
  const buttons = Array.from(document.querySelectorAll('button'));
  return buttons.find(b => b.querySelector('svg') && (b.title?.includes('相機') || b.innerText.includes('照') || b.getAttribute('aria-label')?.includes('相機'))) ||
         document.querySelector('#btnCamera, #cameraBtn, button:has(.fa-camera)');
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
    previewArea.className = 'flex items-center gap-2 p-2 bg-red-50 rounded-lg mb-2 border border-red-200';
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
 * 12. 模組初始化
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
  console.log('✅ CYS Gemini Engine (Dual Mode + Gemini 3.8 Flash) 初始化完成。');
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
