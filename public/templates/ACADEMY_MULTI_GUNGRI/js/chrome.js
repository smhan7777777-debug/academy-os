/* 궁리 과학실험 — 공통 마크업. site.js 보다 먼저 로드. */
(function () {
  var page = document.body.getAttribute('data-page') || '';
  function cur(k) { return page === k ? ' aria-current="page"' : ''; }
  var TEL = '{{PHONE|02-3452-8816}}';
  var NAME = '{{BIZ_NAME|궁리 과학실험교실}}';
  var tel = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 3.5h3.2l1.6 4.3-2.2 1.4a11.5 11.5 0 0 0 6.7 6.7l1.4-2.2 4.3 1.6v3.2a2 2 0 0 1-2.1 2A16.8 16.8 0 0 1 3.5 5.6a2 2 0 0 1 2-2.1z"/></svg>';
  var talk = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 4.2c-5 0-9 3.1-9 7 0 2.5 1.7 4.7 4.2 6l-.8 3.1c-.1.4.3.7.7.5l3.7-2.5c.4 0 .8.1 1.2.1 5 0 9-3.1 9-7s-4-7.2-9-7.2z"/></svg>';
  var pin = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.3"/></svg>';
  var arr = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 3l5 5-5 5"/></svg>';

  var header =
    '<header id="site-header" class="hd">' +
      '<a class="brand" href="index.html" aria-label="' + NAME + ' 홈">Gungri<span>science lab</span></a>' +
      '<nav class="dnav" aria-label="주 메뉴">' +
        '<a href="programs.html"' + cur('programs') + '>Programs<span>반 · 수강료</span></a>' +
        '<a href="lab.html"' + cur('lab') + '>The lab<span>실험실 · 안전</span></a>' +
        '<a href="index.html#events"' + '>Open lab<span>공개 실험</span></a>' +
        '<a href="lab.html#visit">Visit<span>오시는 길</span></a>' +
      '</nav>' +
      '<a class="hd-pill" href="tel:' + TEL + '">Call ' + arr + '</a>' +
      '<button class="burger" type="button" aria-controls="mnav" aria-label="메뉴 열기" aria-expanded="false"><i></i><i></i></button>' +
    '</header>' +
    '<nav class="mobile-nav" id="mnav" aria-label="모바일 메뉴">' +
      '<a href="index.html">Home<span>처음으로</span></a>' +
      '<a href="programs.html">Programs<span>학년별 반 · 수강료</span></a>' +
      '<a href="lab.html">The lab<span>실험실 · 안전 규칙</span></a>' +
      '<a href="index.html#events">Open lab<span>토요 공개 실험</span></a>' +
      '<a href="lab.html#visit">Visit<span>오시는 길</span></a>' +
      '<a class="mn-call" href="tel:' + TEL + '">' + tel + ' ' + TEL + '</a>' +
    '</nav>';

  var footer =
    '<footer class="ft">' +
      '<div class="ft-top">' +
        '<ul class="ft-l"><li><a href="programs.html">Programs</a></li><li><a href="lab.html">The lab</a></li><li><a href="index.html#events">Open lab</a></li><li><a href="lab.html#visit">Visit</a></li></ul>' +
        '<ul class="ft-l"><li><a href="{{KAKAO_URL|#}}">Kakao</a></li><li><a href="{{INSTAGRAM_URL|#}}">Instagram</a></li><li><a href="{{BLOG_URL|#}}">Blog</a></li><li><a href="tel:' + TEL + '">' + TEL + '</a></li></ul>' +
      '</div>' +
      '<p class="ft-mark" aria-hidden="true">Gungri</p>' +
      '<div class="ft-legal">' +
        '<p>' + NAME + ' · 대표 {{OWNER|오세린}} · 사업자등록번호 {{BIZ_NO|000-00-00000}} · 학원 등록번호 {{ACADEMY_REG_NO|제0000호}}</p>' +
        '<p>{{ADDRESS|서울특별시 강남구 개포로 00, 2층}} · {{HOURS|평일 14:00–20:00 · 토 10:00–17:00}}</p>' +
        '<p>© <span data-year>2026</span> Gungri science lab. 사진은 수업 분위기를 보여 주는 연출 이미지입니다.</p>' +
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
