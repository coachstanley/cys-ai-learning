/**
 * config.js - 系統全域配置與學科字典
 */

const APP_CONFIG = {
  ACADEMIC_YEAR: localStorage.getItem('cys_current_academic_year') || "2026-2027",
  GOOGLE_CLIENT_ID: "1005585287962-avgemumj155io6a1qm3tbcpqpq7mekpt.apps.googleusercontent.com",
  BACKEND_API_URL: "https://script.google.com/macros/s/AKfycbx8PZ9v0Eze0M1ALXZmk1X6cLMZejgdJKSnFWHaY7Gbh2gyHbzX6hKMcjvesF-lNE4sxw/exec",
  ROOT_FOLDER_ID: "1yaG5yqGmnNjIjh7wPQytD1IDwdXhuOEe",
  DEFAULT_ADMIN_EMAIL: "cyc@cys.edu.hk",
  DEFAULT_HOST_EMAIL: "247admin@cys.edu.hk",

  // 管理員專屬雜湊特徵碼 (Salted SHA-256，密碼不外洩)
  // 經由 Web Crypto 生成，源碼內完全無明文密碼，不可逆
  SECURE_ADMIN_HASH: "8f3810ec694ffad2a39a04f21e51b3eb5b79da95a70eb46e2798f06079be27aa",
  SECURE_SALT: "CYS_CYC_247_SECURE_TOKEN_2026",

  ALL_24_SUBJECTS: [
    { code: "CT", name: "CT創意科技", domain: "tech", icon: "fa-microchip", color: "border-l-red-500" },
    { code: "MA", name: "MA數學", domain: "math", icon: "fa-calculator", color: "border-l-blue-500" },
    { code: "CS", name: "CS電腦", domain: "tech", icon: "fa-laptop-code", color: "border-l-purple-500" },
    { code: "PHY", name: "PHY物理", domain: "sci", icon: "fa-atom", color: "border-l-indigo-500" },
    { code: "CL", name: "CL中文", domain: "chi", icon: "fa-book", color: "border-l-emerald-500" },
    { code: "EL", name: "EL英文", domain: "eng", icon: "fa-language", color: "border-l-teal-500" },
    { code: "CHEM", name: "CHEM化學", domain: "sci", icon: "fa-flask", color: "border-l-amber-500" },
    { code: "BIO", name: "BIO生物", domain: "sci", icon: "fa-dna", color: "border-l-lime-500" },
    { code: "AT", name: "AT汽車科技", domain: "tech", icon: "fa-car", color: "border-l-orange-500" },
    { code: "EC", name: "EC經濟", domain: "pshe", icon: "fa-chart-line", color: "border-l-cyan-500" },
    { code: "CH", name: "CH中史", domain: "pshe", icon: "fa-landmark", color: "border-l-rose-500" },
    { code: "CSD", name: "CSD公民", domain: "pshe", icon: "fa-users", color: "border-l-violet-500" },
    { code: "IS", name: "IS科學", domain: "sci", icon: "fa-vial", color: "border-l-sky-500" },
    { code: "GEO", name: "GEO地理", domain: "pshe", icon: "fa-earth-asia", color: "border-l-emerald-600" },
    { code: "HIST", name: "HIST歷史", domain: "pshe", icon: "fa-monument", color: "border-l-amber-700" },
    { code: "CM", name: "CM商科", domain: "pshe", icon: "fa-briefcase", color: "border-l-blue-600" },
    { code: "ER", name: "ER倫宗", domain: "pshe", icon: "fa-hands-praying", color: "border-l-purple-600" },
    { code: "PU", name: "PU普通話", domain: "chi", icon: "fa-comments", color: "border-l-pink-500" },
    { code: "VA", name: "VA視藝", domain: "arts", icon: "fa-palette", color: "border-l-fuchsia-500" },
    { code: "MU", name: "MU音樂", domain: "arts", icon: "fa-music", color: "border-l-violet-600" },
    { code: "PE", name: "PE體育", domain: "pe", icon: "fa-person-running", color: "border-l-green-600" },
    { code: "PE_DSE", name: "PE_DSE體育", domain: "pe", icon: "fa-medal", color: "border-l-emerald-700" },
    { code: "THS", name: "THS旅款", domain: "pshe", icon: "fa-plane-departure", color: "border-l-yellow-600" },
    { code: "Lib", name: "Lib圖書館", domain: "pshe", icon: "fa-book-bookmark", color: "border-l-stone-600" }
  ],
  SUBJECTS_BY_GRADE: {
    "S1": ["CH中史", "CL中文", "CSD公民", "CS電腦", "CT創意科技", "EL英文", "ER倫宗", "GEO地理", "HIST歷史", "IS科學", "MA數學", "MU音樂", "PE體育", "PU普通話", "VA視藝"],
    "S2": ["CH中史", "CL中文", "CSD公民", "CS電腦", "CT創意科技", "EL英文", "ER倫宗", "GEO地理", "HIST歷史", "IS科學", "MA數學", "MU音樂", "PE體育", "PU普通話", "VA視藝"],
    "S3": ["BIO生物", "CHEM化學", "CH中史", "CL中文", "CM商科", "CSD公民", "CS電腦", "CT創意科技", "EC經濟", "EL英文", "ER倫宗", "GEO地理", "HIST歷史", "MA數學", "MU音樂", "PE體育", "PHY物理", "PU普通話", "VA視藝"],
    "S4": ["AT汽車科技", "BIO生物", "CHEM化學", "CH中史", "CL中文", "CM商科", "CSD公民", "CS電腦", "CT創意科技", "EC經濟", "EL英文", "ER倫宗", "GEO地理", "HIST歷史", "IS科學", "Lib圖書館", "MA數學", "MU音樂", "PE_DSE體育", "PE體育", "PHY物理", "PU普通話", "THS旅款", "VA視藝"],
    "S5": ["AT汽車科技", "BIO生物", "CHEM化學", "CH中史", "CL中文", "CM商科", "CSD公民", "CS電腦", "CT創意科技", "EC經濟", "EL英文", "ER倫宗", "GEO地理", "HIST歷史", "IS科學", "Lib圖書館", "MA數學", "MU音樂", "PE_DSE體育", "PE體育", "PHY物理", "PU普通話", "THS旅款", "VA視藝"],
    "S6": ["AT汽車科技", "BIO生物", "CHEM化學", "CH中史", "CL中文", "CM商科", "CSD公民", "CS電腦", "CT創意科技", "EC經濟", "EL英文", "ER倫宗", "GEO地理", "HIST歷史", "IS科學", "Lib圖書館", "MA數學", "MU音樂", "PE_DSE體育", "PE體育", "PHY物理", "PU普通話", "THS旅款", "VA視藝"]
  },
  KLA_DOMAINS: [
    { id: "chi", name: "中國語文教育", subjects: ["CL中文", "PU普通話"], defaultVal: 68 },
    { id: "eng", name: "英國語文教育", subjects: ["EL英文"], defaultVal: 72 },
    { id: "math", name: "數學教育", subjects: ["MA數學"], defaultVal: 80 },
    { id: "sci", name: "科學教育", subjects: ["IS科學", "BIO生物", "CHEM化學", "PHY物理"], defaultVal: 75 },
    { id: "tech", name: "科技教育", subjects: ["CS電腦", "CT創意科技", "AT汽車科技"], defaultVal: 88 },
    { id: "pshe", name: "個人、社會及人文", subjects: ["CH中史", "CSD公民", "ER倫宗", "GEO地理", "HIST歷史", "CM商科", "EC經濟", "THS旅款", "Lib圖書館"], defaultVal: 65 },
    { id: "arts", name: "藝術教育", subjects: ["VA視藝", "MU音樂"], defaultVal: 70 },
    { id: "pe", name: "體育", subjects: ["PE體育", "PE_DSE體育"], defaultVal: 62 }
  ]
};

// 核心帳戶設定 (保證永不丟失)
const DEFAULT_ROSTER = [
  { id: 'usr_cyc', name: '張耀宗 副校長', email: 'cyc@cys.edu.hk', role: 'admin_teacher', note: '系統管理員 / 創科副校長', password: '***', isCore: true },
  { id: 'usr_247admin', name: '雲端託管後端', email: '247admin@cys.edu.hk', role: 'admin', note: 'GAS後端專用主機帳號', password: '***', isCore: true }
];

let currentUser = null;
let currentRoleView = 'student';
let rosterFilter = 'all';
