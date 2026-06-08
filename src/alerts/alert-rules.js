const STORAGE_KEY = "liveMapAlertRules";

export function loadAlertRules() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveAlertRules(rules) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

export function validateAlertRule(rule) {
  const errors = [];
  if (!rule.name || rule.name.trim().length < 3) errors.push("Name must be at least 3 characters.");
  if (!rule.conditions || typeof rule.conditions !== "object") errors.push("Conditions are required.");
  if (rule.cooldownMinutes < 0) errors.push("Cooldown cannot be negative.");
  return { valid: errors.length === 0, errors };
}

export function createLocalRule({ name, category = "earthquake", severity = "high" }) {
  return {
    id: `local-${Date.now()}`,
    name,
    enabled: true,
    conditions: { category, severity },
    deliveryChannels: ["in-app-preview"],
    cooldownMinutes: 60,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastTriggeredAt: null,
  };
}

export function previewAlerts(rules, events) {
  return rules.flatMap((rule) => {
    if (!rule.enabled) return [];
    return events.filter((event) => (!rule.conditions.category || event.category === rule.conditions.category) && (!rule.conditions.severity || event.severity === rule.conditions.severity)).slice(0, 3).map((event) => ({
      ruleId: rule.id,
      ruleName: rule.name,
      eventId: event.id,
      title: event.title,
      generatedAt: Date.now(),
    }));
  });
}
