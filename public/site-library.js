const video = document.querySelector(".ac-film video");
const toggle = document.querySelector(".ac-film-toggle");
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
if (video && toggle) {
  const update = () => {
    toggle.textContent = video.paused ? "영상 재생" : "영상 멈춤";
  };
  video.addEventListener("play", update);
  video.addEventListener("pause", update);
  toggle.onclick = () => {
    if (video.paused) video.play().catch(update);
    else video.pause();
  };
  if (!reduced.matches && !new URLSearchParams(location.search).has("still"))
    video.play().catch(update);
  reduced.addEventListener("change", () => {
    if (reduced.matches) video.pause();
  });
}
const form = document.querySelector("#siteInquiry");
const receipts = new Map();
if (form)
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (document.body.dataset.preview === "true") return;
    const button = form.querySelector("button");
    if (button.disabled) return;
    button.disabled = true;
    const status = document.querySelector("#inquiryStatus");
    const question = form.querySelector("textarea").value;
    const id = receipts.get(question) || crypto.randomUUID();
    receipts.set(question, id);
    try {
      const response = await fetch("/api/public/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type: "inquiry", payload: { question } }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "접수하지 못했습니다.");
      status.textContent =
        "문의를 접수했습니다. 확인번호를 보관해 주세요: " +
        result.conversationToken;
      try {
        sessionStorage.setItem(
          "academy-confirmation",
          result.conversationToken,
        );
      } catch {}
      const link = document.createElement("a");
      link.href = "/?portal=1#confirmation";
      link.textContent = " 답변 확인하기 →";
      status.append(link);
      form.querySelector("textarea").value = "";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  };
