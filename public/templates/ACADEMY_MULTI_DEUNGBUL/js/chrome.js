/* 등불 독학관 — 공통 마크업(위 관 탭 줄 · 흰 헤더 · 넓은 메뉴 · 오른쪽 세로 빠른 단추 · 드로어 · 짙은 푸터 · 하단바). site.js 보다 먼저 로드. */
(function () {
  var page = document.body.getAttribute('data-page') || '';
  function cur(k) { return page === k ? ' aria-current="page"' : ''; }
  var TEL = '{{PHONE|031-215-6604}}';
  var NAME = '{{BIZ_NAME|등불 독학관}}';
  var tel = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 3.5h3.2l1.6 4.3-2.2 1.4a11.5 11.5 0 0 0 6.7 6.7l1.4-2.2 4.3 1.6v3.2a2 2 0 0 1-2.1 2A16.8 16.8 0 0 1 3.5 5.6a2 2 0 0 1 2-2.1z"/></svg>';
  var talk = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 4.2c-5 0-9 3.1-9 7 0 2.5 1.7 4.7 4.2 6l-.8 3.1c-.1.4.3.7.7.5l3.7-2.5c.4 0 .8.1 1.2.1 5 0 9-3.1 9-7s-4-7.2-9-7.2z"/></svg>';
  var pin = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.3"/></svg>';
  var doc = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6M9 18h4"/></svg>';
  var seat = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="4" y="4" width="16" height="10" rx="1"/><path d="M8 14v6M16 14v6M4 20h16"/></svg>';

  var header =
    '<header id="site-header" class="hd">' +
      '<div class="hd-m">' +
        '<a class="brand" href="index.html" aria-label="' + NAME + ' 홈">Deungbul<small>독학관</small></a>' +
        '<nav class="dnav" aria-label="주 메뉴">' +
          '<a href="system.html"' + cur('system') + '>System<span>관리 시스템</span></a>' +
          '<a href="system.html#seats">Seats<span>좌석 · 시설</span></a>' +
          '<a href="admission.html"' + cur('admission') + '>Enroll<span>모집안내</span></a>' +
          '<a href="index.html#board">Board<span>소식 · 설명회</span></a>' +
          '<a href="admission.html#faq">Life<span>학원생활</span></a>' +
        '</nav>' +
        '<button class="burger" type="button" aria-controls="mnav" aria-label="메뉴 열기" aria-expanded="false"><i></i></button>' +
      '</div>' +
      '<div class="util">' +
        '<p class="halls"><a class="on" href="index.html">Full-day 종일반</a><a href="admission.html#half">Half 반수반</a><a href="admission.html#weekend">Weekend 주말 자습관</a></p>' +
        '<p class="u-r"><span class="dday">CSAT 2027 수능 <b>11.18(목)</b></span><a href="admission.html#visit">오시는 길</a><a href="{{KAKAO_URL|#}}">카카오톡 상담</a></p>' +
      '</div>' +
    '</header>' +
    '<nav class="mobile-nav" id="mnav" aria-label="모바일 메뉴">' +
      '<a href="index.html">Home<span>처음으로</span></a>' +
      '<a href="system.html">System<span>관리 시스템 · 하루 시간표</span></a>' +
      '<a href="system.html#seats">Seats<span>좌석 배치도</span></a>' +
      '<a href="admission.html">Enroll<span>모집안내 · 수강료</span></a>' +
      '<a href="admission.html#visit">Visit<span>오시는 길</span></a>' +
      '<a class="m-tel" href="tel:' + TEL + '">' + tel + ' ' + TEL + '</a>' +
    '</nav>' +
    '<div class="side" aria-label="빠른 단추"><a href="admission.html" aria-label="모집안내">' + doc + '</a><a class="r" href="system.html#seats" aria-label="좌석 배치도">' + seat + '</a><a href="tel:' + TEL + '" aria-label="전화">' + tel + '</a><a class="y" href="{{KAKAO_URL|#}}" aria-label="카카오톡">' + talk + '</a></div>';

  var footer =
    '<footer class="ft">' +
      '<div class="ft-a">' +
        '<p class="ft-b">Deungbul <span>독학관</span> <a href="tel:' + TEL + '">' + TEL + '</a></p>' +
        '<nav class="ft-ic" aria-label="푸터 바로가기"><a href="admission.html#visit">' + pin + '오시는 길</a><a href="admission.html">' + doc + '모집요강</a><a href="system.html#seats">' + seat + '좌석 배치도</a><a href="{{KAKAO_URL|#}}">' + talk + '문의</a></nav>' +
      '</div>' +
      '<p class="ft-l"><a href="admission.html#faq">자주 묻는 질문</a><a href="admission.html#terms">이용약관</a><a href="admission.html#privacy"><b>개인정보처리방침</b></a></p>' +
      '<div class="ft-legal">' +
        '<p>{{ADDRESS|경기 수원시 영통구 봉영로 00, 5–6층}} · 사업자등록번호 {{BIZ_NO|000-00-00000}} · 전화 ' + TEL + '</p>' +
        '<p>' + NAME + ' · 학원등록번호 {{ACADEMY_REG_NO|제0000호}} · 교습과정 독서실 · 대표 {{OWNER|배준호}} · {{HOURS|매일 07:30–22:00 · 일 09:00–18:00}}</p>' +
        '<p>© <span data-year>2026</span> Deungbul. 사진은 공간 분위기를 보여 주는 연출 이미지입니다.</p>' +
      '</div>' +
    '</footer>' +
    '<div class="mbar" aria-label="빠른 연락">' +
      '<a class="tel" data-cta="tel" href="tel:' + TEL + '">' + tel + '전화 상담</a>' +
      '<a href="{{KAKAO_URL|#}}">' + talk + '카카오톡</a>' +
      '<a href="admission.html#visit">' + pin + '오시는 길</a>' +
    '</div>';

  document.body.insertAdjacentHTML('afterbegin', header);
  document.body.insertAdjacentHTML('beforeend', footer);
})();
