export const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const paths = {
  home: "M3 10 12 3l9 7M5 9v11h5v-6h4v6h5V9",
  inbox: "M4 4h16l2 12v4H2v-4L4 4zm-2 12h6l2 3h4l2-3h6",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m8-7a4 4 0 0 1 0 8m5 9v-2a4 4 0 0 0-3-3.87",
  book: "M4 3h6a3 3 0 0 1 3 3v15a4 4 0 0 0-4-2H3V3h1zm9 3a3 3 0 0 1 3-3h5v16h-5a4 4 0 0 0-3 2",
  file: "M14 2H5v20h14V7l-5-5zm0 0v5h5M8 12h8M8 16h6",
  calendar:
    "M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2zm2-2v5m10-5v5M3 10h18M7 14h2m6 0h2m-10 4h2",
  wallet: "M3 6h17v15H3V6zm0 0V3h15v3m-3 7h6v5h-6v-5z",
  globe:
    "M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18",
  leaf: "M20 3c-9-1-17 3-17 10a7 7 0 0 0 7 7c7 0 10-8 10-17zM3 21 15 9",
  briefcase: "M3 7h18v14H3V7zm5 0V3h8v4M3 12h18m-10 0v3h2v-3",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3",
  spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3",
  check: "m5 12 4 4L19 6",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  chevron: "m9 5 7 7-7 7",
  down: "m6 9 6 6 6-6",
  search: "M21 21l-5-5m2-6a8 8 0 1 0-16 0 8 8 0 0 0 16 0",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 3h18c0-3-3-3-3-10m-8 14h4",
  plus: "M12 5v14M5 12h14",
  close: "m6 6 12 12M6 18 18 6",
  clock: "M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0m-9-5v5l3 2",
  heart:
    "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8",
  shield: "m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4m-4 10 3 3 5-5",
  chat: "M21 3H3v14h5v4l5-4h8V3M7 8h10M7 12h6",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  external: "M14 3h7v7m0-7L10 14M10 3H3v18h18v-7",
  menu: "M4 6h16M4 12h16M4 18h16",
  refresh: "M20 7V2l-3 3a8 8 0 1 0 3 9M20 7h-5",
  logout: "M9 3H3v18h6m5-16 7 7-7 7m-7-7h14",
  compass: "M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0m-13 4 2-6 6-2-2 6-6 2",
  sun: "M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2m-2 7a5 5 0 1 0-10 0 5 5 0 0 0 10 0",
  database:
    "M3 6c0-5 18-5 18 0s-18 5-18 0zm0 0v12c0 5 18 5 18 0V6M3 12c0 5 18 5 18 0",
  copy: "M8 8h13v13H8V8zm8-4V2H2v14h2",
  warning: "m12 3 10 18H2L12 3zm0 6v5m0 3v1",
};
export const icon = (name, cls = "") =>
  `<svg class="icon ${esc(cls)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.file}"/></svg>`;
export const btn = (label, action, extra = "", style = "secondary", ic = "") =>
  `<button type="button" class="button ${style}" data-action="${esc(action)}" ${extra}>${ic ? icon(ic) : ""}${esc(label)}</button>`;
export const empty = (title, description = "", ic = "inbox") =>
  `<div class="empty">${icon(ic)}<strong>${esc(title)}</strong><p>${esc(description)}</p></div>`;
export const badge = (text, tone = "neutral") =>
  `<span class="badge ${esc(tone)}">${esc(text)}</span>`;
export const field = (label, name, value = "", type = "text", attrs = "") =>
  `<label class="field"><span>${esc(label)}</span><input name="${esc(name)}" type="${type}" value="${esc(value)}" ${attrs}></label>`;
export const area = (label, name, value = "", attrs = "") =>
  `<label class="field"><span>${esc(label)}</span><textarea name="${esc(name)}" aria-label="${esc(label)}" ${attrs}>${esc(value)}</textarea></label>`;
export const select = (label, name, options, value = "", attrs = "") =>
  `<label class="field"><span>${esc(label)}</span><select name="${esc(name)}" ${attrs}>${options
    .map((o) => {
      const [v, t] = Array.isArray(o) ? o : [o, o];
      return `<option value="${esc(v)}" ${String(v) === String(value) ? "selected" : ""}>${esc(t)}</option>`;
    })
    .join("")}</select></label>`;
export const checkbox = (label, name, on = false, attrs = "") =>
  `<label class="check"><input type="checkbox" name="${esc(name)}" ${on ? "checked" : ""} ${attrs}><span>${esc(label)}</span></label>`;
export const heading = (eyebrow, title, description, actions = "") =>
  `<div class="page-heading"><div><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1>${description ? `<p>${esc(description)}</p>` : ""}</div><div class="heading-actions">${actions}</div></div>`;
export const panel = (title, subtitle, body, action = "", cls = "") =>
  `<section class="panel ${cls}"><div class="panel-heading"><div><h2>${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ""}</div>${action}</div>${body}</section>`;
export const initials = (name) => esc(name?.slice(0, 1) || "학");
export const dateTime = (v) =>
  v
    ? new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(v))
    : "아직 없음";
export function download(name, text, type = "text/plain;charset=utf-8") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export function formData(form) {
  return Object.fromEntries(new FormData(form));
}
