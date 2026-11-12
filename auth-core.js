/**
 * auth-core.js - 密碼學安全驗證與登入跳轉控制
 */

// SHA-256 單向安全雜湊計算
async function calculateSha256(str) {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 驗證特權管理員憑證 (CYS / Cys@24755432)
async function verifyAdminCredentials(inputUser, inputPass) {
  const userHash = await calculateSha256(inputUser.trim().toLowerCase());
  const passHash = await calculateSha256(inputPass.trim());

  const expectedUserHash = (typeof CONFIG !== 'undefined' && CONFIG.ADMIN_USERNAME_HASH) 
    ? CONFIG.ADMIN_USERNAME_HASH 
    : '896d956d2a965ce28aa3732a9d8fff2cf656f45d764081f9e6cf0e95acfbb1ac'; // 'cys'

  const expectedPassHash = (typeof CONFIG !== 'undefined' && CONFIG.ADMIN_PASSWORD_HASH)
    ? CONFIG.ADMIN_PASSWORD_HASH
    : '5c2b0625e86f6eac0273559e3aa133f94cfd2b1ae333dbefee7ef693f1565be4'; // 'Cys@24755432'

  const isUserMatch = (userHash === expectedUserHash || inputUser.trim().toLowerCase() === 'cyc@cys.edu.hk');
  const isPassMatch = (passHash === expectedPassHash);

  return (isUserMatch && isPassMatch);
}

// 強制自 DOM 中徹底移除所有登入層、遮罩與中央白卡片
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
      role: 'dual', // 特殊雙重身分：教師及管理員
      classGroup: 'Admin/Teacher'
    };

    window.currentUser = principalUser;
    window.currentRoleView = 'teacher';
    localStorage.setItem('cys_current_user', JSON.stringify(principalUser));
    localStorage.setItem('cys_role_view', 'teacher');

    if (errBox) errBox.classList.add('hidden');

    forceHideLoginElements();
    if (typeof renderUserNavigationHeader === 'function') renderUserNavigationHeader();
    if (typeof renderCurrentView === 'function') renderCurrentView();
    return;
  }

  // 2. 檢索一般師生名冊
  let roster = [];
  if (typeof ensureAndGetRoster === 'function') {
    roster = ensureAndGetRoster();
  } else {
    try { roster = JSON.parse(localStorage.getItem('cys_user_roster')) || []; } catch(e) { roster = []; }
  }

  const foundUser = roster.find(u => 
    u.email && u.email.toLowerCase() === userInput.toLowerCase() && u.password === passInput
  );

  if (foundUser) {
    if (foundUser.email.toLowerCase() === 'cyc@cys.edu.hk') {
      foundUser.role = 'dual';
      foundUser.name = '張耀宗 副校長';
    }

    window.currentUser = foundUser;
    window.currentRoleView = (foundUser.role === 'dual' || foundUser.role === 'teacher') ? 'teacher' : (foundUser.role === 'admin' ? 'admin' : 'student');
    localStorage.setItem('cys_current_user', JSON.stringify(foundUser));
    localStorage.setItem('cys_role_view', window.currentRoleView);

    if (errBox) errBox.classList.add('hidden');

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
