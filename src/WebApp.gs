function doGet(e) {
  const requestedToken = e && e.parameter && e.parameter.t
    ? String(e.parameter.t)
    : '';
  const safeToken = /^[a-f0-9]{64}$/i.test(requestedToken) ? requestedToken : '';
  const template = HtmlService.createTemplateFromFile('Index');
  // JSON은 검증된 16진수 token만 직렬화하므로 HTML/script 문맥을 탈출할 수 없다.
  template.initialTokenJson = JSON.stringify(safeToken);

  return template.evaluate()
    .setTitle('수시 지원 카드')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
