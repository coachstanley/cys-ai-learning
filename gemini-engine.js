/**
 * ==============================================================================
 * 明愛元朗陳震夏中學 (CYS) - 24/7 智能學習支援系統
 * 前端核心模組: gemini-engine.js (萬能自適應修復版)
 * 
 * 核心特點：
 * 1. 內建自動掃描綁定機制（免配對 ID，自動抓取「提問」按鈕與輸入框）
 * 2. 點擊立即渲染「學生氣泡」與「思考中加載指示器」，拒絕無反應
 * 3. 完整對接 Google Cloud Gemini 2.5 Flash / Flash-Latest 後端
 * 4. 支援拍照發問、Markdown 即時排版與 8 大學習領域學力增長連動
 * ==============================================================================
 */

const GeminiEngine = (function () {
  'use strict';

  let isRequestPending = false;
  let attachedImagePayload = null; // 暫存待傳送的圖片

  /**
   * 取得 GAS 後端網址
   */
  function getBackendUrl() {
    if (typeof CONFIG !== 'undefined' && CONFIG.GAS_API_URL) {
      return CONFIG.GAS_API_URL;
    }
    return 'https://script.google.com/macros/s/AKfycbx8PZ9v0Eze0M1ALXZmk1X6cLMZejgdJKSnFWHaY7Gbh2gyHbzX6hKMcjvesF-lNE4sxw/exec';
  }

  /**
   * 輕量級 Markdown 解析為 HTML
   */
  function parseMarkdown(mdText) {
    if (!mdText) return '';
    return mdText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/^### (.*$)/gim, '<h3 class="text-base font-bold text-red-800 mt-3 mb-1.5 flex items-center gap-1.5">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-red-900 mt-4 mb-2 border-b pb-1">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-xl font-black text-gray-900 mt-5 mb-2">$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-gray-900 font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em class="text-gray-700 italic">$1</em>')
      .replace(/```([\s\S]*?)```/gim, '<pre class="bg-gray-900 text-emerald-400 p-3 rounded-xl text-xs my-2.5 overflow-x-auto font-mono"><code>$1</code></pre>')
      .replace(/`([^`]+)`/gim, '<code class="bg-red-50 text-red-700 px-1.5 py-0.5 rounded text-xs font-mono font-semibold">$1</code>')
      .replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-red-500 bg-red-50/40 pl-3 py-1.5 my-2 text-gray-800 rounded-r text-xs leading-relaxed">$1</blockquote>')
      .replace(/^---$/gim, '<hr class="my-3 border-gray-200"/>')
      .replace(/^\s*[\*\-]\s+(.*$)/gim, '<li class="ml-4 list-disc text-gray-700 my-0.5">$1</li>')
      .replace(/^\s*(\d+)\.\s+(.*$)/gim, '<li class="ml-4 list-decimal text-gray-700 my-0.5">$2</li>')
      .replace(/\n\n+/g, '<div class="h-2"></div>')
      .replace(/\n/g, '<br/>');
  }

  /**
   * 將 File 物件轉為 Base64
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
   * 在對話容器中渲染學生提問氣泡
   */
  function appendUserBubble(container, text, hasImage = false) {
    const bubble = document.createElement('div');
    bubble.className = 'flex justify-end my-3';
    bubble.innerHTML = `
      <div class="bg-red-800 text-white rounded-2xl rounded-tr-none px-4 py-2.5 max-w-[85%] sm:max-w-[70%] shadow-sm text-sm">
        ${hasImage ? '<div class="text-xs text-red-200 mb-1 flex items-center gap-1">📷 已夾帶課業相片</div>' : ''}
        <div class="leading-relaxed whitespace-pre-wrap">${text || '(發送相片進行解析)'}</div>
      </div>
    `;
    container.appendChild(bubble);
    bubble.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * 在對話容器中渲染 AI 思考中指示氣泡
   */
  function appendLoadingBubble(container) {
    const bubble = document.createElement('div');
    bubble.id = 'gemini-loading-bubble';
    bubble.className = 'flex justify-start my-3';
    bubble.innerHTML = `
      <div class="bg-gray-50 border border-gray-200 text-gray-600 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm text-sm flex items-center gap-3">
        <svg class="animate-spin h-4 w-4 text-red-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <span>陳震夏中學 AI 助教正在分析教材與組織解答...</span>
      </div>
    `;
    container.appendChild(bubble);
    bubble.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return bubble;
  }

  /**
   * 在對話容器中渲染 AI 正式解答氣泡
   */
  function appendAiResponseBubble(container, answerHtml) {
    const bubble = document.createElement('div');
    bubble.className = 'flex justify-start my-4 w-full';
    bubble.innerHTML = `
      <div class="bg-white border border-red-100 rounded-2xl rounded-tl-none p-4 shadow-sm w-full text-gray-800 text-sm">
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
    `;
    container.appendChild(bubble);
    bubble.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * 在對話容器中渲染錯誤氣泡
   */
  function appendErrorBubble(container, errorText) {
    const bubble = document.createElement('div');
    bubble.className = 'flex justify-start my-3';
    bubble.innerHTML = `
      <div class="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-4 py-3 text-xs leading-relaxed">
        <strong>⚠️ 提問提示：</strong>${errorText}
      </div>
    `;
    container.appendChild(bubble);
    bubble.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * 複製解答內容
   */
  function copyContent(btn) {
    const card = btn.closest('.border-red-100');
    if (!card) return;
    const content = card.querySelector('.gemini-content');
    navigator.clipboard.writeText(content.innerText || content.textContent).then(() => {
      const orig = btn.innerText;
      btn.innerText = '✓ 已複製';
      setTimeout(() => btn.innerText = orig, 2000);
    });
  }

  /**
   * 核心自動掛載器：自動定位輸入框、按鈕與對話容器並完成監聽
   */
  function initAutoBinding() {
    console.log('[GeminiEngine] 正在啟動自適應按鈕掛載器...');

    // 1. 尋找「提問」按鈕：先找包含「提問」文字的按鈕，找不到再找 ID
    let sendBtn = document.getElementById('btnAskAI') || 
                  document.getElementById('sendQuestionBtn') ||
                  document.getElementById('btnSubmit');

    if (!sendBtn) {
      const allButtons = Array.from(document.querySelectorAll('button'));
      sendBtn = allButtons.find(b => b.innerText.includes('提問'));
    }

    // 2. 尋找問題輸入框：先找常見 ID，找不到則找提問按鈕附近的 input
    let textInput = document.getElementById('userQuestionInput') ||
                    document.getElementById('aiQuestionInput') ||
                    document.getElementById('questionInput');

    if (!textInput && sendBtn) {
      const parentForm = sendBtn.closest('div') || sendBtn.parentElement;
      textInput = parentForm ? parentForm.querySelector('input[type="text"], textarea') : null;
    }
    if (!textInput) {
      textInput = document.querySelector('input[placeholder*="電腦網絡"], input[placeholder*="輸入"]');
    }

    // 3. 尋找對話歷史容器
    let chatContainer = document.getElementById('chatMessagesContainer') ||
                         document.getElementById('chatHistory') ||
                         document.getElementById('aiResponseArea');

    if (!chatContainer) {
      // 尋找包含歡迎詞的父層容器
      const welcomeCard = Array.from(document.querySelectorAll('div')).find(el => el.innerText.includes('同學你好！我是陳震夏中學'));
      if (welcomeCard && welcomeCard.parentElement) {
        chatContainer = welcomeCard.parentElement;
      }
    }

    // 4. 尋找相機按鈕與隱藏的 file input
    const cameraBtn = document.querySelector('button svg path[d*="3 9a2"]')?.closest('button') || 
                      document.getElementById('cameraBtn');

    if (!sendBtn || !textInput) {
      console.warn('[GeminiEngine] 尚未找到按鈕或輸入框，將於 DOM 更新後再次重試。');
      return;
    }

    // 避免重複綁定
    if (sendBtn.dataset.geminiBound === 'true') return;
    sendBtn.dataset.geminiBound = 'true';

    console.log('[GeminiEngine] ✅ 成功定位並綁定「提問」按鈕與輸入框！');

    // 建立隱藏的檔案上傳元素（供相機調用）
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

    if (cameraBtn) {
      cameraBtn.onclick = (e) => {
        e.preventDefault();
        hiddenFileInput.click();
      };
    }

    // 統一發送處理邏輯
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

      // 1. 立即於對話區顯示學生的提問
      if (chatContainer) {
        appendUserBubble(chatContainer, question, hasImage);
      }

      // 2. 清空輸入框
      textInput.value = '';

      // 3. 顯示 AI 思考中動畫
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

        // 5. 移除加載中動畫並呈現完整解答
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

    // 綁定鍵盤 Enter 發送
    textInput.onkeydown = function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        triggerSubmit();
      }
    };
  }

  // 頁面載入完成後自動執行綁定
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoBinding);
  } else {
    setTimeout(initAutoBinding, 300);
  }

  // 備用定時器：應對單頁面 (SPA) 視圖動態切換
  setInterval(initAutoBinding, 1500);

  return {
    askQuestion: askQuestion,
    parseMarkdown: parseMarkdown,
    copyContent: copyContent,
    isBusy: () => isRequestPending
  };

})();

window.GeminiEngine = GeminiEngine;
