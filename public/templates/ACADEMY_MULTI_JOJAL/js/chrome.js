/* 조잘 영어 — 공통 마크업(헤더 · 드로어 · 푸터 · 하단 전화 바). site.js 보다 먼저 로드. */
(function () {
  var page = document.body.getAttribute('data-page') || '';
  function cur(k) { return page === k ? ' aria-current="page"' : ''; }
  var TEL = '{{PHONE|02-6953-2418}}';
  var NAME = '{{BIZ_NAME|조잘 영어교습소}}';
  var tel = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 3.5h3.2l1.6 4.3-2.2 1.4a11.5 11.5 0 0 0 6.7 6.7l1.4-2.2 4.3 1.6v3.2a2 2 0 0 1-2.1 2A16.8 16.8 0 0 1 3.5 5.6a2 2 0 0 1 2-2.1z"/></svg>';
  var talk = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 4.2c-5 0-9 3.1-9 7 0 2.5 1.7 4.7 4.2 6l-.8 3.1c-.1.4.3.7.7.5l3.7-2.5c.4 0 .8.1 1.2.1 5 0 9-3.1 9-7s-4-7.2-9-7.2z"/></svg>';
  var pin = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.3"/></svg>';

  var header =
    '<header id="site-header" class="hd">' +
      '<a class="brand" href="index.html" aria-label="' + NAME + ' 홈">Jojal<em>English</em></a>' +
      '<nav class="dnav" aria-label="주 메뉴">' +
        '<a href="classes.html"' + cur('classes') + '>Classes<span>반 · 시간표</span></a>' +
        '<a href="test.html"' + cur('test') + '>Level test<span>레벨테스트</span></a>' +
        '<a href="notes.html"' + cur('notes') + '>Notes<span>수업 노트</span></a>' +
      '</nav>' +
      '<a class="hd-pill" href="tel:' + TEL + '">Call us</a>' +
      '<button class="burger" type="button" aria-controls="mnav" aria-label="메뉴 열기" aria-expanded="false"><i></i><i></i></button>' +
    '</header>' +
    '<nav class="mobile-nav" id="mnav" aria-label="모바일 메뉴">' +
      '<a href="index.html">Home<span>처음으로</span></a>' +
      '<a href="classes.html">Classes<span>반 · 시간표 · 수강료</span></a>' +
      '<a href="test.html">Level test<span>레벨테스트 · 상담</span></a>' +
      '<a href="notes.html">Notes<span>수업 노트</span></a>' +
      '<a class="mn-call" href="tel:' + TEL + '">' + tel + ' ' + TEL + '</a>' +
    '</nav>';

  var footer =
    '<footer class="ft">' +
      '<div class="ft-row">' +
        '<a class="ft-brand" href="index.html">Jojal<em>English</em></a>' +
        '<nav aria-label="바닥글 메뉴"><a href="classes.html">반 · 시간표</a><a href="test.html">레벨테스트</a><a href="notes.html">수업 노트</a><a href="test.html#map">오시는 길</a></nav>' +
        '<p class="ft-hours">{{HOURS|월–금 14:00–21:30 · 토 10:00–14:00}}</p>' +
      '</div>' +
      '<div class="ft-legal">' +
        '<p>' + NAME + ' · 대표 {{OWNER|문하은}} · 사업자등록번호 {{BIZ_NO|000-00-00000}} · 교습소 신고번호 {{ACADEMY_REG_NO|제0000-00호}}</p>' +
        '<p>{{ADDRESS|서울특별시 마포구 월드컵로 00, 2층}} · 전화 ' + TEL + ' · {{EMAIL|hello@jojal.kr}}</p>' +
        '<p>© <span data-year>2026</span> Jojal English. 사진은 수업 분위기를 보여 주는 연출 이미지입니다.</p>' +
      '</div>' +
    '</footer>' +
    '<div class="mbar" aria-label="빠른 연락">' +
      '<a class="tel" data-cta="tel" href="tel:' + TEL + '">' + tel + '전화 상담</a>' +
      '<a href="{{KAKAO_URL|#}}">' + talk + '카카오톡</a>' +
      '<a href="test.html#map">' + pin + '오시는 길</a>' +
    '</div>';

  document.body.insertAdjacentHTML('afterbegin', header);
  document.body.insertAdjacentHTML('beforeend', footer);
})();
