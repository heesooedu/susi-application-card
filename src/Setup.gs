function startSetup_() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) throw new Error('연결된 스프레드시트에서 실행해 주세요.');

    withDocumentLock_(function() {
      PropertiesService.getScriptProperties().setProperty(
        APP_CONFIG.SPREADSHEET_ID_PROPERTY,
        spreadsheet.getId()
      );
      setupSettingsSheet_(spreadsheet);
      ensureDataSheet_(spreadsheet, APP_CONFIG.STUDENTS_SHEET, APP_CONFIG.SHEET_HEADERS.STUDENTS);
      ensureApplicationsSheet_(spreadsheet);
      ensureDataSheet_(spreadsheet, APP_CONFIG.REVIEWS_SHEET, APP_CONFIG.SHEET_HEADERS.TEACHER_REVIEWS);
      ensureDataSheet_(spreadsheet, APP_CONFIG.HISTORY_SHEET, APP_CONFIG.SHEET_HEADERS.APPLICATION_HISTORY);
      refreshApplicationsForTeacher_();
    });

    SpreadsheetApp.getUi().alert(
      '준비 완료',
      '설정 시트에 반 이름과 학생 명단을 입력한 뒤 “학생 명단 반영”을 실행해 주세요.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (error) {
    SpreadsheetApp.getUi().alert('초기화 실패', error.message, SpreadsheetApp.getUi().ButtonSet.OK);
    throw error;
  }
}

function setupSettingsSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(APP_CONFIG.SETTINGS_SHEET);
  if (!sheet) sheet = spreadsheet.insertSheet(APP_CONFIG.SETTINGS_SHEET, 0);

  if (!sheet.getRange('A1').getValue()) sheet.getRange('A1').setValue('수시 지원 카드 설정');
  if (!sheet.getRange('A2').getValue()) sheet.getRange('A2').setValue('반 이름');
  if (!sheet.getRange('A3').getValue()) sheet.getRange('A3').setValue('웹앱 URL');
  if (!sheet.getRange('A5').getValue()) sheet.getRange('A5').setValue('번호');
  if (!sheet.getRange('B5').getValue()) sheet.getRange('B5').setValue('이름');

  sheet.getRange('A1:B1').merge().setFontSize(16).setFontWeight('bold')
    .setBackground('#173f5f').setFontColor('#ffffff');
  sheet.getRange('A2:A3').setFontWeight('bold').setBackground('#e8f0f7');
  sheet.getRange('A5:B5').setFontWeight('bold').setBackground('#d9ead3');
  sheet.getRange('B2').setNote('예: 3학년 2반');
  sheet.getRange('B3').setNote('웹앱 배포 후 생성된 /exec 주소를 입력하세요.');
  sheet.setFrozenRows(5);
  sheet.setColumnWidth(1, 130);
  sheet.setColumnWidth(2, 260);
}

function ensureDataSheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);

  const existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const hasHeader = existing.some(function(value) { return value !== ''; });
  if (hasHeader && existing.join('\u001f') !== headers.join('\u001f')) {
    throw new Error(name + ' 시트의 헤더가 예상 구조와 다릅니다. 기존 데이터를 확인해 주세요.');
  }
  if (!hasHeader) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold').setBackground('#ddebf7');
  sheet.setFrozenRows(1);
}

function ensureApplicationsSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(APP_CONFIG.APPLICATIONS_SHEET);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(APP_CONFIG.APPLICATIONS_SHEET);
    sheet.getRange(1, 1, 1, APP_CONFIG.SHEET_HEADERS.APPLICATIONS.length)
      .setValues([APP_CONFIG.SHEET_HEADERS.APPLICATIONS]);
  } else {
    migrateApplicationSheetIfNeeded_(spreadsheet);
  }
  ensureDataSheet_(spreadsheet, APP_CONFIG.APPLICATIONS_SHEET, APP_CONFIG.SHEET_HEADERS.APPLICATIONS);
}

function ensureApplicationSchema_() {
  const spreadsheet = getDatabaseSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(APP_CONFIG.APPLICATIONS_SHEET);
  if (!sheet) throw new Error('APPLICATIONS 시트가 없습니다. “처음 시작하기”를 실행해 주세요.');
  if (hasExactHeaders_(sheet, APP_CONFIG.SHEET_HEADERS.APPLICATIONS)) return;

  withDocumentLock_(function() {
    migrateApplicationSheetIfNeeded_(spreadsheet);
    refreshApplicationsForTeacher_();
  });
}

function migrateApplicationSheetIfNeeded_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(APP_CONFIG.APPLICATIONS_SHEET);
  if (!sheet) return;
  if (hasExactHeaders_(sheet, APP_CONFIG.SHEET_HEADERS.APPLICATIONS)) return;

  if (hasExactHeaders_(sheet, LEGACY_APPLICATION_HEADERS)) {
    sheet.insertColumnsAfter(2, 3);
    sheet.getRange(1, 1, 1, APP_CONFIG.SHEET_HEADERS.APPLICATIONS.length)
      .setValues([APP_CONFIG.SHEET_HEADERS.APPLICATIONS]);
    return;
  }
  throw new Error('APPLICATIONS 시트의 헤더가 예상 구조와 다릅니다. 기존 데이터를 확인해 주세요.');
}

function hasExactHeaders_(sheet, headers) {
  const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  return current.join('\u001f') === headers.join('\u001f');
}

function refreshApplicationsForTeacher_() {
  const spreadsheet = getDatabaseSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(APP_CONFIG.APPLICATIONS_SHEET);
  if (!sheet || !hasExactHeaders_(sheet, APP_CONFIG.SHEET_HEADERS.APPLICATIONS)) return;

  const students = getRowsAsObjects_(APP_CONFIG.STUDENTS_SHEET, APP_CONFIG.SHEET_HEADERS.STUDENTS);
  const studentsById = {};
  students.forEach(function(student) {
    studentsById[String(student.student_id)] = student;
  });

  const headers = APP_CONFIG.SHEET_HEADERS.APPLICATIONS;
  const applications = getRowsAsObjects_(APP_CONFIG.APPLICATIONS_SHEET, headers);
  applications.forEach(function(application) {
    const student = studentsById[String(application.student_id)];
    application.student_name = student ? student.name : '(학생 정보 없음)';
    application.class_name = student ? student.class_name : '';
    application.number = student ? student.number : '';
  });
  if (applications.length) {
    sheet.getRange(2, 1, applications.length, headers.length)
      .setValues(applications.map(function(application) { return makeRow_(headers, application); }));
  }
  formatApplicationsForTeacher_(sheet);
}

function formatApplicationsForTeacher_(sheet) {
  const headers = APP_CONFIG.SHEET_HEADERS.APPLICATIONS;
  const lastRow = sheet.getLastRow();
  sheet.hideColumns(1, 2);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(5);
  sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 120);
  sheet.setColumnWidth(5, 65);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold').setBackground('#173f5f').setFontColor('#ffffff');

  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, headers.length)
      .sort([{ column: 3, ascending: true }, { column: 6, ascending: true }]);
  }
  sheet.getBandings().forEach(function(banding) { banding.remove(); });
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, headers.length)
      .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);
  }
}

function syncStudentsFromSettings_() {
  try {
    const result = withDocumentLock_(syncStudentsFromSettingsLocked_);
    SpreadsheetApp.getUi().alert(
      '명단 반영 완료',
      '신규 ' + result.created + '명, 갱신 ' + result.updated + '명, 비활성화 ' + result.deactivated + '명',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (error) {
    SpreadsheetApp.getUi().alert('명단 반영 실패', error.message, SpreadsheetApp.getUi().ButtonSet.OK);
    throw error;
  }
}

function syncStudentsFromSettingsLocked_() {
  const spreadsheet = getDatabaseSpreadsheet_();
  const settings = spreadsheet.getSheetByName(APP_CONFIG.SETTINGS_SHEET);
  if (!settings) throw new Error('설정 시트가 없습니다. “처음 시작하기”를 실행해 주세요.');
  migrateApplicationSheetIfNeeded_(spreadsheet);

  const className = cleanText_(settings.getRange(APP_CONFIG.SETTINGS.CLASS_NAME_CELL).getDisplayValue(), '반 이름', 100, true);
  const lastRow = settings.getLastRow();
  const inputRows = lastRow < APP_CONFIG.SETTINGS.LIST_START_ROW
    ? []
    : settings.getRange(
      APP_CONFIG.SETTINGS.LIST_START_ROW,
      APP_CONFIG.SETTINGS.NUMBER_COLUMN,
      lastRow - APP_CONFIG.SETTINGS.LIST_START_ROW + 1,
      2
    ).getDisplayValues();

  const incoming = [];
  const seenNumbers = {};
  inputRows.forEach(function(row, index) {
    const number = cleanText_(row[0], '번호', 30, false);
    const name = cleanText_(row[1], '이름', 100, false);
    if (!number && !name) return;
    if (!number || !name) throw new Error((index + APP_CONFIG.SETTINGS.LIST_START_ROW) + '행의 번호와 이름을 모두 입력해 주세요.');
    if (seenNumbers[number]) throw new Error('중복 번호가 있습니다: ' + number);
    seenNumbers[number] = true;
    incoming.push({ class_name: className, number: number, name: name });
  });
  if (!incoming.length) throw new Error('학생 명단이 비어 있습니다.');

  const headers = APP_CONFIG.SHEET_HEADERS.STUDENTS;
  const sheet = getSheetOrThrow_(APP_CONFIG.STUDENTS_SHEET);
  const existing = getRowsAsObjects_(APP_CONFIG.STUDENTS_SHEET, headers);
  const byKey = {};
  existing.forEach(function(student) {
    byKey[studentKey_(student.class_name, student.number)] = student;
  });

  const now = new Date();
  const activeKeys = {};
  let created = 0;
  let updated = 0;
  incoming.forEach(function(student) {
    const key = studentKey_(student.class_name, student.number);
    activeKeys[key] = true;
    const old = byKey[key];
    if (old) {
      old.name = student.name;
      old.active = true;
      old.updated_at = now;
      updated++;
    } else {
      existing.push({
        student_id: Utilities.getUuid(),
        class_name: student.class_name,
        number: student.number,
        name: student.name,
        token: generateToken_(),
        active: true,
        student_url: '',
        created_at: now,
        updated_at: now
      });
      created++;
    }
  });

  let deactivated = 0;
  existing.forEach(function(student) {
    if (!activeKeys[studentKey_(student.class_name, student.number)] && student.active !== false) {
      student.active = false;
      student.updated_at = now;
      deactivated++;
    }
  });

  if (existing.length) {
    sheet.getRange(2, 1, existing.length, headers.length)
      .setValues(existing.map(function(student) { return makeRow_(headers, student); }));
  }
  refreshApplicationsForTeacher_();
  return { created: created, updated: updated, deactivated: deactivated };
}

function generateStudentUrls_() {
  try {
    const count = withDocumentLock_(generateStudentUrlsLocked_);
    SpreadsheetApp.getUi().alert('주소 생성 완료', count + '명의 활성 학생 주소를 갱신했습니다.', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (error) {
    SpreadsheetApp.getUi().alert('주소 생성 실패', error.message, SpreadsheetApp.getUi().ButtonSet.OK);
    throw error;
  }
}

function generateStudentUrlsLocked_() {
  const settings = getSheetOrThrow_(APP_CONFIG.SETTINGS_SHEET);
  let baseUrl = cleanText_(settings.getRange(APP_CONFIG.SETTINGS.WEB_APP_URL_CELL).getDisplayValue(), '웹앱 URL', 1000, false);
  if (!baseUrl) baseUrl = ScriptApp.getService().getUrl() || '';
  if (!/^https:\/\/script\.google\.com\//i.test(baseUrl)) {
    throw new Error('설정!B3에 배포된 Apps Script 웹앱의 /exec 주소를 입력해 주세요.');
  }
  baseUrl = baseUrl.split('?')[0];

  const headers = APP_CONFIG.SHEET_HEADERS.STUDENTS;
  const sheet = getSheetOrThrow_(APP_CONFIG.STUDENTS_SHEET);
  const students = getRowsAsObjects_(APP_CONFIG.STUDENTS_SHEET, headers);
  const now = new Date();
  let count = 0;
  students.forEach(function(student) {
    if (student.active === true) {
      student.student_url = baseUrl + '?t=' + encodeURIComponent(String(student.token));
      student.updated_at = now;
      count++;
    }
  });
  if (students.length) {
    sheet.getRange(2, 1, students.length, headers.length)
      .setValues(students.map(function(student) { return makeRow_(headers, student); }));
  }
  return count;
}
