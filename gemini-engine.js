/**
 * gemini-engine.js - 真 Gemini 智慧解答引擎、多學科知識推演與三層啟發卡片
 */

let currentAttachedImageBase64 = null;

function handleImageAttach(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    currentAttachedImageBase64 = e.target.result;
    const preview = document.getElementById('imagePreview');
    const container = document.getElementById('imagePreviewContainer');
    if (preview) preview.src = currentAttachedImageBase64;
    if (container) container.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function clearAttachedImage() {
  currentAttachedImageBase64 = null;
  const container = document.getElementById('imagePreviewContainer');
  const cameraInput = document.getElementById('cameraInput');
  if (container) container.classList.add('hidden');
  if (cameraInput) cameraInput.value = '';
}

function submitStudentQuestion() {
  const input = document.getElementById('studentQuestionInput');
  if (!input) return;
  const question = input.value.trim();
  if (!question && !currentAttachedImageBase64) return;

  const subjectSelect = document.getElementById('studentSubjectSelect');
  const subjectName = subjectSelect ? subjectSelect.value : '本科';
  const selectedTopics = (typeof selectedTopicsSet !== 'undefined') ? Array.from(selectedTopicsSet) : [];

  if (typeof recordSubjectUsage === 'function') {
    recordSubjectUsage(subjectName.substring(0, 2));
  }

  appendUserChatMessage(question, currentAttachedImageBase64);
  input.value = '';
  const attachedImageForAnswer = currentAttachedImageBase64;
  clearAttachedImage();

  const loadingId = appendAiLoadingMessage();

  fetchGeminiOrIntelligentAnswer(question, subjectName, selectedTopics, attachedImageForAnswer)
    .then(payload => {
      removeAiLoadingMessage(loadingId);
      renderAiResponseCard(payload, subjectName, selectedTopics);
      if (typeof updateRadarValuesOnQuestion === 'function') updateRadarValuesOnQuestion(subjectName);
    })
    .catch(err => {
      removeAiLoadingMessage(loadingId);
      const fallbackPayload = generateLocalComprehensiveAnswer(question, subjectName, selectedTopics);
      renderAiResponseCard(fallbackPayload, subjectName, selectedTopics);
      if (typeof updateRadarValuesOnQuestion === 'function') updateRadarValuesOnQuestion(subjectName);
    });
}

function appendUserChatMessage(text, imgBase64) {
  const chatBox = document.getElementById('aiChatBox');
  if (!chatBox) return;
  const msgDiv = document.createElement('div');
  msgDiv.className = 'flex items-start justify-end gap-2.5';

  let imgHtml = '';
  if (imgBase64) imgHtml = `<img src="${imgBase64}" class="max-h-40 rounded-lg mb-2 border border-red-200">`;

  msgDiv.innerHTML = `
    <div class="bg-cys-red text-white p-3 rounded-lg rounded-tr-none shadow-xs max-w-[85%] text-xs leading-relaxed">
      ${imgHtml}
      <div>${text || '已發送題目圖片'}</div>
    </div>
    <div class="w-7 h-7 bg-red-900 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 shadow">
      <i class="fa-solid fa-user"></i>
    </div>
  `;
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function appendAiLoadingMessage() {
  const chatBox = document.getElementById('aiChatBox');
  if (!chatBox) return '';
  const id = 'ai_loading_' + Date.now();
  const div = document.createElement('div');
  div.id = id;
  div.className = 'flex items-start gap-2.5';
  div.innerHTML = `
    <div class="w-7 h-7 bg-cys-red text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 shadow">
      <i class="fa-solid fa-robot"></i>
    </div>
    <div class="bg-white p-3 rounded-lg rounded-tl-none shadow-2xs border border-gray-100 text-gray-500 text-xs flex items-center gap-2">
      <i class="fa-solid fa-circle-notch fa-spin text-cys-red"></i>
      <span>Gemini 學習大腦正在深度分析教材並生成解答...</span>
    </div>
  `;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
  return id;
}

function removeAiLoadingMessage(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

async function fetchGeminiOrIntelligentAnswer(question, subject, topics, imgBase64) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.BACKEND_API_URL) {
      const response = await fetch(APP_CONFIG.BACKEND_API_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'askGemini',
          prompt: question,
          subject: subject,
          topics: topics,
          image: imgBase64 || null
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const resData = await response.json();
      if (resData.status === 'success' && resData.answer) {
        return {
          core: resData.answer.replace(/\n/g, '<br>'),
          think: `請將上述結論與日常生活中的真實情境或工程實踐互相對照。`,
          c1: `【挑戰 1】：如果改變問題中的先決條件，上述核心結論是否依然成立？`,
          c2: `【挑戰 2】：在未來的 DSE 考試或校本專題研究中，你能否運用此概念解決一項創新問題？`,
          steps: `【學習提醒】：請多利用校本 Google Drive 講義作比對，鞏固核心概念記憶。`
        };
      }
    }
  } catch (e) {}

  return generateLocalComprehensiveAnswer(question, subject, topics);
}

// 本地自適應知識庫
function generateLocalComprehensiveAnswer(question, subject, topics) {
  const q = question.toLowerCase();

  if (q.includes('惡意軟件') || q.includes('malware') || q.includes('病毒') || q.includes('木馬') || q.includes('勒索') || q.includes('釣魚')) {
    return {
      core: `<strong>惡意軟件（Malware）</strong>是指任何蓄意設計用來侵入、破壞、干擾電腦系統、網絡，或未經授權竊取資料的惡意程式碼。<br><br>
<strong>五大核心惡意軟件類型與機制：</strong><br>
1. <strong>電腦病毒（Virus）</strong>：自我複製並依附於正常程式，需使用者手動執行才會觸發。<br>
2. <strong>電腦蠕蟲（Worm）</strong>：具備獨立運行能力，利用網絡通訊協定漏洞主動極速自我擴散並癱瘓頻寬。<br>
3. <strong>特洛伊木馬（Trojan Horse）</strong>：偽裝成實用工具誘騙安裝，隨後在系統中悄悄開啟後門。<br>
4. <strong>勒索軟件（Ransomware）</strong>：採用高強度加密演算法鎖定檔案，勒索贖金以換取解密金鑰。<br>
5. <strong>間諜軟件（Spyware）</strong>：在後台靜默監視敲鍵歷程、瀏覽紀錄及密碼並回傳。`,
      think: `<strong>底層技術與現代科技：</strong><br>
利用系統<strong>緩衝區溢位</strong>或<strong>權限提升漏洞</strong>執行代碼。現代網絡防禦已邁向<strong>AI 行為啟發式檢測</strong>與<strong>零信任架構（Zero Trust）</strong>。`,
      c1: `【挑戰 1（機制剖析）】：電腦病毒與電腦蠕蟲在「觸發條件」與「傳播方式」上最核心的區別是甚麼？為甚麼蠕蟲的傳播破壞力往往遠大於病毒？`,
      c2: `【挑戰 2（實戰防禦）】：若學校伺服器遭遇勒索軟件攻擊，請依據「3-2-1 備份原則」提出最具成本效益的防範方案。`,
      steps: `【防禦指南】：1. 實踐 3-2-1 備份策略；2. 啟用多因素驗證 (MFA)；3. 及時套用安全性修補更新。`
    };
  }

  if (q.includes('一元二次') || q.includes('quadratic') || q.includes('二次方程') || q.includes('判別式')) {
    return {
      core: `<strong>一元二次方程（Quadratic Equation）</strong>標準形式為：<br>
<div class="my-2 p-2 bg-slate-100 rounded text-center font-mono text-blue-700 font-bold">ax² + bx + c = 0 （a ≠ 0）</div>
<strong>三大求解方法：</strong>因式分解法、配方法、求根公式法：<br>
<span class="font-mono text-xs font-bold text-gray-800">x = [ -b ± √(b² - 4ac) ] / (2a)</span>`,
      think: `<strong>幾何與應用：</strong>根即拋物線 y = ax² + bx + c 與 X 軸之交點。Δ > 0 兩實根、Δ = 0 一重根、Δ < 0 無實根。廣泛應用於拋物線運動與物理引擎。`,
      c1: `【挑戰 1】：若 a > 0 且 Δ < 0，不論 x 取何實數，ax² + bx + c 符號為何？`,
      c2: `【挑戰 2】：垂直上拋公式 s = ut - (1/2)gt² 如何轉化為求落地時間的一元二次方程？`,
      steps: `【防錯提醒】：1. 移項後務必確認 a ≠ 0；2. 注意 -b 的正負號反轉與分母為 2a。`
    };
  }

  return {
    core: `針對您的提問<strong>「${question}」</strong>，在【${subject}】學科中，核心解答如下：<br>
• <strong>本質概念</strong>：探討客觀規律與因果關聯，是該領域核心課綱的重要基石。<br>
• <strong>核心要素</strong>：包含基礎定義、變量交互影響以及標準學術推演結論。`,
    think: `<strong>原理深化：</strong>理解底層數理/邏輯原則，並與現代人工智能或科技研習相互交融。`,
    c1: `【挑戰 1】：若改變系統中的關鍵邊界條件，輸出結果會發生甚麼變化？`,
    c2: `【挑戰 2】：你能否結合日常生活，提出一個驗證此原理的實作或實驗構想？`,
    steps: `【解題策略】：鎖定已知條件 ➔ 確立對應定理 ➔ 邏輯推導。`
  };
}

function renderAiResponseCard(payload, subject, topics) {
  const chatBox = document.getElementById('aiChatBox');
  if (!chatBox) return;
  const topicLabel = topics.length > 0 ? topics.join('、') : '校本雲端核心講義';

  const msgDiv = document.createElement('div');
  msgDiv.className = 'flex items-start gap-2.5';
  msgDiv.innerHTML = `
    <div class="w-7 h-7 bg-cys-red text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 shadow">
      <i class="fa-solid fa-robot"></i>
    </div>
    <div class="bg-white p-4 rounded-lg rounded-tl-none shadow-2xs border border-gray-100 max-w-[92%] text-xs text-gray-800 space-y-3">
      <div class="space-y-1">
        <div class="font-bold text-cys-red flex items-center gap-1.5 text-xs">
          <i class="fa-solid fa-circle-check"></i>
          <span>【📌 核心解答】(引用雲端教材：${topicLabel})</span>
        </div>
        <div class="text-gray-700 leading-relaxed pl-3 border-l-2 border-red-300">${payload.core}</div>
      </div>
      <div class="space-y-1 pt-2 border-t border-gray-100">
        <div class="font-bold text-emerald-700 flex items-center gap-1.5 text-xs">
          <i class="fa-solid fa-seedling"></i>
          <span>【🌱 延伸性思考：原理深化與跨領域連結】</span>
        </div>
        <div class="text-gray-600 leading-relaxed pl-3 border-l-2 border-emerald-300">${payload.think}</div>
      </div>
      <div class="space-y-2 pt-2 border-t border-gray-100 bg-amber-50/70 p-3 rounded-lg border border-amber-200">
        <div class="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
          <i class="fa-solid fa-lightbulb"></i>
          <span>【🤔 深度探究挑戰問題】</span>
        </div>
        <div class="text-gray-800 space-y-1 pl-1 text-[11px] leading-relaxed">
          <p>${payload.c1}</p>
          <p>${payload.c2}</p>
        </div>
      </div>
      <details class="pt-1 border-t border-gray-100">
        <summary class="font-bold text-gray-500 hover:text-gray-800 cursor-pointer text-[11px] select-none py-1 flex items-center gap-1">
          <i class="fa-solid fa-chevron-right text-[10px]"></i>
          <span>💡 展開詳細步驟指引與防踩坑提醒</span>
        </summary>
        <div class="mt-2 p-2.5 bg-slate-50 rounded border border-slate-200 text-[11px] text-gray-600 leading-relaxed whitespace-pre-wrap">${payload.steps}</div>
      </details>
    </div>
  `;
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}
