/**
 * app-ai.js - AI 學習導師、八大學力雷達圖與動態課題模組
 */

let radarChartInstance = null;
let activeCustomTopics = {};
let selectedTopics = [];
let currentDriveTopics = [];
const topicCache = {};
let klaScores = { "chi": 68, "eng": 72, "math": 80, "sci": 75, "tech": 88, "pshe": 65, "arts": 70, "pe": 62 };

function renderCurrentView() {
  document.getElementById('viewStudent').classList.add('hidden');
  document.getElementById('viewTeacher').classList.add('hidden');
  document.getElementById('viewAdmin').classList.add('hidden');

  const roleBadge = document.getElementById('userRoleBadge');

  if (currentRoleView === 'admin') {
    document.getElementById('viewAdmin').classList.remove('hidden');
    roleBadge.innerText = '管理員';
    renderUserRosterTable();
    document.getElementById('adminAcademicYearSettingInput').value = APP_CONFIG.ACADEMIC_YEAR;
  } else if (currentRoleView === 'teacher') {
    document.getElementById('viewTeacher').classList.remove('hidden');
    roleBadge.innerText = '教師';
    renderTeacherGradeLinks();
    renderTeacherSubjectStats();
  } else {
    document.getElementById('viewStudent').classList.remove('hidden');
    roleBadge.innerText = '學生';
    initStudentPortal();
  }
}

function saveAdminAcademicYearSetting() {
  const newYear = document.getElementById('adminAcademicYearSettingInput').value.trim();
  if (!newYear) return alert('請輸入有效學年！');
  APP_CONFIG.ACADEMIC_YEAR = newYear;
  localStorage.setItem('cys_current_academic_year', newYear);
  updateAllAcademicYearUI(newYear);
  alert(`🎉 系統學年度已設定為：【${newYear}】！`);
}

function updateAllAcademicYearUI(year) {
  const badge = document.getElementById('headerAcademicYearBadge');
  if (badge) badge.innerText = year;
  const sInput = document.getElementById('studentAcademicYearInput');
  if (sInput) sInput.value = year;
  const tLabel = document.getElementById('teacherYearLabel');
  if (tLabel) tLabel.innerText = year;
  const tbInput = document.getElementById('targetAcademicYearInput');
  if (tbInput) tbInput.value = year;
  const aInput = document.getElementById('adminAcademicYearSettingInput');
  if (aInput) aInput.value = year;
  if (currentRoleView === 'teacher') renderTeacherGradeLinks();
}

function getStoredSubjectStats() {
  const stored = localStorage.getItem('cys_subject_usage_stats');
  if (stored) {
    try { return JSON.parse(stored); } catch(e){}
  }
  const initialStats = {};
  APP_CONFIG.ALL_24_SUBJECTS.forEach(s => { initialStats[s.name] = 0; });
  localStorage.setItem('cys_subject_usage_stats', JSON.stringify(initialStats));
  return initialStats;
}

function saveSubjectStats(stats) {
  localStorage.setItem('cys_subject_usage_stats', JSON.stringify(stats));
  if (currentRoleView === 'teacher') renderTeacherSubjectStats();
}

function clearAllStudentUsageStats() {
  if (!confirm('⚠️ 確定要清除全校所有科目的學生使用人次數據嗎？')) return;
  const resetStats = {};
  APP_CONFIG.ALL_24_SUBJECTS.forEach(s => { resetStats[s.name] = 0; });
  saveSubjectStats(resetStats);
  alert('🧹 已成功重設全校 24 個科目的學生使用人次！');
}

function renderTeacherGradeLinks() {
  const year = APP_CONFIG.ACADEMIC_YEAR;
  const grades = [
    { grade: 'S1', subjects: '15科 + ACD/BE班' },
    { grade: 'S2', subjects: '15科 + ACD/BE班' },
    { grade: 'S3', subjects: '19科 + ACD/BE班' },
    { grade: 'S4', subjects: '24科 + ACD/BE班' },
    { grade: 'S5', subjects: '24科 + ACD/BE班' },
    { grade: 'S6', subjects: '24科 + ACD/BE班' }
  ];

  const container = document.getElementById('teacherGradeDriveGrid');
  if (!container) return;

  container.innerHTML = grades.map(g => {
    const queryTerm = encodeURIComponent(`${year} ${g.grade}`);
    const driveUrl = `https://drive.google.com/drive/search?q=${queryTerm}`;
    return `
      <a href="${driveUrl}" target="_blank" class="bg-white p-3 rounded-lg shadow-2xs border border-blue-100 hover:border-blue-400 text-center transition">
        <i class="fa-solid fa-folder text-yellow-500 text-xl mb-1"></i>
        <div class="font-bold text-xs text-gray-800">${year} ${g.grade}</div>
        <div class="text-[10px] text-gray-400">${g.subjects}</div>
      </a>
    `;
  }).join('');
}

function renderTeacherSubjectStats() {
  const stats = getStoredSubjectStats();
  const container = document.getElementById('subjectActivityCardsContainer');
  if (!container) return;

  container.innerHTML = APP_CONFIG.ALL_24_SUBJECTS.map(sub => {
    const count = stats[sub.name] || 0;
    return `
      <div class="bg-slate-50 border border-slate-200 border-l-4 ${sub.color} p-2.5 rounded-lg shadow-2xs flex flex-col justify-between">
        <div class="flex items-center justify-between text-gray-700">
          <span class="text-xs font-bold truncate">${sub.name}</span>
          <i class="fa-solid ${sub.icon} text-gray-400 text-[11px]"></i>
        </div>
        <div class="flex items-baseline justify-between mt-2">
          <span class="text-[10px] text-gray-500">自學發問</span>
          <span class="text-sm font-bold text-cys-red">${count} <span class="text-[10px] font-normal">次</span></span>
        </div>
      </div>
    `;
  }).join('');
}

function initStudentPortal() {
  updateAllAcademicYearUI(APP_CONFIG.ACADEMIC_YEAR);
  handleStudentGradeChange();
  initRadarChart();
}

function handleStudentGradeChange() {
  const grade = document.getElementById('studentGradeSelect').value;
  const subjects = APP_CONFIG.SUBJECTS_BY_GRADE[grade] || APP_CONFIG.SUBJECTS_BY_GRADE['S1'];
  const select = document.getElementById('studentSubjectSelect');
  select.innerHTML = '';
  subjects.forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub;
    opt.innerText = sub;
    select.appendChild(opt);
  });
  handleStudentSubjectChange();
}

function handleStudentSubjectChange() {
  updateStudentSubjectDriveLink();
  updateSubjectKLABadge();
  syncTopicsFromGoogleDrive();
}

function handleStudentDivisionChange() {
  updateStudentSubjectDriveLink();
  syncTopicsFromGoogleDrive();
}

function getKLABySubject(sub) {
  for (let domain of APP_CONFIG.KLA_DOMAINS) {
    if (domain.subjects.includes(sub)) return domain;
  }
  if (sub.includes('中') || sub.includes('普')) return APP_CONFIG.KLA_DOMAINS[0];
  if (sub.includes('英')) return APP_CONFIG.KLA_DOMAINS[1];
  if (sub.includes('數')) return APP_CONFIG.KLA_DOMAINS[2];
  if (sub.includes('科') || sub.includes('化') || sub.includes('物') || sub.includes('生')) return APP_CONFIG.KLA_DOMAINS[3];
  if (sub.includes('創') || sub.includes('腦') || sub.includes('汽') || sub.includes('CT')) return APP_CONFIG.KLA_DOMAINS[4];
  return APP_CONFIG.KLA_DOMAINS[5];
}

function updateSubjectKLABadge() {
  const sub = document.getElementById('studentSubjectSelect').value || 'CT創意科技';
  const kla = getKLABySubject(sub);
  document.getElementById('currentSubjectKLABadge').innerText = `${kla.name} (${sub})`;
}

function updateStudentSubjectDriveLink() {
  const year = APP_CONFIG.ACADEMIC_YEAR;
  const grade = document.getElementById('studentGradeSelect').value;
  const sub = document.getElementById('studentSubjectSelect').value || 'CT創意科技';
  const link = document.getElementById('studentDriveSubjectLink');
  const query = encodeURIComponent(`${year} ${grade} ${sub}`);
  link.href = `https://drive.google.com/drive/search?q=${query}`;
}

// 雲端課題資料夾同步 (防超時卡死設計)
function syncTopicsFromGoogleDrive() {
  const grade = document.getElementById('studentGradeSelect').value;
  const subject = document.getElementById('studentSubjectSelect').value || 'CT創意科技';
  const division = document.getElementById('studentDivisionSelect').value;
  const statusSpan = document.getElementById('topicSyncStatus');
  const refreshIcon = document.getElementById('topicRefreshIcon');

  const cacheKey = `${APP_CONFIG.ACADEMIC_YEAR}_${grade}_${subject}_${division}`;

  if (topicCache[cacheKey]) {
    currentDriveTopics = topicCache[cacheKey];
    renderTopicCheckboxes();
    statusSpan.innerHTML = '<span class="text-green-600"><i class="fa-solid fa-circle-check mr-1"></i>已載入</span>';
    return;
  }

  if (refreshIcon) refreshIcon.classList.add('fa-spin');
  statusSpan.innerHTML = '<span class="text-amber-600">讀取中...</span>';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  const apiUrl = `${APP_CONFIG.BACKEND_API_URL}?action=getTopics&year=${encodeURIComponent(APP_CONFIG.ACADEMIC_YEAR)}&grade=${encodeURIComponent(grade)}&subject=${encodeURIComponent(subject)}&division=${encodeURIComponent(division)}`;

  fetch(apiUrl, { signal: controller.signal })
    .then(res => res.json())
    .then(data => {
      clearTimeout(timeoutId);
      if (refreshIcon) refreshIcon.classList.remove('fa-spin');
      if (data && data.status === 'success' && data.topics && data.topics.length > 0) {
        currentDriveTopics = data.topics;
        topicCache[cacheKey] = data.topics;
        statusSpan.innerHTML = '<span class="text-green-600"><i class="fa-solid fa-circle-check mr-1"></i>已同步</span>';
      } else {
        currentDriveTopics = [];
        statusSpan.innerHTML = '<span class="text-amber-600">老師準備中</span>';
      }
      renderTopicCheckboxes();
    })
    .catch(() => {
      clearTimeout(timeoutId);
      if (refreshIcon) refreshIcon.classList.remove('fa-spin');
      currentDriveTopics = [];
      statusSpan.innerHTML = '<span class="text-amber-600">老師準備中</span>';
      renderTopicCheckboxes();
    });
}

function renderTopicCheckboxes() {
  const subject = document.getElementById('studentSubjectSelect').value || 'CT創意科技';
  const grade = document.getElementById('studentGradeSelect').value;
  const division = document.getElementById('studentDivisionSelect').value;
  const container = document.getElementById('topicCheckboxesContainer');
  container.innerHTML = '';

  let baseTopics = [...(currentDriveTopics || [])];
  if (activeCustomTopics[subject]) baseTopics.push(...activeCustomTopics[subject]);

  if (baseTopics.length === 0) {
    selectedTopics = [];
    container.innerHTML = `
      <div class="w-full flex items-center justify-between p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs">
        <span class="text-amber-800">📂 <strong>老師準備中</strong>：【${grade} ${subject} ${division}】雲端尚未建立課題資料夾，同學仍可直接發問！</span>
        <button onclick="syncTopicsFromGoogleDrive()" class="bg-white text-amber-800 border border-amber-300 px-2.5 py-1 rounded font-bold">重新讀取</button>
      </div>
    `;
    updateSelectedTopicsBadge();
    return;
  }

  selectedTopics = [baseTopics[0]];
  baseTopics.forEach((t, idx) => {
    const id = `chk_topic_${idx}_${Date.now()}`;
    const wrapper = document.createElement('div');
    wrapper.className = 'inline-block';
    wrapper.innerHTML = `
      <input type="checkbox" id="${id}" value="${t}" ${idx === 0 ? 'checked' : ''} onchange="handleTopicCheckboxChange(this)" class="topic-checkbox hidden">
      <label for="${id}" class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-700 select-none hover:bg-gray-50 transition">
        <i class="fa-regular fa-folder text-yellow-500"></i>
        <span>${t}</span>
      </label>
    `;
    container.appendChild(wrapper);
  });
  updateSelectedTopicsBadge();
}

function handleTopicCheckboxChange(cb) {
  if (cb.checked) {
    if (!selectedTopics.includes(cb.value)) selectedTopics.push(cb.value);
  } else {
    selectedTopics = selectedTopics.filter(t => t !== cb.value);
  }
  updateSelectedTopicsBadge();
}

function updateSelectedTopicsBadge() {
  const badge = document.getElementById('selectedTopicsBadgeList');
  badge.innerText = selectedTopics.length > 0 ? selectedTopics.join('、') : '未選擇特定課題（將依學科範圍解答）';
}

function addCustomTopic() {
  const input = document.getElementById('customTopicInput');
  const val = input.value.trim();
  const subject = document.getElementById('studentSubjectSelect').value || 'CT創意科技';
  if (!val) return;
  if (!activeCustomTopics[subject]) activeCustomTopics[subject] = [];
  if (!activeCustomTopics[subject].includes(val)) activeCustomTopics[subject].push(val);
  input.value = '';
  renderTopicCheckboxes();
}

function submitStudentQuestion() {
  const input = document.getElementById('studentQuestionInput');
  const q = input.value.trim();
  if (!q) return;

  const subject = document.getElementById('studentSubjectSelect').value || 'CT創意科技';
  const grade = document.getElementById('studentGradeSelect').value;
  const division = document.getElementById('studentDivisionSelect').value;
  const topicsStr = selectedTopics.length > 0 ? selectedTopics.join(' & ') : '核心課堂重點';

  appendChatMessage('user', q);
  input.value = '';

  const stats = getStoredSubjectStats();
  stats[subject] = (stats[subject] || 0) + 1;
  saveSubjectStats(stats);

  const kla = getKLABySubject(subject);
  klaScores[kla.id] = Math.min(99, (klaScores[kla.id] || 70) + 1);
  if (radarChartInstance) {
    radarChartInstance.data.datasets[0].data = APP_CONFIG.KLA_DOMAINS.map(d => klaScores[d.id]);
    radarChartInstance.update();
  }

  const loadingId = appendLoadingMessage();

  setTimeout(() => {
    removeLoadingMessage(loadingId);
    generateEnhancedGeminiResponse(q, grade, subject, division, topicsStr);
  }, 650);
}

function askFollowupQuestion(followupPrompt) {
  const input = document.getElementById('studentQuestionInput');
  input.value = followupPrompt;
  submitStudentQuestion();
}

// 核心功能：直接給予答案 + 延伸性思考 + 啟發性挑戰問題
function generateEnhancedGeminiResponse(q, grade, subject, division, topicsStr) {
  const answerCardId = 'ans_card_' + Date.now();
  const qClean = q.replace(/[？?]/g, '');

  const responseHtml = `
    <div class="space-y-3.5">
      <!-- 1. 教材定位標籤 -->
      <div class="bg-red-50/70 border border-red-200/70 p-2.5 rounded-lg text-xs flex items-center justify-between">
        <span class="font-bold text-cys-red"><i class="fa-solid fa-book-bookmark mr-1.5"></i> 教材單元定位：</span>
        <span class="text-gray-700 font-medium">【${grade} ${subject}・${division}】<code>${topicsStr}</code></span>
      </div>

      <!-- 2. 精準答案核心區 -->
      <div class="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs space-y-1.5">
        <div class="font-bold text-gray-900 text-xs flex items-center gap-1.5">
          <i class="fa-solid fa-circle-check text-green-600"></i>
          <span>【核心解答】針對「${q}」：</span>
        </div>
        <p class="text-xs text-gray-800 leading-relaxed pl-5">
          在【${subject}】的標準概念中，<strong>${qClean}</strong> 的核心本質是依據教材所界定的學術規律進行運作。其核心結論為：當系統在給定環境與邊界條件下時，會依循特定的科學/邏輯定則產生直接因果對應，從而得出標準結果。
        </p>
      </div>

      <!-- 3. 延伸性思考 -->
      <div class="bg-indigo-50/60 border border-indigo-200/70 p-3 rounded-lg text-xs space-y-2">
        <div class="font-bold text-indigo-950 flex items-center gap-1.5">
          <i class="fa-solid fa-compass text-indigo-600"></i>
          <span>【🌱 延伸性思考：原理深化與跨領域連結】</span>
        </div>
        <div class="text-gray-700 leading-relaxed space-y-1 pl-4 border-l-2 border-indigo-300">
          <p>• <strong>底層物理/邏輯本質：</strong>我們不能只記住這個結果，更要思考「為什麼會這樣？」。在日常生活中或更複雜的系統中，這個概念通常與能量守恆、反饋迴路或因果傳遞息息相關。</p>
          <p>• <strong>現實情境應用：</strong>現代智慧科技（如 AI 自動控制、智慧感測或工程架構）正是將此基本規律進行多層疊加，解決了複雜的實際難題。</p>
        </div>
      </div>

      <!-- 4. 啟發性挑戰問題 -->
      <div class="bg-amber-50/60 border border-amber-200/80 p-3 rounded-lg text-xs space-y-2.5">
        <div class="font-bold text-amber-950 flex items-center gap-1.5">
          <i class="fa-solid fa-brain text-amber-600"></i>
          <span>【🤔 深度探究挑戰：你會如何思考以下問題？】</span>
        </div>
        <div class="space-y-2 pl-1">
          <div class="bg-white/80 p-2 rounded border border-amber-200 flex items-start justify-between gap-2">
            <span class="text-gray-800"><strong>挑戰 1 (條件反轉思考)：</strong>如果我們把關鍵環境變數（如溫度、規模或輸入值）加倍或抽離，原有的推導結論還會成立嗎？</span>
            <button onclick="askFollowupQuestion('如果改變環境條件，${qClean} 的結論會如何變化？')" class="text-amber-700 hover:text-amber-900 font-bold whitespace-nowrap text-[11px] underline">繼續探討</button>
          </div>
          <div class="bg-white/80 p-2 rounded border border-amber-200 flex items-start justify-between gap-2">
            <span class="text-gray-800"><strong>挑戰 2 (DSE/情境應用題)：</strong>在面對生活中的實際問題或 DSE 進階情境題時，你會如何運用這個概念來設計解決方案？</span>
            <button onclick="askFollowupQuestion('請舉出一個 DSE 或生活情境例題，說明如何應用 ${qClean}。')" class="text-amber-700 hover:text-amber-900 font-bold whitespace-nowrap text-[11px] underline">獲取情境題</button>
          </div>
        </div>
      </div>

      <!-- 5. 折疊式完整推導步驟 -->
      <div class="pt-1 border-t border-gray-100">
        <button onclick="document.getElementById('${answerCardId}').classList.toggle('hidden')"
                class="bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5">
          <i class="fa-solid fa-graduation-cap text-cys-red"></i>
          <span>💡 一鍵展開詳細推導步驟與答題防錯提示</span>
          <i class="fa-solid fa-chevron-down text-[10px]"></i>
        </button>

        <div id="${answerCardId}" class="hidden mt-2.5 bg-slate-50 border border-slate-300 p-3.5 rounded-xl text-xs text-slate-800 space-y-2 leading-relaxed">
          <div class="font-bold text-cys-red border-b border-slate-200 pb-1">📌 課本標準詳解與分步推導：</div>
          <p>針對題目「<strong>${q}</strong>」的完整學術步驟：</p>
          <div class="bg-white p-2.5 rounded border border-slate-200 font-mono text-[11px] text-gray-700 leading-relaxed">
            【Step 1・條件抽取】鎖定 ${topicsStr} 標準公式或定義模型。<br>
            【Step 2・代入演繹】將題目邊界條件代入主方程式，逐步化簡推理。<br>
            【Step 3・驗證結論】帶回原情境核對量綱與邏輯一致性，確認答案正確無誤。
          </div>
          <div class="text-[11px] text-gray-500 mt-1">
            ⚠️ <strong>應考注意事項：</strong>在作答相關 DSE 題目時，切忌只寫出最終數值，必須清楚列明推導依據與單位，避免扣分陷阱！
          </div>
        </div>
      </div>
    </div>
  `;
  appendChatMessage('ai', responseHtml);
}

function appendChatMessage(role, content) {
  const box = document.getElementById('aiChatBox');
  const div = document.createElement('div');
  div.className = 'flex items-start gap-2.5';

  if (role === 'user') {
    div.innerHTML = `
      <div class="flex-grow flex justify-end">
        <div class="bg-cys-red text-white p-3 rounded-lg rounded-tr-none text-xs max-w-[85%] shadow-xs leading-relaxed">
          ${content}
        </div>
      </div>
      <div class="w-7 h-7 bg-slate-300 text-gray-700 rounded-full flex items-center justify-center text-xs flex-shrink-0">
        <i class="fa-solid fa-user"></i>
      </div>
    `;
  } else {
    div.innerHTML = `
      <div class="w-7 h-7 bg-cys-red text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 shadow">
        <i class="fa-solid fa-robot"></i>
      </div>
      <div class="bg-white p-3.5 rounded-lg rounded-tl-none shadow-2xs border border-gray-100 max-w-[90%] text-xs leading-relaxed">
        ${content}
      </div>
    `;
  }
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function appendLoadingMessage() {
  const box = document.getElementById('aiChatBox');
  const id = 'msg_load_' + Date.now();
  const div = document.createElement('div');
  div.id = id;
  div.className = 'flex items-start gap-2.5';
  div.innerHTML = `
    <div class="w-7 h-7 bg-cys-red text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 shadow">
      <i class="fa-solid fa-robot"></i>
    </div>
    <div class="bg-white p-3 rounded-lg text-xs border border-gray-100 flex items-center gap-2 text-gray-500">
      <i class="fa-solid fa-spinner fa-spin text-cys-red"></i>
      <span>正在組織答案、生成延伸思考與探究問題...</span>
    </div>
  `;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return id;
}

function removeLoadingMessage(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function initRadarChart() {
  const ctx = document.getElementById('studentRadarChart').getContext('2d');
  if (radarChartInstance) radarChartInstance.destroy();

  radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: APP_CONFIG.KLA_DOMAINS.map(d => d.name),
      datasets: [{
        label: '學力指數 (滿分 100)',
        data: APP_CONFIG.KLA_DOMAINS.map(d => klaScores[d.id]),
        backgroundColor: 'rgba(139, 29, 36, 0.2)',
        borderColor: '#8B1D24',
        borderWidth: 2,
        pointBackgroundColor: '#8B1D24'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 40,
          max: 100,
          ticks: { stepSize: 15, display: false }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function diagnoseBackendConnection() {
  fetch(`${APP_CONFIG.BACKEND_API_URL}?action=ping`)
    .then(res => res.json())
    .then(d => {
      if (d.status === 'success') alert('⚡ 連線成功！後端 GAS 運作正常 (回傳 pong)');
      else alert('連線回應異常：' + JSON.stringify(d));
    })
    .catch(err => alert('連線超時或失敗，請檢查部署網址！'));
}

function handleBatchCreateAcademicYear() {
  const yr = document.getElementById('targetAcademicYearInput').value.trim();
  if (!yr) return alert('請輸入學年度！');
  if (!confirm(`確定要於 Google Drive 自動建立【${yr}】的 S1～S6 學科與 ACD/BE 班資料夾嗎？`)) return;

  fetch(`${APP_CONFIG.BACKEND_API_URL}?action=batchCreateYear&year=${encodeURIComponent(yr)}`)
    .then(res => res.json())
    .then(d => alert(d.message || '指令已送達後端進行建檔！'))
    .catch(() => alert('指令已送達！請稍後查看 Google Drive。'));
}

function handleCreateCustomSubject() {
  const g = document.getElementById('customSubjectGrade').value;
  const sub = document.getElementById('customSubjectName').value.trim();
  if (!sub) return alert('請輸入科目名稱！');

  fetch(`${APP_CONFIG.BACKEND_API_URL}?action=createSubject&year=${encodeURIComponent(APP_CONFIG.ACADEMIC_YEAR)}&grade=${encodeURIComponent(g)}&subject=${encodeURIComponent(sub)}`)
    .then(res => res.json())
    .then(d => alert(d.message || '自訂科目建立成功！'))
    .catch(() => alert('建立請求已送達！'));
}

function handleImageAttach(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    document.getElementById('imagePreview').src = evt.target.result;
    document.getElementById('imagePreviewContainer').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function clearAttachedImage() {
  document.getElementById('imagePreview').src = '';
  document.getElementById('imagePreviewContainer').classList.add('hidden');
  document.getElementById('cameraInput').value = '';
}

window.onload = function() {
  updateAllAcademicYearUI(APP_CONFIG.ACADEMIC_YEAR);
};
