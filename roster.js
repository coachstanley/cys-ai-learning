/**
 * roster.js - 全校師生名冊管理中心與 CSV 雙向持久化儲存
 */

function getStoredRoster() {
  if (window.__CYS_ROSTER_CACHE__ && Array.isArray(window.__CYS_ROSTER_CACHE__) && window.__CYS_ROSTER_CACHE__.length > 0) {
    return window.__CYS_ROSTER_CACHE__;
  }
  const stored = localStorage.getItem('cys_user_roster');
  if (!stored) {
    window.__CYS_ROSTER_CACHE__ = [...DEFAULT_ROSTER];
    localStorage.setItem('cys_user_roster', JSON.stringify(DEFAULT_ROSTER));
    return DEFAULT_ROSTER;
  }
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      window.__CYS_ROSTER_CACHE__ = [...DEFAULT_ROSTER];
      return DEFAULT_ROSTER;
    }
    window.__CYS_ROSTER_CACHE__ = parsed;
    return parsed;
  } catch (e) {
    return DEFAULT_ROSTER;
  }
}

// 雙層持久化寫入 (LocalStorage + 記憶體)
function saveRoster(roster) {
  window.__CYS_ROSTER_CACHE__ = roster;
  try {
    localStorage.setItem('cys_user_roster', JSON.stringify(roster));
  } catch (e) {}
  renderUserRosterTable();
}

function triggerCsvFileUpload() {
  const fileInput = document.getElementById('csvFileInput');
  fileInput.value = '';
  fileInput.click();
}

function handleCsvFileSelected(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    processCsvContent(evt.target.result, file.name);
  };
  reader.readAsText(file, 'UTF-8');
}

function parseCsvLine(line) {
  const res = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if ((c === ',' || c === '\t' || c === ';') && !inQuotes) {
      res.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  res.push(cur.trim());
  return res;
}

function processCsvContent(csvText, fileName) {
  if (!csvText || !csvText.trim()) return alert('CSV 檔案為空！');
  if (csvText.charCodeAt(0) === 0xFEFF) csvText = csvText.slice(1);

  const lines = csvText.split(/\r?\n/);
  let roster = [...getStoredRoster()];

  DEFAULT_ROSTER.forEach(core => {
    if (!roster.some(u => u.email.toLowerCase() === core.email.toLowerCase())) {
      roster.push({ ...core });
    }
  });

  let imported = 0;
  lines.forEach((line, idx) => {
    line = line.trim();
    if (!line || (idx === 0 && line.includes('姓名'))) return;

    const parts = parseCsvLine(line);
    let name = parts[0] || '', email = parts[1] || '', role = 'student', note = parts[3] || '', pass = parts[4] || 'cys123456';

    if (parts[0] && parts[0].includes('@')) {
      email = parts[0];
      name = parts[1] || email.split('@')[0];
    }

    if (email && !email.includes('@')) email += '@cys.edu.hk';
    email = email.toLowerCase().replace(/["']/g, '');

    if (email && email.includes('@')) {
      const rStr = (parts[2] || '').toLowerCase();
      if (rStr.includes('雙重') || rStr.includes('admin_teacher')) role = 'admin_teacher';
      else if (rStr.includes('師') || rStr.includes('teacher')) role = 'teacher';
      else if (rStr.includes('管') || rStr.includes('admin')) role = 'admin';

      const existIdx = roster.findIndex(u => u.email.toLowerCase() === email);
      if (existIdx >= 0) {
        roster[existIdx].name = name || roster[existIdx].name;
        if (!roster[existIdx].isCore) roster[existIdx].role = role;
        roster[existIdx].note = note;
        roster[existIdx].password = pass;
      } else {
        roster.push({
          id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          name: name || email.split('@')[0],
          email: email,
          role: role,
          note: note,
          password: pass,
          isCore: false
        });
      }
      imported++;
    }
  });

  if (imported === 0) return alert('未能讀取到有效名冊資料！已保留現有名冊。');
  saveRoster(roster);
  if (document.getElementById('modalBatchImport')) closeBatchImportModal();
  alert(`🎉 成功儲存！已將【${fileName || 'CSV'}】共 ${imported} 筆帳戶完整寫入系統！`);
}

function downloadCsvTemplate() {
  const template = "\uFEFF姓名,校本電郵,身分角色,班別或備註,登入密碼\n陳小明,s1_01@cys.edu.hk,學生,1A (01),cys123456\n黃老師,wong@cys.edu.hk,教師,創科老師,cys123456\n";
  const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'CYS_名冊匯入範本.csv';
  a.click();
}

function exportRosterToCsv() {
  const roster = getStoredRoster();
  let csv = "\uFEFF姓名,校本電郵,身分角色,班別或備註,登入密碼\n";
  roster.forEach(u => {
    let role = (u.role === 'admin_teacher') ? '雙重身分' : (u.role === 'admin' ? '管理員' : (u.role === 'teacher' ? '教師' : '學生'));
    csv += `"${u.name}","${u.email}","${role}","${u.note || ''}","${u.password || 'cys123456'}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `CYS_名冊備份_${APP_CONFIG.ACADEMIC_YEAR}.csv`;
  a.click();
}

function renderUserRosterTable() {
  const roster = getStoredRoster();
  const tbody = document.getElementById('userRosterTableBody');
  if (!tbody) return;
  const q = (document.getElementById('rosterSearchInput').value || '').toLowerCase();

  document.getElementById('countAll').innerText = roster.length;
  document.getElementById('countTeacher').innerText = roster.filter(u => u.role === 'teacher' || u.role === 'admin_teacher').length;
  document.getElementById('countStudent').innerText = roster.filter(u => u.role === 'student').length;
  document.getElementById('countAdmin').innerText = roster.filter(u => u.role === 'admin' || u.role === 'admin_teacher').length;

  const filtered = roster.filter(u => {
    if (rosterFilter === 'teacher' && u.role !== 'teacher' && u.role !== 'admin_teacher') return false;
    if (rosterFilter === 'student' && u.role !== 'student') return false;
    if (rosterFilter === 'admin' && u.role !== 'admin' && u.role !== 'admin_teacher') return false;
    if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q) && !(u.note || '').toLowerCase().includes(q)) return false;
    return true;
  });

  tbody.innerHTML = filtered.map(u => `
    <tr class="hover:bg-slate-50 transition">
      <td class="py-2.5 px-4 font-bold text-gray-800">${u.name}</td>
      <td class="py-2.5 px-4 font-mono text-gray-600">${u.email}</td>
      <td class="py-2.5 px-4">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${u.role === 'admin_teacher' ? 'bg-purple-100 text-purple-700' : (u.role === 'admin' ? 'bg-red-100 text-red-700' : (u.role === 'teacher' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'))}">
          ${u.role === 'admin_teacher' ? '雙重身分' : (u.role === 'admin' ? '管理員' : (u.role === 'teacher' ? '教師' : '學生'))}
        </span>
      </td>
      <td class="py-2.5 px-4 text-gray-500">${u.note || '-'}</td>
      <td class="py-2.5 px-4 font-mono text-gray-400">${u.isCore ? '••••••••' : (u.password || 'cys123456')}</td>
      <td class="py-2.5 px-4 text-center">
        ${u.isCore ? '<span class="text-gray-400 text-[10px]">鎖定保護</span>' : `
          <button onclick="editUser('${u.id}')" class="text-blue-600 hover:text-blue-800 mr-2"><i class="fa-solid fa-pen"></i></button>
          <button onclick="deleteUser('${u.id}')" class="text-red-500 hover:text-red-700"><i class="fa-solid fa-trash"></i></button>
        `}
      </td>
    </tr>
  `).join('');
}

function filterUserRoster(type) {
  rosterFilter = type;
  ['tabRosterAll', 'tabRosterTeacher', 'tabRosterStudent', 'tabRosterAdmin'].forEach(id => {
    document.getElementById(id).className = 'px-2.5 py-1 rounded font-medium text-gray-600 hover:bg-gray-100';
  });
  const activeId = type === 'all' ? 'tabRosterAll' : (type === 'teacher' ? 'tabRosterTeacher' : (type === 'student' ? 'tabRosterStudent' : 'tabRosterAdmin'));
  document.getElementById(activeId).className = 'px-2.5 py-1 rounded font-bold bg-white text-gray-800 shadow-2xs';
  renderUserRosterTable();
}

function openAddUserModal() {
  document.getElementById('modalUserTitle').innerText = '新增帳號';
  document.getElementById('editUserId').value = '';
  document.getElementById('modalUserName').value = '';
  document.getElementById('modalUserEmail').value = '';
  document.getElementById('modalUserRole').value = 'student';
  document.getElementById('modalUserNote').value = '';
  document.getElementById('modalUserPassword').value = '';
  document.getElementById('modalUserEdit').classList.remove('hidden');
}

function editUser(id) {
  const u = getStoredRoster().find(x => x.id === id);
  if (!u) return;
  document.getElementById('modalUserTitle').innerText = '修改帳號';
  document.getElementById('editUserId').value = u.id;
  document.getElementById('modalUserName').value = u.name;
  document.getElementById('modalUserEmail').value = u.email;
  document.getElementById('modalUserRole').value = u.role;
  document.getElementById('modalUserNote').value = u.note || '';
  document.getElementById('modalUserPassword').value = u.password || '';
  document.getElementById('modalUserEdit').classList.remove('hidden');
}

function closeUserEditModal() {
  document.getElementById('modalUserEdit').classList.add('hidden');
}

function handleSaveUser(e) {
  e.preventDefault();
  const id = document.getElementById('editUserId').value;
  const name = document.getElementById('modalUserName').value.trim();
  const email = document.getElementById('modalUserEmail').value.trim().toLowerCase();
  const role = document.getElementById('modalUserRole').value;
  const note = document.getElementById('modalUserNote').value.trim();
  const pass = document.getElementById('modalUserPassword').value.trim() || 'cys123456';

  let roster = [...getStoredRoster()];
  if (id) {
    const idx = roster.findIndex(x => x.id === id);
    if (idx >= 0) {
      roster[idx] = { ...roster[idx], name, email, role, note, password: pass };
    }
  } else {
    roster.push({
      id: 'usr_' + Date.now(),
      name, email, role, note, password: pass, isCore: false
    });
  }
  saveRoster(roster);
  closeUserEditModal();
}

function deleteUser(id) {
  if (!confirm('確定要刪除此帳號嗎？')) return;
  let roster = getStoredRoster().filter(u => u.id !== id);
  saveRoster(roster);
}

function openBatchImportModal() {
  document.getElementById('modalBatchImport').classList.remove('hidden');
}

function closeBatchImportModal() {
  document.getElementById('modalBatchImport').classList.add('hidden');
}

function executeBatchImport() {
  const text = document.getElementById('batchImportTextarea').value;
  processCsvContent(text, '貼上文字');
}
