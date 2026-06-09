import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sourcesFunction from "../netlify/functions/sources.mjs";
import { filterSources } from "../src/sources/master-source-registry.js";

const html = await readFile(new URL("../source-explorer.html", import.meta.url), "utf8");
assert.match(html, /src\/source-explorer-app\.js/);
assert.match(html, /source-explorer\.css/);

const response = await sourcesFunction(new Request("https://liveworldmap.netlify.app/api/sources?q=weather&status=planned"));
assert.equal(response.status, 200);
const body = await response.json();
assert.equal(body.valid, true);
assert.equal(body.data.registryVersion, "1");
assert.ok(body.data.statistics.total >= 80);
assert.ok(body.data.sources.length > 0);
assert.ok(body.data.sources.every((source) => source.status === "planned"));
assert.ok(body.data.sources.some((source) => /weather/i.test(`${source.name} ${source.domain} ${source.category}`)));

const filtered = filterSources(undefined, { q: "acled", accessMode: "credential-required" });
assert.equal(filtered.length, 1);
assert.equal(filtered[0].status, "authentication-required");
assert.deepEqual(filtered[0].environmentVariables, ["ACLED_EMAIL", "ACLED_ACCESS_TOKEN"]);

const adsb = await sourcesFunction(new Request("https://liveworldmap.netlify.app/api/sources?source=adsb-exchange"));
const adsbBody = await adsb.json();
assert.equal(adsbBody.data.selectedSource.id, "adsb-exchange");
assert.match(adsbBody.data.selectedSource.knownLimitations.join(" "), /Do not scrape/);
assert.match(adsbBody.data.selectedSource.knownLimitations.join(" "), /OpenSky/);

console.log("Source Explorer smoke test passed.");
