const APP_CONFIG = Object.freeze({
  MENU_NAME: '🎓 수시카드 관리',
  SETTINGS_SHEET: '설정',
  STUDENTS_SHEET: 'STUDENTS',
  APPLICATIONS_SHEET: 'APPLICATIONS',
  REVIEWS_SHEET: 'TEACHER_REVIEWS',
  HISTORY_SHEET: 'APPLICATION_HISTORY',
  SPREADSHEET_ID_PROPERTY: 'DATABASE_SPREADSHEET_ID',
  SETTINGS: Object.freeze({
    CLASS_NAME_CELL: 'B2',
    WEB_APP_URL_CELL: 'B3',
    LIST_START_ROW: 6,
    NUMBER_COLUMN: 1,
    NAME_COLUMN: 2
  }),
  SHEET_HEADERS: Object.freeze({
    STUDENTS: Object.freeze([
      'student_id', 'class_name', 'number', 'name', 'token', 'active',
      'student_url', 'created_at', 'updated_at'
    ]),
    APPLICATIONS: Object.freeze([
      'application_id', 'student_id', 'student_name', 'class_name', 'number',
      'university', 'department',
      'admission_type', 'admission_name', 'quota', 'csat_minimum',
      'csat_minimum_details', 'evaluation_elements', 'interview_details',
      'official_url', 'source_reference', 'support_level', 'support_reason',
      'strengths', 'concerns', 'questions', 'created_at', 'updated_at',
      'deleted_at'
    ]),
    TEACHER_REVIEWS: Object.freeze([
      'review_id', 'application_id', 'student_id', 'teacher_judgment',
      'teacher_comment', 'review_status', 'created_at', 'updated_at'
    ]),
    APPLICATION_HISTORY: Object.freeze([
      'history_id', 'application_id', 'student_id', 'action',
      'snapshot_json', 'created_at'
    ])
  })
});

const LEGACY_APPLICATION_HEADERS = Object.freeze([
  'application_id', 'student_id', 'university', 'department',
  'admission_type', 'admission_name', 'quota', 'csat_minimum',
  'csat_minimum_details', 'evaluation_elements', 'interview_details',
  'official_url', 'source_reference', 'support_level', 'support_reason',
  'strengths', 'concerns', 'questions', 'created_at', 'updated_at',
  'deleted_at'
]);

function getDatabaseSpreadsheet_() {
  // 스프레드시트 사본에서는 복제된 Script Property가 원본 ID를 가리킬 수 있다.
  // bound Sheet 문맥이 있으면 현재 사본을 항상 우선한다.
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;

  const storedId = PropertiesService.getScriptProperties()
    .getProperty(APP_CONFIG.SPREADSHEET_ID_PROPERTY);
  if (storedId) {
    return SpreadsheetApp.openById(storedId);
  }

  throw new Error('먼저 스프레드시트 메뉴에서 “처음 시작하기”를 실행해 주세요.');
}

function withDocumentLock_(callback) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function getSheetOrThrow_(sheetName) {
  const sheet = getDatabaseSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('필수 시트가 없습니다: ' + sheetName + '. “처음 시작하기”를 실행해 주세요.');
  }
  return sheet;
}

function getRowsAsObjects_(sheetName, headers) {
  const sheet = getSheetOrThrow_(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  return sheet.getRange(2, 1, lastRow - 1, headers.length).getValues()
    .map(function(row, index) {
      const item = { _rowNumber: index + 2 };
      headers.forEach(function(header, columnIndex) {
        item[header] = row[columnIndex];
      });
      return item;
    });
}

function makeRow_(headers, data) {
  return headers.map(function(header) {
    return escapeForSheet_(data[header]);
  });
}

function escapeForSheet_(value) {
  if (typeof value !== 'string') return value;
  // 공백 뒤 위험 문자도 수식으로 해석되지 않도록 명시적으로 텍스트 처리한다.
  return /^\s*[=+\-@]/.test(value) ? "'" + value : value;
}

function cleanText_(value, fieldName, maxLength, required) {
  const text = String(value == null ? '' : value).trim();
  if (required && !text) {
    throw new Error(fieldName + '을(를) 입력해 주세요.');
  }
  if (text.length > maxLength) {
    throw new Error(fieldName + '은(는) ' + maxLength + '자 이하로 입력해 주세요.');
  }
  return text;
}

function cleanHttpUrl_(value) {
  const url = cleanText_(value, '공식자료 URL', 1000, false);
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('공식자료 URL은 http:// 또는 https://로 시작해야 합니다.');
  }
  return url;
}

function generateToken_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

function normalizeKeyPart_(value) {
  return String(value == null ? '' : value).trim();
}

function studentKey_(className, number) {
  return normalizeKeyPart_(className) + '\u001f' + normalizeKeyPart_(number);
}

function asIsoString_(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? '' : date.toISOString();
}

function include_(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
