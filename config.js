/**
 * config.js - 系統核心設定與常數配置
 */
window.APP_CONFIG = {
  // Google Apps Script 正式部署 API 網址
  GAS_API_URL: 'https://script.google.com/macros/s/AKfycbx8PZ9v0Eze0M1ALXZmk1X6cLMZejgdJKSnFWHaY7Gbh2gyHbzX6hKMcjvesF-lNE4sxw/exec',

  // Google Drive 247admin 官方根目錄 ID
  DRIVE_ROOT_FOLDER_ID: '1yaG5yqGmnNjIjh7wPQytD1IDwdXhuOEe',

  // Google OAuth 官方 Client ID
  GOOGLE_CLIENT_ID: '1005585287962-avgemumj155io6a1qm3tbcpqpq7mekpt.apps.googleusercontent.com',

  // 預設學年度
  DEFAULT_ACADEMIC_YEAR: '2026-2027',

  // 預設核心管理員帳號
  CORE_ADMIN_EMAIL: 'cyc@cys.edu.hk',

  // 全校 24 個學科及所屬 EDB 8 大學習領域映射表
  SUBJECT_DEFINITIONS: [
    { code: 'CHI', name: '中國語文', kla: '中國語文教育' },
    { code: 'ENG', name: '英國語文', kla: '英國語文教育' },
    { code: 'MATH', name: '數學科', kla: '數學教育' },
    { code: 'M1', name: '數學延伸單元一 (M1)', kla: '數學教育' },
    { code: 'M2', name: '數學延伸單元二 (M2)', kla: '數學教育' },
    { code: 'CSD', name: '公民與社會發展科', kla: '個人、社會及人文教育' },
    { code: 'PHY', name: '物理科', kla: '科學教育' },
    { code: 'CHEM', name: '化學科', kla: '科學教育' },
    { code: 'BIO', name: '生物科', kla: '科學教育' },
    { code: 'IS', name: '綜合科學', kla: '科學教育' },
    { code: 'ICT', name: '資訊及通訊科技 (ICT)', kla: '科技教育' },
    { code: 'CT', name: '創新科技 (CT)', kla: '科技教育' },
    { code: 'DAT', name: '設計與應用科技 (DAT)', kla: '科技教育' },
    { code: 'DNT', name: '設計與科技 (D&T)', kla: '科技教育' },
    { code: 'HE', name: '家政科 (HE)', kla: '科技教育' },
    { code: 'ECON', name: '經濟科', kla: '個人、社會及人文教育' },
    { code: 'BAFS', name: '企業、會計與財務概論 (BAFS)', kla: '個人、社會及人文教育' },
    { code: 'HIST', name: '歷史科', kla: '個人、社會及人文教育' },
    { code: 'CHIST', name: '中國歷史科', kla: '個人、社會及人文教育' },
    { code: 'GEOG', name: '地理科', kla: '個人、社會及人文教育' },
    { code: 'L&S', name: '生活與社會科', kla: '個人、社會及人文教育' },
    { code: 'THS', name: '旅遊與款待科 (THS)', kla: '個人、社會及人文教育' },
    { code: 'VA', name: '視覺藝術科', kla: '藝術教育' },
    { code: 'MUS', name: '音樂科', kla: '藝術教育' },
    { code: 'PE', name: '體育科', kla: '體育' }
  ],

  // 8 大學習領域名稱清單
  KLA_NAMES: [
    '中國語文教育', '英國語文教育', '數學教育',
    '科學教育', '科技教育', '個人、社會及人文教育',
    '藝術教育', '體育'
  ]
};
