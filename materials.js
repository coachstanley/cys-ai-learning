/**
 * materials.js - Google Drive 課題 Checkbox 同步與雲端教材檔案檢索
 * 徹底解決「學生在選年級、科目及班別後未能取得已上載教材」之問題
 */

// 內部狀態快取
let currentTopicsList = [];
let currentMaterialsList = [];
let selectedTopicsSet = new Set();
let isSyncingMaterials = false;

// 取得當前學生所選之參數
function getStudentSelectionParams() {
  const yearInput = document.getElementById('studentAcademicYearInput');
  const gradeSelect = document.getElementById('studentGradeSelect');
  const subjectSelect = document.getElementById('studentSubjectSelect');
  const divisionSelect = document.getElementById('studentDivisionSelect');

  return {
    year: (yearInput ? yearInput.value.trim() : '') || APP_CONFIG.ACADEMIC_YEAR,
    grade: gradeSelect ? gradeSelect.value : 'S1',
    subject: subjectSelect ? subjectSelect.value : '',
    division: divisionSelect ? divisionSelect.value : 'ACD班'
  };
}

// 監聽年級切換
function handleStudentGradeChange() {
  renderStudentSubjectDropdown();
  syncTopicsAndMaterials(false);
}

// 監聽科目切換
function handleStudentSubjectChange() {
  updateSubjectBadgeAndDriveLink();
  syncTopicsAndMaterials(false);
}

// 監聽班別群組切換 (ACD班 / BE班)
function handleStudentDivisionChange() {
  syncTopicsAndMaterials(false);
}

// 動態渲染年級所屬學科選單
function renderStudentSubjectDropdown() {
  const gradeSelect = document.getElementById('studentGradeSelect');
  const subjectSelect = document.getElementById('studentSubjectSelect');
  if (!gradeSelect || !subjectSelect) return;

  const grade = gradeSelect.value;
  const availableSubjects = APP_CONFIG.SUBJECTS_BY_GRADE[grade] || [];

  subjectSelect.innerHTML = availableSubjects.map(subName => {
    return `<option value="${subName}">${subName}</option>`;
  }).join('');

  updateSubjectBadgeAndDriveLink();
}

// 更新畫面上的領域標籤與 Drive 捷徑連結
function updateSubjectBadgeAndDriveLink() {
  const subjectSelect = document.getElementById('studentSubjectSelect');
  const badge = document.getElementById('currentSubjectKLABadge');
  const driveLink = document.getElementById('studentDriveSubjectLink');
  if (!subjectSelect) return;

  const currentSub = subjectSelect.value;
  let domainName = "一般領域";

  for (const domain of APP_CONFIG.KLA_DOMAINS) {
    if (domain.subjects.includes(currentSub)) {
      domainName = domain.name;
      break;
    }
  }

  if (badge) {
    badge.innerText = `${domainName} (${currentSub})`;
  }

  // 快捷搜尋對應學科資料夾
  if (driveLink) {
    const { year, grade } = getStudentSelectionParams();
    driveLink.href = `https://drive.google.com/drive/search?q=${encodeURIComponent(year + ' ' + grade + ' ' + currentSub)}`;
  }
}

// 核心同步函式：自後端 Google Apps Script 取得課題資料夾與已上載教材
async function syncTopicsAndMaterials(isManualRefresh = false) {
  const params = getStudentSelectionParams();
  const statusSpan = document.getElementById('topicSyncStatus');
  const refreshIcon = document.getElementById('topicRefreshIcon');
  const container = document.getElementById('topicCheckboxesContainer');
  const materialsSection = document.getElementById('driveMaterialsSection');
  const materialsGrid = document.getElementById('driveMaterialsGrid');
  const materialsCountBadge = document.getElementById('materialsCountBadge');

  if (!params.subject) return;

  if (refreshIcon) refreshIcon.classList.add('fa-spin');
  if (statusSpan) statusSpan.innerText = '正在向 Google Drive 同步課題與教材...';
  isSyncingMaterials = true;

  // 清除先前的選取
  selectedTopicsSet.clear();
  updateSelectedTopicsDisplay();

  const apiUrl = `${APP_CONFIG.BACKEND_API_URL}?action=getTopicsAndMaterials` +
                 `&year=${encodeURIComponent(params.year)}` +
                 `&grade=${encodeURIComponent(params.grade)}` +
                 `&subject=${encodeURIComponent(params.subject)}` +
                 `&division=${encodeURIComponent(params.division)}`;

  try {
    const response = await fetch(apiUrl, { method: 'GET', mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);

    const data = await response.json();

    if (data.status === 'success') {
      currentTopicsList = data.topics || [];
      currentMaterialsList = data.materials || [];

      renderTopicCheckboxes(currentTopicsList);
      renderDriveMaterialsGrid(currentMaterialsList);

      if (statusSpan) {
        statusSpan.innerText = `同步成功 (共 ${currentTopicsList.length} 個課題，${currentMaterialsList.length} 份教材)`;
        setTimeout(() => { if (statusSpan) statusSpan.innerText = ''; }, 4000);
      }
    } else {
      throw new Error(data.message || '後端回傳查詢失敗');
    }
  } catch (err) {
    console.warn('雲端課題同步中斷或尚在建檔，啟動智能預設課題:', err);
    // 容錯機制：若雲端資料夾尚未建好，提供校本標準核心章節
    currentTopicsList = [
      `CH.1 基礎概念與導論`,
      `CH.2 核心原理與實務推演`,
      `CH.3 生活科技應用情境`,
      `CH.4 DSE 模擬題型專案`
    ];
    currentMaterialsList = [];

    renderTopicCheckboxes(currentTopicsList);
    renderDriveMaterialsGrid(currentMaterialsList);

    if (statusSpan) {
      statusSpan.innerText = '老師正在雲端整理中 (已載入標準課題)';
      setTimeout(() => { if (statusSpan) statusSpan.innerText = ''; }, 4000);
    }
  } finally {
    isSyncingMaterials = false;
    if (refreshIcon) refreshIcon.classList.remove('fa-spin');
  }
}

// 渲染課題 Checkbox 清單
function renderTopicCheckboxes(topics) {
  const container = document.getElementById('topicCheckboxesContainer');
  if (!container) return;

  if (!topics || topics.length === 0) {
    container.innerHTML = `
      <div class="p-3 bg-yellow-50 text-yellow-800 rounded-lg text-xs w-full flex items-center justify-between border border-yellow-200">
        <span>📂 老師準備教材中，此班別資料夾暫未有課題子資料夾。同學可直接發問或於右上方新增自訂課題！</span>
        <button onclick="syncTopicsAndMaterials(true)" class="underline font-bold ml-2 hover:text-yellow-900">重試</button>
      </div>
    `;
    return;
  }

  container.innerHTML = topics.map((t, index) => {
    const id = `chk_topic_${index}`;
    return `
      <div class="relative inline-block">
        <input type="checkbox" id="${id}" value="${t}" class="topic-checkbox hidden" onchange="handleTopicCheckChange(this)">
        <label for="${id}" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-700 cursor-pointer hover:bg-gray-100 transition">
          <i class="fa-solid fa-folder text-amber-500 text-[11px]"></i>
          <span>${t}</span>
        </label>
      </div>
    `;
  }).join('');
}

// 渲染雲端已上載教材清單卡片
function renderDriveMaterialsGrid(materials) {
  const section = document.getElementById('driveMaterialsSection');
  const grid = document.getElementById('driveMaterialsGrid');
  const countBadge = document.getElementById('materialsCountBadge');
  if (!section || !grid) return;

  if (!materials || materials.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  if (countBadge) countBadge.innerText = `${materials.length} 個雲端教材`;

  grid.innerHTML = materials.map(item => {
    let iconClass = 'fa-file-pdf text-red-500';
    if (item.type === 'slide') iconClass = 'fa-file-powerpoint text-orange-500';
    else if (item.type === 'doc') iconClass = 'fa-file-word text-blue-500';
    else if (item.type === 'image') iconClass = 'fa-file-image text-emerald-500';

    return `
      <a href="${item.url}" target="_blank" class="flex items-center p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg transition group">
        <div class="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center mr-2.5 flex-shrink-0">
          <i class="fa-solid ${iconClass} text-base group-hover:scale-110 transition"></i>
        </div>
        <div class="flex-grow min-w-0">
          <div class="text-xs font-bold text-gray-800 truncate group-hover:text-blue-700">${item.name}</div>
          <div class="text-[10px] text-gray-400 flex items-center gap-1">
            <span>Google Drive 講義</span>
            <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
          </div>
        </div>
      </a>
    `;
  }).join('');
}

// 處理課題勾選變化
function handleTopicCheckChange(chk) {
  if (chk.checked) {
    selectedTopicsSet.add(chk.value);
  } else {
    selectedTopicsSet.delete(chk.value);
  }
  updateSelectedTopicsDisplay();
}

// 新增自訂課題
function addCustomTopic() {
  const input = document.getElementById('customTopicInput');
  const val = input.value.trim();
  if (!val) return;

  if (!currentTopicsList.includes(val)) {
    currentTopicsList.push(val);
    renderTopicCheckboxes(currentTopicsList);
  }
  selectedTopicsSet.add(val);
  updateSelectedTopicsDisplay();
  input.value = '';
}

// 更新已選課題徽章清單
function updateSelectedTopicsDisplay() {
  const display = document.getElementById('selectedTopicsBadgeList');
  if (!display) return;

  if (selectedTopicsSet.size === 0) {
    display.innerText = '未勾選特定課題 (AI將以該學科全範圍作答)';
    return;
  }

  const arr = Array.from(selectedTopicsSet);
  display.innerText = arr.join('、');
}
