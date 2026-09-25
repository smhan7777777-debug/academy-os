import * as api from "./api.js";
import {
  TEMPLATES,
  siteDesign,
  FREE_STAFF,
  templateById,
} from "../shared/templates.js";
import { esc, field, area, icon } from "./ui.js";

export async function startWebsiteSetup() {
  const app = document.querySelector("#app");
  const site = await api.request("/api/public");
  const saved = siteDesign(site.settings);
  let selected =
    templateById(new URLSearchParams(location.search).get("template")) ||
    saved.template;
  let video = saved.video,
    rotate = saved.rotate,
    pending = false,
    tab = "premium";
  let requests = [],
    draft = null,
    width = "desktop",
    statusText = "",
    files = [];
  const values = {
    name: site.settings.name,
    phone: site.settings.phone,
    address: site.settings.address,
    sourceUrl: "",
    notes: "",
  };
  const auth = await api.session();
  if (auth.actor?.role === "owner") {
    requests = (await api.getState()).websiteRequests || [];
    draft = requests.find((r) => r.status === "review") || null;
    if (draft) tab = "custom";
  }
  const previewUrl = () =>
    `/site?preview=1&template=${selected.id}&video=${video}&embed=1`;
  function remember() {
    for (const key of Object.keys(values)) {
      const input = app.querySelector(`[name="${key}"]`);
      if (input) values[key] = input.value;
    }
    if (draft)
      for (const key of Object.keys(draft.profile)) {
        const input = app.querySelector(`[name="profile.${key}"]`);
        if (input) draft.profile[key] = input.value;
      }
  }
  async function ownerState() {
    const session = await api.session();
    if (!session.actor && session.demo) await api.login("owner");
    else if (session.actor?.role !== "owner")
      throw Error("원장 계정으로 로그인한 뒤 이용해 주세요.");
    return api.getState();
  }
  async function run(action) {
    if (pending) return;
    remember();
    pending = true;
    statusText = "처리 중입니다…";
    render();
    try {
      await action();
    } catch (error) {
      statusText = error.message;
    } finally {
      pending = false;
      render();
    }
  }
  function updatePreview() {
    app.querySelector("#studioPreview").src = previewUrl();
    app.querySelector("#previewOpen").href = previewUrl();
    app.querySelector("#previewLabel").textContent =
      `${selected.name} · 학원의 배움 ${video === "v1" ? "1" : "2"} · 적용 전 미리보기`;
  }
  function render() {
    document.title = "웹사이트 만들기 · 원장실 Academy OS";
    app.innerHTML = `<main class="design-studio" id="main">
      <header class="studio-header"><a class="brand" href="/start"><span class="brand-mark">A</span><span class="brand-word">원장실<small>ACADEMY WEBSITE STUDIO</small></span></a><a class="button secondary" href="/#website">원장실로 ${icon("arrow")}</a></header>
      <section class="studio-intro"><div><span class="eyebrow">YOUR WEBSITE, YOUR ACADEMY</span><h1>우리 학원 웹사이트,<br><em>보고 고르면 완성.</em></h1><p>디자인으로 바로 시작하거나, 학원 자료로 맞춤 소개를 준비하세요.<br>웹사이트와 예약·문의 직원, 콘텐츠 생성 직원이 함께합니다.</p></div><div class="studio-price"><span>웹사이트 + 영상 + 직원 2명</span><strong>₩0</strong><small>기본 제공 · 무료</small></div></section>
      <section class="studio-browser" aria-label="웹사이트 미리보기"><div class="studio-browser-bar"><span class="studio-dots" aria-hidden="true">● ● ●</span><span id="previewLabel">${esc(selected.name)} · 적용 전 미리보기</span><div class="studio-tools"><button class="button secondary" data-width="desktop" aria-pressed="${width === "desktop"}">PC</button><button class="button secondary" data-width="mobile" aria-pressed="${width === "mobile"}">모바일</button><a class="button secondary" id="previewOpen" href="${previewUrl()}" target="_blank" rel="noopener">새 창 ↗</a></div></div><div class="studio-preview-stage ${width}"><iframe id="studioPreview" title="선택한 학원 웹사이트 미리보기" src="${previewUrl()}"></iframe></div><div class="studio-browser-bar"><span>선택한 디자인과 영상을 적용 전에 확인하세요.</span><a href="/site" target="_blank" rel="noopener">현재 웹사이트 ↗</a><button class="button secondary" id="copySite">주소 복사</button></div></section>
      <section class="studio-builder"><div class="studio-step"><span>01</span><h2>웹사이트 만들기 · 두 가지 방법</h2></div><div class="studio-methods" aria-label="웹사이트 제작 방법"><button data-method="premium" aria-pressed="${tab === "premium"}"><strong>프리미엄 템플릿</strong><span>디자인 ${TEMPLATES.length}종과 영상 2편 중 선택. 바로 적용할 수 있어요.</span></button><button data-method="custom" aria-pressed="${tab === "custom"}"><strong>맞춤형 제작</strong><span>학원 링크·소개 자료로 초안을 준비하고 확인해 적용해요.</span></button></div>
      ${tab === "premium" ? `<form id="siteSetupForm" class="form-stack"><h3>디자인 고르기</h3><section class="design-grid compact" aria-label="기본 웹사이트 디자인">${TEMPLATES.map((t) => `<article class="design-card ${selected.id === t.id ? "selected" : ""}" data-template-card="${t.id}"><button type="button" class="design-shot shot-${t.key}" data-select-template="${t.id}" aria-pressed="${selected.id === t.id}" aria-label="${t.name} 디자인 선택"><img src="${t.image || `/designs/${t.key}-preview.png`}" alt="${t.name} 디자인" loading="lazy"></button><div class="design-card-body"><div><h3>${t.name}</h3><p>${t.description}</p></div></div></article>`).join("")}</section><div class="studio-step"><span>02</span><h2>히어로 영상</h2><button class="button secondary" type="button" id="randomVideo">다른 영상 추천 ${icon("spark")}</button></div><fieldset class="film-choices"><legend>히어로 영상 선택</legend>${["v1", "v2"].map((v, i) => `<label class="film-choice"><input type="radio" name="video" value="${v}" ${v === video ? "checked" : ""}><img src="/videos/academy-${v}-poster.jpg" alt=""><span>학원의 배움 ${i + 1}</span></label>`).join("")}</fieldset><label class="check"><input name="rotate" type="checkbox" ${rotate ? "checked" : ""}><span>매일 다른 영상으로 자동 교체</span></label><p class="small muted">자동 교체를 끄면 선택한 영상만 보여줍니다.</p><div class="studio-step"><span>03</span><h2>학원 정보 확인</h2></div><div class="studio-fields">${field("학원 이름", "name", values.name, "text", 'required maxlength="150"')}${field("연락처", "phone", values.phone, "tel", 'required maxlength="150"')}${field("주소", "address", values.address, "text", 'required maxlength="150"')}</div><div class="studio-apply"><span><strong id="selectedDesign">${esc(selected.name)} 디자인</strong><small>웹사이트 + 영상 + 무료 직원 두 명</small></span><button class="button primary" type="submit" ${pending ? "disabled" : ""}>이 디자인으로 웹사이트 만들기 ${icon("arrow")}</button></div></form>` : `<div class="studio-custom"><p>기존 학원 홈페이지나 네이버 플레이스의 소개를 가져오거나, 가지고 계신 자료를 올려 주세요.</p><form id="customSourceForm" class="form-stack">${field("학원 홈페이지·네이버 플레이스 링크 (선택)", "sourceUrl", values.sourceUrl, "url", 'maxlength="2000" placeholder="https://…"')}<div><button class="button secondary" type="button" id="readSource" ${pending ? "disabled" : ""}>링크에서 소개 가져오기</button></div>${area("학원 소개·수업 안내 자료", "notes", values.notes, 'required maxlength="12000" rows="5" placeholder="소개글, 수업 방식, 상담 절차 등 확인할 수 있는 내용을 넣어 주세요."')}<label class="field"><span>자료 파일 (TXT·MD·CSV, 최대 5개 · 파일당 50KB)</span><input id="sourceFiles" type="file" accept=".txt,.md,.csv,text/plain,text/markdown,text/csv" multiple><small>${files.length ? esc(files.join(" · ")) : "문서 내용을 읽어 위 자료에 추가합니다."}</small></label><p class="form-note">현재는 입력 자료를 정리하는 로컬 초안입니다. 외부 AI 생성·사진 및 PDF 분석은 연결되지 않았습니다. 가져온 문장에서 사실과 공개 가능한 내용을 확인해 주세요.</p><button class="button primary" type="submit" ${pending ? "disabled" : ""}>${draft ? "새 초안 만들기" : "자료로 초안 만들기"} ${icon("arrow")}</button></form>${draft ? `<form id="customReviewForm" class="form-stack studio-review"><div class="studio-step"><span>확인</span><h2>초안 검토 · 수정</h2><span class="badge amber">적용 전</span></div><p class="small muted">자료를 정리한 로컬 초안 · ${esc(draft.createdAt.slice(0, 10))}</p>${field("첫 화면 제목", "profile.headline", draft.profile.headline, "text", 'required maxlength="80"')}${area("첫 화면 소개", "profile.intro", draft.profile.intro, 'required maxlength="400" rows="3"')}${area("학원 소개", "profile.about", draft.profile.about, 'required maxlength="1500" rows="5"')}${area("수강·등록 안내", "profile.admission", draft.profile.admission, 'required maxlength="1500" rows="4"')}<div class="entry-actions"><button class="button primary" type="submit" ${pending ? "disabled" : ""}>확인했어요 · 웹사이트에 적용</button><button class="button secondary" type="button" id="rejectDraft" ${pending ? "disabled" : ""}>초안 보류</button></div></form>` : ""}${requests.length ? `<details class="studio-history"><summary>제작 이력 ${requests.length}건</summary>${requests.map((r) => `<p>${esc(r.createdAt.slice(0, 10))} · ${esc({ review: "검토 대기", applied: "적용됨", rejected: "보류" }[r.status] || r.status)}${r.sourceUrl ? ` · ${esc(r.sourceUrl)}` : ""}</p>`).join("")}</details>` : ""}</div>`}
      <div class="setup-status" role="status" aria-live="polite" tabindex="-1">${esc(statusText)}${statusText.includes("적용했습니다") ? ' <a class="button primary" href="/site" target="_blank" rel="noopener">내 웹사이트 열기 ↗</a> <a class="button secondary" href="/#website">원장실에서 관리하기</a>' : ""}</div></section>
      <section class="studio-included"><span class="eyebrow">CONNECTED TO YOUR OFFICE</span><h2>웹사이트를 함께 운영할 두 직원.</h2><div class="free-staff-grid">${FREE_STAFF.map((w) => `<article><span class="free-staff-symbol">${icon(w.id === "booking" ? "calendar" : "spark")}</span><div><h3>${w.name}</h3><p>${w.description}</p><span class="badge green">무료 제공</span></div></article>`).join("")}</div></section><footer class="app-footer"><span>원장실 · 웹사이트에서 시작하는 학원 운영</span><a href="/#website">상담·문의와 승인한 소식 관리 →</a></footer></main>`;
    app.querySelectorAll("[data-method]").forEach(
      (b) =>
        (b.onclick = () => {
          if (pending) return;
          remember();
          tab = b.dataset.method;
          render();
        }),
    );
    app.querySelectorAll("[data-width]").forEach(
      (b) =>
        (b.onclick = () => {
          width = b.dataset.width;
          app.querySelector(".studio-preview-stage").className =
            `studio-preview-stage ${width}`;
          app
            .querySelectorAll("[data-width]")
            .forEach((x) =>
              x.setAttribute("aria-pressed", x.dataset.width === width),
            );
        }),
    );
    app.querySelectorAll("[data-select-template]").forEach(
      (b) =>
        (b.onclick = () => {
          if (pending) return;
          selected = templateById(b.dataset.selectTemplate);
          app.querySelectorAll("[data-select-template]").forEach((x) => {
            const active = x.dataset.selectTemplate === selected.id;
            x.setAttribute("aria-pressed", active);
            x.closest(".design-card").classList.toggle("selected", active);
          });
          app.querySelector("#selectedDesign").textContent =
            `${selected.name} 디자인`;
          updatePreview();
        }),
    );
    app.querySelectorAll('[name="video"]').forEach(
      (r) =>
        (r.onchange = () => {
          video = r.value;
          updatePreview();
        }),
    );
    const rotation = app.querySelector('[name="rotate"]');
    if (rotation)
      rotation.onchange = () => {
        rotate = rotation.checked;
      };
    const random = app.querySelector("#randomVideo");
    if (random)
      random.onclick = () => {
        video = video === "v1" ? "v2" : "v1";
        app.querySelector(`[name="video"][value="${video}"]`).checked = true;
        updatePreview();
      };
    app.querySelector("#copySite").onclick = async () => {
      try {
        await navigator.clipboard.writeText(`${location.origin}/site`);
        app.querySelector(".setup-status").textContent =
          "웹사이트 주소를 복사했습니다.";
      } catch {
        app.querySelector(".setup-status").textContent =
          `웹사이트 주소: ${location.origin}/site`;
      }
    };
    const setup = app.querySelector("#siteSetupForm");
    if (setup)
      setup.onsubmit = (e) => {
        e.preventDefault();
        run(async () => {
          const state = await ownerState();
          await api.command(
            "website.configure",
            {
              name: values.name,
              phone: values.phone,
              address: values.address,
              templateId: selected.id,
              video,
              rotate,
            },
            state.revision,
          );
          statusText = "선택한 디자인과 영상을 웹사이트에 적용했습니다.";
        });
      };
    const source = app.querySelector("#customSourceForm");
    if (source)
      source.onsubmit = (e) => {
        e.preventDefault();
        run(async () => {
          const state = await ownerState();
          const result = await api.command(
            "website.custom.prepare",
            { sourceUrl: values.sourceUrl, notes: values.notes, files },
            state.revision,
          );
          requests = (await api.getState()).websiteRequests;
          draft = requests.find((r) => r.id === result.requestId);
          statusText = result.message;
        });
      };
    const read = app.querySelector("#readSource");
    if (read)
      read.onclick = () =>
        run(async () => {
          await ownerState();
          const source = await api.request("/api/website/source", {
            method: "POST",
            body: JSON.stringify({ url: values.sourceUrl }),
          });
          values.notes = [values.notes, source.text]
            .filter(Boolean)
            .join("\n\n")
            .slice(0, 12000);
          statusText =
            "링크의 본문을 가져왔습니다. 필요한 소개·수업 안내만 남긴 뒤 초안을 만들어 주세요.";
        });
    const input = app.querySelector("#sourceFiles");
    if (input)
      input.onchange = async () => {
        const picked = [...input.files];
        await run(async () => {
          if (picked.length + files.length > 5)
            throw Error("자료는 최대 5개까지 추가해 주세요.");
          if (
            picked.some(
              (f) => f.size > 50000 || !/\.(txt|md|csv)$/i.test(f.name),
            )
          )
            throw Error("50KB 이하의 TXT·MD·CSV 자료를 선택해 주세요.");
          const text = (await Promise.all(picked.map((f) => f.text()))).join(
            "\n\n",
          );
          const combined = [values.notes, text].filter(Boolean).join("\n\n");
          if (combined.length > 12000)
            throw Error(
              "자료가 12,000자를 넘습니다. 필요한 부분만 복사해 넣어 주세요.",
            );
          values.notes = combined;
          files.push(...picked.map((f) => f.name));
          statusText = "문서 내용을 자료에 추가했습니다.";
        });
      };
    const review = app.querySelector("#customReviewForm");
    if (review)
      review.onsubmit = (e) => {
        e.preventDefault();
        run(async () => {
          const state = await ownerState();
          await api.command(
            "website.custom.apply",
            { id: draft.id, profile: draft.profile },
            state.revision,
          );
          requests = (await api.getState()).websiteRequests;
          draft = null;
          statusText = "확인한 내용을 웹사이트에 적용했습니다.";
        });
      };
    const reject = app.querySelector("#rejectDraft");
    if (reject)
      reject.onclick = () =>
        run(async () => {
          const state = await ownerState();
          await api.command(
            "website.custom.reject",
            { id: draft.id },
            state.revision,
          );
          requests = (await api.getState()).websiteRequests;
          draft = null;
          statusText = "초안을 보류했습니다.";
        });
    if (pending)
      app.querySelectorAll("input,textarea,button").forEach((el) => {
        el.disabled = true;
      });
  }
  render();
}
