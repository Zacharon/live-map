export const CONFIG = {
  endpoint: "/api/events",
  refreshSeconds: 120,
  requestTimeoutMs: 15000,
  dashboardQueryKey: "dashboard",
  defaultDashboard: "primary",
};

export const CATEGORIES = {
  conflict: { label: "Conflict", color: "#ff5d6c" },
  earthquake: { label: "Earthquake", color: "#ffd24d" },
  wildfire: { label: "Wildfire", color: "#ff843d" },
  storm: { label: "Storm", color: "#45a3ff" },
  volcano: { label: "Volcano", color: "#d586ff" },
  flood: { label: "Flood", color: "#32c8df" },
  finance: { label: "Finance", color: "#59d28f" },
  cyber: { label: "Cyber", color: "#72b7ff" },
  infrastructure: { label: "Infrastructure", color: "#c0d2ff" },
  humanitarian: { label: "Humanitarian", color: "#ff9fc1" },
  other: { label: "Other hazard", color: "#68d6b7" },
};

export const SEVERITIES = {
  critical: { label: "Critical", color: "#ff355d", score: 4 },
  high: { label: "High", color: "#ff8a3d", score: 3 },
  medium: { label: "Medium", color: "#f6c453", score: 2 },
  low: { label: "Low", color: "#45a3ff", score: 1 },
};

export const CII_WEIGHTS = {
  conflictActivity: 0.3,
  eventSeverity: 0.25,
  naturalHazards: 0.2,
  dataFreshness: 0.15,
  sourceConfidence: 0.1,
};

export const CII_LEVELS = [
  { level: "stable", label: "Stable", min: 0, max: 19, color: "#38e0a3" },
  { level: "guarded", label: "Guarded", min: 20, max: 39, color: "#8bd46e" },
  { level: "elevated", label: "Elevated", min: 40, max: 59, color: "#f6c453" },
  { level: "high", label: "High", min: 60, max: 79, color: "#ff8a3d" },
  { level: "critical", label: "Critical", min: 80, max: 100, color: "#ff355d" },
];
