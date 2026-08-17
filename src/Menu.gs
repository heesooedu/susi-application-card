function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu(APP_CONFIG.MENU_NAME)
    .addItem('🚀 처음 시작하기', 'startSetup_')
    .addSeparator()
    .addItem('👥 학생 명단 반영', 'syncStudentsFromSettings_')
    .addItem('🔗 학생 주소 생성', 'generateStudentUrls_')
    .addSeparator()
    .addItem('❓ 사용 방법', 'showHelp_')
    .addToUi();
}

function showHelp_() {
  const message = [
    '1. “처음 시작하기”로 필요한 시트를 준비합니다.',
    '2. 설정 시트에 반 이름과 번호/이름 명단을 입력합니다.',
    '3. “학생 명단 반영”을 실행합니다.',
    '4. 웹앱을 배포한 뒤 설정!B3에 배포 URL을 입력합니다.',
    '5. “학생 주소 생성”을 실행해 학생별 주소를 만듭니다.',
    '',
    '학생에게는 실제 스프레드시트를 공유하지 마세요.'
  ].join('\n');
  SpreadsheetApp.getUi().alert('수시카드 사용 방법', message, SpreadsheetApp.getUi().ButtonSet.OK);
}
