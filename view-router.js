/**
 * view-router.js - 核心視圖路由切換與導航列身分展示
 */

// 頁面初始化
document.addEventListener('DOMContentLoaded', () => {
  initSystemRouter();
});

function initSystemRouter() {
  const storedYear = localStorage.getItem('cys_current_academic_year') || (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.ACADEMIC_YEAR : '2026-2027');
  applyAcademicYearToUI(storedYear);

  if (typeof ensureAndGetRoster === 'function') ensureAndGetRoster();

  let loggedUser = null;
  const rawUser = localStorage.getItem('cys_current_user');
  if (rawUser) {
    try { loggedUser = JSON.parse(rawUser); } catch(e) {}
  }

  if (loggedUser && loggedUser.email) {
    if (loggedUser.email.toLowerCase() === 'cyc@cys.edu.hk' || loggedUser.email.toLowerCase() === 'cys') {
      loggedUser.email = 'cyc@cys.edu.hk';
      loggedUser.role = 'dual'; // 鎖定教師及管理員
      loggedUser.name = '張耀宗 副校長';
      loggedUser.classGroup = 'Admin/Teacher';
      localStorage.setItem('cys_current_user', JSON.stringify(loggedUser));

      if (!window.currentRoleView) {
        window.currentRoleView = 'teacher';
        localStorage.setItem('cys_role_view', 'teacher');
      }
    }
    window.currentUser = loggedUser;
  }

  if (window.currentUser) {
    renderUserNavigationHeader();
    renderCurrentView();
  } else {
    showLoginViewOnly();
  }
}

function showLoginViewOnly() {
  const loginSelectors = [
    '#viewLogin', '#loginModal', '#loginContainer', '#loginCard', 
    '#loginOverlay', '#loginSection', '.login-modal', '.login-backdrop'
  ];
  loginSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      el.classList.remove('hidden');
      el.style.removeProperty('display');
      el.style.display = '';
    });
  });

  ['viewStudent', 'viewTeacher', 'viewAdmin'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      el.style.setProperty('display', 'none', 'important');
    }
  });
}

// 導航列身分標註與多身分快速切換按鈕
function renderUserNavigationHeader() {
  const switchContainer = document.getElementById('dualRoleSwitcherContainer');
  const userGreeting = document.getElementById('userGreetingLabel');

  if (!window.currentUser) return;

  // 正確標記：張耀宗副校長為【教師及管理員】
  if (userGreeting) {
    const isPrincipal = (window.currentUser.email && window.currentUser.email.toLowerCase() === 'cyc@cys.edu.hk') || window.currentUser.role === 'dual';
    const roleBadgeHtml = isPrincipal
      ? '<span class="bg-white text-cys-red px-2.5 py-0.5 rounded-full text-xs font-bold shadow-xs">教師及管理員</span>'
      : `<span class="bg-white text-cys-red px-2.5 py-0.5 rounded-full text-xs font-bold shadow-xs">${window.currentUser.role === 'teacher' ? '教師' : window.currentUser.role === 'admin' ? '管理員' : '學生'}</span>`;

    userGreeting.innerHTML = `
      <div class="flex items-center gap-2">
        ${roleBadgeHtml}
        <span class="font-bold text-white text-sm tracking-wide">${window.currentUser.name || '張耀宗 副校長'}</span>
      </div>
    `;
  }

  // 頂部無縫切換按鍵
  if (switchContainer && ((window.currentUser.email && window.currentUser.email.toLowerCase() === 'cyc@cys.edu.hk') || window.currentUser.role === 'dual')) {
    switchContainer.innerHTML = `
      <div class="flex items-center bg-red-950/60 p-1 rounded-lg border border-red-400/40 text-xs gap-1">
        <button type="button" onclick="switchDualRoleView('teacher')" class="px-2.5 py-1 rounded font-bold transition ${currentRoleView === 'teacher' ? 'bg-amber-400 text-gray-900 shadow' : 'text-red-200 hover:text-white'}">
          <i class="fa-solid fa-chalkboard-user mr-1"></i>切換至教師頁
        </button>
        <button type="button" onclick="switchDualRoleView('admin')" class="px-2.5 py-1 rounded font-bold transition ${currentRoleView === 'admin' ? 'bg-amber-400 text-gray-900 shadow' : 'text-red-200 hover:text-white'}">
          <i class="fa-solid fa-screwdriver-wrench mr-1"></i>切換至管理員頁
        </button>
        <button type="button" onclick="switchDualRoleView('student')" class="px-2.5 py-1 rounded font-bold transition ${currentRoleView === 'student' ? 'bg-amber-400 text-gray-900 shadow' : 'text-red-200 hover:text-white'}">
          <i class="fa-solid fa-graduation-cap mr-1"></i>自學體驗端
        </button>
      </div>
    `;
    switchContainer.classList.remove('hidden');
    switchContainer.style.removeProperty('display');
    switchContainer.style.setProperty('display', 'flex', 'important');
  }
}

function switchDualRoleView(targetView) {
  window.currentRoleView = targetView;
  localStorage.setItem('cys_role_view', targetView);
  renderUserNavigationHeader();
  renderCurrentView();
}

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

// 核心視圖渲染：徹底關閉所有登入彈窗，展現目標工作台
function renderCurrentView() {
  if (!window.currentUser) {
    showLoginViewOnly();
    return;
  }

  // 1. 強制隱藏所有登入層
  if (typeof forceHideLoginElements === 'function') {
    forceHideLoginElements();
  } else {
    const loginSelectors = ['#viewLogin', '#loginModal', '#loginContainer', '#loginCard', '#loginOverlay'];
    loginSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.classList.add('hidden');
        el.style.setProperty('display', 'none', 'important');
      });
    });
  }

  // 2. 隱藏主視圖
  const mainViews = {
    student: document.getElementById('viewStudent'),
    teacher: document.getElementById('viewTeacher'),
    admin: document.getElementById('viewAdmin')
  };

  Object.values(mainViews).forEach(viewEl => {
    if (viewEl) {
      viewEl.classList.add('hidden');
      viewEl.style.setProperty('display', 'none', 'important');
    }
  });

  // 3. 顯示目標工作台
  const roleView = window.currentRoleView || 'teacher';
  const activeView = mainViews[roleView];

  if (activeView) {
    activeView.classList.remove('hidden');
    activeView.style.removeProperty('display');
    activeView.style.setProperty('display', 'block', 'important');
  }

  // 4. 各工作台組件初始化
  if (roleView === 'student') {
    if (typeof renderStudentSubjectDropdown === 'function') renderStudentSubjectDropdown();
    if (typeof initStudentRadarChart === 'function') setTimeout(initStudentRadarChart, 100);
    if (typeof syncTopicsAndMaterials === 'function') syncTopicsAndMaterials(false);
  } else if (roleView === 'teacher') {
    if (typeof renderTeacherGradeDriveGrid === 'function') renderTeacherGradeDriveGrid();
    if (typeof renderSubjectActivityCards === 'function') renderSubjectActivityCards();
  } else if (roleView === 'admin') {
    if (typeof renderUserRosterTable === 'function') renderUserRosterTable();
  }
}
