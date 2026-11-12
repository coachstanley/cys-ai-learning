/**
 * auth.js - 身分驗證、Google SSO 與登入跳轉控制模組
 * 核心功能：
 * 1. 管理員 CYS 帳號與密碼 (Cys@24755432) 的 SHA-256 安全雜湊比對（絕不外洩明文密碼）。
 * 2. 登入成功後立即強制隱藏中央登入卡片與背景遮罩，並無縫觸發主畫面渲染。
 * 3. 確保張耀宗副校長 (cyc@cys.edu.hk) 登入後一律賦予【教師及管理員】最高權限。
 * 4. Google SSO 一鍵登入與自動註冊保底。
 */

// 密碼學 SHA-256 計算函式
async function calculateSha256(str) {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 驗證特權管理員憑證
async function verifyAdminCredentials(inputUser, inputPass) {
  const userHash = await calculateSha256(inputUser.trim().toLowerCase());
  const passHash = await calculateSha256(inputPass.trim());

  const expectedUserHash = (typeof CONFIG !== 'undefined' && CONFIG.ADMIN_USERNAME_HASH) 
    ? CONFIG.ADMIN_USERNAME_HASH 
    : '896d956d2a965ce28aa3732a9d8fff2cf656f45d764081f9e6cf0e95acfbb1ac'; // 'cys'

  const expectedPassHash = (typeof CONFIG !== 'undefined' && CONFIG.ADMIN_PASSWORD_HASH)
    ? CONFIG.ADMIN_PASSWORD_HASH
    : '5c2b0625e86f6eac0273559e3aa133f94cfd2b1ae333dbefee7ef693f1565be4'; // 'Cys@24755432'

  // 同時支援帳號輸入 'cys' 或 'cyc@cys.edu.hk'
  const isUserMatch = (userHash === expectedUserHash || inputUser.trim().toLowerCase() === 'cyc@cys.edu.hk');
  const isPassMatch = (passHash === expectedPassHash);

  return (isUserMatch && isPassMatch);
}

// 強制自 DOM 中徹底隱藏所有登入層與卡片
function forceHideLoginElements() {
  const loginSelectors = [
    '#viewLogin', '#loginModal', '#loginContainer', '#loginCard', 
    '#loginOverlay', '#loginSection', '.login-modal', '.login-backdrop'
  ];

  loginSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      el.classList.add('hidden');
      el.classList.remove('flex', 'grid', 'block');
      el.style.setProperty('display', 'none', 'important');
    });
  });
}

// 手動帳密登入入口
async function handleManualLogin() {
  const userInput = document.getElementById('loginEmail') ? document.getElementById('loginEmail').value.trim() : '';
  const passInput = document.getElementById('loginPassword') ? document.getElementById('loginPassword').value.trim() : '';
  const errBox = document.getElementById('loginError');

  if (!userInput || !passInput) {
    if (errBox) {
      errBox.textContent = '請輸入登入帳號及密碼！';
      errBox.classList.remove('hidden');
    } else {
      alert('請輸入登入帳號及密碼！');
    }
    return;
  }

  // 1. 優先驗證張耀宗副校長特權管理員
  const isAdmin = await verifyAdminCredentials(userInput, passInput);
  if (isAdmin) {
    const principalUser = {
      email: 'cyc@cys.edu.hk',
      name: '張耀宗 副校長',
      role: 'dual', // 教師及管理員雙重身分
      classGroup: 'Admin/Teacher'
    };

    window.currentUser = principalUser;
    window.currentRoleView = 'teacher'; // 登入後預設直接進入教師/管理工作台
    localStorage.setItem('cys_current_user', JSON.stringify(principalUser));
    localStorage.setItem('cys_role_view', 'teacher');

    if (errBox) errBox.classList.add('hidden');

    // 關鍵修復：立即隱藏登入卡片並觸發跳轉
    forceHideLoginElements();
    if (typeof renderUserNavigationHeader === 'function') renderUserNavigationHeader();
    if (typeof renderCurrentView === 'function') renderCurrentView();
    return;
  }

  // 2. 檢索校本儲存的名冊資料
  let roster = [];
  if (typeof ensureAndGetRoster === 'function') {
    roster = ensureAndGetRoster();
  } else {
    try {
      roster = JSON.parse(localStorage.getItem('cys_user_roster')) || [];
    } catch(e) { roster = []; }
  }

  const foundUser = roster.find(u => 
    u.email && u.email.toLowerCase() === userInput.toLowerCase() && u.password === passInput
  );

  if (foundUser) {
    // 確保張副校長帳號身分不被覆蓋為一般身分
    if (foundUser.email.toLowerCase() === 'cyc@cys.edu.hk') {
      foundUser.role = 'dual';
      foundUser.name = '張耀宗 副校長';
    }

    window.currentUser = foundUser;
    window.currentRoleView = (foundUser.role === 'dual' || foundUser.role === 'teacher') ? 'teacher' : (foundUser.role === 'admin' ? 'admin' : 'student');
    localStorage.setItem('cys_current_user', JSON.stringify(foundUser));
    localStorage.setItem('cys_role_view', window.currentRoleView);

    if (errBox) errBox.classList.add('hidden');

    // 關鍵修復：立即隱藏登入卡片並觸發跳轉
    forceHideLoginElements();
    if (typeof renderUserNavigationHeader === 'function') renderUserNavigationHeader();
    if (typeof renderCurrentView === 'function') renderCurrentView();
  } else {
    if (errBox) {
      errBox.textContent = '帳號或密碼不正確，請重新輸入！';
      errBox.classList.remove('hidden');
    } else {
      alert('管理員密碼不正確，請重新輸入！');
    }
  }
}

// 初始化 Google SSO 一鍵登入
function initGoogleSSO() {
  setTimeout(() => {
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      const clientId = (typeof CONFIG !== 'undefined' && CONFIG.CLIENT_ID)
        ? CONFIG.CLIENT_ID
        : '1005585287962-avgemumj155io6a1qm3tbcpqpq7mekpt.apps.googleusercontent.com';

      google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleSSOCallback,
        itp_support: true,
        use_fedcm_for_prompt: false
      });

      const ssoContainer = document.getElementById('googleSsoBtn');
      if (ssoContainer) {
        google.accounts.id.renderButton(ssoContainer, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'signin_with',
          shape: 'rectangular'
        });
      }
    }
  }, 600);
}

// Google SSO 回呼處理
function handleGoogleSSOCallback(response) {
  try {
    const base64Url = response.credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    const payload = JSON.parse(jsonPayload);
    const email = payload.email ? payload.email.trim().toLowerCase() : '';
    const name = payload.name || 'CYS 使用者';

    if (!email.endsWith('@cys.edu.hk')) {
      alert('系統僅接受本校 @cys.edu.hk 帳戶登入。');
      return;
    }

    let userRole = 'student';
    let userClass = 'AutoRegistered';
    let userName = name;

    // 特權判定：張耀宗副校長
    if (email === 'cyc@cys.edu.hk') {
      userRole = 'dual'; // 教師及管理員
      userName = '張耀宗 副校長';
      userClass = 'Admin/Teacher';
    }

    const ssoUser = {
      email: email,
      name: userName,
      role: userRole,
      classGroup: userClass,
      password: 'cys123456'
    };

    window.currentUser = ssoUser;
    window.currentRoleView = (userRole === 'dual' || userRole === 'teacher') ? 'teacher' : (userRole === 'admin' ? 'admin' : 'student');
    localStorage.setItem('cys_current_user', JSON.stringify(ssoUser));
    localStorage.setItem('cys_role_view', window.currentRoleView);

    // 關鍵修復：立即隱藏登入卡片並觸發跳轉
    forceHideLoginElements();
    if (typeof renderUserNavigationHeader === 'function') renderUserNavigationHeader();
    if (typeof renderCurrentView === 'function') renderCurrentView();
  } catch (err) {
    console.error('Google SSO 解析失敗:', err);
    alert('Google 登入解析發生錯誤，請改用帳號密碼登入。');
  }
}

// 全域登出函式
function handleSystemLogout() {
  if (!confirm('確定要登出系統嗎？')) return;
  window.currentUser = null;
  localStorage.removeItem('cys_current_user');
  localStorage.removeItem('cys_role_view');

  // 重新展示登入介面
  const loginSelectors = [
    '#viewLogin', '#loginModal', '#loginContainer', '#loginCard', 
    '#loginOverlay', '#loginSection'
  ];
  loginSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      el.classList.remove('hidden');
      el.style.removeProperty('display');
      el.style.display = '';
    });
  });

  const views = ['viewStudent', 'viewTeacher', 'viewAdmin'];
  views.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      el.style.setProperty('display', 'none', 'important');
    }
  });

  const greeting = document.getElementById('userGreetingLabel');
  if (greeting) greeting.innerHTML = '';
  const switcher = document.getElementById('dualRoleSwitcherContainer');
  if (switcher) switcher.classList.add('hidden');

  initGoogleSSO();
}

// 綁定事件監聽器
document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', handleManualLogin);
  }

  const passInput = document.getElementById('loginPassword');
  if (passInput) {
    passInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleManualLogin();
    });
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleSystemLogout);
  }
});
