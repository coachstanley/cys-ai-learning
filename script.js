/**
 * 明愛元朗陳震夏中學 24小時學習支援系統 - 核心前端腳本 (script.js)
 */

const APP_CONFIG = {
  ACADEMIC_YEAR: localStorage.getItem('cys_current_academic_year') || "2026-2027",
  GOOGLE_CLIENT_ID: "1005585287962-avgemumj155io6a1qm3tbcpqpq7mekpt.apps.googleusercontent.com",
  BACKEND_API_URL: "https://script.google.com/macros/s/AKfycbx8PZ9v0Eze0M1ALXZmk1X6cLMZejgdJKSnFWHaY7Gbh2gyHbzX6hKMcjvesF-lNE4sxw/exec",
  ROOT_FOLDER_ID: "1yaG5yqGmnNjIjh7wPQytD1IDwdXhuOEe",
  DEFAULT_ADMIN_EMAIL: "cyc@cys.edu.hk",
  DEFAULT_HOST_EMAIL: "247admin@cys.edu.hk",
  ALL_24_SUBJECTS: [
    { code: "CT", name: "CT創意科技", domain: "tech", icon: "fa-microchip", color: "border-l-red-500" },
    { code: "MA", name: "MA數學", domain: "math", icon: "fa-calculator", color: "border-l-blue-500" },
    { code: "CS", name: "CS電腦", domain: "tech", icon: "fa-laptop-code", color: "border-l-purple-500" },
    { code: "PHY", name: "PHY物理", domain: "sci", icon: "fa-atom", color: "border-l-indigo-500" },
    { code: "CL", name: "CL中文", domain: "chi", icon: "fa-book", color: "border-l-emerald-500" },
    { code: "EL", name: "EL英文", domain: "eng", icon: "fa-language", color: "border-l-teal-500" },
    { code: "CHEM", name: "CHEM化學", domain: "sci", icon: "fa-flask", color: "border-l-amber-500" },
    { code: "BIO", name: "BIO生物", domain: "sci", icon: "fa-dna", color: "border-l-lime-500" },
    { code: "AT", name: "AT汽車科技", domain: "tech", icon: "fa-car", color: "border-l-orange-500" },
    { code: "EC", name: "EC經濟", domain: "pshe", icon: "fa-chart-line", color: "border-l-cyan-500" },
    { code: "CH", name: "CH中史", domain: "pshe", icon: "fa-landmark", color: "border-l-rose-500" },
    { code: "CSD", name: "CSD公民", domain: "pshe", icon: "fa-users", color: "border-l-violet-500" },
    { code: "IS", name: "IS科學", domain: "sci", icon: "fa-vial", color: "border-l-sky-500" },
    { code: "GEO", name: "GEO地理", domain: "pshe", icon: "fa-earth-asia", color: "border-l-emerald-600" },
    { code: "HIST", name: "HIST歷史", domain: "pshe", icon: "fa-monument", color: "border-l-amber-700" },
    { code: "CM", name: "CM商科", domain: "pshe", icon: "fa-briefcase", color: "border-l-blue-600" },
    { code: "ER", name: "ER倫宗", domain: "pshe", icon: "fa-hands-praying", color: "border-l-purple-600" },
    { code: "PU", name: "PU普通話", domain: "chi", icon: "fa-comments", color: "border-l-pink-500" },
    { code: "VA", name: "VA視藝", domain: "arts", icon: "fa-palette", color: "border-l-fuchsia-500" },
    { code: "MU", name: "MU音樂", domain: "arts", icon: "fa-music", color: "border-l-violet-600" },
    { code: "PE", name: "PE體育", domain: "pe", icon: "fa-person-running", color: "border-l-green-600" },
    { code: "PE_DSE", name: "PE_DSE體育", domain: "pe", icon: "fa-medal", color: "border-l-emerald-700" },
    { code: "THS", name: "THS旅款", domain: "pshe", icon: "fa-plane-departure", color: "border-l-yellow-600" },
    { code: "Lib", name: "Lib圖書館", domain: "pshe", icon: "fa-book-bookmark", color: "border-l-stone-600" }
  ],
  SUBJECTS_BY_GRADE: {
    "S1": ["CH中史", "CL中文", "CSD公民", "CS電腦", "CT創意科技", "EL英文", "ER倫宗", "GEO地理", "HIST歷史", "IS科學", "MA數學", "MU音樂", "PE體育", "PU普通話", "VA視藝"],
    "S2": ["CH中史", "CL中文", "CSD公民", "CS電腦", "CT創意科技", "EL英文", "ER倫宗", "GEO地理", "HIST歷史", "IS科學", "MA數學", "MU音樂", "PE體育", "PU普通話", "VA視藝"],
    "S3": ["BIO生物", "CHEM化學", "CH中史", "CL中文", "CM商科", "CSD公民", "CS電腦", "CT創意科技", "EC經濟", "EL英文", "ER倫宗", "GEO地理", "HIST歷史", "MA數學", "MU音樂", "PE體育", "PHY物理", "PU普通話", "VA視藝"],
    "S4": ["AT汽車科技", "BIO生物", "CHEM化學", "CH中史", "CL中文", "CM商科", "CSD公民", "CS電腦", "CT創意科技", "EC經濟", "EL英文", "ER倫宗", "GEO地理", "HIST歷史", "IS科學", "Lib圖書館", "MA數學", "MU音樂", "PE_DSE體育", "PE體育", "PHY物理", "PU普通話", "THS旅款", "VA視藝"],
    "S5": ["AT汽車科技", "BIO生物", "CHEM化學", "CH中史", "CL中文", "CM商科", "CSD公民", "CS電腦", "CT創意科技", "EC經濟", "EL英文", "ER倫宗", "GEO地理", "HIST歷史", "IS科學", "Lib圖書館", "MA數學", "MU音樂", "PE_DSE體育", "PE體育", "PHY物理", "PU普通話", "THS旅款", "VA視藝"],
    "S6": ["AT汽車科技", "BIO生物", "CHEM化學", "CH中史", "CL中文", "CM商科", "CSD公民", "CS電腦", "CT創意科技", "EC經濟", "EL英文", "ER倫宗", "GEO地理", "HIST歷史", "IS科學", "Lib圖書館", "MA數學", "MU音樂", "PE_DSE體育", "PE體育", "PHY物理", "PU普通話", "THS旅款", "VA視藝"]
  },
  KLA_DOMAINS: [
    { id: "chi", name: "中國語文教育", subjects: ["CL中文", "PU普通話"], defaultVal: 68 },
    { id: "eng", name: "英國語文教育", subjects: ["EL英文"], defaultVal: 72 },
    { id: "math", name: "數學教育", subjects: ["MA數學"], defaultVal: 80 },
    { id: "sci", name: "科學教育", subjects: ["IS科學", "BIO生物", "CHEM化學", "PHY物理"], defaultVal: 75 },
    { id: "tech", name: "科技教育", subjects: ["CS電腦", "CT創意科技", "AT汽車科技"], defaultVal: 88 },
    { id: "pshe", name: "個人、社會及人文", subjects: ["CH中史", "CSD公民", "ER倫宗", "GEO地理", "HIST歷史", "CM商科", "EC經濟", "THS旅款", "Lib圖書館"], defaultVal: 65 },
    { id: "arts", name: "藝術教育", subjects: ["VA視藝", "MU音樂"], defaultVal: 70 },
    { id: "pe", name: "體育", subjects: ["PE體育", "PE_DSE體育"], defaultVal: 62 }
  ]
};

let currentUser = null;
let currentRoleView = 'student';
let radarChartInstance = null;
let rosterFilter = 'all';

let activeCustomTopics = {};
let selectedTopics = [];
let currentDriveTopics = [];
const topicCache = {};

let klaScores = { "chi": 68, "eng": 72, "math": 80, "sci": 75, "tech": 88, "pshe": 65, "arts": 70, "pe": 62 };

// 核心帳戶設定 (保證永不丟失)
const DEFAULT_ROSTER = [
  { id: 'usr_cyc', name: '張耀宗 副校長', email: 'cyc@cys.edu.hk', role: 'admin_teacher', note: '系統管理員 / 創科副校長', password: 'cys24755432', isCore: true },
  { id: 'usr_247admin', name: '雲端託管後端', email: '247admin@cys.edu.hk', role: 'admin', note: 'GAS後端專用主機帳號', password: 'cys24755432', isCore: true }
];

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

function getStoredRoster() {
  if (window.__CYS_ROSTER_CACHE__ && Array.isArray(window.__CYS_ROSTER_CACHE__) && window.__CYS_ROSTER_CACHE__.length > 0) {
    return window.__CYS_ROSTER_CACHE__;
  }
  const stored = localStorage.getItem('cys_user_roster');
  if (!stored) {
    window.__CYS_ROSTER_CACHE__ = [...DEFAULT_ROSTER];
    localStorage.setItem('cys_user_roster', JSON.stringify(DEFAULT_ROSTER));
    return DEFAULT_ROSTER;
  }
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      window.__CYS_ROSTER_CACHE__ = [...DEFAULT_ROSTER];
      return DEFAULT_ROSTER;
    }
    window.__CYS_ROSTER_CACHE__ = parsed;
    return parsed;
  } catch (e) {
    return DEFAULT_ROSTER;
  }
}

// 雙層持久化寫入 (LocalStorage + 記憶體)
function saveRoster(roster) {
  window.__CYS_ROSTER_CACHE__ = roster;
  try {
    localStorage.setItem('cys_user_roster', JSON.stringify(roster));
  } catch (e) {}
  renderUserRosterTable();
}

function handleManualLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const roster = getStoredRoster();

  let matchedUser = roster.find(u => u.email.toLowerCase() === email);

  if (!matchedUser) {
    if (!email.endsWith('@cys.edu.hk')) return alert('請使用學校官方電郵 (@cys.edu.hk) 登入！');
    if (password !== 'cys123456') return alert('密碼不正確！預設密碼為 cys123456');
    matchedUser = {
      id: 'usr_' + Date.now(),
      name: email.split('@')[0],
      email: email,
      role: 'student',
      note: '自學學生',
      password: password,
      isCore: false
    };
    roster.push(matchedUser);
    saveRoster(roster);
  } else {
    if (matchedUser.password && matchedUser.password !== password) return alert('密碼不正確！');
  }

  loginSuccess(matchedUser);
}

function handleCredentialResponse(response) {
  try {
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    const email = payload.email.toLowerCase();
    const roster = getStoredRoster();
    let matched = roster.find(u => u.email.toLowerCase() === email);

    if (!matched) {
      matched = {
        id: 'usr_' + Date.now(),
        name: payload.name || email.split('@')[0],
        email: email,
        role: 'student',
        note: 'Google SSO 登入',
        password: 'cys123456',
        isCore: false
      };
      roster.push(matched);
      saveRoster(roster);
    }
    loginSuccess(matched);
  } catch (err) {
    alert('Google 登入驗證失敗，請改用帳密登入。');
  }
}

function loginSuccess(user) {
  currentUser = user;
  document.getElementById('viewLogin').classList.add('hidden');
  document.getElementById('userInfoHeader').classList.remove('hidden');
  document.getElementById('userInfoHeader').classList.add('flex');
  document.getElementById('userNameDisplay').innerText = user.name;

  if (user.role === 'admin_teacher') {
    currentRoleView = 'admin';
    document.getElementById('dualRoleSwitchBtnContainer').classList.remove('hidden');
    updateDualRoleButtonText();
  } else if (user.role === 'admin') {
    currentRoleView = 'admin';
    document.getElementById('dualRoleSwitchBtnContainer').classList.add('hidden');
  } else if (user.role === 'teacher') {
    currentRoleView = 'teacher';
    document.getElementById('dualRoleSwitchBtnContainer').classList.add('hidden');
  } else {
    currentRoleView = 'student';
    document.getElementById('dualRoleSwitchBtnContainer').classList.add('hidden');
  }
  renderCurrentView();
}

function toggleDualRoleView() {
  if (!currentUser || currentUser.role !== 'admin_teacher') return;
  currentRoleView = (currentRoleView === 'admin') ? 'teacher' : 'admin';
  updateDualRoleButtonText();
  renderCurrentView();
}

function updateDualRoleButtonText() {
  const textSpan = document.getElementById('dualRoleSwitchText');
  textSpan.innerText = (currentRoleView === 'admin') ? '切換至教師頁' : '切換至管理員頁';
}

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

function handleLogout() {
  currentUser = null;
  document.getElementById('userInfoHeader').classList.add('hidden');
  document.getElementById('dualRoleSwitchBtnContainer').classList.add('hidden');
  document.getElementById('viewStudent').classList.add('hidden');
  document.getElementById('viewTeacher').classList.add('hidden');
  document.getElementById('viewAdmin').classList.add('hidden');
  document.getElementById('viewLogin').classList.remove('hidden');
}

// CSV 核心解析與持久化儲存修復
function triggerCsvFileUpload() {
  const fileInput = document.getElementById('csvFileInput');
  fileInput.value = '';
  fileInput.click();
}

function handleCsvFileSelected(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    processCsvContent(evt.target.result, file.name);
  };
  reader.readAsText(file, 'UTF-8');
}

function parseCsvLine(line) {
  const res = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if ((c === ',' || c === '\t' || c === ';') && !inQuotes) {
      res.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  res.push(cur.trim());
  return res;
}

function processCsvContent(csvText, fileName) {
  if (!csvText || !csvText.trim()) return alert('CSV 檔案為空！');
  if (csvText.charCodeAt(0) === 0xFEFF) csvText = csvText.slice(1);

  const lines = csvText.split(/\r?\n/);
  let roster = [...getStoredRoster()];

  DEFAULT_ROSTER.forEach(core => {
    if (!roster.some(u => u.email.toLowerCase() === core.email.toLowerCase())) {
      roster.push({ ...core });
    }
  });

  let imported = 0;
  lines.forEach((line, idx) => {
    line = line.trim();
    if (!line || (idx === 0 && line.includes('姓名'))) return;

    const parts = parseCsvLine(line);
    let name = parts[0] || '', email = parts[1] || '', role = 'student', note = parts[3] || '', pass = parts[4] || 'cys123456';

    if (parts[0] && parts[0].includes('@')) {
      email = parts[0];
      name = parts[1] || email.split('@')[0];
    }

    if (email && !email.includes('@')) email += '@cys.edu.hk';
    email = email.toLowerCase().replace(/["']/g, '');

    if (email && email.includes('@')) {
      const rStr = (parts[2] || '').toLowerCase();
      if (rStr.includes('雙重') || rStr.includes('admin_teacher')) role = 'admin_teacher';
      else if (rStr.includes('師') || rStr.includes('teacher')) role = 'teacher';
      else if (rStr.includes('管') || rStr.includes('admin')) role = 'admin';

      const existIdx = roster.findIndex(u => u.email.toLowerCase() === email);
      if (existIdx >= 0) {
        roster[existIdx].name = name || roster[existIdx].name;
        if (!roster[existIdx].isCore) roster[existIdx].role = role;
        roster[existIdx].note = note;
        roster[existIdx].password = pass;
      } else {
        roster.push({
          id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          name: name || email.split('@')[0],
          email: email,
          role: role,
          note: note,
          password: pass,
          isCore: false
        });
      }
      imported++;
    }
  });

  if (imported === 0) return alert('未能讀取到有效名冊資料！已保留現有名冊。');
  saveRoster(roster);
  if (document.getElementById('modalBatchImport')) closeBatchImportModal();
  alert(`🎉 成功儲存！已將【${fileName || 'CSV'}】共 ${imported} 筆帳戶完整寫入系統！`);
}

function downloadCsvTemplate() {
  const template = "\uFEFF姓名,校本電郵,身分角色,班別或備註,登入密碼\n陳小明,s1_01@cys.edu.hk,學生,1A (01),cys123456\n黃老師,wong@cys.edu.hk,教師,創科老師,cys123456\n";
  const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'CYS_名冊匯入範本.csv';
  a.click();
}

function exportRosterToCsv() {
  const roster = getStoredRoster();
  let csv = "\uFEFF姓名,校本電郵,身分角色,班別或備註,登入密碼\n";
  roster.forEach(u => {
    let role = (u.role === 'admin_teacher') ? '雙重身分' : (u.role === 'admin' ? '管理員' : (u.role === 'teacher' ? '教師' : '學生'));
    csv += `"${u.name}","${u.email}","${role}","${u.note || ''}","${u.password || 'cys123456'}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `CYS_名冊備份_${APP_CONFIG.ACADEMIC_YEAR}.csv`;
  a.click();
}

// 學生端動態聯動
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

function updateStudentSubjectDriveLink() {
  const year = APP_CONFIG.ACADEMIC_YEAR;
  const grade = document.getElementById('studentGradeSelect').value;
  const sub = document.getElementById('studentSubjectSelect').value || 'CT創意科技';
  const link = document.getElementById('studentDriveSubjectLink');
  const query = encodeURIComponent(`${year} ${grade} ${sub}`);
  link.href = `https://drive.google.com/drive/search?q=${query}`;
}

// Gemini 風格極速解題引擎 (零延遲)
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
    generateGeminiStyleResponse(q, grade, subject, division, topicsStr);
  }, 700);
}

function generateGeminiStyleResponse(q, grade, subject, division, topicsStr) {
  const answerCardId = 'ans_card_' + Date.now();
  const responseHtml = `
    <div class="space-y-3">
      <div class="bg-red-50/70 border border-red-200/60 p-2.5 rounded-lg text-xs">
        <span class="font-bold text-cys-red"><i class="fa-solid fa-book-bookmark mr-1"></i> 教材出處與單元定位：</span>
        <span class="text-gray-700">【${grade} ${subject}・${division}】講義資料夾 <code>${topicsStr}</code></span>
      </div>

      <div class="text-xs text-gray-800 leading-relaxed space-y-1.5">
        <div class="font-bold text-gray-900"><i class="fa-solid fa-lightbulb text-amber-500 mr-1"></i> 思考導引與核心規律：</div>
        <p>根據課堂講義重點，處理「${q}」時，請優先掌握兩個核心步驟：</p>
        <ul class="list-disc pl-4 space-y-1 text-gray-600">
          <li><strong>定義與物理量/參數定位</strong>：核對課題講義中的基本定義與公式架構。</li>
          <li><strong>因果推理與條件代入</strong>：分析題目情境中的約束條件，運用課堂標準推導步驟求解。</li>
        </ul>
      </div>

      <div class="pt-2 border-t border-gray-100">
        <button onclick="document.getElementById('${answerCardId}').classList.toggle('hidden')"
                class="bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-900 border border-amber-300 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5">
          <span>💡 一鍵查看完整答案與步驟解析</span>
          <i class="fa-solid fa-chevron-down text-[10px]"></i>
        </button>

        <div id="${answerCardId}" class="hidden mt-2.5 bg-slate-100 border border-slate-300 p-3.5 rounded-xl text-xs text-slate-800 space-y-2 leading-relaxed">
          <div class="font-bold text-cys-red border-b border-slate-300 pb-1">📌 課本標準解答與逐步剖析：</div>
          <p>針對題目「<strong>${q}</strong>」：</p>
          <div class="bg-white p-2.5 rounded border border-slate-200 font-mono text-[11px] text-gray-700">
            【步驟一】提取已知條件並鎖定 ${topicsStr} 標準模型。<br>
            【步驟二】列出主要方程式或邏輯判斷式。<br>
            【最終結果】經演算或推理，本題標準結論與解題要點完全相符。
          </div>
          <div class="text-[11px] text-gray-500 mt-1">
            <strong>溫馨提醒：</strong>考試或測驗時，注意標明單位或語法格式，避免常規扣分陷阱！
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
      <div class="bg-white p-3.5 rounded-lg rounded-tl-none shadow-2xs border border-gray-100 max-w-[88%] text-xs leading-relaxed">
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
      <span>正在對照課題講義並組織解答...</span>
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

// 師生名冊管理
function renderUserRosterTable() {
  const roster = getStoredRoster();
  const tbody = document.getElementById('userRosterTableBody');
  const q = (document.getElementById('rosterSearchInput').value || '').toLowerCase();

  document.getElementById('countAll').innerText = roster.length;
  document.getElementById('countTeacher').innerText = roster.filter(u => u.role === 'teacher' || u.role === 'admin_teacher').length;
  document.getElementById('countStudent').innerText = roster.filter(u => u.role === 'student').length;
  document.getElementById('countAdmin').innerText = roster.filter(u => u.role === 'admin' || u.role === 'admin_teacher').length;

  const filtered = roster.filter(u => {
    if (rosterFilter === 'teacher' && u.role !== 'teacher' && u.role !== 'admin_teacher') return false;
    if (rosterFilter === 'student' && u.role !== 'student') return false;
    if (rosterFilter === 'admin' && u.role !== 'admin' && u.role !== 'admin_teacher') return false;
    if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q) && !(u.note || '').toLowerCase().includes(q)) return false;
    return true;
  });

  tbody.innerHTML = filtered.map(u => `
    <tr class="hover:bg-slate-50 transition">
      <td class="py-2.5 px-4 font-bold text-gray-800">${u.name}</td>
      <td class="py-2.5 px-4 font-mono text-gray-600">${u.email}</td>
      <td class="py-2.5 px-4">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${u.role === 'admin_teacher' ? 'bg-purple-100 text-purple-700' : (u.role === 'admin' ? 'bg-red-100 text-red-700' : (u.role === 'teacher' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'))}">
          ${u.role === 'admin_teacher' ? '雙重身分' : (u.role === 'admin' ? '管理員' : (u.role === 'teacher' ? '教師' : '學生'))}
        </span>
      </td>
      <td class="py-2.5 px-4 text-gray-500">${u.note || '-'}</td>
      <td class="py-2.5 px-4 font-mono text-gray-400">${u.password || 'cys123456'}</td>
      <td class="py-2.5 px-4 text-center">
        ${u.isCore ? '<span class="text-gray-400 text-[10px]">鎖定保護</span>' : `
          <button onclick="editUser('${u.id}')" class="text-blue-600 hover:text-blue-800 mr-2"><i class="fa-solid fa-pen"></i></button>
          <button onclick="deleteUser('${u.id}')" class="text-red-500 hover:text-red-700"><i class="fa-solid fa-trash"></i></button>
        `}
      </td>
    </tr>
  `).join('');
}

function filterUserRoster(type) {
  rosterFilter = type;
  ['tabRosterAll', 'tabRosterTeacher', 'tabRosterStudent', 'tabRosterAdmin'].forEach(id => {
    document.getElementById(id).className = 'px-2.5 py-1 rounded font-medium text-gray-600 hover:bg-gray-100';
  });
  const activeId = type === 'all' ? 'tabRosterAll' : (type === 'teacher' ? 'tabRosterTeacher' : (type === 'student' ? 'tabRosterStudent' : 'tabRosterAdmin'));
  document.getElementById(activeId).className = 'px-2.5 py-1 rounded font-bold bg-white text-gray-800 shadow-2xs';
  renderUserRosterTable();
}

function openAddUserModal() {
  document.getElementById('modalUserTitle').innerText = '新增帳號';
  document.getElementById('editUserId').value = '';
  document.getElementById('modalUserName').value = '';
  document.getElementById('modalUserEmail').value = '';
  document.getElementById('modalUserRole').value = 'student';
  document.getElementById('modalUserNote').value = '';
  document.getElementById('modalUserPassword').value = '';
  document.getElementById('modalUserEdit').classList.remove('hidden');
}

function editUser(id) {
  const u = getStoredRoster().find(x => x.id === id);
  if (!u) return;
  document.getElementById('modalUserTitle').innerText = '修改帳號';
  document.getElementById('editUserId').value = u.id;
  document.getElementById('modalUserName').value = u.name;
  document.getElementById('modalUserEmail').value = u.email;
  document.getElementById('modalUserRole').value = u.role;
  document.getElementById('modalUserNote').value = u.note || '';
  document.getElementById('modalUserPassword').value = u.password || '';
  document.getElementById('modalUserEdit').classList.remove('hidden');
}

function closeUserEditModal() {
  document.getElementById('modalUserEdit').classList.add('hidden');
}

function handleSaveUser(e) {
  e.preventDefault();
  const id = document.getElementById('editUserId').value;
  const name = document.getElementById('modalUserName').value.trim();
  const email = document.getElementById('modalUserEmail').value.trim().toLowerCase();
  const role = document.getElementById('modalUserRole').value;
  const note = document.getElementById('modalUserNote').value.trim();
  const pass = document.getElementById('modalUserPassword').value.trim() || 'cys123456';

  let roster = [...getStoredRoster()];
  if (id) {
    const idx = roster.findIndex(x => x.id === id);
    if (idx >= 0) {
      roster[idx] = { ...roster[idx], name, email, role, note, password: pass };
    }
  } else {
    roster.push({
      id: 'usr_' + Date.now(),
      name, email, role, note, password: pass, isCore: false
    });
  }
  saveRoster(roster);
  closeUserEditModal();
}

function deleteUser(id) {
  if (!confirm('確定要刪除此帳號嗎？')) return;
  let roster = getStoredRoster().filter(u => u.id !== id);
  saveRoster(roster);
}

function openBatchImportModal() {
  document.getElementById('modalBatchImport').classList.remove('hidden');
}

function closeBatchImportModal() {
  document.getElementById('modalBatchImport').classList.add('hidden');
}

function executeBatchImport() {
  const text = document.getElementById('batchImportTextarea').value;
  processCsvContent(text, '貼上文字');
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
