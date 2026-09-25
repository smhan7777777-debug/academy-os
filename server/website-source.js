import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";

export function publicAddress(address) {
  if (isIP(address) !== 4) return false;
  const [a, b] = address.split(".").map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && [0, 168].includes(b)) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && [18, 19, 51].includes(b)) ||
    (a === 203 && b === 0)
  );
}
export function sourceUrl(value) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    isIP(url.hostname) ||
    !url.hostname.includes(".") ||
    /\.(localhost|local|internal)$/i.test(url.hostname)
  )
    throw Error("공개된 https 웹사이트 주소를 입력해 주세요.");
  return url;
}
export function sourceText(html) {
  return html
    .replace(/<(script|style|nav|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 10000);
}
export async function readWebsiteSource(value) {
  const deadline = AbortSignal.timeout(12000);
  let url = sourceUrl(value);
  for (let attempt = 0; attempt < 4; attempt++) {
    const records = await Promise.race([
      lookup(url.hostname, { family: 4, all: true }),
      new Promise((_, reject) => {
        if (deadline.aborted) reject(Error("링크 응답 시간이 초과되었습니다."));
        else
          deadline.addEventListener(
            "abort",
            () => reject(Error("링크 응답 시간이 초과되었습니다.")),
            { once: true },
          );
      }),
    ]);
    if (!records.length || records.some((r) => !publicAddress(r.address)))
      throw Error("외부에 공개된 웹사이트만 가져올 수 있습니다.");
    // Pin the validated DNS address to the TLS request.
    const response = await new Promise((resolve, reject) => {
      const req = request(
        url,
        {
          signal: deadline,
          lookup: (_hostname, options, cb) =>
            options.all
              ? cb(null, [records[0]])
              : cb(null, records[0].address, 4),
          headers: {
            "User-Agent": "AcademyOS/1.0",
            Accept: "text/html,text/plain",
            "Accept-Encoding": "identity",
          },
        },
        (res) => {
          if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
            res.resume();
            resolve({ redirect: res.headers.location });
            return;
          }
          if (
            res.statusCode !== 200 ||
            !/^text\/(html|plain)/i.test(res.headers["content-type"] || "")
          ) {
            res.resume();
            reject(
              Error(
                "본문을 읽을 수 없는 링크입니다. 소개를 복사하거나 문서로 올려 주세요.",
              ),
            );
            return;
          }
          const chunks = [];
          let size = 0;
          res.on("data", (chunk) => {
            size += chunk.length;
            if (size > 1000000)
              req.destroy(
                Error("본문이 너무 큽니다. 필요한 소개를 직접 넣어 주세요."),
              );
            else chunks.push(chunk);
          });
          res.on("end", () =>
            resolve({ html: Buffer.concat(chunks).toString("utf8") }),
          );
          res.on("error", reject);
        },
      );
      req.on("error", reject);
      req.end();
    });
    if (response.redirect) {
      url = sourceUrl(new URL(response.redirect, url).href);
      continue;
    }
    const text = sourceText(response.html || "");
    if (text.length < 30)
      throw Error(
        "링크 본문이 없거나 접근이 제한되어 있습니다. 학원 소개를 직접 넣어 주세요.",
      );
    return { text, url: url.href };
  }
  throw Error(
    "이동이 너무 많은 링크입니다. 학원 페이지의 최종 주소를 입력해 주세요.",
  );
}
