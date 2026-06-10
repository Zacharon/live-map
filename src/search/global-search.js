import { COUNTRIES } from "../data/countries.js";
import { AIRPORTS } from "../data/airports.js";
import { PORTS } from "../data/ports.js";
import { PROVIDER_SOURCE_REGISTRY } from "../data/providers/source-registry.js";

function matchText(query, values) {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return values.filter(Boolean).some((value) => String(value).toLowerCase().includes(q));
}

function result(type, label, description, payload) {
  return { type, label, description, payload };
}

export function buildGlobalSearchResults(query, events = [], movingObjects = []) {
  const q = query.trim();
  if (q.length < 2) return [];
  const countries = COUNTRIES.filter((country) => matchText(q, [country.name, country.shortName, country.iso2, country.iso3, ...(country.aliases || [])]))
    .slice(0, 8)
    .map((country) => result("Countries", country.name, `${country.iso3} / ${country.region}`, { action: "country", iso3: country.iso3, lat: country.lat, lon: country.lon }));
  const airports = AIRPORTS.filter((airport) => matchText(q, [airport.name, airport.icao, airport.iata, airport.faa, airport.municipality, airport.country]))
    .slice(0, 8)
    .map((airport) => result("Airports", airport.name, `${airport.iata || airport.icao} / ${airport.municipality}`, { action: "airport", ...airport }));
  const ports = PORTS.filter((port) => matchText(q, [port.name, port.unlocode, port.country]))
    .slice(0, 8)
    .map((port) => result("Ports", port.name, `${port.unlocode} / ${port.country}`, { action: "port", ...port }));
  const objectResults = movingObjects.filter((object) => matchText(q, [object.displayName, object.identifiers?.icao24, object.identifiers?.callsign, object.identifiers?.mmsi, object.identifiers?.imo]))
    .slice(0, 8)
    .map((object) => result(object.objectType === "aircraft" ? "Aircraft" : "Vessels", object.displayName, object.identifiers?.icao24 || object.identifiers?.mmsi || object.providerId, { action: "moving-object", ...object }));
  const eventResults = events.filter((event) => matchText(q, [event.title, event.place, event.country, event.sourceName, event.domainLabel, event.typeLabel]))
    .slice(0, 8)
    .map((event) => result("Events", event.title, `${event.place || event.country || "No map location"} / ${event.sourceName}`, { action: "event", id: event.id, lat: event.lat, lon: event.lon }));
  const sources = PROVIDER_SOURCE_REGISTRY.filter((source) => matchText(q, [source.name, source.id, source.domains?.join(" "), source.status]))
    .slice(0, 8)
    .map((source) => result("Sources", source.name, source.status, { action: "source", id: source.id, url: source.documentationUrl || source.homepageUrl }));
  return [...countries, ...airports, ...ports, ...objectResults, ...eventResults, ...sources];
}

export function groupSearchResults(results = []) {
  return results.reduce((groups, item) => {
    if (!groups[item.type]) groups[item.type] = [];
    groups[item.type].push(item);
    return groups;
  }, {});
}
