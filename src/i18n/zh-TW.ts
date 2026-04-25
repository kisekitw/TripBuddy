export const zhTW = {
  // App
  appName: "TripBuddy",
  tagline: "你的旅程，永遠快人一步。",

  // Login
  loginTitle: "登入 TripBuddy",
  loginDesc: "使用 Google 帳號登入，行程自動儲存並同步到所有裝置。",
  googleLogin: "使用 Google 帳號登入",
  guestLogin: "先逛逛，稍後再登入",
  loginNote: "我們不會讀取你的信件或存取個人資料",
  logout: "登出",

  // Trip list
  newTrip: "+ 新增行程",
  importBtn: "匯入 .md / .docx",
  createTrip: "+ 建立新行程",
  importedFrom: "從 .md 匯入",
  days: "天",

  // Import
  importTitle: "匯入行程檔案",
  importDesc: "上傳 .md、.docx 或 .pdf 檔案，AI 會自動解析成可編輯的結構化行程。",
  dropHere: "拖放檔案至此，或點擊瀏覽",
  supportedFormats: "支援 .md、.docx、.pdf、Google Drive 連結",
  or: "或",
  pasteLink: "貼上 Google Drive 連結...",
  parse: "解析",
  parsing: "AI 正在解析你的行程...",
  parsingDesc: "正在從檔案中提取天數、景點、時間與備註",
  parseSuccess: "解析成功！",
  daysLabel: "天數",
  spotsLabel: "景點",
  uncertainLabel: "待確認",
  openEditor: "開啟編輯器 →",

  // Editor
  back: "← 我的行程",
  autoAdjust: "自動調整",
  lockTimes: "鎖定時間",
  selectDay: "請從左側選擇一天開始編輯",
  selectDayMap: "選擇一天以顯示地圖",
  conflicts: "衝突",
  warnings: "警告",
  ends: "結束",
  alternatives: "替代方案",
  closed: "已關閉",
  warning: "注意",
  closes: "關閉於",
  conflictN: "偵測到 {n} 個衝突",
  aiAutoAdjust: "AI 自動調整",
  keepAnyway: "維持不變",
  min: "分鐘",
  addSpot: "+ 新增景點",

  // E-1: 新增旅程 modal
  newTripModalTitle: "建立新旅程",
  newTripTitleLabel: "旅程名稱",
  newTripTitlePlaceholder: "例：2026 義大利行",
  newTripDestLabel: "目的地（選填）",
  newTripDestPlaceholder: "例：東京、巴黎...",
  newTripConfirmBtn: "建立",
  newTripCancelBtn: "取消",
  newTripTitleRequired: "請輸入旅程名稱",
  newTripDateLabel: "出發日期（選填）",
  newTripDateHint: "設定後將自動填入每天的日期",
  editDateTooltip: "點擊修改出發日期",

  // E-2: 新增 / 刪除天數
  addDay: "+ 新增天數",
  addDayLabel: "第{n}天",
  deleteDayLabel: "刪除",
  deleteDayConfirmMsg: "此天含有景點，確定要刪除？",
  deleteDayConfirmBtn: "確認刪除",
  deleteDayCancelBtn: "取消",

  // E-3: 新增 / 編輯 / 刪除景點
  addSpotModalTitle: "新增景點",
  editSpotModalTitle: "編輯景點",
  spotNameLabel: "景點名稱",
  spotNamePlaceholder: "例：烏菲茲美術館",
  spotNameRequired: "請輸入景點名稱",
  addSpotConfirmBtn: "新增",
  editSpotConfirmBtn: "儲存",
  spotCancelBtn: "取消",
  deleteSpotLabel: "刪除景點",
  editSpotLabel: "編輯景點",

  // E-4: 修改景點時間與時長
  startTimeLabel: "開始時間",
  durationLabel: "停留時長",

  // T-1: 新增交通
  addTransit: "+ 交通",
  addTransitModalTitle: "新增交通",
  editTransitModalTitle: "編輯交通",
  transitNameLabel: "交通名稱",
  transitNamePlaceholder: "例：搭機 TPE → DXB",
  transitNameRequired: "請輸入交通名稱",

  // T-2: 跨夜交通
  transitHours: "小時",
  transitMins: "分鐘",
  arrivalTime: "抵達時間",
  nextDayBadge: "+1天",
  arrivalLabel: "(抵達)",
  linkedTransitDeleteMsg: "此為跨夜交通，確定要同時刪除出發與抵達卡片？",
  linkedTransitDeleteBtn: "確認刪除",
  autoCreatedDay: "（系統自動新增）",

  // T-3: 時區感知交通
  transitTzOffset: "時區差（小時）",
  transitTzHint: "目的地 UTC − 出發地 UTC（往西飛為負值，如台北→杜拜 = −4）",
  transitDepLabel: "出發地機場代碼",
  transitDestLabel: "目的地機場代碼",
  transitUnknownCode: "無法辨識，請手動填寫時區差",
  transitTzAutoDetected: "自動推算",
  transitTimeLabel: "交通時間",

  // Alt group
  spotIsAltLabel: "設為替代方案",
  convertToAltHint: "將此景點轉為替代方案群組，可新增多個選項比較",
  convertToAltBtn: "轉為替代方案 →",
  convertToSpotHint: "取消替代方案群組，保留目前選取的選項作為一般景點",
  convertToSpotBtn: "← 轉回一般景點",

  // C-1 ~ C-5: 衝突解決
  conflictShortenDur: "縮短時長",
  conflictMoveDay: "移至他日",
  conflictWizard: "解決精靈",
  conflictWizardTitle: "衝突解決精靈",
  conflictWizardDesc: "以下景點有時間衝突，請逐一處理：",
  conflictWizardClose: "關閉",

  // LB: LINE Bot 綁定
  lineBotBindTitle: "LINE Bot 綁定",
  lineBotBound: "已綁定 ✅",
  lineBotUnbound: "未綁定",
  lineBotGetCode: "取得綁定碼",
  lineBotCode: "綁定碼",
  lineBotOpenLine: "開啟 LINE 完成綁定",
  lineBotCodeHint: "碼有效 10 分鐘，點下方按鈕在 LINE 中發送",

  // L-1: LINE 推播
  lineSettingsTitle: "LINE 推播設定",
  lineTokenLabel: "LINE Notify Token",
  lineTokenPlaceholder: "貼上個人存取權杖",
  lineTokenHint: "前往 notify-bot.line.me 取得 Token",
  lineConnectedBadge: "已連接",
  lineSendToday: "📲 傳送今日行程",
  linePreviewTitle: "LINE 行程卡預覽",
  lineCopyMsg: "複製訊息",
  lineOpenApp: "開啟 LINE",
  lineSentOk: "已傳送 ✓",
  lineScheduleNote: "每日 07:00 自動傳送（需保持頁面開啟）",
  lineSave: "儲存",
};
