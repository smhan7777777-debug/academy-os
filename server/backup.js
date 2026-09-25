import { DatabaseSync, backup } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { dataDir as dir } from "./paths.js";
mkdirSync(resolve(dir, "backups"), { recursive: true });
const db = new DatabaseSync(resolve(dir, "academy.sqlite"), { readOnly: true });
const path = resolve(
  dir,
  "backups",
  `academy-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`,
);
await backup(db, path);
db.close();
const copy = new DatabaseSync(path, { readOnly: true });
try {
  const results = copy.prepare("PRAGMA integrity_check").all();
  if (results.length !== 1 || results[0].integrity_check !== "ok")
    throw new Error("Backup integrity check failed");
} finally {
  copy.close();
}
console.log("SQLite backup created and integrity checked: " + path);
