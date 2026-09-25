import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync, backup } from "node:sqlite";
import { Store } from "../server/store.js";
import { ACTORS } from "../server/seed.js";

test("committed payment survives close, restart and SQLite backup restore", async () => {
  const dir = mkdtempSync(resolve(tmpdir(), "academy-os-persistence-"));
  const path = resolve(dir, "source.sqlite"),
    copyPath = resolve(dir, "restored.sqlite");
  let store = new Store(path);
  store.command(ACTORS[0], {
    id: randomUUID(),
    type: "payment.add",
    payload: {
      invoiceId: "INV3",
      amount: 100000,
      reference: "restore-verification",
    },
    revision: store.load().revision,
  });
  const expected = store.load();
  await backup(store.db, copyPath);
  store.close();
  store = new Store(path);
  try {
    assert.deepEqual(store.load(), expected);
  } finally {
    store.close();
  }
  const copy = new DatabaseSync(copyPath, { readOnly: true });
  try {
    assert.equal(
      copy.prepare("PRAGMA integrity_check").get().integrity_check,
      "ok",
    );
  } finally {
    copy.close();
  }
  const restored = new Store(copyPath);
  try {
    assert.deepEqual(restored.load(), expected);
  } finally {
    restored.close();
  }
});

test("two database connections cannot silently overwrite a prior commit", () => {
  const path = resolve(
    mkdtempSync(resolve(tmpdir(), "academy-os-concurrency-")),
    "shared.sqlite",
  );
  const first = new Store(path),
    second = new Store(path);
  try {
    const oldRevision = second.load().revision;
    first.command(ACTORS[0], {
      id: randomUUID(),
      type: "payment.add",
      payload: {
        invoiceId: "INV3",
        amount: 100000,
        reference: "first-connection",
      },
      revision: oldRevision,
    });
    assert.throws(
      () =>
        second.command(ACTORS[0], {
          id: randomUUID(),
          type: "payment.add",
          payload: {
            invoiceId: "INV3",
            amount: 50000,
            reference: "second-connection",
          },
          revision: oldRevision,
        }),
      /다른 화면/,
    );
    assert.equal(
      second.load().payments.filter((p) => p.reference === "first-connection")
        .length,
      1,
    );
  } finally {
    first.close();
    second.close();
  }
});
