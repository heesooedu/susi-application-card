const APPLICATION_INPUT_FIELDS = Object.freeze([
  'university', 'department', 'admission_type', 'admission_name', 'quota',
  'csat_minimum', 'csat_minimum_details', 'evaluation_elements',
  'interview_details', 'official_url', 'source_reference', 'support_level',
  'support_reason', 'strengths', 'concerns', 'questions',
  'result_1_year', 'result_1_cut_50', 'result_1_cut_70', 'result_1_notes',
  'result_1_url', 'result_2_year', 'result_2_cut_50', 'result_2_cut_70',
  'result_2_notes', 'result_2_url', 'result_3_year', 'result_3_cut_50',
  'result_3_cut_70', 'result_3_notes', 'result_3_url'
]);

function listApplicationsForStudent_(studentId) {
  ensureApplicationSchema_();
  return getRowsAsObjects_(
    APP_CONFIG.APPLICATIONS_SHEET,
    APP_CONFIG.SHEET_HEADERS.APPLICATIONS
  ).filter(function(application) {
    return String(application.student_id) === String(studentId) && !application.deleted_at;
  }).map(toClientApplication_);
}

function createApplication(token, payload) {
  ensureApplicationSchema_();
  return withDocumentLock_(function() {
    const student = findActiveStudentByToken_(token);
    const clean = validateApplicationPayload_(payload);
    const now = new Date();
    const application = Object.assign({}, clean, {
      application_id: Utilities.getUuid(),
      student_id: student.student_id,
      student_name: student.name,
      class_name: student.class_name,
      number: student.number,
      teacher_comment: '',
      created_at: now,
      updated_at: now,
      deleted_at: ''
    });

    appendObjectRow_(
      APP_CONFIG.APPLICATIONS_SHEET,
      APP_CONFIG.SHEET_HEADERS.APPLICATIONS,
      application
    );
    appendApplicationHistory_('CREATE', application);
    refreshApplicationsForTeacher_();
    return toClientApplication_(application);
  });
}

// UI를 확장할 때 사용할 수 있는 수정 API. applicationId의 소유권을 token으로 재검사한다.
function updateApplication(token, applicationId, payload) {
  ensureApplicationSchema_();
  return withDocumentLock_(function() {
    const student = findActiveStudentByToken_(token);
    const found = findOwnedApplication_(student.student_id, applicationId);
    const clean = validateApplicationPayload_(payload);
    const updated = Object.assign({}, found.application, clean, {
      student_name: student.name,
      class_name: student.class_name,
      number: student.number,
      updated_at: new Date()
    });

    getSheetOrThrow_(APP_CONFIG.APPLICATIONS_SHEET)
      .getRange(found.application._rowNumber, 1, 1, APP_CONFIG.SHEET_HEADERS.APPLICATIONS.length)
      .setValues([makeRow_(APP_CONFIG.SHEET_HEADERS.APPLICATIONS, updated)]);
    appendApplicationHistory_('UPDATE', updated);
    refreshApplicationsForTeacher_();
    return toClientApplication_(updated);
  });
}

// 삭제 snapshot을 이력에 먼저 보존한 뒤 활성 APPLICATIONS 행을 제거한다.
// 전달받은 student_id는 받지도 신뢰하지도 않는다.
function deleteApplication(token, applicationId) {
  ensureApplicationSchema_();
  return withDocumentLock_(function() {
    const student = findActiveStudentByToken_(token);
    const found = findOwnedApplication_(student.student_id, applicationId);
    const deleted = Object.assign({}, found.application, {
      updated_at: new Date(),
      deleted_at: new Date()
    });

    appendApplicationHistory_('DELETE', deleted);
    getSheetOrThrow_(APP_CONFIG.APPLICATIONS_SHEET).deleteRow(found.application._rowNumber);
    refreshApplicationsForTeacher_();
    return { success: true };
  });
}

function findOwnedApplication_(studentId, applicationId) {
  const safeId = cleanText_(applicationId, '지원 카드 ID', 100, true);
  const application = getRowsAsObjects_(
    APP_CONFIG.APPLICATIONS_SHEET,
    APP_CONFIG.SHEET_HEADERS.APPLICATIONS
  ).find(function(item) {
    return String(item.application_id) === safeId &&
      String(item.student_id) === String(studentId) &&
      !item.deleted_at;
  });
  if (!application) throw new Error('지원 카드를 찾을 수 없습니다.');
  return { application: application };
}

function validateApplicationPayload_(payload) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const supportLevels = ['매우 상향', '상향', '적정', '안정'];
  const minimumOptions = ['있음', '없음'];
  const admissionTypes = ['교과', '종합', '논술', '실기'];
  const clean = {
    university: cleanText_(source.university, '대학', 150, true),
    department: cleanText_(source.department, '학과/학부', 150, true),
    admission_type: cleanText_(source.admission_type, '전형 유형', 100, true),
    admission_name: cleanText_(source.admission_name, '전형명', 150, true),
    quota: cleanText_(source.quota, '모집인원', 30, false),
    csat_minimum: cleanText_(source.csat_minimum, '수능최저 여부', 10, true),
    csat_minimum_details: cleanText_(source.csat_minimum_details, '수능최저 세부내용', 1000, false),
    evaluation_elements: cleanText_(source.evaluation_elements, '평가요소', 2000, false),
    interview_details: cleanText_(source.interview_details, '면접 여부 및 방식', 1000, false),
    official_url: cleanHttpUrl_(source.official_url),
    source_reference: cleanText_(source.source_reference, '자료 기준', 500, false),
    support_level: cleanText_(source.support_level, '지원 수준', 20, true),
    support_reason: cleanText_(source.support_reason, '지원 이유', 3000, false),
    strengths: cleanText_(source.strengths, '강점', 3000, false),
    concerns: cleanText_(source.concerns, '우려되는 점', 3000, false),
    questions: cleanText_(source.questions, '질문', 3000, false)
  };
  if (minimumOptions.indexOf(clean.csat_minimum) === -1) {
    throw new Error('수능최저 여부 값이 올바르지 않습니다.');
  }
  if (supportLevels.indexOf(clean.support_level) === -1) {
    throw new Error('지원 수준 값이 올바르지 않습니다.');
  }
  if (admissionTypes.indexOf(clean.admission_type) === -1) {
    throw new Error('전형 유형 값이 올바르지 않습니다.');
  }
  for (let index = 1; index <= 3; index++) {
    const prefix = 'result_' + index + '_';
    clean[prefix + 'year'] = cleanText_(source[prefix + 'year'], index + '번째 입시결과 학년도', 20, false);
    clean[prefix + 'cut_50'] = cleanText_(source[prefix + 'cut_50'], index + '번째 입시결과 50% 컷', 200, false);
    clean[prefix + 'cut_70'] = cleanText_(source[prefix + 'cut_70'], index + '번째 입시결과 70% 컷', 200, false);
    clean[prefix + 'notes'] = cleanText_(source[prefix + 'notes'], index + '번째 입시결과 기타 메모', 1000, false);
    clean[prefix + 'url'] = cleanHttpUrl_(source[prefix + 'url'], index + '번째 입시결과 URL');
  }
  if (clean.csat_minimum === '없음') clean.csat_minimum_details = '';
  return clean;
}

function toClientApplication_(application) {
  const result = { id: String(application.application_id) };
  APPLICATION_INPUT_FIELDS.forEach(function(field) {
    result[field] = String(application[field] == null ? '' : application[field]);
  });
  result.createdAt = asIsoString_(application.created_at);
  result.updatedAt = asIsoString_(application.updated_at);
  result.teacherComment = String(application.teacher_comment == null ? '' : application.teacher_comment);
  return result;
}

function appendObjectRow_(sheetName, headers, object) {
  getSheetOrThrow_(sheetName).appendRow(makeRow_(headers, object));
}

function appendApplicationHistory_(action, application) {
  const snapshot = {};
  APP_CONFIG.SHEET_HEADERS.APPLICATIONS.forEach(function(field) {
    const value = application[field];
    snapshot[field] = value instanceof Date ? value.toISOString() : value;
  });
  appendObjectRow_(
    APP_CONFIG.HISTORY_SHEET,
    APP_CONFIG.SHEET_HEADERS.APPLICATION_HISTORY,
    {
      history_id: Utilities.getUuid(),
      application_id: application.application_id,
      student_id: application.student_id,
      action: action,
      snapshot_json: JSON.stringify(snapshot),
      created_at: new Date()
    }
  );
}
