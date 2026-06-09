import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const DEFAULT_PRODUCTION_URLS = [
  "https://liveworldmap.netlify.app/",
  "https://liveworldmap.netlify.app/api/events",
  "https://liveworldmap.netlify.app/.netlify/functions/events",
];

const JAVASCRIPT_EXTENSIONS = new Set([".js", ".mjs", ".cjs"]);
const BROWSER_FILE_EXTENSIONS = new Set([".html", ".js", ".mjs"]);
const IGNORED_DIRS = new Set([".git", "node_modules", ".netlify"]);
const SECRET_PATTERNS = [
  { name: "AWS access key", pattern: /AKIA[0-9A-Z]{16}/g },
  { name: "GitHub token", pattern: /gh[pousr]_[A-Za-z0-9_]{30,}/g },
  { name: "JWT", pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  {
    name: "browser credential assignment",
    pattern: /\b(?:api[_-]?key|access[_-]?token|secret|client[_-]?secret|auth[_-]?token)\b\s*[:=]\s*["'`][A-Za-z0-9._~+/=-]{20,}["'`]/gi,
  },
  { name: "URL credential parameter", pattern: /[?&](?:api[_-]?key|token|access_token|secret)=([A-Za-z0-9._~+/=-]{16,})/gi },
];

export function createReporter() {
  const checks = [];
  return {
    pass(name, detail = "") {
      checks.push({ ok: true, name, detail });
    },
    fail(name, detail = "") {
      checks.push({ ok: false, name, detail });
    },
    warn(name, detail = "") {
      checks.push({ ok: true, warn: true, name, detail });
    },
    print(title = "Live Map validation report") {
      console.log(`\n${title}`);
      console.log("=".repeat(title.length));
      for (const check of checks) {
        const prefix = check.ok ? (check.warn ? "WARN" : "PASS") : "FAIL";
        console.log(`${prefix} ${check.name}${check.detail ? ` - ${check.detail}` : ""}`);
      }
      const failed = checks.filter((check) => !check.ok);
      console.log(`\nResult: ${failed.length ? "FAIL" : "PASS"} (${checks.length} checks, ${failed.length} failed)`);
      return failed.length === 0;
    },
    get failed() {
      return checks.filter((check) => !check.ok);
    },
  };
}

export async function findFiles(root, predicate) {
  const output = [];
  async function walk(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (predicate(fullPath)) {
        output.push(fullPath);
      }
    }
  }
  await walk(root);
  return output.sort();
}

export async function runSyntaxChecks(root, reporter) {
  const files = await findFiles(root, (file) => JAVASCRIPT_EXTENSIONS.has(path.extname(file)));
  for (const file of files) {
    try {
      await execFileAsync(process.execPath, ["--check", file], { cwd: root });
    } catch (error) {
      reporter.fail("JavaScript syntax", `${path.relative(root, file)}: ${error.stderr || error.message}`);
      return;
    }
  }
  reporter.pass("JavaScript syntax", `${files.length} files checked`);
}

export async function scanBrowserSecrets(root, reporter) {
  const files = await findFiles(root, (file) => {
    const relative = path.relative(root, file).replace(/\\/g, "/");
    if (!BROWSER_FILE_EXTENSIONS.has(path.extname(file))) return false;
    if (relative.startsWith("netlify/functions/")) return false;
    if (relative.startsWith("scripts/")) return false;
    if (relative.startsWith(".codex/")) return false;
    return true;
  });

  const findings = [];
  for (const file of files) {
    const text = await fs.readFile(file, "utf8");
    for (const { name, pattern } of SECRET_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text))) {
        const line = text.slice(0, match.index).split(/\r?\n/).length;
        findings.push(`${path.relative(root, file)}:${line} ${name}`);
      }
    }
  }

  if (findings.length) {
    reporter.fail("Browser-side secret scan", findings.join("; "));
  } else {
    reporter.pass("Browser-side secret scan", `${files.length} browser-served files checked`);
  }
}

export function assertValidUrl(value) {
  if (!value || typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function validateEventPayload(payload, reporter, options = {}) {
  const maxAgeMs = options.maxAgeMs ?? 20 * 60 * 1000;
  const requireHealthySources = options.requireHealthySources ?? true;
  const label = options.label || "event API";

  if (!payload || typeof payload !== "object") {
    reporter.fail(`${label} response`, "Response is not a JSON object");
    return;
  }

  if (!Array.isArray(payload.events)) {
    reporter.fail(`${label} events`, "`events` must be an array");
    return;
  }

  if (!payload.events.length) {
    reporter.fail(`${label} events`, "No events returned");
  } else {
    reporter.pass(`${label} events`, `${payload.events.length} events returned`);
  }

  const generatedAt = Number(payload.generatedAt);
  if (!Number.isFinite(generatedAt)) {
    reporter.fail(`${label} freshness`, "`generatedAt` is missing or invalid");
  } else {
    const ageMs = Math.abs(Date.now() - generatedAt);
    if (ageMs > maxAgeMs) {
      reporter.fail(`${label} freshness`, `generatedAt is ${Math.round(ageMs / 60000)} minutes from now`);
    } else {
      reporter.pass(`${label} freshness`, `generated ${Math.round(ageMs / 1000)} seconds from now`);
    }
  }

  if (payload.mode === "partial-netlify-function" || payload.mode === "fallback") {
    reporter.fail(`${label} source mode`, `mode=${payload.mode}`);
  } else {
    reporter.pass(`${label} source mode`, payload.mode || "mode not supplied");
  }

  const errors = Array.isArray(payload.errors) ? payload.errors.filter(Boolean) : [];
  if (errors.length) {
    reporter.fail(`${label} provider errors`, errors.join("; "));
  } else {
    reporter.pass(`${label} provider errors`, "none reported");
  }

  validateSourceStatus(payload.sourceStatus, reporter, label, requireHealthySources);
  validateCoordinates(payload.events, reporter, label);
  validateAttribution(payload.events, reporter, label);
}

export function validateSourceStatus(sourceStatus, reporter, label, requireHealthySources = true) {
  if (!sourceStatus || typeof sourceStatus !== "object" || Array.isArray(sourceStatus)) {
    reporter.fail(`${label} source status`, "`sourceStatus` object is required");
    return;
  }

  const entries = Object.entries(sourceStatus);
  if (!entries.length) {
    reporter.fail(`${label} source status`, "No source statuses returned");
    return;
  }

  const allowedNotOk = new Set(["configuration-required", "disabled"]);
  const failed = entries.filter(([, status]) => status?.ok !== true && !allowedNotOk.has(status?.status));
  if (requireHealthySources && failed.length) {
    reporter.fail(
      `${label} source status`,
      failed.map(([key, status]) => `${key}: ${status?.message || "not ok"}`).join("; ")
    );
  } else {
    reporter.pass(`${label} source status`, `${entries.length} sources reported`);
  }
}

export function validateCoordinates(events, reporter, label) {
  const invalid = [];
  for (const event of events || []) {
    const lat = Number(event.lat ?? event.latitude);
    const lon = Number(event.lon ?? event.longitude);
    if (event?.geographic === false) continue;
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      invalid.push(event.id || event.title || "unknown event");
    }
  }
  if (invalid.length) {
    reporter.fail(`${label} coordinates`, invalid.slice(0, 10).join("; "));
  } else {
    reporter.pass(`${label} coordinates`, `${(events || []).length} valid coordinate pairs`);
  }
}

export function validateAttribution(events, reporter, label) {
  const missing = [];
  for (const event of events || []) {
    if (!(event.sourceName || event.source || event.providerName) || !assertValidUrl(event.sourceUrl || event.providerUrl)) {
      missing.push(event.id || event.title || "unknown event");
    }
  }
  if (missing.length) {
    reporter.fail(`${label} attribution`, missing.slice(0, 10).join("; "));
  } else {
    reporter.pass(`${label} attribution`, `${(events || []).length} events include source attribution`);
  }
}

export function collectSourceUrls(payload, limit = 20) {
  const urls = new Set();
  for (const [providerId, source] of Object.entries(payload?.sourceRegistry || {})) {
    const status = payload?.sourceStatus?.[providerId];
    if (status && status.ok !== true) continue;
    if (assertValidUrl(source?.url)) urls.add(source.url);
  }
  for (const event of payload?.events || []) {
    if (assertValidUrl(event.sourceUrl)) urls.add(event.sourceUrl);
    if (assertValidUrl(event.providerUrl)) urls.add(event.providerUrl);
    if (urls.size >= limit) break;
  }
  return [...urls].slice(0, limit);
}

export async function checkUrls(urls, reporter, label = "source URLs") {
  const failures = [];
  for (const url of urls) {
    try {
      const response = await fetchWithTimeout(url, { method: "HEAD", redirect: "follow" }, 10000);
      if (response.status === 405 || response.status === 403) {
        const getResponse = await fetchWithTimeout(url, { method: "GET", redirect: "follow" }, 10000);
        if (!getResponse.ok) failures.push(`${url} -> ${getResponse.status}`);
      } else if (!response.ok) {
        failures.push(`${url} -> ${response.status}`);
      }
    } catch (error) {
      failures.push(`${url} -> ${error.message}`);
    }
  }

  if (failures.length) {
    reporter.fail(label, failures.join("; "));
  } else {
    reporter.pass(label, `${urls.length} URLs reachable`);
  }
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadLocalEventPayload(root) {
  const modulePath = path.join(root, "netlify", "functions", "events.mjs");
  const moduleUrl = new URL(`file:///${modulePath.replace(/\\/g, "/")}`);
  const eventsModule = await import(`${moduleUrl.href}?t=${Date.now()}`);
  const handler = eventsModule.default || eventsModule.handler;
  if (typeof handler !== "function") throw new Error("events.mjs does not export a Netlify handler");

  const request = new Request("http://localhost/api/events?hours=168", { method: "GET" });
  const response = await handler(request);
  const status = response.statusCode ?? response.status ?? 200;
  const body = typeof response.text === "function" ? await response.text() : response.body;
  if (status < 200 || status >= 300) throw new Error(`Local event function returned HTTP ${status}: ${body}`);
  return JSON.parse(body);
}
