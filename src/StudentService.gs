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
  return {
    student: {
      className: String(student.class_name),
      number: String(student.number),
      name: String(student.name)
    },
    applications: listApplicationsForStudent_(student.student_id)
  };
}
