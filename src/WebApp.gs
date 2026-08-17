function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('수시 지원 카드')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
