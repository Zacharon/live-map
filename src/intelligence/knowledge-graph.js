/**
 * Geographic knowledge graph: typed nodes and inspectable edges.
 * Geographic nodes stay geographically anchored. Non-geographic nodes stay in
 * the inspector/abstract neighborhood. Raised arcs are a display convention.
 */

import { ASSERTION_CLASSES, EDGE_TYPES, NODE_TYPES, nodeTypeForRecord } from "./evidence-records.js";
import { inViewport, wrapLongitude } from "../map/attention-policy.js";

export const NODE_BADGES = {
  "public-report": { icon: "P", label: "Public report" },
  "official-notice": { icon: "N", label: "Official notice" },
  "weather-model-observation": { icon: "W", label: "Weather / model" },
  "maritime-aggregate": { icon: "M", label: "Maritime aggregate" },
  infrastructure: { icon: "I", label: "Infrastructure" },
  "energy-economic-observation": { icon: "E", label: "Energy / economic" },
  "cyber-network-record": { icon: "C", label: "Cyber / network" },
  "orbital-element": { icon: "O", label: "Orbital element" },
};

export const GRAPH_BUDGETS = { nodes: 48, edges: 80, hops: 2 };

export function isGeographicNode(node) {
  return Number.isFinite(node?.lat) && Number.isFinite(node?.lon) && Math.abs(node.lat) <= 90 && Math.abs(node.lon) <= 180;
}

export function graphNodeFromRecord(record, extras = {}) {
  const nodeType = nodeTypeForRecord(record);
  const badge = NODE_BADGES[nodeType] || NODE_BADGES["public-report"];
  return {
    id: record.id,
    nodeType,
    badge,
    recordKind: record.recordKind,
    evidenceKind: record.evidenceKind,
    subjectDomain: record.subjectDomain,
    title: record.title,
    lat: record.lat,
    lon: record.lon,
    geographic: isGeographicNode(record),
    verificationState: record.verificationStatus || extras.verificationState || null,
    sourceId: record.sourceId,
    synthetic: record.synthetic === true,
    valueOrigin: record.valueOrigin,
  };
}

export function graphEdgeFromRelationship(record) {
  const extra = record.extra || {};
  return {
    id: record.id,
    fromId: extra.fromId,
    toId: extra.toId,
    edgeType: EDGE_TYPES.includes(extra.edgeType) ? extra.edgeType : "affects",
    assertionClass: ASSERTION_CLASSES.includes(extra.assertionClass) ? extra.assertionClass : "heuristic",
    heuristic: extra.assertionClass === "heuristic" || extra.proximityOnly === true,
    evidenceIds: record.parentEvidenceIds || [],
    scope: extra.scope || record.claimScope || null,
    validStart: record.effectiveStart,
    validEnd: record.effectiveEnd,
    label: extra.edgeType || "affects",
  };
}

export function neighborhood({
  selectedId,
  nodes = [],
  edges = [],
  hops = GRAPH_BUDGETS.hops,
  nodeBudget = GRAPH_BUDGETS.nodes,
  edgeBudget = GRAPH_BUDGETS.edges,
  bbox = null,
} = {}) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  if (!selectedId || !byId.has(selectedId)) {
    const geographic = nodes.filter((node) => node.geographic && inViewport(node.lat, node.lon, bbox));
    return {
      nodes: geographic.slice(0, nodeBudget),
      edges: [],
      abstractNodes: nodes.filter((node) => !node.geographic).slice(0, 12),
      truncated: nodes.length > nodeBudget,
      note: "Default view is the selected-node neighborhood. Unselected expansion is bounded.",
    };
  }
  const keep = new Set([selectedId]);
  let frontier = [selectedId];
  for (let hop = 0; hop < hops; hop += 1) {
    const next = [];
    for (const id of frontier) {
      for (const edge of edges) {
        if (edge.fromId === id && !keep.has(edge.toId)) { keep.add(edge.toId); next.push(edge.toId); }
        if (edge.toId === id && !keep.has(edge.fromId)) { keep.add(edge.fromId); next.push(edge.fromId); }
      }
    }
    frontier = next;
  }
  const selectedNodes = [...keep].map((id) => byId.get(id)).filter(Boolean).slice(0, nodeBudget);
  const selectedIds = new Set(selectedNodes.map((node) => node.id));
  const selectedEdges = edges.filter((edge) => selectedIds.has(edge.fromId) && selectedIds.has(edge.toId)).slice(0, edgeBudget);
  return {
    nodes: selectedNodes.filter((node) => node.geographic),
    edges: selectedEdges,
    abstractNodes: selectedNodes.filter((node) => !node.geographic),
    truncated: keep.size > nodeBudget || edges.length > edgeBudget,
    hops,
    note: "Raised graph arcs are a display convention, not flight or shipping paths. Route geometry must follow sourced water corridors when representing navigation.",
  };
}

export function antimeridianSplit(from, to) {
  const a = wrapLongitude(from.lon);
  const b = wrapLongitude(to.lon);
  if (Math.abs(b - a) <= 180) return [[{ lat: from.lat, lon: a }, { lat: to.lat, lon: b }]];
  const midLat = (from.lat + to.lat) / 2;
  if (a > 0) return [[{ lat: from.lat, lon: a }, { lat: midLat, lon: 180 }], [{ lat: midLat, lon: -180 }, { lat: to.lat, lon: b }]];
  return [[{ lat: from.lat, lon: a }, { lat: midLat, lon: -180 }], [{ lat: midLat, lon: 180 }, { lat: to.lat, lon: b }]];
}

export function polarSafe(lat) {
  if (!Number.isFinite(lat)) return null;
  return Math.max(-85, Math.min(85, lat));
}

export { NODE_TYPES, EDGE_TYPES };
