/**
 * radar-dashboard.js - EDB 八大學習領域 (KLAs) 雷達圖視覺化與數值累進
 */

let studentRadarChartInstance = null;

// 初始化八大學習領域雷達圖
function initStudentRadarChart() {
  const canvas = document.getElementById('studentRadarChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const defaultScores = [65, 70, 75, 80, 85, 60, 70, 65];

  if (studentRadarChartInstance) {
    studentRadarChartInstance.destroy();
  }

  studentRadarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: window.APP_CONFIG.KLA_NAMES,
      datasets: [{
        label: '學力累積指數',
        data: defaultScores,
        backgroundColor: 'rgba(139, 29, 36, 0.25)',
        borderColor: '#8B1D24',
        pointBackgroundColor: '#D4AF37',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#8B1D24',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          angleLines: { color: '#e2e8f0' },
          grid: { color: '#e2e8f0' },
          pointLabels: {
            font: { size: 10, weight: 'bold' },
            color: '#475569'
          },
          suggestedMin: 30,
          suggestedMax: 100,
          ticks: { display: false }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// 根據發問學科提升對應領域得分
function incrementSubjectKlaScore(subjectCode) {
  if (!studentRadarChartInstance) return;

  const matchedSub = window.APP_CONFIG.SUBJECT_DEFINITIONS.find(s => s.code === subjectCode);
  const klaName = matchedSub ? matchedSub.kla : '科技教育';
  const klaIndex = window.APP_CONFIG.KLA_NAMES.indexOf(klaName);

  if (klaIndex !== -1) {
    const currentVal = studentRadarChartInstance.data.datasets[0].data[klaIndex];
    if (currentVal < 98) {
      studentRadarChartInstance.data.datasets[0].data[klaIndex] = currentVal + 3;
      studentRadarChartInstance.update();
    }
  }
}
