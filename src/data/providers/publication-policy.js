export const DEFAULT_PUBLICATION_POLICY = {
  recordText: "metadata-and-short-excerpt",
  maxDescriptionChars: 420,
  allowFullText: false,
  allowImages: false,
  requireCanonicalSourceUrl: true,
  displayOriginalPublisher: true,
  copyrightNotice: "Metadata and short excerpts only. Follow source links for full publisher content.",
};

export const DISCOVERY_PUBLICATION_POLICY = {
  ...DEFAULT_PUBLICATION_POLICY,
  recordText: "metadata-only-with-short-snippet",
  maxDescriptionChars: 260,
};

export function publicationPolicy(overrides = {}) {
  return { ...DEFAULT_PUBLICATION_POLICY, ...(overrides || {}) };
}

export function stripMarkup(value = "") {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function applyPublicationPolicy(value = "", policy = DEFAULT_PUBLICATION_POLICY) {
  const effective = publicationPolicy(policy);
  const cleaned = stripMarkup(value);
  if (!cleaned) return "";
  if (effective.allowFullText) return cleaned;
  return cleaned.slice(0, effective.maxDescriptionChars).trim();
}

