import * as api from "./api.js";
import { esc } from "./ui.js";
import { brand, workspaceNav } from "./brand.js";
import "./agents.css";

const labels = {
  draft: "입력 초안",
  queued: "실행 예약",
  running: "AI 실행 중",
  review: "결과 검토 대기",
  approved: "승인 완료 · 미발송",
  rejected: "보류",
  failed: "실행 실패",
  blocked: "엔진 보류",
  stale: "자료 재확인 필요",
  cancelled: "취소",
};
const date = (v) => new Date(v).toLocaleString("ko-KR");
function readable(value, depth = 0) {
  if (depth > 8) return "";
  if (typeof value === "string") {
    if (/<\/?(?:html|body|div|p|h[1-6]|table|br)\b/i.test(value)) {
      return value
        .replace(/<(script|style|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
        .replace(/<\/?(?:p|div|h[1-6]|tr|li|br)\b[^>]*>/gi, "\n")
        .replace(/<[^>]*>/g, " ")
        .replace(
          /&(?:amp|lt|gt|quot|nbsp);/g,
          (x) =>
            ({
              "&amp;": "&",
              "&lt;": "<",
              "&gt;": ">",
              "&quot;": '"',
              "&nbsp;": " ",
            })[x],
        );
    }
    return value;
  }
  if (Array.isArray(value))
    return value.map((v) => readable(v, depth + 1)).join("\n\n");
  if (value && typeof value === "object")
    return Object.entries(value)
      .map(([k, v]) => `${k}\n${readable(v, depth + 1)}`)
      .join("\n\n");
  return String(value ?? "");
}
function field(f) {
  const required = f.required ? "required" : "";
  const id = "af-" + f.key.replaceAll(".", "-");
  const common = `id="${id}" name="${esc(f.key)}" ${required}`;
  let input;
  if (f.type === "select")
    input = `<select ${common}><option value="">선택</option>${f.options.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join("")}</select>`;
  else if (["textarea", "list", "taglist", "multiselect"].includes(f.type))
    input = `<textarea ${common} rows="3" maxlength="6000" placeholder="${esc(f.placeholder || f.options?.join(", ") || "")}"></textarea>`;
  else
    input = `<input ${common} type="${f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "photo" ? "url" : "text"}" ${f.type === "number" ? 'min="0" step="any"' : 'maxlength="6000"'} placeholder="${esc(f.placeholder || "")}">`;
  return `<label class="field" for="${id}"><span>${esc(f.label)}${f.required ? " *" : ""}</span>${input}${f.subKeys ? `<small>한 줄에 ${esc(f.subKeys.join(" | "))} 순서로 입력합니다.</small>` : f.type === "multiselect" ? `<small>쉼표로 구분: ${esc(f.options?.join(", ") || "")}</small>` : ""}</label>`;
}

export async function startAgents() {
  document.title = "AI 직원 업무실 · 배움결";
  document.body.classList.add("agent-page");
  const app = document.querySelector("#app");
  let auth = await api.session();
  if (!auth.actor && auth.demo) auth = await api.login("owner");
  if (!auth.actor || auth.actor.role !== "owner") {
    app.innerHTML = `<main class="agent-workspace"><h1>원장 로그인이 필요합니다.</h1><p>학생 자료와 AI 실행 결과는 원장만 확인할 수 있습니다.</p><a class="button primary" href="/">원장실 로그인 →</a></main>`;
    return;
  }
  let state = await api.request("/api/agent-workspace");
  let selected = state.catalog.find((a) => a.priority),
    filter = "핵심 9종",
    dirty = false,
    revision = state.revision,
    requestKey = crypto.randomUUID(),
    saving = false;
  const reviewDrafts = new Map();
  app.innerHTML = `<main class="agent-workspace" id="main"><header class="agent-header"><a href="/#today">${brand("AI 직원 업무실")}</a>${workspaceNav("agents")}</header><section class="page-heading"><span class="eyebrow">AGENT1000 · CONNECTED WORKSPACE</span><h1>우리 학원의 AI 업무실.</h1><p>학원 기록으로 일을 준비하고, AI 결과를 확인한 뒤 승인하세요.</p></section><div id="agentConnection"></div><div class="agent-layout"><section class="panel"><div class="panel-body"><h2>업무 선택</h2><label class="field">직원 찾기<input id="agentSearch" type="search" placeholder="직원 이름 또는 코드"></label><label class="field">분류<select id="agentFilter">${["핵심 9종", "학원 특화", "공통 업무", "추가 검토", "전체"].map((v) => `<option>${v}</option>`).join("")}</select></label><div id="agentCatalog" class="agent-catalog"></div></div></section><section class="panel"><div class="panel-body" id="agentEditor"></div></section></div><section class="panel spaced"><div class="panel-body"><div class="entry-head"><h2>작업과 결과</h2><button class="button secondary" id="refreshAgents">새로고침 ↻</button></div><p class="small muted">승인은 결과를 확정해 보관하는 단계입니다. 문자·알림톡·외부 게시가 자동으로 실행되지는 않습니다. 예약 실행은 이 서버가 계속 켜져 있어야 합니다.</p><p id="agentMessage" role="status" aria-live="polite"></p><div id="agentHistory"></div></div></section></main>`;
  const message = (text, error = false) => {
    const p = app.querySelector("#agentMessage");
    p.textContent = text;
    p.className = error ? "error-note" : "form-note";
  };
  function connection() {
    app.querySelector("#agentConnection").innerHTML =
      `<div class="local-banner"><div><strong>${state.connection.ready ? "전용 AI 엔진 연결 설정됨 · 실제 응답 검증 필요" : "연결 설정 필요 · 입력 초안 준비 가능"}</strong><p>${esc(state.connection.issues.join(" · ") || "실행 결과는 원장 검토 전까지 초안으로 보관됩니다.")}</p><small>${esc(state.connection.storage)} · 월 실행 한도 ${state.monthlyLimit}회 · ${esc(state.connection.delivery)}</small></div></div>`;
  }
  function catalog() {
    const search = app.querySelector("#agentSearch").value.trim().toLowerCase();
    app.querySelector("#agentCatalog").innerHTML =
      state.catalog
        .filter(
          (a) =>
            (filter === "전체" ||
              (filter === "핵심 9종" && a.priority) ||
              a.group === filter) &&
            `${a.name} ${a.code}`.toLowerCase().includes(search),
        )
        .map(
          (a) =>
            `<button class="button ${a.code === selected.code ? "primary" : "secondary"}" data-agent-code="${a.code}" aria-pressed="${a.code === selected.code}"><span>${esc(a.name)}<small>${esc(a.code)} · ${a.available ? "연결 대상" : "학원용 검증 필요"}</small></span></button>`,
        )
        .join("") || "<p>검색 결과가 없습니다.</p>";
  }
  function editor() {
    dirty = false;
    requestKey = crypto.randomUUID();
    revision = state.revision;
    app.querySelector("#agentEditor").innerHTML =
      `<span class="eyebrow">${esc(selected.code)}</span><h2>${esc(selected.name)}</h2><p>${esc(selected.description || "")}</p>${selected.available ? `<form id="agentInput" class="form-stack"><label class="field">자료를 가져올 학생<select id="agentStudent"><option value="">학원 공통 업무 · 학생 선택 안 함</option>${state.students.map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join("")}</select></label><button class="button secondary" type="button" id="agentPrefill">학원 기록으로 입력 준비 ↓</button><p class="small muted">기록 가져오기를 누르면 입력칸을 채웁니다. 학생 이름은 별칭으로 준비하며, 비공개 교사 메모는 가져오지 않습니다. 전송할 내용을 확인하세요.</p>${selected.fields.map(field).join("")}<label class="field">실행 예약 시간 (선택)<input id="agentDue" type="datetime-local"><small>비워 두면 실행 요청 시 바로 시작합니다. 최대 30일 이내.</small></label><label class="check"><input id="agentConfirm" type="checkbox" required><span>전송할 자료와 이미지 이용 권한을 확인했습니다. 불필요한 개인정보를 제외했습니다.</span></label><p id="agentFormError" role="alert"></p><button class="button primary" type="submit">입력 초안 저장 →</button><p class="small muted">저장만으로 AI 호출 비용이 발생하지 않습니다. 아래 작업 목록에서 실제 실행을 요청하세요.</p></form>` : `<div class="form-note">${esc(selected.code === "CORE-TREND" ? "네일 전용 정의로, 학원 업무에는 포함하지 않습니다." : "플랫폼 내 실행 자산은 확인했습니다. 학원 자료·출력 규격 검증 후 연결합니다.")}</div>`}`;
  }
  function history() {
    if (document.activeElement?.matches("[data-review-id]")) return;
    app.querySelector("#agentHistory").innerHTML = state.runs.length
      ? state.runs
          .map(
            (r) =>
              `<article class="agent-run entry"><div class="entry-head"><h3>${esc(r.name)}</h3><span class="badge">${esc(labels[r.status] || r.status)}</span></div><p class="small muted">${esc(date(r.createdAt))} · 자료 버전 ${r.sourceRevision}${r.status === "queued" ? ` · 실행 예정 ${esc(date(r.dueAt))}` : ""}</p>${r.error ? `<p class="error-note">${esc(r.error)}</p>` : ""}${r.warnings?.length ? `<p class="form-note">${esc(r.warnings.join(" · "))}</p>` : ""}<details><summary>전송 입력 확인</summary><pre>${esc(JSON.stringify({ input: r.input, schoolContext: r.context }, null, 2))}</pre></details>${r.status === "review" ? `<label class="field">?????? ??<textarea data-review-id="${r.id}" rows="8" maxlength="100000">${esc(reviewDrafts.get(r.id) ?? readable(r.output))}</textarea></label>` : ""}${r.approvedText ? `<h4>?? ???</h4><pre>${esc(r.approvedText)}</pre>` : ""}${r.output ? `<details><summary>AI 실행 결과 · ${esc(r.engine || "")}</summary><pre class="agent-output">${esc(readable(r.output))}</pre></details>` : ""}<div class="entry-actions">${r.status === "draft" ? `<button class="button primary" data-agent-action="queue" data-run-id="${r.id}" ${state.connection.ready ? "" : "disabled"}>${new Date(r.dueAt) > new Date() ? "예약 실행 등록" : "AI 실행 요청 →"}</button>` : ""}${["draft", "queued"].includes(r.status) ? `<button class="button secondary" data-agent-action="cancel" data-run-id="${r.id}">취소</button>` : ""}${r.status === "review" ? `<button class="button primary" data-agent-action="approve" data-run-id="${r.id}">검토 완료 · 승인</button><button class="button secondary" data-agent-action="reject" data-run-id="${r.id}">보류</button>` : ""}${r.status === "approved" ? `<button class="button secondary" data-agent-action="download" data-run-id="${r.id}">승인 결과 내려받기 ↓</button>` : ""}${["failed", "blocked", "stale", "rejected"].includes(r.status) ? `<button class="button secondary" data-agent-action="reuse" data-run-id="${r.id}">입력 다시 준비</button>` : ""}</div></article>`,
          )
          .join("")
      : "<p>아직 저장한 작업이 없습니다. 위에서 직원을 선택해 입력 초안을 준비하세요.</p>";
  }
  async function refresh() {
    state = await api.request("/api/agent-workspace");
    connection();
    history();
  }
  connection();
  catalog();
  editor();
  history();
  app.querySelector("#agentFilter").onchange = (e) => {
    filter = e.target.value;
    catalog();
  };
  app.querySelector("#agentSearch").oninput = catalog;
  app.querySelector("#refreshAgents").onclick = () =>
    refresh().catch((e) => message(e.message, true));
  app.addEventListener("input", (e) => {
    if (e.target.dataset.reviewId)
      reviewDrafts.set(e.target.dataset.reviewId, e.target.value);
    if (e.target.closest("#agentInput")) {
      dirty = true;
      requestKey = crypto.randomUUID();
    }
  });
  app.addEventListener("submit", async (e) => {
    if (e.target.id !== "agentInput") return;
    e.preventDefault();
    if (saving) return;
    saving = true;
    const form = e.target,
      button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      const input = Object.fromEntries(new FormData(form));
      const localDue = app.querySelector("#agentDue").value;
      await api.request("/api/agent-workspace/runs", {
        method: "POST",
        body: JSON.stringify({
          key: requestKey,
          code: selected.code,
          input,
          studentId: app.querySelector("#agentStudent").value || null,
          revision,
          confirm: app.querySelector("#agentConfirm").checked,
          dueAt: localDue ? new Date(localDue).toISOString() : null,
        }),
      });
      dirty = false;
      await refresh();
      message(
        "입력 초안을 저장했습니다. 작업 목록에서 실행 상태를 확인하세요.",
      );
      app.querySelector("#agentHistory").scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      app.querySelector("#agentFormError").textContent = error.message;
    } finally {
      saving = false;
      button.disabled = false;
    }
  });
  app.addEventListener("click", async (e) => {
    if (saving) return;
    const code = e.target.closest("[data-agent-code]");
    if (code) {
      if (dirty && !confirm("입력 중인 내용을 닫고 다른 직원을 선택할까요?"))
        return;
      selected = state.catalog.find((a) => a.code === code.dataset.agentCode);
      catalog();
      editor();
      return;
    }
    const fill = e.target.closest("#agentPrefill");
    if (fill) {
      if (dirty && !confirm("작성한 입력칸을 학원 기록으로 채울까요?")) return;
      fill.disabled = true;
      try {
        const result = await api.request(
          "/api/agent-workspace/prefill?studentId=" +
            encodeURIComponent(app.querySelector("#agentStudent").value),
        );
        revision = result.revision;
        const form = app.querySelector("#agentInput");
        for (const [k, v] of Object.entries(result.values)) {
          if (form.elements.namedItem(k))
            form.elements.namedItem(k).value = v ?? "";
        }
        dirty = true;
        requestKey = crypto.randomUUID();
      } catch (error) {
        app.querySelector("#agentFormError").textContent = error.message;
      } finally {
        fill.disabled = false;
      }
      return;
    }
    const b = e.target.closest("[data-agent-action]");
    if (!b) return;
    const action = b.dataset.agentAction,
      id = b.dataset.runId,
      r = state.runs.find((r) => r.id === id);
    if (action === "reuse") {
      if (dirty && !confirm("현재 입력을 닫고 이전 작업을 불러올까요?")) return;
      selected = state.catalog.find((a) => a.code === r.code);
      catalog();
      editor();
      app.querySelector("#agentStudent").value = r.studentId || "";
      for (const f of selected.fields) {
        let v = f.key.split(".").reduce((o, k) => o?.[k], r.input);
        if (Array.isArray(v))
          v =
            f.type === "list"
              ? v
                  .map((row) => f.subKeys.map((k) => row[k] ?? "").join(" | "))
                  .join("\n")
              : v.join(", ");
        if (v !== undefined)
          app.querySelector("#agentInput").elements.namedItem(f.key).value = v;
      }
      dirty = true;
      app.querySelector("#agentEditor").scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (action === "download") {
      const blob = new Blob(
        [
          `${r.name}\n승인: ${date(r.reviewedAt)}\n외부 발송 전 확인용\n\n${r.approvedText || readable(r.output)}`,
        ],
        { type: "text/plain;charset=utf-8" },
      );
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `baewoom-${r.code}-${r.id.slice(0, 8)}.txt`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      return;
    }
    b.disabled = true;
    try {
      await api.request("/api/agent-workspace/action", {
        method: "POST",
        body: JSON.stringify({
          id,
          action,
          text:
            action === "approve"
              ? app.querySelector(`[data-review-id="${id}"]`).value
              : undefined,
        }),
      });
      await refresh();
      message(
        action === "approve"
          ? "검토 결과를 승인했습니다. 외부로 발송되지는 않았습니다."
          : "작업 상태를 반영했습니다.",
      );
    } catch (error) {
      message(error.message, true);
      b.disabled = false;
    }
  });
  setInterval(() => {
    if (
      document.visibilityState === "visible" &&
      state.runs.some((r) => ["queued", "running"].includes(r.status))
    )
      refresh().catch((e) => message(e.message, true));
  }, 4000);
  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
}
