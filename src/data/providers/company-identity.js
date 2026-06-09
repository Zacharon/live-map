function cleanTicker(value) {
  return String(value || "").trim().toUpperCase();
}

export function createCompanyIdentity(input = {}) {
  const cik = String(input.cik || "").replace(/^0+/, "");
  if (!cik && !input.legalName) return null;
  const tickerSymbols = [...new Set([...(input.tickerSymbols || []), input.ticker].map(cleanTicker).filter(Boolean))];
  return {
    id: cik ? `cik:${cik}` : `company:${String(input.legalName).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    cik: cik || null,
    tickerSymbols,
    lei: input.lei || null,
    legalName: input.legalName || input.companyName || null,
    exchange: input.exchange || null,
    country: input.country || null,
    sector: input.sector || null,
  };
}

export function sameCompany(a, b) {
  if (!a || !b) return false;
  if (a.cik && b.cik) return a.cik === b.cik;
  if (a.lei && b.lei) return a.lei === b.lei;
  if (a.tickerSymbols?.length && b.tickerSymbols?.length) {
    return a.tickerSymbols.some((ticker) => b.tickerSymbols.includes(ticker));
  }
  return false;
}
