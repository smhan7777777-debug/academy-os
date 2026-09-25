/* 가로줄 영어 — 공통 마크업(흰 헤더 · 공지 문구 · 외곽선 버튼 · 아래 고정 두 줄 띠 · 드로어 · 푸터 · 하단바). site.js 보다 먼저 로드. */
(function () {
  var page = document.body.getAttribute('data-page') || '';
  function cur(k) { return page === k ? ' aria-current="page"' : ''; }
  var TEL = '{{PHONE|031-704-2260}}';
  var NAME = '{{BIZ_NAME|가로줄 영어학원}}';
  var tel = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 3.5h3.2l1.6 4.3-2.2 1.4a11.5 11.5 0 0 0 6.7 6.7l1.4-2.2 4.3 1.6v3.2a2 2 0 0 1-2.1 2A16.8 16.8 0 0 1 3.5 5.6a2 2 0 0 1 2-2.1z"/></svg>';
  var talk = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 4.2c-5 0-9 3.1-9 7 0 2.5 1.7 4.7 4.2 6l-.8 3.1c-.1.4.3.7.7.5l3.7-2.5c.4 0 .8.1 1.2.1 5 0 9-3.1 9-7s-4-7.2-9-7.2z"/></svg>';
  var pin = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.3"/></svg>';
  var go = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11"/><path d="M10 7l5 5-5 5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var header =
    '<header id="site-header" class="hd">' +
      '<a class="brand" href="index.html" aria-label="' + NAME + ' 홈">Garojul<small>영어학원</small></a>' +
      '<p class="ann"><a href="test.html"><b>Winter term</b> 레벨 테스트 상시 진행 중</a></p>' +
      '<nav class="dnav" aria-label="주 메뉴">' +
        '<a href="track.html"' + cur('track') + '>Track<span>커리큘럼</span></a>' +
        '<a href="test.html"' + cur('test') + '>Test<span>레벨 테스트</span></a>' +
        '<a class="ob" href="tel:' + TEL + '">Call <span>전화 상담</span></a>' +
      '</nav>' +
      '<button class="burger" type="button" aria-controls="mnav" aria-label="메뉴 열기" aria-expanded="false"><i></i></button>' +
    '</header>' +
    '<nav class="mobile-nav" id="mnav" aria-label="모바일 메뉴">' +
      '<a href="index.html">Home<span>처음으로</span></a>' +
      '<a href="track.html">Track<span>커리큘럼 · 반 편성</span></a>' +
      '<a href="track.html#time">Timetable<span>반 시간표 · 수강료</span></a>' +
      '<a href="test.html">Test<span>레벨 테스트</span></a>' +
      '<a href="test.html#visit">Visit<span>오시는 길</span></a>' +
      '<a class="m-tel" href="tel:' + TEL + '">' + tel + ' ' + TEL + '</a>' +
    '</nav>';

  var footer =
    '<div class="dock" aria-label="바로가기">' +
      '<a class="d1" href="track.html">Reading Track 과정 더 보기 ' + go + '</a>' +
      '<a class="d2" href="tel:' + TEL + '">레벨 테스트 전화 신청 ' + go + '</a>' +
    '</div>' +
    '<footer class="ft">' +
      '<p class="ft-b">Garojul</p>' +
      '<p>' + NAME + ' · 대표 {{OWNER|정서하}} · 주소 {{ADDRESS|경기 성남시 분당구 내정로 00, 4층}} · 대표전화 ' + TEL + '</p>' +
      '<p>사업자등록번호 {{BIZ_NO|000-00-00000}} · 학원등록번호 {{ACADEMY_REG_NO|제0000호}} · 교습과목 외국어(영어) · {{HOURS|평일 14:00–22:00 · 토 10:00–16:00}}</p>' +
      '<p class="ft-l"><a href="test.html#visit">오시는 길</a><a href="{{KAKAO_URL|#}}">카카오톡 상담</a><a href="{{BLOG_URL|#}}">Blog</a></p>' +
      '<p class="ft-c">© <span data-year>2026</span> Garojul English. 사진은 수업 분위기를 보여 주는 연출 이미지입니다.</p>' +
    '</footer>' +
    '<div class="mbar" aria-label="빠른 연락">' +
      '<a class="tel" data-cta="tel" href="tel:' + TEL + '">' + tel + '전화 상담</a>' +
      '<a href="{{KAKAO_URL|#}}">' + talk + '카카오톡</a>' +
      '<a href="test.html#visit">' + pin + '오시는 길</a>' +
    '</div>';

  document.body.insertAdjacentHTML('afterbegin', header);
  document.body.insertAdjacentHTML('beforeend', footer);
})();
