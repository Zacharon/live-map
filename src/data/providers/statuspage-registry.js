export const STATUSPAGE_REGISTRY = [
  {
    id: "github-status",
    name: "GitHub Status",
    apiUrl: "https://www.githubstatus.com/api/v2/incidents/unresolved.json",
    homepageUrl: "https://www.githubstatus.com/",
    domain: "technology-cyber",
    category: "infrastructure",
    type: "service-outage",
    attribution: "GitHub Status",
  },
  {
    id: "cloudflare-status",
    name: "Cloudflare Status",
    apiUrl: "https://www.cloudflarestatus.com/api/v2/incidents/unresolved.json",
    homepageUrl: "https://www.cloudflarestatus.com/",
    domain: "infrastructure",
    category: "infrastructure",
    type: "cloud-outage",
    attribution: "Cloudflare Status",
  },
  {
    id: "slack-status",
    name: "Slack Status",
    apiUrl: "https://status.slack.com/api/v2.0.0/current",
    homepageUrl: "https://status.slack.com/",
    domain: "technology-cyber",
    category: "infrastructure",
    type: "service-outage",
    attribution: "Slack Status",
    adapter: "slack-current",
  },
];

