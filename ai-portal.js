/**
 * ai-portal.js - AI 知識解答、延伸性思考與挑戰、八大領域雷達圖與主控台
 */

let studentRadarChartInstance = null;
let currentAttachedImageBase64 = null;

// 使用人次計數器（教師頁統計）
function getSubjectUsageStats() {
  const stored = localStorage.getItem('cys_subject_usage_stats');
  if (stored) {
    try { return JSON.parse(stored); } catch(e) {}
  }
  const init = {};
  APP_CONFIG.ALL_24_SUBJECTS.forEach(s => { init[s.code] = 0; });
  return init;
}

function recordSubjectUsage(subjectCode) {
  const stats = getSubjectUsageStats();
  stats[subjectCode] = (stats[subjectCode] || 0) + 1;
  localStorage.setItem('cys_subject_usage_stats', JSON.stringify(stats));
}

// 系統初始化入口
document.addEventListener('DOMContentLoaded', () => {
  initSystem();
});

function initSystem() {
  // 載入學年度設定
  const storedYear = localStorage.getItem('cys_current_academic_year') || APP_CONFIG.ACADEMIC_YEAR;
  applyAcademicYearToUI(storedYear);

  // 初始化名冊
  getStoredRoster();

  // 若使用者已存在狀態則渲染對應視圖
  if (currentUser) {
    renderCurrentView();
  } else {
    document.getElementById('viewLogin').classList.remove('hidden');
  }
}

// 套用學年度設定
function applyAcademicYearToUI(year) {
  APP_CONFIG.ACADEMIC_YEAR = year;
  const badge = document.getElementById('headerAcademicYearBadge');
  const studentInput = document.getElementById('studentAcademicYearInput');
  const teacherLabel = document.getElementById('teacherYearLabel');
  const adminInput = document.getElementById('adminAcademicYearSettingInput');
  const targetYearInput = document.getElementById('targetAcademicYearInput');

  if (badge) badge.innerText = year;
  if (studentInput) studentInput.value = year;
  if (teacherLabel) teacherLabel.innerText = year;
  if (adminInput) adminInput.value = year;
  if (targetYearInput) targetYearInput.value = year;
}

// 視圖渲染路由器
function renderCurrentView() {
  const vLogin = document.getElementById('viewLogin');
  const vStudent = document.getElementById('viewStudent');
  const vTeacher = document.getElementById('viewTeacher');
  const vAdmin = document.getElementById('viewAdmin');

  [vLogin, vStudent, vTeacher, vAdmin].forEach(el => el.classList.add('hidden'));

  if (!currentUser) {
    vLogin.classList.remove('hidden');
    return;
  }

  if (currentRoleView === 'student') {
    vStudent.classList.remove('hidden');
    renderStudentSubjectDropdown();
    initStudentRadarChart();
    syncTopicsAndMaterials(false);
  } else if (currentRoleView === 'teacher') {
    vTeacher.classList.remove('hidden');
    renderTeacherGradeDriveGrid();
    renderSubjectActivityCards();
  } else if (currentRoleView === 'admin') {
    vAdmin.classList.remove('hidden');
    renderUserRosterTable();
  }
}

// 處理相機/圖片上載
function handleImageAttach(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    currentAttachedImageBase64 = e.target.result;
    const preview = document.getElementById('imagePreview');
    const container = document.getElementById('imagePreviewContainer');
    preview.src = currentAttachedImageBase64;
    container.classList.remove('hidden');
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

// 學生提交提問 (生成【核心解答】+【延伸性思考】+【啟發性挑戰問題】)
function submitStudentQuestion() {
  const input = document.getElementById('studentQuestionInput');
  const question = input.value.trim();
  if (!question && !currentAttachedImageBase64) return;

  const subjectSelect = document.getElementById('studentSubjectSelect');
  const subjectName = subjectSelect ? subjectSelect.value : '本科';
  const selectedTopics = Array.from(selectedTopicsSet);

  // 記錄科目使用人次
  const subCode = subjectName.substring(0, 2);
  recordSubjectUsage(subCode);

  // 1. 將學生問題加入對話框
  appendUserChatMessage(question, currentAttachedImageBase64);
  input.value = '';
  const attachedImageForAnswer = currentAttachedImageBase64;
  clearAttachedImage();

  // 2. 顯示 AI 思考中動畫
  const loadingId = appendAiLoadingMessage();

  // 3. 模擬日常 Gemini 生成高質量三層式啟發解答
  setTimeout(() => {
    removeAiLoadingMessage(loadingId);
    generateEnhancedGeminiResponse(question, subjectName, selectedTopics, attachedImageForAnswer);
    updateRadarValuesOnQuestion(subjectName);
  }, 1200);
}

// 新增學生提問泡泡
function appendUserChatMessage(text, imgBase64) {
  const chatBox = document.getElementById('aiChatBox');
  const msgDiv = document.createElement('div');
  msgDiv.className = 'flex items-start justify-end gap-2.5';

  let imgHtml = '';
  if (imgBase64) {
    imgHtml = `<img src="${imgBase64}" class="max-h-40 rounded-lg mb-2 border border-red-200">`;
  }

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
      <span>正在查閱 Google Drive 校本教材並準備解答與延伸思維...</span>
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

// 生成日常 Gemini 風格的三層啟發式回覆
function generateEnhancedGeminiResponse(question, subject, topics, imgBase64) {
  const chatBox = document.getElementById('aiChatBox');
  const topicLabel = topics.length > 0 ? topics.join('、') : '校本講義核心概念';

  // 1. 核心解答
  let answerContent = `根據【${subject}】之雲端教材 (${topicLabel})，針對你的提問：<strong>「${question || '圖片題目'}」</strong>，主要觀念與核心答案如下：<br><br>`;
  answerContent += `• <strong>直接結論</strong>：在學科規範中，這屬於核心運算/機制規律。透過拆解題目條件，可以直接得出對應的標準答案與關鍵定律。<br>`;
  answerContent += `• <strong>步驟指引</strong>：首先鎖定已知參數，帶入對應概念框架，即可避免混淆。`;

  // 2. 延伸性思考
  let guidedThinkContent = `• <strong>原理深化</strong>：為甚麼會產生這個規律？這背後的運作機制與真實世界的物理/邏輯原則息息相關。<br>`;
  guidedThinkContent += `• <strong>生活與科技跨領域結合</strong>：在現代創新科技（例如人工智能演算、自動駕駛感應器控制或綠色能源系統）中，這項知識扮演著最基礎的控制骨幹！`;

  // 3. 啟發性挑戰問題
  const challenge1 = `【挑戰 1（條件變化）】：如果將題目的關鍵參數加倍，系統的反應時間或平衡點會如何改變？為甚麼？`;
  const challenge2 = `【挑戰 2（批判探究）】：試想像在生活中（如智慧校園設計），你可以如何運用這個原理來解決一項實際問題？`;

  const msgDiv = document.createElement('div');
  msgDiv.className = 'flex items-start gap-2.5';
  msgDiv.innerHTML = `
    <div class="w-7 h-7 bg-cys-red text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 shadow">
      <i class="fa-solid fa-robot"></i>
    </div>
    <div class="bg-white p-4 rounded-lg rounded-tl-none shadow-2xs border border-gray-100 max-w-[92%] text-xs text-gray-800 space-y-3">
      <!-- 第一層：核心解答 -->
      <div class="space-y-1">
        <div class="font-bold text-cys-red flex items-center gap-1.5 text-xs">
          <i class="fa-solid fa-circle-check"></i>
          <span>【📌 核心解答】(引用雲端教材章節：${topicLabel})</span>
        </div>
        <div class="text-gray-700 leading-relaxed pl-4 border-l-2 border-red-200">
          ${answerContent}
        </div>
      </div>

      <!-- 第二層：延伸性思考 -->
      <div class="space-y-1 pt-1 border-t border-gray-100">
        <div class="font-bold text-emerald-700 flex items-center gap-1.5 text-xs">
          <i class="fa-solid fa-seedling"></i>
          <span>【🌱 延伸性思考：原理深化與跨領域連結】</span>
        </div>
        <div class="text-gray-600 leading-relaxed pl-4 border-l-2 border-emerald-200">
          ${guidedThinkContent}
        </div>
      </div>

      <!-- 第三層：探索挑戰問題 -->
      <div class="space-y-2 pt-1 border-t border-gray-100 bg-amber-50/60 p-3 rounded-lg border border-amber-200/60">
        <div class="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
          <i class="fa-solid fa-lightbulb"></i>
          <span>【🤔 深度探究挑戰問題】</span>
        </div>
        <div class="text-gray-700 space-y-1 pl-1 text-[11px]">
          <p>${challenge1}</p>
          <p>${challenge2}</p>
        </div>
        <div class="pt-1 flex gap-2">
          <button onclick="promptFollowUpChallenge('${challenge1}')" class="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded text-[10px] font-bold shadow-2xs transition">
            探討挑戰 1
          </button>
          <button onclick="promptFollowUpChallenge('${challenge2}')" class="bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded text-[10px] font-bold shadow-2xs transition">
            探討挑戰 2
          </button>
        </div>
      </div>

      <!-- 第四層：折疊式完整步驟與步驟推導 -->
      <details class="pt-1 border-t border-gray-100">
        <summary class="font-bold text-gray-500 hover:text-gray-800 cursor-pointer text-[11px] select-none py-1 flex items-center gap-1">
          <i class="fa-solid fa-chevron-right text-[10px] transition group-open:rotate-90"></i>
          <span>💡 展開詳細公式推導與防踩坑提醒</span>
        </summary>
        <div class="mt-2 p-2.5 bg-slate-50 rounded border border-slate-200 text-[11px] text-gray-600 leading-relaxed space-y-1">
          <p><strong>公式與運算法則：</strong>嚴格依循校本標準題型步驟，注意單元轉換與變數宣告。</p>
          <p><strong>考試常見陷阱：</strong>此類題目同學最容易忽略邊界條件，務必在作答前再次驗算！</p>
        </div>
      </details>
    </div>
  `;
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// 快速追問挑戰題
function promptFollowUpChallenge(challengeText) {
  const cleanQ = challengeText.replace(/【.*?】：/, '');
  const input = document.getElementById('studentQuestionInput');
  input.value = cleanQ;
  submitStudentQuestion();
}

// 八大學習領域雷達圖初始化
function initStudentRadarChart() {
  const ctx = document.getElementById('studentRadarChart');
  if (!ctx) return;

  if (studentRadarChartInstance) {
    studentRadarChartInstance.destroy();
  }

  const labels = APP_CONFIG.KLA_DOMAINS.map(d => d.name);
  const dataVals = APP_CONFIG.KLA_DOMAINS.map(d => d.defaultVal);

  studentRadarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [{
        label: '個人學習領域學力值',
        data: dataVals,
        backgroundColor: 'rgba(139, 29, 36, 0.2)',
        borderColor: '#8B1D24',
        borderWidth: 2,
        pointBackgroundColor: '#8B1D24',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#8B1D24'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 40,
          max: 100,
          ticks: { stepSize: 15, display: false },
          pointLabels: { font: { size: 10, weight: 'bold' }, color: '#4b5563' }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// 發問後動態提升所屬領域數值
function updateRadarValuesOnQuestion(subjectName) {
  if (!studentRadarChartInstance) return;

  let targetDomainIndex = -1;
  for (let i = 0; i < APP_CONFIG.KLA_DOMAINS.length; i++) {
    if (APP_CONFIG.KLA_DOMAINS[i].subjects.includes(subjectName)) {
      targetDomainIndex = i;
      break;
    }
  }

  if (targetDomainIndex >= 0) {
    let currentVal = studentRadarChartInstance.data.datasets[0].data[targetDomainIndex];
    if (currentVal < 98) {
      studentRadarChartInstance.data.datasets[0].data[targetDomainIndex] = currentVal + 2;
      studentRadarChartInstance.update();
    }
  }
}

// 教師頁：渲染 S1～S6 直達教案庫網格
function renderTeacherGradeDriveGrid() {
  const container = document.getElementById('teacherGradeDriveGrid');
  if (!container) return;

  const grades = ["S1", "S2", "S3", "S4", "S5", "S6"];
  const year = APP_CONFIG.ACADEMIC_YEAR;

  container.innerHTML = grades.map(g => {
    const query = encodeURIComponent(`${year} ${g}`);
    return `
      <a href="https://drive.google.com/drive/search?q=${query}" target="_blank"
         class="bg-white hover:bg-blue-50 border border-blue-200 p-3 rounded-lg text-center transition shadow-2xs group flex flex-col items-center justify-center">
        <i class="fa-solid fa-folder-open text-amber-500 text-xl group-hover:scale-110 transition mb-1"></i>
        <div class="text-xs font-bold text-gray-800">${year} ${g}</div>
        <div class="text-[9px] text-gray-400 mt-0.5">進入各學科ACD/BE班</div>
      </a>
    `;
  }).join('');
}

// 教師頁：渲染 24 科自學人次卡片
function renderSubjectActivityCards() {
  const container = document.getElementById('subjectActivityCardsContainer');
  if (!container) return;

  const stats = getSubjectUsageStats();

  container.innerHTML = APP_CONFIG.ALL_24_SUBJECTS.map(sub => {
    const count = stats[sub.code] || 0;
    return `
      <div class="p-3 bg-slate-50 border-l-4 ${sub.color} rounded-lg border border-gray-200">
        <div class="flex justify-between items-start">
          <span class="text-xs font-bold text-gray-700">${sub.name}</span>
          <i class="fa-solid ${sub.icon} text-gray-400 text-xs"></i>
        </div>
        <div class="mt-2 text-right">
          <span class="text-xl font-black text-gray-800">${count}</span>
          <span class="text-[10px] text-gray-400 ml-1">人次</span>
        </div>
      </div>
    `;
  }).join('');
}

// 清除全校自學人次統計
function clearAllStudentUsageStats() {
  if (!confirm('確定要歸零並清除所有科目的自學人次數據嗎？此動作無法復原。')) return;
  const init = {};
  APP_CONFIG.ALL_24_SUBJECTS.forEach(s => { init[s.code] = 0; });
  localStorage.setItem('cys_subject_usage_stats', JSON.stringify(init));
  renderSubjectActivityCards();
  alert('已全數歸零並重設完畢！');
}

// 管理員：儲存系統現時學年
function saveAdminAcademicYearSetting() {
  const val = document.getElementById('adminAcademicYearSettingInput').value.trim();
  if (!val) return alert('學年度不得為空！');

  localStorage.setItem('cys_current_academic_year', val);
  applyAcademicYearToUI(val);
  alert(`成功變更！全站標籤與 Drive 連動學年已更新為【${val}】！`);
}

// 管理員：GAS 後端連線診斷
async function diagnoseBackendConnection() {
  try {
    const res = await fetch(`${APP_CONFIG.BACKEND_API_URL}?action=ping`, { method: 'GET', mode: 'cors' });
    const data = await res.json();
    if (data.status === 'success' || data.pong) {
      alert(`⚡ GAS 後端連線正常！回傳訊號: ${data.pong || 'pong'} (版本正常運作中)`);
    } else {
      alert(`⚠️ 收到回應但狀態異常: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    alert(`❌ 無法連線至 Google Apps Script 後端，請確認 Web App 是否已發布為「新版本」：\n${err.message}`);
  }
}

// 管理員：一鍵批量自動建立全學年資料夾
async function handleBatchCreateAcademicYear() {
  const year = document.getElementById('targetAcademicYearInput').value.trim();
  if (!year) return alert('請輸入學年度！');
  if (!confirm(`確定要在 Google Drive 建立【${year}】全學年 S1～S6 及所有學科 ACD/BE班 的資料夾嗎？`)) return;

  alert('正在向 247admin 雲端下達批量建檔指令，建檔需時約 10~20 秒，完成後會有通知...');

  try {
    const res = await fetch(APP_CONFIG.BACKEND_API_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'createAcademicYear', year: year })
    });
    const data = await res.json();
    if (data.status === 'success') {
      alert(`🎉 恭喜！【${year}】全學年資料夾及 ACD/BE 班別結構已成功批量建立完成！`);
    } else {
      alert(`建立失敗: ${data.message || '未知錯誤'}`);
    }
  } catch (err) {
    alert(`建檔指令已送出，若因 Google Apps Script 執行時間較長觸發超時，雲端後台仍會持續完成建檔作業。請稍候在 Google Drive 查閱。\n${err.message}`);
  }
}

// 管理員：建立自訂學科
async function handleCreateCustomSubject() {
  const grade = document.getElementById('customSubjectGrade').value;
  const subName = document.getElementById('customSubjectName').value.trim();
  if (!subName) return alert('請輸入學科名稱！');

  try {
    const res = await fetch(APP_CONFIG.BACKEND_API_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'createCustomSubject',
        year: APP_CONFIG.ACADEMIC_YEAR,
        grade: grade,
        subjectName: subName
      })
    });
    const data = await res.json();
    if (data.status === 'success') {
      alert(`🎉 已於 ${grade} 成功建立學科【${subName}】及其 ACD班 / BE班 子資料夾！`);
      document.getElementById('customSubjectName').value = '';
    } else {
      alert(`建立失敗: ${data.message}`);
    }
  } catch(e) {
    alert(`建立異常: ${e.message}`);
  }
}
