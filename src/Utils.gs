const APP_CONFIG = Object.freeze({
  MENU_NAME: '🎓 수시카드 관리',
  SETTINGS_SHEET: '설정',
  STUDENTS_SHEET: 'STUDENTS',
  APPLICATIONS_SHEET: 'APPLICATIONS',
  REVIEWS_SHEET: 'TEACHER_REVIEWS',
  COMMENT_READS_SHEET: 'TEACHER_COMMENT_READS',
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
      'teacher_comment', 'teacher_comment_read', 'university', 'department',
      'admission_type', 'admission_name', 'quota', 'csat_minimum',
      'csat_minimum_details', 'evaluation_elements', 'interview_details',
      'official_url', 'source_reference', 'support_level', 'support_reason',
      'strengths', 'concerns', 'questions',
      'result_1_year', 'result_1_cut_50', 'result_1_cut_70', 'result_1_notes',
      'result_1_url', 'result_2_year', 'result_2_cut_50', 'result_2_cut_70',
      'result_2_notes', 'result_2_url', 'result_3_year', 'result_3_cut_50',
      'result_3_cut_70', 'result_3_notes', 'result_3_url', 'created_at',
      'updated_at', 'deleted_at'
    ]),
    TEACHER_REVIEWS: Object.freeze([
      'review_id', 'application_id', 'student_id', 'teacher_judgment',
      'teacher_comment', 'review_status', 'created_at', 'updated_at'
    ]),
    TEACHER_COMMENT_READS: Object.freeze([
      'application_id', 'student_id', 'comment_fingerprint', 'read_at'
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

const PRE_RESULTS_APPLICATION_HEADERS = Object.freeze([
  'application_id', 'student_id', 'student_name', 'class_name', 'number',
  'university', 'department', 'admission_type', 'admission_name', 'quota',
  'csat_minimum', 'csat_minimum_details', 'evaluation_elements',
  'interview_details', 'official_url', 'source_reference', 'support_level',
  'support_reason', 'strengths', 'concerns', 'questions', 'created_at',
  'updated_at', 'deleted_at'
]);

const PRE_TEACHER_COMMENT_APPLICATION_HEADERS = Object.freeze([
  'application_id', 'student_id', 'student_name', 'class_name', 'number',
  'university', 'department', 'admission_type', 'admission_name', 'quota',
  'csat_minimum', 'csat_minimum_details', 'evaluation_elements',
  'interview_details', 'official_url', 'source_reference', 'support_level',
  'support_reason', 'strengths', 'concerns', 'questions',
  'result_1_year', 'result_1_cut_50', 'result_1_cut_70', 'result_1_notes',
  'result_1_url', 'result_2_year', 'result_2_cut_50', 'result_2_cut_70',
  'result_2_notes', 'result_2_url', 'result_3_year', 'result_3_cut_50',
  'result_3_cut_70', 'result_3_notes', 'result_3_url', 'created_at',
  'updated_at', 'deleted_at'
]);

const PRE_STUDENT_CONFIRMATION_APPLICATION_HEADERS = Object.freeze([
  'application_id', 'student_id', 'student_name', 'class_name', 'number',
  'teacher_comment', 'university', 'department',
  'admission_type', 'admission_name', 'quota', 'csat_minimum',
  'csat_minimum_details', 'evaluation_elements', 'interview_details',
  'official_url', 'source_reference', 'support_level', 'support_reason',
  'strengths', 'concerns', 'questions',
  'result_1_year', 'result_1_cut_50', 'result_1_cut_70', 'result_1_notes',
  'result_1_url', 'result_2_year', 'result_2_cut_50', 'result_2_cut_70',
  'result_2_notes', 'result_2_url', 'result_3_year', 'result_3_cut_50',
  'result_3_cut_70', 'result_3_notes', 'result_3_url', 'created_at',
  'updated_at', 'deleted_at'
]);

const PRE_STUDENT_CONFIRMATION_DISPLAY_HEADERS = Object.freeze([
  '지원카드 ID', '학생 ID', '학생 이름', '반', '번호', '교사 코멘트',
  '대학', '학과/학부', '전형 유형', '전형명', '모집인원',
  '수능최저 여부', '수능최저 세부내용', '평가요소', '면접 여부 및 방식',
  '공식자료 URL', '자료 기준', '학생 지원 수준', '지원 이유',
  '본인이 생각하는 강점', '우려되는 점', '선생님께 질문',
  '직전 1개년 학년도', '직전 1개년 50% 컷', '직전 1개년 70% 컷',
  '직전 1개년 기타 메모', '직전 1개년 입시결과 URL',
  '직전 2개년 학년도', '직전 2개년 50% 컷', '직전 2개년 70% 컷',
  '직전 2개년 기타 메모', '직전 2개년 입시결과 URL',
  '직전 3개년 학년도', '직전 3개년 50% 컷', '직전 3개년 70% 컷',
  '직전 3개년 기타 메모', '직전 3개년 입시결과 URL',
  '작성일시', '수정일시', '삭제일시'
]);

const APPLICATION_DISPLAY_HEADERS = Object.freeze([
  '지원카드 ID', '학생 ID', '학생 이름', '반', '번호', '교사 코멘트', '학생 확인',
  '대학', '학과/학부', '전형 유형', '전형명', '모집인원',
  '수능최저 여부', '수능최저 세부내용', '평가요소', '면접 여부 및 방식',
  '공식자료 URL', '자료 기준', '학생 지원 수준', '지원 이유',
  '본인이 생각하는 강점', '우려되는 점', '선생님께 질문',
  '직전 1개년 학년도', '직전 1개년 50% 컷', '직전 1개년 70% 컷',
  '직전 1개년 기타 메모', '직전 1개년 입시결과 URL',
  '직전 2개년 학년도', '직전 2개년 50% 컷', '직전 2개년 70% 컷',
  '직전 2개년 기타 메모', '직전 2개년 입시결과 URL',
  '직전 3개년 학년도', '직전 3개년 50% 컷', '직전 3개년 70% 컷',
  '직전 3개년 기타 메모', '직전 3개년 입시결과 URL',
  '작성일시', '수정일시', '삭제일시'
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

function cleanHttpUrl_(value, fieldName) {
  const label = fieldName || '공식자료 URL';
  const url = cleanText_(value, label, 1000, false);
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) {
    throw new Error(label + '은(는) http:// 또는 https://로 시작해야 합니다.');
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
