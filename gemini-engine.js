/**
 * gemini-engine.js - 串接 Google Gemini API 生成啟發式三層解答
 */

let currentAttachedImageBase64 = null;

// 相機/圖片上載處理
function handleImageAttach(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    currentAttachedImageBase64 = e.target.result;
    const previewContainer = document.getElementById('imagePreviewContainer');
    const previewImg = document.getElementById('imagePreview');
    if (previewContainer && previewImg) {
      previewImg.src = currentAttachedImageBase64;
      previewContainer.classList.remove('hidden');
    }
  };
  reader.readAsDataURL(file);
}

function clearAttachedImage() {
  currentAttachedImageBase64 = null;
  const previewContainer = document.getElementById('imagePreviewContainer');
  const fileInput = document.getElementById('cameraInput');
  if (previewContainer) previewContainer.classList.add('hidden');
  if (fileInput) fileInput.value = '';
}

// 學生提交提問
async function submitStudentQuestion() {
  const inputEl = document.getElementById('studentQuestionInput');
  const chatBox = document.getElementById('aiChatBox');
  if (!inputEl || !chatBox) return;

  const question = inputEl.value.trim();
  if (!question && !currentAttachedImageBase64) return;

  const subjectCode = document.getElementById('studentSubjectSelect')?.value || '綜合學科';
  const checkedTopics = Array.from(document.querySelectorAll('input[name="activeTopic"]:checked')).map(el => el.value);
  const activeTopic = checkedTopics.join('、') || '日常自學探究';

  // 1. 渲染學生訊息
  appendUserChatMessage(question, currentAttachedImageBase64);
  inputEl.value = '';
  const attachedImg = currentAttachedImageBase64;
  clearAttachedImage();

  // 2. 顯示思考中動畫
  const loadingId = 'ai-loading-' + Date.now();
  appendLoadingMessage(loadingId);

  // 3. 調用 Gemini 後端
  try {
    const payload = {
      action: 'askGemini',
      prompt: question,
      subject: subjectCode,
      topic: activeTopic,
      image: attachedImg
    };

    const response = await fetch(window.APP_CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    removeLoadingMessage(loadingId);

    if (result.status === 'success' && result.reply) {
      appendAiChatMessage(result.reply);
    } else {
      appendFallbackAiMessage(question, subjectCode, activeTopic);
    }
  } catch (err) {
    removeLoadingMessage(loadingId);
    appendFallbackAiMessage(question, subjectCode, activeTopic);
  }

  // 4. 動態累進八大學力雷達圖
  if (typeof incrementSubjectKlaScore === 'function') {
    incrementSubjectKlaScore(subjectCode);
  }
}

function appendUserChatMessage(text, imgBase64) {
  const chatBox = document.getElementById('aiChatBox');
  const div = document.createElement('div');
  div.className = 'flex items-start gap-2.5 justify-end';
  
  let imgHtml = imgBase64 ? `<img src="${imgBase64}" class="max-w-[200px] rounded-lg mb-2 border border-red-200">` : '';

  div.innerHTML = `
    <div class="bg-cys-red text-white p-3 rounded-lg rounded-tr-none text-xs leading-relaxed max-w-[85%] shadow-sm">
      ${imgHtml}
      <div>${text || '請解析此圖片題目'}</div>
    </div>
  `;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function appendLoadingMessage(id) {
  const chatBox = document.getElementById('aiChatBox');
  const div = document.createElement('div');
  div.id = id;
  div.className = 'flex items-start gap-2.5';
  div.innerHTML = `
    <div class="w-7 h-7 bg-cys-red text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 shadow">
      <i class="fa-solid fa-sparkles fa-spin"></i>
    </div>
    <div class="bg-slate-50 p-3 rounded-lg rounded-tl-none border border-gray-200 text-xs text-gray-500 leading-relaxed">
      Gemini 正在結合教材與題目進行三層深度解析...
    </div>
  `;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function removeLoadingMessage(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function appendAiChatMessage(replyText) {
  const chatBox = document.getElementById('aiChatBox');
  const div = document.createElement('div');
  div.className = 'flex items-start gap-2.5';

  div.innerHTML = `
    <div class="w-7 h-7 bg-cys-red text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 shadow">
      <i class="fa-solid fa-robot"></i>
    </div>
    <div class="bg-white p-4 rounded-xl rounded-tl-none border border-gray-200 text-xs text-gray-800 leading-relaxed max-w-[90%] shadow-sm space-y-2">
      ${formatAiReply(replyText)}
    </div>
  `;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function formatAiReply(text) {
  // 將換行與標籤轉化為清晰排版
  return text
    .replace(/【📌 核心解答】/g, '<div class="font-black text-cys-red text-xs mt-1 mb-0.5 border-b pb-1"><i class="fa-solid fa-lightbulb mr-1 text-amber-500"></i>【📌 核心解答】</div>')
    .replace(/【🌱 延伸性思考】/g, '<div class="font-black text-emerald-700 text-xs mt-2 mb-0.5 border-b pb-1"><i class="fa-solid fa-seedling mr-1"></i>【🌱 延伸性思考】</div>')
    .replace(/【🤔 深度探究挑戰問題】/g, '<div class="font-black text-indigo-700 text-xs mt-2 mb-0.5 border-b pb-1"><i class="fa-solid fa-circle-question mr-1"></i>【🤔 深度探究挑戰問題】</div>')
    .replace(/\n/g, '<br>');
}

function appendFallbackAiMessage(q, sub, top) {
  const fallbackText = `【📌 核心解答】：針對研習【${sub}】課題【${top}】的提問：「${q}」，本核心概念指在特定條件下的規律性機制，通常可由標準定義推導與驗證。\n\n【🌱 延伸性思考】：此原理廣泛應用於現代工業、電腦演算法及環境科技中，能有效提升系統效能。\n\n【🤔 深度探究挑戰問題】：\n1. 若變更其中一項環境變數，該系統輸出會產生何種相應改變？\n2. 試嘗試舉出一個在香港日常生活中體驗該原理的具體例子？`;
  appendAiChatMessage(fallbackText);
}
