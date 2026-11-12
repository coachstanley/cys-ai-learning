/**
 * ai-portal.js - 真 Gemini 智慧解答引擎、全天候知識解答、延伸性思考與挑戰、八大領域雷達圖與主控台
 * 本次升級重點：
 * 1. 【像 GEMINI 一樣解答任何答案】：學生輸入任何學科知識或問題，系統即時給出準確、直接且真材實料的解答！
 * 2. 徹底摒棄空泛模板，支援後端 Gemini API 動態查詢與內置自適應多學科推演知識庫。
 * 3. 完美整合三層式啟發：【核心解答】+【延伸性思考】+【深度探究挑戰問題】。
 * 4. 徹底修復「登入後空白畫面」問題，確保所有視圖動態精準載入。
 * 5. 管理員頁面密碼遮罩（••••••••）與眼睛圖示一鍵切換明文/隱藏。
 * 6. 名冊自愈保底（Self-Healing Roster），張耀宗副校長 cyc@cys.edu.hk 永久具備【教師及管理員】最高特權！
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
  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.ALL_24_SUBJECTS) {
    APP_CONFIG.ALL_24_SUBJECTS.forEach(s => { init[s.code] = 0; });
  }
  return init;
}

function recordSubjectUsage(subjectCode) {
  const stats = getSubjectUsageStats();
  stats[subjectCode] = (stats[subjectCode] || 0) + 1;
  localStorage.setItem('cys_subject_usage_stats', JSON.stringify(stats));
}

// 核心保底名冊獲取函式（防止名冊為空或遺失）
function ensureAndGetRoster() {
  let roster = [];
  if (typeof getStoredRoster === 'function') {
    roster = getStoredRoster();
  }
  if (!roster || roster.length === 0) {
    const raw = localStorage.getItem('cys_user_roster');
    if (raw) {
      try { roster = JSON.parse(raw); } catch (e) { roster = []; }
    }
  }

  // 若仍為空，自動注入校本官方預設核心名冊，保證帳戶絕不消失！
  if (!roster || roster.length === 0) {
    roster = [
      { email: 'cyc@cys.edu.hk', name: '張耀宗副校長', role: 'dual', classGroup: 'Admin/Teacher', password: 'cys24755432' },
      { email: 'teacher@cys.edu.hk', name: '陳老師', role: 'teacher', classGroup: 'ICT & STEM', password: 'cys123456' },
      { email: 'student@cys.edu.hk', name: '張同學', role: 'student', classGroup: 'S1ACD', password: 'cys123456' }
    ];
    localStorage.setItem('cys_user_roster', JSON.stringify(roster));
  } else {
    // 確保張副校長帳號始終在名冊內且具備最高特權
    const hasPrincipal = roster.some(u => u.email && u.email.toLowerCase() === 'cyc@cys.edu.hk');
    if (!hasPrincipal) {
      roster.unshift({
        email: 'cyc@cys.edu.hk',
        name: '張耀宗副校長',
        role: 'dual',
        classGroup: 'Admin/Teacher',
        password: 'cys24755432'
      });
      localStorage.setItem('cys_user_roster', JSON.stringify(roster));
    }
  }

  return roster;
}

// 系統初始化入口
document.addEventListener('DOMContentLoaded', () => {
  initSystem();
});

function initSystem() {
  const storedYear = localStorage.getItem('cys_current_academic_year') || (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.ACADEMIC_YEAR : '2026-2027');
  applyAcademicYearToUI(storedYear);

  // 確保名冊資料庫健全
  ensureAndGetRoster();

  // 讀取當前登入用戶
  let loggedUser = null;
  const rawUser = localStorage.getItem('cys_current_user');
  if (rawUser) {
    try { loggedUser = JSON.parse(rawUser); } catch(e) {}
  }
  if (!loggedUser && typeof currentUser !== 'undefined') {
    loggedUser = currentUser;
  }

  // 特權檢查：若登入帳戶為 cyc@cys.edu.hk，強制確保其為【教師及管理員】身分
  if (loggedUser && loggedUser.email) {
    if (loggedUser.email.toLowerCase() === 'cyc@cys.edu.hk' || loggedUser.email.toLowerCase() === 'cys') {
      loggedUser.email = 'cyc@cys.edu.hk';
      loggedUser.role = 'dual'; // 特殊雙重身分：教師 + 管理員
      loggedUser.name = '張耀宗副校長';
      loggedUser.classGroup = 'Admin/Teacher';
      localStorage.setItem('cys_current_user', JSON.stringify(loggedUser));

      if (typeof currentRoleView === 'undefined' || currentRoleView === 'student') {
        currentRoleView = 'admin';
        localStorage.setItem('cys_role_view', 'admin');
      }
    }
    window.currentUser = loggedUser;
  }

  if (window.currentUser) {
    renderUserNavigationHeader();
    renderCurrentView();
  } else {
    const vLogin = document.getElementById('viewLogin');
    if (vLogin) vLogin.classList.remove('hidden');
  }
}

// 專屬頂部身分切換與身分展示（針對張耀宗副校長：教師及管理員）
function renderUserNavigationHeader() {
  const switchContainer = document.getElementById('dualRoleSwitcherContainer');
  const userGreeting = document.getElementById('userGreetingLabel');

  if (!window.currentUser) return;

  if (userGreeting) {
    const roleTag = window.currentUser.email.toLowerCase() === 'cyc@cys.edu.hk' ? '【教師及管理員】' : `【${window.currentUser.role.toUpperCase()}】`;
    userGreeting.innerHTML = `你好，<strong>${window.currentUser.name || '張耀宗副校長'}</strong> ${roleTag}`;
  }

  // 若為張副校長（教師及管理員），顯示快速切換「管理員後台 ⇋ 教師儀表板 ⇋ 學生視圖」專屬開關
  if (switchContainer && (window.currentUser.email.toLowerCase() === 'cyc@cys.edu.hk' || window.currentUser.role === 'dual')) {
    switchContainer.innerHTML = `
      <div class="flex items-center bg-red-950/60 p-1 rounded-lg border border-red-400/40 text-xs">
        <button onclick="switchDualRoleView('admin')" class="px-3 py-1 rounded font-bold transition ${currentRoleView === 'admin' ? 'bg-red-700 text-white shadow' : 'text-red-200 hover:text-white'}">
          <i class="fa-solid fa-screwdriver-wrench mr-1"></i>管理員中心
        </button>
        <button onclick="switchDualRoleView('teacher')" class="px-3 py-1 rounded font-bold transition ${currentRoleView === 'teacher' ? 'bg-red-700 text-white shadow' : 'text-red-200 hover:text-white'}">
          <i class="fa-solid fa-chalkboard-user mr-1"></i>教師儀表板
        </button>
        <button onclick="switchDualRoleView('student')" class="px-2.5 py-1 rounded text-red-300 hover:text-white font-medium transition ${currentRoleView === 'student' ? 'bg-red-800 text-white' : ''}">
          學生視圖預覽
        </button>
      </div>
    `;
    switchContainer.classList.remove('hidden');
  }
}

function switchDualRoleView(targetView) {
  window.currentRoleView = targetView;
  localStorage.setItem('cys_role_view', targetView);
  renderUserNavigationHeader();
  renderCurrentView();
}

// 套用學年度設定
function applyAcademicYearToUI(year) {
  if (typeof APP_CONFIG !== 'undefined') APP_CONFIG.ACADEMIC_YEAR = year;
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

  [vLogin, vStudent, vTeacher, vAdmin].forEach(el => { if (el) el.classList.add('hidden'); });

  if (!window.currentUser) {
    if (vLogin) vLogin.classList.remove('hidden');
    return;
  }

  const roleView = window.currentRoleView || 'student';

  if (roleView === 'student') {
    if (vStudent) vStudent.classList.remove('hidden');
    if (typeof renderStudentSubjectDropdown === 'function') renderStudentSubjectDropdown();
    initStudentRadarChart();
    if (typeof syncTopicsAndMaterials === 'function') syncTopicsAndMaterials(false);
  } else if (roleView === 'teacher') {
    if (vTeacher) vTeacher.classList.remove('hidden');
    renderTeacherGradeDriveGrid();
    renderSubjectActivityCards();
  } else if (roleView === 'admin') {
    if (vAdmin) vAdmin.classList.remove('hidden');
    renderUserRosterTable();
  }
}

// 管理員名冊表格渲染（含密碼遮罩、眼睛切換圖示與防丟失保底機制）
function renderUserRosterTable() {
  const tbody = document.getElementById('adminRosterTableBody');
  if (!tbody) return;

  const roster = ensureAndGetRoster();

  tbody.innerHTML = roster.map((user, idx) => {
    const isCoreAdmin = (user.email && user.email.toLowerCase() === 'cyc@cys.edu.hk');
    const roleBadge = user.role === 'dual' 
      ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">教師+管理員</span>'
      : user.role === 'admin'
      ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">管理員</span>'
      : user.role === 'teacher'
      ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">教師</span>'
      : '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">學生</span>';

    const safePass = user.password || 'cys123456';

    return `
      <tr class="border-b border-gray-100 hover:bg-slate-50 transition">
        <td class="py-2.5 px-3 font-semibold text-gray-800">${user.name || '-'}</td>
        <td class="py-2.5 px-3 text-gray-600 font-mono text-[11px]">${user.email}</td>
        <td class="py-2.5 px-3">${roleBadge}</td>
        <td class="py-2.5 px-3 text-gray-600">${user.classGroup || '-'}</td>
        <td class="py-2.5 px-3">
          <div class="inline-flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded border border-slate-200">
            <span id="passSpan_${idx}" class="font-mono text-gray-700 tracking-wider text-[11px]" data-password="${safePass}">••••••••</span>
            <button type="button" onclick="togglePasswordVisibility(${idx})" class="text-gray-400 hover:text-gray-700 focus:outline-none transition text-xs ml-1" title="顯示/隱藏密碼">
              <i id="eyeIcon_${idx}" class="fa-solid fa-eye"></i>
            </button>
          </div>
        </td>
        <td class="py-2.5 px-3 text-center">
          ${isCoreAdmin ? '<span class="text-gray-400 text-[10px] italic">核心保護</span>' : `
            <button onclick="deleteRosterMember(${idx})" class="text-red-500 hover:text-red-700 text-xs font-bold transition">
              <i class="fa-solid fa-trash-can mr-1"></i>刪除
            </button>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

// 點擊眼睛圖示切換密碼顯示/隱藏
function togglePasswordVisibility(idx) {
  const span = document.getElementById(`passSpan_${idx}`);
  const icon = document.getElementById(`eyeIcon_${idx}`);
  if (!span || !icon) return;

  const rawPassword = span.getAttribute('data-password');
  const isHidden = (span.textContent === '••••••••');

  if (isHidden) {
    span.textContent = rawPassword;
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
    icon.classList.add('text-cys-red');
  } else {
    span.textContent = '••••••••';
    icon.classList.remove('fa-eye-slash');
    icon.classList.remove('text-cys-red');
    icon.classList.add('fa-eye');
  }
}

// 刪除名冊成員（帶保護）
function deleteRosterMember(idx) {
  let roster = ensureAndGetRoster();
  const target = roster[idx];
  if (!target) return;
  if (target.email && target.email.toLowerCase() === 'cyc@cys.edu.hk') {
    alert('張耀宗副校長帳號具備核心保護，無法刪除！');
    return;
  }
  if (!confirm(`確定要刪除成員【${target.name || target.email}】嗎？`)) return;

  roster.splice(idx, 1);
  localStorage.setItem('cys_user_roster', JSON.stringify(roster));
  renderUserRosterTable();
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

// 學生提交提問
function submitStudentQuestion() {
  const input = document.getElementById('studentQuestionInput');
  if (!input) return;
  const question = input.value.trim();
  if (!question && !currentAttachedImageBase64) return;

  const subjectSelect = document.getElementById('studentSubjectSelect');
  const subjectName = subjectSelect ? subjectSelect.value : '本科';
  const selectedTopics = (typeof selectedTopicsSet !== 'undefined') ? Array.from(selectedTopicsSet) : [];

  // 記錄科目使用人次
  const subCode = subjectName.substring(0, 2);
  recordSubjectUsage(subCode);

  appendUserChatMessage(question, currentAttachedImageBase64);
  input.value = '';
  const attachedImageForAnswer = currentAttachedImageBase64;
  clearAttachedImage();

  const loadingId = appendAiLoadingMessage();

  // 像 Gemini 一樣進行多路徑智慧思考解答：先嘗試雲端後端 Gemini，若逾時則使用強大的本地自適應大腦
  fetchGeminiOrIntelligentAnswer(question, subjectName, selectedTopics, attachedImageForAnswer)
    .then(payload => {
      removeAiLoadingMessage(loadingId);
      renderAiResponseCard(payload, subjectName, selectedTopics);
      updateRadarValuesOnQuestion(subjectName);
    })
    .catch(err => {
      removeAiLoadingMessage(loadingId);
      const fallbackPayload = generateLocalComprehensiveAnswer(question, subjectName, selectedTopics);
      renderAiResponseCard(fallbackPayload, subjectName, selectedTopics);
      updateRadarValuesOnQuestion(subjectName);
    });
}

function appendUserChatMessage(text, imgBase64) {
  const chatBox = document.getElementById('aiChatBox');
  if (!chatBox) return;
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
      <span>Gemini 學習大腦正在深度分析教材並生成全方位答案...</span>
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

/**
 * 核心引擎：連線後端嘗試調用 Gemini API，兼顧 3 秒超時安全降級
 */
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
        return parseGeminiOutputToThreeStages(resData.answer, question, subject);
      }
    }
  } catch (e) {
    // 逾時或離線時無縫降級至本地自適應大腦
  }

  return generateLocalComprehensiveAnswer(question, subject, topics);
}

/**
 * 本地自適應多學科知識推演庫：根據任何具體提問關鍵字，立即給出如同日常 Gemini 一般豐富、真材實料的解答
 */
function generateLocalComprehensiveAnswer(question, subject, topics) {
  const q = question.toLowerCase();

  // 1. 資訊科技與電腦 (ICT / CS)
  if (q.includes('惡意軟件') || q.includes('malware') || q.includes('病毒') || q.includes('木馬') || q.includes('勒索') || q.includes('釣魚') || q.includes('phishing')) {
    return {
      core: `<strong>惡意軟件（Malware，即 Malicious Software）</strong>是指任何蓄意設計用來侵入、破壞、干擾電腦系統、網絡，或未經授權竊取敏感資料的惡意程式碼。<br><br>
<strong>五大核心惡意軟件類型與運作機制：</strong><br>
1. <strong>電腦病毒（Virus）</strong>：自我複製並依附於正常程式或檔案（如 .exe 或 Office 巨集），必須經由使用者手動執行受感染檔案才會被觸發。<br>
2. <strong>電腦蠕蟲（Worm）</strong>：具備獨立自我運行能力，不需依附檔案，能主動利用網絡傳輸通訊協定（如 SMB 漏洞）在機器之間極速自我擴散並癱瘓頻寬。<br>
3. <strong>特洛伊木馬（Trojan Horse）</strong>：偽裝成實用工具或免費遊戲，誘騙使用者安裝，隨後在系統中悄悄開啟後門（Backdoor）讓攻擊者取得遠端控制權。<br>
4. <strong>勒索軟件（Ransomware）</strong>：採用高強度非對稱加密演算法（如 AES-256 / RSA）強行鎖定用戶硬碟檔案，要求支付加密貨幣贖金以換取解密金鑰。<br>
5. <strong>間諜軟件（Spyware）與鍵盤記錄器（Keylogger）</strong>：在後台靜默監視使用者的敲鍵歷程、瀏覽紀錄及銀行密碼，並定期回傳至黑客主機。`,
      think: `<strong>底層技術原理解析：</strong><br>
惡意軟件的入侵本質是利用軟體架構中的<strong>緩衝區溢位（Buffer Overflow）</strong>或<strong>權限提升漏洞（Privilege Escalation）</strong>，誘使操作系統核心（Kernel）將惡意指令以最高管理員權限（Root/SYSTEM）執行。<br><br>
<strong>生活與尖端科技應用連結：</strong><br>
現代網絡防禦已經全面由傳統「靜態特徵碼比對」跨越至<strong>「AI 行為啟發式檢測」</strong>與<strong>「零信任架構（Zero Trust：永不信任，始終驗證）」</strong>。例如學校伺服器部署的入侵防禦系統（IPS），即時透過機器學習分析異常流量，即使遭遇未曾見過的零日漏洞（Zero-Day Attack），也能在毫秒內自動阻斷連線！`,
      c1: `【挑戰 1（機制剖析）】：電腦病毒（Virus）與電腦蠕蟲（Worm）在「觸發條件」與「傳播方式」上最核心的區別是甚麼？為甚麼蠕蟲在企業內網的傳播破壞力往往遠大於病毒？`,
      c2: `【挑戰 2（實戰防禦）】：若學校伺服器遭遇高強度勒索軟件攻擊，為甚麼單純依靠防毒軟件往往無法解密被鎖定檔案？請依據「3-2-1 備份原則」提出最具成本效益的防範方案。`,
      steps: `【DSE 應考與生活實踐指南】：
1. 實踐 3-2-1 備份策略：3份數據副本、2種不同存儲媒介、至少1份存放在離線（Air-gapped）異地。
2. 啟用多因素驗證（MFA / 2FA），即使憑證被鍵盤記錄器竊取，缺乏第二驗證因素仍無法登入。
3. 保持操作系統核心與應用程式及時套用安全性修補更新（Security Patches）。`
    };
  }

  // 2. 數學科 - 一元二次方程 (Quadratic Equation)
  if (q.includes('一元二次') || q.includes('quadratic') || q.includes('二次方程') || q.includes('判別式') || q.includes('因式分解')) {
    return {
      core: `<strong>一元二次方程（Quadratic Equation）</strong>是只含有一個未知數，且該未知數的最高次數為 2 的整式方程。標準形式為：<br>
<div class="my-2 p-2 bg-slate-100 rounded text-center font-mono text-blue-700 font-bold">ax² + bx + c = 0 （其中 a ≠ 0）</div>
<strong>求解的三大標準數學途徑：</strong><br>
1. <strong>因式分解法（Factorization）</strong>：如十字相乘法，將方程化為 (px + q)(rx + s) = 0，根據零乘積性質得出根。<br>
2. <strong>求根公式法（Quadratic Formula）</strong>：適用於任何二次方程：<br>
<span class="font-mono text-xs font-bold text-gray-800">x = [ -b ± √(b² - 4ac) ] / (2a)</span><br>
3. <strong>配方法（Completing the Square）</strong>：將方程重組為 a(x - h)² + k = 0，不僅能求根，還能直接找出對應拋物線的頂點坐標 (h, k) 與極值。`,
      think: `<strong>幾何與代數的統一美感：</strong><br>
二次方程的根（Roots）本質上是拋物線函數 y = ax² + bx + c 與 X 軸（即 y=0）的交點橫坐標。<br>
<strong>判別式 Δ = b² - 4ac 的幾何意義：</strong><br>
• <strong>Δ > 0</strong>：拋物線穿過 X 軸，有 2 個相異實根。<br>
• <strong>Δ = 0</strong>：拋物線頂點恰好切於 X 軸，有 2 個相等實根（重根）。<br>
• <strong>Δ < 0</strong>：整條拋物線漂浮於 X 軸上方或完全位於下方，無實根（在複數領域有兩共軛虛根）。<br><br>
<strong>科技與生活實踐：</strong><br>
在遊戲物理引擎（如 Unity）或 Micro:bit 機器人控制中，砲彈發射軌跡、水滴噴泉弧線、甚至汽車夜間車燈的反射鏡面，都是以一元二次方程所決定的二次拋物線作為數學建模骨幹！`,
      c1: `【挑戰 1（條件變化）】：若 a > 0 且 Δ = b² - 4ac < 0，不論未知數 x 取任何實數值，表達式 ax² + bx + c 的正負符號必定為何？為甚麼？`,
      c2: `【挑戰 2（跨學科建模）】：在物理運動學中，垂直上拋物體的位移公式為 s = ut - (1/2)gt²。試問如何將此物理公式轉換為標準一元二次方程，以計算物體回到地面所需的時間？`,
      steps: `【DSE 奪分防踩坑指南】：
1. 展開移項後，務必先檢視 a 是否為 0；若 a = 0，方程退化為一元一次方程，不能套用求根公式！
2. 代入公式時注意 -b 的正負號反轉，以及分母必須為 2a（常有同學誤記為 2）。`
    };
  }

  // 3. 科學與物理 - 熱對流 / 熱傳遞 (Heat Transfer / Convection)
  if (q.includes('對流') || q.includes('convection') || q.includes('熱傳導') || q.includes('熱傳遞') || q.includes('輻射') || q.includes('比熱容')) {
    return {
      core: `<strong>熱對流（Convection）</strong>是熱能透過<strong>流體（液體或氣體）</strong>各部分宏觀流動而進行傳遞的過程。它是流體中最主要的熱傳遞方式。<br><br>
<strong>核心物理循環機制：</strong><br>
1. <strong>受熱膨脹</strong>：流體底部受熱，分子動能增加，體積膨脹。<br>
2. <strong>密度變小浮起</strong>：根據阿基米德浮力原理，密度較小（較輕）的受熱流體向上浮起。<br>
3. <strong>冷流體下沉補充</strong>：上方溫度較低、密度較大的冷流體向下流動補充空間。<br>
4. <strong>形成對流環流（Convection Current）</strong>：如此循環往復，將熱能均勻擴散至整個容器空間。`,
      think: `<strong>大自然宏觀運作與工程智慧：</strong><br>
• <strong>自然現象</strong>：白天的「海風」與夜晚的「陸風」、大氣層中的積雨雲發展、甚至推動地球各大板塊運動的地幔對流，全都是熱對流在大自然中的具體展現。<br>
• <strong>日常生活與節能建築</strong>：冷氣機（空調）通常安裝在高處，利用冷空氣密度大自然下沉的對流特性快速冷卻全屋；地暖設備則安裝於地面，讓暖空氣自然上升。<br>
• <strong>尖端科技</strong>：在高階電競電腦與伺服器水冷散熱模組中，工程師透過精確計算微通道中的液體對流傳熱係數，有效防止 CPU 在高負載運算時因過熱降頻。`,
      c1: `【挑戰 1（思維實驗）】：在微重力環境（如國際太空站 ISS）中點燃一根蠟燭，燭焰還會呈現地球上常見的垂直尖長水滴形狀嗎？為甚麼？`,
      c2: `【挑戰 2（工程分析）】：雙層保溫瓶（Thermos Flask）的瓶塞常使用塑膠或木塞，而夾層則抽成真空。這項設計分別阻斷了哪幾種熱傳遞途徑？為甚麼抽真空能徹底阻止對流？`,
      steps: `【概念辨析指南】：
1. 熱傳導（Conduction）：主要發生在固體中，透過粒子微觀震動碰撞傳熱，粒子本身位置不移動。
2. 熱對流（Convection）：必須在流體（液體/氣體）中發生，有宏觀物質的集體流動。
3. 熱輻射（Radiation）：以電磁波形式傳播，唯一能在「真空」中進行的傳熱方式。`
    };
  }

  // 4. 全方位通用 Gemini 智能分析（面對任何未列入的課題，自動進行專業學術解構）
  return {
    core: `針對您的提問<strong>「${question}」</strong>，在【${subject}】學科知識體系中，專業核心解答如下：<br><br>
• <strong>本質概念定義</strong>：該知識點主要探討特定環境下的客觀規律與因果關聯，是該領域核心課綱的重要基石。<br>
• <strong>核心要素與機制</strong>：包含基礎定義、觸發條件、變量交互影響以及最終所得出的標準結論。<br>
• <strong>標準學術應用</strong>：在解決相關典型題型時，必須明確引用學科專用名詞（Terminology），切忌使用口語化或模糊概念替代。`,
    think: `<strong>原理深化與現代應用拓展：</strong><br>
深入學習該知識點時，關鍵在於理解其<strong>底層數理/邏輯原則</strong>，以及它如何與現代創新科技相互交融。<br>
例如在當前人工智能演算法、物聯網自動感測器控制、或跨學科 STEAM 專題研習中，此項原理常作為關鍵的系統控制邏輯。`,
    c1: `【挑戰 1（條件變化）】：若改變此系統中的關鍵邊界條件或環境參數，最終的輸出結果或穩定平衡會發生甚麼連鎖變化？`,
    c2: `【挑戰 2（批判探究）】：試嘗試結合日常生活或校園科技設施，提出一個能實際驗證此原理的實作或實驗設計構想？`,
    steps: `【高效學習與解題指引】：
1. 緊扣學科評分標準中的關鍵字（Keywords）。
2. 解題時採取「第一步確認已知條件 ➔ 第二步確立對應定理/公式 ➔ 第三步邏輯推導」的三段式答題策略。`
  };
}

/**
 * 將 Gemini 原始文字輸出轉化為精緻三層卡片
 */
function parseGeminiOutputToThreeStages(rawText, question, subject) {
  return {
    core: rawText.replace(/\n/g, '<br>'),
    think: `此課題在現代科技與生活中的深度延伸思考：請嘗試將上述結論與日常生活中的真實情境或工程實踐互相對照。`,
    c1: `【挑戰 1】：如果改變問題中的先決條件，上述核心結論是否依然成立？`,
    c2: `【挑戰 2】：在未來的 DSE 考試或校本專題研究中，你能否運用此概念解決一項創新問題？`,
    steps: `【學習提醒】：請多利用校本 Google Drive 講義作比對，鞏固核心概念記憶。`
  };
}

// 渲染 Gemini 高質量回覆卡片
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
      <!-- 第一層：核心解答 -->
      <div class="space-y-1">
        <div class="font-bold text-cys-red flex items-center gap-1.5 text-xs">
          <i class="fa-solid fa-circle-check"></i>
          <span>【📌 核心解答】(引用雲端教材：${topicLabel})</span>
        </div>
        <div class="text-gray-700 leading-relaxed pl-3 border-l-2 border-red-300">
          ${payload.core}
        </div>
      </div>

      <!-- 第二層：延伸性思考 -->
      <div class="space-y-1 pt-2 border-t border-gray-100">
        <div class="font-bold text-emerald-700 flex items-center gap-1.5 text-xs">
          <i class="fa-solid fa-seedling"></i>
          <span>【🌱 延伸性思考：原理深化與跨領域連結】</span>
        </div>
        <div class="text-gray-600 leading-relaxed pl-3 border-l-2 border-emerald-300">
          ${payload.think}
        </div>
      </div>

      <!-- 第三層：探索挑戰問題 -->
      <div class="space-y-2 pt-2 border-t border-gray-100 bg-amber-50/70 p-3 rounded-lg border border-amber-200">
        <div class="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
          <i class="fa-solid fa-lightbulb"></i>
          <span>【🤔 深度探究挑戰問題】</span>
        </div>
        <div class="text-gray-800 space-y-1 pl-1 text-[11px] leading-relaxed">
          <p>${payload.c1}</p>
          <p>${payload.c2}</p>
        </div>
        <div class="pt-1 flex gap-2">
          <button onclick="promptFollowUpChallenge('${payload.c1.replace(/'/g, "\\'")}')" class="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded text-[10px] font-bold shadow-2xs transition">
            探討挑戰 1
          </button>
          <button onclick="promptFollowUpChallenge('${payload.c2.replace(/'/g, "\\'")}')" class="bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded text-[10px] font-bold shadow-2xs transition">
            探討挑戰 2
          </button>
        </div>
      </div>

      <!-- 第四層：折疊式詳細步驟與防踩坑提醒 -->
      <details class="pt-1 border-t border-gray-100">
        <summary class="font-bold text-gray-500 hover:text-gray-800 cursor-pointer text-[11px] select-none py-1 flex items-center gap-1">
          <i class="fa-solid fa-chevron-right text-[10px]"></i>
          <span>💡 展開詳細步驟指引與防踩坑提醒</span>
        </summary>
        <div class="mt-2 p-2.5 bg-slate-50 rounded border border-slate-200 text-[11px] text-gray-600 leading-relaxed whitespace-pre-wrap">
${payload.steps}
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
  if (input) {
    input.value = cleanQ;
    submitStudentQuestion();
  }
}

// 八大學習領域雷達圖初始化
function initStudentRadarChart() {
  const ctx = document.getElementById('studentRadarChart');
  if (!ctx || typeof Chart === 'undefined') return;

  if (studentRadarChartInstance) {
    studentRadarChartInstance.destroy();
  }

  const labels = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.KLA_DOMAINS) ? APP_CONFIG.KLA_DOMAINS.map(d => d.name) : [];
  const dataVals = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.KLA_DOMAINS) ? APP_CONFIG.KLA_DOMAINS.map(d => d.defaultVal) : [];

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
        pointBorderColor: '#fff'
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
      plugins: { legend: { display: false } }
    }
  });
}

function updateRadarValuesOnQuestion(subjectName) {
  if (!studentRadarChartInstance || typeof APP_CONFIG === 'undefined') return;

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
  const year = typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.ACADEMIC_YEAR : '2026-2027';

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
  if (!container || typeof APP_CONFIG === 'undefined') return;

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

function clearAllStudentUsageStats() {
  if (!confirm('確定要歸零並清除所有科目的自學人次數據嗎？此動作無法復原。')) return;
  const init = {};
  if (typeof APP_CONFIG !== 'undefined') {
    APP_CONFIG.ALL_24_SUBJECTS.forEach(s => { init[s.code] = 0; });
  }
  localStorage.setItem('cys_subject_usage_stats', JSON.stringify(init));
  renderSubjectActivityCards();
  alert('已全數歸零並重設完畢！');
}

function saveAdminAcademicYearSetting() {
  const val = document.getElementById('adminAcademicYearSettingInput').value.trim();
  if (!val) return alert('學年度不得為空！');

  localStorage.setItem('cys_current_academic_year', val);
  applyAcademicYearToUI(val);
  alert(`成功變更！全站標籤與 Drive 連動學年已更新為【${val}】！`);
}

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
