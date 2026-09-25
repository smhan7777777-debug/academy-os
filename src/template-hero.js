import { esc } from "./ui.js";
import { siteDesign } from "../shared/templates.js";
import { websiteProfile } from "../shared/website.js";

// Original template styles are isolated: their global selectors must never leak
// into the owner's office or the shared reservation and inquiry forms.
export class AcademyHero extends HTMLElement {
  set site(site) {
    this._site = site;
    this.draw();
  }
  disconnectedCallback() {
    this.cleanup?.();
  }
  draw() {
    this.cleanup?.();
    const site = this._site;
    if (!site) return;
    const { template, displayedVideo: video } = siteDesign(site.settings);
    const heroKey = template.library ? "gwanmun" : template.key;
    const profile = websiteProfile(site.settings);
    const root = this.shadowRoot || this.attachShadow({ mode: "open" });
    const film = `<div class="film"><video muted loop playsinline preload="metadata" poster="/videos/academy-${video}-poster.jpg" aria-label="학원의 배움을 소개하는 영상"><source src="/videos/academy-${video}.mp4" type="video/mp4"></video><span class="film-shade"></span><button class="film-toggle" type="button" aria-label="소개 영상 재생">영상 재생</button></div>`;
    const title = `<h1>${esc(profile.headline)}</h1>`;
    const intro = `<p class="intro">${esc(profile.intro)}</p>`;
    const actions = `<div class="actions"><a class="cta" href="#booking">상담 예약하기 <span>↗</span></a><a class="more" href="#admission">수강 안내 <span>→</span></a></div>`;
    const label = `<div class="kicker">${esc(site.settings.name)} <span>ACADEMY</span></div>`;
    const count = site.classes.length;
    const designs = {
      deungyong: `<div class="copy">${label}${title}${intro}${actions}</div>${film}<div class="bottom">배움의 시작부터, 다음 걸음까지.<span>SCROLL TO EXPLORE ↓</span></div>`,
      gagyo: `<div class="copy">${label}<span class="tag">우리 아이의 다음 가능성</span>${title}${intro}${actions}</div><div class="visual">${film}<div class="note"><span>LEARN · CONNECT · GROW</span><strong>함께 만드는<br>다음의 가능성.</strong></div></div>`,
      gwanmun: `<div class="mast">${label}<span>배움의 문을 열다 · 상담 접수 중</span></div><div class="copy">${title}${intro}${actions}</div>${film}<div class="index"><span>01 / 학원 소개</span><span>02 / ${count}개 수업</span><span>03 / 상담 예약</span></div>`,
      hanbyeol: `${film}<div class="copy">${label}<span class="gold-line"></span>${title}${intro}${actions}</div><div class="bottom">THE NEXT CHAPTER OF LEARNING<span>함께, 더 넓은 배움으로</span></div>`,
      itda: `<div class="copy">${label}<span class="tag">// YOUR NEXT STEP</span>${title}${intro}${actions}</div><div class="visual">${film}<div class="terminal"><span>academy / learning</span><p><b>→</b> 지금의 배움을 살피고</p><p><b>→</b> 다음의 실력으로 잇습니다.</p><span>${String(count).padStart(2, "0")} COURSES AVAILABLE</span></div></div>`,
      jeongjin: `<div class="mast">${label}<span>매일의 기록, 내일의 성장.</span></div><div class="copy">${title}<div class="lead-row">${intro}${actions}</div></div>${film}<div class="bottom">차근차근, 자신의 속도로.<span>LEARNING JOURNAL / ${String(count).padStart(2, "0")} COURSES</span></div>`,
    };
    root.innerHTML = `<link rel="stylesheet" href="/designs/${heroKey}.css"><style>
      :host{display:block;font-family:inherit;color:#191919}*{box-sizing:border-box}a{text-decoration:none;color:inherit}button{font:inherit;cursor:pointer}h1,p{margin:0} .hero{position:relative;overflow:hidden;margin:0;min-height:640px;padding:64px;isolation:isolate;background:#111;color:white;border-radius:0;display:block;font-family:inherit} .copy{position:relative;z-index:2;max-width:710px}.kicker{display:flex;align-items:center;gap:18px;font-size:14px;font-weight:650;letter-spacing:.04em;color:inherit}.kicker span{opacity:.5;font-size:10px;letter-spacing:.2em}h1{font-family:inherit!important;font-size:clamp(38px,4.8vw,76px)!important;font-weight:650!important;line-height:1.17!important;letter-spacing:-.055em!important;text-wrap:balance;color:inherit!important;margin:32px 0 24px!important;word-break:keep-all}.intro{font-size:17px;line-height:1.9;max-width:510px;opacity:.8;word-break:keep-all}.actions{display:flex;gap:24px;align-items:center;flex-wrap:wrap;margin-top:32px}.cta{padding:15px 23px;border-radius:4px;background:var(--action,#fff);color:var(--action-ink,#111);font-size:15px;font-weight:650;display:inline-flex;gap:34px;align-items:center;min-height:48px}.more{font-size:14px;border-bottom:1px solid currentColor;padding:12px 0;display:inline-flex;gap:14px}.film{position:relative;overflow:hidden;min-height:300px;background:#252b2e}.film video{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:cover!important;transform:none!important;filter:none!important;z-index:0!important}.film-shade{position:absolute;inset:0;background:linear-gradient(90deg,#0004,transparent);pointer-events:none}.film-toggle{position:absolute;bottom:20px;right:20px;z-index:4;padding:9px 15px;border:1px solid #ffffff88;border-radius:30px;color:#fff;background:#0009;font-size:12px;min-height:40px}.bottom{display:flex;justify-content:space-between;gap:20px;font-size:12px;position:relative;z-index:2;margin-top:35px;letter-spacing:.03em}.bottom span{opacity:.55;font-size:10px;letter-spacing:.1em}.tag{display:inline-block;font-size:12px;margin-top:30px;letter-spacing:.08em}.mast{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #9995;padding-bottom:20px;gap:15px}.mast>span{font-size:12px}.index{display:flex;gap:30px;font-size:13px}.terminal{background:#20251f;border:1px solid #657358;padding:25px;color:#f1f8e9}.terminal>span{font-size:11px;color:#96aa88}.terminal p{font-size:15px;margin:12px 0}.terminal b{color:#b6ef67;margin-right:8px}
      .deungyong{padding-bottom:35px}.deungyong .copy{max-width:57%}.deungyong>.film{position:absolute;right:0;top:0;width:45%;height:100%;mask-image:linear-gradient(90deg,transparent,#000 25%)}.deungyong .bottom{margin-top:95px}.deungyong{--action:#d70015;--action-ink:#fff}
      .gagyo{background:#edf1ff;color:#102755;display:grid;grid-template-columns:1.1fr 1fr;gap:42px;border-radius:22px;padding:48px;--action:#2356d8;--action-ink:white}.gagyo .visual{position:relative;padding-top:20px}.gagyo .film{height:380px;border-radius:100px 20px 20px 20px}.gagyo .note{background:#1b3a88;color:#fff;padding:25px;position:relative;margin:-35px 25px 0 -20px;border-radius:14px;box-shadow:0 20px 30px #15285920}.note span{font-size:10px;letter-spacing:.1em;opacity:.65}.note strong{font-size:25px;line-height:1.45;display:block;margin-top:8px}.gagyo h1{font-size:clamp(38px,4vw,60px)!important}.gagyo .tag{color:#2356d8}
      .gwanmun{background:#f5f3ea;color:#1b362e;display:grid;grid-template-columns:1.2fr 1fr;gap:40px;--action:#215347;--action-ink:white}.gwanmun .mast,.gwanmun .index{grid-column:1/-1}.gwanmun>.film{min-height:370px;border-radius:200px 200px 8px 8px;margin-top:10px}.gwanmun h1{font-family:Georgia,'Nanum Myeongjo',serif!important;font-size:clamp(36px,4vw,58px)!important}.gwanmun .index{border-top:1px solid #9995;padding-top:24px}
      .hanbyeol{min-height:720px;display:flex;align-items:center;justify-content:center;text-align:center;padding:90px 50px;--action:#c4a568;--action-ink:#14232a}.hanbyeol>.film{position:absolute;inset:0;height:100%;z-index:-1}.hanbyeol .film-shade{background:linear-gradient(90deg,#102225bb,#14272d55,#10222599)}.hanbyeol .copy{max-width:760px}.hanbyeol .kicker,.hanbyeol .actions{justify-content:center}.hanbyeol .intro{margin:auto;max-width:620px}.hanbyeol h1{font-family:Georgia,'Nanum Myeongjo',serif!important;font-weight:500!important}.gold-line{display:block;width:40px;height:1px;background:#d5b57b;margin:30px auto}.hanbyeol .bottom{position:absolute;bottom:35px;left:40px;right:40px}
      .itda{background:#101711;color:#edf5e9;display:grid;grid-template-columns:1.2fr 1fr;gap:50px;--action:#b6ef67;--action-ink:#162315}.itda .tag{color:#b6ef67}.itda .visual{align-self:center}.itda .film{height:300px;border-radius:3px}.itda .terminal{margin-top:-15px;margin-left:-25px;position:relative;z-index:2}.itda h1{font-weight:750!important}
      .jeongjin{background:#f8f5ef;color:#282a28;--action:#923b3b;--action-ink:#fff}.jeongjin .copy{max-width:none}.jeongjin h1{max-width:950px;font-family:Georgia,'Nanum Myeongjo',serif!important}.jeongjin .lead-row{display:flex;gap:40px;justify-content:space-between;align-items:center}.jeongjin .actions{margin:0}.jeongjin>.film{height:310px;margin-top:36px}.jeongjin .bottom{margin-top:22px}
      @media(max-width:760px){.hero{padding:32px 24px;min-height:0}.hero h1{font-size:40px!important}.intro{font-size:15px}.deungyong .copy{max-width:100%}.deungyong>.film{position:relative;width:calc(100% + 48px);margin:32px -24px 0;height:260px;min-height:260px;mask-image:none}.deungyong .bottom{margin-top:24px}.gagyo,.gwanmun,.itda{grid-template-columns:1fr;gap:25px}.gagyo .film{height:290px;min-height:290px}.gagyo .note{margin:-25px 5px 0}.gwanmun>.film{min-height:280px}.gwanmun .mast,.gwanmun .index{grid-column:auto}.mast{align-items:flex-start;flex-direction:column}.index{gap:15px;font-size:11px}.hanbyeol{min-height:650px;padding:70px 24px}.hanbyeol .bottom{left:24px;right:24px;bottom:22px}.bottom{flex-wrap:wrap}.itda .terminal{margin-left:0}.jeongjin .lead-row{display:block}.jeongjin .actions{margin-top:24px}.jeongjin>.film{height:260px;min-height:260px}.kicker{flex-wrap:wrap;gap:8px}.actions{gap:18px}.cta{gap:20px}.film-toggle{right:12px;bottom:12px}}
      .hanbyeol .film-toggle,.itda .film-toggle,.gagyo .film-toggle{top:20px;bottom:auto}.hanbyeol .bottom{pointer-events:none}
      @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
    </style><section class="hero ${heroKey}" aria-label="${template.name} 디자인 · 학원 소개">${designs[heroKey]}</section>`;
    const player = root.querySelector("video"),
      button = root.querySelector(".film-toggle");
    const update = () => {
      button.textContent = player.paused ? "영상 재생" : "영상 멈춤";
      button.setAttribute("aria-label", `소개 ${button.textContent}`);
    };
    player.addEventListener("play", update);
    player.addEventListener("pause", update);
    button.addEventListener("click", () => {
      if (player.paused) player.play().catch(update);
      else player.pause();
    });
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    if (!reduced.matches && !new URLSearchParams(location.search).has("still"))
      player.play().catch(update);
    const changed = () => {
      if (reduced.matches) player.pause();
    };
    reduced.addEventListener("change", changed);
    this.cleanup = () => {
      player.pause();
      reduced.removeEventListener("change", changed);
    };
    root.querySelectorAll('a[href^="#"]').forEach((a) =>
      a.addEventListener("click", (event) => {
        event.preventDefault();
        document.querySelector(a.getAttribute("href"))?.scrollIntoView({
          behavior: reduced.matches ? "instant" : "smooth",
        });
        history.replaceState(null, "", a.getAttribute("href"));
      }),
    );
  }
}
customElements.define("academy-hero", AcademyHero);
