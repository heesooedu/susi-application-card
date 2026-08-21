function findActiveStudentByToken_(token) {
  const normalizedToken = cleanText_(token, '접근 token', 100, true);
  if (!/^[a-f0-9]{64}$/i.test(normalizedToken)) {
    throw new Error('유효하지 않은 학생 주소입니다.');
  }

  const students = getRowsAsObjects_(
    APP_CONFIG.STUDENTS_SHEET,
    APP_CONFIG.SHEET_HEADERS.STUDENTS
  );
  const student = students.find(function(item) {
    return item.active === true && String(item.token) === normalizedToken;
  });
  if (!student) throw new Error('유효하지 않거나 비활성화된 학생 주소입니다.');
  return student;
}

function getStudentDashboard(token) {
  const student = findActiveStudentByToken_(token);
  const applications = listApplicationsForStudent_(student.student_id);
  const readFingerprints = getTeacherCommentReadFingerprints_(student.student_id);
  applications.forEach(function(application) {
    const comment = normalizeTeacherComment_(application.teacherComment);
    application.teacherCommentVersion = comment ? fingerprintTeacherComment_(comment) : '';
    application.teacherCommentUnread = Boolean(comment) &&
      readFingerprints[application.id] !== application.teacherCommentVersion;
  });
  return {
    student: {
      className: String(student.class_name),
      number: String(student.number),
      name: String(student.name)
    },
    applications: applications
  };
}

function acknowledgeTeacherComment(token, applicationId, displayedCommentVersion) {
  ensureApplicationSchema_();
  return withDocumentLock_(function() {
    const student = findActiveStudentByToken_(token);
    const found = findOwnedApplication_(student.student_id, applicationId);
    const comment = normalizeTeacherComment_(found.application.teacher_comment);
    if (!comment) throw new Error('확인할 교사 코멘트가 없습니다.');
    const currentFingerprint = fingerprintTeacherComment_(comment);
    if (String(displayedCommentVersion || '') !== currentFingerprint) {
      throw new Error('교사 코멘트가 변경되었습니다. 화면을 새로고침해 주세요.');
    }

    const sheet = ensureTeacherCommentReadsSheet_();
    const headers = APP_CONFIG.SHEET_HEADERS.TEACHER_COMMENT_READS;
    const reads = getRowsAsObjects_(APP_CONFIG.COMMENT_READS_SHEET, headers);
    const existing = reads.find(function(read) {
      return String(read.application_id) === String(found.application.application_id) &&
        String(read.student_id) === String(student.student_id);
    });
    const data = {
      application_id: found.application.application_id,
      student_id: student.student_id,
      comment_fingerprint: currentFingerprint,
      read_at: new Date()
    };
    if (existing) {
      sheet.getRange(existing._rowNumber, 1, 1, headers.length)
        .setValues([makeRow_(headers, data)]);
    } else {
      sheet.appendRow(makeRow_(headers, data));
    }
    const confirmationColumn = APP_CONFIG.SHEET_HEADERS.APPLICATIONS
      .indexOf('teacher_comment_read') + 1;
    getSheetOrThrow_(APP_CONFIG.APPLICATIONS_SHEET)
      .getRange(found.application._rowNumber, confirmationColumn)
      .setValue(true);
    return { success: true };
  });
}

function getTeacherCommentReadsByApplication_() {
  const spreadsheet = getDatabaseSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(APP_CONFIG.COMMENT_READS_SHEET);
  if (!sheet) return {};
  const headers = APP_CONFIG.SHEET_HEADERS.TEACHER_COMMENT_READS;
  if (!hasExactHeaders_(sheet, headers)) {
    throw new Error('TEACHER_COMMENT_READS 시트의 헤더가 예상 구조와 다릅니다.');
  }
  const result = {};
  getRowsAsObjects_(APP_CONFIG.COMMENT_READS_SHEET, headers).forEach(function(read) {
    result[String(read.application_id)] = read;
  });
  return result;
}

function getTeacherCommentReadFingerprints_(studentId) {
  const spreadsheet = getDatabaseSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(APP_CONFIG.COMMENT_READS_SHEET);
  if (!sheet) return {};
  const headers = APP_CONFIG.SHEET_HEADERS.TEACHER_COMMENT_READS;
  if (!hasExactHeaders_(sheet, headers)) {
    throw new Error('TEACHER_COMMENT_READS 시트의 헤더가 예상 구조와 다릅니다.');
  }
  const result = {};
  getRowsAsObjects_(APP_CONFIG.COMMENT_READS_SHEET, headers)
    .filter(function(read) { return String(read.student_id) === String(studentId); })
    .forEach(function(read) {
      result[String(read.application_id)] = String(read.comment_fingerprint);
    });
  return result;
}

function ensureTeacherCommentReadsSheet_() {
  const spreadsheet = getDatabaseSpreadsheet_();
  ensureDataSheet_(
    spreadsheet,
    APP_CONFIG.COMMENT_READS_SHEET,
    APP_CONFIG.SHEET_HEADERS.TEACHER_COMMENT_READS
  );
  const sheet = spreadsheet.getSheetByName(APP_CONFIG.COMMENT_READS_SHEET);
  if (!sheet.isSheetHidden()) sheet.hideSheet();
  return sheet;
}

function deleteTeacherCommentReadsForApplication_(studentId, applicationId) {
  const spreadsheet = getDatabaseSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(APP_CONFIG.COMMENT_READS_SHEET);
  if (!sheet) return;
  const headers = APP_CONFIG.SHEET_HEADERS.TEACHER_COMMENT_READS;
  getRowsAsObjects_(APP_CONFIG.COMMENT_READS_SHEET, headers)
    .filter(function(read) {
      return String(read.student_id) === String(studentId) &&
        String(read.application_id) === String(applicationId);
    })
    .map(function(read) { return read._rowNumber; })
    .sort(function(a, b) { return b - a; })
    .forEach(function(rowNumber) { sheet.deleteRow(rowNumber); });
}

function normalizeTeacherComment_(comment) {
  return String(comment == null ? '' : comment).trim();
}

function fingerprintTeacherComment_(comment) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    normalizeTeacherComment_(comment),
    Utilities.Charset.UTF_8
  );
  return Utilities.base64EncodeWebSafe(digest).replace(/=+$/g, '');
}
