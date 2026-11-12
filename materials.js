/**
 * materials.js - 年級/科目選單、Google Drive 課題 Checkbox 動態同步
 */

// 初始化學生自學選單
function initStudentSelectors() {
  const yearInput = document.getElementById('studentAcademicYearInput');
  if (yearInput) {
    yearInput.value = localStorage.getItem('cys_academic_year') || window.APP_CONFIG.DEFAULT_ACADEMIC_YEAR;
  }

  const subjectSelect = document.getElementById('studentSubjectSelect');
  if (subjectSelect) {
    subjectSelect.innerHTML = window.APP_CONFIG.SUBJECT_DEFINITIONS.map(s => 
      `<option value="${s.code}">${s.code} - ${s.name}</option>`
    ).join('');
  }

  syncTopicsAndMaterials(false);
}

// 同步 Drive 課題資料夾與教材檔案
async function syncTopicsAndMaterials(isManualRefresh) {
  const grade = document.getElementById('studentGradeSelect')?.value || 'S1';
  const subject = document.getElementById('studentSubjectSelect')?.value || 'CT';
  const group = document.getElementById('studentClassGroupSelect')?.value || 'ACD';
  const year = localStorage.getItem('cys_academic_year') || window.APP_CONFIG.DEFAULT_ACADEMIC_YEAR;

  const topicsContainer = document.getElementById('topicsCheckboxContainer');
  const materialsContainer = document.getElementById('materialsListContainer');

  if (topicsContainer) {
    topicsContainer.innerHTML = '<div class="text-[11px] text-gray-400 py-2"><i class="fa-solid fa-spinner fa-spin mr-1"></i>正在讀取 Google Drive 課題...</div>';
  }

  try {
    const queryUrl = `${window.APP_CONFIG.GAS_API_URL}?action=getTopicsAndMaterials&year=${encodeURIComponent(year)}&grade=${encodeURIComponent(grade)}&subject=${encodeURIComponent(subject)}&group=${encodeURIComponent(group)}`;
    
    // 設置 5 秒超時自動降級機制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(queryUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await res.json();

    if (data.status === 'success' && data.topics && data.topics.length > 0) {
      renderTopicsCheckboxes(data.topics);
      renderMaterialsList(data.materials || []);
    } else {
      renderFallbackTopics(subject);
    }
  } catch (e) {
    // 網路延遲或斷線時使用校本知識庫
    renderFallbackTopics(subject);
  }
}

function renderTopicsCheckboxes(topics) {
  const container = document.getElementById('topicsCheckboxContainer');
  if (!container) return;

  container.innerHTML = topics.map((t, idx) => `
    <label class="flex items-center gap-2 p-1.5 hover:bg-red-50 rounded cursor-pointer transition text-xs">
      <input type="checkbox" name="activeTopic" value="${t.name}" class="rounded text-cys-red focus:ring-cys-red" ${idx === 0 ? 'checked' : ''}>
      <span class="text-gray-700 font-medium">${t.name}</span>
    </label>
  `).join('');
}

function renderFallbackTopics(subjectCode) {
  const container = document.getElementById('topicsCheckboxContainer');
  if (!container) return;

  const defaults = [
    `單元一：${subjectCode} 核心基礎原理與概念`,
    `單元二：${subjectCode} DSE 模擬實用解難`,
    `單元三：日常生活情境與 STEAM 專題探究`
  ];

  container.innerHTML = defaults.map((d, idx) => `
    <label class="flex items-center gap-2 p-1.5 hover:bg-red-50 rounded cursor-pointer transition text-xs">
      <input type="checkbox" name="activeTopic" value="${d}" class="rounded text-cys-red focus:ring-cys-red" ${idx === 0 ? 'checked' : ''}>
      <span class="text-gray-700 font-medium">${d}</span>
    </label>
  `).join('');
}

function renderMaterialsList(materials) {
  const container = document.getElementById('materialsListContainer');
  if (!container) return;

  if (materials.length === 0) {
    container.innerHTML = '<div class="text-[11px] text-gray-400 py-1">老師正在雲端整理最新講義...</div>';
    return;
  }

  container.innerHTML = materials.map(m => `
    <div class="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
      <span class="font-medium truncate max-w-[200px]">${m.name}</span>
      <a href="${m.url}" target="_blank" class="text-cys-red hover:underline font-bold">開啟</a>
    </div>
  `).join('');
}
