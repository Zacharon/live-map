#!/usr/bin/env node
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();

const ignoredPrefixes = [
  "node_modules/",
  ".git/",
  ".netlify/",
  ".wrangler/",
  "artifacts/",
];

const ignoredFiles = new Set([
  "package-lock.json",
]);

const patterns = [
  { name: "env file tracked", testPath: (relative) => /^\.env(?:\.|$)/.test(path.basename(relative)) },
  { name: "private key", pattern: /-----BEGIN (?:RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: "GitHub token", pattern: /gh[pousr]_[A-Za-z0-9_]{30,}/ },
  { name: "Cloudflare token assignment", pattern: /\b(?:CLOUDFLARE_API_TOKEN|CF_API_TOKEN)\b\s*[:=]\s*["']?[A-Za-z0-9._-]{30,}/i },
  { name: "provider token assignment", pattern: /\b(?:API_KEY|ACCESS_TOKEN|AUTH_TOKEN|CLIENT_SECRET|API_TOKEN|SECRET)\b\s*[:=]\s*["'][A-Za-z0-9._~+/=-]{24,}["']/i },
  { name: "URL credential parameter", pattern: /[?&](?:api[_-]?key|access_token|token|secret)=([A-Za-z0-9._~+/=-]{20,})/i },
];

function normalize(file) {
  return file.replace(/\\/g, "/");
}

function shouldScan(relative) {
  const normalized = normalize(relative);
  if (!normalized || ignoredFiles.has(normalized)) return false;
  if (ignoredPrefixes.some((prefix) => normalized.startsWith(prefix))) return false;
  return true;
}

async function trackedFiles() {
  const { stdout } = await execFileAsync("git", ["ls-files"], { cwd: root });
  return stdout.split(/\r?\n/).filter(Boolean).filter(shouldScan);
}

function lineFor(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

const findings = [];

for (const relative of await trackedFiles()) {
  const fullPath = path.join(root, relative);
  let text;
  try {
    text = await fs.readFile(fullPath, "utf8");
  } catch {
    continue;
  }
  for (const item of patterns) {
    if (item.testPath?.(relative)) {
      findings.push(`${relative}:1 ${item.name}`);
      continue;
    }
    if (!item.pattern) continue;
    item.pattern.lastIndex = 0;
    const match = item.pattern.exec(text);
    if (match) findings.push(`${relative}:${lineFor(text, match.index)} ${item.name}`);
  }
}

if (findings.length) {
  console.error("Potential secret patterns found. Values are intentionally not printed.");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Repo secret scan passed.");
