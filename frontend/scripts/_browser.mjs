/**
 * Helper lokalisasi executable Chromium untuk skrip harness (dev-only).
 *
 * Urutan resolusi:
 *  1. env PLAYWRIGHT_CHROMIUM / CHROME_PATH
 *  2. executablePath bawaan playwright-core (bila diinstal penuh)
 *  3. lokasi cache ms-playwright di HOME (linux)
 *
 * Tidak ada path hardcoded ke mesin tertentu — aman dipakai di mesin lain.
 */
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** @returns {string | undefined} path chrome bila ditemukan. */
export function resolveChromium() {
  const env = process.env.PLAYWRIGHT_CHROMIUM || process.env.CHROME_PATH;
  if (env && existsSync(env)) return env;

  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || join(homedir(), ".cache", "ms-playwright");
  if (existsSync(cache)) {
    const dirs = readdirSync(cache)
      .filter((d) => d.startsWith("chromium-"))
      .sort()
      .reverse();
    for (const d of dirs) {
      for (const rel of ["chrome-linux64/chrome", "chrome-linux/chrome"]) {
        const p = join(cache, d, rel);
        if (existsSync(p)) return p;
      }
    }
  }
  for (const sys of ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"]) {
    if (existsSync(sys)) return sys;
  }
  // fallback: biarkan playwright-core mencari sendiri
  return undefined;
}

/** Opsi launch standar (headless + no-sandbox). */
export function launchOptions() {
  const exe = resolveChromium();
  return exe ? { executablePath: exe, args: ["--no-sandbox"] } : { args: ["--no-sandbox"] };
}
