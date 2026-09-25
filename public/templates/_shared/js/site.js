/* ============================================================
   refsites-21-42 공용 기능 런타임 — "동작"만 담는다. 외형은 각 사이트 CSS 에만 있다.
   44개 사이트가 이 파일 하나를 쓴다. 사이트별로 복제하지 않는다.
   영상 없음 · 예약/결제 없음.

   계약 (마크업 → 동작)
   1  .pop / .pop-stag                     화면에 들어오면 .go 추가 (등장 효과는 사이트 CSS 가 정한다)
   2  <html>.is-scrolled / .is-down         스크롤 8px 넘으면 is-scrolled · 내려가는 중이면 is-down
   3  .burger[aria-controls=ID] ↔ #ID       모바일 드로어. 열리면 #ID.open · body.mm-open · Esc/링크로 닫힘
                                            CSS 변수 --mm-top = 헤더 하단 좌표(px)
   4  [data-acc]                            클릭하면 부모에 .open 토글 · aria-expanded
   5  [data-fade="5200"]                    자식을 차례로 .on (크로스페이드 · 영상 대체 수단)
   6  [data-slider] 안의 [data-track]       가로 스크롤 트랙(overflow·snap 은 사이트 CSS). [data-prev]/[data-next]
                                            [data-dots] 에 점 버튼 생성 · data-auto="6000" 자동 넘김
                                            현재 칸은 자식 .is-current · 점 버튼 aria-current
   7  [data-tabs] 안의 [data-tab="k"]        같은 [data-tabs] 안의 [data-panel="k"] 만 보인다(hidden)
   8  [data-marquee]                        자식을 한 벌 복제(aria-hidden) — 이어 흐르는 띠. 흐름은 사이트 CSS
   9  [data-year]                           올해 연도
   10 {{KEY|기본값}}                         변수 계약 v1 치환 (window.A1000.vars 가 있으면 그 값)
   ============================================================ */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  root.classList.add('js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) root.classList.add('reduce');
  function $$(sel, el) { return [].slice.call((el || doc).querySelectorAll(sel)); }

  /* 1 등장 */
  function reveal() {
    var items = $$('.pop, .pop-stag');
    if (reduce || !('IntersectionObserver' in window)) { items.forEach(function (e) { e.classList.add('go'); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('go'); io.unobserve(en.target); } });
    }, { threshold: 0.06, rootMargin: '0px 0px -5% 0px' });
    items.forEach(function (e) { io.observe(e); });
  }

  /* 2 헤더 스크롤 상태 */
  var lastY = 0;
  function onScroll() {
    var y = window.scrollY || window.pageYOffset || 0;
    root.classList.toggle('is-scrolled', y > 8);
    root.classList.toggle('is-down', y > 120 && y > lastY && !doc.body.classList.contains('mm-open'));
    lastY = y;
    if (doc.body && doc.body.classList.contains('mm-open')) place();
  }

  /* 3 모바일 드로어 */
  function drawerOf(b) {
    var id = b.getAttribute('aria-controls');
    return (id && doc.getElementById(id)) || doc.querySelector('.mobile-nav');
  }
  function shut() {
    $$('.mobile-nav.open, [data-drawer].open').forEach(function (m) { m.classList.remove('open'); });
    doc.body.classList.remove('mm-open');
    $$('.burger').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-label', '메뉴 열기'); });
  }
  function place() {
    var h = doc.getElementById('site-header') || doc.querySelector('header');
    var t = h ? Math.max(0, Math.round(h.getBoundingClientRect().bottom)) : 60;
    root.style.setProperty('--mm-top', t + 'px');
  }

  /* 4 · 3 클릭 위임 */
  doc.addEventListener('click', function (e) {
    var b = e.target.closest('.burger');
    if (b) {
      var m = drawerOf(b); if (!m) return;
      place();
      var open = !m.classList.contains('open');
      shut();
      if (open) {
        m.classList.add('open'); doc.body.classList.add('mm-open');
        b.setAttribute('aria-expanded', 'true'); b.setAttribute('aria-label', '메뉴 닫기');
      }
      return;
    }
    if (e.target.closest('.mobile-nav a, [data-drawer] a')) { shut(); return; }
    if (doc.body.classList.contains('mm-open') && !e.target.closest('.mobile-nav, [data-drawer]')) shut();

    var a = e.target.closest('[data-acc]');
    if (a) {
      var row = a.parentElement; var on = row.classList.toggle('open');
      a.setAttribute('aria-expanded', on ? 'true' : 'false');
    }
  });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') shut(); });

  /* 5 크로스페이드 */
  function fades() {
    $$('[data-fade]').forEach(function (box) {
      var sl = [].slice.call(box.children); if (!sl.length) return;
      sl.forEach(function (s, k) { s.classList.toggle('on', k === 0); });
      if (reduce || sl.length < 2) return;
      var i = 0;
      setInterval(function () {
        sl[i].classList.remove('on'); i = (i + 1) % sl.length; sl[i].classList.add('on');
      }, parseInt(box.getAttribute('data-fade'), 10) || 5200);
    });
  }

  /* 6 슬라이더 (스크롤 스냅 트랙을 넘긴다) */
  function sliders() {
    $$('[data-slider]').forEach(function (box) {
      var track = box.querySelector('[data-track]'); if (!track) return;
      var cells = [].slice.call(track.children); if (!cells.length) return;
      var dotsBox = box.querySelector('[data-dots]'), dots = [];
      function idx() {
        var x = track.scrollLeft, best = 0, bd = Infinity;
        cells.forEach(function (c, k) { var d = Math.abs(c.offsetLeft - track.offsetLeft - x); if (d < bd) { bd = d; best = k; } });
        return best;
      }
      function go(k) {
        k = (k + cells.length) % cells.length;
        track.scrollTo({ left: cells[k].offsetLeft - track.offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
      }
      function mark() {
        var k = idx();
        cells.forEach(function (c, j) { c.classList.toggle('is-current', j === k); });
        dots.forEach(function (d, j) { if (j === k) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
        var cur = box.querySelector('[data-count-current]'); if (cur) cur.textContent = String(k + 1).padStart(2, '0');
      }
      if (dotsBox) {
        cells.forEach(function (c, k) {
          var d = doc.createElement('button'); d.type = 'button'; d.setAttribute('aria-label', (k + 1) + '번째 보기');
          d.addEventListener('click', function () { go(k); });
          dotsBox.appendChild(d); dots.push(d);
        });
      }
      var tot = box.querySelector('[data-count-total]'); if (tot) tot.textContent = String(cells.length).padStart(2, '0');
      $$('[data-prev]', box).forEach(function (p) { p.addEventListener('click', function () { go(idx() - 1); }); });
      $$('[data-next]', box).forEach(function (n) { n.addEventListener('click', function () { go(idx() + 1); }); });
      var t; track.addEventListener('scroll', function () { clearTimeout(t); t = setTimeout(mark, 60); }, { passive: true });
      mark();
      var auto = parseInt(box.getAttribute('data-auto'), 10);
      if (auto && !reduce && cells.length > 1) {
        var hold = false;
        box.addEventListener('mouseenter', function () { hold = true; });
        box.addEventListener('mouseleave', function () { hold = false; });
        box.addEventListener('focusin', function () { hold = true; });
        box.addEventListener('focusout', function () { hold = false; });
        setInterval(function () {
          if (hold || doc.hidden) return;
          var r = box.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
          go(idx() + 1);
        }, auto);
      }
    });
  }

  /* 7 탭 */
  function tabs() {
    $$('[data-tabs]').forEach(function (box) {
      var btns = $$('[data-tab]', box).filter(function (b) { return b.closest('[data-tabs]') === box; });
      var panes = $$('[data-panel]', box).filter(function (p) { return p.closest('[data-tabs]') === box; });
      if (!btns.length) return;
      function show(k) {
        btns.forEach(function (b) { var on = b.getAttribute('data-tab') === k; b.setAttribute('aria-selected', on ? 'true' : 'false'); b.classList.toggle('on', on); });
        panes.forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== k; });
      }
      btns.forEach(function (b) {
        b.setAttribute('role', 'tab');
        b.addEventListener('click', function () { show(b.getAttribute('data-tab')); });
      });
      /* 주소의 #해시가 탭 키와 같으면 그 탭으로 연다 (menu.html#gift) */
      function fromHash() { var h = decodeURIComponent((location.hash || '').slice(1)); return btns.filter(function (b) { return b.getAttribute('data-tab') === h; })[0]; }
      var first = fromHash() || btns.filter(function (b) { return b.getAttribute('aria-selected') === 'true'; })[0] || btns[0];
      show(first.getAttribute('data-tab'));
      window.addEventListener('hashchange', function () { var b = fromHash(); if (b) show(b.getAttribute('data-tab')); });
    });
  }

  /* 8 이어 흐르는 띠 */
  function marquees() {
    $$('[data-marquee]').forEach(function (m) {
      if (m.getAttribute('data-marquee-ready')) return;
      [].slice.call(m.children).forEach(function (c) {
        var k = c.cloneNode(true); k.setAttribute('aria-hidden', 'true');
        $$('a,button', k).forEach(function (x) { x.setAttribute('tabindex', '-1'); });
        m.appendChild(k);
      });
      m.setAttribute('data-marquee-ready', '1');
    });
  }

  /* 9 연도 */
  function years() { $$('[data-year]').forEach(function (e) { e.textContent = String(new Date().getFullYear()); }); }

  /* 10 {{KEY|기본값}} — platform/cta-runtime.js 의 토큰 계약 */
  var CFG = window.A1000 || {};
  var TOKEN = /\{\{([A-Z_0-9]+)(?:\|([^}|]*))?\}\}/g;
  var ATTRS = ['href', 'src', 'title', 'alt', 'aria-label', 'content', 'placeholder', 'value'];
  function val(k, d) {
    var V = CFG.vars || {};
    var direct = { BIZ_NAME: CFG.shop, PHONE: CFG.tel, KAKAO_URL: CFG.kakao, NAVER_MAP_URL: CFG.map };
    var v = (V[k] !== undefined && V[k] !== null && V[k] !== '') ? V[k] : direct[k];
    return (v === undefined || v === null || v === '') ? (d !== undefined ? d : '') : String(v);
  }
  function fill(s) { return s.replace(TOKEN, function (m, k, d) { return val(k, d); }); }
  function tokens() {
    var body = doc.body; if (!body) return;
    var w = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT, null), n, ts = [];
    while ((n = w.nextNode())) if (n.nodeValue && n.nodeValue.indexOf('{{') >= 0) ts.push(n);
    ts.forEach(function (t) { t.nodeValue = fill(t.nodeValue); });
    $$('*', body).forEach(function (el) {
      ATTRS.forEach(function (a) { var v = el.getAttribute(a); if (v && v.indexOf('{{') >= 0) el.setAttribute(a, fill(v)); });
      [].slice.call(el.attributes || []).forEach(function (at) {
        if (at.name.indexOf('data-') === 0 && at.value.indexOf('{{') >= 0) el.setAttribute(at.name, fill(at.value));
      });
    });
    if (doc.title.indexOf('{{') >= 0) doc.title = fill(doc.title);
    $$('meta[content]', doc.head).forEach(function (m) { var c = m.getAttribute('content'); if (c.indexOf('{{') >= 0) m.setAttribute('content', fill(c)); });
  }

  function boot() {
    tokens(); years(); marquees(); reveal(); fades(); sliders(); tabs(); place(); onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { place(); if (innerWidth > 1024) shut(); });
    new MutationObserver(function () { clearTimeout(boot.t); boot.t = setTimeout(tokens, 0); })
      .observe(doc.body, { childList: true, subtree: true });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})();
