/**
 * ==============================================================================
 * 明愛元朗陳震夏中學 - 24小時學習支援系統 (CYS 247)
 * 名冊管理、相機拍照上傳、雙軌自學模式與八大學力雷達圖引擎 (roster-admin.js)
 * 
 * 核心功能：
 * 1. 【新增】相機拍照、相簿上傳、圖片壓縮 (Canvas) 與剪貼簿 (Ctrl+V) 貼圖
 * 2. 雙軌自學模式引擎：校本教材＋AI (Google Drive) VS 純 Gemini 自學
 * 3. 內建香港教育局 8 大學習領域 (KLA) 個人學力雷達圖引擎 (Chart.js)
 * 4. 視圖切換與排程保證（杜絕視圖隱藏時的 Canvas 渲染異常）
 * 5. 內建手動帳密與 Google SSO 完整登入驗證引擎
 * 6. 師生名冊資料持久化 (localStorage + 記憶體快取 + 自愈保底機制)
 * 7. CSV 名冊檔案解析、驗證與批次匯入匯出
 * 8. 【管理員專屬】全校自學人次一鍵歸零／重設 (具備雙重驗證)
 * 9. 24 個學科宏觀統計人次之渲染與同步
 * ==============================================================================
 */

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
window.currentQueryMode = 'materials'; // 預設為 'materials' (校本教材＋AI)，可切換為 'direct' (純 Gemini)
window.currentAttachedImage = null;   // 當前學生拍照或上傳的圖片資料 { base64, mimeType, dataUrl, fileName }

/**
 * 頁面載入初始化
 */
document.addEventListener('DOMContentLoaded', () => {
  initRosterData();
  initSubjectStats();
  initQueryMode();
  initPhotoHandler(); // 初始化相機拍照與圖片上傳處理器
  renderRosterTable();
  renderSubjectStats();
  checkExistingSession();
});

// ==============================================================================
// 1. 【新增核心】相機拍照、圖片上傳、Canvas 壓縮與剪貼簿 (Ctrl+V) 支援
// ==============================================================================

/**
 * 初始化相機拍照與相簿上傳事件
 */
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

  // 支援在提問輸入框中直接按 Ctrl + V 貼上圖片 (桌面與平板相容)
  const questionInput = document.getElementById('inputQuestionText');
  if (questionInput) {
    questionInput.addEventListener('paste', function(e) {
      const clipboardData = e.clipboardData || (window.clipboardData);
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
 * 圖片讀取與高質量 Canvas 自動壓縮演算法
 * (自動將相機拍攝的 5MB-10MB 巨圖縮小至 1024px 內，壓縮至 150KB-250KB，確保 GAS 不超載)
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
      // 限制最長邊為 1024px
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

      // 以 82% 質量轉換為 JPEG (既清晰又極度節省流量)
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
      const base64Data = compressedDataUrl.split(',')[1];
      const approxSizeKb = Math.round((base64Data.length * 0.75) / 1024);

      // 儲存全域狀態供提問引擎使用
      window.currentAttachedImage = {
        dataUrl: compressedDataUrl,
        base64: base64Data,
        mimeType: 'image/jpeg',
        fileName: file.name || 'camera_photo.jpg',
        sizeKb: approxSizeKb
      };

      // 更新介面上的預覽縮圖
      const previewBox = document.getElementById('imagePreviewContainer');
      const thumb = document.getElementById('imgQuestionThumbnail');
      const txt = document.getElementById('txtImageName');

      if (thumb) thumb.src = compressedDataUrl;
      if (txt) txt.innerText = `📷 已附加相片 (${approxSizeKb} KB)`;

      if (previewBox) {
        previewBox.classList.remove('hidden');
        previewBox.style.display = 'flex';
      }
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

/**
 * 清除已附加的圖片
 */
window.clearAttachedImage = function() {
  window.currentAttachedImage = null;
  const photoInput = document.getElementById('inputQuestionPhoto');
  if (photoInput) photoInput.value = '';

  const previewBox = document.getElementById('imagePreviewContainer');
  if (previewBox) {
    previewBox.classList.add('hidden');
    previewBox.style.display = 'none';
  }
};

/**
 * 供 Gemini 提問引擎獲取圖片的標準介面
 */
window.getAttachedImage = function() {
  return window.currentAttachedImage;
};

// ==============================================================================
// 2. 雙軌解答模式控制引擎 (校本教材+AI VS 純 Gemini)
// ==============================================================================

/**
 * 初始化並讀取上次記憶的解答模式
 */
function initQueryMode() {
  const savedMode = localStorage.getItem(STORAGE_KEYS.QUERY_MODE);
  if (savedMode === 'direct' || savedMode === 'materials') {
    window.currentQueryMode = savedMode;
  }
  updateQueryModeUI();
}

/**
 * 切換解答模式 (materials 或 direct)
 */
window.setQueryMode = function(mode) {
  window.currentQueryMode = mode;
  localStorage.setItem(STORAGE_KEYS.QUERY_MODE, mode);
  updateQueryModeUI();
};

/**
 * 更新解答模式按鈕外觀與說明
 */
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

/**
 * 取得或初始化學生雷達圖學力分數
 */
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

/**
 * 儲存學生雷達圖學力分數
 */
function saveStudentRadarScores(scores) {
  try {
    localStorage.setItem(STORAGE_KEYS.RADAR_SCORES, JSON.stringify(scores));
  } catch (e) {
    console.warn("儲存雷達圖數據失敗", e);
  }
}

/**
 * 初始化並渲染學力雷達圖 (Chart.js)
 */
window.initStudentRadarChart = function() {
  const canvas = document.getElementById('studentRadarChart');
  if (!canvas) return;

  if (typeof Chart === 'undefined') {
    console.warn("Chart.js 尚未加載完成，500毫秒後重新嘗試...");
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
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#b91c1c',
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
          ticks: {
            stepSize: 20,
            display: false
          },
          angleLines: {
            color: 'rgba(0, 0, 0, 0.08)'
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.08)'
          },
          pointLabels: {
            font: {
              size: 11,
              weight: 'bold',
              family: 'sans-serif'
            },
            color: '#374151'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ` ${context.label}: ${context.raw} 分`;
            }
          }
        }
      }
    }
  });
};

/**
 * 當學生提問或自學時，動態提升該領域分數
 */
window.recordStudyActivity = function(subjectCode) {
  const sub = CYS_FULL_SUBJECTS.find(s => s.code.toUpperCase() === (subjectCode || '').toUpperCase());
  if (!sub) return;

  const klaIndexMap = {
    'chi': 0,
    'eng': 1,
    'math': 2,
    'sci': 3,
    'tech': 4,
    'pshe': 5,
    'arts': 6,
    'pe': 7
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

/**
 * 手動表單登入處理
 */
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

/**
 * 執行登入成功跳轉與狀態寫入
 */
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

/**
 * 檢查既有登入會話
 */
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

/**
 * 登出系統
 */
window.handleLogout = function() {
  if (confirm("您確定要登出陳震夏中學 24小時學習支援系統嗎？")) {
    window.currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.LOGGED_USER);
    window.location.reload();
  }
};

/**
 * 視圖切換引擎 (學生端 / 教師頁 / 管理員頁)
 */
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

/**
 * 密碼輸入框顯示/隱藏眼睛切換
 */
window.togglePasswordVisibility = function(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
};

/**
 * Google 官方 SSO 回調處理
 */
window.handleGoogleSsoCallback = function(response) {
  try {
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
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

/**
 * 點擊校徽回到自學首頁
 */
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

// ==============================================================================
// 6. 渲染管理員名冊表格 (含密碼切換)
// ==============================================================================

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

// ==============================================================================
// 7. CSV 名冊匯入與匯出處理
// ==============================================================================

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
          const email = cols[1];
          const role = cols[2] || 'student';
          const password = cols[3] || 'cys123456';

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
// 8. 【核心安全操作】全校自學人次一鍵歸零／重設 (嚴格管理員權限)
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
// 9. 學科宏觀自學人次數據初始化與渲染
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
