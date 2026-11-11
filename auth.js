/**
 * auth.js - 身分驗證、Google SSO 與特權身分切換
 */

// 加密計算函式 (Web Crypto API 標準 SHA-256)
async function computeSha256(str) {
  const enc = new TextEncoder();
  const data = enc.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 手動帳密登入 (含管理員 CYS 雜湊安全檢驗)
async function handleManualLogin(e) {
  e.preventDefault();
  const inputAccount = document.getElementById('loginAccount').value.trim();
  const inputPass = document.getElementById('loginPassword').value.trim();
  const cleanAccount = inputAccount.toUpperCase();

  // 1. 特權管理員驗證 (帳號 CYS / cys 或 cyc@cys.edu.hk，比對 SHA-256 雜湊)
  if (cleanAccount === 'CYS' || inputAccount.toLowerCase() === 'cyc@cys.edu.hk') {
    const computedHash = await computeSha256(inputPass);
    if (computedHash === APP_CONFIG.SECURE_ADMIN_HASH) {
      const adminUser = {
        id: 'usr_cyc',
        name: '張耀宗 副校長',
        email: 'cyc@cys.edu.hk',
        role: 'admin_teacher',
        note: '最高管理員 (CYS)',
        isCore: true
      };
      return loginSuccess(adminUser);
    } else {
      return alert('管理員密碼不正確，請重新輸入！');
    }
  }

  // 2. 一般師生校本電郵登入
  const email = inputAccount.toLowerCase();
  const roster = getStoredRoster();
  let matchedUser = roster.find(u => u.email.toLowerCase() === email);

  if (!matchedUser) {
    if (!email.endsWith('@cys.edu.hk')) return alert('請輸入管理員帳號 CYS 或校本電郵 (@cys.edu.hk)！');
    if (inputPass !== 'cys123456') return alert('密碼不正確！師生預設密碼為 cys123456');
    matchedUser = {
      id: 'usr_' + Date.now(),
      name: email.split('@')[0],
      email: email,
      role: 'student',
      note: '自學學生',
      password: inputPass,
      isCore: false
    };
    roster.push(matchedUser);
    saveRoster(roster);
  } else {
    if (matchedUser.password && matchedUser.password !== '***' && matchedUser.password !== inputPass) {
      return alert('密碼不正確！');
    }
  }

  loginSuccess(matchedUser);
}

// 健全化 JWT Base64URL 解碼函式
function decodeJwtCredential(token) {
  const base64Url = token.split('.')[1];
  if (!base64Url) throw new Error('Invalid JWT Token structure');
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  return JSON.parse(jsonPayload);
}

// Google SSO 一鍵登入回調
function handleCredentialResponse(response) {
  const errorMsgDiv = document.getElementById('ssoErrorMessage');
  if (errorMsgDiv) errorMsgDiv.classList.add('hidden');

  try {
    if (!response || !response.credential) throw new Error('未取得有效 Google 憑證');

    const payload = decodeJwtCredential(response.credential);
    const email = (payload.email || '').toLowerCase().trim();
    if (!email) throw new Error('未能取得使用者 Google 帳號電郵');

    const roster = getStoredRoster();
    let matched = roster.find(u => u.email.toLowerCase() === email);

    if (email === APP_CONFIG.DEFAULT_ADMIN_EMAIL.toLowerCase()) {
      matched = {
        id: 'usr_cyc',
        name: '張耀宗 副校長',
        email: email,
        role: 'admin_teacher',
        note: '系統管理員 / 創科副校長',
        isCore: true
      };
    } else if (!matched) {
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
    console.error('Google 登入解析異常:', err);
    if (errorMsgDiv) {
      errorMsgDiv.innerText = 'Google 登入驗證失敗，請改用下方帳密登入 (管理員請用 CYS)';
      errorMsgDiv.classList.remove('hidden');
    }
    alert('Google 登入驗證失敗，請改用帳號密碼登入。\n(管理員請於帳號輸入 CYS 即可快速登入)');
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

function handleLogout() {
  currentUser = null;
  document.getElementById('userInfoHeader').classList.add('hidden');
  document.getElementById('dualRoleSwitchBtnContainer').classList.add('hidden');
  document.getElementById('viewStudent').classList.add('hidden');
  document.getElementById('viewTeacher').classList.add('hidden');
  document.getElementById('viewAdmin').classList.add('hidden');
  document.getElementById('viewLogin').classList.remove('hidden');
}
