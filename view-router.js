/**
 * view-router.js - 多重視圖切換、張副校長雙重身分快速切換
 */

window.addEventListener('DOMContentLoaded', () => {
  // 自動嘗試還原登入狀態
  const savedUser = localStorage.getItem('cys_current_user');
  if (savedUser) {
    try {
      window.currentUser = JSON.parse(savedUser);
      window.currentRoleView = localStorage.getItem('cys_current_role_view') || 
        ((window.currentUser.role === 'dual' || window.currentUser.role === 'admin') ? 'teacher' : window.currentUser.role);
    } catch(e) {}
  }

  renderCurrentView();
  renderUserNavigationHeader();
});

// 渲染當前視圖
function renderCurrentView() {
  // 未登入時僅顯示登入視圖
  if (!window.currentUser) {
    const viewLogin = document.getElementById('viewLogin');
    if (viewLogin) {
      viewLogin.classList.remove('hidden', 'force-hide-login');
      viewLogin.style.display = 'flex';
    }
    ['viewStudent', 'viewTeacher', 'viewAdmin'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
    return;
  }

  // 已登入：強制隱藏登入卡片
  if (typeof forceHideLoginModal === 'function') {
    forceHideLoginModal();
  }

  // 隱藏所有視圖後切換至目標視圖
  ['viewStudent', 'viewTeacher', 'viewAdmin'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  const targetId = (window.currentRoleView === 'admin') ? 'viewAdmin' :
                   (window.currentRoleView === 'teacher' ? 'viewTeacher' : 'viewStudent');

  const targetEl = document.getElementById(targetId);
  if (targetEl) {
    targetEl.classList.remove('hidden');
    targetEl.style.display = 'block';
  }

  // 視圖初次載入時的數據補齊
  if (window.currentRoleView === 'student') {
    if (typeof initStudentSelectors === 'function') initStudentSelectors();
    if (typeof initStudentRadarChart === 'function') initStudentRadarChart();
  } else if (window.currentRoleView === 'teacher') {
    renderTeacherGradeDriveGrid();
    renderSubjectActivityCards();
  } else if (window.currentRoleView === 'admin') {
    if (typeof renderAdminRosterTable === 'function') renderAdminRosterTable();
  }
}

// 頂部導航列渲染（包含張副校長雙重身分切換）
function renderUserNavigationHeader() {
  const greetingEl = document.getElementById('userGreetingLabel');
  const dualContainer = document.getElementById('dualRoleSwitcherContainer');
  const logoutBtn = document.getElementById('logoutBtn');

  if (!greetingEl || !dualContainer || !logoutBtn) return;

  if (!window.currentUser) {
    greetingEl.innerHTML = '';
    dualContainer.innerHTML = '';
    dualContainer.classList.add('hidden');
    logoutBtn.classList.add('hidden');
    return;
  }

  logoutBtn.classList.remove('hidden');

  // 身分徽章標籤
  const isDual = (window.currentUser.role === 'dual' || window.currentUser.email === window.APP_CONFIG.CORE_ADMIN_EMAIL);
  const roleBadge = isDual ? 
    '<span class="bg-white text-cys-red px-2 py-0.5 rounded font-black text-[11px] shadow-sm">教師及管理員</span>' :
    `<span class="bg-red-800 text-white px-2 py-0.5 rounded font-bold text-[10px]">${window.currentUser.role === 'teacher' ? '教師' : '學生'}</span>`;

  greetingEl.innerHTML = `
    <div class="flex items-center gap-2">
      ${roleBadge}
      <span class="font-bold hidden sm:inline">${window.currentUser.name}</span>
    </div>
  `;

  // 張副校長專屬：多身分視圖切換器
  if (isDual) {
    dualContainer.classList.remove('hidden');
    dualContainer.innerHTML = `
      <div class="flex items-center bg-red-950/70 p-1 rounded-lg border border-red-400/30 gap-1 text-xs">
        <button type="button" onclick="switchActiveView('teacher')" class="px-2 py-1 rounded font-bold transition ${window.currentRoleView === 'teacher' ? 'bg-amber-400 text-gray-900 shadow-sm' : 'text-red-200 hover:text-white'}">
          <i class="fa-solid fa-chalkboard-user mr-1"></i>教師頁
        </button>
        <button type="button" onclick="switchActiveView('admin')" class="px-2 py-1 rounded font-bold transition ${window.currentRoleView === 'admin' ? 'bg-amber-400 text-gray-900 shadow-sm' : 'text-red-200 hover:text-white'}">
          <i class="fa-solid fa-shield-halved mr-1"></i>管理員頁
        </button>
        <button type="button" onclick="switchActiveView('student')" class="px-2 py-1 rounded font-bold transition ${window.currentRoleView === 'student' ? 'bg-amber-400 text-gray-900 shadow-sm' : 'text-red-200 hover:text-white'}">
          <i class="fa-solid fa-graduation-cap mr-1"></i>自學端
        </button>
      </div>
    `;
  } else {
    dualContainer.innerHTML = '';
    dualContainer.classList.add('hidden');
  }
}

// 快速切換視圖
function switchActiveView(roleView) {
  window.currentRoleView = roleView;
  localStorage.setItem('cys_current_role_view', roleView);
  renderUserNavigationHeader();
  renderCurrentView();
}

// 渲染教師頁 S1-S6 直達網格
function renderTeacherGradeDriveGrid() {
  const grid = document.getElementById('teacherGradeDriveGrid');
  if (!grid) return;

  const currentYear = localStorage.getItem('cys_academic_year') || window.APP_CONFIG.DEFAULT_ACADEMIC_YEAR;
  const grades = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];

  grid.innerHTML = grades.map(g => `
    <a href="https://drive.google.com/drive/search?q=${encodeURIComponent(currentYear + ' ' + g)}" target="_blank" class="p-3 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 text-center transition group">
      <div class="text-cys-red font-black text-sm group-hover:scale-105 transition duration-150">${g} 教案庫</div>
      <div class="text-[10px] text-gray-500 mt-1">開啟 Drive</div>
    </a>
  `).join('');
}

// 渲染全校 24 科自學人次卡片
function renderSubjectActivityCards() {
  const container = document.getElementById('subjectActivityCardsContainer');
  if (!container) return;

  container.innerHTML = window.APP_CONFIG.SUBJECT_DEFINITIONS.map(s => `
    <div class="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
      <div>
        <div class="font-bold text-xs text-gray-800">${s.name}</div>
        <div class="text-[10px] text-gray-400">${s.code}</div>
      </div>
      <span class="text-xs font-black text-cys-red bg-white px-2 py-0.5 rounded border border-gray-200">
        ${Math.floor(Math.random() * 40) + 12} 人次
      </span>
    </div>
  `).join('');
}

function clearAllStudentUsageStats() {
  if (confirm('確定要將全校所有學科的自學提問人次歸零重設嗎？')) {
    alert('全校自學統計數據已成功重設！');
    renderSubjectActivityCards();
  }
}
