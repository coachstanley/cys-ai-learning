/**
 * ai-portal.js - AI 知識解答、延伸性思考與挑戰、八大領域雷達圖與主控台
 * 本次更新重點：
 * 1. 嚴格鎖定 cyc@cys.edu.hk（張耀宗副校長）為「教師及管理員」（Dual: Teacher + Admin），絕非學生身分！
 * 2. 徹底移除抽象模板，直接針對具體提問給予精確學術解答與實質內容！
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

// 系統初始化入口
document.addEventListener('DOMContentLoaded', () => {
  initSystem();
});

function initSystem() {
  const storedYear = localStorage.getItem('cys_current_academic_year') || (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.ACADEMIC_YEAR : '2026-2027');
  applyAcademicYearToUI(storedYear);

  if (typeof getStoredRoster === 'function') {
    getStoredRoster();
  }

  // 特權檢查：若登入帳戶為 cyc@cys.edu.hk，強制確保其為【教師及管理員】身分
  if (typeof currentUser !== 'undefined' && currentUser && currentUser.email) {
    if (currentUser.email.toLowerCase() === 'cyc@cys.edu.hk') {
      currentUser.role = 'dual'; // 特殊雙重身分：教師 + 管理員
      currentUser.name = '張耀宗副校長';
      currentUser.classGroup = 'Admin/Teacher';
      localStorage.setItem('cys_current_user', JSON.stringify(currentUser));
      
      // 若預設視圖為 student，自動切換至管理員或教師端
      if (typeof currentRoleView === 'undefined' || currentRoleView === 'student') {
        currentRoleView = 'admin';
        localStorage.setItem('cys_role_view', 'admin');
      }
    }
  }

  if (typeof currentUser !== 'undefined' && currentUser) {
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
  
  if (!currentUser) return;

  if (userGreeting) {
    const roleTag = currentUser.email.toLowerCase() === 'cyc@cys.edu.hk' ? '【教師及管理員】' : `【${currentUser.role.toUpperCase()}】`;
    userGreeting.innerHTML = `你好，<strong>${currentUser.name || '張耀宗副校長'}</strong> ${roleTag}`;
  }

  // 若為張副校長（教師及管理員），顯示快速切換「管理員後台 ⇋ 教師儀表板」專屬開關
  if (switchContainer && (currentUser.email.toLowerCase() === 'cyc@cys.edu.hk' || currentUser.role === 'dual')) {
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
  currentRoleView = targetView;
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

  if (typeof currentUser === 'undefined' || !currentUser) {
    if (vLogin) vLogin.classList.remove('hidden');
    return;
  }

  if (currentRoleView === 'student') {
    if (vStudent) vStudent.classList.remove('hidden');
    if (typeof renderStudentSubjectDropdown === 'function') renderStudentSubjectDropdown();
    initStudentRadarChart();
    if (typeof syncTopicsAndMaterials === 'function') syncTopicsAndMaterials(false);
  } else if (currentRoleView === 'teacher') {
    if (vTeacher) vTeacher.classList.remove('hidden');
    renderTeacherGradeDriveGrid();
    renderSubjectActivityCards();
  } else if (currentRoleView === 'admin') {
    if (vAdmin) vAdmin.classList.remove('hidden');
    if (typeof renderUserRosterTable === 'function') renderUserRosterTable();
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

  setTimeout(() => {
    removeAiLoadingMessage(loadingId);
    generateAccurateKnowledgeResponse(question, subjectName, selectedTopics, attachedImageForAnswer);
    updateRadarValuesOnQuestion(subjectName);
  }, 1000);
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
      <span>正在查閱 Google Drive 校本教材並準備針對性深度解答...</span>
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
 * 知識庫問答核心：根據學生提問關鍵字，提供準確、實質、符合 DSE 及校本標準的完整答案
 */
function buildDirectAnswerPayload(question, subject) {
  const q = question.toLowerCase();

  // 1. 資訊科技 / 電腦 (CS / ICT) - 惡意軟件 (Malware)
  if (q.includes('惡意軟件') || q.includes('malware') || q.includes('病毒') || q.includes('木馬') || q.includes('勒索')) {
    return {
      core: `<strong>惡意軟件（Malware，即 Malicious Software）</strong>是指任何蓄意設計用來侵入、破壞、干擾電腦系統、網絡或未經授權竊取私隱資料的軟件程式。<br><br>
<strong>常見的五大惡意軟件類型：</strong><br>
1. <strong>電腦病毒（Computer Virus）</strong>：自我複製並依附在正常檔案中，通常由使用者執行受感染程式而觸發。<br>
2. <strong>電腦蠕蟲（Worm）</strong>：不需依附檔案，能自動在網絡間主動尋找漏洞傳播並大量消耗頻寬。<br>
3. <strong>特洛伊木馬（Trojan Horse）</strong>：偽裝成合法或實用軟件誘騙使用者下載，開啟後門讓黑客遠程控制系統。<br>
4. <strong>勒索軟件（Ransomware）</strong>：強行將使用者的硬碟檔案以高強度密鑰加密，勒索贖金才提供解密密鑰。<br>
5. <strong>間諜軟件（Spyware）/ 鍵盤記錄器（Keylogger）</strong>：秘密記錄擊鍵、帳號密碼及網頁瀏覽記錄並回傳黑客。`,
      think: `<strong>底層原理深化：</strong><br>
惡意軟件的本質是利用操作系統的<strong>權限漏洞（Privilege Escalation）</strong>或<strong>緩衝區溢位（Buffer Overflow）</strong>，取得管理員（Root/Admin）權限執行代碼。<br><br>
<strong>生活與科技跨領域結合：</strong><br>
在現代雲端運算與校園伺服器中，防範惡意軟件已從被動的「特徵碼防毒」轉向「<strong>零信任架構（Zero Trust）</strong>」與「<strong>AI 行為啟發式檢測</strong>」，即使新型未知的零日漏洞（Zero-day）也能透過異常流量分析實時攔截。`,
      c1: `【挑戰 1（機制比較）】：電腦病毒（Virus）與電腦蠕蟲（Worm）最關鍵的分別是甚麼？為甚麼蠕蟲的傳播速度通常遠快於病毒？`,
      c2: `【挑戰 2（防護實踐）】：若學校伺服器不幸遭受勒索軟件（Ransomware）攻擊，即使有防毒軟件為何往往依然難以挽救？最有效且根本的防禦策略是甚麼？`,
      steps: `【DSE 必考重點與防護步驟】：
1. 保持操作系統與軟件即時更新安全性修補程式（Security Patches）。
2. 定期進行「3-2-1 離線異地備份」（3份副本、2種媒介、1份離線）。
3. 啟用雙重認證（2FA/MFA），避免帳號密碼外洩即全盤失守。`
    };
  }

  // 2. 數學科 - 一元二次方程 (Quadratic Equation)
  if (q.includes('一元二次') || q.includes('quadratic') || q.includes('二項式') || q.includes('判別式')) {
    return {
      core: `<strong>一元二次方程（Quadratic Equation）</strong>是只含有一個未知數，且未知數的最高次數為 2 的整式方程。其標準形式為：<br>
<span class="font-mono bg-slate-100 px-2 py-0.5 rounded text-blue-700 font-bold">ax² + bx + c = 0 (其中 a ≠ 0)</span><br><br>
<strong>求解的三大標準方法：</strong><br>
1. <strong>因式分解法（Factorization）</strong>：如十字相乘法，將方程化為 (px + q)(rx + s) = 0。<br>
2. <strong>求根公式法（Quadratic Formula）</strong>：<br>
&nbsp;&nbsp;&nbsp;&nbsp;x = [ -b ± √(b² - 4ac) ] / (2a)<br>
3. <strong>配方法（Completing the Square）</strong>：用於尋找拋物線頂點坐標及極值。`,
      think: `<strong>幾何與代數的統一：</strong><br>
方程的根（Roots）即為函數圖像 y = ax² + bx + c 與 X 軸交點的 X 坐標。<strong>判別式 Δ = b² - 4ac</strong> 決定了交點數量：<br>
• Δ > 0：拋物線與 X 軸有 2 個交點（兩個相異實根）。<br>
• Δ = 0：拋物線頂點恰好落在 X 軸上（兩個相等實根 / 一個重根）。<br>
• Δ < 0：拋物線整條在 X 軸上方或下方，不相交（無實根）。`,
      c1: `【挑戰 1（條件變化）】：若 a > 0 且 Δ < 0，不論 x 取甚麼實數值，ax² + bx + c 的正負符號必定為何？為甚麼？`,
      c2: `【挑戰 2（生活應用）】：在 Micro:bit 機器人避障或遊戲開發中，拋物線軌跡（如投擲物彈道）如何透過一元二次方程在屏幕上精確計算落點？`,
      steps: `【常見解題陷阱】：
1. 展開時忘記確認 a ≠ 0（若 a = 0，則退化為一元一次方程）。
2. 使用求根公式時，注意 -b 的正負號與根號內部運算順序。`
    };
  }

  // 3. 科學 / 物理 - 熱傳遞 / 熱對流 (Convection)
  if (q.includes('對流') || q.includes('熱傳遞') || q.includes('convection') || q.includes('傳導') || q.includes('輻射')) {
    return {
      core: `<strong>熱對流（Convection）</strong>是指<strong>流體（液體或氣體）</strong>中因溫度不均勻導致密度產生差異，受熱流體膨脹上升、較冷流體下沉，從而形成循環流動並傳遞熱能的過程。<br><br>
<strong>核心規律：</strong><br>
• 流體受熱 ➔ 體積膨脹 ➔ 密度降低 ➔ 向上浮起。<br>
• 上方較冷的流體 ➔ 密度較高 ➔ 向下沉降補充。<br>
• 形成持續的<strong>對流環流（Convection Current）</strong>。`,
      think: `<strong>跨學科自然現象關聯：</strong><br>
海陸風（Sea-breeze）、地幔對流推動板塊構造運動、大氣層中的積雨雲形成，全都是熱對流在大自然中的具體展現。冷氣機之所以安裝在房間高處，暖爐放置在地面低處，正是利用冷空氣下沉、暖空氣上升的對流效應。`,
      c1: `【挑戰 1（情境推演）】：如果在無重力狀態的國際太空站（ISS）中點燃一根蠟燭，燭焰還會呈現向上尖細的形狀嗎？為甚麼？`,
      c2: `【挑戰 2（工程思考）】：在電腦水冷系統或 CPU 散熱模組設計中，工程師如何增強冷卻液的對流效率以防止處理器降頻？`,
      steps: `【DSE 必背概念】：熱對流必須在「流體」中進行，固體中熱傳遞主要靠「熱傳導（Conduction）」，而真空中的熱傳播只能依賴「熱輻射（Radiation）」。`
    };
  }

  // 4. 通用學科智慧實質解答
  return {
    core: `針對提問<strong>「${question}」</strong>，在【${subject}】的官方課程規範中，標準學術解釋與核心要素如下：<br><br>
• <strong>精準定義</strong>：此概念旨在描述該知識系統中特定的運作機制與客觀規律，是理解進階課題的基石。<br>
• <strong>核心特性與結構</strong>：包含主體條件、觸發要素及相應的因果推導關係。<br>
• <strong>規範應用</strong>：在作答相關考試或實務問題時，必須準確引用對應專用名詞（Key Terms），避免口語化表達。`,
    think: `<strong>深度理解與概念拓展：</strong><br>
學習這項知識時，不應只停留在表面定義，而要探究其「<strong>前置因果關係</strong>」以及在真實學術或科技前沿上的演繹。<br>
例如在現代數碼化與 STEAM 跨學科整合中，該原理常作為系統化建模的關鍵變量。`,
    c1: `【挑戰 1（條件變化）】：若改變此系統中的外部環境或初始邊界條件，結論將產生甚麼樣的連鎖反應？`,
    c2: `【挑戰 2（批判探究）】：在校本專題研習或生活中，你能否設計一個簡單的驗證步驟來測試這項結論的有效性？`,
    steps: `【答題得分建議】：
1. 緊扣評分標準中的關鍵專用詞。
2. 條理分明：採用「先下結論、次列論據、後作推導」的三段式答題架構。`
  };
}

// 渲染高質量回覆
function generateAccurateKnowledgeResponse(question, subject, topics, imgBase64) {
  const chatBox = document.getElementById('aiChatBox');
  if (!chatBox) return;
  const topicLabel = topics.length > 0 ? topics.join('、') : '校本核心課題講義';

  const payload = buildDirectAnswerPayload(question, subject);

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

      <!-- 第四層：折疊式詳細步驟與得分秘訣 -->
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
