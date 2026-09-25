/* 여음 음악교습소 — 공통 마크업. site.js 보다 먼저 로드. */
(function () {
  var page = document.body.getAttribute('data-page') || '';
  function cur(k) { return page === k ? ' aria-current="page"' : ''; }
  var TEL = '{{PHONE|02-905-3372}}';
  var NAME = '{{BIZ_NAME|여음 음악교습소}}';
  var tel = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 3.5h3.2l1.6 4.3-2.2 1.4a11.5 11.5 0 0 0 6.7 6.7l1.4-2.2 4.3 1.6v3.2a2 2 0 0 1-2.1 2A16.8 16.8 0 0 1 3.5 5.6a2 2 0 0 1 2-2.1z"/></svg>';
  var talk = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 4.2c-5 0-9 3.1-9 7 0 2.5 1.7 4.7 4.2 6l-.8 3.1c-.1.4.3.7.7.5l3.7-2.5c.4 0 .8.1 1.2.1 5 0 9-3.1 9-7s-4-7.2-9-7.2z"/></svg>';
  var pin = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.3"/></svg>';

  var header =
    '<header id="site-header" class="hd">' +
      '<a class="brand" href="index.html" aria-label="' + NAME + ' 홈">Yeoeum<span>music room</span></a>' +
      '<nav class="dnav" aria-label="주 메뉴">' +
        '<a href="index.html#about"' + cur('home') + '>About<span>소개</span></a>' +
        '<a href="lessons.html"' + cur('lessons') + '>Lessons<span>레슨 · 요금</span></a>' +
        '<a href="recital.html"' + cur('recital') + '>Recital<span>연주회 · 연습실</span></a>' +
        '<a class="btn-y" href="recital.html#visit">Contact</a>' +
      '</nav>' +
      '<button class="burger" type="button" aria-controls="mnav" aria-label="메뉴 열기" aria-expanded="false"><i></i><i></i></button>' +
    '</header>' +
    '<nav class="mobile-nav" id="mnav" aria-label="모바일 메뉴">' +
      '<a href="index.html">Home<span>처음으로</span></a>' +
      '<a href="lessons.html">Lessons<span>악기별 레슨 · 요금</span></a>' +
      '<a href="recital.html">Recital<span>연주회 · 연습실</span></a>' +
      '<a href="recital.html#visit">Contact<span>오시는 길</span></a>' +
      '<a class="mn-call" href="tel:' + TEL + '">' + tel + ' ' + TEL + '</a>' +
    '</nav>';

  var footer =
    '<footer class="ft"><div class="ft-panel">' +
      '<div class="ft-a"><p class="ft-b">Yeoeum<span>music room</span></p><p>' + NAME + '<br>대표 {{OWNER|배나래}} · 사업자등록번호 {{BIZ_NO|000-00-00000}}<br>교습소 신고번호 {{ACADEMY_REG_NO|제0000-00호}}<br>전화 ' + TEL + '</p>' +
        '<div class="ft-btn"><a class="btn-y" href="tel:' + TEL + '">전화</a><a class="btn-w" href="{{KAKAO_URL|#}}">카카오톡</a></div></div>' +
      '<div class="ft-col"><p class="h">Room</p><a href="index.html#about">소개</a><a href="recital.html">연주회</a><a href="recital.html#practice">연습실</a></div>' +
      '<div class="ft-col"><p class="h">Lessons</p><a href="lessons.html#piano">피아노</a><a href="lessons.html#strings">바이올린 · 기타</a><a href="lessons.html#drum">드럼</a></div>' +
      '<div class="ft-box"><p class="h">Studio</p><p>{{ADDRESS|서울특별시 노원구 동일로 00, 3층}}</p><p class="h">Hours</p><p>{{HOURS|평일 13:00–21:00 · 토 10:00–16:00}}</p></div>' +
      '<p class="ft-legal">© <span data-year>2026</span> Yeoeum music room · 사진은 수업 분위기를 보여 주는 연출 이미지입니다.</p>' +
    '</div></footer>' +
    '<div class="mbar" aria-label="빠른 연락">' +
      '<a class="tel" data-cta="tel" href="tel:' + TEL + '">' + tel + '전화 상담</a>' +
      '<a href="{{KAKAO_URL|#}}">' + talk + '카카오톡</a>' +
      '<a href="recital.html#visit">' + pin + '오시는 길</a>' +
    '</div>';

  document.body.insertAdjacentHTML('afterbegin', header);
  document.body.insertAdjacentHTML('beforeend', footer);
})();
