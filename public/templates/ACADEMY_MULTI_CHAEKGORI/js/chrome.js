/* 책고리 독서논술 — 공통 마크업(액자 테두리 · 모서리 메달 · 가운데 깃발 워드마크 · 드로어 · 푸터 · 하단바). site.js 보다 먼저. */
(function () {
  var page = document.body.getAttribute('data-page') || '';
  function cur(k) { return page === k ? ' aria-current="page"' : ''; }
  var TEL = '{{PHONE|031-716-2584}}';
  var NAME = '{{BIZ_NAME|책고리 독서논술}}';
  var tel = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 3.5h3.2l1.6 4.3-2.2 1.4a11.5 11.5 0 0 0 6.7 6.7l1.4-2.2 4.3 1.6v3.2a2 2 0 0 1-2.1 2A16.8 16.8 0 0 1 3.5 5.6a2 2 0 0 1 2-2.1z"/></svg>';
  var talk = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 4.2c-5 0-9 3.1-9 7 0 2.5 1.7 4.7 4.2 6l-.8 3.1c-.1.4.3.7.7.5l3.7-2.5c.4 0 .8.1 1.2.1 5 0 9-3.1 9-7s-4-7.2-9-7.2z"/></svg>';
  var pin = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.3"/></svg>';

  var header =
    '<header id="site-header" class="hd">' +
      '<a class="brand" href="index.html" aria-label="' + NAME + ' 홈">Chaekgori<small>reading &amp; writing</small></a>' +
      '<nav class="medals" aria-label="주 메뉴">' +
        '<a class="md tl" href="index.html#houses"' + cur('home') + '><b>Houses</b><span>독서 모둠</span></a>' +
        '<a class="md tr" href="books.html"' + cur('books') + '><b>Books</b><span>필독서</span></a>' +
        '<a class="md bl" href="class.html"' + cur('class') + '><b>Class</b><span>수업 · 수강료</span></a>' +
        '<a class="md br" href="class.html#map"><b>Visit</b><span>오시는 길</span></a>' +
      '</nav>' +
      '<button class="burger" type="button" aria-controls="mnav" aria-label="메뉴 열기" aria-expanded="false"><i></i><i></i></button>' +
    '</header>' +
    '<nav class="mobile-nav" id="mnav" aria-label="모바일 메뉴">' +
      '<a href="index.html">Home<span>처음으로</span></a>' +
      '<a href="index.html#houses">Houses<span>독서 모둠</span></a>' +
      '<a href="books.html">Books<span>학년별 필독서</span></a>' +
      '<a href="class.html">Class<span>수업 흐름 · 수강료</span></a>' +
      '<a href="class.html#map">Visit<span>오시는 길</span></a>' +
      '<a class="mn-call" href="tel:' + TEL + '">' + tel + ' ' + TEL + '</a>' +
    '</nav>';

  var footer =
    '<footer class="ft">' +
      '<div class="ft-in">' +
        '<div class="ft-seal"><b>Chaekgori</b><span>책 한 권이 고리가 되어</span></div>' +
        '<div class="ft-cols">' +
          '<div><p class="h">Read</p><a href="books.html">학년별 필독서</a><a href="index.html#houses">독서 모둠</a></div>' +
          '<div><p class="h">Class</p><a href="class.html">수업 흐름</a><a href="class.html#fee">수강료</a></div>' +
          '<div><p class="h">Visit</p><a href="class.html#map">오시는 길</a><a href="{{KAKAO_URL|#}}">카카오톡</a></div>' +
        '</div>' +
      '</div>' +
      '<div class="ft-legal">' +
        '<p>' + NAME + ' · 대표 {{OWNER|한지유}} · 사업자등록번호 {{BIZ_NO|000-00-00000}} · 교습소 신고번호 {{ACADEMY_REG_NO|제0000-00호}}</p>' +
        '<p>{{ADDRESS|경기도 성남시 분당구 정자일로 00, 3층}} · 전화 ' + TEL + ' · {{HOURS|평일 14:00–21:00 · 토 10:00–15:00}}</p>' +
        '<p>© <span data-year>2026</span> Chaekgori. 사진은 수업 분위기를 보여 주는 연출 이미지입니다.</p>' +
      '</div>' +
    '</footer>' +
    '<div class="mbar" aria-label="빠른 연락">' +
      '<a class="tel" data-cta="tel" href="tel:' + TEL + '">' + tel + '전화 상담</a>' +
      '<a href="{{KAKAO_URL|#}}">' + talk + '카카오톡</a>' +
      '<a href="class.html#map">' + pin + '오시는 길</a>' +
    '</div>';

  document.body.insertAdjacentHTML('afterbegin', header);
  document.body.insertAdjacentHTML('beforeend', footer);
})();
