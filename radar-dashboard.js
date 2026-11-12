/**
 * radar-dashboard.js - EDB 八大學習領域雷達圖與教師宏觀自學統計
 */

let studentRadarChartInstance = null;

// 使用人次統計持久化
function getSubjectUsageStats() {
  const stored = localStorage.getItem('cys_subject_usage_stats');
  if (stored) {
    try { return JSON.parse(stored); } catch(e) {}
  }
  const init = {};
  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.ALL_24_SUBJECTS) {
    APP_CONFIG.ALL_24_SUBJECTS.forEach(s => { init[s.code] = 0; });
  }
  return init;
}

function recordSubjectUsage(subjectCode) {
  const stats = getSubjectUsageStats();
  stats[subjectCode] = (stats[subjectCode] || 0) + 1;
  localStorage.setItem('cys_subject_usage_stats', JSON.stringify(stats));
}

// 八大學習領域雷達圖
function initStudentRadarChart() {
  const ctx = document.getElementById('studentRadarChart');
  if (!ctx || typeof Chart === 'undefined') return;

  if (studentRadarChartInstance) studentRadarChartInstance.destroy();

  const labels = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.KLA_DOMAINS) ? APP_CONFIG.KLA_DOMAINS.map(d => d.name) : [];
  const dataVals = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.KLA_DOMAINS) ? APP_CONFIG.KLA_DOMAINS.map(d => d.defaultVal) : [];

  studentRadarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [{
        label: '個人學習領域學力值',
        data: dataVals,
        backgroundColor: 'rgba(139, 29, 36, 0.2)',
        borderColor: '#8B1D24',
        borderWidth: 2,
        pointBackgroundColor: '#8B1D24',
        pointBorderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 40,
          max: 100,
          ticks: { stepSize: 15, display: false },
          pointLabels: { font: { size: 10, weight: 'bold' }, color: '#4b5563' }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function updateRadarValuesOnQuestion(subjectName) {
  if (!studentRadarChartInstance || typeof APP_CONFIG === 'undefined') return;

  let targetDomainIndex = -1;
  for (let i = 0; i < APP_CONFIG.KLA_DOMAINS.length; i++) {
    if (APP_CONFIG.KLA_DOMAINS[i].subjects.includes(subjectName)) {
      targetDomainIndex = i;
      break;
    }
  }

  if (targetDomainIndex >= 0) {
    let currentVal = studentRadarChartInstance.data.datasets[0].data[targetDomainIndex];
    if (currentVal < 98) {
      studentRadarChartInstance.data.datasets[0].data[targetDomainIndex] = currentVal + 2;
      studentRadarChartInstance.update();
    }
  }
}

// 教師頁：S1～S6 直達教案庫
function renderTeacherGradeDriveGrid() {
  const container = document.getElementById('teacherGradeDriveGrid');
  if (!container) return;

  const grades = ["S1", "S2", "S3", "S4", "S5", "S6"];
  const year = typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.ACADEMIC_YEAR : '2026-2027';

  container.innerHTML = grades.map(g => {
    const query = encodeURIComponent(`${year} ${g}`);
    return `
      <a href="https://drive.google.com/drive/search?q=${query}" target="_blank"
         class="bg-white hover:bg-blue-50 border border-blue-200 p-3 rounded-lg text-center transition shadow-2xs group flex flex-col items-center justify-center">
        <i class="fa-solid fa-folder-open text-amber-500 text-xl group-hover:scale-110 transition mb-1"></i>
        <div class="text-xs font-bold text-gray-800">${year} ${g}</div>
        <div class="text-[9px] text-gray-400 mt-0.5">進入各學科ACD/BE班</div>
      </a>
    `;
  }).join('');
}

// 教師頁：24 科自學人次卡片
function renderSubjectActivityCards() {
  const container = document.getElementById('subjectActivityCardsContainer');
  if (!container || typeof APP_CONFIG === 'undefined') return;

  const stats = getSubjectUsageStats();

  container.innerHTML = APP_CONFIG.ALL_24_SUBJECTS.map(sub => {
    const count = stats[sub.code] || 0;
    return `
      <div class="p-3 bg-slate-50 border-l-4 ${sub.color} rounded-lg border border-gray-200">
        <div class="flex justify-between items-start">
          <span class="text-xs font-bold text-gray-700">${sub.name}</span>
          <i class="fa-solid ${sub.icon} text-gray-400 text-xs"></i>
        </div>
        <div class="mt-2 text-right">
          <span class="text-xl font-black text-gray-800">${count}</span>
          <span class="text-[10px] text-gray-400 ml-1">人次</span>
        </div>
      </div>
    `;
  }).join('');
}

function clearAllStudentUsageStats() {
  if (!confirm('確定要歸零並清除所有科目的自學人次數據嗎？此動作無法復原。')) return;
  const init = {};
  if (typeof APP_CONFIG !== 'undefined') {
    APP_CONFIG.ALL_24_SUBJECTS.forEach(s => { init[s.code] = 0; });
  }
  localStorage.setItem('cys_subject_usage_stats', JSON.stringify(init));
  renderSubjectActivityCards();
  alert('已全數歸零並重設完畢！');
}
