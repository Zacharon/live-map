import { createNormalizedEvent } from "../../events/normalized-event.js";
import { createCompanyIdentity } from "./company-identity.js";
import { SEC_8K_ITEM_RULES, SEC_FORM_ALLOWLIST } from "./finance-commodity-config.js";

export const SEC_SUBMISSIONS_BASE_URL = "https://data.sec.gov/submissions/";
export const SEC_COMPANY_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";

function cik10(value) {
  return String(value || "").replace(/\D/g, "").padStart(10, "0");
}

function cikNoLeading(value) {
  return String(value || "").replace(/^0+/, "");
}

function accessionCompact(accessionNumber) {
  return String(accessionNumber || "").replace(/-/g, "");
}

export function secFilingUrl(cik, accessionNumber) {
  const cleanCik = cikNoLeading(cik);
  const compact = accessionCompact(accessionNumber);
  return `https://www.sec.gov/Archives/edgar/data/${cleanCik}/${compact}/${accessionNumber}.txt`;
}

export function secPrimaryDocumentUrl(cik, accessionNumber, primaryDocument) {
  const cleanCik = cikNoLeading(cik);
  const compact = accessionCompact(accessionNumber);
  return `https://www.sec.gov/Archives/edgar/data/${cleanCik}/${compact}/${primaryDocument || `${accessionNumber}.txt`}`;
}

export function compliantSecContact(value) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value || "").trim());
}

export function classifySecFiling(filing = {}) {
  const form = String(filing.form || filing.formType || "").toUpperCase();
  const items = String(filing.items || "").match(/\d+\.\d+/g) || [];
  if (form === "8-K") {
    const item = items.find((value) => SEC_8K_ITEM_RULES[value]);
    const rule = item ? SEC_8K_ITEM_RULES[item] : { type: "other-material-event", label: "Form 8-K disclosure", severity: 34 };
    return { formType: form, filingItem: item || null, eventType: rule.type, label: rule.label, severity: rule.severity };
  }
  if (form === "6-K") return { formType: form, filingItem: null, eventType: "foreign-issuer-report", label: "Foreign issuer report", severity: 36 };
  if (form === "10-K") return { formType: form, filingItem: null, eventType: "annual-report", label: "Annual report filed", severity: 28 };
  if (form === "10-Q") return { formType: form, filingItem: null, eventType: "quarterly-report", label: "Quarterly report filed", severity: 26 };
  if (form.includes("13D") || form.includes("13G")) return { formType: form, filingItem: null, eventType: "large-ownership-change", label: "Large ownership disclosure", severity: 42 };
  return { formType: form, filingItem: null, eventType: "filing-metadata", label: "SEC filing metadata", severity: 20 };
}

export function filingLooksMaterial(filing = {}) {
  const form = String(filing.form || filing.formType || "").toUpperCase();
  if (!SEC_FORM_ALLOWLIST.includes(form)) return false;
  if (form === "8-K") return true;
  const text = `${filing.form || ""} ${filing.items || ""} ${filing.primaryDocDescription || ""}`.toLowerCase();
  return /bankrupt|merger|acquisition|cyber|restatement|non-reliance|departure|delist|trading|contract|ownership/.test(text) || ["6-K", "10-K", "10-Q", "SC 13D", "SC 13G"].includes(form);
}

export function normalizeSecFiling(filing = {}, company = {}, now = new Date()) {
  const accessionNumber = filing.accessionNumber;
  const cik = company.cik || filing.cik;
  const companyName = company.companyName || company.legalName || filing.companyName;
  if (!accessionNumber || !cik || !companyName) return { event: null, errors: ["missing SEC filing identity"] };
  if (!filingLooksMaterial(filing)) return { event: null, errors: ["filing outside material allowlist"] };
  const classification = classifySecFiling(filing);
  const filingDate = filing.filingDate || filing.filedAt;
  const reportDate = filing.reportDate || filing.periodOfReport || filingDate;
  const filingUrl = secFilingUrl(cik, accessionNumber);
  const primaryDocumentUrl = secPrimaryDocumentUrl(cik, accessionNumber, filing.primaryDocument);
  const identity = createCompanyIdentity({
    cik,
    tickerSymbols: company.tickerSymbols || company.tickers || [],
    legalName: companyName,
    exchange: company.exchange,
    country: company.country || "United States",
    sector: company.sector,
    lei: company.lei,
  });
  const title = `${companyName}: ${classification.label}`;
  const result = createNormalizedEvent({
    id: `sec-edgar:${accessionCompact(accessionNumber)}`,
    provider: "sec-edgar",
    providerEventId: accessionNumber,
    domain: "finance-markets",
    category: "finance",
    type: classification.eventType,
    subtype: classification.filingItem ? `8-k-item-${classification.filingItem}` : classification.formType.toLowerCase(),
    title,
    description: `${classification.formType} filing${classification.filingItem ? ` Item ${classification.filingItem}` : ""} reported by ${companyName}. Automated classification requires analyst review and is not a statement of market impact.`,
    geographic: false,
    mapDisplayStatus: "not-mapped",
    nonGeographicReason: "SEC filings identify issuers and disclosures, not verified event coordinates.",
    startedAt: reportDate || filingDate || now,
    updatedAt: filingDate || reportDate || now,
    ingestedAt: now,
    severity: classification.severity,
    confidence: classification.filingItem ? 86 : 74,
    status: "monitoring",
    sourceName: "SEC EDGAR",
    sourceUrl: filingUrl,
    sourceType: "Official",
    sourcePublishedAt: filingDate || reportDate || null,
    tags: ["SEC", classification.formType, classification.eventType, classification.filingItem].filter(Boolean),
    metadata: {
      verificationStatus: "primary-confirmed",
      coordinateMethod: "not applicable",
      severityReason: "Severity reflects potential disclosure importance, not price movement or causality.",
      companyName,
      cik: identity.cik,
      tickerSymbols: identity.tickerSymbols,
      companyIdentity: identity,
      formType: classification.formType,
      filingItem: classification.filingItem,
      eventType: classification.eventType,
      filingDate,
      reportDate,
      accessionNumber,
      filingUrl,
      primaryDocumentUrl,
      recordKind: "event",
      details: {
        Company: companyName,
        CIK: identity.cik,
        Tickers: identity.tickerSymbols.join(", ") || "Unknown",
        Form: classification.formType,
        Item: classification.filingItem || "Not item-specific",
        Accession: accessionNumber,
        "Filing date": filingDate || "Unknown",
        "Report date": reportDate || "Unknown",
      },
    },
  });
  return { event: result.valid ? result.event : null, errors: result.errors, companyIdentity: identity };
}

function recentFilingsFromSubmissions(data = {}) {
  const recent = data.filings?.recent || {};
  const forms = recent.form || [];
  return forms.map((form, index) => ({
    form,
    accessionNumber: recent.accessionNumber?.[index],
    filingDate: recent.filingDate?.[index],
    reportDate: recent.reportDate?.[index],
    primaryDocument: recent.primaryDocument?.[index],
    primaryDocDescription: recent.primaryDocDescription?.[index],
    items: recent.items?.[index],
  }));
}

export async function fetchSecEdgarEvents(context = {}) {
  const contact = globalThis?.process?.env?.SEC_CONTACT_EMAIL;
  if (!compliantSecContact(contact)) {
    return {
      events: [],
      rejected: [],
      status: "configuration-required",
      warnings: ["SEC_CONTACT_EMAIL is required for a compliant SEC EDGAR User-Agent."],
      safeError: "SEC EDGAR is not configured. Add SEC_CONTACT_EMAIL in server environment variables.",
      requestAttempted: false,
    };
  }
  const cikTargets = (context.secCiks || globalThis?.process?.env?.SEC_CIKS || "").split(",").map(cik10).filter((value) => /\d{10}/.test(value)).slice(0, 25);
  if (!cikTargets.length) {
    return { events: [], rejected: [], status: "healthy", warnings: ["SEC EDGAR is configured but no SEC_CIKS allowlist was supplied; broad filing ingestion is disabled."], requestAttempted: false };
  }
  const now = new Date(context.now);
  const events = [];
  const rejected = [];
  for (const cik of cikTargets) {
    const data = await context.fetchJson(`${SEC_SUBMISSIONS_BASE_URL}CIK${cik}.json`, "SEC EDGAR submissions");
    const company = { cik, companyName: data.name, tickerSymbols: data.tickers || [], exchange: data.exchanges?.[0], country: "United States" };
    for (const filing of recentFilingsFromSubmissions(data).slice(0, 40)) {
      if (await context.providerStateStore?.hasProcessed?.("sec-edgar", cik, filing.accessionNumber)) continue;
      const result = normalizeSecFiling(filing, company, now);
      if (result.event) {
        events.push(result.event);
        await context.providerStateStore?.markProcessed?.("sec-edgar", cik, filing.accessionNumber, {
          lastAccessionNumber: filing.accessionNumber,
          lastSuccessfullyProcessedFiling: filing.filingDate,
        });
      } else {
        rejected.push({ id: filing.accessionNumber || null, errors: result.errors });
      }
    }
  }
  return { events, rejected, receivedCount: events.length + rejected.length };
}
