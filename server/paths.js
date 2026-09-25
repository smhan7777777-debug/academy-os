import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { tmpdir } from "node:os";
export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Resolve server and backup storage from the same environment, before exports.
if (!process.env.VERCEL && existsSync(resolve(root, ".env")))
  loadEnvFile(resolve(root, ".env"));
// Keep live SQLite/WAL files out of a OneDrive-synced source checkout.
export const dataDir = resolve(
  process.env.ACADEMY_DATA_DIR ||
    (process.env.VERCEL
      ? resolve(tmpdir(), "academy-os")
      : process.env.LOCALAPPDATA
        ? resolve(process.env.LOCALAPPDATA, "AcademyOS", "data")
        : resolve(root, "data")),
);
