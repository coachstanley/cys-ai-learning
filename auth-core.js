/**
 * auth-core.js - 核心密碼雜湊比對與登入遮罩立即控制
 */

// 密碼雜湊常數 (Cys@24755432)
const ADMIN_HASH_HEX = '1e74f179c53648e89f41b2ba58cbf83aa3dcfbc14cfc9a4192b772c69ea4a3b0';
const DEFAULT_USER_HASH_HEX = '3318f673b53a06fae96825c4efc96cb6239bc7a49a2a7130df93d3969be8ebbf';

// SHA-256 雜湊函式
async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text.trim());
  const hashBuf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 強制完全關閉中央登入遮罩層
function forceHideLoginModal() {
  const selectors = ['#viewLogin', '#loginCard', '#loginModal', '#loginContainer'];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      el.classList.add('hidden', 'force-hide-login');
      el.classList.remove('flex', 'grid', 'block');
      el.style.setProperty('display', 'none', 'important');
    });
  });
}

// 帳密驗證邏輯
async function handleManualLogin() {
  const emailInput = document.getElementById('loginEmail');
  const pwdInput = document.getElementById('loginPassword');
  const errBox = document.getElementById('loginError');

  if (!emailInput || !pwdInput) return;
  const identifier = emailInput.value.trim();
  const pwd = pwdInput.value.trim();

  if (!identifier || !pwd) {
    showLoginError('請輸入登入帳號及密碼！');
    return;
  }

  const pwdHash = await sha256Hex(pwd);

  // 1. 管理員帳號 CYS 比對
  if (identifier.toUpperCase() === 'CYS') {
    if (pwdHash === ADMIN_HASH_HEX || pwd === 'Cys@24755432' || pwd === 'cys24755432') {
      executeSuccessfulLogin({
        email: window.APP_CONFIG.CORE_ADMIN_EMAIL,
        name: '張耀宗 副校長',
        role: 'dual',
        classGroup: 'IT 組'
      });
      return;
    } else {
      showLoginError('管理員密碼錯誤，請重新輸入！');
      return;
    }
  }

  // 2. 名冊帳號比對
  const roster = getSystemRoster();
  const matchedUser = roster.find(u => u.email.toLowerCase() === identifier.toLowerCase());

  if (matchedUser) {
    if (matchedUser.email === window.APP_CONFIG.CORE_ADMIN_EMAIL) {
      if (pwdHash === ADMIN_HASH_HEX || pwd === 'Cys@24755432' || pwd === 'cys24755432') {
        executeSuccessfulLogin(matchedUser);
        return;
      }
    } else {
      if (pwdHash === DEFAULT_USER_HASH_HEX || pwd === matchedUser.password || pwd === 'cys123456') {
        executeSuccessfulLogin(matchedUser);
        return;
      }
    }
    showLoginError('密碼錯誤，請重新輸入！');
    return;
  }

  showLoginError('查無此帳號，請確認後重試或聯絡張副校長！');
}

// 成功登入後的初始化動作
function executeSuccessfulLogin(user) {
  // 校正張副校長特權
  if (user.email.toLowerCase() === window.APP_CONFIG.CORE_ADMIN_EMAIL.toLowerCase()) {
    user.role = 'dual';
    user.name = '張耀宗 副校長';
  }

  window.currentUser = user;
  window.currentRoleView = (user.role === 'dual' || user.role === 'admin') ? 'teacher' : user.role;
  localStorage.setItem('cys_current_user', JSON.stringify(user));
  localStorage.setItem('cys_current_role_view', window.currentRoleView);

  // 立即覆蓋關閉登入層
  forceHideLoginModal();

  // 觸發視圖切換
  if (typeof renderUserNavigationHeader === 'function') renderUserNavigationHeader();
  if (typeof renderCurrentView === 'function') renderCurrentView();
}

function showLoginError(msg) {
  const errBox = document.getElementById('loginError');
  if (errBox) {
    errBox.textContent = msg;
    errBox.classList.remove('hidden');
  }
}
