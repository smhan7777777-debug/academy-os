/* 모눈 코딩 — 공통 마크업(오른쪽 위 색 칩 메뉴 · 드로어 · 푸터 · 하단바). site.js 보다 먼저 로드. */
(function () {
  var page = document.body.getAttribute('data-page') || '';
  function cur(k) { return page === k ? ' aria-current="page"' : ''; }
  var TEL = '{{PHONE|031-8017-4406}}';
  var NAME = '{{BIZ_NAME|모눈 코딩교실}}';
  var tel = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 3.5h3.2l1.6 4.3-2.2 1.4a11.5 11.5 0 0 0 6.7 6.7l1.4-2.2 4.3 1.6v3.2a2 2 0 0 1-2.1 2A16.8 16.8 0 0 1 3.5 5.6a2 2 0 0 1 2-2.1z"/></svg>';
  var talk = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 4.2c-5 0-9 3.1-9 7 0 2.5 1.7 4.7 4.2 6l-.8 3.1c-.1.4.3.7.7.5l3.7-2.5c.4 0 .8.1 1.2.1 5 0 9-3.1 9-7s-4-7.2-9-7.2z"/></svg>';
  var pin = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.3"/></svg>';

  var header =
    '<header id="site-header" class="hd">' +
      '<a class="brand" href="index.html" aria-label="' + NAME + ' 홈">Monun<small>coding room</small></a>' +
      '<nav class="dnav" aria-label="주 메뉴">' +
        '<a class="c1" href="courses.html"' + cur('courses') + '>Courses <span>과정</span></a>' +
        '<a class="c2" href="lab.html"' + cur('lab') + '>Lab <span>장비 · 특강</span></a>' +
        '<a class="c3" href="lab.html#visit">Visit <span>오시는 길</span></a>' +
        '<a class="c4" href="tel:' + TEL + '">Call <span>' + TEL + '</span></a>' +
      '</nav>' +
      '<button class="burger" type="button" aria-controls="mnav" aria-label="메뉴 열기" aria-expanded="false">Menu<i></i></button>' +
    '</header>' +
    '<nav class="mobile-nav" id="mnav" aria-label="모바일 메뉴">' +
      '<a class="c0" href="index.html">Home <span>처음으로</span></a>' +
      '<a class="c1" href="courses.html">Courses <span>과정 · 수강료</span></a>' +
      '<a class="c2" href="lab.html">Lab <span>장비 · 방학 특강</span></a>' +
      '<a class="c3" href="lab.html#visit">Visit <span>오시는 길</span></a>' +
      '<a class="c4" href="tel:' + TEL + '">' + tel + ' ' + TEL + '</a>' +
    '</nav>';

  var footer =
    '<footer class="ft">' +
      '<div class="ft-g">' +
        '<p class="ft-b">Monun<br>coding room</p>' +
        '<p class="ft-t">' + NAME + '은 초등 3학년부터 고등 1학년까지, 블록 코딩에서 파이썬 · 아두이노 · 3D 모델링으로 이어지는 동네 코딩교실입니다.</p>' +
        '<div><a href="courses.html">과정</a><a href="courses.html#fee">수강료</a><a href="lab.html">장비</a></div>' +
        '<div><a href="lab.html#camp">방학 특강</a><a href="lab.html#visit">오시는 길</a><a href="{{KAKAO_URL|#}}">카카오톡 ↗</a></div>' +
        '<div><a href="{{INSTAGRAM_URL|#}}">Instagram ↗</a><a href="{{BLOG_URL|#}}">Blog ↗</a></div>' +
      '</div>' +
      '<div class="ft-legal">' +
        '<p>' + NAME + ' · 대표 {{OWNER|류민재}} · 사업자등록번호 {{BIZ_NO|000-00-00000}} · 학원 등록번호 {{ACADEMY_REG_NO|제0000호}}</p>' +
        '<p>{{ADDRESS|경기도 용인시 수지구 풍덕천로 00, 5층}} · 전화 ' + TEL + ' · {{HOURS|평일 14:00–21:00 · 토 10:00–17:00}}</p>' +
        '<p>© <span data-year>2026</span> Monun coding room. 사진은 수업 분위기를 보여 주는 연출 이미지입니다.</p>' +
      '</div>' +
    '</footer>' +
    '<div class="mbar" aria-label="빠른 연락">' +
      '<a class="tel" data-cta="tel" href="tel:' + TEL + '">' + tel + '전화 상담</a>' +
      '<a href="{{KAKAO_URL|#}}">' + talk + '카카오톡</a>' +
      '<a href="lab.html#visit">' + pin + '오시는 길</a>' +
    '</div>';

  document.body.insertAdjacentHTML('afterbegin', header);
  document.body.insertAdjacentHTML('beforeend', footer);
})();
