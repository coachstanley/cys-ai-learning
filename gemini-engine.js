/**
 * ==============================================================================
 * 明愛元朗陳震夏中學 (CYS) - 24/7 智能學習支援系統
 * 前端核心模組: gemini-engine.js (上方聊天框架專用整合版)
 * 
 * 核心升級：
 * 1. 嚴格鎖定上方對話卡片框架，所有提問與解答 100% 顯示於上方視窗內
 * 2. 支援動態平滑捲動，解答產生時自動滾動至可視區域
 * 3. 內建自適應按鈕掛載器（免配對 ID，自動識別提問按鈕與輸入框）
 * 4. 完美支援 Gemini 2.5 Flash / Flash-Latest，排版清晰對齊校本需求
 * ==============================================================================
 */

const GeminiEngine = (function () {
  'use strict';

  let isRequestPending = false;
  let attachedImagePayload = null;

  /**
   * 取得 GAS 後端生產環境網址
   */
  function getBackendUrl() {
    if (typeof CONFIG !== 'undefined' && CONFIG.GAS_API_URL) {
      return CONFIG.GAS_API_URL;
    }
    return 'https://script.google.com/macros/s/AKfycbx8PZ9v0Eze0M1ALXZmk1X6cLMZejgdJKSnFWHaY7Gbh2gyHbzX6hKMcjvesF-lNE4sxw/exec';
  }

  /**
   * 輕量級 Markdown 解析器
   */
  function parseMarkdown(mdText) {
    if (!mdText) return '';
    return mdText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/^### (.*$)/gim, '<h3 class="text-sm font-bold text-red-900 mt-3 mb-1 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-red-700"></span>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-base font-bold text-red-900 mt-4 mb-2 pb-1 border-b border-gray-100">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-lg font-black text-gray-900 mt-4 mb-2">$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-gray-900 font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em class="text-gray-700 italic">$1</em>')
      .replace(/```([\s\S]*?)```/gim, '<pre class="bg-gray-900 text-emerald-400 p-3 rounded-xl text-xs my-2.5 overflow-x-auto font-mono"><code>$1</code></pre>')
      .replace(/`([^`]+)`/gim, '<code class="bg-red-50 text-red-700 px-1.5 py-0.5 rounded text-xs font-mono font-semibold">$1</code>')
      .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-red-600 bg-red-50/50 pl-3 py-1.5 my-2 text-gray-800 rounded-r text-xs leading-relaxed">$1</blockquote>')
      .replace(/^---$/gim, '<hr class="my-3 border-gray-200"/>')
      .replace(/^\s*[\*\-]\s+(.*$)/gim, '<li class="ml-4 list-disc text-gray-700 my-0.5 text-xs sm:text-sm">$1</li>')
      .replace(/^\s*(\d+)\.\s+(.*$)/gim, '<li class="ml-4 list-decimal text-gray-700 my-0.5 text-xs sm:text-sm">$2</li>')
      .replace(/\n\n+/g, '<div class="h-2"></div>')
      .replace(/\n/g, '<br/>');
  }

  /**
   * 圖片轉 Base64
   */
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve({
        data: reader.result.split(',')[1],
        mimeType: file.type
      });
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  /**
   * 發送發問請求至 GAS
   */
  async function askQuestion(params) {
    const {
      prompt,
      subject = '創新科技',
      grade = 'S1',
      classGroup = 'ACD',
      topic = '常規課程',
      imagePayload = null
    } = params;

    if (isRequestPending) {
      throw new Error('AI 助教正在用心為您思考上一道題目，請稍候片刻...');
    }

    isRequestPending = true;

    try {
      const payload = {
        action: 'askGemini',
        prompt: prompt || '請詳細解答附件圖片中的課業題目，並給予清晰的步驟引導。',
        subject: subject,
        grade: grade,
        classGroup: classGroup,
        topic: topic,
        image: imagePayload,
        clientTimestamp: new Date().toISOString()
      };

      const backendUrl = getBackendUrl();
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`伺服器連線異常 (HTTP ${response.status})`);
      }

      const result = await response.json();
      if (result.status === 'success' && result.answer) {
        triggerRadarGrowth(subject);
        return {
          rawText: result.answer,
          htmlText: parseMarkdown(result.answer),
          modelUsed: result.modelUsed || 'Gemini 2.5 Flash'
        };
      } else {
        throw new Error(result.error || 'AI 助教暫時未能生成完整解答。');
      }
    } finally {
      isRequestPending = false;
    }
  }

  /**
   * 觸發雷達圖學力點數增長
   */
  function triggerRadarGrowth(subjectName) {
    try {
      if (typeof window.updateKLAProgress === 'function') {
        window.updateKLAProgress(subjectName);
      } else if (typeof window.triggerRadarUpdate === 'function') {
        window.triggerRadarUpdate(subjectName);
      }
    } catch (e) {
      console.warn('[GeminiEngine] 雷達圖更新通知失敗:', e);
    }
  }

  /**
   * 精確尋找「上方框架」中的訊息容器
   */
  function getUpperChatArea() {
    // 1. 尋找歡迎訊息節點（上方框架的核心標誌）
    const allDivs = Array.from(document.querySelectorAll('div, p'));
    const greetingTextNode = allDivs.find(el => 
      el.innerText && el.innerText.includes('我是陳震夏中學 24 小時學習助理')
    );

    if (greetingTextNode) {
      // 找到該歡迎氣泡所屬的列表容器
      let container = greetingTextNode.closest('.space-y-4, .space-y-3, .overflow-y-auto');
      if (!container) {
        // 若無特定 class，取氣泡卡片的父層容器
        const welcomeBubbleCard = greetingTextNode.closest('.bg-white, .border, .rounded-xl, .rounded-2xl') || greetingTextNode.parentElement;
        container = welcomeBubbleCard.parentElement;
      }
      if (container) return container;
    }

    // 2. 備用定位：從提問按鈕向上尋找主框架
    const sendBtn = findSendButton();
    if (sendBtn) {
      const inputRow = sendBtn.closest('.flex, form, div');
      const upperCard = inputRow ? inputRow.parentElement : null;
      if (upperCard) {
        // 尋找 inputRow 同層上方的訊息區域
        let msgBox = upperCard.querySelector('.overflow-y-auto, [id*="chat"], [id*="message"]');
        if (msgBox && msgBox !== inputRow) return msgBox;
      }
    }

    // 3. 一般常規 ID 查詢（但排除獨立於卡片下方的 aiResponseArea）
    const candidate = document.getElementById('chatMessagesContainer') || 
                      document.getElementById('chatMessages') ||
                      document.getElementById('chatHistory');
    if (candidate) return candidate;

    return null;
  }

  /**
   * 捲動上方容器至最底
   */
  function scrollToBottom(container, targetElement) {
    if (!container) return;
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
      if (targetElement && typeof targetElement.scrollIntoView === 'function') {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 50);
  }

  /**
   * 在上方框架中呈現學生提問氣泡
   */
  function appendUserBubble(container, text, hasImage = false) {
    const bubble = document.createElement('div');
    bubble.className = 'flex justify-end my-3 w-full';
    bubble.innerHTML = `
      <div class="bg-red-800 text-white rounded-2xl rounded-tr-none px-4 py-2.5 max-w-[85%] sm:max-w-[75%] shadow-sm text-sm">
        ${hasImage ? '<div class="text-xs text-red-200 mb-1 flex items-center gap-1">📷 已夾帶課業相片</div>' : ''}
        <div class="leading-relaxed whitespace-pre-wrap">${text || '(發送相片進行解析)'}</div>
      </div>
    `;
    container.appendChild(bubble);
    scrollToBottom(container, bubble);
  }

  /**
   * 在上方框架中呈現 AI 思考中指示氣泡
   */
  function appendLoadingBubble(container) {
    const bubble = document.createElement('div');
    bubble.id = 'gemini-loading-bubble';
    bubble.className = 'flex justify-start my-3 w-full';
    bubble.innerHTML = `
      <div class="bg-gray-50 border border-gray-200 text-gray-600 rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm text-xs sm:text-sm flex items-center gap-2.5">
        <svg class="animate-spin h-4 w-4 text-red-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <span>CYS 學習助理正在分析課題重點與組織解答...</span>
      </div>
    `;
    container.appendChild(bubble);
    scrollToBottom(container, bubble);
    return bubble;
  }

  /**
   * 在上方框架中呈現 AI 正式解答氣泡
   */
  function appendAiResponseBubble(container, answerHtml) {
    const bubble = document.createElement('div');
    bubble.className = 'flex justify-start my-3 w-full';
    bubble.innerHTML = `
      <div class="flex items-start gap-2.5 max-w-[95%] sm:max-w-[90%] w-full">
        <!-- 助教頭像圖示 -->
        <div class="w-8 h-8 rounded-full bg-red-800 text-white flex-shrink-0 flex items-center justify-center text-xs shadow-sm mt-1">
          🤖
        </div>
        <!-- 解答主卡片 -->
        <div class="bg-white border border-gray-200 rounded-2xl rounded-tl-none p-4 shadow-sm flex-1 text-gray-800 text-sm">
          <div class="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 text-xs text-red-800 font-semibold">
            <span class="flex items-center gap-1.5">
              <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              CYS 智能學習助教 (Gemini 2.5 Flash)
            </span>
            <button type="button" class="text-gray-400 hover:text-red-700 transition" onclick="GeminiEngine.copyContent(this)">
              複製解答
            </button>
          </div>
          <div class="gemini-content leading-relaxed space-y-2">
            ${answerHtml}
          </div>
        </div>
      </div>
    `;
    container.appendChild(bubble);
    scrollToBottom(container, bubble);
  }

  /**
   * 在上方框架中呈現提示氣泡
   */
  function appendErrorBubble(container, errorText) {
    const bubble = document.createElement('div');
    bubble.className = 'flex justify-start my-3 w-full';
    bubble.innerHTML = `
      <div class="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-4 py-2.5 text-xs leading-relaxed max-w-[90%]">
        <strong>⚠️ 提問提示：</strong>${errorText}
      </div>
    `;
    container.appendChild(bubble);
    scrollToBottom(container, bubble);
  }

  /**
   * 尋找「提問」按鈕輔助函式
   */
  function findSendButton() {
    let btn = document.getElementById('btnAskAI') || 
              document.getElementById('sendQuestionBtn') ||
              document.getElementById('btnSubmit');
    if (!btn) {
      const allButtons = Array.from(document.querySelectorAll('button'));
      btn = allButtons.find(b => b.innerText && b.innerText.includes('提問'));
    }
    return btn;
  }

  /**
   * 複製解答內容
   */
  function copyContent(btn) {
    const card = btn.closest('.border-gray-200') || btn.closest('.bg-white');
    if (!card) return;
    const content = card.querySelector('.gemini-content');
    if (!content) return;
    navigator.clipboard.writeText(content.innerText || content.textContent).then(() => {
      const orig = btn.innerText;
      btn.innerText = '✓ 已複製';
      setTimeout(() => btn.innerText = orig, 2000);
    });
  }

  /**
   * 核心自動掛載器：定位元件並綁定事件
   */
  function initAutoBinding() {
    const sendBtn = findSendButton();
    if (!sendBtn) return;

    // 尋找輸入框
    let textInput = document.getElementById('userQuestionInput') ||
                    document.getElementById('aiQuestionInput') ||
                    document.getElementById('questionInput');

    if (!textInput) {
      const parentForm = sendBtn.closest('div') || sendBtn.parentElement;
      textInput = parentForm ? parentForm.querySelector('input[type="text"], textarea') : null;
    }
    if (!textInput) {
      textInput = document.querySelector('input[placeholder*="甚麼是"], input[placeholder*="電腦網絡"], input[placeholder*="輸入"]');
    }

    if (!textInput) return;

    // 隱藏下方舊版的獨立回應區（若存在）
    const lowerArea = document.getElementById('aiResponseArea');
    if (lowerArea && lowerArea.parentElement) {
      lowerArea.style.display = 'none';
    }

    // 避免重複綁定監聽器
    if (sendBtn.dataset.geminiFramedBound === 'true') return;
    sendBtn.dataset.geminiFramedBound = 'true';

    console.log('[GeminiEngine] ✅ 已成功將提問系統綁定至上方對話框架！');

    // 建立隱藏的拍照/相片上傳節點
    let hiddenFileInput = document.getElementById('gemini-auto-file-input');
    if (!hiddenFileInput) {
      hiddenFileInput = document.createElement('input');
      hiddenFileInput.type = 'file';
      hiddenFileInput.id = 'gemini-auto-file-input';
      hiddenFileInput.accept = 'image/*';
      hiddenFileInput.capture = 'environment';
      hiddenFileInput.style.display = 'none';
      document.body.appendChild(hiddenFileInput);

      hiddenFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          attachedImagePayload = await fileToBase64(file);
          alert('📷 已成功選取相片，請輸入想查詢的問題後點擊「提問」！');
        }
      });
    }

    // 綁定相機按鈕
    const cameraBtn = document.querySelector('button svg path[d*="3 9a2"]')?.closest('button') || 
                      document.getElementById('cameraBtn') ||
                      sendBtn.parentElement.querySelector('button:not(:last-child)');

    if (cameraBtn && cameraBtn !== sendBtn) {
      cameraBtn.onclick = (e) => {
        e.preventDefault();
        hiddenFileInput.click();
      };
    }

    // 發送核心邏輯
    async function triggerSubmit() {
      const question = textInput.value.trim();
      const hasImage = !!attachedImagePayload;

      if (!question && !hasImage) {
        alert('請輸入想查詢的問題，或透過左側相機拍照上傳！');
        textInput.focus();
        return;
      }

      if (isRequestPending) {
        alert('AI 助教正在用心為您思考上一道題目，請稍候片刻...');
        return;
      }

      // 取得上方框架中的對話容器
      const chatContainer = getUpperChatArea();

      // 1. 於上方框架顯示學生提問氣泡
      if (chatContainer) {
        appendUserBubble(chatContainer, question, hasImage);
      }

      // 2. 清空輸入框
      textInput.value = '';

      // 3. 於上方框架顯示加載指示器
      let loadingBubble = null;
      if (chatContainer) {
        loadingBubble = appendLoadingBubble(chatContainer);
      }

      try {
        // 4. 發起 API 請求
        const response = await askQuestion({
          prompt: question,
          subject: document.getElementById('currentSubjectSelect')?.value || '創新科技',
          grade: document.getElementById('currentGradeSelect')?.value || 'S1',
          classGroup: document.getElementById('currentClassSelect')?.value || 'ACD',
          imagePayload: attachedImagePayload
        });

        // 5. 移除加載動畫並於上方框架呈現解答
        if (loadingBubble && loadingBubble.parentNode) {
          loadingBubble.parentNode.removeChild(loadingBubble);
        }

        if (chatContainer) {
          appendAiResponseBubble(chatContainer, response.htmlText);
        }

        // 重設圖片暫存
        attachedImagePayload = null;
        hiddenFileInput.value = '';

      } catch (err) {
        if (loadingBubble && loadingBubble.parentNode) {
          loadingBubble.parentNode.removeChild(loadingBubble);
        }
        if (chatContainer) {
          appendErrorBubble(chatContainer, err.message || '連線逾時，請重試。');
        } else {
          alert('提問失敗: ' + err.message);
        }
      }
    }

    // 綁定按鈕點擊
    sendBtn.onclick = function (e) {
      e.preventDefault();
      triggerSubmit();
    };

    // 綁定 Enter 鍵送出
    textInput.onkeydown = function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        triggerSubmit();
      }
    };
  }

  // 頁面載入後自動執行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoBinding);
  } else {
    setTimeout(initAutoBinding, 300);
  }

  // 定時檢測（應對單頁面 SPA 切換）
  setInterval(initAutoBinding, 1500);

  return {
    askQuestion: askQuestion,
    parseMarkdown: parseMarkdown,
    copyContent: copyContent,
    isBusy: () => isRequestPending
  };

})();

window.GeminiEngine = GeminiEngine;
