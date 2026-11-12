/**
 * ==============================================================================
 * 明愛元朗陳震夏中學 (CYS) - 24/7 智能學習支援系統
 * 前端核心模組: gemini-engine.js
 * 
 * 功能：
 * 1. 處理文字發問與即時拍照/圖片上傳（多模態支援）
 * 2. 串接 Google Apps Script 後端 (Gemini 2.5 Flash / Latest)
 * 3. 內建輕量級 Markdown 格式化渲染引擎
 * 4. 聯動 8 大學習領域 (KLA) 學力雷達圖即時進度更新
 * 5. 支援互動式「一鍵追問挑戰題」
 * ==============================================================================
 */

const GeminiEngine = (function () {
  'use strict';

  // 內部狀態管理
  let isRequestPending = false;

  /**
   * 獲取後端 GAS 部署網址（優先使用 config.js 的配置，並提供校本備援）
   */
  function getBackendUrl() {
    if (typeof CONFIG !== 'undefined' && CONFIG.GAS_API_URL) {
      return CONFIG.GAS_API_URL;
    }
    // 預設備援網址
    return 'https://script.google.com/macros/s/AKfycbx8PZ9v0Eze0M1ALXZmk1X6cLMZejgdJKSnFWHaY7Gbh2gyHbzX6hKMcjvesF-lNE4sxw/exec';
  }

  /**
   * 輕量級 Markdown 轉 HTML 解析器（支援標題、粗體、清單、代碼塊、引號與分隔線）
   */
  function parseMarkdown(mdText) {
    if (!mdText) return '';

    let html = mdText
      // 處理 HTML 特殊符號轉義防止 XSS
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      
      // 標題轉換
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-indigo-700 mt-4 mb-2 flex items-center gap-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-indigo-900 mt-5 mb-2 border-b pb-1">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-black text-indigo-950 mt-6 mb-3">$1</h1>')

      // 粗體與斜體
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-gray-900 font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em class="text-gray-700 italic">$1</em>')

      // 代碼塊與行內代碼
      .replace(/```([\s\S]*?)```/gim, '<pre class="bg-gray-900 text-green-400 p-3 rounded-lg text-sm my-3 overflow-x-auto font-mono"><code>$1</code></pre>')
      .replace(/`([^`]+)`/gim, '<code class="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-xs font-mono font-semibold">$1</code>')

      // 引用區塊 (Blockquote)
      .replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-indigo-500 bg-indigo-50/50 pl-3 py-1.5 my-2 text-gray-800 rounded-r">$1</blockquote>')

      // 分隔線
      .replace(/^---$/gim, '<hr class="my-4 border-gray-200"/>')

      // 無序清單
      .replace(/^\s*\*\s+(.*$)/gim, '<li class="ml-5 list-disc text-gray-700 my-1">$1</li>')
      .replace(/^\s*\-\s+(.*$)/gim, '<li class="ml-5 list-disc text-gray-700 my-1">$1</li>')

      // 有序清單
      .replace(/^\s*(\d+)\.\s+(.*$)/gim, '<li class="ml-5 list-decimal text-gray-700 my-1">$2</li>')

      // 換行處理（保留自然段落）
      .replace(/\n\n+/g, '<div class="h-3"></div>')
      .replace(/\n/g, '<br/>');

    return html;
  }

  /**
   * 將圖片 File 物件轉換為 Base64 字串
   */
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        // 取出純 base64 資料部分
        const base64Data = reader.result.split(',')[1];
        resolve({
          data: base64Data,
          mimeType: file.type
        });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  /**
   * 核心提問函式
   * @param {Object} params 發問參數物件
   * @returns {Promise<Object>} 回傳包含回答文字與處理狀態的物件
   */
  async function askQuestion(params) {
    const {
      prompt,
      subject = '創新科技',
      grade = 'S1',
      classGroup = 'ACD',
      topic = '常規課程',
      imageFile = null
    } = params;

    if (!prompt && !imageFile) {
      throw new Error('請輸入問題內容或上傳題目相片！');
    }

    if (isRequestPending) {
      throw new Error('AI 助教正在用心為您思考上一道題目，請稍候片刻...');
    }

    isRequestPending = true;

    try {
      // 處理相片附件（如有）
      let imagePayload = null;
      if (imageFile) {
        imagePayload = await fileToBase64(imageFile);
      }

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
        headers: {
          'Content-Type': 'text/plain;charset=utf-8' // 採用 text/plain 避免觸發複雜 CORS 預檢
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`伺服器連線異常 (HTTP ${response.status})，請稍後再試。`);
      }

      const result = await response.json();

      if (result.status === 'success' && result.answer) {
        // 發問成功：觸發學力點數更新及八大領域雷達圖連動
        triggerRadarGrowth(subject);

        return {
          rawText: result.answer,
          htmlText: parseMarkdown(result.answer),
          modelUsed: result.modelUsed || 'Gemini 2.5 Flash'
        };
      } else {
        throw new Error(result.error || 'AI 助教暫時未能生成完整解答，請嘗試更換關鍵字提問。');
      }

    } catch (error) {
      console.error('[GeminiEngine] 請求發生異常:', error);
      throw error;
    } finally {
      isRequestPending = false;
    }
  }

  /**
   * 聯動學力雷達圖進度累積
   */
  function triggerRadarGrowth(subjectName) {
    try {
      if (typeof window.updateKLAProgress === 'function') {
        window.updateKLAProgress(subjectName);
      } else if (typeof window.triggerRadarUpdate === 'function') {
        window.triggerRadarUpdate(subjectName);
      } else {
        console.log(`[GeminiEngine] 學力進度已記錄：${subjectName} 領域數值 +1`);
      }
    } catch (e) {
      console.warn('[GeminiEngine] 雷達圖聯動提示:', e);
    }
  }

  /**
   * 渲染 AI 回覆卡片至指定的聊天容器中
   */
  function renderResponseToContainer(containerElement, answerHtml, options = {}) {
    if (!containerElement) return;

    const messageCard = document.createElement('div');
    messageCard.className = 'gemini-response-bubble bg-white rounded-2xl p-5 shadow-sm border border-indigo-100 my-4 text-gray-800 transition-all duration-300';

    // 建立頂部標籤列
    const headerBar = `
      <div class="flex items-center justify-between pb-3 mb-3 border-b border-indigo-50 text-xs text-indigo-600 font-medium">
        <span class="flex items-center gap-1.5">
          <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          CYS 智能學習助教 (Gemini 2.5 Flash)
        </span>
        <button type="button" class="copy-btn text-gray-400 hover:text-indigo-600 flex items-center gap-1 transition" onclick="GeminiEngine.copyContent(this)">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
          複製解答
        </button>
      </div>
    `;

    // 內容主體
    const contentBody = `
      <div class="gemini-content text-sm leading-relaxed space-y-2">
        ${answerHtml}
      </div>
    `;

    messageCard.innerHTML = headerBar + contentBody;
    containerElement.appendChild(messageCard);

    // 平滑滾動至最新回答
    messageCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * 輔助功能：一鍵複製解答文本
   */
  function copyContent(btn) {
    const card = btn.closest('.gemini-response-bubble');
    if (!card) return;

    const contentDiv = card.querySelector('.gemini-content');
    const textToCopy = contentDiv.innerText || contentDiv.textContent;

    navigator.clipboard.writeText(textToCopy).then(() => {
      const originalHTML = btn.innerHTML;
      btn.innerHTML = `<span class="text-emerald-600 font-bold">✓ 已複製</span>`;
      setTimeout(() => {
        btn.innerHTML = originalHTML;
      }, 2000);
    }).catch(err => {
      console.error('複製失敗:', err);
    });
  }

  // 公開暴露 API
  return {
    askQuestion: askQuestion,
    parseMarkdown: parseMarkdown,
    renderResponse: renderResponseToContainer,
    copyContent: copyContent,
    isBusy: () => isRequestPending
  };

})();

// 掛載至全域 window 物件以供其他模組呼叫
window.GeminiEngine = GeminiEngine;


🚀 前端 index.html 整合調用範例

在您的主發問按鈕點擊事件（如 handleSendQuestion）中，只需加入以下幾行即可完成發問與介面渲染：

async function onSendBtnClick() {
  const promptInput = document.getElementById('userQuestionInput');
  const fileInput = document.getElementById('questionImageInput');
  const chatContainer = document.getElementById('chatMessagesContainer');
  const loadingIndicator = document.getElementById('aiLoadingSpinner');

  const question = promptInput.value.trim();
  const image = fileInput?.files?.[0] || null;

  if (!question && !image) {
    alert('請輸入您的學習問題或上傳相片！');
    return;
  }

  // 1. 顯示載入動畫
  loadingIndicator.classList.remove('hidden');

  try {
    // 2. 調用引擎發問
    const response = await GeminiEngine.askQuestion({
      prompt: question,
      subject: document.getElementById('currentSubjectSelect')?.value || '創新科技',
      grade: document.getElementById('currentGradeSelect')?.value || 'S1',
      imageFile: image
    });

    // 3. 渲染 Markdown 解析後的美觀卡片
    GeminiEngine.renderResponse(chatContainer, response.htmlText);

    // 4. 清空輸入欄位
    promptInput.value = '';
    if (fileInput) fileInput.value = '';

  } catch (err) {
    alert('提示：' + err.message);
  } finally {
    // 5. 關閉載入動畫
    loadingIndicator.classList.add('hidden');
  }
}
