/* 요모조모 사고력교실 — 공통 마크업(투명→흰 헤더 · 위쪽 작은 링크 줄 · 외곽선 알약 · 드로어 · 푸터 · 하단바). site.js 보다 먼저 로드. */
(function () {
  var page = document.body.getAttribute('data-page') || '';
  function cur(k) { return page === k ? ' aria-current="page"' : ''; }
  var TEL = '{{PHONE|02-2215-7730}}';
  var NAME = '{{BIZ_NAME|요모조모 사고력교실}}';
  var tel = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 3.5h3.2l1.6 4.3-2.2 1.4a11.5 11.5 0 0 0 6.7 6.7l1.4-2.2 4.3 1.6v3.2a2 2 0 0 1-2.1 2A16.8 16.8 0 0 1 3.5 5.6a2 2 0 0 1 2-2.1z"/></svg>';
  var talk = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 4.2c-5 0-9 3.1-9 7 0 2.5 1.7 4.7 4.2 6l-.8 3.1c-.1.4.3.7.7.5l3.7-2.5c.4 0 .8.1 1.2.1 5 0 9-3.1 9-7s-4-7.2-9-7.2z"/></svg>';
  var pin = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.3"/></svg>';

  var header =
    '<header id="site-header" class="hd">' +
      '<p class="util"><a href="classes.html#time">Timetable 시간표</a><a href="classes.html#tools">Borrow box 교구</a><a href="visit.html#visit">Map 오시는 길</a><a href="{{KAKAO_URL|#}}">KakaoTalk 상담</a></p>' +
      '<div class="hd-m">' +
        '<a class="brand" href="index.html" aria-label="' + NAME + ' 홈">Yomojomo<small>사고력교실</small></a>' +
        '<nav class="dnav" aria-label="주 메뉴">' +
          '<a href="classes.html"' + cur('classes') + '>Classes <span>과정</span></a>' +
          '<a href="classes.html#tools">Tools <span>교구</span></a>' +
          '<a href="visit.html"' + cur('visit') + '>First visit <span>진단 상담</span></a>' +
          '<a href="index.html#puzzle">Puzzle <span>이번 주 문제</span></a>' +
        '</nav>' +
        '<a class="ob" href="tel:' + TEL + '">' + tel + '상담 전화</a>' +
        '<button class="burger" type="button" aria-controls="mnav" aria-label="메뉴 열기" aria-expanded="false"><i></i></button>' +
      '</div>' +
    '</header>' +
    '<nav class="mobile-nav" id="mnav" aria-label="모바일 메뉴">' +
      '<a href="index.html">Home<span>처음으로</span></a>' +
      '<a href="classes.html">Classes<span>과정 · 시간표 · 수강료</span></a>' +
      '<a href="classes.html#tools">Tools<span>교구 목록</span></a>' +
      '<a href="visit.html">First visit<span>진단 상담 · 오시는 길</span></a>' +
      '<a href="index.html#puzzle">Puzzle<span>이번 주 문제</span></a>' +
      '<a class="m-tel" href="tel:' + TEL + '">' + tel + ' ' + TEL + '</a>' +
    '</nav>';

  var footer =
    '<footer class="ft">' +
      '<div class="ft-top"><a href="visit.html#faq">자주 묻는 질문</a><a href="visit.html#privacy"><b>개인정보처리방침</b></a><a href="visit.html#visit">오시는 길</a><span class="sp"></span><a href="{{BLOG_URL|#}}">Blog</a><a href="{{INSTAGRAM_URL|#}}">Instagram</a></div>' +
      '<div class="ft-in">' +
        '<p class="ft-b">Yomojomo</p>' +
        '<p>' + NAME + ' <span>대표 {{OWNER|문가을}}</span><span>주소 {{ADDRESS|서울 성동구 왕십리로 00, 2층}}</span></p>' +
        '<p><span>사업자등록번호 {{BIZ_NO|000-00-00000}}</span><span>학원등록번호 {{ACADEMY_REG_NO|제0000호}}</span><span>전화 ' + TEL + '</span></p>' +
        '<p><span>{{HOURS|화–금 14:00–19:30 · 토 10:00–16:00 · 월 휴무}}</span></p>' +
        '<p class="ft-c">© <span data-year>2026</span> Yomojomo. 사진은 수업 분위기를 보여 주는 연출 이미지입니다.</p>' +
      '</div>' +
    '</footer>' +
    '<div class="mbar" aria-label="빠른 연락">' +
      '<a class="tel" data-cta="tel" href="tel:' + TEL + '">' + tel + '전화 상담</a>' +
      '<a href="{{KAKAO_URL|#}}">' + talk + '카카오톡</a>' +
      '<a href="visit.html#visit">' + pin + '오시는 길</a>' +
    '</div>';

  document.body.insertAdjacentHTML('afterbegin', header);
  document.body.insertAdjacentHTML('beforeend', footer);
})();
