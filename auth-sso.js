/**
 * auth-sso.js - Google SSO 一鍵登入與系統登出控制
 */

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

// Google SSO 憑證解密與登入處理
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

  ['viewStudent', 'viewTeacher', 'viewAdmin'].forEach(id => {
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

// 事件監聽綁定
document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) loginBtn.addEventListener('click', handleManualLogin);

  const passInput = document.getElementById('loginPassword');
  if (passInput) {
    passInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleManualLogin();
    });
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleSystemLogout);
});
