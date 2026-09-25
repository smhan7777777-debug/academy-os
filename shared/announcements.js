const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function announcementHtml(post, preview = false) {
  const tone = ["navy", "teal", "plum"].includes(post.tone)
    ? post.tone
    : "navy";
  const layout = post.layout === "bar" ? "bar" : "card";
  // Destinations are always internal, including when displaying older posts.
  const href = post.cta?.startsWith("/?portal=1")
    ? post.cta
    : post.cta === "/learn"
      ? "/learn"
      : "/?portal=1#booking";
  return `<aside class="school-announcement announcement-${layout} announcement-${tone}" aria-label="학원 모집 안내" data-announcement="${escape(post.id || "preview")}"><div class="announcement-top"><span>${preview ? "게시 전 미리보기" : "ACADEMY NEWS"}</span>${preview ? "" : '<button type="button" data-dismiss-announcement aria-label="안내 닫기">×</button>'}</div><h2>${escape(post.title)}</h2><p>${escape(post.body)}</p>${post.endsAt ? `<small>${escape(new Date(post.endsAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }))}까지 안내</small>` : ""}<a class="announcement-cta" href="${escape(href)}" ${preview ? 'tabindex="-1" aria-disabled="true"' : ""}>${post.cta === "/learn" ? "수업 체험 보기" : "상담 신청"} <span>→</span></a></aside>`;
}
