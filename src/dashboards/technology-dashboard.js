import { SCAFFOLDED_MODULES } from "../data/scaffolded-modules.js";

export function renderTechnologyDashboard() {
  const count = SCAFFOLDED_MODULES.filter((item) => ["cyber-threat-monitoring", "ai-briefs", "licensed-exposure-monitoring"].includes(item.id)).length;
  return `<strong>Technology dashboard</strong><p>Cyber incidents, CERT advisories, cloud outages, internet disruptions, and critical technology infrastructure are scaffolded as provider adapters. No exploit instructions or private data are collected.</p><p>${count} safe technology/AI monitoring scaffold(s) documented.</p>`;
}
