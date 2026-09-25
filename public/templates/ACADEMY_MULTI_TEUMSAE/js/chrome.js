/* 틈새 단과학원 — 공통 마크업(위 작은 줄 · 흰 헤더 · 작은 두 줄 꼬리표 + 워드마크 · 메뉴 · 드로어 · 회색 띠 푸터 · 하단바). site.js 보다 먼저 로드. */
(function () {
  var page = document.body.getAttribute('data-page') || '';
  function cur(k) { return page === k ? ' aria-current="page"' : ''; }
  var TEL = '{{PHONE|031-206-3518}}';
  var NAME = '{{BIZ_NAME|틈새 단과학원}}';
  var tel = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 3.5h3.2l1.6 4.3-2.2 1.4a11.5 11.5 0 0 0 6.7 6.7l1.4-2.2 4.3 1.6v3.2a2 2 0 0 1-2.1 2A16.8 16.8 0 0 1 3.5 5.6a2 2 0 0 1 2-2.1z"/></svg>';
  var talk = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 4.2c-5 0-9 3.1-9 7 0 2.5 1.7 4.7 4.2 6l-.8 3.1c-.1.4.3.7.7.5l3.7-2.5c.4 0 .8.1 1.2.1 5 0 9-3.1 9-7s-4-7.2-9-7.2z"/></svg>';
  var pin = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.3"/></svg>';
  var chk = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="8"/><path d="M4.5 8.2l2.3 2.2 4.6-4.8" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var header =
    '<header id="site-header" class="hd">' +
      '<div class="hd-m">' +
        '<a class="brand" href="index.html" aria-label="' + NAME + ' 홈"><i>수준별<br>내신 단과</i>Teumsae<small>단과학원</small></a>' +
        '<nav class="dnav" aria-label="주 메뉴">' +
          '<a href="about.html"' + cur('about') + '>About<span>학원안내</span></a>' +
          '<a href="classes.html#table">Timetable<span>단과 시간표</span></a>' +
          '<a href="classes.html"' + cur('classes') + '>Classes<span>모집안내</span></a>' +
          '<a href="index.html#subjects">Subjects<span>과목별 반</span></a>' +
          '<a href="about.html#hall">Study hall<span>자습실</span></a>' +
        '</nav>' +
        '<button class="burger" type="button" aria-controls="mnav" aria-label="메뉴 열기" aria-expanded="false"><i></i></button>' +
      '</div>' +
      '<div class="util"><p class="u-l"><a class="nt" href="classes.html">' + chk + 'Now enrolling · 2학기 기말 대비반</a><a href="about.html#visit">Map 오시는 길</a></p>' +
        '<p class="u-r"><a href="{{KAKAO_URL|#}}">KakaoTalk 상담</a><a class="pl" href="classes.html#table">Full timetable · 단과 시간표 ›</a></p></div>' +
    '</header>' +
    '<nav class="mobile-nav" id="mnav" aria-label="모바일 메뉴">' +
      '<a href="index.html">Home<span>처음으로</span></a>' +
      '<a href="classes.html">Classes<span>모집안내 · 수강료</span></a>' +
      '<a href="classes.html#table">Timetable<span>단과 시간표</span></a>' +
      '<a href="about.html">About<span>학습 관리 · 자습실</span></a>' +
      '<a href="about.html#visit">Visit<span>오시는 길</span></a>' +
      '<a class="m-tel" href="tel:' + TEL + '">' + tel + ' ' + TEL + '</a>' +
    '</nav>';

  var footer =
    '<footer class="ft">' +
      '<div class="ft-band"><p class="ft-b">Teumsae <span>단과학원</span></p><a class="ft-t" href="tel:' + TEL + '">' + tel + TEL + '</a><p class="ft-h"><b>평일</b>{{HOURS|14:00–22:00 · 토 09:00–18:00}}<small>일요일 · 공휴일 휴무</small></p><p class="ft-a">{{ADDRESS|경기 수원시 영통구 청명로 00, 3층}}</p></div>' +
      '<div class="ft-links"><a href="about.html">학원 소개</a><a href="about.html#terms">이용약관</a><a href="about.html#privacy"><b>개인정보처리방침</b></a><a href="about.html#visit">오시는 길</a></div>' +
      '<div class="ft-in"><p class="ft-n">' + NAME + '</p><div>' +
        '<p>대표 {{OWNER|오태경}} · 사업자등록번호 {{BIZ_NO|000-00-00000}} · 학원등록번호 {{ACADEMY_REG_NO|제0000호}} · 교습과정 보습 · 진학상담</p>' +
        '<p>' + '{{ADDRESS|경기 수원시 영통구 청명로 00, 3층}} · 전화 ' + TEL + '</p>' +
        '<p>© <span data-year>2026</span> Teumsae. 사진은 수업 분위기를 보여 주는 연출 이미지입니다.</p>' +
      '</div></div>' +
    '</footer>' +
    '<div class="mbar" aria-label="빠른 연락">' +
      '<a class="tel" data-cta="tel" href="tel:' + TEL + '">' + tel + '전화 상담</a>' +
      '<a href="{{KAKAO_URL|#}}">' + talk + '카카오톡</a>' +
      '<a href="about.html#visit">' + pin + '오시는 길</a>' +
    '</div>';

  document.body.insertAdjacentHTML('afterbegin', header);
  document.body.insertAdjacentHTML('beforeend', footer);
})();
