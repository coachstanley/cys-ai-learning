/**
 * roster-admin.js - 師生名冊管理中心與密碼遮罩顯示
 */

// 確保並取得自愈保底名冊
function ensureAndGetRoster() {
  let roster = [];
  const raw = localStorage.getItem('cys_user_roster');
  if (raw) {
    try { roster = JSON.parse(raw); } catch (e) { roster = []; }
  }

  if (!roster || roster.length === 0) {
    roster = [
      { email: 'cyc@cys.edu.hk', name: '張耀宗副校長', role: 'dual', classGroup: 'Admin/Teacher', password: 'cys24755432' },
      { email: 'teacher@cys.edu.hk', name: '陳老師', role: 'teacher', classGroup: 'ICT & STEM', password: 'cys123456' },
      { email: 'student@cys.edu.hk', name: '張同學', role: 'student', classGroup: 'S1ACD', password: 'cys123456' }
    ];
    localStorage.setItem('cys_user_roster', JSON.stringify(roster));
  } else {
    const hasPrincipal = roster.some(u => u.email && u.email.toLowerCase() === 'cyc@cys.edu.hk');
    if (!hasPrincipal) {
      roster.unshift({
        email: 'cyc@cys.edu.hk',
        name: '張耀宗副校長',
        role: 'dual',
        classGroup: 'Admin/Teacher',
        password: 'cys24755432'
      });
      localStorage.setItem('cys_user_roster', JSON.stringify(roster));
    }
  }

  return roster;
}

// 渲染名冊表格（含密碼遮罩與眼睛切換圖示）
function renderUserRosterTable() {
  const tbody = document.getElementById('adminRosterTableBody');
  if (!tbody) return;

  const roster = ensureAndGetRoster();

  tbody.innerHTML = roster.map((user, idx) => {
    const isCoreAdmin = (user.email && user.email.toLowerCase() === 'cyc@cys.edu.hk');
    const roleBadge = user.role === 'dual' 
      ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">教師及管理員</span>'
      : user.role === 'admin'
      ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">管理員</span>'
      : user.role === 'teacher'
      ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">教師</span>'
      : '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">學生</span>';

    const safePass = user.password || 'cys123456';

    return `
      <tr class="border-b border-gray-100 hover:bg-slate-50 transition">
        <td class="py-2.5 px-3 font-semibold text-gray-800">${user.name || '-'}</td>
        <td class="py-2.5 px-3 text-gray-600 font-mono text-[11px]">${user.email}</td>
        <td class="py-2.5 px-3">${roleBadge}</td>
        <td class="py-2.5 px-3 text-gray-600">${user.classGroup || '-'}</td>
        <td class="py-2.5 px-3">
          <div class="inline-flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded border border-slate-200">
            <span id="passSpan_${idx}" class="font-mono text-gray-700 tracking-wider text-[11px]" data-password="${safePass}">••••••••</span>
            <button type="button" onclick="togglePasswordVisibility(${idx})" class="text-gray-400 hover:text-gray-700 focus:outline-none transition text-xs ml-1" title="顯示/隱藏密碼">
              <i id="eyeIcon_${idx}" class="fa-solid fa-eye"></i>
            </button>
          </div>
        </td>
        <td class="py-2.5 px-3 text-center">
          ${isCoreAdmin ? '<span class="text-gray-400 text-[10px] italic">核心保護</span>' : `
            <button onclick="deleteRosterMember(${idx})" class="text-red-500 hover:text-red-700 text-xs font-bold transition">
              <i class="fa-solid fa-trash-can mr-1"></i>刪除
            </button>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

// 點擊眼睛圖示切換密碼顯示/隱藏
function togglePasswordVisibility(idx) {
  const span = document.getElementById(`passSpan_${idx}`);
  const icon = document.getElementById(`eyeIcon_${idx}`);
  if (!span || !icon) return;

  const rawPassword = span.getAttribute('data-password');
  const isHidden = (span.textContent === '••••••••');

  if (isHidden) {
    span.textContent = rawPassword;
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
    icon.classList.add('text-cys-red');
  } else {
    span.textContent = '••••••••';
    icon.classList.remove('fa-eye-slash');
    icon.classList.remove('text-cys-red');
    icon.classList.add('fa-eye');
  }
}

// 刪除成員（帶核心保護）
function deleteRosterMember(idx) {
  let roster = ensureAndGetRoster();
  const target = roster[idx];
  if (!target) return;
  if (target.email && target.email.toLowerCase() === 'cyc@cys.edu.hk') {
    alert('張耀宗副校長帳號具備核心保護，無法刪除！');
    return;
  }
  if (!confirm(`確定要刪除成員【${target.name || target.email}】嗎？`)) return;

  roster.splice(idx, 1);
  localStorage.setItem('cys_user_roster', JSON.stringify(roster));
  renderUserRosterTable();
}

function saveAdminAcademicYearSetting() {
  const val = document.getElementById('adminAcademicYearSettingInput').value.trim();
  if (!val) return alert('學年度不得為空！');

  localStorage.setItem('cys_current_academic_year', val);
  if (typeof applyAcademicYearToUI === 'function') applyAcademicYearToUI(val);
  alert(`成功變更！全站標籤與 Drive 連動學年已更新為【${val}】！`);
}

async function diagnoseBackendConnection() {
  try {
    const res = await fetch(`${APP_CONFIG.BACKEND_API_URL}?action=ping`, { method: 'GET', mode: 'cors' });
    const data = await res.json();
    if (data.status === 'success' || data.pong) {
      alert(`⚡ GAS 後端連線正常！回傳訊號: ${data.pong || 'pong'} (版本正常運作中)`);
    } else {
      alert(`⚠️ 收到回應但狀態異常: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    alert(`❌ 無法連線至 Google Apps Script 後端，請確認 Web App 是否已發布為「新版本」：\n${err.message}`);
  }
}

async function handleBatchCreateAcademicYear() {
  const year = document.getElementById('targetAcademicYearInput').value.trim();
  if (!year) return alert('請輸入學年度！');
  if (!confirm(`確定要在 Google Drive 建立【${year}】全學年 S1～S6 及所有學科 ACD/BE班 的資料夾嗎？`)) return;

  alert('正在向 247admin 雲端下達批量建檔指令，建檔需時約 10~20 秒，完成後會有通知...');

  try {
    const res = await fetch(APP_CONFIG.BACKEND_API_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'createAcademicYear', year: year })
    });
    const data = await res.json();
    if (data.status === 'success') {
      alert(`🎉 恭喜！【${year}】全學年資料夾及 ACD/BE 班別結構已成功批量建立完成！`);
    } else {
      alert(`建立失敗: ${data.message || '未知錯誤'}`);
    }
  } catch (err) {
    alert(`建檔指令已送出，若因 Google Apps Script 執行時間較長觸發超時，雲端後台仍會持續完成建檔作業。請稍候在 Google Drive 查閱。\n${err.message}`);
  }
}
