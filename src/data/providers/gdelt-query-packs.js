export const GDELT_QUERY_PACKS = [
  {
    id: "global-infrastructure-disruption",
    query: '("internet outage" OR "power outage" OR "submarine cable" OR "airport closed" OR "port closed")',
    domain: "infrastructure",
    category: "infrastructure",
    type: "infrastructure-disruption",
  },
  {
    id: "global-public-safety",
    query: '("evacuation order" OR "state of emergency" OR "major accident" OR "public health emergency")',
    domain: "major-news",
    category: "other",
    type: "breaking-event",
  },
  {
    id: "supply-chain-disruption",
    query: '("refinery outage" OR "pipeline disruption" OR "export restriction" OR "labor strike")',
    domain: "commodity-supply-chain",
    category: "commodity",
    type: "supply-chain-disruption",
  },
];

