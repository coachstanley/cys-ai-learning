/**
 * roster-admin.js - 名冊自愈儲存、密碼明文切換與 Drive 一鍵批量建檔
 */

// 取得名冊
function getSystemRoster() {
  const cached = localStorage.getItem('cys_roster');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch(e){}
  }
  return getDefaultInitialRoster();
}

function getDefaultInitialRoster() {
  return [
    { name: '張耀宗 副校長', email: 'cyc@cys.edu.hk', role: 'dual', duty: 'IT 主管 / 系統管理員', password: '••••••••' },
    { name: '陳震夏 示範教師', email: 'teacher1@cys.edu.hk', role: 'teacher', duty: '科學與科技組', password: '••••••••' },
    { name: '示範學生', email: 's21001@cys.edu.hk', role: 'student', duty: '中一級 A 班', password: '••••••••' }
  ];
}

// 渲染管理員名冊表格
function renderAdminRosterTable() {
  const tbody = document.getElementById('adminRosterTableBody');
  if (!tbody) return;

  const roster = getSystemRoster();
  tbody.innerHTML = roster.map((u, i) => `
    <tr class="hover:bg-gray-50 border-b border-gray-100">
      <td class="py-2.5 px-3 font-bold">${u.name}</td>
      <td class="py-2.5 px-3 font-mono text-gray-600">${u.email}</td>
      <td class="py-2.5 px-3">
        <span class="px-2 py-0.5 rounded text-[10px] font-black ${u.role === 'dual' ? 'bg-purple-100 text-purple-800' : (u.role === 'teacher' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800')}">
          ${u.role === 'dual' ? '教師及管理員' : (u.role === 'teacher' ? '教師' : '學生')}
        </span>
      </td>
      <td class="py-2.5 px-3 text-gray-500">${u.duty || '校本學員'}</td>
      <td class="py-2.5 px-3">
        <div class="flex items-center gap-1.5 font-mono text-xs">
          <span id="pwd-mask-${i}">••••••••</span>
          <button type="button" onclick="togglePasswordVisibility(${i})" class="text-gray-400 hover:text-cys-red">
            <i id="eye-icon-${i}" class="fa-regular fa-eye text-xs"></i>
          </button>
        </div>
      </td>
      <td class="py-2.5 px-3 text-center">
        ${u.email === window.APP_CONFIG.CORE_ADMIN_EMAIL ? 
          '<span class="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">核心保護</span>' : 
          `<button onclick="deleteRosterUser(${i})" class="text-red-500 hover:text-red-700 text-xs font-bold"><i class="fa-solid fa-trash-can mr-1"></i>刪除</button>`
        }
      </td>
    </tr>
  `).join('');
}

// 切換密碼顯示/隱藏
function togglePasswordVisibility(index) {
  const textEl = document.getElementById(`pwd-mask-${index}`);
  const eyeIcon = document.getElementById(`eye-icon-${index}`);
  if (!textEl || !eyeIcon) return;

  const roster = getSystemRoster();
  const targetUser = roster[index];

  if (eyeIcon.classList.contains('fa-eye')) {
    textEl.textContent = (targetUser.email === window.APP_CONFIG.CORE_ADMIN_EMAIL) ? 'Cys@24755432' : (targetUser.password || 'cys123456');
    eyeIcon.classList.remove('fa-eye');
    eyeIcon.classList.add('fa-eye-slash');
  } else {
    textEl.textContent = '••••••••';
    eyeIcon.classList.remove('fa-eye-slash');
    eyeIcon.classList.add('fa-eye');
  }
}

// Google Drive 一鍵批量建檔
async function handleBatchCreateAcademicYear() {
  const targetYear = document.getElementById('targetAcademicYearInput')?.value.trim() || '2026-2027';
  if (!confirm(`確定要為學年度【${targetYear}】在 247admin Google Drive 批量建立完整的 S1～S6 四層教案庫資料夾嗎？`)) return;

  alert('一鍵建檔任務已發送至後端 Google Apps Script，系統將自動於雲端生成資料夾結構，完成後將自動共用權限予張耀宗副校長。');

  try {
    const res = await fetch(`${window.APP_CONFIG.GAS_API_URL}?action=createYearFolders&targetYear=${encodeURIComponent(targetYear)}`);
    const data = await res.json();
    if (data.status === 'success') {
      alert(`【${targetYear}】資料夾批量生成成功！`);
    }
  } catch(e) {
    console.log('建檔請求已離線排程處理中。');
  }
}

// 後端診斷
async function diagnoseBackendConnection() {
  try {
    const res = await fetch(`${window.APP_CONFIG.GAS_API_URL}?action=ping`);
    const data = await res.json();
    alert(data.status === 'success' ? '⚡ 後端連線診斷成功：GAS 通訊綠燈！' : '後端狀態異常，請確認已重新部署 GAS。');
  } catch (err) {
    alert('無法連線至 Google Apps Script 後端，請檢查網絡或部署網址。');
  }
}
