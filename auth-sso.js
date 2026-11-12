/**
 * auth-sso.js - Google Identity Services 一鍵登入與登出機制
 */

window.addEventListener('DOMContentLoaded', () => {
  initGoogleSso();
  bindAuthButtons();
});

// 初始化 Google SSO
function initGoogleSso() {
  if (window.google && google.accounts && google.accounts.id) {
    google.accounts.id.initialize({
      client_id: window.APP_CONFIG.GOOGLE_CLIENT_ID,
      callback: handleGoogleSsoCallback,
      auto_select: false
    });

    const ssoBtnContainer = document.getElementById('googleSsoBtn');
    if (ssoBtnContainer) {
      google.accounts.id.renderButton(ssoBtnContainer, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'signin_with',
        shape: 'pill'
      });
    }
  }
}

// 解析 Google JWT Token
function handleGoogleSsoCallback(response) {
  try {
    const base64Url = response.credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const profile = JSON.parse(jsonPayload);
    const email = profile.email.toLowerCase();

    let userRole = 'student';
    let userName = profile.name || email.split('@')[0];

    // 特權身分判定
    if (email === window.APP_CONFIG.CORE_ADMIN_EMAIL.toLowerCase()) {
      userRole = 'dual';
      userName = '張耀宗 副校長';
    } else if (email.endsWith('@cys.edu.hk')) {
      const roster = getSystemRoster();
      const existing = roster.find(u => u.email.toLowerCase() === email);
      if (existing) {
        userRole = existing.role;
        userName = existing.name;
      }
    }

    executeSuccessfulLogin({
      email: email,
      name: userName,
      role: userRole,
      avatar: profile.picture || ''
    });

  } catch (err) {
    console.error('SSO 登入解析失敗:', err);
    showLoginError('Google 登入驗證失敗，請重試！');
  }
}

// 綁定手動按鈕事件
function bindAuthButtons() {
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', handleManualLogin);
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleSystemLogout);
  }
}

// 系統全域登出
function handleSystemLogout() {
  window.currentUser = null;
  localStorage.removeItem('cys_current_user');
  localStorage.removeItem('cys_current_role_view');

  if (window.google && google.accounts && google.accounts.id) {
    google.accounts.id.disableAutoSelect();
  }

  // 顯示登入層並隱藏其他視圖
  const viewLogin = document.getElementById('viewLogin');
  if (viewLogin) {
    viewLogin.classList.remove('hidden', 'force-hide-login');
    viewLogin.style.display = 'flex';
  }

  ['viewStudent', 'viewTeacher', 'viewAdmin'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  if (typeof renderUserNavigationHeader === 'function') {
    renderUserNavigationHeader();
  }
}
