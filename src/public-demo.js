const notice = document.querySelector("#publicDemoNotice");

if (notice && window.location.hostname.endsWith(".vercel.app")) {
  notice.hidden = false;
  document.documentElement.classList.add("has-public-demo-notice");
}
