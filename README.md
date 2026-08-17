# 수시 지원 카드

Google Sheets를 데이터베이스로 사용하는 container-bound Google Apps Script 웹앱의 기반 프로젝트입니다. 담임교사는 한 스프레드시트에서 학생 명단과 지원 계획을 관리하고, 학생은 로그인 없이 본인에게 발급된 긴 token URL로 자기 카드만 조회·작성합니다.

현재 범위는 시트 초기화, 학생 명단 동기화, 학생 URL 생성, 학생별 카드 조회·추가, 수정/삭제용 서버 API와 변경 이력 기반까지입니다. 실제 웹앱 배포와 교사용 검토 UI는 포함하지 않습니다.

## 구조

```text
src/
  appsscript.json
  Menu.gs
  Setup.gs
  StudentService.gs
  ApplicationService.gs
  WebApp.gs
  Utils.gs
  Index.html
  Styles.html
  ClientJS.html
```

- `설정`: 반 이름, 웹앱 URL, 번호/이름 명단 입력
- `STUDENTS`: UUID, 반, 번호, 이름, token, 활성 상태, 학생 URL
- `APPLICATIONS`: 지원 카드 한 장당 한 행(long format)
- `TEACHER_REVIEWS`: 향후 교사 판단·코멘트·검토 상태 저장
- `APPLICATION_HISTORY`: 카드 생성·수정·soft delete 당시 snapshot 저장

## 로컬 개발 준비

필요 도구는 Node.js, `@google/clasp`, VSCode입니다. 이 저장소의 `.clasp.json`은 Apps Script project ID를 담고 있어 Git에서 제외됩니다. 새 환경에서는 저장소에 올리지 않고 로컬에서만 다음과 같은 형태로 연결해야 합니다.

```json
{
  "scriptId": "YOUR_SCRIPT_ID",
  "rootDir": "src"
}
```

`clasp login`이 만드는 로그인 정보와 Google API credential JSON도 저장소에 추가하지 마세요.

## 스프레드시트에서 시작하기

1. 연결된 Google Sheet를 새로고침합니다.
2. `🎓 수시카드 관리 → 🚀 처음 시작하기`를 실행하고 권한을 승인합니다.
3. `설정` 시트의 `B2`에 반 이름을 입력합니다.
4. 6행부터 A열에 번호, B열에 이름을 붙여넣습니다.
5. `🎓 수시카드 관리 → 👥 학생 명단 반영`을 실행합니다.

같은 `반 이름 + 번호`를 다시 반영하면 기존 `student_id`와 token은 유지되고 이름 및 활성 상태만 갱신됩니다. 현재 반 명단에서 빠진 학생은 삭제되지 않고 `active=false`가 됩니다. 반 또는 번호 변경은 새 학생으로 취급됩니다.

## 나중에 웹앱 배포할 때

이 저장소 단계에서는 배포하지 않습니다. 배포 시 Apps Script의 웹앱 설정에서 다음 조건을 확인해야 합니다.

- 실행 사용자: 웹앱 소유자
- 접근 사용자: 학생이 Google 로그인 없이 열 수 있는 범위
- 생성된 `/exec` URL을 `설정!B3`에 입력
- `🎓 수시카드 관리 → 🔗 학생 주소 생성` 실행

생성 주소는 `...?t=<64자리 랜덤 token>` 형식입니다. 학생에게는 해당 학생의 주소만 전달하고 스프레드시트 자체는 공유하지 마세요. URL을 전달받은 사람은 학생과 동일한 권한을 갖는다고 간주하므로 메신저·문서 등에 공개하지 않아야 합니다.

## 보안 설계

- 모든 학생 API는 요청마다 token으로 활성 학생을 서버에서 다시 조회합니다.
- 카드 수정·삭제 시 token으로 확인된 학생과 카드의 `student_id` 소유권을 대조합니다.
- 클라이언트에는 해당 학생의 공개 프로필과 카드만 반환하며 `student_id`, token, 다른 학생 데이터는 반환하지 않습니다.
- 모든 쓰기는 `LockService.getScriptLock()` 안에서 처리합니다.
- 사용자 문자열이 공백 뒤 `=`, `+`, `-`, `@`로 시작하면 Sheets에 텍스트로 기록해 formula injection을 방지합니다.
- 삭제는 `deleted_at`을 기록하는 soft delete이며 변경 전후 snapshot을 이력 시트에 남깁니다.

## 배포 전 점검

```powershell
clasp status
```

`clasp status`에서 `.gs`, `.html`, `appsscript.json`만 push 대상인지 확인한 뒤 사용자가 명시적으로 승인한 시점에만 `clasp push`를 실행하세요. `.clasp.json`과 credential 파일이 Git 추적 대상이 아닌지도 함께 확인합니다.

## 템플릿 배포 방향

다른 교사는 코드 수정 없이 원본 스프레드시트의 사본을 만들고, 사본에 포함된 bound script를 자신의 계정으로 권한 승인·웹앱 배포한 뒤 메뉴만 사용하도록 설계했습니다. 학교 Workspace 정책에 따라 익명 웹앱 접근이 제한될 수 있으므로 실제 배포 전 관리자 정책을 확인해야 합니다.
