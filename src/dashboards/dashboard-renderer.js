import { getDashboard } from "../data/dashboards.js";
import { renderPrimaryDashboard } from "./primary-dashboard.js";
import { renderFinanceDashboard } from "./finance-dashboard.js";
import { renderTechnologyDashboard } from "./technology-dashboard.js";
import { renderCommodityDashboard } from "./commodity-dashboard.js";
import { renderHappyDashboard } from "./happy-dashboard.js";

export function renderDashboardPanel(id, context) {
  if (id === "finance") return renderFinanceDashboard(context);
  if (id === "technology") return renderTechnologyDashboard(context);
  if (id === "commodity") return renderCommodityDashboard(context);
  if (id === "happy") return renderHappyDashboard(context);
  return renderPrimaryDashboard(context);
}

export function applyDashboardTitle(id, eyebrow, title) {
  const dashboard = getDashboard(id);
  eyebrow.textContent = dashboard.label.toUpperCase();
  title.textContent = dashboard.title;
}
