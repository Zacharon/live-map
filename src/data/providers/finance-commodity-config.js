export const SEC_FORM_ALLOWLIST = ["8-K", "6-K", "10-K", "10-Q", "20-F", "40-F", "SC 13D", "SC 13G"];

export const SEC_8K_ITEM_RULES = {
  "1.05": { type: "cybersecurity-disclosure", label: "Cybersecurity incident disclosure", severity: 72 },
  "2.01": { type: "acquisition-disposition", label: "Acquisition or disposition disclosure", severity: 58 },
  "2.04": { type: "financial-obligation-trigger", label: "Financial obligation trigger", severity: 66 },
  "2.06": { type: "material-impairment", label: "Material impairment", severity: 64 },
  "4.02": { type: "non-reliance-restatement", label: "Non-reliance or restatement", severity: 70 },
  "5.02": { type: "executive-change", label: "Executive change", severity: 48 },
  "7.01": { type: "regulation-fd-disclosure", label: "Regulation FD disclosure", severity: 35 },
  "8.01": { type: "other-material-event", label: "Other material event", severity: 45 },
};

export const FRED_SERIES_ALLOWLIST = [
  { id: "FEDFUNDS", releaseId: "18", releaseName: "H.15 Selected Interest Rates", materialChange: 0.25 },
  { id: "CPIAUCSL", releaseId: "10", releaseName: "Consumer Price Index", materialPercentChange: 0.4 },
  { id: "UNRATE", releaseId: "50", releaseName: "Employment Situation", materialChange: 0.2 },
  { id: "PAYEMS", releaseId: "50", releaseName: "Employment Situation", materialPercentChange: 0.2 },
  { id: "GDP", releaseId: "53", releaseName: "Gross Domestic Product", materialPercentChange: 1 },
  { id: "DGS2", releaseId: "18", releaseName: "H.15 Selected Interest Rates", materialChange: 0.15 },
  { id: "DGS10", releaseId: "18", releaseName: "H.15 Selected Interest Rates", materialChange: 0.15 },
  { id: "T10Y2Y", releaseId: "18", releaseName: "Treasury Yield Spread", materialChange: 0.15 },
  { id: "DEXUSEU", releaseId: "15", releaseName: "Foreign Exchange Rates", materialPercentChange: 1 },
  { id: "DCOILWTICO", releaseId: "9", releaseName: "Energy Prices", materialPercentChange: 3 },
  { id: "DCOILBRENTEU", releaseId: "9", releaseName: "Energy Prices", materialPercentChange: 3 },
  { id: "GASREGW", releaseId: "9", releaseName: "Energy Prices", materialPercentChange: 2 },
];

export const EIA_DATASETS = [
  {
    id: "weekly-crude-stocks",
    route: "petroleum/stoc/wstk/data",
    frequency: "weekly",
    seriesId: "WCESTUS1",
    commodity: "crude-oil",
    type: "inventory-release",
    units: "thousand barrels",
    materialChange: 5000,
  },
  {
    id: "natural-gas-storage",
    route: "natural-gas/stor/wkly/data",
    frequency: "weekly",
    seriesId: "NW2_EPG0_SWO_R48_BCF",
    commodity: "natural-gas",
    type: "inventory-release",
    units: "billion cubic feet",
    materialChange: 75,
  },
  {
    id: "refinery-utilization",
    route: "petroleum/pnp/wiup/data",
    frequency: "weekly",
    seriesId: "WPULEUS3",
    commodity: "refined-products",
    type: "refinery-utilization-shock",
    units: "percent",
    materialChange: 3,
  },
  {
    id: "electricity-generation",
    route: "electricity/rto/daily-region-data/data",
    frequency: "daily",
    seriesId: "D.H.NG-ALL.NG.H",
    commodity: "electricity",
    type: "electricity-generation-signal",
    units: "megawatthours",
    materialPercentChange: 8,
  },
];
