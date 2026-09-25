import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

test("server and backup resolve storage after local environment loading; explicit environment wins", () => {
  const root = mkdtempSync(resolve(tmpdir(), "academy-paths-"));
  mkdirSync(resolve(root, "server"));
  copyFileSync("server/paths.js", resolve(root, "server/paths.mjs"));
  const configured = resolve(root, "configured data");
  writeFileSync(
    resolve(root, ".env"),
    `ACADEMY_DATA_DIR="${configured.replaceAll("\\", "/")}"\n`,
  );
  const env = { ...process.env };
  delete env.ACADEMY_DATA_DIR;
  const read = (custom) => {
    const result = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        "import {dataDir} from './server/paths.mjs'; console.log(dataDir);",
      ],
      { cwd: root, env: custom, encoding: "utf8", windowsHide: true },
    );
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  assert.equal(read(env), configured);
  const explicit = resolve(root, "explicit data");
  assert.equal(read({ ...env, ACADEMY_DATA_DIR: explicit }), explicit);
});
