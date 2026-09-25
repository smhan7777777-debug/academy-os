import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Store } from "../server/store.js";
import { ACTORS } from "../server/seed.js";
import { publicState, slots } from "../server/domain.js";
import { TEMPLATES } from "../shared/templates.js";
import { WEBSITE_DEFAULTS } from "../shared/website.js";
import { renderLibrarySite } from "../server/website-pages.js";
import { LIBRARY_TEMPLATES, siteDesign } from "../shared/templates.js";
import {
  publicAddress,
  sourceUrl,
  sourceText,
} from "../server/website-source.js";
const owner = ACTORS[0],
  teacher = ACTORS[1];
const cmd = (db, type, payload, actor = owner) =>
  db.command(actor, {
    id: randomUUID(),
    revision: db.load().revision,
    type,
    payload,
  });
function setup(t) {
  const db = new Store(":memory:");
  t.after(() => db.close());
  return db;
}

test("custom website drafts persist, remain private, and publish only owner-reviewed edits", (t) => {
  const db = setup(t);
  const before = publicState(db.load());
  const prepared = cmd(db, "website.custom.prepare", {
    notes: "매 수업마다 풀이 과정을 함께 확인합니다.",
    sourceUrl: "https://example.org/academy",
    files: ["intro.txt"],
  });
  const draft = db
    .load()
    .websiteRequests.find((r) => r.id === prepared.requestId);
  assert.equal(draft.status, "review");
  assert.deepEqual(draft.files, ["intro.txt"]);
  assert.deepEqual(publicState(db.load()), before);
  assert.throws(
    () =>
      cmd(
        db,
        "website.custom.apply",
        { id: draft.id, profile: draft.profile },
        teacher,
      ),
    /원장 권한/,
  );
  const edited = { ...draft.profile, headline: "생각을 함께 나누는 수업" };
  cmd(db, "website.custom.apply", { id: draft.id, profile: edited });
  assert.equal(
    publicState(db.load()).settings.websiteProfile.headline,
    edited.headline,
  );
  assert.equal(db.load().websiteRequests[0].approvedBy, owner.id);
  assert.throws(
    () => cmd(db, "website.custom.apply", { id: draft.id, profile: edited }),
    /이미 처리/,
  );
});

test("custom drafts cannot overwrite subsequent website changes or publish rejected/private content", (t) => {
  const db = setup(t);
  const prepared = cmd(db, "website.custom.prepare", {
    notes: "수업마다 필요한 준비물을 안내합니다.",
  });
  const draft = db.load().websiteRequests[0];
  cmd(db, "website.configure", { templateId: TEMPLATES[0].id, video: "v2" });
  assert.throws(
    () =>
      cmd(db, "website.custom.apply", {
        id: prepared.requestId,
        profile: draft.profile,
      }),
    /변경되었습니다/,
  );
  const next = cmd(db, "website.custom.prepare", {
    notes: "상담은 예약 후 진행합니다.",
  });
  cmd(db, "website.custom.reject", { id: next.requestId });
  assert.throws(
    () =>
      cmd(db, "website.custom.apply", {
        id: next.requestId,
        profile: draft.profile,
      }),
    /이미 처리/,
  );
  assert.throws(
    () =>
      cmd(db, "website.custom.prepare", { notes: "이서준 학생의 학습 이야기" }),
    /학생 이름/,
  );
  assert.equal(publicState(db.load()).websiteRequests, undefined);
});

test("library pages bind public records, escape copy and preserve preview navigation", async (t) => {
  const db = setup(t);
  const site = publicState(db.load());
  site.settings.name = "<script>alert(1)</script>";
  for (const template of LIBRARY_TEMPLATES) {
    const url = new URL(
      `http://localhost/site/classes?preview=1&template=${template.id}&video=v2`,
    );
    const page = await renderLibrarySite(site, url);
    assert.equal(page.status, 200);
    assert.ok(page.html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
    assert.ok(page.html.includes(site.classes[0].name));
    assert.ok(
      page.html.includes(`/site/about?preview=1&template=${template.id}`),
    );
    assert.ok(!page.html.includes("2027년 2월 1일"));
    const preview = await renderLibrarySite(
      site,
      new URL(
        `http://localhost/site/contact?preview=1&template=${template.id}`,
      ),
    );
    assert.match(preview.html, /type="submit" disabled/);
  }
});

test("video rotation does not alter the saved choice", () => {
  const settings = {
    websiteDesign: { templateId: TEMPLATES[0].id, video: "v2", rotate: true },
  };
  assert.equal(siteDesign(settings, new Date("2026-09-24Z")).video, "v2");
  assert.notEqual(
    siteDesign(settings, new Date("2026-09-24Z")).displayedVideo,
    siteDesign(settings, new Date("2026-09-25Z")).displayedVideo,
  );
});

test("source import blocks local networks and strips executable markup from source text", () => {
  for (const url of [
    "http://example.com",
    "https://127.0.0.1",
    "https://2130706433",
    "https://[::1]",
    "https://name:pass@example.com",
    "https://example.com:444",
    "https://foo.local",
  ])
    assert.throws(() => sourceUrl(url));
  for (const ip of [
    "127.0.0.1",
    "10.1.1.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.1.1",
    "100.64.0.1",
    "::1",
  ])
    assert.equal(publicAddress(ip), false);
  assert.equal(publicAddress("8.8.8.8"), true);
  assert.equal(
    sourceText(
      "<script>danger()</script><style>hide</style><nav>menu</nav><main>학원 소개 &amp; 수업</main>",
    ),
    "학원 소개 & 수업",
  );
});

test("all six original design IDs persist without replacing school records or publishing drafts", (t) => {
  const db = setup(t);
  const before = db.load();
  const prepared = cmd(db, "content.generate", {
    topic: "다음 수업 준비",
    facts: "준비물은 필기구입니다.",
  });
  for (const template of TEMPLATES) {
    cmd(db, "website.configure", { templateId: template.id, video: "v2" });
    const s = db.load(),
      site = publicState(s);
    assert.equal(site.settings.websiteDesign.templateId, template.id);
    assert.equal(site.settings.websiteDesign.video, "v2");
    assert.equal(site.site.academyId, s.academyId);
    assert.deepEqual(s.students, before.students);
    assert.deepEqual(s.bookings, before.bookings);
    assert.equal(s.docs.find((d) => d.id === prepared.docId).status, "review");
    assert.deepEqual(
      site.freeStaff.map((w) => w.code),
      ["CORE-01", "CORE-08"],
    );
  }
  assert.throws(() =>
    cmd(db, "website.configure", { templateId: "../../evil", video: "v1" }),
  );
  assert.throws(() =>
    cmd(db, "website.configure", {
      templateId: TEMPLATES[0].id,
      video: "https://evil.test/a.mp4",
    }),
  );
  assert.throws(
    () =>
      cmd(
        db,
        "website.configure",
        { templateId: TEMPLATES[0].id, video: "v1" },
        teacher,
      ),
    /원장 권한/,
  );
});

test("changing template invalidates queued website updates without erasing accepted public content", (t) => {
  const db = setup(t);
  const d = cmd(db, "website.prepare", {
    ...WEBSITE_DEFAULTS,
    headline: "이전 디자인 변경안",
  });
  cmd(db, "doc.approve", { id: d.docId });
  cmd(db, "website.configure", { templateId: TEMPLATES[1].id, video: "v1" });
  db.tick();
  assert.equal(
    publicState(db.load()).settings.websiteProfile.headline,
    WEBSITE_DEFAULTS.headline,
  );
  assert.equal(
    publicState(db.load()).settings.websiteDesign.templateId,
    TEMPLATES[1].id,
  );
});

test("CORE-01 switch controls booking and knowledge answering as one free employee", (t) => {
  const db = setup(t);
  cmd(db, "worker.toggle", { id: "booking", enabled: false });
  assert.ok(
    db
      .load()
      .workers.filter((w) => ["booking", "inquiry"].includes(w.id))
      .every((w) => !w.enabled),
  );
  const slot = slots(db.load(), "A")[0];
  assert.throws(() =>
    db.command(
      null,
      {
        id: randomUUID(),
        type: "booking",
        payload: {
          ...slot,
          classId: "A",
          name: "새 상담",
          phone: "01012345678",
        },
      },
      true,
    ),
  );
  cmd(db, "worker.toggle", { id: "booking", enabled: true });
  assert.ok(
    db
      .load()
      .workers.filter((w) => ["booking", "inquiry"].includes(w.id))
      .every((w) => w.enabled),
  );
});

test("content employee retains source, requires review, and publishes only the edited approval", (t) => {
  const db = setup(t);
  const count = publicState(db.load()).posts.length;
  const d = cmd(db, "content.generate", {
    topic: "수업 준비물 안내",
    facts: "다음 수업에는 필기구를 준비해 주세요.",
    audience: "학부모",
  });
  assert.equal(publicState(db.load()).posts.length, count);
  const draft = db.load().docs.find((x) => x.id === d.docId);
  assert.equal(draft.generator, "local-composer");
  assert.equal(
    draft.sourceBrief.facts,
    "다음 수업에는 필기구를 준비해 주세요.",
  );
  cmd(db, "doc.edit", {
    id: d.docId,
    body: "검토를 마친 수업 준비물 안내입니다.",
  });
  cmd(db, "doc.approve", { id: d.docId });
  db.tick();
  assert.ok(
    publicState(db.load()).posts.some(
      (p) => p.body === "검토를 마친 수업 준비물 안내입니다.",
    ),
  );
  assert.throws(
    () =>
      cmd(db, "content.generate", {
        topic: "학생 소식",
        facts: "이서준 학생 이야기",
      }),
    /학생 이름/,
  );
  cmd(db, "worker.toggle", { id: "content", enabled: false });
  assert.throws(() =>
    cmd(db, "content.generate", { topic: "안내", facts: "준비물 안내" }),
  );
});
