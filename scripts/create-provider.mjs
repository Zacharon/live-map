import fs from "node:fs";
import path from "node:path";

const id = process.argv[2];
if (!id || !/^[a-z0-9][a-z0-9-]+$/.test(id)) {
  console.error("Usage: node scripts/create-provider.mjs provider-id");
  process.exit(1);
}

const pascal = id.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join("");
const root = process.cwd();
const files = [
  {
    path: `src/data/providers/${id}.js`,
    content: `import { createNormalizedEvent } from "../../events/normalized-event.js";\n\nexport function normalize${pascal}Record(record, now = new Date()) {\n  return { event: null, errors: ["${id} normalization is not implemented"], record, now };\n}\n\nexport async function fetch${pascal}Events(context = {}) {\n  return {\n    events: [],\n    rejected: [],\n    status: "configuration-required",\n    warnings: ["${id} is scaffolded but not activated."],\n    safeError: "${id} needs source review, registry mapping, schedule, budget, tests, and docs before activation.",\n    requestAttempted: false,\n  };\n}\n`,
  },
  {
    path: `tests/fixtures/${id}/README.md`,
    content: `# ${id} fixtures\n\nPlace sanitized provider fixture samples here. Do not commit API keys, private credentials, raw personal data, or restricted provider payloads.\n`,
  },
  {
    path: `docs/${pascal.toUpperCase()}_PROVIDER.md`,
    content: `# ${pascal} Provider\n\nStatus: scaffolded only.\n\nBefore activation document:\n\n- Source URL and docs URL\n- Terms and attribution\n- Access class and credential requirements\n- Supported record kinds and domains\n- Request schedule, cache policy, and budget\n- Failure behavior and sanitized errors\n- Tests and fixtures\n`,
  },
];

for (const file of files) {
  const fullPath = path.join(root, file.path);
  if (fs.existsSync(fullPath)) {
    console.error(`${file.path} already exists`);
    process.exit(1);
  }
}

for (const file of files) {
  const fullPath = path.join(root, file.path);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, file.content, "utf8");
  console.log(`created ${file.path}`);
}

console.log("Provider scaffold created but not registered or activated.");
