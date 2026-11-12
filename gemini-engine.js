/**
 * ==============================================================================
 * 明愛元朗陳震夏中學 (CYS) - 24小時學習支援系統
 * 前端核心引擎：gemini-engine.js
 * 
 * 功能亮點：
 * 1. 深度整合 Google Drive RAG 架構（動態提取年級、學科、班別、核取方塊課題）
 * 2. 視窗鎖定：精準在上方專屬聊天框架中渲染對話氣泡與思考動畫
 * 3. 支援相機拍照與相片上傳（Base64 多模態視覺辨識解題）
 * 4. 內建輕量 Markdown 渲染器（支援排版、清單、粗體、代碼塊）
 * 5. 8 大學習領域學力雷達圖即時數值增長反饋
 * 6. 自適應 DOM 事件綁定（支援 Enter 送出、防止重複提交）
 * ==============================================================================
 */

// 內部狀態管理
const GeminiEngineState = {
  isProcessing: false,
  attachedImageBase64: null,
  attachedImageMime: null,
  lastQuestion: '',
  activeTopic: '常規課程'
};

/**
 * 1. 精準獲取上方聊天對話框架容器
 */
function getUpperChatArea() {
  // 優先查找包含機器人歡迎詞的父層滾動容器
  const welcomeBubble = document.querySelector('.bg-white.rounded-2xl, .bg-gray-50.rounded-2xl, div[class*="rounded"]');
  if (welcomeBubble && welcomeBubble.parentElement) {
    const parent = welcomeBubble.parentElement;
    if (parent.scrollHeight > 100 || parent.classList.contains('overflow-y-auto') || parent.id.includes('chat')) {
      return parent;
    }
  }

  // 備用識別碼搜尋
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

  // 兜底方案：尋找輸入框上方最近的滾動區域
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
 * 2. 平滑捲動上方聊天框架至最底部
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
 * 3. 動態取得左側學生目前選定的脈絡（年級、科目、班別、勾選課題）
 */
function getLearningContext() {
  // (A) 年級 (預設 S1)
  let grade = 'S1';
  const gradeEl = document.querySelector('#selectedGrade, select[name="grade"], #gradeSelect');
  if (gradeEl && gradeEl.value) {
    grade = gradeEl.value;
  } else {
    const activeGradeBtn = document.querySelector('.grade-btn.active, button[data-grade].active');
    if (activeGradeBtn) grade = activeGradeBtn.getAttribute('data-grade') || activeGradeBtn.innerText.trim();
  }

  // (B) 學科 (預設 創新科技)
  let subject = '創新科技';
  const subEl = document.querySelector('#selectedSubject, select[name="subject"], #subjectSelect');
  if (subEl && subEl.value) {
    subject = subEl.value;
  }

  // (C) 班別 (預設 ACD班)
  let classGroup = 'ACD';
  const classEl = document.querySelector('select:has(option[value*="ACD"]), #classGroupSelect, select[name="classGroup"]');
  if (classEl && classEl.value) {
    classGroup = classEl.value.replace('班', '').trim();
  } else {
    // 透過文字匹配選擇器
    const selects = Array.from(document.querySelectorAll('select'));
    const matchedSelect = selects.find(s => s.innerText.includes('ACD') || s.value.includes('ACD'));
    if (matchedSelect) classGroup = matchedSelect.value.replace('班', '').trim();
  }

  // (D) 當前課題：優先動態讀取左側 Checkbox (如 單元一：CHI 核心基礎原理概念)
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
  } else {
    const topicInput = document.querySelector('#currentTopic, #topicInput, input[name="topic"]');
    if (topicInput && topicInput.value) topic = topicInput.value.trim();
  }

  return { grade, subject, classGroup, topic };
}

/**
 * 4. 輕量 Markdown 渲染器（無需外部大型庫，支援結構化高質感排版）
 */
function renderMarkdown(text) {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 代碼塊 (```code```)
  html = html.replace(/```([\s\S]*?)```/g, function(match, code) {
    return `<div class="bg-gray-900 text-green-400 p-3.5 my-2.5 rounded-xl font-mono text-xs overflow-x-auto border border-gray-700 leading-relaxed">${code.trim()}</div>`;
  });

  // 標題 (###, ##, #)
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-base font-bold text-gray-800 mt-3 mb-1.5 flex items-center gap-1.5"><span class="w-1.5 h-4 bg-red-600 rounded-full inline-block"></span>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-gray-900 mt-4 mb-2 pb-1 border-b border-gray-200">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-xl font-extrabold text-red-900 mt-4 mb-2">$1</h1>');

  // 粗體與斜體
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900 bg-red-50 px-1 py-0.5 rounded text-red-950">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em class="italic text-gray-700">$1</em>');

  // 引用區塊 (> 引言)
  html = html.replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-red-500 bg-red-50/60 p-2.5 my-2 rounded-r-lg text-gray-700 text-sm italic">$1</blockquote>');

  // 無序清單 (* 或 -)
  html = html.replace(/^\s*[\*\-]\s+(.*$)/gim, '<li class="ml-4 list-disc text-gray-700 my-1 leading-relaxed">$1</li>');

  // 有序清單 (1. 2.)
  html = html.replace(/^\s*(\d+)\.\s+(.*$)/gim, '<li class="ml-4 list-decimal text-gray-700 my-1 leading-relaxed"><span class="font-semibold">$1.</span> $2</li>');

  // 引用教材專屬醒目卡片 (匹配 【📚 引用本校教材檔案】)
  html = html.replace(/(【📚 引用本校教材檔案】[\s\S]*?$)/gim, function(match) {
    return `<div class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 shadow-sm leading-relaxed">${match}</div>`;
  });

  // 換行處理
  html = html.replace(/\n\n/g, '<div class="h-2"></div>');
  html = html.replace(/\n/g, '<br>');

  return html;
}

/**
 * 5. 在上方對話框架中加入「學生提問氣泡」
 */
function appendStudentBubble(questionText, imageBase64) {
  const container = getUpperChatArea();
  if (!container) return;

  const bubbleWrapper = document.createElement('div');
  bubbleWrapper.className = 'flex justify-end my-3.5 animate-fadeIn';

  let imageHtml = '';
  if (imageBase64) {
    imageHtml = `<div class="mb-2"><img src="${imageBase64}" class="max-h-48 rounded-lg border border-red-200 shadow-sm object-contain" alt="拍照題目"></div>`;
  }

  bubbleWrapper.innerHTML = `
    <div class="flex items-start gap-2.5 max-w-[85%] flex-row-reverse">
      <div class="w-8 h-8 rounded-full bg-red-800 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow">
        我
      </div>
      <div class="bg-red-800 text-white p-3.5 rounded-2xl rounded-tr-none shadow-md text-sm leading-relaxed break-words">
        ${imageHtml}
        <div>${escapeHtml(questionText)}</div>
      </div>
    </div>
  `;

  container.appendChild(bubbleWrapper);
  scrollChatToBottom();
}

/**
 * 6. 在上方對話框架中加入「AI 思考中」動畫
 */
function appendThinkingBubble() {
  const container = getUpperChatArea();
  if (!container) return null;

  const thinkingId = 'ai-thinking-' + Date.now();
  const bubbleWrapper = document.createElement('div');
  bubbleWrapper.id = thinkingId;
  bubbleWrapper.className = 'flex justify-start my-3.5 animate-pulse';

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
        <span>CYS 智能學習助教正在翻閱本校 Google Drive 教材，為你精準推論解答中...</span>
      </div>
    </div>
  `;

  container.appendChild(bubbleWrapper);
  scrollChatToBottom();
  return thinkingId;
}

/**
 * 7. 在上方對話框架中加入「AI 正式解答卡片」
 */
function appendAiAnswerBubble(answerMarkdown, citedFiles = []) {
  const container = getUpperChatArea();
  if (!container) return;

  const answerHtml = renderMarkdown(answerMarkdown);
  const bubbleWrapper = document.createElement('div');
  bubbleWrapper.className = 'flex justify-start my-4 animate-fadeIn';

  // 引用檔案標籤清單
  let filesBadgeHtml = '';
  if (citedFiles && citedFiles.length > 0) {
    const fileListHtml = citedFiles.map(f => `
      <span class="inline-flex items-center gap-1 bg-white border border-amber-300 text-amber-800 text-[11px] px-2 py-0.5 rounded-md font-medium shadow-2xs">
        📄 ${escapeHtml(f)}
      </span>
    `).join(' ');
    filesBadgeHtml = `
      <div class="mt-3 pt-2.5 border-t border-gray-100 flex flex-wrap items-center gap-1.5">
        <span class="text-xs text-gray-500 font-semibold">📚 檢索到之校本教材：</span>
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
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-green-500 inline-block animate-ping"></span>
            <span class="font-semibold text-gray-700">CYS 智能學習助教 (Gemini 2.5 Flash)</span>
          </div>
          <button onclick="copyAnswerToClipboard(this)" class="text-gray-400 hover:text-red-700 text-xs flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-gray-50">
            📋 複製解答
          </button>
        </div>

        <!-- 核心解答主體 -->
        <div class="ai-response-body leading-relaxed text-gray-800">
          ${answerHtml}
        </div>

        <!-- 教材引用標籤 -->
        ${filesBadgeHtml}
      </div>
    </div>
  `;

  container.appendChild(bubbleWrapper);
  scrollChatToBottom();

  // 自動觸發雷達圖學力點數提升
  triggerRadarGrowth();
}

/**
 * 8. 發送提問主流程 (包含後端連線與錯誤攔截)
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

  // 1. 取得後端 GAS URL
  const gasUrl = (typeof CONFIG !== 'undefined' && CONFIG.GAS_API_URL) ? CONFIG.GAS_API_URL : window.GAS_API_URL;
  if (!gasUrl) {
    showToast('系統配置錯誤：找不到 GAS_API_URL');
    return;
  }

  // 2. 鎖定狀態並取得學習脈絡
  GeminiEngineState.isProcessing = true;
  GeminiEngineState.lastQuestion = questionText;
  const context = getLearningContext();
  const currentImage = GeminiEngineState.attachedImageBase64;
  const currentMime = GeminiEngineState.attachedImageMime;

  // 3. 立即於上方框架渲染學生氣泡與思考動畫
  appendStudentBubble(questionText, currentImage);
  const thinkingId = appendThinkingBubble();

  // 4. 清空輸入框與圖片快取
  if (inputEl) inputEl.value = '';
  clearImageAttachment();

  try {
    // 5. 打包 POST 資料（整合 Drive RAG 檢索參數）
    const requestPayload = {
      action: 'askGemini',
      prompt: questionText,
      grade: context.grade,
      subject: context.subject,
      classGroup: context.classGroup,
      topic: context.topic,
      image: currentImage ? { data: currentImage.split(',')[1], mimeType: currentMime } : null
    };

    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(requestPayload)
    });

    const result = await response.json();

    // 6. 移除思考中動畫
    const thinkingEl = document.getElementById(thinkingId);
    if (thinkingEl) thinkingEl.remove();

    if (result && result.status === 'success') {
      appendAiAnswerBubble(result.answer, result.citedFiles || []);
    } else {
      appendAiAnswerBubble(`⚠️ **解答生成時發生狀況**：\n${result.error || '伺服器未能回傳內容，請稍後重試。'}`);
    }

  } catch (err) {
    console.error('[GeminiEngine] 連線異常:', err);
    const thinkingEl = document.getElementById(thinkingId);
    if (thinkingEl) thinkingEl.remove();
    appendAiAnswerBubble(`⚠️ **通訊中斷**：無法連接至 Google 雲端學習支援引擎。請檢查網絡連線或 Google Apps Script 部署狀態。\n\`${err.message}\``);
  } finally {
    GeminiEngineState.isProcessing = false;
  }
}

/**
 * 9. DOM 元素自動嗅探器（相容不同版本的 HTML 結構）
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

/**
 * 10. 相機與相片上傳處理
 */
function setupCameraAndUpload() {
  let fileInput = document.getElementById('cys-hidden-file-input');
  if (!fileInput) {
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'cys-hidden-file-input';
    fileInput.accept = 'image/*';
    fileInput.capture = 'environment'; // 在手機/平板上優先開啟後置鏡頭
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    fileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(event) {
        GeminiEngineState.attachedImageBase64 = event.target.result;
        GeminiEngineState.attachedImageMime = file.type;
        showToast('📷 已成功選取相片！請輸入問題後點擊「提問」。');
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

/**
 * 渲染輸入框上方的相片預覽縮圖
 */
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
      <span class="text-xs text-red-800 font-medium">相片已就緒 (發問時將連同講義一併分析)</span>
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

/**
 * 11. 輔助函式：Toast、複製、學力成長與轉義
 */
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
  } catch (e) {
    // 忽略雷達圖更新異常
  }
}

function escapeHtml(string) {
  const entityMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(string).replace(/[&<>"']/g, s => entityMap[s]);
}

/**
 * 12. 初始化事件監聽與自動綁定
 */
function initGeminiEngine() {
  // 1. 綁定提問按鈕
  const submitBtn = findSubmitButton();
  if (submitBtn) {
    submitBtn.onclick = (e) => {
      e.preventDefault();
      askQuestion();
    };
  }

  // 2. 綁定 Enter 鍵發送
  const inputEl = findQuestionInput();
  if (inputEl) {
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        askQuestion();
      }
    });
  }

  // 3. 綁定拍照與相片上傳
  setupCameraAndUpload();

  // 4. 清理外部誤生成的舊回答殘留容器
  const legacyExternalCards = document.querySelectorAll('body > div:has(.text-red-900), #externalAiBox');
  legacyExternalCards.forEach(el => {
    if (!el.closest(getUpperChatArea().tagName)) el.style.display = 'none';
  });

  console.log('✅ CYS Gemini Engine (RAG Integrated) 已成功初始化完畢。');
}

// 頁面載入完成後啟動
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGeminiEngine);
} else {
  initGeminiEngine();
}

// 導出全域函式供 HTML 行內直接呼叫
window.askQuestion = askQuestion;
window.clearImageAttachment = clearImageAttachment;
window.copyAnswerToClipboard = copyAnswerToClipboard;
