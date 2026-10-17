# Live Map / OSINT Forge

Public-information awareness with an evidence-backed investigation path. Live Map is the geographic projection. OSINT Forge is the requirement, collection, evidence, assessment, and review workflow. They share records; they are not two truth stores.

## Language

**Requirement**:
A question, standing watch, or scoped task with geography, time, audience, allowed sources, and a definition of done.
_Avoid_: Ticket, prompt, query, mission (unless a later Forge case uses that word)

**Standing watch**:
A reusable requirement that accepts in-scope provider observations without a new form per earthquake, notice, or public incident.
_Avoid_: Always-on collection, crawl, alert rule

**Collection record**:
A governed retrieval or explicit manual import tied to a requirement, with method, time, limits, and result.
_Avoid_: Scrape, scan, lookup (unless describing a denied action)

**Observation**:
What a source measured, published, or captured, with provenance and limitations. It is not automatically an assessment.
_Avoid_: Intelligence, finding, fact

**Evidential origin**:
The underlying document, dataset, or notice a record depends on. Mirrors and re-acquisitions of the same origin are not extra confirmations.
_Avoid_: Independent source (unless independence was evaluated)

**Acquisition**:
One successful retrieval of an evidential origin. Three acquisitions of one filing are still one origin.
_Avoid_: Corroboration, confirmation

**Claim**:
One proposition about a subject, place, and period. Support and contradiction attach to the claim, not to the map marker.
_Avoid_: Narrative, storyline (storyline is a separate public-feed grouping)

**Source reliability**:
An evaluation of a source in a domain and period, with a rationale. It is not a claim grade and not permission to collect.
_Avoid_: Trust score, A-grade as a default from “official”

**Information credibility**:
An evaluation of a specific claim revision against its evidence. Unknown stays unknown (Admiralty 6 / F are cannot-judge, not zero).
_Avoid_: Confidence (that belongs to the assessment), probability

**Analytical confidence**:
How well the assessment’s reasoning and evidence cover the requirement, separate from severity and source reliability.
_Avoid_: Risk score, OSINT type

**Assessment**:
An answer to a requirement that cites exact claim/evidence revisions, method versions, alternatives, gaps, and a review binding.
_Avoid_: Verdict, intelligence product (product is the audience projection)

**Review binding**:
An approval that names assessment content, input revisions, policy/baseline versions, audience, and time/freshness conditions. A new `retrievedAt` does not refresh old content.
_Avoid_: Rubber stamp, approved=true on import

**Public projection**:
An allowlisted, audience-specific view of eligible records. The public map does not receive the investigation file.
_Avoid_: Hidden field, CSS hide, feature-flag secrecy

**Resource catalog**:
A directory of where and how to look, including upstream OSINT Framework metadata. Listing is not evidence and not an enabled provider.
_Avoid_: Tool graph, live source (unless the local adapter contract is met)

**upstreamStatus**:
The imported directory’s own live/api/active label. It must never be copied onto Live Map provider status.
_Avoid_: Live, enabled, implemented (those are local fields)

**Relationship**:
A typed, time-bounded, evidenced connection (`supports`, `contradicts`, `observed_reroute`, `possible_association`, and the existing edge types). Shared keywords, IPs, locations, or times do not create identity or causality.
_Avoid_: Link, correlation as proof
