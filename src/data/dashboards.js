export const DASHBOARDS = [
  {
    id: "primary",
    label: "Primary",
    title: "Global events",
    description: "Global events, natural hazards, source health, country instability, and infrastructure context.",
    categories: ["earthquake", "wildfire", "storm", "volcano", "flood", "conflict", "infrastructure", "other"],
  },
  {
    id: "finance",
    label: "Finance",
    title: "Markets and event context",
    description: "Exchange registry, delayed/fixture market cards, and event-to-market correlation prototypes.",
    categories: ["finance", "earthquake", "storm", "flood", "conflict", "infrastructure"],
  },
  {
    id: "technology",
    label: "Technology",
    title: "Cyber and technology",
    description: "Cyber, cloud, internet disruption, data breach, and critical technology infrastructure scaffolding.",
    categories: ["cyber", "infrastructure", "conflict", "other"],
  },
  {
    id: "commodity",
    label: "Commodity",
    title: "Energy, shipping, and supply chains",
    description: "Commodity, port, shipping, energy, and production disruption scaffolding.",
    categories: ["finance", "infrastructure", "storm", "flood", "wildfire", "conflict"],
  },
  {
    id: "happy",
    label: "Happy",
    title: "Positive developments",
    description: "Humanitarian wins, recovery milestones, conservation, science, and safety improvements.",
    categories: ["humanitarian", "other"],
  },
];

export function getDashboard(id) {
  return DASHBOARDS.find((dashboard) => dashboard.id === id) || DASHBOARDS[0];
}
