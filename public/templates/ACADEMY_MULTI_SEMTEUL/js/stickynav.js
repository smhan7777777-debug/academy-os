/* ══ stickynav 2026-09-21 ══
   스크롤을 내려도 메뉴를 찾을 수 있게 한다.
   사이트마다 헤더 구조가 다르므로 화면에서 직접 읽어 만든다 — 원본 HTML/CSS 를 건드리지 않는다.
   · 맨 위에서는 원래 헤더 그대로 보인다
   · 한 화면 넘게 내려가면 납작한 바가 나타난다
   · 내릴 때 숨고 올릴 때 바로 나온다 (내용을 가리지 않으면서 메뉴는 늘 한 손 거리)
*/
(function () {
  'use strict';
  if (window.__snDone) return;
  window.__snDone = 1;

  var D = document;
  function $(s, r) { return (r || D).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); }

  function isLocal(a) {
    var h = a.getAttribute('href') || '';
    if (!h || h === '#') return false;
    if (/^(tel:|mailto:|javascript:)/i.test(h)) return false;
    if (/^https?:/i.test(h)) return false;
    return true;
  }

  /* 1) 헤더 · 내비 찾기 --------------------------------------------------- */
  function findHeader() {
    return $('#site-header') || $('header') || $('.hd') || $('.gnb') || $('.topbar');
  }

  function findNavLinks(header) {
    var pools = [];
    if (header) pools.push.apply(pools, $$('nav', header));
    pools.push.apply(pools, $$('nav'));
    pools.push.apply(pools, $$('.dnav, .gnb, .mobile-nav, .nav, [role=navigation]'));
    pools.push.apply(pools, $$('.megamenu, .mega, .menu, .drawer, .offcanvas, .mm-cols, [class*="menu"]'));
    function shown(el) {
      var e = el;
      while (e && e.nodeType === 1) {
        var s = getComputedStyle(e);
        if (s.display === 'none' || s.visibility === 'hidden') return false;
        e = e.parentElement;
      }
      return true;
    }
    // 화면에 실제로 보이는 메뉴를 먼저 쓴다.
    // 숨은 서랍/메가메뉴에는 아직 만들지 않은 페이지 링크가 남아 있을 수 있다.
    var best = null, bestN = 0, visibleOnly = true;
    for (var pass = 0; pass < 2; pass++) {
    for (var i = 0; i < pools.length; i++) {
      var links = $$('a', pools[i]).filter(isLocal);
      if (visibleOnly) links = links.filter(shown);
      // 드롭다운 안의 항목은 제외 — 1단만 쓴다
      links = links.filter(function (a) {
        return !a.closest('.dd-menu, .submenu, .sub, .depth2');
      });
      var seen = {}, uniq = [];
      for (var j = 0; j < links.length; j++) {
        var t = (links[j].childNodes[0] && links[j].childNodes[0].nodeValue || links[j].textContent || '').trim();
        if (!t) t = (links[j].textContent || '').trim();
        // 글자 없는 링크(점 색인·아이콘)는 메뉴가 아니다 — 개수만 많아서 진짜 메뉴를 이기면 빈 바가 된다
        if (!t) continue;
        var key = links[j].getAttribute('href') + '|' + t;
        if (seen[key]) continue;
        seen[key] = 1; uniq.push(links[j]);
      }
      if (uniq.length > bestN && uniq.length >= 3) { best = uniq; bestN = uniq.length; }
    }
      if (best) break;          // 보이는 메뉴를 찾았으면 끝
      visibleOnly = false;      // 못 찾았을 때만 숨은 메뉴를 본다
    }
    return best || [];
  }

  /* 2) 색 뽑기 ------------------------------------------------------------ */
  function solid(c) { return c && c !== 'transparent' && !/rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(c); }
  function pickColors(header) {
    var bg = '#ffffff', fg = '#111111', accent = null, accentFg = '#ffffff';
    var probe = header;
    while (probe && probe !== D.documentElement) {
      var cs = getComputedStyle(probe);
      if (solid(cs.backgroundColor)) { bg = cs.backgroundColor; fg = cs.color; break; }
      probe = probe.parentElement;
    }
    if (!solid(bg)) {
      var bcs = getComputedStyle(D.body);
      bg = solid(bcs.backgroundColor) ? bcs.backgroundColor : '#ffffff';
      fg = bcs.color;
    }
    var rs = getComputedStyle(D.documentElement);
    var names = ['--accent', '--brand', '--point', '--primary', '--pink', '--ink'];
    for (var i = 0; i < names.length; i++) {
      var v = rs.getPropertyValue(names[i]).trim();
      if (v) { accent = v; break; }
    }
    if (!accent) {
      var btn = $('.btn, .cta, button.btn, a.btn');
      if (btn) { var b = getComputedStyle(btn).backgroundColor; if (solid(b)) accent = b; }
    }
    if (!accent) accent = fg;
    fg = readable(fg, bg);
    if (contrast(accent, bg) !== null && contrast(accent, bg) < 1.6) accent = fg; // 강조색이 바탕과 같으면 못 쓴다
    // 강조색 위 글자색은 밝기로 정한다
    var la = lum(accent);
    accentFg = (la !== null && la > 0.42) ? '#111111' : '#ffffff';
    return { bg: bg, fg: fg, accent: accent, accentFg: accentFg };
  }

  // ── 대비 보정 ──────────────────────────────────────────
  function rgb(c) {
    var h = String(c).trim();
    // ★ 16진수를 먼저 본다. `#f6b9d0` 에서 숫자만 뽑으면 [6,9,0] 이 되어 엉뚱한 밝기가 나온다.
    if (/^#[0-9a-f]{3}$/i.test(h)) return [parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16), parseInt(h[3] + h[3], 16)];
    if (/^#[0-9a-f]{6}$/i.test(h)) return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)];
    var m = h.match(/^rgba?\(([^)]*)\)/i);
    if (m) {
      var p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
      if (p.length >= 3 && p.every(function (x) { return !isNaN(x); })) return [p[0], p[1], p[2]];
    }
    return null;
  }
  function lum(c) {
    var v = rgb(c); if (!v) return null;
    var a = v.map(function (x) { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); });
    return .2126 * a[0] + .7152 * a[1] + .0722 * a[2];
  }
  function contrast(a, b) {
    var la = lum(a), lb = lum(b);
    if (la === null || lb === null) return null;
    return (Math.max(la, lb) + .05) / (Math.min(la, lb) + .05);
  }
  // 글자가 바탕에 묻히면(대비 4.5 미만) 검정/흰색으로 갈아 끼운다
  function readable(fg, bg) {
    var c = contrast(fg, bg);
    if (c !== null && c >= 4.5) return fg;
    var lb = lum(bg);
    if (lb === null) return fg;
    return lb > 0.42 ? '#111111' : '#ffffff';
  }

  function lineColor(fg) {
    var m = String(fg).match(/(\d+(?:\.\d+)?)/g);
    if (m && m.length >= 3) return 'rgba(' + m[0] + ',' + m[1] + ',' + m[2] + ',.16)';
    return 'rgba(0,0,0,.12)';
  }

  /* 3) 짓기 --------------------------------------------------------------- */
  function build() {
    var header = findHeader();
    if (!header) return false;
    var links = findNavLinks(header);
    if (!links.length) return false;

    var col = pickColors(header);
    var bar = D.createElement('div');
    bar.className = 'sn-bar';
    bar.setAttribute('role', 'navigation');
    bar.setAttribute('aria-label', '고정 메뉴');
    bar.style.setProperty('--sn-bg', col.bg);
    bar.style.setProperty('--sn-fg', col.fg);
    bar.style.setProperty('--sn-line', lineColor(col.fg));
    bar.style.setProperty('--sn-accent', col.accent);
    bar.style.setProperty('--sn-accent-fg', col.accentFg);

    // 상호
    var brandEl = $('.brand', header) || $('[class*=brand]', header) || $('.logo', header) || $('h1', header);
    // 상호가 여러 조각으로 쪼개져 있으면 이어 붙이면 뭉개진다 — 첫 조각만 쓴다
    function brandText(el) {
      if (!el) return '';
      var own = '';
      for (var i = 0; i < el.childNodes.length; i++) {
        if (el.childNodes[i].nodeType === 3) own += el.childNodes[i].nodeValue;
      }
      own = own.replace(/\s+/g, ' ').trim();
      if (own) return own;
      var first = el.firstElementChild;
      if (first) {
        var t = (first.textContent || '').replace(/\s+/g, ' ').trim();
        if (t) return t;
      }
      return (el.textContent || '').replace(/\s+/g, ' ').trim();
    }
    var brandTxt = brandText(brandEl);
    if (!brandTxt || brandTxt.length > 28) brandTxt = (D.title || '').split(/[·|—\-]/)[0].trim();
    var brandHref = (brandEl && brandEl.tagName === 'A' && brandEl.getAttribute('href')) || 'index.html';
    var brand = D.createElement('a');
    brand.className = 'sn-brand';
    brand.href = brandHref;
    brand.textContent = brandTxt || 'HOME';
    bar.appendChild(brand);

    // 메뉴 (최대 7개)
    var wrap = D.createElement('div');
    wrap.className = 'sn-links';
    var used = links.slice(0, 7);
    var items = [];
    used.forEach(function (a) {
      var clone = D.createElement('a');
      clone.href = a.getAttribute('href');
      // 영문 주라벨만 쓴다 — 한글 부제(<small>/<span>)는 패널에서 보여 준다
      var main = '', sub = '';
      // 우리가 넣은 영문/한글 짝이 있으면 그대로 쓴다
      var enEl = a.querySelector('.lx-en'), koEl = a.querySelector('.lx-ko');
      if (enEl) {
        main = (enEl.textContent || '').replace(/\s+/g, ' ').trim();
        sub = koEl ? (koEl.textContent || '').replace(/\s+/g, ' ').trim() : '';
      } else {
        for (var i = 0; i < a.childNodes.length; i++) {
          var n = a.childNodes[i];
          if (n.nodeType === 3) main += n.nodeValue;
        }
        main = main.replace(/\s+/g, ' ').trim();
        var subEl = a.querySelector('small, span');
        if (subEl) sub = (subEl.textContent || '').replace(/\s+/g, ' ').trim();
      }
      if (!main) { main = (a.textContent || '').replace(/\s+/g, ' ').trim(); sub = ''; }
      if (!main) return;
      clone.textContent = main;
      if (a.getAttribute('aria-current')) clone.setAttribute('aria-current', 'page');
      wrap.appendChild(clone);
      items.push({ href: a.getAttribute('href'), main: main, sub: sub });
    });
    bar.appendChild(wrap);

    // 전화 단추
    var tel = $('a[href^="tel:"]');
    if (tel) {
      var cta = D.createElement('a');
      cta.className = 'sn-cta';
      cta.href = tel.getAttribute('href');
      cta.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 3.5h3.2l1.6 4.3-2.2 1.4a11.5 11.5 0 0 0 6.7 6.7l1.4-2.2 4.3 1.6v3.2a2 2 0 0 1-2.1 2A16.8 16.8 0 0 1 3.5 5.6a2 2 0 0 1 2-2.1z"/></svg><span>CALL</span>';
      bar.appendChild(cta);
    }

    // 좁은 화면용 버튼
    var burger = D.createElement('button');
    burger.className = 'sn-burger';
    burger.type = 'button';
    burger.setAttribute('aria-label', '메뉴 열기');
    burger.setAttribute('aria-expanded', 'false');
    burger.innerHTML = '<i></i>';
    bar.appendChild(burger);

    var prog = D.createElement('div');
    prog.className = 'sn-prog';
    bar.appendChild(prog);
    D.body.appendChild(bar);

    // 패널
    var panel = D.createElement('div');
    panel.className = 'sn-panel';
    panel.setAttribute('aria-hidden', 'true');
    panel.style.setProperty('--sn-bg', col.bg);
    panel.style.setProperty('--sn-fg', col.fg);
    panel.style.setProperty('--sn-line', lineColor(col.fg));
    var ul = D.createElement('ul');
    items.forEach(function (it) {
      var li = D.createElement('li');
      var a = D.createElement('a');
      a.href = it.href;
      a.textContent = it.main;
      if (it.sub) { var s = D.createElement('span'); s.textContent = it.sub; a.appendChild(s); }
      li.appendChild(a); ul.appendChild(li);
    });
    panel.appendChild(ul);
    if (tel) {
      var pl = D.createElement('li');
      var pa = D.createElement('a');
      pa.href = tel.getAttribute('href');
      pa.textContent = 'CALL';
      var ps = D.createElement('span'); ps.textContent = '전화 문의'; pa.appendChild(ps);
      pl.appendChild(pa); ul.appendChild(pl);
    }
    var close = D.createElement('button');
    close.className = 'sn-close';
    close.type = 'button';
    close.setAttribute('aria-label', '메뉴 닫기');
    close.innerHTML = '&times;';
    panel.appendChild(close);
    D.body.appendChild(panel);

    function setOpen(v) {
      panel.setAttribute('data-open', v ? '1' : '0');
      panel.setAttribute('aria-hidden', v ? 'false' : 'true');
      burger.setAttribute('aria-expanded', v ? 'true' : 'false');
      D.documentElement.style.overflow = v ? 'hidden' : '';
      if (v) { var f = panel.querySelector('a'); if (f) f.focus(); }
    }
    burger.addEventListener('click', function () { setOpen(panel.getAttribute('data-open') !== '1'); });
    close.addEventListener('click', function () { setOpen(false); burger.focus(); });
    panel.addEventListener('click', function (e) { if (e.target.tagName === 'A') setOpen(false); });
    D.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.getAttribute('data-open') === '1') { setOpen(false); burger.focus(); } });

    /* 4) 스크롤 반응 ----------------------------------------------------- */
    var last = window.scrollY, shown = false, ticking = false;
    var START = Math.max(420, Math.round(window.innerHeight * 0.75));

    function apply() {
      ticking = false;
      var y = window.scrollY;
      var max = D.documentElement.scrollHeight - window.innerHeight;
      prog.style.width = max > 0 ? (Math.min(1, y / max) * 100).toFixed(2) + '%' : '0';

      if (panel.getAttribute('data-open') === '1') { last = y; return; }

      // 원래 헤더가 아직 화면 위쪽에 보이고 있으면(스스로 따라오는 사이트) 우리 바는 비킨다
      var hr = header.getBoundingClientRect();
      if (hr.height > 20 && hr.bottom > 8 && hr.top < 90) {
        if (shown) { shown = false; bar.setAttribute('data-show', '0'); }
        last = y; return;
      }

      var want;
      if (y < START) want = false;                 // 맨 위 — 원래 헤더가 보인다
      else if (y < last - 4) want = true;          // 올리는 중 — 바로 보여 준다
      else if (y > last + 6) want = false;         // 내리는 중 — 비켜 준다
      else want = shown;
      // 바닥 근처에서는 늘 보여 준다 (푸터에서 되돌아갈 길)
      if (max - y < 120) want = true;
      if (want !== shown) { shown = want; bar.setAttribute('data-show', want ? '1' : '0'); }
      last = y;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(apply); }
    }, { passive: true });
    window.addEventListener('resize', function () {
      START = Math.max(420, Math.round(window.innerHeight * 0.75));
    }, { passive: true });
    // 문서가 화면보다 넓으면(마퀴·가로 트랙) 가로 스크롤을 막는다
    function guardX() {
      var de = D.documentElement;
      if (de.scrollWidth > de.clientWidth + 1) de.classList.add('sn-noxscroll');
    }
    guardX();
    setTimeout(guardX, 800);
    window.addEventListener('resize', guardX, { passive: true });

    apply();
    return true;
  }

  function boot(tries) {
    try {
      var r = build();
      if (r === 'skip') { D.documentElement.setAttribute('data-sn', 'native-sticky'); return; }
      if (r) { D.documentElement.setAttribute('data-sn', 'on'); return; }
    } catch (e) { /* 실패해도 원본 사이트는 그대로 */ }
    if ((tries || 0) < 12) setTimeout(function () { boot((tries || 0) + 1); }, 150);
  }
  if (D.readyState === 'complete' || D.readyState === 'interactive') setTimeout(function () { boot(0); }, 80);
  else D.addEventListener('DOMContentLoaded', function () { setTimeout(function () { boot(0); }, 80); });
})();
