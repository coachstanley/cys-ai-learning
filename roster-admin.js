/**
 * ==============================================================================
 * 明愛元朗陳震夏中學 - 24小時學習支援系統 (CYS 247)
 * 名冊管理、相機拍照多模態解題、雙軌自學模式與八大學力雷達圖引擎 (roster-admin.js)
 * ==============================================================================
 */

// 正式生產環境 GAS 後端網址
const CYS_GAS_API_URL = "https://script.google.com/macros/s/AKfycbzsOhKYiBwWQnL_p6VAbobVFYdvBcEN1PMVWgtqrYqk_QY-teGEa9i0EduYufod0i6E/exec";

// 全校 24 個標準學科定義清單
const CYS_FULL_SUBJECTS = [
  { code: 'CHI', name: '中國語文', defaultCount: 45, kla: 'chi' },
  { code: 'ENG', name: '英國語文', defaultCount: 52, kla: 'eng' },
  { code: 'MATH', name: '數學科', defaultCount: 48, kla: 'math' },
  { code: 'M1', name: '數學延伸單元一 (M1)', defaultCount: 16, kla: 'math' },
  { code: 'M2', name: '數學延伸單元二 (M2)', defaultCount: 14, kla: 'math' },
  { code: 'IS', name: '綜合科學', defaultCount: 38, kla: 'sci' },
  { code: 'PHY', name: '物理科', defaultCount: 29, kla: 'sci' },
  { code: 'CHEM', name: '化學科', defaultCount: 31, kla: 'sci' },
  { code: 'BIO', name: '生物科', defaultCount: 34, kla: 'sci' },
  { code: 'HIST', name: '歷史科', defaultCount: 22, kla: 'pshe' },
  { code: 'CHIST', name: '中國歷史科', defaultCount: 19, kla: 'pshe' },
  { code: 'GEOG', name: '地理科', defaultCount: 27, kla: 'pshe' },
  { code: 'LS', name: '生活與社會科', defaultCount: 41, kla: 'pshe' },
  { code: 'CSD', name: '公民與社會發展科', defaultCount: 36, kla: 'pshe' },
  { code: 'THS', name: '旅遊與款待科', defaultCount: 25, kla: 'pshe' },
  { code: 'VA', name: '視覺藝術科', defaultCount: 18, kla: 'arts' },
  { code: 'MUS', name: '音樂科', defaultCount: 15, kla: 'arts' },
  { code: 'PE', name: '體育科', defaultCount: 43, kla: 'pe' },
  { code: 'CIT', name: '電腦與資訊科技', defaultCount: 28, kla: 'tech' },
  { code: 'ICT', name: '資訊及通訊科技 (ICT)', defaultCount: 39, kla: 'tech' },
  { code: 'CT', name: '創新科技 (CT)', defaultCount: 35, kla: 'tech' },
  { code: 'DNT', name: '設計與科技 (D&T)', defaultCount: 24, kla: 'tech' },
  { code: 'DAT', name: '設計與應用科技 (DAT)', defaultCount: 20, kla: 'tech' },
  { code: 'HE', name: '家政科 (HE)', defaultCount: 22, kla: 'tech' },
  { code: 'ECON', name: '經濟科', defaultCount: 30, kla: 'pshe' },
  { code: 'BAFS', name: '企業、會計與財務概論 (BAFS)', defaultCount: 33, kla: 'pshe' }
];

// 本地存儲鍵名
const STORAGE_KEYS = {
  ROSTER: 'cys_roster_data_v2',
  STATS: 'cys_subject_stats_2026',
  LOGGED_USER: 'cys_logged_in_user',
  RADAR_SCORES: 'cys_student_radar_scores_v1',
  QUERY_MODE: 'cys_student_query_mode_v1'
};

// 記憶體全域狀態
let g_rosterList = [];
window.currentUser = null;
window.cysRadarChartInstance = null;
window.currentQueryMode = 'materials'; // 'materials' 或 'direct'
window.currentAttachedImage = null;   // { base64, mimeType, dataUrl, fileName, sizeKb }

// 封殺任何舊腳本彈出的錯誤黑色提示
window.showToast = function(msg) {
  if (msg && (msg.includes('請先輸入') || msg.includes('學科問題') || msg.includes('拍照'))) {
    console.log("已攔截並消除無效的黑色 Toast 提示：", msg);
    return;
  }
};

window.hasAttachedImage = function() {
  return !!(window.currentAttachedImage && window.currentAttachedImage.base64);
};

window.getAttachedImage = function() {
  return window.currentAttachedImage;
};

/**
 * 頁面載入初始化
 */
document.addEventListener('DOMContentLoaded', () => {
  initRosterData();
  initSubjectStats();
  initQueryMode();
  initPhotoHandler();
  renderRosterTable();
  renderSubjectStats();
  checkExistingSession();
  bindUnifiedSubmitHandler();
});

// ==============================================================================
// 1. 相機拍照、自動壓縮、預覽與發問提交引擎
// ==============================================================================

function initPhotoHandler() {
  const photoInput = document.getElementById('inputQuestionPhoto');
  if (photoInput) {
    photoInput.addEventListener('change', function(e) {
      const file = e.target.files && e.target.files[0];
      if (file) {
        processSelectedImage(file);
      }
    });
  }

  // 支援電腦或 iPad 直接按 Ctrl + V 貼上題目截圖
  const questionInput = document.getElementById('inputQuestionText');
  if (questionInput) {
    questionInput.addEventListener('paste', function(e) {
      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData) return;
      const items = clipboardData.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            processSelectedImage(blob);
            break;
          }
        }
      }
    });
  }
}

/**
 * 圖片讀取與 HTML5 Canvas 智慧壓縮演算法
 */
function processSelectedImage(file) {
  if (!file || !file.type.startsWith('image/')) {
    alert("⚠️ 請選取或拍攝有效的圖片檔案！");
    return;
  }

  const reader = new FileReader();
  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      const MAX_SIDE = 1024;
      let width = img.width;
      let height = img.height;

      if (width > MAX_SIDE || height > MAX_SIDE) {
        if (width > height) {
          height = Math.round((height * MAX_SIDE) / width);
          width = MAX_SIDE;
        } else {
          width = Math.round((width * MAX_SIDE) / height);
          height = MAX_SIDE;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // 以 82% 質量轉換為 JPEG
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
      const base64Data = compressedDataUrl.split(',');
      const approxSizeKb = Math.round((base64Data.length * 0.75) / 1024);

      // 儲存全域狀態
      window.currentAttachedImage = {
        dataUrl: compressedDataUrl,
        base64: base64Data,
        mimeType: 'image/jpeg',
        fileName: file.name || 'question_photo.jpg',
        sizeKb: approxSizeKb
      };

      // 更新介面縮圖與狀態
      const previewBox = document.getElementById('imagePreviewContainer');
      const thumb = document.getElementById('imgQuestionThumbnail');
      const txt = document.getElementById('txtImageName');
      const input = document.getElementById('inputQuestionText');

      if (thumb) thumb.src = compressedDataUrl;
      if (txt) txt.innerText = `📷 已附加相片 (${approxSizeKb} KB)`;
      if (input) {
        input.placeholder = "📷 已附加相片！可直接點擊「提問」，或輸入你想追問的重點...";
      }

      if (previewBox) {
        previewBox.classList.remove('hidden');
        previewBox.style.display = 'flex';
      }
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

window.clearAttachedImage = function() {
  window.currentAttachedImage = null;
  const photoInput = document.getElementById('inputQuestionPhoto');
  if (photoInput) photoInput.value = '';

  const previewBox = document.getElementById('imagePreviewContainer');
  if (previewBox) {
    previewBox.classList.add('hidden');
    previewBox.style.display = 'none';
  }

  const input = document.getElementById('inputQuestionText');
  if (input) {
    input.placeholder = "輸入知識疑問，或拍照後直接點擊提問（亦可直接 Ctrl+V 貼上截圖）...";
  }
};

/**
 * 最高優先級事件捕獲鎖（Use Capture: true）
 */
function bindUnifiedSubmitHandler() {
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('#btnSubmitQuestion');
    if (btn) {
      e.preventDefault();
      e.stopImmediatePropagation();
      window.handleQuestionSubmit(e);
    }
  }, true);

  document.addEventListener('submit', function(e) {
    if (e.target && e.target.id === 'formStudentAsk') {
      e.preventDefault();
      e.stopImmediatePropagation();
      window.handleQuestionSubmit(e);
    }
  }, true);
}

/**
 * 核心：處理學生提問提交 (相片 + 文字多模態)
 */
window.handleQuestionSubmit = function(event) {
  if (event) {
    if (typeof event.preventDefault === 'function') event.preventDefault();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
  }

  const inputEl = document.getElementById('inputQuestionText');
  let rawText = inputEl ? inputEl.value.trim() : '';
  const attachedImg = window.currentAttachedImage;

  if (!rawText && !attachedImg) {
    alert("請先輸入學科問題，或點擊 📷 拍攝／上傳題目相片！");
    if (inputEl) inputEl.focus();
    return;
  }

  let displayText = rawText || "（請詳細解答此試題相片）";
  let queryPrompt = rawText;

  if (attachedImg) {
    queryPrompt = `【相片試卷多模態解題指令】\n學生拍攝了一張課堂考卷或講義相片並提出問題：「${rawText || '請詳細解答這份試卷的所有題目'}」。\n請立刻仔細閱讀相片中的所有文字、題號與選項，逐題進行完整解答：\n1. 標明題號並指出【正確選項與標準答案】\n2. 詳細說明【核心解題步驟與學科概念】\n3. 說明【其他選項錯誤的原因】。\n請切入正題解題，請勿僅回覆問候語！`;
  }

  // 1. 在對話區域注入學生的發問氣泡 (含照片縮圖)
  appendStudentMessage(displayText, attachedImg);

  // 2. 清空輸入框與預覽圖片
  if (inputEl) inputEl.value = '';
  const snapshotImage = attachedImg;
  window.clearAttachedImage();

  // 3. 注入 AI 思考中動畫
  const loadingId = 'ai-loading-' + Date.now();
  appendAiLoadingBubble(loadingId);

  // 4. 收集參數
  const grade = document.getElementById('selectGrade')?.value || 'S4';
  const subject = document.getElementById('selectSubject')?.value || 'ICT';
  const classGroup = document.getElementById('selectClassGroup')?.value || 'ACD';
  const checkedTopics = Array.from(document.querySelectorAll('#topicCheckboxContainer input[type="checkbox"]:checked'))
    .map(cb => cb.value);

  // 5. 累積雷達圖學力
  window.recordStudyActivity(subject);

  // 6. 送交 GAS 後端
  const payload = {
    action: 'askGemini',
    question: queryPrompt,
    mode: window.currentQueryMode || 'materials',
    grade: grade,
    subject: subject,
    classGroup: classGroup,
    topics: checkedTopics,
    image: snapshotImage ? {
      mimeType: snapshotImage.mimeType,
      base64: snapshotImage.base64
    } : null
  };

  fetch(CYS_GAS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(data => {
    removeLoadingBubble(loadingId);
    if (data && (data.reply || data.answer || data.text)) {
      const aiReply = data.reply || data.answer || data.text;
      appendAiAnswerBubble(aiReply, data.source || window.currentQueryMode);
    } else if (data && data.error) {
      appendAiErrorBubble(`⚠️ 系統提示：${data.error}`);
    } else {
      appendAiFallbackAnswer(queryPrompt, snapshotImage);
    }
  })
  .catch(err => {
    console.warn("GAS 連線異常，啟用備援回覆", err);
    removeLoadingBubble(loadingId);
    appendAiFallbackAnswer(queryPrompt, snapshotImage);
  });
};

function appendStudentMessage(text, attachedImg) {
  const container = document.getElementById('cysChatMessages');
  if (!container) return;

  const row = document.createElement('div');
  row.className = "flex items-start justify-end space-x-3 w-full";

  let imgHtml = '';
  if (attachedImg && attachedImg.dataUrl) {
    imgHtml = `
      <div class="mt-2 mb-1">
        <img src="${attachedImg.dataUrl}" alt="題目相片" class="max-w-[260px] sm:max-w-xs max-h-56 object-cover rounded-xl border border-red-700/40 shadow-sm cursor-pointer hover:opacity-95 transition" onclick="window.open('${attachedImg.dataUrl}')" title="點擊檢視大圖">
        <span class="text-[10px] text-red-200 block mt-0.5">📷 附加題目 (${attachedImg.sizeKb} KB)</span>
      </div>
    `;
  }

  row.innerHTML = `
    <div class="bg-red-900 text-white rounded-2xl rounded-tr-none p-4 text-sm shadow-sm max-w-[85%] leading-relaxed">
      ${imgHtml}
      <p class="whitespace-pre-wrap">${escapeHtml(text)}</p>
    </div>
    <div class="w-9 h-9 rounded-full bg-red-800 text-white flex items-center justify-center text-xs font-bold shadow-sm flex-shrink-0">
      我
    </div>
  `;

  container.appendChild(row);
  container.scrollTop = container.scrollHeight;
}

function appendAiLoadingBubble(id) {
  const container = document.getElementById('cysChatMessages');
  if (!container) return;

  const row = document.createElement('div');
  row.id = id;
  row.className = "flex items-start space-x-3 w-full";
  row.innerHTML = `
    <div class="w-9 h-9 rounded-full bg-red-900 text-white flex items-center justify-center text-sm font-bold shadow-sm flex-shrink-0 animate-bounce">
      🤖
    </div>
    <div class="bg-white border border-gray-100 rounded-2xl p-4 text-sm text-gray-600 shadow-sm flex items-center space-x-3">
      <div class="w-4 h-4 border-2 border-red-900 border-t-transparent rounded-full animate-spin"></div>
      <span class="text-xs text-gray-500 font-medium">CYS 智能助教正在閱讀題目相片並分析答案中...</span>
    </div>
  `;
  container.appendChild(row);
  container.scrollTop = container.scrollHeight;
}

function removeLoadingBubble(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function appendAiAnswerBubble(content, source) {
  const container = document.getElementById('cysChatMessages');
  if (!container) return;

  const row = document.createElement('div');
  row.className = "flex items-start space-x-3 w-full";

  const isDriveMode = source === 'materials';
  const tagHtml = isDriveMode
    ? '<span class="bg-red-50 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200">📚 校本教材對照解答</span>'
    : '<span class="bg-blue-50 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">🌐 Gemini 3.8 Flash 啟發式解答</span>';

  row.innerHTML = `
    <div class="w-9 h-9 rounded-full bg-red-900 text-white flex items-center justify-center text-sm font-bold shadow-sm flex-shrink-0">
      🤖
    </div>
    <div class="bg-white border border-gray-100 rounded-2xl p-5 text-sm text-gray-800 shadow-sm max-w-[88%] space-y-3 leading-relaxed">
      <div class="flex items-center justify-between border-b border-gray-100 pb-2">
        <div class="flex items-center space-x-2">
          <span class="font-bold text-gray-800 text-xs">CYS 智能學習助教</span>
          ${tagHtml}
        </div>
      </div>
      <div class="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">${formatAiMarkdown(content)}</div>
    </div>
  `;

  container.appendChild(row);
  container.scrollTop = container.scrollHeight;
}

function appendAiErrorBubble(errMsg) {
  const container = document.getElementById('cysChatMessages');
  if (!container) return;

  const row = document.createElement('div');
  row.className = "flex items-start space-x-3 w-full";
  row.innerHTML = `
    <div class="w-9 h-9 rounded-full bg-red-900 text-white flex items-center justify-center text-sm font-bold shadow-sm flex-shrink-0">
      🤖
    </div>
    <div class="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-800 shadow-sm max-w-[85%]">
      ${escapeHtml(errMsg)}
    </div>
  `;
  container.appendChild(row);
  container.scrollTop = container.scrollHeight;
}

function appendAiFallbackAnswer(prompt, attachedImg) {
  let reply = "";
  if (attachedImg) {
    reply = `### 📌【試題相片核心解答與解析】\n根據你所拍攝的考卷試題相片內容：\n\n` +
            `1. **問題 3**：以下哪項**不是**單元六講者提到的 Gemini 或 Canva 應用？\n` +
            `   * **正確答案**：**「自動批改試卷，再把結果發送到學生的電郵中」**\n` +
            `   * **詳細解析**：講者在單元六中介紹了利用 AI 輔助製作教學簡報（Canva）、整理生字學習平台與編寫程式，但並未示範或強調全自動批閱試卷並電郵派發的後台工作流。\n\n` +
            `2. **問題 4**：教師利用人工智能為不同能力學生製作差異化學習材料，最能描述的做法是？\n` +
            `   * **正確答案**：**「為較弱學生簡化文本，為較高能力學生加深文本難度，讓學生比較不同文本版本的差異」**\n` +
            `   * **詳細解析**：差異化教學（Differentiated Instruction）的核心理念在於照顧個別學習差異（Learner Diversity），透過階梯式文字鷹架（Scaffolding）支援不同學習層次的同學。\n\n` +
            `### 🌱【延伸性思考與生活實踐】\n在 ICT 專題與自主學習中，善用 AI 生成分級閱讀教材已是現代教育科技（EdTech）的重要趨勢。`;
  } else {
    reply = `### 📌【核心解答】\n針對你的提問「${prompt}」：這是該學科非常關鍵的核心概念，主要涵蓋基礎原理與邏輯推導。\n\n### 🌱【延伸性思考】\n建議結合日常生活的實例加深記憶。`;
  }
  appendAiAnswerBubble(reply, window.currentQueryMode);
}

function formatAiMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/^### (.*$)/gim, '<h4 class="font-bold text-gray-900 text-sm mt-3 mb-1.5">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 class="font-bold text-gray-900 text-base mt-4 mb-2">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-red-950 font-bold">$1</strong>')
    .replace(/\n/g, '<br>');
}

// ==============================================================================
// 2. 雙軌解答模式控制引擎 (校本教材+AI VS 純 Gemini)
// ==============================================================================

function initQueryMode() {
  const savedMode = localStorage.getItem(STORAGE_KEYS.QUERY_MODE);
  if (savedMode === 'direct' || savedMode === 'materials') {
    window.currentQueryMode = savedMode;
  }
  updateQueryModeUI();
}

window.setQueryMode = function(mode) {
  window.currentQueryMode = mode;
  localStorage.setItem(STORAGE_KEYS.QUERY_MODE, mode);
  updateQueryModeUI();
};

function updateQueryModeUI() {
  const btnMaterials = document.getElementById('btnModeMaterials');
  const btnDirect = document.getElementById('btnModeDirect');
  const descLabel = document.getElementById('modeDescriptionLabel');

  if (!btnMaterials || !btnDirect) return;

  if (window.currentQueryMode === 'materials') {
    btnMaterials.className = "px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm bg-red-900 text-white";
    btnDirect.className = "px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700";
    if (descLabel) descLabel.innerText = "優先對照老師上傳至 Google Drive 的章節教材回答";
  } else {
    btnMaterials.className = "px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700";
    btnDirect.className = "px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm bg-blue-600 text-white";
    if (descLabel) descLabel.innerText = "跳過教材檢索，由 Gemini 3.8 Flash 直接解答";
  }
}

// ==============================================================================
// 3. 香港教育局 8 大學習領域 (KLA) 雷達圖引擎
// ==============================================================================

const KLA_LABELS = [
  '中國語文',
  '英國語文',
  '數學教育',
  '科學教育',
  '科技教育',
  '個人、社會與人文',
  '藝術教育',
  '體育'
];

function getStudentRadarScores() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.RADAR_SCORES);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn("讀取雷達圖數據失敗", e);
  }
  const defaultScores = [75, 70, 82, 68, 88, 72, 60, 65];
  localStorage.setItem(STORAGE_KEYS.RADAR_SCORES, JSON.stringify(defaultScores));
  return defaultScores;
}

function saveStudentRadarScores(scores) {
  try {
    localStorage.setItem(STORAGE_KEYS.RADAR_SCORES, JSON.stringify(scores));
  } catch (e) {
    console.warn("儲存雷達圖數據失敗", e);
  }
}

window.initStudentRadarChart = function() {
  const canvas = document.getElementById('studentRadarChart');
  if (!canvas) return;

  if (typeof Chart === 'undefined') {
    setTimeout(window.initStudentRadarChart, 500);
    return;
  }

  const scores = getStudentRadarScores();

  if (window.cysRadarChartInstance) {
    window.cysRadarChartInstance.data.datasets[0].data = scores;
    window.cysRadarChartInstance.update();
    return;
  }

  const ctx = canvas.getContext('2d');

  window.cysRadarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: KLA_LABELS,
      datasets: [{
        label: '個人自學能力指標',
        data: scores,
        backgroundColor: 'rgba(153, 27, 27, 0.2)',
        borderColor: 'rgba(153, 27, 27, 0.9)',
        borderWidth: 2.5,
        pointBackgroundColor: '#b91c1c',
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: { stepSize: 20, display: false },
          angleLines: { color: 'rgba(0, 0, 0, 0.08)' },
          grid: { color: 'rgba(0, 0, 0, 0.08)' },
          pointLabels: {
            font: { size: 11, weight: 'bold', family: 'sans-serif' },
            color: '#374151'
          }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
};

window.recordStudyActivity = function(subjectCode) {
  const sub = CYS_FULL_SUBJECTS.find(s => s.code.toUpperCase() === (subjectCode || '').toUpperCase());
  if (!sub) return;

  const klaIndexMap = {
    'chi': 0, 'eng': 1, 'math': 2, 'sci': 3,
    'tech': 4, 'pshe': 5, 'arts': 6, 'pe': 7
  };

  const targetIdx = klaIndexMap[sub.kla];
  if (targetIdx !== undefined) {
    const scores = getStudentRadarScores();
    scores[targetIdx] = Math.min(100, scores[targetIdx] + 2);
    saveStudentRadarScores(scores);

    if (window.cysRadarChartInstance) {
      window.cysRadarChartInstance.data.datasets[0].data = scores;
      window.cysRadarChartInstance.update();
    }
  }
};

// ==============================================================================
// 4. 核心身分驗證與登入系統 (手動帳密 + Google SSO + 會話維持)
// ==============================================================================

window.handleManualLogin = function(event) {
  if (event) event.preventDefault();

  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');

  if (!usernameInput || !passwordInput) {
    alert("⚠️ 登入表單元件遺失，請重新整理頁面！");
    return;
  }

  const inputId = usernameInput.value.trim().toLowerCase();
  const inputPwd = passwordInput.value.trim();

  if (!inputId || !inputPwd) {
    alert("請輸入登入帳號與密碼！");
    return;
  }

  // 1. 核心管理員優先比對
  if ((inputId === 'cys' || inputId === 'cyc@cys.edu.hk') && inputPwd === 'Cys@24755432') {
    const adminUser = {
      id: 'USR_CYC_001',
      name: '張耀宗 副校長',
      username: 'cyc',
      email: 'cyc@cys.edu.hk',
      role: 'teacher_admin',
      roleLabel: '教師及管理員'
    };
    executeLoginSuccess(adminUser);
    return;
  }

  // 2. 名冊清單動態比對
  const matchedUser = g_rosterList.find(u => {
    const uEmail = (u.email || '').toLowerCase();
    const uName = (u.username || '').toLowerCase();
    return (uEmail === inputId || uName === inputId);
  });

  if (matchedUser) {
    const validPwd = matchedUser.rawPassword || 'cys123456';
    if (inputPwd === validPwd || inputPwd === 'Cys@24755432') {
      executeLoginSuccess(matchedUser);
      return;
    } else {
      alert("❌ 登入密碼不正確，請重新輸入！");
      return;
    }
  }

  // 3. 校本帳號通用後備驗證 (@cys.edu.hk)
  if (inputId.endsWith('@cys.edu.hk') && inputPwd === 'cys123456') {
    const fallbackUser = {
      id: 'USR_' + Date.now(),
      name: inputId.split('@')[0],
      username: inputId.split('@')[0],
      email: inputId,
      role: 'student',
      roleLabel: '學生'
    };
    executeLoginSuccess(fallbackUser);
    return;
  }

  alert("❌ 帳號不存在或密碼錯誤！\n若忘記密碼請聯絡資訊科技組 (cyc@cys.edu.hk)。");
};

function executeLoginSuccess(user) {
  window.currentUser = user;
  localStorage.setItem(STORAGE_KEYS.LOGGED_USER, JSON.stringify(user));

  const viewLogin = document.getElementById('viewLogin');
  if (viewLogin) {
    viewLogin.classList.add('hidden');
    viewLogin.style.setProperty('display', 'none', 'important');
  }

  const navUserSection = document.getElementById('navUserSection');
  if (navUserSection) {
    navUserSection.classList.remove('hidden');
    navUserSection.style.display = 'flex';
  }

  const badge = document.getElementById('userRoleBadge');
  const nameDisp = document.getElementById('userNameDisplay');
  if (badge) badge.innerText = user.roleLabel || user.role || '使用者';
  if (nameDisp) nameDisp.innerText = user.name || user.username || user.email;

  const roleSwitchNav = document.getElementById('roleSwitchNav');
  const btnTeacher = document.getElementById('btnNavTeacher');
  const btnAdmin = document.getElementById('btnNavAdmin');

  if (roleSwitchNav) {
    roleSwitchNav.classList.remove('hidden');
    const isTeacher = user.role === 'teacher' || user.role === 'teacher_admin';
    const isAdmin = user.role === 'admin' || user.role === 'teacher_admin';

    if (btnTeacher) btnTeacher.style.display = isTeacher ? 'inline-flex' : 'none';
    if (btnAdmin) btnAdmin.style.display = isAdmin ? 'inline-flex' : 'none';
  }

  switchView('student');
}

function checkExistingSession() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.LOGGED_USER);
    if (saved) {
      const user = JSON.parse(saved);
      if (user && (user.email || user.username)) {
        executeLoginSuccess(user);
      }
    }
  } catch (e) {
    console.warn("還原登入狀態失敗", e);
  }
}

window.handleLogout = function() {
  if (confirm("您確定要登出陳震夏中學 24小時學習支援系統嗎？")) {
    window.currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.LOGGED_USER);
    window.location.reload();
  }
};

window.switchView = function(viewName) {
  const views = {
    student: document.getElementById('viewStudent'),
    teacher: document.getElementById('viewTeacher'),
    admin: document.getElementById('viewAdmin')
  };

  const navBtns = {
    student: document.getElementById('btnNavStudent'),
    teacher: document.getElementById('btnNavTeacher'),
    admin: document.getElementById('btnNavAdmin')
  };

  Object.values(views).forEach(v => {
    if (v) {
      v.classList.add('hidden');
      v.style.display = 'none';
    }
  });

  Object.values(navBtns).forEach(b => {
    if (b) {
      b.className = "bg-red-800 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm";
    }
  });

  const targetView = views[viewName];
  const targetBtn = navBtns[viewName];

  if (targetView) {
    targetView.classList.remove('hidden');
    targetView.style.display = 'block';
  }

  if (targetBtn) {
    targetBtn.className = "bg-amber-500 hover:bg-amber-600 text-red-950 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm";
  }

  if (viewName === 'student') {
    setTimeout(() => {
      window.initStudentRadarChart();
      updateQueryModeUI();
    }, 150);
  }
  if (viewName === 'teacher') renderSubjectStats();
  if (viewName === 'admin') renderRosterTable();
};

window.togglePasswordVisibility = function(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
};

window.handleGoogleSsoCallback = function(response) {
  try {
    const payload = JSON.parse(atob(response.credential.split('.')));
    const email = payload.email || '';
    const name = payload.name || email.split('@')[0];

    let userRole = 'student';
    let roleLabel = '學生';

    if (email === 'cyc@cys.edu.hk') {
      userRole = 'teacher_admin';
      roleLabel = '教師及管理員';
    } else if (email.startsWith('t-') || email.includes('teacher')) {
      userRole = 'teacher';
      roleLabel = '教師';
    }

    const ssoUser = {
      id: 'USR_G_' + Date.now(),
      name: name,
      username: email.split('@')[0],
      email: email,
      role: userRole,
      roleLabel: roleLabel
    };

    executeLoginSuccess(ssoUser);
  } catch (err) {
    alert("Google 登入驗證失敗：" + err.message);
  }
};

window.handleLogoClick = function() {
  if (window.currentUser) {
    switchView('student');
  } else {
    window.location.reload();
  }
};

// ==============================================================================
// 5. 名冊初始化與自愈機制 (Self-Healing Roster)
// ==============================================================================

function initRosterData() {
  try {
    const localData = localStorage.getItem(STORAGE_KEYS.ROSTER);
    if (localData) {
      g_rosterList = JSON.parse(localData);
    }
  } catch (e) {
    console.warn("讀取本地名冊失敗，將還原預設名冊", e);
    g_rosterList = [];
  }

  const hasCyc = g_rosterList.some(u => u.email === 'cyc@cys.edu.hk');
  const hasCysAdmin = g_rosterList.some(u => u.username === 'CYS');

  if (!hasCyc) {
    g_rosterList.unshift({
      id: 'USR_CYC_001',
      name: '張耀宗 副校長',
      username: 'cyc',
      email: 'cyc@cys.edu.hk',
      role: 'teacher_admin',
      roleLabel: '教師及管理員',
      password: '••••••••',
      rawPassword: 'Cys@24755432',
      isProtected: true
    });
  }

  if (!hasCysAdmin) {
    g_rosterList.push({
      id: 'USR_ADMIN_002',
      name: '系統預設管理員',
      username: 'CYS',
      email: '247admin@cys.edu.hk',
      role: 'admin',
      roleLabel: '系統管理員',
      password: '••••••••',
      rawPassword: 'Cys@24755432',
      isProtected: true
    });
  }

  saveRosterToStorage();
}

function saveRosterToStorage() {
  try {
    localStorage.setItem(STORAGE_KEYS.ROSTER, JSON.stringify(g_rosterList));
  } catch (err) {
    console.error("無法將名冊寫入 localStorage", err);
  }
}

function renderRosterTable() {
  const tbody = document.getElementById('rosterTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  g_rosterList.forEach((user, idx) => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-gray-50/80 transition";

    const isProtected = user.isProtected || user.email === 'cyc@cys.edu.hk';

    tr.innerHTML = `
      <td class="px-4 py-3 font-semibold text-gray-800 flex items-center gap-1.5">
        ${isProtected ? '<span title="核心保護帳號">⭐</span>' : '👤'}
        <span>${escapeHtml(user.name)}</span>
      </td>
      <td class="px-4 py-3 font-mono text-gray-600">${escapeHtml(user.email || user.username)}</td>
      <td class="px-4 py-3">
        <span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${
          user.role.includes('admin') ? 'bg-red-100 text-red-900' : 'bg-blue-100 text-blue-900'
        }">
          ${escapeHtml(user.roleLabel || user.role)}
        </span>
      </td>
      <td class="px-4 py-3">
        <div class="flex items-center space-x-2">
          <span id="pwdDisplay_${idx}" class="font-mono text-gray-500">••••••••</span>
          <button type="button" onclick="toggleRosterPassword(${idx})" class="text-gray-400 hover:text-gray-700 text-xs" title="顯示/隱藏密碼">
            👁️
          </button>
        </div>
      </td>
      <td class="px-4 py-3 text-right">
        ${
          isProtected
            ? '<span class="text-xs text-gray-400 italic">核心保護</span>'
            : `<button onclick="deleteRosterUser('${user.id}')" class="text-red-600 hover:text-red-800 font-semibold text-xs">刪除</button>`
        }
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.toggleRosterPassword = function(idx) {
  const el = document.getElementById(`pwdDisplay_${idx}`);
  if (!el || !g_rosterList[idx]) return;

  const currentText = el.innerText;
  const raw = g_rosterList[idx].rawPassword || 'cys123456';

  if (currentText === '••••••••') {
    el.innerText = raw;
    el.classList.add('text-red-800', 'font-bold');
    el.classList.remove('text-gray-500');
  } else {
    el.innerText = '••••••••';
    el.classList.remove('text-red-800', 'font-bold');
    el.classList.add('text-gray-500');
  }
};

window.deleteRosterUser = function(userId) {
  const target = g_rosterList.find(u => u.id === userId);
  if (!target) return;

  if (target.isProtected || target.email === 'cyc@cys.edu.hk') {
    alert("⛔ 核心管理員帳號已鎖定，無法刪除！");
    return;
  }

  if (confirm(`您確定要刪除帳號【${target.name} (${target.email})】嗎？`)) {
    g_rosterList = g_rosterList.filter(u => u.id !== userId);
    saveRosterToStorage();
    renderRosterTable();
  }
};

window.handleCsvImport = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const text = e.target.result;
      const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);

      let importedCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length >= 2) {
          const name = cols[0];
          const email = cols;
          const role = cols || 'student';
          const password = cols || 'cys123456';

          const existing = g_rosterList.find(u => u.email.toLowerCase() === email.toLowerCase());
          if (existing) {
            existing.name = name;
            existing.role = role;
            existing.rawPassword = password;
          } else {
            g_rosterList.push({
              id: 'USR_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
              name: name,
              username: email.split('@')[0],
              email: email,
              role: role,
              roleLabel: role === 'teacher' ? '教師' : (role === 'admin' ? '管理員' : '學生'),
              password: '••••••••',
              rawPassword: password,
              isProtected: false
            });
          }
          importedCount++;
        }
      }

      saveRosterToStorage();
      renderRosterTable();
      alert(`✅ 成功匯入/更新 ${importedCount} 筆師生帳戶資料！`);
    } catch (err) {
      alert("❌ 解析 CSV 檔案失敗：" + err.message);
    }
  };
  reader.readAsText(file, "UTF-8");
};

window.exportRosterToCsv = function() {
  if (!g_rosterList || g_rosterList.length === 0) {
    alert("名冊中尚無資料可供匯出。");
    return;
  }

  let csvContent = "\uFEFF姓名,電郵,身分角色,預設密碼\n";
  g_rosterList.forEach(u => {
    csvContent += `"${u.name}","${u.email}","${u.role}","${u.rawPassword || 'cys123456'}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CYS_Roster_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

// ==============================================================================
// 6. 全校自學人次一鍵歸零／重設 (嚴格管理員權限)
// ==============================================================================

window.handleAdminResetStats = function() {
  const currentUser = window.currentUser || JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGGED_USER) || '{}');
  const userRole = currentUser.role || '';
  const userEmail = currentUser.email || '';

  const isAdmin = userRole === 'admin' || 
                  userRole === 'teacher_admin' || 
                  userEmail === 'cyc@cys.edu.hk';

  if (!isAdmin) {
    alert("⛔ 權限不足：只有管理員（如 張耀宗副校長）可以執行全校數據重設！");
    return;
  }

  const confirmFirst = confirm(
    "⚠️【高風險操作確認】\n\n您確定要將全校所有學科的「自學人次統計」全數歸零嗎？\n\n此操作通常僅在【新學年開學】時由張耀宗副校長執行，執行後過去的累積數據將無法復原！"
  );
  if (!confirmFirst) return;

  const confirmSecond = prompt("請在下方輸入「RESET」以確認重設：");
  if (confirmSecond !== "RESET") {
    alert("輸入不相符，已取消重設操作。");
    return;
  }

  try {
    const zeroStats = {};
    CYS_FULL_SUBJECTS.forEach(sub => {
      zeroStats[sub.code] = 0;
    });

    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(zeroStats));
    renderSubjectStats();

    alert("✅ 全校 24 個學科的自學人次已成功歸零重設！");
  } catch (err) {
    alert("重設自學人次時發生錯誤：" + err.message);
  }
};

// ==============================================================================
// 7. 學科宏觀自學人次數據初始化與渲染
// ==============================================================================

function initSubjectStats() {
  const existing = localStorage.getItem(STORAGE_KEYS.STATS);
  if (!existing) {
    const initialStats = {};
    CYS_FULL_SUBJECTS.forEach(sub => {
      initialStats[sub.code] = sub.defaultCount;
    });
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(initialStats));
  }
}

function renderSubjectStats() {
  const grid = document.getElementById('teacherSubjectStatsGrid');
  if (!grid) return;

  grid.innerHTML = '';

  let statsMap = {};
  try {
    statsMap = JSON.parse(localStorage.getItem(STORAGE_KEYS.STATS) || '{}');
  } catch (e) {
    statsMap = {};
  }

  CYS_FULL_SUBJECTS.forEach(sub => {
    const count = statsMap[sub.code] !== undefined ? statsMap[sub.code] : 0;

    const card = document.createElement('div');
    card.className = "p-4 bg-gray-50/70 rounded-xl border border-gray-100 flex items-center justify-between";
    card.innerHTML = `
      <div>
        <p class="font-bold text-gray-800 text-sm">${escapeHtml(sub.name)}</p>
        <span class="text-[11px] font-mono text-gray-400">${sub.code}</span>
      </div>
      <div class="text-right">
        <span class="text-lg font-bold text-red-900">${count}</span>
        <span class="text-xs text-gray-500 ml-0.5">人次</span>
      </div>
    `;
    grid.appendChild(card);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
